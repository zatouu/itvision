import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import InAppNotification from '@/lib/models/InAppNotification'
import { requireAuth } from '@/lib/jwt'

const PRO_ELIGIBILITY_THRESHOLDS = {
  minOrders: 3,
  minPurchasesFCFA: 150_000,
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectMongoose()

    const user = await User.findById(auth.userId).lean() as any
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if ((user.marketplaceTier || 'standard') !== 'standard') {
      return NextResponse.json(
        { error: `Vous avez deja un compte ${user.marketplaceTier}` },
        { status: 400 }
      )
    }

    if (user.proRequestedAt) {
      return NextResponse.json(
        { error: 'Demande deja soumise. Un administrateur la traitera prochainement.' },
        { status: 400 }
      )
    }

    const orders = user.marketplaceOrderCount || 0
    const purchases = user.totalMarketplacePurchases || 0
    const isEligible =
      orders >= PRO_ELIGIBILITY_THRESHOLDS.minOrders ||
      purchases >= PRO_ELIGIBILITY_THRESHOLDS.minPurchasesFCFA

    if (!isEligible) {
      return NextResponse.json(
        {
          error: 'Seuils non atteints',
          details: {
            currentOrders: orders,
            requiredOrders: PRO_ELIGIBILITY_THRESHOLDS.minOrders,
            currentPurchases: purchases,
            requiredPurchases: PRO_ELIGIBILITY_THRESHOLDS.minPurchasesFCFA,
          },
        },
        { status: 400 }
      )
    }

    await User.updateOne(
      { _id: auth.userId },
      { $set: { proRequestedAt: new Date() } }
    )

    // Notifier les admins
    try {
      await InAppNotification.create({
        roles: ['ADMIN'],
        type: 'info',
        title: 'Nouvelle demande Pro',
        message: `${user.name || user.email} demande le passage au compte Pro (${orders} commandes, ${purchases.toLocaleString('fr-FR')} FCFA).`,
        actionUrl: '/admin/marketplace/comptes-pro',
        metadata: { userId: auth.userId, requestType: 'pro_upgrade' },
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Demande envoyee. Un administrateur validera votre compte.' })
  } catch (error) {
    console.error('Erreur request-pro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: error instanceof Error && error.message === 'Non authentifie' ? 401 : 500 }
    )
  }
}
