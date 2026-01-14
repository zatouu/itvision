import { NextRequest, NextResponse } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { connectDB } from '@/lib/db'
import { validateSenegalPhone, formatSenegalPhone } from '@/lib/payment-service'
import { 
  notifyGroupJoinConfirmation, 
  notifyNewParticipant, 
  notifyObjectiveReached,
  notifyStatusUpdate 
} from '@/lib/group-order-notifications'

interface RouteContext {
  params: Promise<{ groupId: string }>
}

// GET - Détails d'un achat groupé
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    await connectDB()
    
    const group = await GroupOrder.findOne({ groupId }).lean()
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      group
    })
    
  } catch (error) {
    console.error('Erreur récupération achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Rejoindre un achat groupé
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    await connectDB()
    
    const body = await req.json()
    const { name, phone, email, qty } = body

    if (!name || !phone || !qty || qty < 1) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes: name, phone, qty requis' },
        { status: 400 }
      )
    }

    if (!validateSenegalPhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Numéro de téléphone sénégalais invalide' },
        { status: 400 }
      )
    }
    
    const group = await GroupOrder.findOne({ groupId })
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifications
    if (group.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Cet achat groupé n\'est plus ouvert aux inscriptions' },
        { status: 400 }
      )
    }
    
    if (new Date(group.deadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'La date limite est dépassée' },
        { status: 400 }
      )
    }

    const normalizedPhone = formatSenegalPhone(phone)

    // Vérifier si déjà participant (par téléphone, normalisé)
    const existingParticipant = group.participants.find(
      (p: any) => formatSenegalPhone(p.phone) === normalizedPhone
    )
    if (existingParticipant) {
      return NextResponse.json(
        { success: false, error: 'Vous participez déjà à cet achat groupé' },
        { status: 400 }
      )
    }

    // Vérifier max participants
    if (group.maxParticipants && group.participants.length >= group.maxParticipants) {
      return NextResponse.json(
        { success: false, error: 'Nombre maximum de participants atteint' },
        { status: 400 }
      )
    }
    
    // Calculer nouveau prix avec la quantité ajoutée
    const previousUnitPrice = group.currentUnitPrice
    const newTotalQty = group.currentQty + qty
    let newUnitPrice = group.product.basePrice
    
    if (group.priceTiers && group.priceTiers.length > 0) {
      const sortedTiers = [...group.priceTiers].sort((a: any, b: any) => b.minQty - a.minQty)
      for (const tier of sortedTiers) {
        if (newTotalQty >= tier.minQty && (!tier.maxQty || newTotalQty <= tier.maxQty)) {
          newUnitPrice = tier.price
          break
        }
      }
    }
    
    // Ajouter le participant (téléphone déjà normalisé)
    group.participants.push({
      name,
      phone: normalizedPhone,
      email,
      qty,
      unitPrice: newUnitPrice,
      totalAmount: qty * newUnitPrice,
      paidAmount: 0,
      paymentStatus: 'pending',
      joinedAt: new Date()
    })
    
    group.currentQty = newTotalQty
    group.currentUnitPrice = newUnitPrice
    
    // Mettre à jour les prix de tous les participants si le prix a changé
    if (newUnitPrice !== previousUnitPrice) {
      group.participants.forEach((p: any) => {
        p.unitPrice = newUnitPrice
        p.totalAmount = p.qty * newUnitPrice
      })
    }
    
    // Vérifier si quantité min atteinte
    const objectiveJustReached = group.currentQty >= group.minQty && group.status === 'open'
    if (objectiveJustReached) {
      group.status = 'filled'
    }
    
    await group.save()
    
    // Envoyer les notifications
    try {
      const groupData = {
        groupId: group.groupId,
        product: group.product,
        currentQty: group.currentQty,
        targetQty: group.targetQty,
        currentUnitPrice: group.currentUnitPrice,
        deadline: group.deadline
      }
      
      const newParticipantData = { name, phone: normalizedPhone, email, qty, unitPrice: newUnitPrice, totalAmount: qty * newUnitPrice }
      
      // 1. Confirmation au nouveau participant
      await notifyGroupJoinConfirmation(newParticipantData, groupData)
      
      // 2. Notifier les autres participants
      const otherParticipants = group.participants
        .filter((p: any) => p.phone !== normalizedPhone)
        .map((p: any) => ({ name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount }))
      
      if (otherParticipants.length > 0) {
        await notifyNewParticipant(otherParticipants, newParticipantData, groupData)
      }
      
      // 3. Si objectif atteint, notifier tout le monde
      if (objectiveJustReached) {
        const allParticipants = group.participants.map((p: any) => ({
          name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount
        }))
        await notifyObjectiveReached(allParticipants, groupData)
      }
    } catch (notifError) {
      console.error('Erreur notifications:', notifError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Vous avez rejoint l\'achat groupé avec succès',
      group,
      yourParticipation: {
        qty,
        unitPrice: newUnitPrice,
        totalAmount: qty * newUnitPrice
      }
    })
    
  } catch (error) {
    console.error('Erreur participation achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'inscription' },
      { status: 500 }
    )
  }
}

// PATCH - Modifier un achat groupé (admin)
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    await connectDB()
    
    const body = await req.json()
    const updateData: any = {}
    
    // Champs modifiables
    if (body.status) updateData.status = body.status
    if (body.deadline) updateData.deadline = new Date(body.deadline)
    if (body.shippingMethod) updateData.shippingMethod = body.shippingMethod
    if (body.shippingCostPerUnit !== undefined) updateData.shippingCostPerUnit = body.shippingCostPerUnit
    if (body.description !== undefined) updateData.description = body.description
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes
    if (body.linkedOrderId) updateData.linkedOrderId = body.linkedOrderId
    if (body.estimatedDelivery) updateData.estimatedDelivery = new Date(body.estimatedDelivery)
    
    // Mise à jour paiement d'un participant
    if (body.participantPhone && body.paymentUpdate) {
      const group = await GroupOrder.findOne({ groupId })
      if (group) {
        const formattedPhone = formatSenegalPhone(body.participantPhone)
        const participant = group.participants.find(
          (p: any) => formatSenegalPhone(p.phone) === formattedPhone
        )
        if (participant) {
          if (body.paymentUpdate.paidAmount !== undefined) {
            participant.paidAmount = body.paymentUpdate.paidAmount
          }
          if (body.paymentUpdate.paymentStatus) {
            participant.paymentStatus = body.paymentUpdate.paymentStatus
          }
          await group.save()
          return NextResponse.json({
            success: true,
            message: 'Paiement mis à jour',
            group
          })
        }
      }
    }
    
    updateData.updatedAt = new Date()
    
    // Récupérer le groupe avant mise à jour pour comparer le statut
    const previousGroup = await GroupOrder.findOne({ groupId }).lean() as any
    const previousStatus = previousGroup?.status
    
    const group = await GroupOrder.findOneAndUpdate(
      { groupId },
      updateData,
      { new: true }
    ).lean() as any
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    
    // Envoyer notification si le statut a changé
    if (body.status && body.status !== previousStatus) {
      try {
        const participants = group.participants.map((p: any) => ({
          name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount
        }))
        const groupData = {
          groupId: group.groupId,
          product: group.product,
          currentQty: group.currentQty,
          targetQty: group.targetQty,
          currentUnitPrice: group.currentUnitPrice,
          deadline: group.deadline
        }
        await notifyStatusUpdate(participants, groupData, body.status, body.statusMessage)
      } catch (notifError) {
        console.error('Erreur notification statut:', notifError)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Achat groupé mis à jour',
      group
    })
    
  } catch (error) {
    console.error('Erreur modification achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un achat groupé
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    await connectDB()
    
    const group = await GroupOrder.findOne({ groupId })
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    
    // Ne pas supprimer si des paiements ont été effectués
    const hasPaidParticipants = group.participants.some((p: any) => p.paidAmount > 0)
    if (hasPaidParticipants) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer: des paiements ont été effectués' },
        { status: 400 }
      )
    }
    
    await GroupOrder.deleteOne({ groupId })
    
    return NextResponse.json({
      success: true,
      message: 'Achat groupé supprimé'
    })
    
  } catch (error) {
    console.error('Erreur suppression achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}
