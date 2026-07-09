import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { computeUnlockCost, hasUnlocked } from '@/lib/credit-cost'
import { unlockMission } from '@/lib/wallet'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'

/**
 * POST /api/services/requests/:id/unlock
 * Le prestataire débloque une mission en dépensant des crédits.
 * Retourne le coût, le solde restant, et l'unlockId.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = applyRateLimit(request, serviceWriteRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params

    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    // Seul un provider (pas le client) peut débloquer
    if (String(sr.clientId) === String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    if (!['created', 'pending_offers'].includes(sr.status)) {
      return NextResponse.json({ error: 'Cette mission n\'est plus disponible' }, { status: 409 })
    }

    const [reqLng, reqLat] = sr.location?.coordinates || [0, 0]
    const distanceKm = reqLat && reqLng ? 0 : null

    const cost = await computeUnlockCost({
      requestId: id,
      category: sr.category,
      budget: sr.budget,
      urgency: sr.attributes?.urgency || 'normal',
      media: sr.media,
      distanceKm: distanceKm ?? undefined,
    })

    const already = await hasUnlocked(userId, id)
    if (already) {
      return NextResponse.json({ error: 'Mission déjà débloquée', alreadyUnlocked: true }, { status: 409 })
    }

    const result = await unlockMission(userId, id, cost.cost)
    if (!result.ok) {
      if (result.reason === 'insufficient') {
        return NextResponse.json({
          error: 'Crédits insuffisants',
          reason: result.reason,
          balance: result.balance,
          cost: cost.cost,
        }, { status: 402 })
      }
      return NextResponse.json({ error: 'Déblocage impossible', reason: result.reason }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      unlockId: result.unlockId,
      cost: result.cost,
      balance: result.balance,
      breakdown: cost.breakdown,
      refundWindowMinutes: cost.refundWindowMinutes,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/requests/:id/unlock]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * GET /api/services/requests/:id/unlock
 * Renvoie le coût de déblocage sans consommer de crédits (preview).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params

    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    if (String(sr.clientId) === String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    const already = await hasUnlocked(userId, id)
    const cost = await computeUnlockCost({
      requestId: id,
      category: sr.category,
      budget: sr.budget,
      urgency: sr.attributes?.urgency || 'normal',
      media: sr.media,
    })

    return NextResponse.json({
      cost: cost.cost,
      breakdown: cost.breakdown,
      alreadyUnlocked: already,
      refundWindowMinutes: cost.refundWindowMinutes,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/requests/:id/unlock]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
