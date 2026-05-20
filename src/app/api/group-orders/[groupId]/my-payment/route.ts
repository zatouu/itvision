/**
 * GET /api/group-orders/[groupId]/my-payment?phone=XXXX
 *
 * Permet à un participant de récupérer son propre lien de paiement
 * sans intervention admin, en s'identifiant par son numéro de téléphone.
 * Génère la référence de paiement si elle n'existe pas encore.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { validateSenegalPhone, formatSenegalPhone } from '@/lib/payment-service'

function generatePaymentReference(groupId: string, participantPhone: string): string {
  const groupShort = groupId.slice(-6).toUpperCase()
  const phoneShort = participantPhone.replace(/\D/g, '').slice(-4)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `AG-${groupShort}-${phoneShort}-${random}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'Paramètre phone requis' },
        { status: 400 }
      )
    }

    if (!validateSenegalPhone(phone)) {
      return NextResponse.json(
        { error: 'Numéro de téléphone sénégalais invalide (format attendu: 7X XXX XX XX)' },
        { status: 400 }
      )
    }

    const formattedPhone = formatSenegalPhone(phone)

    await connectDB()

    const group = await GroupOrder.findOne({ groupId })
    if (!group) {
      return NextResponse.json(
        { error: 'Achat groupé introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le groupe permet les paiements (statut éligible)
    const eligibleStatuses = ['open', 'filled', 'ordering', 'ordered']
    if (!eligibleStatuses.includes(group.status)) {
      return NextResponse.json(
        { error: `Cet achat groupé n'accepte plus de paiements (statut: ${group.status})` },
        { status: 400 }
      )
    }

    // Trouver le participant
    const participantIndex = group.participants.findIndex(
      (p: any) => formatSenegalPhone(p.phone) === formattedPhone
    )

    if (participantIndex === -1) {
      return NextResponse.json(
        { error: 'Aucun participant trouvé avec ce numéro dans cet achat groupé' },
        { status: 404 }
      )
    }

    const participant = group.participants[participantIndex]

    // Si déjà payé
    if ((participant as any).paymentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: 'Votre paiement a déjà été validé',
        participant: {
          name: participant.name,
          qty: (participant as any).qty,
          totalAmount: (participant as any).totalAmount,
          paymentStatus: (participant as any).paymentStatus
        },
        group: {
          groupId: (group as any).groupId,
          productName: (group as any).product?.name,
          status: group.status
        }
      })
    }

    // Générer la référence si elle n'existe pas
    let reference = (participant as any).paymentReference
    if (!reference) {
      reference = generatePaymentReference(groupId, formattedPhone)
      group.participants[participantIndex].paymentReference = reference
      await group.save()
    }

    const qty = (participant as any).qty || 1
    const unitPrice = (participant as any).unitPrice || (group as any).currentUnitPrice || (group as any).product?.basePrice || 0
    const totalAmount = (participant as any).totalAmount || (qty * unitPrice)

    return NextResponse.json({
      success: true,
      alreadyPaid: false,
      participant: {
        name: participant.name,
        phone: formattedPhone,
        qty,
        unitPrice,
        totalAmount,
        paymentStatus: (participant as any).paymentStatus || 'pending',
        joinedAt: (participant as any).joinedAt
      },
      payment: {
        reference,
        amount: totalAmount,
        currency: 'FCFA',
        description: `${qty}x ${(group as any).product?.name || 'Produit'} — Achat Groupé ${groupId}`
      },
      checkoutUrl: `/paiement/checkout/${reference}`,
      group: {
        groupId: (group as any).groupId,
        productName: (group as any).product?.name,
        productImage: (group as any).product?.image,
        status: group.status,
        deadline: group.deadline,
        currentQty: (group as any).currentQty,
        targetQty: (group as any).targetQty,
        progress: Math.round(((group as any).currentQty / Math.max(1, (group as any).targetQty || 1)) * 100),
        shippingMethod: group.shippingMethod
      }
    })
  } catch (error) {
    console.error('[my-payment] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
