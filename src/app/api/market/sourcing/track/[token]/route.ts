/**
 * GET /api/market/sourcing/track/[token]
 *   Retourne l'état d'une demande de sourcing via son publicToken
 *   (lien envoyé par SMS, accessible sans compte).
 *
 * POST /api/market/sourcing/track/[token]
 *   Permet au client d'accepter/refuser la proposition.
 *   Body: { decision: 'accepted' | 'rejected', notes?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest from '@/lib/models/SourcingRequest'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const decisionLimiter = new RateLimiter(60 * 1000, 10)

function serializeForPublic(doc: any) {
  return {
    id: String(doc._id),
    reference: doc.reference,
    status: doc.status,
    title: doc.title,
    description: doc.description,
    source: doc.source,
    imageUrl: doc.imageUrl,
    externalUrl: doc.externalUrl,
    qty: doc.qty,
    budgetMaxFCFA: doc.budgetMaxFCFA,
    deliveryNeededBy: doc.deliveryNeededBy,
    categoryHint: doc.categoryHint,
    contactName: doc.contactName,
    contactPhone: doc.contactPhone
      ? doc.contactPhone.slice(0, 4) + '****' + doc.contactPhone.slice(-2)
      : undefined,
    slaDueAt: doc.slaDueAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    catalogMatches: doc.catalogMatches || [],
    proposal: doc.proposal || null,
    proposalSentAt: doc.proposalSentAt,
    clientDecision: doc.clientDecision,
    clientDecisionAt: doc.clientDecisionAt,
    clientDecisionNotes: doc.clientDecisionNotes,
    productId: doc.productId,
    orderId: doc.orderId
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolved = await params
  const token = (resolved?.token || '').trim()
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
  }
  await connectMongoose()
  const doc = await SourcingRequest.findOne({ publicToken: token }).lean() as any
  if (!doc) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  return NextResponse.json({ success: true, request: serializeForPublic(doc) })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = applyRateLimit(request, decisionLimiter)
  if (limited) return limited

  const resolved = await params
  const token = (resolved?.token || '').trim()
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
  }

  let body: { decision?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const decision = body.decision === 'accepted' || body.decision === 'rejected' ? body.decision : null
  if (!decision) {
    return NextResponse.json({ error: 'Décision invalide' }, { status: 400 })
  }

  await connectMongoose()
  const doc = await SourcingRequest.findOne({ publicToken: token })
  if (!doc) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  if (doc.status !== 'proposal_sent') {
    return NextResponse.json(
      { error: 'Cette demande n\'attend pas de décision pour le moment' },
      { status: 409 }
    )
  }

  if (doc.proposal?.expiresAt && new Date(doc.proposal.expiresAt).getTime() < Date.now()) {
    doc.status = 'expired'
    await doc.save()
    return NextResponse.json(
      { error: 'La proposition a expiré. Recontactez-nous pour une nouvelle estimation.' },
      { status: 410 }
    )
  }

  doc.clientDecision = decision
  doc.clientDecisionAt = new Date()
  if (typeof body.notes === 'string') {
    doc.clientDecisionNotes = body.notes.trim().slice(0, 1000)
  }
  doc.status = decision === 'accepted' ? 'accepted' : 'rejected'
  await doc.save()

  return NextResponse.json({
    success: true,
    request: serializeForPublic(doc.toObject())
  })
}
