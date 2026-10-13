import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProviderProfile from '@/lib/models/ProviderProfile'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { internalPost } from '@/lib/internal-auth'
import { isDdmBridgeEnabled } from '@/lib/wallet'
import { tradeKitFor } from '@/modules/xeuy/trade-kits'

export const dynamic = 'force-dynamic'

const OPEN_STATUSES = ['created', 'broadcasted', 'pending_offers']

/**
 * GET /api/services/starter-kit — « Bien démarrer » d'un prestataire : demandes ouvertes dans ses métiers,
 * kit de base (outils, consommables) et, si DDM+ est actif, produits et achats groupés pour s'équiper.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireApiUser(request)
    await connectMongoose()
    const profile = await ProviderProfile.findOne({ userId })
      .select('serviceCategories secondaryCategories stock kycVerified')
      .lean() as any
    if (!profile) return NextResponse.json({ error: 'Réservé aux prestataires' }, { status: 403 })

    const categories: string[] = [...new Set<string>([...(profile.serviceCategories || []), ...(profile.secondaryCategories || [])])]
    const since = new Date(Date.now() - 30 * 86400000)
    const counts = categories.length
      ? await ServiceRequest.aggregate([
          { $match: { category: { $in: categories }, status: { $in: OPEN_STATUSES }, createdAt: { $gte: since } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ])
      : []
    const countMap = new Map(counts.map((c: any) => [String(c._id), c.count as number]))

    const kit = tradeKitFor(categories)
    const inStock = new Set(((profile.stock || []) as any[]).map(i => String(i.name).toLowerCase()))
    const ddmBridge = await isDdmBridgeEnabled()
    const supplies = ddmBridge
      ? await internalPost(request, '/api/internal/market/pro-supplies', { terms: [...kit.tools, ...kit.consumables].slice(0, 8) })
      : null

    return NextResponse.json({
      categories: categories.map(slug => ({ slug, openRequests: countMap.get(slug) || 0 })),
      openRequests: [...countMap.values()].reduce((a, b) => a + b, 0),
      kit: {
        tools: kit.tools,
        consumables: kit.consumables.map(name => ({ name, inStock: inStock.has(name.toLowerCase()) })),
      },
      kycVerified: !!profile.kycVerified,
      ddmBridge,
      supplies: supplies || { products: [], groups: [] },
    })
  } catch (e) {
    const authRes = authErrorResponse(e)
    if (authRes) return authRes
    console.error('[GET /api/services/starter-kit]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
