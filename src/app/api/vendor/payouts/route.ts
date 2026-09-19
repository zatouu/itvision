import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import { Order } from '@/lib/models/Order'
import VendorPayout from '@/lib/models/VendorPayout'
import { z } from 'zod'

const payoutSchema = z.object({
  amount: z.number().int().min(1000, 'Montant minimum : 1 000 F'),
  method: z.enum(['wave', 'orange_money', 'free_money', 'bank_transfer']),
  phone: z.string().trim().min(8, 'Téléphone invalide').max(20).optional(),
  note: z.string().trim().max(300).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()
    const vendor = await VendorProfile.findOne({ userId: auth.user.id }).lean() as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }

    const payouts = await VendorPayout.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).limit(50).lean() as any[]
    return NextResponse.json({
      success: true,
      payouts: payouts.map(p => ({
        id: String(p._id),
        amount: p.amount,
        method: p.method,
        phone: p.phone,
        status: p.status,
        requestedAt: p.requestedAt,
        processedAt: p.processedAt,
        rejectionReason: p.rejectionReason,
        note: p.note,
      })),
    })
  } catch (error) {
    console.error('GET /api/vendor/payouts error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = payoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    await connectMongoose()
    const vendor = await VendorProfile.findOne({ userId: auth.user.id }).lean() as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }
    const shop = await Shop.findOne({ slug: vendor.slug }).select('_id commissionRate status').lean() as any
    if (!shop || shop.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Votre boutique doit être approuvée pour demander un retrait' }, { status: 403 })
    }
    const commissionRate = typeof shop.commissionRate === 'number' ? shop.commissionRate : 0

    // Solde disponible = ventes livrées+payées (net de commission) - payouts engagés
    const products = await Product.find({ sellerSlug: vendor.slug }).select('_id').lean()
    const productIds = products.map(p => String(p._id))
    const deliveredOrders = productIds.length === 0 ? [] : await Order.find({
      'items.id': { $in: productIds },
      paymentStatus: 'completed',
      status: 'delivered',
    }).lean() as any[]

    let releasedGross = 0
    for (const order of deliveredOrders) {
      for (const item of order.items || []) {
        if (productIds.includes(item.id)) releasedGross += (item.qty || 0) * (item.price || 0)
      }
    }
    const releasedNet = Math.round(releasedGross * (1 - commissionRate / 100))
    const committed = await VendorPayout.aggregate([
      { $match: { vendorId: vendor._id, status: { $in: ['pending', 'approved', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const available = Math.max(0, releasedNet - (committed[0]?.total || 0))

    const { amount, method, phone, note } = parsed.data
    if (amount > available) {
      return NextResponse.json({
        success: false,
        error: `Solde disponible insuffisant (${available.toLocaleString('fr-FR')} F). Les ventes en cours de livraison sont en escrow.`,
      }, { status: 400 })
    }

    const payout = await VendorPayout.create({
      vendorId: vendor._id,
      shopId: shop._id,
      amount,
      method,
      phone,
      note,
    })

    return NextResponse.json({ success: true, payout: { id: String(payout._id), amount, status: 'pending' } }, { status: 201 })
  } catch (error) {
    console.error('POST /api/vendor/payouts error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
