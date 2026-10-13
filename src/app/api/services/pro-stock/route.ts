import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProviderProfile from '@/lib/models/ProviderProfile'
import User from '@/lib/models/User'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { internalPost } from '@/lib/internal-auth'
import { isDdmBridgeEnabled } from '@/lib/wallet'
import { tradeKitFor } from '@/modules/xeuy/trade-kits'

export const dynamic = 'force-dynamic'

const MAX_ITEMS = 50
const PRO_MIN_MISSIONS = 3

function suggestionsFor(categories: string[]): string[] {
  return tradeKitFor(categories).consumables
}

function sanitizeItems(raw: unknown) {
  if (!Array.isArray(raw)) return null
  const seen = new Set<string>()
  const items = []
  for (const it of raw.slice(0, MAX_ITEMS) as any[]) {
    const name = typeof it?.name === 'string' ? it.name.trim().slice(0, 60) : ''
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    const num = (v: unknown) => Math.min(9999, Math.max(0, Math.round(Number(v) || 0)))
    items.push({
      name,
      qty: num(it.qty),
      minQty: num(it.minQty),
      unit: typeof it?.unit === 'string' && it.unit.trim() ? it.unit.trim().slice(0, 12) : undefined,
      updatedAt: new Date(),
    })
  }
  return items
}

async function loadContext(userId: string) {
  const [profile, user] = await Promise.all([
    ProviderProfile.findOne({ userId }).select('stock serviceCategories secondaryCategories kycVerified providerStats').lean() as Promise<any>,
    User.findById(userId).select('marketplaceTier proRequestedAt').lean() as Promise<any>,
  ])
  return { profile, user }
}

function proStatus(profile: any, user: any) {
  const tier = user?.marketplaceTier || 'standard'
  const missions = profile?.providerStats?.completedMissions || 0
  return {
    tier,
    requested: tier === 'standard' && !!user?.proRequestedAt,
    eligible: !!profile?.kycVerified || missions >= PRO_MIN_MISSIONS,
    minMissions: PRO_MIN_MISSIONS,
    missions,
    kycVerified: !!profile?.kycVerified,
  }
}

/**
 * GET /api/services/pro-stock — « Mon stock » du prestataire : consommables, suggestions par métier,
 * statut tarif pro DDM+ et, si l'intégration DDM+ est active, produits et achats groupés correspondants.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireApiUser(request)
    await connectMongoose()
    const { profile, user } = await loadContext(userId)
    if (!profile) return NextResponse.json({ error: 'Réservé aux prestataires' }, { status: 403 })

    const items: any[] = profile.stock || []
    const suggestions = suggestionsFor([...(profile.serviceCategories || []), ...(profile.secondaryCategories || [])])
      .filter(s => !items.some(i => i.name.toLowerCase() === s.toLowerCase()))
    const ddmBridge = await isDdmBridgeEnabled()

    let supplies: { products: any[]; groups: any[] } | null = null
    let lots: any[] = []
    if (ddmBridge) {
      // Articles à racheter en premier, puis le reste du stock, puis les suggestions du métier
      const low = items.filter(i => i.minQty > 0 && i.qty <= i.minQty).map(i => i.name)
      const terms = [...low, ...items.map(i => i.name), ...suggestions].slice(0, 8)
      const [found, mine] = await Promise.all([
        internalPost(request, '/api/internal/market/pro-supplies', { terms }),
        internalPost<{ lots?: any[] }>(request, '/api/internal/market/my-group-lots', { userId }),
      ])
      supplies = found
      lots = mine?.lots || []
    }

    return NextResponse.json({
      items,
      suggestions,
      pro: proStatus(profile, user),
      ddmBridge,
      supplies: supplies || { products: [], groups: [] },
      lots,
    })
  } catch (e) {
    const authRes = authErrorResponse(e)
    if (authRes) return authRes
    console.error('[GET /api/services/pro-stock]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** PATCH /api/services/pro-stock { items } — remplace la liste des consommables. */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireApiUser(request)
    const body = await request.json().catch(() => ({}))
    const items = sanitizeItems(body?.items)
    if (!items) return NextResponse.json({ error: 'Liste invalide' }, { status: 400 })
    await connectMongoose()
    const res = await ProviderProfile.updateOne({ userId }, { $set: { stock: items } })
    if (res.matchedCount === 0) return NextResponse.json({ error: 'Réservé aux prestataires' }, { status: 403 })
    return NextResponse.json({ items })
  } catch (e) {
    const authRes = authErrorResponse(e)
    if (authRes) return authRes
    console.error('[PATCH /api/services/pro-stock]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** POST /api/services/pro-stock { action: 'request_pro' } — demande du tarif pro DDM+ (validation admin). */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireApiUser(request)
    const body = await request.json().catch(() => ({}))
    if (body?.action !== 'request_pro') return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    await connectMongoose()
    if (!(await isDdmBridgeEnabled())) {
      return NextResponse.json({ error: 'Bientôt disponible', code: 'DDM_BRIDGE_DISABLED' }, { status: 409 })
    }
    const { profile, user } = await loadContext(userId)
    if (!profile) return NextResponse.json({ error: 'Réservé aux prestataires' }, { status: 403 })
    const pro = proStatus(profile, user)
    if (!pro.eligible) {
      return NextResponse.json({
        error: `Tarif pro ouvert aux prestataires vérifiés ou ayant réalisé ${PRO_MIN_MISSIONS} missions`,
        code: 'NOT_ELIGIBLE',
      }, { status: 403 })
    }
    const reason = pro.kycVerified ? 'identité vérifiée' : `${pro.missions} missions réalisées`
    const res = await internalPost<{ status?: string }>(request, '/api/internal/market/pro-request', { userId, reason })
    if (!res?.status) return NextResponse.json({ error: 'Demande impossible pour le moment' }, { status: 502 })
    return NextResponse.json({ status: res.status })
  } catch (e) {
    const authRes = authErrorResponse(e)
    if (authRes) return authRes
    console.error('[POST /api/services/pro-stock]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
