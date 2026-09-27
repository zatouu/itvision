/**
 * Agent corporate #3 — `client_digest` : résumé hebdomadaire par entreprise.
 *
 * Niveau 0 (autonome) : l'agent lit les données de la société (interventions,
 * tickets, factures, contrats) et pousse un digest aux membres owner/admin.
 * Aucune action à impact — pas d'interrupt, pas de décision à valider.
 *
 * Trigger : cron hebdomadaire (voir src/lib/maintenance/cron-runner.ts).
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { z } from 'zod'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Ticket from '@/lib/models/Ticket'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Client from '@/lib/models/Client'
import User from '@/lib/models/User'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import { notifyUser } from '@/lib/notify'
import { getAgentModel } from '../llm'
import { getCheckpointer } from '../checkpointer'

const WINDOW_DAYS = 7

const DigestState = Annotation.Root({
  companyId: Annotation<string>,
  runId: Annotation<string>,
  company: Annotation<any>,
  stats: Annotation<any>,
  summary: Annotation<any>,
})

const SummarySchema = z.object({
  headline: z.string().max(140),
  highlights: z.array(z.string()).max(4),
  advice: z.string().max(300),
})

function round(n: number) { return Math.round(Number(n) || 0) }
function fmt(n: number) { return round(n).toLocaleString('fr-FR') }

async function loadContext(state: typeof DigestState.State) {
  const company = await Client.findById(state.companyId)
    .select('name company city email')
    .lean() as any
  if (!company) throw new Error(`Société ${state.companyId} introuvable`)

  const scope = { $or: [{ clientCompanyId: company._id }, { clientId: company._id }] }
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000)

  const [interventionsDone, interventionsUpcoming, reportsPublished, ticketsOpen, ticketsNew, invoicesDue, contractsActive, expiring] = await Promise.all([
    Intervention.countDocuments({ ...scope, status: 'completed', updatedAt: { $gte: since } }),
    Intervention.countDocuments({ ...scope, status: { $in: ['scheduled', 'in_progress'] }, date: { $gte: new Date() } }),
    MaintenanceReport.countDocuments({ clientId: company._id, publishedToClient: true, publishedAt: { $gte: since } }),
    Ticket.countDocuments({ ...scope, status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } }),
    Ticket.countDocuments({ ...scope, createdAt: { $gte: since } }),
    AdminInvoice.find({ $or: [{ clientCompanyId: company._id }], status: { $in: ['sent', 'overdue'] } })
      .select('numero dueDate total status').lean() as any,
    MaintenanceContract.countDocuments({ ...scope, status: 'active' }),
    MaintenanceContract.find({ ...scope, status: 'active', endDate: { $lte: new Date(Date.now() + 60 * 86400000) } })
      .select('name endDate').lean() as any,
  ])

  const amountDue = (invoicesDue || []).reduce((s: number, i: any) => s + round(i.total), 0)
  const overdue = (invoicesDue || []).filter((i: any) => i.status === 'overdue').length

  return {
    company,
    stats: {
      companyName: company.company || company.name,
      interventionsDone,
      interventionsUpcoming,
      reportsPublished,
      ticketsOpen,
      ticketsNew,
      invoicesDueCount: (invoicesDue || []).length,
      amountDue,
      overdue,
      contractsActive,
      expiring: (expiring || []).map((c: any) => ({ name: c.name, endDate: c.endDate })),
    },
  }
}

/** Rédaction : LLM si disponible, sinon phrase déterministe (dégradation gracieuse). */
async function compose(state: typeof DigestState.State) {
  const s = state.stats || {}
  const model = getAgentModel()

  if (model) {
    try {
      const structured = model.withStructuredOutput(SummarySchema, { name: 'client_digest' })
      const out = await structured.invoke([
        {
          role: 'system',
          content:
            "Tu rédiges le résumé hebdomadaire d'un portail entreprise de maintenance (sécurité électronique, Sénégal). " +
            "Ton factuel et professionnel, français, sans emoji. Mets en avant ce qui demande une action du client " +
            "(factures, tickets en attente, contrat qui expire) et ce qui a été livré (interventions, rapports). " +
            "N'invente aucun chiffre : utilise uniquement les données fournies.",
        },
        { role: 'user', content: JSON.stringify(s) },
      ])
      return { summary: out }
    } catch (e: any) {
      console.warn('[agent:client_digest] LLM indisponible:', e?.message)
    }
  }

  const parts: string[] = []
  if (s.interventionsDone) parts.push(`${s.interventionsDone} intervention(s) terminée(s)`)
  if (s.reportsPublished) parts.push(`${s.reportsPublished} rapport(s) publié(s)`)
  if (s.amountDue) parts.push(`${fmt(s.amountDue)} F à régler`)
  if (s.ticketsOpen) parts.push(`${s.ticketsOpen} ticket(s) ouvert(s)`)
  return {
    summary: {
      headline: `Votre semaine IT Vision — ${parts.join(' · ') || 'aucune activité notable'}`,
      highlights: parts.slice(0, 4),
      advice: s.overdue ? 'Des factures sont en retard : un règlement rapide évite toute interruption de service.' : '',
    },
  }
}

/** Envoi : notification in-app aux owner/admin de la société. */
async function deliver(state: typeof DigestState.State) {
  const s = state.stats || {}
  const summary = state.summary || {}

  const recipients = await User.find({
    companyClientId: state.companyId,
    isActive: { $ne: false },
    $or: [{ companyRole: { $in: ['owner', 'admin'] } }, { companyRole: { $exists: false } }],
  }).select('_id').limit(20).lean() as any[]

  const message = [summary.headline, ...(summary.highlights || []), summary.advice].filter(Boolean).join('\n')

  await Promise.all(recipients.map(u =>
    notifyUser(String(u._id), {
      type: s.overdue ? 'warning' : 'info',
      title: 'Résumé hebdomadaire de votre portail',
      message,
      actionUrl: '/portail-entreprise/activite',
    }).catch(() => {})
  ))

  return {}
}

let cachedGraph: ReturnType<typeof buildGraph> | null = null

function buildGraph() {
  return new StateGraph(DigestState)
    .addNode('loadContext', loadContext)
    .addNode('compose', compose)
    .addNode('deliver', deliver)
    .addEdge(START, 'loadContext')
    .addEdge('loadContext', 'compose')
    .addEdge('compose', 'deliver')
    .addEdge('deliver', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getClientDigestGraph() {
  if (!cachedGraph) cachedGraph = buildGraph()
  return cachedGraph
}

export async function runClientDigest(jobId: string, refId: string) {
  const graph = getClientDigestGraph()
  const threadId = jobId
  const t0 = Date.now()

  const run = await AgentRun.findOneAndUpdate(
    { threadId },
    {
      $set: { status: 'running', graph: 'client_digest', refId, llmUsed: !!getAgentModel(), error: undefined },
      $setOnInsert: { threadId },
    },
    { upsert: true, new: true }
  )

  try {
    const result = await graph.invoke(
      { companyId: refId, runId: threadId },
      { configurable: { thread_id: threadId } }
    )
    await AgentRun.updateOne({ _id: run._id }, { status: 'done', durationMs: Date.now() - t0 })
    await AgentJob.updateOne({ _id: jobId }, { status: 'done' })
    return result
  } catch (e: any) {
    await AgentRun.updateOne({ _id: run._id }, { status: 'failed', error: e?.message, durationMs: Date.now() - t0 })
    throw e
  }
}
