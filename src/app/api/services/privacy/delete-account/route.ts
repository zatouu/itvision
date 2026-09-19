import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Wallet from '@/lib/models/Wallet'
import RefreshToken from '@/lib/models/RefreshToken'
import PushToken from '@/lib/models/PushToken'
import OtpCode from '@/lib/models/OtpCode'
import { verifyAuthServer } from '@/lib/auth-server'

const ACTIVE_MISSION_STATUSES = [
  'accepted', 'assigned', 'on_the_way', 'provider_arriving',
  'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute',
]

/**
 * POST /api/services/privacy/delete-account — droit à l'effacement (RGPD).
 * Le compte est anonymisé et désactivé, jamais supprimé physiquement :
 * l'historique des missions et des flux financiers doit rester intègre.
 * Bloqué si : mission en cours, escrow verrouillé, solde wallet non nul.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.user.id

    let body: any
    try { body = await request.json() } catch { body = {} }
    if (body.confirm !== true) {
      return NextResponse.json({ error: 'Confirmation requise (confirm: true)' }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    if ((user as any).deletedAt) {
      return NextResponse.json({ error: 'Compte déjà supprimé' }, { status: 409 })
    }

    // ── Bloquants ──────────────────────────────────────────────────
    const activeAsClient = await ServiceRequest.countDocuments({
      clientId: userId, status: { $in: ACTIVE_MISSION_STATUSES },
    })
    const activeAsProvider = await ServiceRequest.countDocuments({
      assignedProviderId: userId, status: { $in: ACTIVE_MISSION_STATUSES },
    })
    if (activeAsClient + activeAsProvider > 0) {
      return NextResponse.json({
        error: 'Impossible de supprimer le compte : des missions sont en cours. Terminez-les ou annulez-les d\'abord.',
        code: 'ACTIVE_MISSIONS',
        activeCount: activeAsClient + activeAsProvider,
      }, { status: 409 })
    }

    const escrowLocked = await ServiceRequest.countDocuments({ clientId: userId, escrowLocked: true })
    if (escrowLocked > 0) {
      return NextResponse.json({
        error: 'Un paiement est encore séquestré (escrow). Il doit être libéré ou remboursé avant suppression.',
        code: 'ESCROW_LOCKED',
      }, { status: 409 })
    }

    const wallet = await Wallet.findOne({ userId }).select('balance escrow').lean() as any
    if (wallet && ((wallet.balance || 0) > 0 || (wallet.escrow || 0) > 0)) {
      return NextResponse.json({
        error: 'Votre wallet contient encore des fonds. Effectuez un retrait avant de supprimer le compte.',
        code: 'WALLET_NOT_EMPTY',
        balance: wallet.balance || 0,
      }, { status: 409 })
    }

    // ── Anonymisation du compte ────────────────────────────────────
    const now = new Date()
    const anonId = String(user._id)
    const originalPhone = (user as any).phone
    user.name = 'Compte supprimé'
    user.username = `deleted_${anonId}`
    user.email = `deleted+${anonId}@xeuy.invalid`
    user.phone = `del_${anonId}`
    ;(user as any).avatarUrl = ''
    ;(user as any).company = ''
    ;(user as any).address = ''
    ;(user as any).city = ''
    ;(user as any).country = ''
    ;(user as any).privacy = { profilePublic: false, preciseLocation: false, smsNotifications: false }
    ;(user as any).twoFactorEnabled = false
    ;(user as any).twoFactorCode = undefined
    ;(user as any).isActive = false
    ;(user as any).deletedAt = now
    ;(user as any).anonymizedAt = now
    await user.save()

    // ── Révocation des sessions + purge tokens/OTP ─────────────────
    await Promise.all([
      RefreshToken.updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: now, revokedReason: 'account_deleted' } }
      ),
      PushToken.deleteMany({ userId }),
      OtpCode.deleteMany({ phone: originalPhone }),
    ])

    // ── Scrub PII sur les demandes clôturées (adresse + médias) ────
    await ServiceRequest.updateMany(
      { clientId: userId, status: { $in: ['completed', 'cancelled', 'expired', 'archived'] } },
      { $set: { 'location.address': '', media: [] } }
    )

    return NextResponse.json({ success: true, deletedAt: now.toISOString() })
  } catch (e: any) {
    console.error('[POST /api/services/privacy/delete-account]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
