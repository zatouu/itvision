import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import VendorProfile from '@/lib/models/VendorProfile'
import { requireAdminApi } from '@/lib/api-auth'
import { notifyUser } from '@/lib/notify'
import mongoose from 'mongoose'

interface RouteContext {
  params: Promise<{ shopId: string }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    const { shopId } = await context.params
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json({ success: false, error: 'ID boutique invalide' }, { status: 400 })
    }

    const body = await req.json()
    const { status, isVerified } = body
    if (status && !['pending_review', 'active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 })
    }

    await connectMongoose()
    const update: any = {}
    if (status) update.status = status
    if (typeof isVerified === 'boolean') update.isVerified = isVerified

    const previous = await Shop.findById(shopId).lean() as any
    const shop = await Shop.findByIdAndUpdate(shopId, update, { new: true }).lean() as any
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    // Notifier le vendeur d'un changement de statut de sa boutique
    if (status && status !== previous?.status) {
      try {
        const ownerId = shop.ownerId
          ? String(shop.ownerId)
          : ((await VendorProfile.findOne({ slug: shop.slug }).select('userId').lean()) as any)?.userId
        if (ownerId) {
          const notif =
            status === 'active'
              ? { type: 'success' as const, title: 'Boutique approuvée', message: `« ${shop.name} » est en ligne — votre vitrine est visible publiquement.`, actionUrl: '/espace-vendeur' }
              : status === 'suspended'
                ? { type: 'error' as const, title: 'Boutique suspendue', message: `« ${shop.name} » a été suspendue. Contactez le support pour plus d'informations.`, actionUrl: '/espace-vendeur' }
                : status === 'inactive'
                  ? { type: 'warning' as const, title: 'Boutique désactivée', message: `« ${shop.name} » n'est plus visible publiquement.`, actionUrl: '/espace-vendeur' }
                  : { type: 'info' as const, title: 'Boutique en vérification', message: `« ${shop.name} » est repassée en attente de validation.`, actionUrl: '/espace-vendeur' }
          await notifyUser(String(ownerId), { ...notif, metadata: { shopId, status } })
        }
      } catch (e) {
        console.error('[admin/shops] notify vendor failed:', e)
      }
    }

    return NextResponse.json({ success: true, shop })
  } catch (err) {
    console.error('[admin/shops] PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
