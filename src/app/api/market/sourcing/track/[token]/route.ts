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
import { Order } from '@/lib/models/Order'
import { notifyAdmins } from '@/lib/notify'
import { createOrderFromSourcingProposal, sourcingPaymentPath } from '@/lib/market/sourcing-order'

export const dynamic = 'force-dynamic'

const decisionLimiter = new RateLimiter(60 * 1000, 10)

/** Lien de paiement tant que la commande issue de la proposition reste à payer. */
async function paymentInfo(doc: any): Promise<{ paymentUrl: string | null; orderStatus: string | null; paymentStatus: string | null }> {
  if (!doc.orderId) return { paymentUrl: null, orderStatus: null, paymentStatus: null }
  const order = await Order.findOne({ orderId: doc.orderId }).select('status paymentStatus').lean() as any
  if (!order) return { paymentUrl: null, orderStatus: null, paymentStatus: null }
  const payable = order.status === 'pending' && order.paymentStatus !== 'completed' && !!doc.orderAccessToken
  return {
    paymentUrl: payable ? sourcingPaymentPath(doc.orderId, doc.orderAccessToken) : null,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
  }
}

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
    budgetScope: doc.budgetScope,
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
    proposal: ['proposal_sent', 'accepted', 'rejected', 'fulfilled', 'expired'].includes(doc.status) ? doc.proposal || null : null,
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
  const doc = await SourcingRequest.findOne({ publicToken: token }).select('+orderAccessToken').lean() as any
  if (!doc) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  return NextResponse.json({ success: true, request: { ...serializeForPublic(doc), ...(await paymentInfo(doc)) } })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = await applyRateLimit(request, decisionLimiter)
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
  const doc = await SourcingRequest.findOne({ publicToken: token }).select('+orderAccessToken')
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

  // Réservation de la décision : un double clic ne crée pas deux commandes
  const claimed = await SourcingRequest.updateOne(
    { _id: doc._id, status: 'proposal_sent' },
    { $set: { status: doc.status, clientDecision: decision, clientDecisionAt: doc.clientDecisionAt, clientDecisionNotes: doc.clientDecisionNotes } }
  )
  if (claimed.modifiedCount !== 1) {
    return NextResponse.json({ error: 'Décision déjà enregistrée' }, { status: 409 })
  }

  // Particulier : la commande à payer est créée tout de suite (B2B : suivi par l'équipe, devis/facture)
  if (decision === 'accepted' && doc.proposal && !doc.orderId && !doc.companyClientId) {
    try {
      const { orderId, accessToken } = await createOrderFromSourcingProposal(doc)
      doc.orderId = orderId
      doc.orderAccessToken = accessToken
      await SourcingRequest.updateOne({ _id: doc._id }, { $set: { orderId, orderAccessToken: accessToken } })
    } catch (err) {
      console.error('[sourcing] création commande:', err)
    }
  }

  void notifyAdmins({
    type: decision === 'accepted' ? 'success' : 'info',
    title: decision === 'accepted' ? 'Proposition de sourcing acceptée' : 'Proposition de sourcing refusée',
    message: `${doc.reference}${doc.orderId ? ` → commande ${doc.orderId} en attente de paiement` : ''}`,
    actionUrl: '/admin/sourcing',
    metadata: { reference: doc.reference, orderId: doc.orderId },
  })

  return NextResponse.json({
    success: true,
    request: { ...serializeForPublic(doc.toObject()), ...(await paymentInfo(doc)) }
  })
}
