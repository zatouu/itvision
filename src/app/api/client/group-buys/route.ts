import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
)

interface PriceTier {
  minQty: number
  price: number
}

interface Participant {
  userId?: { toString(): string }
  qty?: number
  paymentStatus?: string
}

interface GroupOrderDoc {
  _id: unknown
  groupId?: string
  productId?: unknown
  productName?: string
  product?: {
    productId?: unknown
    name?: string
    basePrice?: number
    currency?: string
  }
  status: string
  origin?: string
  unitPrice?: number
  currentUnitPrice?: number
  currency?: string
  minQty?: number
  targetQty?: number
  currentQty?: number
  deadline?: Date
  createdAt?: Date
  proposal?: {
    message?: string
    desiredQty?: number
    submittedAt?: Date
    reviewedAt?: Date
    rejectionReason?: string
  }
  participants?: Participant[]
  priceTiers?: PriceTier[]
}

interface GroupBuyFormatted {
  id: unknown
  productId: unknown
  productName: string
  status: string
  origin?: string
  unitPrice: number
  currency: string
  minQuantity: number
  targetQuantity: number
  currentQuantity: number
  progress: number
  placesLeft: number
  myQuantity: number
  myStatus: string
  isProposer: boolean
  deadline?: Date
  createdAt?: Date
  proposal: {
    message?: string
    desiredQty?: number
    submittedAt?: Date
    reviewedAt?: Date
    rejectionReason?: string
  } | null
  participantsCount: number
  savings: {
    regularTotal: number
    groupTotal: number
    savings: number
    savingsPercent: number
    tierPrice: number
  } | null
}

// GET /api/client/group-buys - Liste des achats groupés du client
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
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
      payload = verified.payload as { userId: string }
    } catch {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
    }

    await connectMongoose()

    // Récupérer les achats groupés où l'utilisateur est participant
    const groupOrders = await GroupOrder.find({
      'participants.userId': payload.userId
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as GroupOrderDoc[]

    // Formater les résultats
    const groupBuys: GroupBuyFormatted[] = groupOrders.map((g) => {
      const userParticipation = g.participants?.find(
        (p) => p.userId?.toString() === payload.userId
      )
      const currentQty = g.currentQty || 0
      const targetQty = g.targetQty || 1
      const minQty = g.minQty || 10
      const progress = targetQty > 0 
        ? Math.round((currentQty / targetQty) * 100) 
        : 0

      const unitPrice = g.product?.basePrice || g.currentUnitPrice || g.unitPrice || 0

      return {
        id: g._id,
        productId: g.product?.productId || g.productId,
        productName: g.product?.name || g.productName || 'Produit',
        status: g.status,
        origin: g.origin,
        // Prix et quantités
        unitPrice,
        currency: g.product?.currency || g.currency || 'FCFA',
        minQuantity: minQty,
        targetQuantity: targetQty,
        currentQuantity: currentQty,
        progress,
        placesLeft: Math.max(0, minQty - currentQty),
        // Participation de l'utilisateur
        myQuantity: userParticipation?.qty || 0,
        myStatus: userParticipation?.paymentStatus || 'pending',
        isProposer: g.origin === 'client' && g.participants?.[0]?.userId?.toString() === payload.userId,
        // Dates
        deadline: g.deadline,
        createdAt: g.createdAt,
        // Proposition (si applicable)
        proposal: g.proposal ? {
          message: g.proposal.message,
          desiredQty: g.proposal.desiredQty,
          submittedAt: g.proposal.submittedAt,
          reviewedAt: g.proposal.reviewedAt,
          rejectionReason: g.proposal.rejectionReason
        } : null,
        // Stats
        participantsCount: g.participants?.length || 0,
        // Calculs économies
        savings: userParticipation?.qty && g.priceTiers && g.priceTiers.length > 0
          ? calculateSavings(g.priceTiers, unitPrice, userParticipation.qty, currentQty)
          : null
      }
    })

    // Séparer par catégorie
    const myProposals = groupBuys.filter((g) => g.isProposer && g.status === 'pending_approval')
    const activeParticipations = groupBuys.filter((g) => 
      ['open', 'filled', 'ordering'].includes(g.status) && !g.isProposer
    )
    const completedOrders = groupBuys.filter((g) => 
      ['ordered', 'shipped', 'delivered'].includes(g.status)
    )
    const rejectedProposals = groupBuys.filter((g) => 
      g.status === 'rejected' && g.isProposer
    )

    return NextResponse.json({
      success: true,
      groupBuys,
      summary: {
        totalProposals: myProposals.length,
        activeParticipations: activeParticipations.length,
        completedOrders: completedOrders.length,
        pendingApproval: myProposals.length
      },
      categorized: {
        myProposals,
        activeParticipations,
        completedOrders,
        rejectedProposals
      }
    })
  } catch (error) {
    console.error('Erreur récupération achats groupés client:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Helper pour calculer les économies potentielles
function calculateSavings(
  priceTiers: Array<{ minQty: number; price: number }>,
  basePrice: number,
  userQty: number,
  totalQty: number
) {
  // Trouver le palier applicable
  const sortedTiers = [...priceTiers].sort((a, b) => b.minQty - a.minQty)
  const applicableTier = sortedTiers.find(t => totalQty >= t.minQty)
  
  if (!applicableTier) return null

  const regularTotal = userQty * basePrice
  const groupTotal = userQty * applicableTier.price
  const savings = regularTotal - groupTotal
  const savingsPercent = Math.round((savings / regularTotal) * 100)

  return {
    regularTotal,
    groupTotal,
    savings,
    savingsPercent,
    tierPrice: applicableTier.price
  }
}
