import { NextRequest, NextResponse } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Product from '@/lib/models/Product'
import { connectDB } from '@/lib/db'
import { notifyGroupJoinConfirmation } from '@/lib/group-order-notifications'
import { readPaymentSettings } from '@/lib/payments/settings'
import { requireAuth } from '@/lib/jwt'

// Générer un ID unique pour le groupe
function generateGroupId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `GRP-${timestamp}-${random}`
}

// GET - Liste des achats groupés
export async function GET(req: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const query: any = {}
    
    // Par défaut, montrer les achats groupés ouverts
    if (status) {
      query.status = status
    } else {
      query.status = { $in: ['open', 'filled'] }
    }
    
    if (productId) {
      query['product.productId'] = productId
    }
    
    // Ne pas montrer les expirés sauf si demandé
    if (!searchParams.get('includeExpired')) {
      query.deadline = { $gte: new Date() }
    }
    
    const groups = await GroupOrder.find(query)
      // Public response: do not leak participant PII / payment details / chat tokens
      .select(
        '-participants.phone -participants.email -participants.paidAmount -participants.paymentReference -participants.transactionId -participants.adminNote -participants.paymentUpdatedAt -participants.chatAccessTokenHash -participants.chatAccessTokenCreatedAt'
      )
      .sort({ deadline: 1, currentQty: -1 })
      .limit(limit)
      .lean()
    
    // Calculer stats
    const stats = {
      totalOpen: await GroupOrder.countDocuments({ status: 'open', deadline: { $gte: new Date() } }),
      totalFilled: await GroupOrder.countDocuments({ status: 'filled' }),
      totalParticipants: groups.reduce((sum: number, g: any) => sum + (g.participants?.length || 0), 0)
    }
    
    return NextResponse.json({
      success: true,
      groups,
      stats
    })
    
  } catch (error) {
    console.error('Erreur récupération achats groupés:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouvel achat groupé
export async function POST(req: NextRequest) {
  try {
    let auth: Awaited<ReturnType<typeof requireAuth>>
    try {
      auth = await requireAuth(req)
    } catch {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const settings = readPaymentSettings()
    if (!settings.groupOrders.enabled) {
      return NextResponse.json(
        { success: false, error: 'Les achats groupés sont temporairement désactivés' },
        { status: 503 }
      )
    }

    await connectDB()
    
    const body = await req.json()
    const {
      productId,
      qty,
      deadline,
      shippingMethod,
      description,
      creator // { name, phone, email }
    } = body
    
    if (!productId || !qty || !deadline || !creator?.name || !creator?.phone) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes: productId, qty, deadline, creator (name, phone) requis' },
        { status: 400 }
      )
    }
    
    // Récupérer le produit
    const product = await Product.findById(productId).lean() as any
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produit non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifier que l'achat groupé est activé pour ce produit
    if (!product.groupBuyEnabled) {
      return NextResponse.json(
        { success: false, error: 'L\'achat groupé n\'est pas disponible pour ce produit' },
        { status: 400 }
      )
    }
    
    // Calculer le prix unitaire initial
    let currentUnitPrice = product.price || 0
    const priceTiers = product.priceTiers || []
    
    if (priceTiers.length > 0) {
      const sortedTiers = [...priceTiers].sort((a: any, b: any) => b.minQty - a.minQty)
      for (const tier of sortedTiers) {
        if (qty >= tier.minQty && (!tier.maxQty || qty <= tier.maxQty)) {
          currentUnitPrice = tier.price
          break
        }
      }
    }
    
    // Créer l'achat groupé
    const groupOrder = new GroupOrder({
      groupId: generateGroupId(),
      status: 'open',
      product: {
        productId: product._id,
        name: product.name,
        image: product.image,
        basePrice: product.price || 0,
        currency: product.currency || 'FCFA'
      },
      minQty: product.groupBuyMinQty || 10,
      targetQty: product.groupBuyTargetQty || 50,
      currentQty: qty,
      priceTiers,
      currentUnitPrice,
      participants: [{
        userId: auth.userId as any,
        name: creator.name,
        phone: creator.phone,
        email: creator.email,
        qty,
        unitPrice: currentUnitPrice,
        totalAmount: qty * currentUnitPrice,
        paidAmount: 0,
        paymentStatus: 'pending',
        joinedAt: new Date()
      }],
      deadline: new Date(deadline),
      shippingMethod: shippingMethod || 'maritime_60j',
      createdBy: {
        userId: auth.userId as any,
        name: creator.name,
        phone: creator.phone,
        email: creator.email
      },
      description
    })
    
    await groupOrder.save()
    
    // Envoyer notification de confirmation au créateur
    try {
      await notifyGroupJoinConfirmation(
        { 
          name: creator.name, 
          email: creator.email, 
          phone: creator.phone, 
          qty, 
          unitPrice: currentUnitPrice, 
          totalAmount: qty * currentUnitPrice 
        },
        {
          groupId: groupOrder.groupId,
          product: groupOrder.product,
          currentQty: groupOrder.currentQty,
          targetQty: groupOrder.targetQty,
          currentUnitPrice: groupOrder.currentUnitPrice,
          deadline: groupOrder.deadline
        }
      )
    } catch (notifError) {
      console.error('Erreur notification:', notifError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Achat groupé créé avec succès',
      group: groupOrder
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erreur création achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}
