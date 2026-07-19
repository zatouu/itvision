import { connectMongoose } from './mongoose'
import Wallet from './models/Wallet'
import WalletTransaction, { WalletTransactionKind } from './models/WalletTransaction'
import AppConfig, { IAppConfig } from './models/AppConfig'
import MissionUnlock from './models/MissionUnlock'

/**
 * Helpers pour le système de wallet / points.
 *
 * Phase 1 (mode `free`) : les points existent et s'accumulent, mais aucune
 * mission ne les consomme (pointsPerWonMission = 0). On bâtit le volume.
 *
 * Phase 2 (mode `points`) : on passe `monetization.mode = 'points'` et
 * `pointsPerWonMission > 0` depuis AppConfig, sans redéploiement.
 */

// ──── AppConfig (cache mémoire 60s) ─────────────────────────────────────────

let _cfgCache: { value: IAppConfig | null; at: number } = { value: null, at: 0 }
const CFG_TTL_MS = 60 * 1000

export async function getAppConfig(): Promise<IAppConfig> {
  const now = Date.now()
  if (_cfgCache.value && now - _cfgCache.at < CFG_TTL_MS) {
    return _cfgCache.value
  }
  await connectMongoose()
  let cfg = await AppConfig.findOne({ key: 'global' })
  if (!cfg) {
    // Crée la config par défaut (mode gratuit) au premier accès
    cfg = await AppConfig.create({ key: 'global' })
  }
  _cfgCache = { value: cfg, at: now }
  return cfg
}

/** Invalide le cache (à appeler après une modification admin de la config) */
export function invalidateAppConfigCache() {
  _cfgCache = { value: null, at: 0 }
}

/**
 * Indique si le mode points est actif maintenant.
 * `free` reste effectif tant que `freeUntil` n'est pas dépassé même si mode='points'.
 */
export async function isPointsModeActive(): Promise<boolean> {
  const cfg = await getAppConfig()
  if (cfg.monetization.mode !== 'points') return false
  if (cfg.monetization.freeUntil && new Date(cfg.monetization.freeUntil).getTime() > Date.now()) {
    return false
  }
  return cfg.monetization.pointsPerWonMission > 0
}

// ──── Wallet ────────────────────────────────────────────────────────────────

export async function getOrCreateWallet(userId: string) {
  await connectMongoose()
  let wallet = await Wallet.findOne({ userId })
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0, escrow: 0, points: 0, reservedPoints: 0 })
  }
  return wallet
}

/** Crédite des points (welcome, topup, referral, refund, admin) */
export async function creditPoints(
  userId: string,
  points: number,
  kind: WalletTransactionKind,
  opts: { description?: string; relatedMissionId?: string; paymentRef?: string } = {}
): Promise<{ balance: number }> {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error('Montant de points invalide')
  }
  await connectMongoose()
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      $inc: { points, lifetimePointsEarned: points },
      $setOnInsert: { balance: 0, escrow: 0, reservedPoints: 0 },
    },
    { new: true, upsert: true }
  )
  await WalletTransaction.create({
    userId,
    kind,
    points,
    balanceAfter: wallet.points,
    description: opts.description,
    relatedMissionId: opts.relatedMissionId,
    paymentRef: opts.paymentRef,
  })
  return { balance: wallet.points }
}

/**
 * Débite des points de façon atomique (refuse si solde insuffisant).
 * Retourne null si solde insuffisant.
 */
export async function debitPoints(
  userId: string,
  points: number,
  kind: WalletTransactionKind,
  opts: { description?: string; relatedMissionId?: string } = {}
): Promise<{ balance: number } | null> {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error('Montant de points invalide')
  }
  await connectMongoose()
  // Débit conditionnel atomique: ne réussit que si points >= montant
  const wallet = await Wallet.findOneAndUpdate(
    { userId, points: { $gte: points } },
    { $inc: { points: -points, lifetimePointsSpent: points } },
    { new: true }
  )
  if (!wallet) return null // solde insuffisant
  await WalletTransaction.create({
    userId,
    kind,
    points: -points,
    balanceAfter: wallet.points,
    description: opts.description,
    relatedMissionId: opts.relatedMissionId,
  })
  return { balance: wallet.points }
}

/**
 * Consomme les points d'une mission gagnée par un provider, selon AppConfig.
 * - mode != points OU freeUntil non dépassé → no-op, succès silencieux.
 * - solde insuffisant → { ok: false, reason: 'insufficient', balance }.
 */
export async function spendOnWonMission(
  providerId: string,
  missionId: string
): Promise<{ ok: boolean; reason?: 'insufficient'; charged: number; balance?: number }> {
  const cfg = await getAppConfig()
  const active = await isPointsModeActive()
  if (!active) return { ok: true, charged: 0 }

  const cost = cfg.monetization.pointsPerWonMission
  const res = await debitPoints(providerId, cost, 'mission_spend', {
    relatedMissionId: missionId,
    description: `Mission gagnée (${cost} pts)`,
  })
  if (!res) {
    const wallet = await getOrCreateWallet(providerId)
    return { ok: false, reason: 'insufficient', charged: 0, balance: wallet.points }
  }
  return { ok: true, charged: cost, balance: res.balance }
}

/**
 * Débite les points du client pour utiliser l'escrow.
 * Retourne null si solde insuffisant.
 */
export async function chargeEscrowPoints(
  clientId: string,
  missionId: string,
  points: number
): Promise<{ balance: number } | null> {
  if (points <= 0) return { balance: (await getOrCreateWallet(clientId)).points }
  return debitPoints(clientId, points, 'escrow_charge', {
    relatedMissionId: missionId,
    description: `Frais escrow (${points} pts)`,
  })
}

/**
 * Rembourse les points d'escrow au client (annulation ou refund).
 */
export async function refundEscrowPoints(
  clientId: string,
  missionId: string,
  points: number
): Promise<{ balance: number }> {
  if (points <= 0) return { balance: (await getOrCreateWallet(clientId)).points }
  return creditPoints(clientId, points, 'escrow_refund', {
    relatedMissionId: missionId,
    description: `Remboursement frais escrow (${points} pts)`,
  })
}

/**
 * Crédite le solde cash (FCFA) d'un utilisateur (reversement prestataire, etc.).
 */
export async function creditCashBalance(
  userId: string,
  amount: number,
  opts: { description?: string; relatedMissionId?: string; paymentRef?: string } = {}
): Promise<{ balance: number }> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Montant de crédit cash invalide')
  }
  await connectMongoose()
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amount },
      $push: { txns: { type: 'payout', amount, ref: opts.paymentRef, meta: { description: opts.description, relatedMissionId: opts.relatedMissionId }, createdAt: new Date() } },
      $setOnInsert: { escrow: 0, points: 0, reservedPoints: 0, lifetimePointsEarned: 0, lifetimePointsSpent: 0 },
    },
    { new: true, upsert: true }
  )
  return { balance: wallet?.balance || 0 }
}

export type CreditReservationResult =
  | { ok: true; balance: number; reservedPoints: number; reservationId: string; cost: number }
  | { ok: false; reason: 'insufficient' | 'already_reserved' | 'not_enabled' | 'not_found' | 'server'; balance?: number }

export async function reserveMissionCredits(
  providerId: string,
  requestId: string,
  cost: number
): Promise<CreditReservationResult> {
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, reason: 'server' }
  await connectMongoose()

  const cfg = await getAppConfig()
  if (cfg.credits?.unlockEnabled !== true) return { ok: false, reason: 'not_enabled' }

  const existing = await MissionUnlock.findOne({ providerId, requestId }).lean()
  if (existing && ['active', 'reserved', 'spent'].includes(existing.status)) {
    const wallet = await getOrCreateWallet(providerId)
    return {
      ok: false,
      reason: 'already_reserved',
      balance: wallet.points,
    }
  }

  if (cost === 0) {
    const reservation = await MissionUnlock.findOneAndUpdate(
      { providerId, requestId },
      { $set: { points: 0, status: 'reserved', reservedAt: new Date(), releasedAt: undefined, releaseReason: undefined } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    return {
      ok: true,
      balance: (await getOrCreateWallet(providerId)).points,
      reservedPoints: 0,
      reservationId: String(reservation._id),
      cost: 0,
    }
  }

  const reservation = await MissionUnlock.findOneAndUpdate(
    { providerId, requestId, status: { $nin: ['active', 'reserved', 'spent'] } },
    { $set: { points: cost, status: 'reserved', reservedAt: new Date(), releasedAt: undefined, releaseReason: undefined } },
    { new: true }
  )

  let createdReservation = reservation
  if (!createdReservation && !existing) {
    try {
      createdReservation = await MissionUnlock.create({ providerId, requestId, points: cost, status: 'reserved', reservedAt: new Date() })
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        const wallet = await getOrCreateWallet(providerId)
        return { ok: false, reason: 'already_reserved', balance: wallet.points }
      }
      throw error
    }
  }

  if (!createdReservation) {
    const wallet = await getOrCreateWallet(providerId)
    return { ok: false, reason: 'already_reserved', balance: wallet.points }
  }

  await getOrCreateWallet(providerId)
  const wallet = await Wallet.findOneAndUpdate(
    { userId: providerId, points: { $gte: cost } },
    { $inc: { points: -cost, reservedPoints: cost } },
    { new: true }
  )

  if (!wallet) {
    await MissionUnlock.deleteOne({ _id: createdReservation._id, status: 'reserved' })
    const current = await getOrCreateWallet(providerId)
    return { ok: false, reason: 'insufficient', balance: current.points }
  }

  await WalletTransaction.create({
    userId: providerId,
    kind: 'mission_reserve',
    points: -cost,
    balanceAfter: wallet.points,
    reservedPointsAfter: wallet.reservedPoints || 0,
    relatedMissionId: requestId,
    description: `Réservation mission (${cost} crédits)`,
  })

  return {
    ok: true,
    balance: wallet.points,
    reservedPoints: wallet.reservedPoints || 0,
    reservationId: String(createdReservation._id),
    cost,
  }
}

export async function confirmMissionReservation(
  providerId: string,
  requestId: string
): Promise<{ ok: boolean; charged: number; balance?: number; reason?: 'missing' | 'insufficient' }> {
  await connectMongoose()
  const reservation = await MissionUnlock.findOne({ providerId, requestId, status: 'reserved' })
  if (!reservation) return { ok: false, charged: 0, reason: 'missing' }

  const cost = reservation.points || 0
  const wallet = await Wallet.findOneAndUpdate(
    { userId: providerId, reservedPoints: { $gte: cost } },
    { $inc: { reservedPoints: -cost, lifetimePointsSpent: cost } },
    { new: true }
  )
  if (!wallet) return { ok: false, charged: 0, reason: 'insufficient' }

  const spent = await MissionUnlock.updateOne(
    { _id: reservation._id, status: 'reserved' },
    { $set: { status: 'spent', spentAt: new Date() } }
  )
  if (spent.modifiedCount === 0) {
    await Wallet.findOneAndUpdate(
      { userId: providerId },
      { $inc: { reservedPoints: cost, lifetimePointsSpent: -cost } }
    )
    return { ok: false, charged: 0, reason: 'missing' }
  }

  await WalletTransaction.create({
    userId: providerId,
    kind: 'mission_spend',
    points: 0,
    balanceAfter: wallet.points,
    reservedPointsAfter: wallet.reservedPoints || 0,
    relatedMissionId: requestId,
    description: `Mission gagnée (${cost} crédits consommés)`,
  })

  return { ok: true, charged: cost, balance: wallet.points }
}

export async function releaseMissionReservation(
  providerId: string,
  requestId: string,
  reason: string
): Promise<{ ok: boolean; releasedCredits?: number; balance?: number }> {
  await connectMongoose()
  const reservation = await MissionUnlock.findOneAndUpdate(
    { providerId, requestId, status: 'reserved' },
    { $set: { status: 'released', releasedAt: new Date(), releaseReason: reason } },
    { new: true }
  )
  if (!reservation) return { ok: false }

  const cost = reservation.points || 0
  const wallet = await Wallet.findOneAndUpdate(
    { userId: providerId, reservedPoints: { $gte: cost } },
    { $inc: { points: cost, reservedPoints: -cost } },
    { new: true }
  )
  if (!wallet) {
    await MissionUnlock.updateOne(
      { _id: reservation._id, status: 'released' },
      { $set: { status: 'reserved', releasedAt: undefined, releaseReason: undefined } }
    )
    return { ok: false }
  }

  await WalletTransaction.create({
    userId: providerId,
    kind: 'mission_release',
    points: cost,
    balanceAfter: wallet.points,
    reservedPointsAfter: wallet.reservedPoints || 0,
    relatedMissionId: requestId,
    description: `Réservation libérée : ${reason} (${cost} crédits)`,
  })

  return { ok: true, releasedCredits: cost, balance: wallet.points }
}

// ──── Mission Unlock (crédits provider) ───────────────────────────────────

export type UnlockResult =
  | { ok: true; balance: number; unlockId: string; cost: number }
  | { ok: false; reason: 'insufficient' | 'already_unlocked' | 'not_enabled' | 'not_found' | 'server'; balance?: number }

/**
 * Débite les crédits provider pour débloquer une mission.
 * Crée une MissionUnlock active (remboursable selon les règles métier).
 */
export async function unlockMission(
  providerId: string,
  requestId: string,
  cost: number
): Promise<UnlockResult> {
  const reservation = await reserveMissionCredits(providerId, requestId, cost)
  if (!reservation.ok) {
    return {
      ok: false,
      reason: reservation.reason === 'already_reserved' ? 'already_unlocked' : reservation.reason,
      balance: reservation.balance,
    }
  }

  return {
    ok: true,
    balance: reservation.balance,
    unlockId: reservation.reservationId,
    cost: reservation.cost,
  }
}

/**
 * Marque un unlock comme "spent" quand le provider gagne la mission
 * (offre acceptée / mission assignée). Le crédit est alors consommé définitivement.
 */
export async function spendMissionUnlock(providerId: string, requestId: string): Promise<boolean> {
  await connectMongoose()
  const res = await MissionUnlock.updateOne(
    { providerId, requestId, status: 'active' },
    { $set: { status: 'spent', spentAt: new Date() } }
  )
  return res.modifiedCount > 0
}

/**
 * Rembourse automatiquement un unlock dans les cas métier :
 * - mission annulée rapidement par le client (dans refundWindowMinutes)
 * - mission frauduleuse / expirée sans offre
 * - mission annulée par le provider avant envoi d'offre
 */
export async function refundMissionUnlock(
  providerId: string,
  requestId: string,
  reason: string
): Promise<{ ok: boolean; refundedCredits?: number; balance?: number }> {
  await connectMongoose()
  const unlock = await MissionUnlock.findOne({ providerId, requestId, status: 'active' })
  if (!unlock) return { ok: false }

  const points = unlock.points || 0
  unlock.status = 'refunded'
  unlock.refundedAt = new Date()
  unlock.refundReason = reason
  await unlock.save()

  if (points > 0) {
    const { balance } = await creditPoints(providerId, points, 'unlock_refund', {
      relatedMissionId: requestId,
      description: `Remboursement déblocage : ${reason} (${points} crédits)`,
    })
    return { ok: true, refundedCredits: points, balance }
  }

  return { ok: true, refundedCredits: 0 }
}
