import { connectMongoose } from './mongoose'
import Wallet from './models/Wallet'
import WalletTransaction, { WalletTransactionKind } from './models/WalletTransaction'
import AppConfig, { IAppConfig } from './models/AppConfig'

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
    wallet = await Wallet.create({ userId, balance: 0, escrow: 0, points: 0 })
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
      $setOnInsert: { balance: 0, escrow: 0 },
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
