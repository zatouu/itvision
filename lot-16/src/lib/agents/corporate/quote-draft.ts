/**
 * Agent corporate #1 — `quote_draft` : rapport d'intervention validé → devis.
 *
 * Avant cet agent, « générer un devis depuis un rapport » renvoyait un objet
 * calculé à la volée (numéro factice) : aucun AdminQuote réel, donc rien de
 * visible dans /admin/devis ni dans le portail client. Ici l'agent construit
 * le devis (matériel du rapport + main d'œuvre + frais), va chercher les prix
 * du catalogue ITV pour les lignes non chiffrées, demande un jugement LLM
 * (cohérence, note client) puis laisse l'ADMIN décider (interrupt).
 *
 * apply() ne publie rien au client : il crée un AdminQuote `draft` que l'admin
 * relit et envoie via le flux devis habituel (HITL niveau 2).
 */

import { StateGraph, Annotation, START, END, interrupt, Command } from '@langchain/langgraph'
import { z } from 'zod'
import mongoose from 'mongoose'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import AdminQuote from '@/lib/models/AdminQuote'
import AgentDecision from '@/lib/models/AgentDecision'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import { notifyAdmins } from '@/lib/notify'
import { generateQuoteNumero } from '@/lib/quote-number'
import { internalPostServer } from '@/lib/internal-auth'
import { getAgentModel } from '../llm'
import { getCheckpointer } from '../checkpointer'
import { buildReportQuoteLines, priceReportQuote } from '@/lib/finance/report-quote'
import { DEFAULT_BRS_THRESHOLD } from '@/lib/finance/billing'

const MAX_ANALYSIS_LINES = 40

const QuoteDraftState = Annotation.Root({
  reportId: Annotation<string>,
  runId: Annotation<string>,
  report: Annotation<any>,
  context: Annotation<any>,
  lines: Annotation<any[]>,
  pricing: Annotation<any>,
  analysis: Annotation<any>,
  decisionId: Annotation<string>,
  humanDecision: Annotation<any>,
})

const AnalysisSchema = z.object({
  coherence: z.enum(['ok', 'suspect']),
  reasons: z.array(z.string()).max(5),
  clientNote: z.string().max(400),
  missingItems: z.array(z.string()).max(5),
})

function round(n: number) { return Math.round(Number(n) || 0) }

/** Contexte : rapport + client + contrat + intervention liée. */
async function loadContext(state: typeof QuoteDraftState.State) {
  const report = await MaintenanceReport.findById(state.reportId)
    .populate('clientId', 'name company email phone address city')
    .populate('technicianId', 'name')
    .lean() as any
  if (!report) throw new Error(`Rapport ${state.reportId} introuvable`)

  if (report.quoteGenerated && report.quoteId) {
    throw new Error('Un devis existe déjà pour ce rapport')
  }
  if (!['validated', 'published'].includes(String(report.status))) {
    throw new Error('Le rapport doit être validé avant génération du devis')
  }

  const client = report.clientId || {}
  const contract = client?._id
    ? await MaintenanceContract.findOne({ clientId: client._id, status: 'active' })
        .select('contractNumber name coverage annualPrice endDate clientCompanyId')
        .lean() as any
    : null

  const used = contract?.coverage?.interventionsUsed || 0
  const included = contract?.coverage?.interventionsIncluded || 0

  return {
    report,
    context: {
      reportRef: report.reportId || String(report._id),
      clientName: client?.company || client?.name || 'Client',
      clientUserId: report.clientUserId ? String(report.clientUserId) : (client?._id ? String(client._id) : undefined),
      clientCompanyId: contract?.clientCompanyId ? String(contract.clientCompanyId) : undefined,
      site: report.site,
      interventionDate: report.interventionDate,
      contract: contract
        ? {
            contractNumber: contract.contractNumber,
            name: contract.name,
            interventionsIncluded: included,
            interventionsUsed: used,
            remaining: Math.max(0, included - used),
          }
        : null,
    },
  }
}

/** Lignes de devis : matériel du rapport + main d'œuvre + frais annexes (barème partagé avec la route admin). */
async function buildLines(state: typeof QuoteDraftState.State) {
  return { lines: buildReportQuoteLines(state.report || {}) }
}

/** Prix catalogue ITV (inter-domaines : /api/internal/market/product-lookup). */
async function priceFromCatalog(state: typeof QuoteDraftState.State) {
  const lines = [...(state.lines || [])]
  const pending = lines.filter(l => l.catalogLookup).map(l => l.description.replace(/^Matériel : /, ''))
  let resolved = 0

  if (pending.length > 0) {
    const res = await internalPostServer<{ results?: any[] }>('/api/internal/market/product-lookup', { names: pending })
    for (const line of lines) {
      if (!line.catalogLookup) continue
      const name = line.description.replace(/^Matériel : /, '')
      const match = res?.results?.find(r => r?.found && r?.name && name.toLowerCase().includes(String(r.name).toLowerCase()))
      if (match?.unitPrice && match.unitPrice > 0) {
        line.unitPrice = round(match.unitPrice)
        line.total = line.unitPrice * line.quantity
        line.catalogMatched = true
        resolved++
      }
      delete line.catalogLookup
    }
  }

  const priced = priceReportQuote(lines)

  return {
    lines,
    pricing: {
      subtotal: priced.subtotal,
      brsAmount: priced.brsAmount,
      taxAmount: priced.taxAmount,
      total: priced.total,
      catalogResolved: resolved,
      catalogPending: lines.filter(l => l.unitPrice === 0).length,
    },
  }
}

/** Jugement LLM (optionnel) : cohérence du devis + note client. */
async function analyze(state: typeof QuoteDraftState.State) {
  const model = getAgentModel()
  if (!model) return { analysis: { unavailable: true } }

  const report = state.report || {}
  const payload = {
    rapport: {
      site: report.site,
      type: report.interventionType,
      duree_h: report.totalDuration || report.interventionDuration,
      travaux: (report.tasksPerformed || []).slice(0, 12),
      anomalies: (report.issuesDetected || []).slice(0, 6).map((i: any) => ({ description: i.description, severity: i.severity })),
      recommandations: (report.followUpRecommendations || []).slice(0, 6).map((r: any) => ({ titre: r.title, cout_estime: r.estimatedCost })),
    },
    devis: {
      lignes: (state.lines || []).slice(0, MAX_ANALYSIS_LINES).map(l => ({ description: l.description, quantite: l.quantity, prix_unitaire: l.unitPrice, total: l.total })),
      sous_total: state.pricing?.subtotal,
      total: state.pricing?.total,
    },
    contrat: state.context?.contract,
  }

  try {
    const structured = model.withStructuredOutput(AnalysisSchema, { name: 'quote_draft_analysis' })
    const out = await structured.invoke([
      {
        role: 'system',
        content:
          "Tu vérifies un devis de maintenance de sécurité électronique (Sénégal) avant envoi au client. " +
          "Compare les lignes du devis aux travaux réellement décrits dans le rapport. " +
          "Signale une incohérence (ligne manquante évidente, quantité invraisemblable, matériel cité mais non facturé). " +
          "Rédige une note client courte (2 phrases max, ton professionnel, français). " +
          "N'invente jamais de prix.",
      },
      { role: 'user', content: JSON.stringify(payload) },
    ])
    return { analysis: out }
  } catch (e: any) {
    console.warn('[agent:quote_draft] analyse LLM indisponible:', e?.message)
    return { analysis: { unavailable: true } }
  }
}

/** Proposition → AgentDecision (file HITL admin). */
async function propose(state: typeof QuoteDraftState.State) {
  const decision = await AgentDecision.create({
    type: 'quote_draft',
    refId: state.reportId,
    runId: state.runId,
    status: 'pending',
    proposal: {
      reportRef: state.context?.reportRef,
      clientName: state.context?.clientName,
      site: state.context?.site,
      lines: state.lines,
      pricing: state.pricing,
      contract: state.context?.contract,
      analysis: state.analysis,
    },
  })

  await notifyAdmins({
    type: 'info',
    title: 'Devis à valider (rapport validé)',
    message: `${state.context?.clientName} — ${state.lines?.length || 0} ligne(s), ${round(state.pricing?.total)} F. Vérifiez puis envoyez.`,
    actionUrl: '/admin/copilot',
  }).catch(() => {})

  return { decisionId: String(decision._id) }
}

/** Nœud humain : fige le graphe jusqu'à la décision admin. */
function humanReview(state: typeof QuoteDraftState.State) {
  const decision = interrupt({
    decisionId: state.decisionId,
    kind: 'quote_draft',
    summary: `${state.context?.clientName} — devis ${round(state.pricing?.total)} F`,
  })
  return { humanDecision: decision }
}

/** Applique : crée l'AdminQuote brouillon (jamais envoyée automatiquement). */
async function apply(state: typeof QuoteDraftState.State) {
  const decision = state.humanDecision || {}
  if (decision.action !== 'approve') {
    await notifyAdmins({
      type: 'warning',
      title: 'Devis refusé par la validation',
      message: `${state.context?.clientName} — rapport ${state.context?.reportRef} à traiter manuellement.`,
      actionUrl: '/admin/devis',
    }).catch(() => {})
    return {}
  }

  const report = state.report || {}
  const client = report.clientId || {}
  const numero = await generateQuoteNumero()
  // Lignes éventuellement retouchées par l'admin : totaux recalculés avec le barème commun
  const priced = priceReportQuote(state.lines || [])

  const quote = await AdminQuote.create({
    numero,
    title: `Maintenance — ${state.context?.site || report.site || 'site client'}`,
    date: new Date(),
    client: {
      name: client?.company || client?.name || state.context?.clientName || 'Client',
      address: client?.address || '',
      phone: client?.phone || '',
      email: client?.email || '',
    },
    // report.clientId référence le modèle Client (entreprise) : lien portail entreprise
    clientCompanyId: client?._id ? new mongoose.Types.ObjectId(String(client._id)) : undefined,
    projectId: report.projectId || undefined,
    products: priced.products.map(l => ({
      description: String(l.description),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      netUnitPrice: l.netUnitPrice,
      taxable: !l.isLabor,
      isLabor: !!l.isLabor,
      total: l.total,
    })),
    subtotal: priced.subtotal,
    applyBRS: true,
    brsThreshold: DEFAULT_BRS_THRESHOLD,
    brsAmount: priced.brsAmount,
    taxAmount: priced.taxAmount,
    other: 0,
    total: priced.total,
    status: 'draft',
    notes: state.analysis?.clientNote || undefined,
    conditions: 'Devis valable 30 jours. Intervention sur site à Dakar et environs.',
    createdBy: `agent:quote_draft`,
  })

  await MaintenanceReport.updateOne(
    { _id: state.reportId },
    {
      $set: {
        quoteGenerated: true,
        quoteId: quote._id,
        quoteNumber: numero,
        quoteGeneratedAt: new Date(),
        'billing.needsQuote': false,
        'billing.quoteId': quote._id,
        'billing.quoteStatus': 'draft',
        'billing.lastUpdatedAt': new Date(),
      },
    }
  )

  await notifyAdmins({
    type: 'success',
    title: `Devis brouillon ${numero} créé`,
    message: `${state.context?.clientName} — à relire puis envoyer depuis l'admin devis.`,
    actionUrl: '/admin/devis',
  }).catch(() => {})

  return {}
}

let cachedGraph: ReturnType<typeof buildGraph> | null = null

function buildGraph() {
  return new StateGraph(QuoteDraftState)
    .addNode('loadContext', loadContext)
    .addNode('buildLines', buildLines)
    .addNode('priceFromCatalog', priceFromCatalog)
    .addNode('analyze', analyze)
    .addNode('propose', propose)
    .addNode('humanReview', humanReview)
    .addNode('apply', apply)
    .addEdge(START, 'loadContext')
    .addEdge('loadContext', 'buildLines')
    .addEdge('buildLines', 'priceFromCatalog')
    .addEdge('priceFromCatalog', 'analyze')
    .addEdge('analyze', 'propose')
    .addEdge('propose', 'humanReview')
    .addEdge('humanReview', 'apply')
    .addEdge('apply', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getQuoteDraftGraph() {
  if (!cachedGraph) cachedGraph = buildGraph()
  return cachedGraph
}

// ─── Cycle de vie : lancement (worker) et reprise (admin) ────────────────────
// threadId = AgentJob._id — le checkpoint MongoDB fait le lien entre les deux.

export async function runQuoteDraft(jobId: string, refId: string) {
  const graph = getQuoteDraftGraph()
  const threadId = jobId
  const t0 = Date.now()

  const run = await AgentRun.findOneAndUpdate(
    { threadId },
    {
      $set: { status: 'running', graph: 'quote_draft', refId, llmUsed: !!getAgentModel(), error: undefined },
      $setOnInsert: { threadId },
    },
    { upsert: true, new: true }
  )

  try {
    const result = await graph.invoke(
      { reportId: refId, runId: threadId },
      { configurable: { thread_id: threadId } }
    )
    const interrupted = Array.isArray((result as any)?.__interrupt__) && (result as any).__interrupt__.length > 0
    const status = interrupted ? 'waiting_human' : 'done'
    await AgentRun.updateOne({ _id: run._id }, { status, durationMs: Date.now() - t0 })
    await AgentJob.updateOne({ _id: jobId }, { status })
  } catch (e: any) {
    await AgentRun.updateOne({ _id: run._id }, { status: 'failed', error: e?.message, durationMs: Date.now() - t0 })
    throw e
  }
}

export interface QuoteDraftDecision {
  action: 'approve' | 'reject'
  note?: string
  decidedBy?: string
}

export async function resumeQuoteDraft(threadId: string, decision: QuoteDraftDecision) {
  const graph = getQuoteDraftGraph()
  await graph.invoke(new Command({ resume: decision }), { configurable: { thread_id: threadId } })
  await AgentRun.updateOne({ threadId }, { status: 'done' })
  await AgentJob.updateOne({ _id: threadId, status: 'waiting_human' }, { status: 'done' })
}
