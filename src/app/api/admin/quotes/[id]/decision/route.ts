import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminQuote from '@/lib/models/AdminQuote'
import { logAuditEvent } from '@/lib/audit'
import { syncProjectWithQuoteDecision } from '@/lib/finance/billing'
import { syncProjectFinance } from '@/lib/finance/project-finance'

const CHANNELS = ['phone', 'whatsapp', 'email', 'signed_po', 'in_person', 'other'] as const

/**
 * POST /api/admin/quotes/[id]/decision { decision: 'accepted'|'rejected', channel, note?, reference?, decidedAt? }
 * Enregistre la réponse d'un client obtenue hors portail (téléphone, WhatsApp, bon de commande signé…).
 * Mêmes effets qu'une acceptation portail : statut du devis, projet lié approuvé, montants synchronisés.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  const body = await request.json().catch(() => ({})) as any
  const decision = body?.decision === 'rejected' ? 'rejected' : body?.decision === 'accepted' ? 'accepted' : null
  if (!decision) return NextResponse.json({ error: 'Décision invalide' }, { status: 400 })
  const channel = (CHANNELS as readonly string[]).includes(body?.channel) ? body.channel : 'other'
  const decidedAtRaw = body?.decidedAt ? new Date(body.decidedAt) : new Date()
  const decidedAt = Number.isNaN(decidedAtRaw.getTime()) || decidedAtRaw.getTime() > Date.now() + 60_000 ? new Date() : decidedAtRaw

  await connectMongoose()
  const quote = await AdminQuote.findById(id).lean() as any
  if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
  if (quote.status !== 'sent') {
    return NextResponse.json({
      error: quote.status === 'draft' ? 'Envoyez d’abord le devis au client' : `Ce devis est déjà ${quote.status === 'accepted' ? 'accepté' : quote.status === 'rejected' ? 'refusé' : 'remplacé'}`,
    }, { status: 409 })
  }

  const offlineDecision = {
    channel,
    note: String(body?.note || '').trim().slice(0, 500) || undefined,
    reference: String(body?.reference || '').trim().slice(0, 120) || undefined,
    decidedAt,
    recordedBy: auth.user.email || auth.user.id,
  }
  const set: Record<string, unknown> = {
    status: decision,
    clientResponse: decision,
    clientRespondedAt: decidedAt,
    offlineDecision,
    ...(decision === 'accepted' ? { acceptedAt: decidedAt } : { rejectedAt: decidedAt }),
    ...(decision === 'accepted' && offlineDecision.reference && !quote.bonCommande ? { bonCommande: offlineDecision.reference } : {}),
  }
  // Conditionnel : deux clics simultanés ne rejouent pas la décision
  const res = await AdminQuote.updateOne({ _id: id, status: 'sent' }, { $set: set })
  if (res.matchedCount === 0) return NextResponse.json({ error: 'Devis modifié entre-temps, rechargez' }, { status: 409 })

  const author = auth.user.email || 'Admin'
  await syncProjectWithQuoteDecision({ ...quote, status: decision }, decision, author)
    .catch(err => console.error('[quote decision] synchro projet:', err))
  if (quote.projectId) await syncProjectFinance(quote.projectId).catch(err => console.error('[quote decision] montants:', err))

  void logAuditEvent({
    entityType: 'AdminQuote',
    entityId: id,
    action: 'updated',
    previousState: { status: quote.status },
    newState: { status: decision, offlineDecision },
    changedFields: Object.keys(set),
    userId: auth.user.id,
    userRole: auth.user.role,
    metadata: { offline: true, channel },
  }).catch(() => {})

  return NextResponse.json({ success: true, status: decision, projectId: quote.projectId ? String(quote.projectId) : null })
}
