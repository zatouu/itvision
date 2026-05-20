import { NextRequest, NextResponse } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Product from '@/lib/models/Product'
import { connectDB } from '@/lib/db'
import { notifyGroupJoinConfirmation } from '@/lib/group-order-notifications'
import { readPaymentSettings } from '@/lib/payments/settings'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'
import type { ShippingMethodId } from '@/lib/logistics'
import { requireAuth } from '@/lib/jwt'

const SHIPPING_METHOD_MAP: Record<string, ShippingMethodId> = {
  maritime_60j: 'sea_freight',
  air_15j: 'air_15',
  express_3j: 'air_express'
}

function calcShippingCostPerUnit(
  shippingMethod: string,
  weightKg: number,
  targetQty: number
): number {
  if (!weightKg || !targetQty || targetQty <= 0) return 0
  const rates = getConfiguredShippingRates()
  const internalMethod = SHIPPING_METHOD_MAP[shippingMethod] || 'sea_freight'
  const rate = rates[internalMethod]
  if (!rate) return 0
  const totalWeight = weightKg * targetQty
  const totalCost = Math.max(rate.minimumCharge || 0, totalWeight * (rate.rate || 0))
  return Math.round(totalCost / targetQty)
}

// Générer un ID unique pour le groupe
function generateGroupId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `GRP-${timestamp}-${random}`
}

// GET - Liste des achats groupés
export async function GET(req: NextRequest) {
  try {
    const settings = readPaymentSettings()
    const groupRules = settings.groupOrders.rules
    const allowedShippingMethods = Object.entries(groupRules.allowedShippingMethods)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method)

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
      stats,
      config: {
        minJoinQty: groupRules.minJoinQty,
        maxJoinQtyPerParticipant: groupRules.maxJoinQtyPerParticipant,
        defaultDeadlineDays: groupRules.defaultDeadlineDays,
        allowedShippingMethods
      }
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
    const groupRules = settings.groupOrders.rules
    const enabledShippingMethods = Object.entries(groupRules.allowedShippingMethods)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method)
    const defaultShippingMethod = enabledShippingMethods[0] || 'maritime_60j'

    await connectDB()
    
    const body = await req.json()
    const {
      productId,
      qty: qtyRaw,
      deadline,
      shippingMethod,
      description,
      creator // { name, phone, email }
    } = body

    const qty = Number(qtyRaw)
    const deadlineDate = deadline
      ? new Date(deadline)
      : new Date(Date.now() + groupRules.defaultDeadlineDays * 24 * 60 * 60 * 1000)
    const allowedShippingMethods = enabledShippingMethods.length > 0
      ? enabledShippingMethods
      : [defaultShippingMethod]
    const normalizedShippingMethod =
      typeof shippingMethod === 'string' && allowedShippingMethods.includes(shippingMethod)
        ? shippingMethod
        : defaultShippingMethod

    const creatorName = typeof creator?.name === 'string' ? creator.name.trim() : ''
    const creatorPhone = typeof creator?.phone === 'string' ? creator.phone.trim() : ''
    const creatorEmail = typeof creator?.email === 'string' ? creator.email.trim() : undefined
    
    if (!productId || !creatorName || !creatorPhone) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes: productId, qty, creator (name, phone) requis' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(qty) || !Number.isInteger(qty)) {
      return NextResponse.json(
        { success: false, error: 'Quantité invalide (entier requis)' },
        { status: 400 }
      )
    }

    if (qty < groupRules.minJoinQty) {
      return NextResponse.json(
        { success: false, error: `Quantité invalide: minimum ${groupRules.minJoinQty}` },
        { status: 400 }
      )
    }

    if (qty > groupRules.maxJoinQtyPerParticipant) {
      return NextResponse.json(
        { success: false, error: `Quantité invalide: maximum ${groupRules.maxJoinQtyPerParticipant}` },
        { status: 400 }
      )
    }

    if (Number.isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Date limite invalide (doit être dans le futur)' },
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
    
    const minQty = Number(product.groupBuyMinQty) > 0 ? Number(product.groupBuyMinQty) : groupRules.defaultMinQty
    const targetQty =
      Number(product.groupBuyTargetQty) >= minQty
        ? Number(product.groupBuyTargetQty)
        : Math.max(minQty, groupRules.defaultTargetQty)
    const maxQty =
      Number(product.groupBuyMaxQty) >= targetQty
        ? Number(product.groupBuyMaxQty)
        : Math.max(targetQty, groupRules.defaultMaxQty)

    if (typeof maxQty === 'number' && qty > maxQty) {
      return NextResponse.json(
        { success: false, error: `Quantité initiale invalide: maximum autorisé ${maxQty}` },
        { status: 400 }
      )
    }

    // Calculer le prix unitaire initial
    let currentUnitPrice = product.price || 0
    const priceTiers = product.priceTiers || []
    
    if (priceTiers.length > 0) {
      const sortedTiers = [...priceTiers].sort((a: any, b: any) => b.minQty - a.minQty)
      for (const tier of sortedTiers) {
        if (qty >= tier.minQty) {
          currentUnitPrice = tier.price
          break
        }
      }
    }

    // Calcul automatique du coût de transport par unité (basé sur targetQty)
    const productWeightKg = product.weightKg || product.grossWeightKg || product.netWeightKg || 0
    const shippingCostPerUnit = calcShippingCostPerUnit(
      normalizedShippingMethod,
      productWeightKg,
      targetQty
    )

    const reachedObjective = qty >= targetQty || (typeof maxQty === 'number' && qty >= maxQty)
    const initialStatus = groupRules.autoFillOnTargetReached && reachedObjective ? 'filled' : 'open'
    
    // Créer l'achat groupé
    const groupOrder = new GroupOrder({
      groupId: generateGroupId(),
      status: initialStatus,
      product: {
        productId: product._id,
        name: product.name,
        image: product.image,
        basePrice: product.price || 0,
        currency: product.currency || 'FCFA'
      },
      minQty,
      targetQty,
      currentQty: qty,
      maxQty,
      maxParticipants: groupRules.maxParticipantsPerGroup,
      priceTiers,
      currentUnitPrice,
      participants: [{
        userId: auth.userId as any,
        name: creatorName,
        phone: creatorPhone,
        email: creatorEmail,
        qty,
        unitPrice: currentUnitPrice,
        totalAmount: qty * currentUnitPrice,
        paidAmount: 0,
        paymentStatus: 'pending',
        joinedAt: new Date()
      }],
      deadline: deadlineDate,
      shippingMethod: normalizedShippingMethod,
      shippingCostPerUnit: shippingCostPerUnit > 0 ? shippingCostPerUnit : undefined,
      createdBy: {
        userId: auth.userId as any,
        name: creatorName,
        phone: creatorPhone,
        email: creatorEmail
      },
      description
    })
    
    await groupOrder.save()
    
    // Envoyer notification de confirmation au créateur
    try {
      await notifyGroupJoinConfirmation(
        { 
          name: creatorName, 
          email: creatorEmail, 
          phone: creatorPhone, 
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
