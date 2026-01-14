/**
 * API publique pour les produits avec achat groupé activé
 * GET /api/products/group-buy - Liste les produits éligibles à l'achat groupé
 */
import { NextRequest, NextResponse } from 'next/server'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { connectDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')

    // Récupérer les produits avec achat groupé activé
    const query: any = {
      groupBuyEnabled: true,
      isPublished: true
    }

    if (category) {
      query.category = category
    }

    const products = await Product.find(query)
      .select('name slug category mainImage gallery pricing price baseCost marginRate currency priceTiers groupBuyMinQty groupBuyTargetQty')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()

    // Récupérer les achats groupés actifs pour ces produits
    const productIds = products.map((p: any) => p._id.toString())
    
    const activeGroups = await GroupOrder.find({
      'product.productId': { $in: productIds },
      status: { $in: ['open', 'filled'] },
      deadline: { $gte: new Date() }
    }).lean()

    // Mapper les produits avec leurs groupes actifs
    const productsWithGroups = products.map((product: any) => {
      const groups = activeGroups.filter(
        (g: any) => g.product.productId.toString() === product._id.toString()
      )
      
      // Calculer le meilleur prix disponible
      const bestPrice = product.priceTiers?.length > 0
        ? Math.min(...product.priceTiers.map((t: any) => t.price))
        : product.pricing?.salePrice || product.price || product.baseCost

      return {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        image: product.mainImage || product.gallery?.[0],
        basePrice: product.pricing?.salePrice || product.price || product.baseCost,
        bestPrice,
        currency: product.currency || 'FCFA',
        priceTiers: product.priceTiers || [],
        groupBuyMinQty: product.groupBuyMinQty || 10,
        groupBuyTargetQty: product.groupBuyTargetQty || 50,
        activeGroups: groups.map((g: any) => ({
          groupId: g.groupId,
          currentQty: g.currentQty,
          targetQty: g.targetQty,
          currentPrice: g.currentUnitPrice,
          participantCount: g.participants?.length || 0,
          deadline: g.deadline
        })),
        hasActiveGroup: groups.length > 0
      }
    })

    // Stats globales
    const stats = {
      totalProducts: productsWithGroups.length,
      productsWithActiveGroups: productsWithGroups.filter((p: any) => p.hasActiveGroup).length,
      totalActiveGroups: activeGroups.length
    }

    return NextResponse.json({
      success: true,
      products: productsWithGroups,
      stats
    })

  } catch (error) {
    console.error('Erreur récupération produits achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
