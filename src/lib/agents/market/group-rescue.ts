/**
 * Graphe LangGraph « group_order_rescue » — sauver un achat groupé qui va échouer.
 *
 * loadContext → diagnose → gate → [draft (LLM) → propose → interrupt() → apply] | END
 *
 * Déclenché par le cron DDM+ (scanGroupsAtRisk) pour les groupes ouverts qui
 * ferment sous 48 h sans avoir atteint le minimum. L'agent propose une
 * prolongation chiffrée et un message de relance ; l'admin décide dans /admin/copilot.
 */

import { StateGraph, Annotation, START, END, interrupt } from '@langchain/langgraph'
import { z } from 'zod'
import { GroupOrder } from '@/lib/models/GroupOrder'
import GroupInterest from '@/lib/models/GroupInterest'
import AgentDecision from '@/lib/models/AgentDecision'
import { notifyAdmins } from '@/lib/notify'
import { notifyDeadlineReminder } from '@/lib/group-order-notifications'
import { MARKET_BRAND } from '@/lib/branding'
import { getAgentModel } from '../llm'
import { getCheckpointer } from '../checkpointer'

const DAY = 86_400_000
const MAX_EXTENSION_DAYS = 7

const RescueState = Annotation.Root({
  groupId: Annotation<string>,
  runId: Annotation<string>,
  group: Annotation<any>,
  diagnosis: Annotation<any>,
  draft: Annotation<any>,
  decisionId: Annotation<string>,
  humanDecision: Annotation<any>,
})

const DraftSchema = z.object({
  message: z.string().max(500),
  reasons: z.array(z.string()).max(4),
})

async function loadContext(state: typeof RescueState.State) {
  const group = await GroupOrder.findOne({ groupId: state.groupId }).lean() as any
  if (!group) throw new Error(`Achat groupé ${state.groupId} introuvable`)
  const interested = await GroupInterest.countDocuments({ scope: `group:${state.groupId}` })
  return { group: { ...group, interested } }
}

/** Diagnostic déterministe : vitesse de remplissage et projection à l'échéance. */
async function diagnose(state: typeof RescueState.State) {
  const g = state.group
  const now = Date.now()
  const created = new Date(g.createdAt || now - DAY).getTime()
  const deadline = new Date(g.deadline).getTime()
  const ageDays = Math.max(0.5, (now - created) / DAY)
  const daysLeft = Math.max(0, (deadline - now) / DAY)
  const currentQty = g.currentQty || 0
  const minQty = g.minQty || 1
  const velocity = currentQty / ageDays
  const projected = Math.round(currentQty + velocity * daysLeft)
  const gap = Math.max(0, minQty - projected)
  const extendDays = velocity > 0
    ? Math.min(MAX_EXTENSION_DAYS, Math.max(2, Math.ceil(gap / velocity)))
    : 5
  const reachableWithExtension = velocity > 0 && currentQty + velocity * (daysLeft + extendDays) >= minQty
  return {
    diagnosis: {
      currentQty, minQty, targetQty: g.targetQty, participants: (g.participants || []).length,
      interested: g.interested || 0,
      fillPct: Math.round((currentQty / minQty) * 100),
      velocityPerDay: Math.round(velocity * 10) / 10,
      daysLeft: Math.round(daysLeft * 10) / 10,
      projected, gap, extendDays, reachableWithExtension,
      alreadyExtended: !!g.deadlineExtended,
    },
  }
}

function gate(state: typeof RescueState.State) {
  const d = state.diagnosis
  // Le minimum sera atteint sans aide, ou rien ne bouge depuis la création : rien à proposer.
  if (d.projected >= d.minQty) return END
  if (d.velocityPerDay === 0 && d.participants === 0 && d.interested === 0) return END
  return 'draft'
}

async function draft(state: typeof RescueState.State) {
  const g = state.group
  const d = state.diagnosis
  const url = `${MARKET_BRAND.url}/achats-groupes/${g.groupId}`
  const fallback = {
    message: `Achat groupé « ${String(g.product?.name || '').slice(0, 50)} » : il manque ${Math.max(0, d.minQty - d.currentQty)} pièce(s) pour valider le prix de ${Math.round(g.currentUnitPrice || 0).toLocaleString('fr-FR')} FCFA. Nous prolongeons de ${d.extendDays} jours : partagez le lien à vos proches ! ${url}`,
    reasons: [`Projection à l'échéance : ${d.projected}/${d.minQty}`, `Rythme actuel : ${d.velocityPerDay} pièce(s)/jour`],
    llmUnavailable: true,
  }
  const model = getAgentModel()
  if (!model) return { draft: fallback }

  try {
    const out = await model.withStructuredOutput(DraftSchema).invoke([
      { role: 'system', content: 'Tu rédiges des messages courts, chaleureux et honnêtes pour des acheteurs sénégalais. Pas d\'emoji, pas de promesse de prix non garantie.' },
      {
        role: 'user', content: `Achat groupé DDM+ (import Chine) en risque d'échec.
Produit : ${g.product?.name}. Prix groupe actuel : ${Math.round(g.currentUnitPrice || 0)} FCFA/pc (prix de base ${g.product?.basePrice} FCFA).
Situation : ${JSON.stringify(d)}.
Rédige le message (max 450 caractères, français, tutoiement interdit) annonçant une prolongation de ${d.extendDays} jours et invitant à partager ce lien : ${url}.
Donne aussi 2 à 4 raisons factuelles justifiant la prolongation.`,
      },
    ])
    return { draft: { ...out, llmUnavailable: false } }
  } catch (e) {
    console.error('[agent/group-rescue] draft failed:', e)
    return { draft: fallback }
  }
}

async function propose(state: typeof RescueState.State) {
  const g = state.group
  const d = state.diagnosis
  const decision = await AgentDecision.create({
    type: 'group_order_rescue',
    refId: state.groupId,
    runId: state.runId,
    status: 'pending',
    proposal: {
      verdict: d.reachableWithExtension ? 'approve' : 'unsure',
      confidence: d.reachableWithExtension ? 0.7 : 0.4,
      reasons: [
        `${d.currentQty}/${d.minQty} pièces (${d.fillPct} %), ${d.participants} participant(s), ${d.interested} intéressé(s)`,
        `Échéance dans ${d.daysLeft} j, projection ${d.projected}/${d.minQty}`,
        ...(state.draft?.reasons || []),
      ].slice(0, 5),
      suggestedFixes: [
        `Prolonger de ${d.extendDays} jours`,
        'Prévenir les participants et relancer les intéressés',
      ],
      riskFlags: d.alreadyExtended ? ['déjà prolongé une fois'] : [],
      draftMessage: state.draft?.message,
      extendDays: d.extendDays,
      diagnosis: d,
      llmUnavailable: !!state.draft?.llmUnavailable,
      product: {
        name: g.product?.name,
        image: g.product?.image,
        price: Math.round(g.currentUnitPrice || 0),
        category: `Groupe ${g.groupId}`,
      },
    },
  })

  await notifyAdmins({
    type: 'warning',
    title: 'Achat groupé en risque (IA)',
    message: `« ${g.product?.name} » : ${d.currentQty}/${d.minQty}, fin dans ${d.daysLeft} j. Proposition : +${d.extendDays} j.`,
    actionUrl: '/admin/copilot',
    metadata: { decisionId: String(decision._id), groupId: state.groupId },
    push: false,
  })
  return { decisionId: String(decision._id) }
}

async function humanReview(state: typeof RescueState.State) {
  const decision = interrupt({ kind: 'await_admin', decisionId: state.decisionId })
  return { humanDecision: decision }
}

async function apply(state: typeof RescueState.State) {
  const decision = state.humanDecision as { action?: string; note?: string } | undefined
  const approved = decision?.action === 'approve'
  const d = state.diagnosis

  if (approved) {
    const fresh = await GroupOrder.findOne({ groupId: state.groupId, status: 'open' }).lean() as any
    // Le groupe a pu être clos ou rempli pendant l'attente de décision : on n'applique rien.
    if (fresh) {
      const base = Math.max(Date.now(), new Date(fresh.deadline).getTime())
      const newDeadline = new Date(base + d.extendDays * DAY)
      const note = `Prolongation IA validée ${new Date().toISOString().slice(0, 10)} : +${d.extendDays} j${decision?.note ? ` (${decision.note})` : ''}`
      await GroupOrder.updateOne(
        { _id: fresh._id, status: 'open' },
        { $set: { deadline: newDeadline, internalNotes: [fresh.internalNotes, note].filter(Boolean).join('\n') } }
      )
      // Les intéressés seront relancés par le cron existant à l'approche de la nouvelle échéance.
      await GroupInterest.updateMany({ scope: `group:${state.groupId}` }, { $set: { notified: false } })
      await notifyDeadlineReminder((fresh.participants || []) as any, { ...fresh, deadline: newDeadline } as any, d.extendDays)
        .catch((e: any) => console.warn('[agent/group-rescue] notification participants:', e?.message))
    }
  }

  await AgentDecision.updateOne(
    { _id: state.decisionId },
    { $set: { status: approved ? 'approved' : 'rejected', adminNote: decision?.note, decidedAt: new Date() } }
  )
  return {}
}

let compiled: ReturnType<typeof build> | null = null

function build() {
  return new StateGraph(RescueState)
    .addNode('loadContext', loadContext)
    .addNode('diagnose', diagnose)
    .addNode('draft', draft)
    .addNode('propose', propose)
    .addNode('humanReview', humanReview)
    .addNode('apply', apply)
    .addEdge(START, 'loadContext')
    .addEdge('loadContext', 'diagnose')
    .addConditionalEdges('diagnose', gate, ['draft', END])
    .addEdge('draft', 'propose')
    .addEdge('propose', 'humanReview')
    .addEdge('humanReview', 'apply')
    .addEdge('apply', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getGroupRescueGraph() {
  if (!compiled) compiled = build()
  return compiled
}
