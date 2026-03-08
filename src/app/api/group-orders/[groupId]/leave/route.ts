/**
 * API pour qu'un participant se retire d'un achat groupé
 * POST /api/group-orders/[groupId]/leave
 */
import { NextRequest, NextResponse } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'

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

    // Recalculer le prix unitaire
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

    group.currentUnitPrice = newUnitPrice

    // Mettre à jour les prix de tous les participants restants
    group.participants.forEach((p: any) => {
      p.unitPrice = newUnitPrice
      p.totalAmount = p.qty * newUnitPrice
    })

    await group.save()

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
