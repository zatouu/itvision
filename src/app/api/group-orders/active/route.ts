import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'

interface PriceTier {
  minQty: number
  price: number
}

interface GroupOrderDoc {
  _id: unknown
  groupId?: string
  product?: {
    productId?: unknown
    name?: string
    image?: string
    basePrice?: number
    currency?: string
  }
  productId?: unknown
  productName?: string
  minQty?: number
  targetQty?: number
  currentQty?: number
  currentUnitPrice?: number
  unitPrice?: number
  currency?: string
  priceTiers?: PriceTier[]
  participants?: unknown[]
  deadline?: Date
  status?: string
}

/**
 * GET /api/group-orders/active
 * 
 * Récupère les achats groupés actifs (ouverts) pour affichage dans la sidebar
 * Accessible publiquement
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)
    const excludeProductId = searchParams.get('excludeProductId')

    const query: Record<string, unknown> = {
      status: 'open',
      deadline: { $gte: new Date() }
    }

    // Optionnel: exclure un produit spécifique (celui qu'on regarde)
    if (excludeProductId) {
      query['product.productId'] = { $ne: excludeProductId }
    }

    const activeGroups = await GroupOrder.find(query)
      .select('groupId product minQty targetQty currentQty currentUnitPrice priceTiers participants deadline status productName productId unitPrice currency')
      .sort({ currentQty: -1, deadline: 1 })
      .limit(limit)
      .lean() as unknown as GroupOrderDoc[]

    // Calculer les infos pour l'affichage
    const formattedGroups = activeGroups.map((group) => {
      const currentQty = group.currentQty || 0
      const targetQty = group.targetQty || 1
      const progress = Math.round((currentQty / targetQty) * 100)
      const participantsCount = group.participants?.length || 0
      const placesLeft = Math.max(0, targetQty - currentQty)
      
      // Calculer le discount max possible
      let maxDiscount = 0
      const basePrice = group.product?.basePrice || group.unitPrice || 0
      if (group.priceTiers && group.priceTiers.length > 0 && basePrice) {
        const lastTier = group.priceTiers.reduce((a, b) => a.minQty > b.minQty ? a : b)
        maxDiscount = Math.round(((basePrice - lastTier.price) / basePrice) * 100)
      }

      // Déterminer le statut d'urgence
      const deadline = group.deadline ? new Date(group.deadline) : new Date()
      const hoursLeft = Math.max(0, (deadline.getTime() - Date.now()) / (1000 * 60 * 60))
      let urgencyStatus: 'active' | 'almost_full' | 'ending_soon' = 'active'
      if (progress >= 80) urgencyStatus = 'almost_full'
      if (hoursLeft < 24) urgencyStatus = 'ending_soon'

      return {
        id: group.groupId || group._id,
        productName: group.product?.name || group.productName,
        productImage: group.product?.image,
        productId: group.product?.productId || group.productId,
        basePrice: basePrice,
        currentPrice: group.currentUnitPrice || group.unitPrice,
        currency: group.product?.currency || group.currency || 'FCFA',
        discount: maxDiscount,
        currentParticipants: participantsCount,
        targetParticipants: Math.ceil(targetQty / 5),
        currentQty,
        targetQty,
        progress,
        placesLeft,
        deadline: group.deadline,
        hoursLeft: Math.round(hoursLeft),
        urgencyStatus
      }
    })

    return NextResponse.json({
      success: true,
      groups: formattedGroups,
      total: formattedGroups.length
    })

  } catch (error) {
    console.error('Error fetching active group orders:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des achats groupés' },
      { status: 500 }
    )
  }
}
