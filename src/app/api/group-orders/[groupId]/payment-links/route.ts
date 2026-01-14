/**
 * API pour générer les liens de paiement d'un achat groupé
 * POST /api/group-orders/[groupId]/payment-links
 */
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { 
  generateAllPaymentLinks, 
  generatePaymentInstructionsEmail,
  validateSenegalPhone,
  formatSenegalPhone 
} from '@/lib/payment-service'
import { emailService } from '@/lib/email-service'

// Générer une référence de paiement unique
function generatePaymentReference(groupId: string, participantPhone: string): string {
  const groupShort = groupId.slice(-6).toUpperCase()
  const phoneShort = participantPhone.replace(/\D/g, '').slice(-4)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `AG-${groupShort}-${phoneShort}-${random}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await dbConnect()
    const { groupId } = await params
    const body = await request.json()
    const { phone, email, sendEmail: shouldSendEmail = false } = body

    // Validation du téléphone
    if (!phone || !validateSenegalPhone(phone)) {
      return NextResponse.json(
        { error: 'Numéro de téléphone sénégalais invalide' },
        { status: 400 }
      )
    }

    // Trouver l'achat groupé via son identifiant fonctionnel (groupId)
    const group = await GroupOrder.findOne({ groupId })
    if (!group) {
      return NextResponse.json(
        { error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }

    // Trouver le participant
    const formattedPhone = formatSenegalPhone(phone)
    const participant = group.participants.find(
      (p: { phone: string }) => formatSenegalPhone(p.phone) === formattedPhone
    )
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant non trouvé dans cet achat groupé' },
        { status: 404 }
      )
    }

    // Vérifier si déjà payé
    if (participant.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Ce participant a déjà payé', paymentStatus: 'paid' },
        { status: 400 }
      )
    }

    // Calculer le montant
    const quantity = (participant as any).qty || 1
    const unitPrice = (group as any).currentUnitPrice || (group as any).product?.basePrice
    const amount = quantity * unitPrice

    // Générer la référence de paiement
    const reference = participant.paymentReference || 
      generatePaymentReference(groupId, phone)

    // Sauvegarder la référence si nouvelle
    if (!participant.paymentReference) {
      participant.paymentReference = reference
      await group.save()
    }

    // Créer la demande de paiement
    const paymentRequest = {
      amount,
      currency: 'FCFA',
      reference,
      description: `${quantity}x ${(group as any).product?.name || 'Produit'} - Achat Groupé`,
      customerName: participant.name || 'Client',
      customerPhone: formattedPhone,
      customerEmail: participant.email || email
    }

    // Générer les liens de paiement
    const paymentLinks = generateAllPaymentLinks(paymentRequest)

    // Envoyer l'email si demandé
    if (shouldSendEmail && (participant.email || email)) {
      const recipientEmail = participant.email || email
      const { subject, html } = generatePaymentInstructionsEmail(
        { ...paymentRequest, customerEmail: recipientEmail },
        {
          groupId: (group as any).groupId,
          productName: (group as any).product?.name || 'Produit',
          deadline: group.deadline
        }
      )
      
      try {
        await emailService.sendEmail({
          to: recipientEmail,
          subject,
          html
        })
      } catch (emailError) {
        console.error('Erreur envoi email paiement:', emailError)
        // On continue même si l'email échoue
      }
    }

    return NextResponse.json({
      success: true,
      participant: {
        name: participant.name,
        phone: formattedPhone,
        quantity,
        amount,
        paymentStatus: participant.paymentStatus
      },
      payment: {
        reference,
        amount,
        currency: 'FCFA',
        description: paymentRequest.description
      },
      paymentLinks: paymentLinks.map(link => ({
        provider: link.provider,
        url: link.url,
        phoneNumber: link.phoneNumber,
        instructions: link.instructions
      })),
      group: {
        id: (group as any).groupId,
        productName: (group as any).product?.name,
        status: group.status,
        deadline: group.deadline,
        progress: Math.round(((group as any).currentQty / (group as any).minQty) * 100)
      }
    })

  } catch (error) {
    console.error('Erreur génération liens de paiement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des liens de paiement' },
      { status: 500 }
    )
  }
}

// Endpoint pour confirmer un paiement manuellement (admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await dbConnect()
    const { groupId } = await params
    const body = await request.json()
    const { phone, paymentStatus, transactionId, paidAmount, adminNote } = body

    // Validation
    if (!phone || !paymentStatus) {
      return NextResponse.json(
        { error: 'phone et paymentStatus requis' },
        { status: 400 }
      )
    }

    if (!['pending', 'partial', 'paid', 'refunded'].includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'paymentStatus invalide' },
        { status: 400 }
      )
    }

    // Trouver l'achat groupé via son identifiant fonctionnel (groupId)
    const group = await GroupOrder.findOne({ groupId })
    if (!group) {
      return NextResponse.json(
        { error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }

    // Trouver et mettre à jour le participant
    const formattedPhone = formatSenegalPhone(phone)
    const participantIndex = group.participants.findIndex(
      (p: { phone: string }) => formatSenegalPhone(p.phone) === formattedPhone
    )

    if (participantIndex === -1) {
      return NextResponse.json(
        { error: 'Participant non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de paiement
    group.participants[participantIndex].paymentStatus = paymentStatus
    if (transactionId) {
      group.participants[participantIndex].transactionId = transactionId
    }
    if (paidAmount !== undefined) {
      group.participants[participantIndex].paidAmount = paidAmount
    }
    if (adminNote) {
      group.participants[participantIndex].adminNote = adminNote
    }
    group.participants[participantIndex].paymentUpdatedAt = new Date()

    await group.save()

    return NextResponse.json({
      success: true,
      message: `Statut de paiement mis à jour: ${paymentStatus}`,
      participant: {
        name: group.participants[participantIndex].name,
        phone: formattedPhone,
        paymentStatus,
        transactionId,
        paidAmount
      }
    })

  } catch (error) {
    console.error('Erreur mise à jour paiement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du paiement' },
      { status: 500 }
    )
  }
}
