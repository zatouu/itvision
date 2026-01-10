import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'
import User from '@/lib/models/User'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
)

interface ReviewBody {
  action: 'approve' | 'reject'
  rejectionReason?: string
}

// POST /api/admin/group-orders/[id]/review - Approuver ou rejeter une proposition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Vérifier l'authentification admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let payload
    try {
      const verified = await jwtVerify(token, JWT_SECRET)
      payload = verified.payload as { userId: string; role?: string }
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est admin
    await connectMongoose()
    const adminUser = await User.findById(payload.userId)
    if (!adminUser || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.json(
        { error: 'Accès refusé - Privilèges admin requis' },
        { status: 403 }
      )
    }

    // Parser le body
    const body: ReviewBody = await request.json()
    const { action, rejectionReason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez "approve" ou "reject"' },
        { status: 400 }
      )
    }

    // Récupérer la proposition
    const groupOrder = await GroupOrder.findById(id)
    if (!groupOrder) {
      return NextResponse.json(
        { error: 'Proposition non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que c'est bien une proposition en attente
    if (groupOrder.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Cette proposition ne peut pas être modifiée. Statut actuel: ' + groupOrder.status },
        { status: 400 }
      )
    }

    // Mettre à jour selon l'action
    if (action === 'approve') {
      groupOrder.status = 'open'
      groupOrder.proposal = {
        ...groupOrder.proposal,
        reviewedAt: new Date(),
        reviewedBy: adminUser._id
      }
      
      // Notifier le proposeur (via socket si disponible)
      if (global.io && groupOrder.participants?.[0]?.userId) {
        global.io.to(`user-${groupOrder.participants[0].userId}`).emit('group-proposal-approved', {
          groupId: groupOrder._id,
          productName: groupOrder.productName,
          message: 'Votre proposition d\'achat groupé a été approuvée !'
        })
      }
      
      await groupOrder.save()

      return NextResponse.json({
        success: true,
        message: 'Proposition approuvée - L\'achat groupé est maintenant ouvert',
        groupOrder: {
          id: groupOrder._id,
          status: groupOrder.status,
          productName: groupOrder.productName,
          reviewedAt: groupOrder.proposal?.reviewedAt
        }
      })
    } else {
      // Reject
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Une raison de refus est requise' },
          { status: 400 }
        )
      }

      groupOrder.status = 'rejected'
      groupOrder.proposal = {
        ...groupOrder.proposal,
        reviewedAt: new Date(),
        reviewedBy: adminUser._id,
        rejectionReason
      }

      // Notifier le proposeur
      if (global.io && groupOrder.participants?.[0]?.userId) {
        global.io.to(`user-${groupOrder.participants[0].userId}`).emit('group-proposal-rejected', {
          groupId: groupOrder._id,
          productName: groupOrder.productName,
          reason: rejectionReason,
          message: 'Votre proposition d\'achat groupé a été refusée'
        })
      }

      await groupOrder.save()

      return NextResponse.json({
        success: true,
        message: 'Proposition refusée',
        groupOrder: {
          id: groupOrder._id,
          status: groupOrder.status,
          productName: groupOrder.productName,
          rejectionReason,
          reviewedAt: groupOrder.proposal?.reviewedAt
        }
      })
    }
  } catch (error) {
    console.error('Erreur review proposition:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// GET /api/admin/group-orders/[id]/review - Récupérer les détails d'une proposition
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Vérifier l'authentification admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let payload
    try {
      const verified = await jwtVerify(token, JWT_SECRET)
      payload = verified.payload as { userId: string; role?: string }
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
    }

    await connectMongoose()
    const adminUser = await User.findById(payload.userId)
    if (!adminUser || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.json(
        { error: 'Accès refusé - Privilèges admin requis' },
        { status: 403 }
      )
    }

    const groupOrder = await GroupOrder.findById(id)
      .populate('participants.userId', 'name email phone')
      .lean() as Record<string, unknown> | null

    if (!groupOrder) {
      return NextResponse.json(
        { error: 'Proposition non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      proposal: {
        id: groupOrder._id,
        productId: (groupOrder.product as Record<string, unknown>)?.productId || groupOrder.productId,
        productName: (groupOrder.product as Record<string, unknown>)?.name || groupOrder.productName,
        status: groupOrder.status,
        origin: groupOrder.origin,
        minQuantity: groupOrder.minQty,
        targetQuantity: groupOrder.targetQty,
        currentQuantity: groupOrder.currentQty,
        unitPrice: groupOrder.currentUnitPrice || (groupOrder.product as Record<string, unknown>)?.basePrice,
        currency: (groupOrder.product as Record<string, unknown>)?.currency || 'FCFA',
        deadline: groupOrder.deadline,
        proposal: groupOrder.proposal,
        participants: groupOrder.participants,
        createdAt: groupOrder.createdAt,
        updatedAt: groupOrder.updatedAt
      }
    })
  } catch (error) {
    console.error('Erreur récupération proposition:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
