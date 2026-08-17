import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import { generateMissionReceiptPdf } from '@/lib/mission-receipt'

// GET /api/services/requests/:id/receipt — reçu PDF d'une mission terminée
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const { id } = await params

    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    if (sr.status !== 'completed') {
      return NextResponse.json({ error: 'Reçu disponible uniquement pour une mission terminée' }, { status: 409 })
    }

    const acceptedOffer = sr.selectedOfferId
      ? await Offer.findById(sr.selectedOfferId).select('price').lean()
      : null

    const gross = Number((acceptedOffer as any)?.price)
    if (!Number.isFinite(gross) || gross <= 0) {
      return NextResponse.json({ error: 'Montant de mission indisponible' }, { status: 409 })
    }

    // Ledger actuel : pas de commission ni de bonus → net = brut (pas de lignes fictives)
    const earnings = { grossAmountFcfa: gross, netAmountFcfa: gross }

    const [clientUser, providerUser, paymentDoc] = await Promise.all([
      User.findById(sr.clientId).select('name').lean() as Promise<any>,
      sr.assignedProviderId ? User.findById(sr.assignedProviderId).select('name').lean() as Promise<any> : null,
      (await import('@/lib/models/Payment')).default
        .findOne({ requestId: id })
        .sort({ createdAt: -1 })
        .select('status')
        .lean() as Promise<any>,
    ])

    const paymentLabel =
      paymentDoc?.status === 'released' ? 'Paiement reçu'
      : paymentDoc?.status === 'held' ? 'Paiement sécurisé (séquestre)'
      : paymentDoc?.status === 'pending' ? 'Paiement en cours de confirmation'
      : paymentDoc?.status === 'failed' || paymentDoc?.status === 'refunded' ? 'Paiement échoué / remboursé'
      : 'Paiement non enregistré'

    const reference = sr.reference || `#${String(sr._id).slice(-6).toUpperCase()}`

    const pdf = generateMissionReceiptPdf({
      reference,
      category: sr.category || '',
      location: sr.location?.address,
      clientName: clientUser?.name,
      providerName: providerUser?.name,
      completedAt: sr.completedAt,
      validatedAt: sr.validatedByClientAt,
      earnings,
      paymentLabel,
    })

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recu-${reference.replace('#', '')}.pdf"`,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/requests/:id/receipt]', e)
    return NextResponse.json({ error: 'Erreur génération du reçu' }, { status: 500 })
  }
}
