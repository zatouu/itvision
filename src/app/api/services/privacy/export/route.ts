import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import ChatMessage from '@/lib/models/ChatMessage'
import ServiceReview from '@/lib/models/ServiceReview'
import Wallet from '@/lib/models/Wallet'
import WalletTransaction from '@/lib/models/WalletTransaction'
import ProviderProfile from '@/lib/models/ProviderProfile'
import KycRequest from '@/lib/models/KycRequest'
import { verifyAuthServer } from '@/lib/auth-server'

/**
 * GET /api/services/privacy/export — portabilité RGPD.
 * Exporte les données personnelles du compte au format JSON.
 * Reste dans le domaine xeuy : User (shared) + modèles xeuy uniquement.
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.user.id

    const user = await User.findById(userId)
      .select('name email phone avatarUrl company address city country role createdAt privacy referralCode providerStats kycVerified')
      .lean() as any
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const [requests, offersMade, messages, reviewsGiven, reviewsReceived, wallet, walletTxns, providerProfile, kyc] = await Promise.all([
      ServiceRequest.find({ clientId: userId })
        .select('category subcategory description status budget location.address location.coordinates createdAt completedAt scheduledFor urgent')
        .sort({ createdAt: -1 }).limit(500).lean(),
      Offer.find({ providerId: userId })
        .select('requestId price etaMinutes comment status createdAt')
        .sort({ createdAt: -1 }).limit(500).lean(),
      ChatMessage.find({ senderId: String(userId) })
        .select('requestId senderRole text createdAt')
        .sort({ createdAt: -1 }).limit(1000).lean(),
      ServiceReview.find({ reviewerId: String(userId) })
        .select('requestId providerId rating comment tags createdAt').lean(),
      ServiceReview.find({ providerId: String(userId) })
        .select('requestId rating comment tags createdAt').lean(),
      Wallet.findOne({ userId }).select('balance escrow points lifetimePointsEarned updatedAt').lean(),
      WalletTransaction.find({ userId })
        .select('kind points balanceAfter description paymentRef createdAt')
        .sort({ createdAt: -1 }).limit(500).lean(),
      ProviderProfile.findOne({ userId })
        .select('serviceCategories secondaryCategories zone kycVerified availabilityStatus scoreXeuy createdAt')
        .lean(),
      KycRequest.findOne({ providerId: userId }).select('status trade createdAt reviewedAt').lean() as Promise<any>,
    ])

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      service: 'Xeuy Bi',
      profile: user,
      privacy: user.privacy || {},
      serviceRequests: requests,
      offersSubmitted: offersMade,
      chatMessages: messages,
      reviewsGiven,
      reviewsReceived,
      wallet: wallet || null,
      walletTransactions: walletTxns,
      providerProfile: providerProfile || null,
      kyc: kyc ? { status: kyc.status, trade: kyc.trade, submittedAt: kyc.createdAt, reviewedAt: kyc.reviewedAt } : null,
    })
  } catch (e: any) {
    console.error('[GET /api/services/privacy/export]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
