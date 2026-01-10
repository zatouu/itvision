import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Product from '@/lib/models/Product'
import User from '@/lib/models/User'
import { nanoid } from 'nanoid'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
)

interface ProductDoc {
  _id: unknown
  name: string
  price?: number
  image?: string
  gallery?: string[]
  currency?: string
  groupBuyEnabled?: boolean
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  priceTiers?: Array<{ minQty: number; price: number }>
}

interface UserDoc {
  _id: unknown
  name: string
  email: string
  phone?: string
}

/**
 * POST /api/group-orders/propose
 * 
 * Permet à un client authentifié de proposer un achat groupé.
 * La proposition sera en statut "pending_approval" jusqu'à validation admin.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()

    // Vérifier l'authentification - Support cookie ET header Bearer
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : cookieToken

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise pour proposer un achat groupé' },
        { status: 401 }
      )
    }

    let payload
    try {
      const verified = await jwtVerify(token, JWT_SECRET)
      payload = verified.payload as { userId: string }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Session expirée, veuillez vous reconnecter' },
        { status: 401 }
      )
    }

    // Récupérer l'utilisateur
    const user = await User.findById(payload.userId).lean() as UserDoc | null
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { productId, message, desiredQty } = body

    // Validation
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'ID du produit requis' },
        { status: 400 }
      )
    }

    if (!desiredQty || desiredQty < 1) {
      return NextResponse.json(
        { success: false, error: 'Quantité souhaitée invalide' },
        { status: 400 }
      )
    }

    // Récupérer le produit
    const product = await Product.findById(productId).lean() as ProductDoc | null
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le produit a l'achat groupé activé
    if (!product.groupBuyEnabled) {
      return NextResponse.json(
        { success: false, error: 'L\'achat groupé n\'est pas activé pour ce produit' },
        { status: 400 }
      )
    }

    // Vérifier qu'il n'y a pas déjà une proposition en attente pour ce produit par cet utilisateur
    const existingProposal = await GroupOrder.findOne({
      productId: productId,
      'participants.userId': user._id,
      status: 'pending_approval'
    })

    if (existingProposal) {
      return NextResponse.json(
        { success: false, error: 'Vous avez déjà une proposition en attente pour ce produit' },
        { status: 409 }
      )
    }

    // Vérifier qu'il n'y a pas déjà un achat groupé ouvert pour ce produit
    const existingOpenGroup = await GroupOrder.findOne({
      productId: productId,
      status: 'open',
      deadline: { $gte: new Date() }
    })

    if (existingOpenGroup) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Un achat groupé est déjà en cours pour ce produit',
          existingGroupId: existingOpenGroup.groupId
        },
        { status: 409 }
      )
    }

    // Créer la proposition
    const groupId = `GRP-${Date.now()}-${nanoid(6).toUpperCase()}`
    const basePrice = product.price || 0
    
    // Deadline par défaut : 14 jours
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 14)

    const groupOrder = new GroupOrder({
      groupId,
      status: 'pending_approval',
      origin: 'client',
      
      productId: product._id,
      productName: product.name,
      productImage: product.image || product.gallery?.[0],
      
      unitPrice: basePrice,
      currency: product.currency || 'FCFA',
      
      minQuantity: product.groupBuyMinQty || 10,
      targetQuantity: product.groupBuyTargetQty || 50,
      currentQuantity: desiredQty,
      
      priceTiers: product.priceTiers || [],
      
      // Le proposant est automatiquement le premier participant
      participants: [{
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        quantity: desiredQty,
        unitPrice: basePrice,
        totalAmount: basePrice * desiredQty,
        paidAmount: 0,
        status: 'pending',
        joinedAt: new Date()
      }],
      
      deadline,
      
      proposal: {
        message: message || `Je souhaite lancer un achat groupé pour ${product.name}`,
        desiredQty,
        submittedAt: new Date()
      },
      
      description: `Proposition d'achat groupé par ${user.name}`
    })

    await groupOrder.save()

    // TODO: Notifier les admins (email/socket)
    // emailService.notifyAdmins('new_group_proposal', { ... })

    return NextResponse.json({
      success: true,
      message: 'Votre proposition d\'achat groupé a été soumise et sera examinée par notre équipe sous 24-48h',
      proposal: {
        groupId: groupOrder.groupId,
        productName: product.name,
        status: groupOrder.status,
        desiredQty,
        submittedAt: groupOrder.proposal?.submittedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating group order proposal:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la proposition' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/group-orders/propose?productId=xxx
 * 
 * Vérifie si une proposition ou un achat groupé existe déjà pour un produit
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId requis' },
        { status: 400 }
      )
    }

    // Vérifier s'il y a un achat groupé ouvert
    const openGroup = await GroupOrder.findOne({
      productId: productId,
      status: 'open',
      deadline: { $gte: new Date() }
    }).lean()

    // Vérifier s'il y a des propositions en attente
    const pendingProposals = await GroupOrder.countDocuments({
      productId: productId,
      status: 'pending_approval'
    })

    return NextResponse.json({
      success: true,
      hasOpenGroup: !!openGroup,
      openGroup: openGroup ? {
        groupId: (openGroup as { groupId?: string }).groupId,
        currentQty: (openGroup as { currentQuantity?: number }).currentQuantity,
        targetQty: (openGroup as { targetQuantity?: number }).targetQuantity,
        participantsCount: ((openGroup as { participants?: unknown[] }).participants || []).length,
        deadline: (openGroup as { deadline?: Date }).deadline
      } : null,
      pendingProposalsCount: pendingProposals
    })

  } catch (error) {
    console.error('Error checking group order status:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}
