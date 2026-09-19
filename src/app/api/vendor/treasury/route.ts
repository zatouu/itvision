import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import { Order } from '@/lib/models/Order'
import VendorPayout from '@/lib/models/VendorPayout'

// Trésorerie vendeur — dérivée des commandes + payouts, aucune écriture
// dupliquée : la commande reste la source de vérité.
//   En escrow    : payé par le client, commande pas encore livrée
//   Disponible   : livré + payé, net de commission, moins payouts engagés
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()
    const vendor = await VendorProfile.findOne({ userId: auth.user.id }).lean() as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }
    const shop = await Shop.findOne({ slug: vendor.slug }).select('commissionRate status').lean() as any
    const commissionRate = typeof shop?.commissionRate === 'number' ? shop.commissionRate : (vendor.commissionRate ?? 0)

    const products = await Product.find({ sellerSlug: vendor.slug }).select('_id').lean()
    const productIds = products.map(p => String(p._id))

    const paidOrders = productIds.length === 0 ? [] : await Order.find({
      'items.id': { $in: productIds },
      paymentStatus: 'completed',
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 }).lean() as any[]

    let inEscrow = 0
    let releasedGross = 0
    const ledger: any[] = []

    for (const order of paidOrders) {
      const vendorItems = (order.items || []).filter((i: any) => productIds.includes(i.id))
      const gross = vendorItems.reduce((s: number, i: any) => s + (i.qty || 0) * (i.price || 0), 0)
      if (gross <= 0) continue
      const commission = Math.round(gross * (commissionRate / 100))
      const net = gross - commission
      const delivered = order.status === 'delivered'
      if (delivered) releasedGross += gross
      else inEscrow += gross
      ledger.push({
        orderId: order.orderId,
        date: order.createdAt,
        gross,
        commission,
        net,
        status: delivered ? 'available' : 'escrow',
        clientName: order.clientName || order.customerName || 'Client',
      })
    }

    const payouts = await VendorPayout.find({ vendorId: vendor._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean() as any[]

    const payoutsCommitted = payouts
      .filter(p => ['pending', 'approved', 'paid'].includes(p.status))
      .reduce((s, p) => s + p.amount, 0)
    const payoutsPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)

    const releasedNet = Math.round(releasedGross * (1 - commissionRate / 100))
    const available = Math.max(0, releasedNet - payoutsCommitted)

    return NextResponse.json({
      success: true,
      treasury: {
        currency: 'FCFA',
        commissionRate,
        totalSalesGross: inEscrow + releasedGross,
        inEscrow,
        releasedNet,
        available,
        payoutsPending: payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
        payoutsPaid,
        ordersCount: ledger.length,
        ledger,
        payouts: payouts.map(p => ({
          id: String(p._id),
          amount: p.amount,
          method: p.method,
          phone: p.phone,
          status: p.status,
          requestedAt: p.requestedAt,
          processedAt: p.processedAt,
          rejectionReason: p.rejectionReason,
        })),
      },
    })
  } catch (error) {
    console.error('GET /api/vendor/treasury error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
