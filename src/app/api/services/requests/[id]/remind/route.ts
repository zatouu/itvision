import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { sendPushToUser } from '@/lib/push'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'

// Le prestataire peut relancer le client au maximum 3 fois par 15 minutes
// (le bouton « Relancer le client » de la mission en attente de validation).
const remindLimiter = new RateLimiter(15 * 60 * 1000, 3)

/**
 * POST /api/services/requests/:id/remind — relance le client pour valider la
 * fin de mission (statut awaiting_validation). Push + in-app + socket via
 * sendPushToUser.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const rl = await applyRateLimit(request, remindLimiter)
    if (rl) return rl

    const { id } = await params
    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    if (String(sr.assignedProviderId) !== String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    if (sr.status !== 'awaiting_validation') {
      return NextResponse.json({ error: 'La mission n\'est pas en attente de validation' }, { status: 400 })
    }

    await sendPushToUser(String(sr.clientId), {
      title: 'Validation en attente',
      body: 'Votre prestataire vous rappelle de valider la fin de mission pour libérer le paiement.',
      data: { type: 'request:status-changed', requestId: id, status: sr.status },
      appType: 'consumer',
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/requests/:id/remind]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
