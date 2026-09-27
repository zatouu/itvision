/**
 * Agent corporate #2 — `contract_renewal` : contrats arrivant à échéance.
 *
 * Le cron `renewal-reminders` prévient déjà l'admin qu'un contrat expire.
 * Ici l'agent prépare la DÉCISION : usage réel du contrat (interventions
 * consommées, SLA, impayés), prix de renouvellement proposé et argumentaire
 * client. L'admin valide → un devis de renouvellement brouillon est créé
 * (AdminQuote) et le client est notifié. Rien n'est envoyé sans validation.
 */

import { StateGraph, Annotation, START, END, interrupt, Command } from '@langchain/langgraph'
import { z } from 'zod'
import mongoose from 'mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import AdminInvoice from '@/lib/models/AdminInvoice'
import AdminQuote from '@/lib/models/AdminQuote'
import Ticket from '@/lib/models/Ticket'
import AgentDecision from '@/lib/models/AgentDecision'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import { notifyAdmins } from '@/lib/notify'
import { generateQuoteNumero } from '@/lib/quote-number'
import { getAgentModel } from '../llm'
import { getCheckpointer } from '../checkpointer'

const PRICE_INCREASE_RATE = 0.05 // +5% par défaut, l'admin ajuste avant envoi

const RenewalState = Annotation.Root({
  contractId: Annotation<string>,
  runId: Annotation<string>,
  contract: Annotation<any>,
  usage: Annotation<any>,
  proposal: Annotation<any>,
  analysis: Annotation<any>,
  decisionId: Annotation<string>,
  humanDecision: Annotation<any>,
})

const AnalysisSchema = z.object({
  pitch: z.string().max(600),
  riskFlags: z.array(z.string()).max(5),
})

function round(n: number) { return Math.round(Number(n) || 0) }

async function loadContext(state: typeof RenewalState.State) {
  const contract = await MaintenanceContract.findById(state.contractId)
    .populate('clientId', 'name company email phone address city')
    .lean() as any
  if (!contract) throw new Error(`Contrat ${state.contractId} introuvable`)
  if (contract.status !== 'active') throw new Error('Contrat non actif')

  const client = contract.clientId || {}
  const scope = contract.clientCompanyId
    ? { $or: [{ clientId: contract.clientId?._id }, { clientCompanyId: contract.clientCompanyId }] }
    : { clientId: contract.clientId?._id }

  const since = contract.startDate ? new Date(contract.startDate) : new Date(Date.now() - 365 * 86400000)

  const [interventionsTotal, interventionsRecent, unpaidInvoices, openTickets, slaBreaches] = await Promise.all([
    Intervention.countDocuments(scope),
    Intervention.countDocuments({ ...scope, date: { $gte: since } }),
    AdminInvoice.countDocuments({ $or: [{ clientUserId: contract.clientId?._id }, ...(contract.clientCompanyId ? [{ clientCompanyId: contract.clientCompanyId }] : [])], status: { $in: ['sent', 'overdue'] } }),
    Ticket.countDocuments({ ...scope, status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } }),
    Ticket.countDocuments({ ...scope, 'sla.breached': true }),
  ])

  const included = contract.coverage?.interventionsIncluded || 0
  const used = contract.coverage?.interventionsUsed || 0

  return {
    contract,
    usage: {
      interventionsTotal,
      interventionsRecent,
      included,
      used,
      remaining: Math.max(0, included - used),
      consumptionRate: included > 0 ? Math.round((used / included) * 100) : null,
      unpaidInvoices,
      openTickets,
      slaBreaches,
      annualPrice: round(contract.annualPrice),
      endDate: contract.endDate,
    },
  }
}

async function buildProposal(state: typeof RenewalState.State) {
  const usage = state.usage || {}
  const contract = state.contract || {}

  // Ajustement : +5% si le contrat a été fortement consommé, prix maintenu sinon
  const highUsage = typeof usage.consumptionRate === 'number' && usage.consumptionRate >= 80
  const proposedPrice = highUsage
    ? round(usage.annualPrice * (1 + PRICE_INCREASE_RATE))
    : round(usage.annualPrice)

  const daysLeft = contract.endDate
    ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86400000)
    : null

  return {
    proposal: {
      contractNumber: contract.contractNumber,
      contractName: contract.name,
      clientName: (contract.clientId?.company || contract.clientId?.name) || 'Client',
      currentPrice: usage.annualPrice,
      proposedPrice,
      priceChangePct: usage.annualPrice > 0 ? Math.round(((proposedPrice - usage.annualPrice) / usage.annualPrice) * 100) : 0,
      coverage: contract.coverage || {},
      services: (contract.services || []).map((s: any) => s.name).filter(Boolean),
      daysLeft,
      usage,
    },
  }
}

async function analyze(state: typeof RenewalState.State) {
  const model = getAgentModel()
  if (!model) return { analysis: { unavailable: true } }

  try {
    const structured = model.withStructuredOutput(AnalysisSchema, { name: 'renewal_analysis' })
    const out = await structured.invoke([
      {
        role: 'system',
        content:
          "Tu prépares le renouvellement d'un contrat de maintenance de sécurité électronique au Sénégal. " +
          "À partir de l'usage réel (interventions consommées/incluses, SLA, impayés, tickets ouverts), " +
          "rédige un argumentaire client court (3 phrases max, français, ton professionnel, orienté valeur) " +
          "et liste les points de vigilance internes (risques). N'invente aucun chiffre.",
      },
      { role: 'user', content: JSON.stringify(state.proposal) },
    ])
    return { analysis: out }
  } catch (e: any) {
    console.warn('[agent:contract_renewal] analyse LLM indisponible:', e?.message)
    return { analysis: { unavailable: true } }
  }
}

async function propose(state: typeof RenewalState.State) {
  const decision = await AgentDecision.create({
    type: 'contract_renewal',
    refId: state.contractId,
    runId: state.runId,
    status: 'pending',
    proposal: { ...state.proposal, analysis: state.analysis },
  })

  await notifyAdmins({
    type: 'info',
    title: 'Renouvellement de contrat à valider',
    message: `${state.proposal?.clientName} — ${state.proposal?.contractName} (${state.proposal?.daysLeft ?? '?'} j restants). Proposition : ${round(state.proposal?.proposedPrice)} F.`,
    actionUrl: '/admin/copilot',
  }).catch(() => {})

  return { decisionId: String(decision._id) }
}

function humanReview(state: typeof RenewalState.State) {
  const decision = interrupt({
    decisionId: state.decisionId,
    kind: 'contract_renewal',
    summary: `${state.proposal?.clientName} — renouvellement ${round(state.proposal?.proposedPrice)} F`,
  })
  return { humanDecision: decision }
}

async function apply(state: typeof RenewalState.State) {
  const decision = state.humanDecision || {}
  if (decision.action !== 'approve') {
    await notifyAdmins({
      type: 'warning',
      title: 'Renouvellement refusé',
      message: `${state.proposal?.clientName} — à traiter manuellement.`,
      actionUrl: '/admin/maintenance',
    }).catch(() => {})
    return {}
  }

  const contract = state.contract || {}
  const client = contract.clientId || {}
  const numero = await generateQuoteNumero()

  const quote = await AdminQuote.create({
    numero,
    title: `Renouvellement contrat — ${contract.name || contract.contractNumber}`,
    date: new Date(),
    client: {
      name: client.company || client.name || 'Client',
      address: client.address || '',
      phone: client.phone || '',
      email: client.email || '',
    },
    clientUserId: contract.clientId?._id,
    clientCompanyId: contract.clientCompanyId,
    products: [
      {
        description: `Contrat de maintenance ${contract.name || ''} — 12 mois (${state.proposal?.services?.join(', ') || 'services inclus'})`,
        quantity: 1,
        unitPrice: round(state.proposal?.proposedPrice),
        taxable: false,
        total: round(state.proposal?.proposedPrice),
      },
    ],
    subtotal: round(state.proposal?.proposedPrice),
    applyBRS: false,
    brsThreshold: 0,
    brsAmount: 0,
    taxAmount: 0,
    other: 0,
    total: round(state.proposal?.proposedPrice),
    status: 'draft',
    notes: state.analysis?.pitch || undefined,
    conditions: 'Renouvellement pour 12 mois. Prend effet à la date d’échéance du contrat en cours.',
    createdBy: 'agent:contract_renewal',
  })

  await notifyAdmins({
    type: 'success',
    title: `Devis de renouvellement ${numero} créé`,
    message: `${state.proposal?.clientName} — à relire puis envoyer depuis l'admin devis.`,
    actionUrl: '/admin/devis',
  }).catch(() => {})

  return {}
}

let cachedGraph: ReturnType<typeof buildGraph> | null = null

function buildGraph() {
  return new StateGraph(RenewalState)
    .addNode('loadContext', loadContext)
    .addNode('buildProposal', buildProposal)
    .addNode('analyze', analyze)
    .addNode('propose', propose)
    .addNode('humanReview', humanReview)
    .addNode('apply', apply)
    .addEdge(START, 'loadContext')
    .addEdge('loadContext', 'buildProposal')
    .addEdge('buildProposal', 'analyze')
    .addEdge('analyze', 'propose')
    .addEdge('propose', 'humanReview')
    .addEdge('humanReview', 'apply')
    .addEdge('apply', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getContractRenewalGraph() {
  if (!cachedGraph) cachedGraph = buildGraph()
  return cachedGraph
}

export async function runContractRenewal(jobId: string, refId: string) {
  const graph = getContractRenewalGraph()
  const threadId = jobId
  const t0 = Date.now()

  const run = await AgentRun.findOneAndUpdate(
    { threadId },
    {
      $set: { status: 'running', graph: 'contract_renewal', refId, llmUsed: !!getAgentModel(), error: undefined },
      $setOnInsert: { threadId },
    },
    { upsert: true, new: true }
  )

  try {
    const result = await graph.invoke(
      { contractId: refId, runId: threadId },
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

export interface RenewalDecision {
  action: 'approve' | 'reject'
  note?: string
  decidedBy?: string
}

export async function resumeContractRenewal(threadId: string, decision: RenewalDecision) {
  const graph = getContractRenewalGraph()
  await graph.invoke(new Command({ resume: decision }), { configurable: { thread_id: threadId } })
  await AgentRun.updateOne({ threadId }, { status: 'done' })
  await AgentJob.updateOne({ _id: threadId, status: 'waiting_human' }, { status: 'done' })
}
