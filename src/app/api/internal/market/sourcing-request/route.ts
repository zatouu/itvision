/**
 * POST /api/internal/market/sourcing-request
 * Création serveur-à-serveur d'une demande de sourcing pour le portail entreprise
 * (le corporate ne peut pas importer le modèle market — cf. AGENTS.md règle 1).
 *
 * Body : { companyClientId, userId, contactPhone, contactName?, contactEmail?,
 *          title?, description, qty?, budgetMaxFCFA?, externalUrl?, categoryHint? }
 * Réponse : { ok, reference, id, slaDueAt }
 *
 * Enchaîne l'agent `sourcing_request` existant : l'admin reçoit une proposition
 * chiffrée à valider dans /admin/copilot (HITL).
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest, {
  computeSlaDueAt,
  generatePublicToken,
  generateSourcingReference,
} from '@/lib/models/SourcingRequest'
import { isInternalCall } from '@/lib/internal-auth'
import { notifyUser, notifyAdmins } from '@/lib/notify'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({} as any))

    const companyClientId = String(body?.companyClientId || '').trim()
    const userId = String(body?.userId || '').trim()
    const description = String(body?.description || '').trim().slice(0, 4000)
    const contactPhone = String(body?.contactPhone || '').trim()

    if (!companyClientId || !userId) {
      return NextResponse.json({ error: 'companyClientId et userId requis' }, { status: 400 })
    }
    if (description.length < 10) {
      return NextResponse.json({ error: 'Description trop courte (10 caractères min.)' }, { status: 400 })
    }
    if (!contactPhone) {
      return NextResponse.json({ error: 'Téléphone de contact requis' }, { status: 400 })
    }

    await connectMongoose()

    const qty = Math.min(Math.max(parseInt(String(body?.qty || '1'), 10) || 1, 1), 100000)
    const budgetMaxFCFA = Number.isFinite(Number(body?.budgetMaxFCFA)) && Number(body.budgetMaxFCFA) > 0
      ? Number(body.budgetMaxFCFA)
      : undefined
    const externalUrl = String(body?.externalUrl || '').trim().slice(0, 1000) || undefined

    let reference = generateSourcingReference()
    for (let i = 0; i < 3; i++) {
      const exists = await SourcingRequest.exists({ reference })
      if (!exists) break
      reference = generateSourcingReference()
    }

    const doc = await SourcingRequest.create({
      userId,
      companyClientId,
      contactPhone,
      contactName: String(body?.contactName || '').trim().slice(0, 100) || undefined,
      contactEmail: String(body?.contactEmail || '').trim().toLowerCase().slice(0, 150) || undefined,
      isAnonymous: false,

      source: externalUrl ? 'link' : 'text',
      externalUrl,
      title: String(body?.title || '').trim().slice(0, 200) || undefined,
      description,
      qty,
      budgetMaxFCFA,
      categoryHint: String(body?.categoryHint || '').trim().slice(0, 100) || undefined,

      status: 'new',
      slaDueAt: computeSlaDueAt(new Date()),
      publicToken: generatePublicToken(),
      reference,
      catalogMatches: [],
    })

    // Agent « Trouvez-moi » : recherche 1688/AliExpress → proposition à valider
    try {
      const { enqueueAgentJob } = await import('@/lib/agents/queue')
      await enqueueAgentJob('sourcing_request', String(doc._id), { origin: 'corporate' })
    } catch (err) {
      console.warn('[internal/sourcing-request] enqueue agent échec:', err)
    }

    notifyUser(userId, {
      type: 'success',
      title: 'Demande de sourcing enregistrée',
      message: `Référence ${reference} — notre équipe revient vers vous sous 24h ouvrées.`,
      actionUrl: '/portail-entreprise/sourcing',
    }).catch(() => {})

    notifyAdmins({
      type: 'info',
      title: 'Nouvelle demande de sourcing B2B',
      message: `${reference} — ${description.slice(0, 120)}`,
      actionUrl: '/admin/copilot',
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      id: String(doc._id),
      reference,
      status: doc.status,
      slaDueAt: doc.slaDueAt,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/internal/market/sourcing-request]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
