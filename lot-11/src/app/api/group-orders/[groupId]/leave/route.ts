/**
 * API pour qu'un participant se retire d'un achat groupé
 * POST /api/group-orders/[groupId]/leave
 */
import { NextRequest, NextResponse } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Product from '@/lib/models/Product'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import { groupParticipantUnitPrice } from '@/lib/group-orders/pricing'
import { notifyUser } from '@/lib/notify'
import { emailService } from '@/lib/email-service'
import { escapeHtml } from '@/lib/html-escape'
import { MARKET_BRAND } from '@/lib/branding'

interface RouteContext {
  params: Promise<{ groupId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { groupId } = await context.params

  try {
    let auth: Awaited<ReturnType<typeof requireAuth>>
    try {
      auth = await requireAuth(req)
    } catch {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    await connectDB()

    const group = await GroupOrder.findOne({ groupId })
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }

    // Seuls les groupes ouverts permettent le retrait
    if (group.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Impossible de se retirer : l\'achat groupé n\'est plus ouvert' },
        { status: 400 }
      )
    }

    // Trouver le participant par userId
    const participantIndex = group.participants.findIndex(
      (p: any) => p.userId && String(p.userId) === String(auth.userId)
    )

    if (participantIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Vous ne participez pas à cet achat groupé' },
        { status: 400 }
      )
    }

    const participant = group.participants[participantIndex]

    // Interdire le retrait si un paiement a déjà été effectué
    if (participant.paidAmount > 0) {
      return NextResponse.json(
        { success: false, error: 'Impossible de se retirer : un paiement a déjà été effectué. Contactez le support.' },
        { status: 400 }
      )
    }

    // Interdire au créateur de se retirer s'il est le seul participant
    const isCreator = group.createdBy?.userId && String(group.createdBy.userId) === String(auth.userId)
    if (isCreator && group.participants.length === 1) {
      return NextResponse.json(
        { success: false, error: 'En tant que créateur et seul participant, vous ne pouvez pas vous retirer. Annulez l\'achat groupé à la place.' },
        { status: 400 }
      )
    }

    // Retirer le participant
    const removedQty = participant.qty
    group.participants.splice(participantIndex, 1)
    group.currentQty = Math.max(0, group.currentQty - removedQty)

    // Recalculer le palier au nouveau volume (même règle que l'inscription, variantes comprises)
    let newUnitPrice = group.product.basePrice
    if (group.priceTiers && group.priceTiers.length > 0 && group.currentQty > 0) {
      const sortedTiers = [...group.priceTiers].sort((a: any, b: any) => b.minQty - a.minQty)
      for (const tier of sortedTiers) {
        if (group.currentQty >= tier.minQty) {
          newUnitPrice = tier.price
          break
        }
      }
    }

    const previousUnitPrice = group.currentUnitPrice
    group.currentUnitPrice = newUnitPrice

    const product = await Product.findById(group.product.productId).lean()
    group.participants.forEach((p: any) => {
      const unit = product
        ? groupParticipantUnitPrice(product, group.product.basePrice, group.priceTiers, p.variantIds, group.currentQty)
        : newUnitPrice
      p.unitPrice = unit
      p.totalAmount = p.qty * unit
    })

    await group.save()

    // Prix final = palier à la clôture : si un départ fait remonter le palier, les autres le savent tout de suite
    if (newUnitPrice > previousUnitPrice) {
      const url = `${MARKET_BRAND.url}/achats-groupes/${group.groupId}`
      for (const p of group.participants as any[]) {
        const message = `Un participant s'est retiré : le volume repasse à ${group.currentQty} unités et votre total provisoire est désormais de ${Math.round(p.totalAmount).toLocaleString('fr-FR')} FCFA. Invitez des proches pour rebaisser le prix avant la clôture.`
        if (p.userId) {
          void notifyUser(String(p.userId), { type: 'warning', title: `Achat groupé ${group.product.name} : prix provisoire en hausse`, message, actionUrl: `/achats-groupes/${group.groupId}` })
        }
        if (p.email) {
          void emailService.sendEmail({
            to: p.email,
            fromName: MARKET_BRAND.name,
            subject: `Achat groupé ${group.product.name} : prix provisoire en hausse`,
            html: `<p>Bonjour ${escapeHtml(p.name)},</p><p>${escapeHtml(message)}</p><p><a href="${url}">Voir l'achat groupé</a></p>`,
          }).catch((err: unknown) => console.error('[group-leave] email:', err))
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Vous avez quitté l\'achat groupé',
      removedQty,
      newCurrentQty: group.currentQty,
      newUnitPrice: group.currentUnitPrice
    })
  } catch (error) {
    console.error('Erreur retrait achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du retrait' },
      { status: 500 }
    )
  }
}
