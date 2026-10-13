/**
 * GET  /api/market/ambassador — code, liens et commissions de l'ambassadeur connecté
 * POST /api/market/ambassador { method, phone } — demande de versement des commissions validées
 */
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import AmbassadorCommission from '@/lib/models/AmbassadorCommission'
import { ensureAmbassadorCode, ambassadorRate, AMBASSADOR_MIN_PAYOUT } from '@/lib/market/ambassador'
import { notifyAdmins } from '@/lib/notify'
import { validatePhone, formatPhone } from '@/lib/payment-service'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { MARKET_BRAND } from '@/lib/branding'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let auth
  try {
    auth = await requireAuth(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
  try {
    await connectDB()
    const code = await ensureAmbassadorCode(auth.userId)
    const uid = new mongoose.Types.ObjectId(auth.userId)
    const [totals, commissions] = await Promise.all([
      AmbassadorCommission.aggregate([
        { $match: { ambassadorUserId: uid } },
        { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 }, requested: { $sum: { $cond: [{ $ifNull: ['$payoutRequestedAt', false] }, '$amount', 0] } } } },
      ]),
      AmbassadorCommission.find({ ambassadorUserId: uid })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('label buyerName amount baseAmount status createdAt validatedAt paidAt payoutRequestedAt sourceType groupId')
        .lean(),
    ])
    const byStatus = Object.fromEntries(totals.map((t: any) => [t._id, t]))
    const validated = byStatus.validated?.amount || 0
    const requested = byStatus.validated?.requested || 0
    return NextResponse.json({
      success: true,
      code,
      link: `${MARKET_BRAND.url}/achats-groupes?ref=${code}`,
      rate: ambassadorRate(),
      minPayout: AMBASSADOR_MIN_PAYOUT,
      totals: {
        pending: byStatus.pending?.amount || 0,
        validated,
        available: validated - requested,
        requested,
        paid: byStatus.paid?.amount || 0,
        sales: (byStatus.pending?.count || 0) + (byStatus.validated?.count || 0) + (byStatus.paid?.count || 0),
      },
      commissions: commissions.map((c: any) => ({
        id: String(c._id),
        label: c.label,
        buyerName: c.buyerName,
        amount: c.amount,
        status: c.status,
        payoutRequested: !!c.payoutRequestedAt,
        createdAt: c.createdAt,
        groupId: c.groupId,
      })),
    })
  } catch (error) {
    console.error('GET /api/market/ambassador error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
  if (rateLimitResponse) return rateLimitResponse
  let auth
  try {
    auth = await requireAuth(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const method = ['wave', 'orange_money', 'free_money'].includes(body?.method) ? body.method : null
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    if (!method) return NextResponse.json({ success: false, error: 'Choisissez Wave, Orange Money ou Free Money' }, { status: 400 })
    if (!validatePhone(phone)) return NextResponse.json({ success: false, error: 'Numéro de téléphone invalide' }, { status: 400 })

    await connectDB()
    const uid = new mongoose.Types.ObjectId(auth.userId)
    const available = await AmbassadorCommission.find({ ambassadorUserId: uid, status: 'validated', payoutRequestedAt: { $exists: false } })
      .select('_id amount').lean() as any[]
    const amount = available.reduce((s, c) => s + (c.amount || 0), 0)
    if (amount < AMBASSADOR_MIN_PAYOUT) {
      return NextResponse.json({ success: false, error: `Versement possible à partir de ${AMBASSADOR_MIN_PAYOUT.toLocaleString('fr-FR')} F de commissions validées` }, { status: 400 })
    }
    const now = new Date()
    await AmbassadorCommission.updateMany(
      { _id: { $in: available.map(c => c._id) }, payoutRequestedAt: { $exists: false } },
      { $set: { payoutRequestedAt: now, payoutMethod: method, payoutPhone: formatPhone(phone) } }
    )
    void notifyAdmins({
      type: 'info',
      title: 'Demande de versement ambassadeur',
      message: `${Math.round(amount).toLocaleString('fr-FR')} F à verser par ${method === 'wave' ? 'Wave' : method === 'orange_money' ? 'Orange Money' : 'Free Money'} au ${formatPhone(phone)}.`,
      actionUrl: '/admin/marketplace/ambassadeurs',
      metadata: { ambassadorUserId: auth.userId, amount, method, phone: formatPhone(phone) },
    })
    return NextResponse.json({ success: true, amount })
  } catch (error) {
    console.error('POST /api/market/ambassador error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
