import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'
import User from '@/lib/models/User'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
)

interface Participant {
  userId?: {
    _id?: string
    name?: string
    email?: string
    phone?: string
  }
}

interface GroupOrderDoc {
  _id: unknown
  productId?: unknown
  productName?: string
  product?: {
    productId?: unknown
    name?: string
  }
  proposal?: {
    message?: string
    desiredQty?: number
    submittedAt?: Date
  }
  targetQty?: number
  currentUnitPrice?: number
  unitPrice?: number
  currency?: string
  deadline?: Date
  createdAt?: Date
  participants?: Participant[]
}

// GET /api/admin/group-orders/pending - Liste des propositions en attente de validation
export async function GET(request: NextRequest) {
  try {
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

    // Paramètres de pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Récupérer les propositions en attente
    const [proposals, total] = await Promise.all([
      GroupOrder.find({ 
        status: 'pending_approval',
        origin: 'client'
      })
        .populate('participants.userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as Promise<GroupOrderDoc[]>,
      GroupOrder.countDocuments({ 
        status: 'pending_approval',
        origin: 'client'
      })
    ])

    const formattedProposals = proposals.map((p) => {
      const firstParticipant = p.participants?.[0]?.userId
      return {
        id: p._id,
        productId: p.product?.productId || p.productId,
        productName: p.product?.name || p.productName,
        proposedBy: firstParticipant ? {
          id: firstParticipant._id,
          name: firstParticipant.name,
          email: firstParticipant.email,
          phone: firstParticipant.phone
        } : null,
        proposalMessage: p.proposal?.message,
        desiredQuantity: p.proposal?.desiredQty || p.targetQty,
        estimatedUnitPrice: p.currentUnitPrice || p.unitPrice,
        currency: p.currency || 'FCFA',
        submittedAt: p.proposal?.submittedAt || p.createdAt,
        deadline: p.deadline
      }
    })

    return NextResponse.json({
      success: true,
      proposals: formattedProposals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    })
  } catch (error) {
    console.error('Erreur liste propositions:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
