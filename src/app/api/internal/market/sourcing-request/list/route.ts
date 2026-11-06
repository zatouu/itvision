/**
 * POST /api/internal/market/sourcing-request/list
 * Liste serveur-à-serveur des demandes de sourcing d'une société cliente.
 * Body : { companyClientId, limit? }
 * Réponse : { requests: [...] } — projection sûre (aucune donnée admin interne).
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest from '@/lib/models/SourcingRequest'
import { isInternalCall } from '@/lib/internal-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({} as any))
    const companyClientId = String(body?.companyClientId || '').trim()
    if (!companyClientId) {
      return NextResponse.json({ error: 'companyClientId requis' }, { status: 400 })
    }
    const limit = Math.min(Math.max(parseInt(String(body?.limit || '20'), 10) || 20, 1), 50)

    await connectMongoose()

    const docs = await SourcingRequest.find({ companyClientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('reference title description qty budgetMaxFCFA externalUrl status createdAt slaDueAt proposal productId orderId clientDecision')
      .lean() as any[]

    return NextResponse.json({
      requests: docs.map(d => ({
        id: String(d._id),
        reference: d.reference,
        title: d.title,
        description: d.description,
        qty: d.qty,
        budgetMaxFCFA: d.budgetMaxFCFA,
        externalUrl: d.externalUrl,
        status: d.status,
        createdAt: d.createdAt,
        slaDueAt: d.slaDueAt,
        clientDecision: d.clientDecision,
        // Proposition visible seulement une fois envoyée au client
        proposal: d.proposal && ['proposal_sent', 'accepted', 'rejected', 'fulfilled'].includes(d.status)
          ? {
              productName: d.proposal.productName,
              productImage: d.proposal.productImage,
              supplierUrl: d.proposal.supplierUrl,
              qty: d.proposal.qty,
              totalClientPrice: d.proposal.totalClientPrice,
              deliveryDays: d.proposal.deliveryDays,
              expiresAt: d.proposal.expiresAt,
              notes: d.proposal.notes,
            }
          : null,
      })),
    })
  } catch (error) {
    console.error('[POST /api/internal/market/sourcing-request/list]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
