import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import VendorPayout from '@/lib/models/VendorPayout'
import VendorProfile from '@/lib/models/VendorProfile'
import { notifyUser } from '@/lib/notify'

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    await connectMongoose()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const query: any = status ? { status } : {}

    const payouts = await VendorPayout.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('vendorId', 'name slug')
      .lean() as any[]

    return NextResponse.json({
      success: true,
      payouts: payouts.map(p => ({
        id: String(p._id),
        vendor: p.vendorId ? { name: p.vendorId.name, slug: p.vendorId.slug } : null,
        amount: p.amount,
        method: p.method,
        phone: p.phone,
        status: p.status,
        note: p.note,
        requestedAt: p.requestedAt,
        processedAt: p.processedAt,
        rejectionReason: p.rejectionReason,
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/vendor-payouts error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    const body = await req.json()
    const { payoutId, action, rejectionReason } = body
    if (!payoutId || !['approve', 'paid', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Action invalide' }, { status: 400 })
    }

    await connectMongoose()
    const payout = await VendorPayout.findById(payoutId)
    if (!payout) {
      return NextResponse.json({ success: false, error: 'Demande introuvable' }, { status: 404 })
    }

    const allowed: Record<string, string[]> = {
      pending: ['approve', 'reject'],
      approved: ['paid', 'reject'],
      paid: [],
      rejected: [],
    }
    if (!allowed[payout.status]?.includes(action)) {
      return NextResponse.json({ success: false, error: `Transition impossible depuis '${payout.status}'` }, { status: 409 })
    }

    payout.status = action === 'approve' ? 'approved' : action === 'paid' ? 'paid' : 'rejected'
    payout.processedAt = new Date()
    payout.processedBy = adminAuth.user?.email || 'admin'
    if (action === 'reject') payout.rejectionReason = rejectionReason || 'Non précisé'
    await payout.save()

    // Notifier le vendeur du sort de sa demande
    try {
      const vp = await VendorProfile.findById(payout.vendorId).select('userId').lean() as any
      if (vp?.userId) {
        const amountFmt = `${payout.amount.toLocaleString('fr-FR')} F`
        const notif =
          payout.status === 'paid'
            ? { type: 'success' as const, title: 'Retrait versé', message: `Votre retrait de ${amountFmt} a été versé.` }
            : payout.status === 'approved'
              ? { type: 'info' as const, title: 'Retrait approuvé', message: `Votre demande de ${amountFmt} est approuvée — versement en cours.` }
              : { type: 'error' as const, title: 'Retrait rejeté', message: `Votre demande de ${amountFmt} a été rejetée : ${payout.rejectionReason || 'non précisé'}.` }
        await notifyUser(String(vp.userId), { ...notif, actionUrl: '/espace-vendeur', metadata: { payoutId: String(payout._id), status: payout.status } })
      }
    } catch (e) {
      console.error('[admin/vendor-payouts] notify failed:', e)
    }

    return NextResponse.json({ success: true, payout: { id: String(payout._id), status: payout.status } })
  } catch (error) {
    console.error('PATCH /api/admin/vendor-payouts error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
