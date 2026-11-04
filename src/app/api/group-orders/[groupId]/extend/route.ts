/**
 * POST /api/group-orders/[groupId]/extend — prolongation contrôlée de la deadline.
 *
 * Règles serveur (l'utilisateur ne peut pas modifier librement la deadline) :
 * - réservé au créateur du groupe (identifié par son téléphone) ;
 * - groupe encore ouvert et deadline non dépassée ;
 * - une seule prolongation par groupe (+72h) ;
 * - groupe déjà viable (currentQty >= minQty) — on prolonge pour viser
 *   un meilleur palier, pas pour sauver un groupe vide.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { validatePhone, formatPhone } from '@/lib/payment-service'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { sanitizePublicGroupDetail } from '@/lib/group-orders/public-group'
import { sendSms } from '@/lib/sms'
import { invalidateGroupOrdersCache } from '@/lib/catalog-cache'

const EXTENSION_HOURS = 72

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    const { groupId } = await params
    const body = await req.json().catch(() => ({}))
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''

    if (!validatePhone(phone)) {
      return NextResponse.json({ success: false, error: 'Numéro de téléphone invalide' }, { status: 400 })
    }

    await connectDB()
    const group = await GroupOrder.findOne({ groupId })
    if (!group) {
      return NextResponse.json({ success: false, error: 'Achat groupé introuvable' }, { status: 404 })
    }
    if (group.status !== 'open') {
      return NextResponse.json({ success: false, error: 'Seul un groupe ouvert peut être prolongé' }, { status: 400 })
    }
    if (new Date(group.deadline) < new Date()) {
      return NextResponse.json({ success: false, error: 'La deadline est déjà dépassée' }, { status: 400 })
    }
    if (formatPhone(phone) !== formatPhone(group.createdBy?.phone || '')) {
      return NextResponse.json({ success: false, error: 'Seul le créateur peut prolonger le groupe' }, { status: 403 })
    }
    if (group.deadlineExtended) {
      return NextResponse.json({ success: false, error: 'Ce groupe a déjà été prolongé une fois' }, { status: 400 })
    }
    if (group.currentQty < group.minQty) {
      return NextResponse.json(
        { success: false, error: `Le groupe doit atteindre ${group.minQty} unités avant de pouvoir être prolongé` },
        { status: 400 }
      )
    }

    group.deadline = new Date(new Date(group.deadline).getTime() + EXTENSION_HOURS * 3600 * 1000)
    group.deadlineExtended = true
    await group.save()
    void invalidateGroupOrdersCache()

    // SMS aux participants (best effort)
    try {
      const dateStr = group.deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      await Promise.allSettled(
        (group.participants || [])
          .filter((p: any) => p.phone && formatPhone(p.phone) !== formatPhone(phone))
          .map((p: any) =>
            sendSms(p.phone, `DDM+ : l'achat groupé « ${group.product?.name || 'produit'} » est prolongé jusqu'au ${dateStr}. Continuez à inviter pour débloquer un meilleur prix !`)
          )
      )
    } catch (smsErr) {
      console.error('Erreur SMS prolongation groupe:', smsErr)
    }

    return NextResponse.json({
      success: true,
      message: `Deadline prolongée de ${EXTENSION_HOURS / 24} jours`,
      group: sanitizePublicGroupDetail(group.toObject()),
    })
  } catch (error) {
    console.error('POST extend group error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
