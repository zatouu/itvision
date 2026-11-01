import crypto from 'crypto'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import WorkflowApproval, { type IWorkflowApproval, type WorkflowApprovalType } from '@/lib/models/WorkflowApproval'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND } from '@/lib/branding'
import { createInvoiceFromQuote } from '@/lib/finance/invoice-from-quote'
import { projectsCollection, updateProjectFields } from '@/lib/projects/persistence'
import { mutateProject, sanitizeTask, journalEntry } from '@/lib/projects/tasks'
import { isTaskStatus } from '@/lib/projects/workflow'

const VALIDITY_DAYS = 14
const SITE = () => (process.env.APPROVAL_BASE_URL || CORPORATE_BRAND.url || 'https://itvisionplus.sn').replace(/\/$/, '')
/** Destinataire des validations (le pilote de la plateforme). */
export const approvalRecipient = () => process.env.APPROVAL_EMAIL || 'oumar.ndiaye@itvisionplus.sn'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
export const fcfa = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`

export interface ApprovalInput {
  type: WorkflowApprovalType
  title: string
  summary: string
  lines?: Array<{ label: string; value?: string }>
  payload: Record<string, unknown>
  projectId?: string | null
  quoteId?: string | null
  dedupeKey: string
}

function approvalEmail(a: IWorkflowApproval) {
  const base = `${SITE()}/validation/${a.token}`
  const rows = (a.lines || []).map(l => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#444">${esc(l.label)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${esc(l.value || '')}</td></tr>`).join('')
  const projectLink = a.projectId ? `<p style="margin:16px 0 0;font-size:13px"><a href="${SITE()}/admin/projects/${a.projectId}" style="color:#047857">Ouvrir le projet dans l'admin</a></p>` : ''
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#064e3b;color:#fff;border-radius:12px 12px 0 0;padding:16px 20px;font-size:13px;letter-spacing:.04em">VALIDATION EN ATTENTE · IT VISION</div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:20px">
    <h1 style="margin:0 0 8px;font-size:18px;color:#1c1917">${esc(a.title)}</h1>
    <p style="margin:0 0 14px;color:#57534e;font-size:14px;line-height:1.5;white-space:pre-line">${esc(a.summary)}</p>
    ${rows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px">${rows}</table>` : ''}
    <table role="presentation" style="width:100%"><tr>
      <td style="padding-right:6px"><a href="${base}?d=approve" style="display:block;text-align:center;background:#059669;color:#fff;text-decoration:none;padding:12px;border-radius:10px;font-weight:700">Valider</a></td>
      <td style="padding-left:6px"><a href="${base}?d=reject" style="display:block;text-align:center;background:#fff;color:#b91c1c;border:1px solid #fecaca;text-decoration:none;padding:12px;border-radius:10px;font-weight:700">Refuser</a></td>
    </tr></table>
    <p style="margin:14px 0 0;font-size:12px;color:#a8a29e">Le lien ouvre une page de confirmation. Valable ${VALIDITY_DAYS} jours, utilisable une seule fois.</p>
    ${projectLink}
  </div>
</div></body></html>`
}

/** Crée une validation (une seule en attente par sujet) et l'envoie par mail au pilote. Ne lève jamais. */
export async function requestApproval(input: ApprovalInput): Promise<IWorkflowApproval | null> {
  try {
    await connectMongoose()
    const existing = await WorkflowApproval.findOne({ dedupeKey: input.dedupeKey, status: 'pending', expiresAt: { $gt: new Date() } })
    if (existing) return existing
    const to = approvalRecipient()
    const approval = await WorkflowApproval.create({
      type: input.type,
      token: crypto.randomBytes(24).toString('hex'),
      title: input.title.slice(0, 200),
      summary: input.summary.slice(0, 2000),
      lines: (input.lines || []).slice(0, 40),
      payload: input.payload,
      projectId: input.projectId && mongoose.isValidObjectId(input.projectId) ? input.projectId : undefined,
      quoteId: input.quoteId && mongoose.isValidObjectId(input.quoteId) ? input.quoteId : undefined,
      dedupeKey: input.dedupeKey,
      sentTo: to,
      expiresAt: new Date(Date.now() + VALIDITY_DAYS * 86400_000),
    })
    const sent = await emailService.sendEmail({ to, subject: `[À valider] ${approval.title}`, html: approvalEmail(approval) }).catch(() => false)
    approval.emailSent = !!sent
    await approval.save()
    return approval
  } catch (e) {
    console.error('[approvals] création impossible:', e)
    return null
  }
}

/** Exécute l'action validée. Retourne un message lisible ; lève en cas d'échec. */
async function execute(a: IWorkflowApproval, decidedBy: string): Promise<string> {
  const p = a.payload as any
  switch (a.type) {
    case 'deposit_invoice':
    case 'balance_invoice': {
      const r = await createInvoiceFromQuote({
        quoteId: String(p.quoteId),
        mode: a.type === 'deposit_invoice' ? 'deposit' : 'balance',
        percent: Number(p.percent) || undefined,
        createdBy: decidedBy,
      })
      if (!r.ok) throw new Error(r.error)
      return `Facture ${r.numero} créée en brouillon (${fcfa(r.total)}). Vérifiez-la puis envoyez-la au client depuis l'admin.`
    }
    case 'project_budget': {
      const projectId = String(p.projectId)
      const project = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(projectId) }, { projection: { budgetLines: 1, status: 1 } }) as any
      if (!project) throw new Error('Projet introuvable')
      const existing: any[] = project.budgetLines || []
      if (existing.some(l => l.quoteId === String(p.quoteId))) return 'Budget déjà en place pour ce devis.'
      const lines = (p.lines || []).map((l: any) => ({
        id: new mongoose.Types.ObjectId().toString(),
        quoteId: String(p.quoteId),
        label: String(l.label || '').slice(0, 200),
        quantity: Number(l.quantity) || 1,
        unitCost: Number(l.unitCost) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        isLabor: !!l.isLabor,
        status: 'planned',
      }))
      const start = String(project.status) === 'approved'
      const now = new Date()
      await updateProjectFields(projectId, {
        budgetLines: [...existing, ...lines],
        ...(start ? { status: 'in_progress', startedAt: now } : {}),
      }, start ? { push: { statusHistory: { date: now, status: 'in_progress', author: decidedBy, note: 'Démarrage validé (budget prévisionnel)' } } } : {})
      return `${lines.length} ligne(s) de budget ajoutée(s) au projet${start ? ' — projet démarré' : ''}. Confirmez chaque achat au prix réel depuis l'onglet Dépenses.`
    }
    case 'journal_progress': {
      const projectId = String(p.projectId)
      const updates = new Map<string, string>((p.updates || []).map((u: any) => [String(u.taskId), String(u.status)]))
      const newTasks: any[] = Array.isArray(p.newTasks) ? p.newTasks : []
      const author = { name: 'Validation pilote', role: 'ADMIN' as const }
      const res = await mutateProject(projectId, state => ({
        tasks: [
          ...state.tasks.map(t => {
            const s = updates.get(t.id)
            return s && isTaskStatus(s) && s !== t.status ? sanitizeTask({ status: s }, t) : t
          }),
          ...newTasks.filter(n => n?.title).map(n => sanitizeTask({ title: n.title, status: isTaskStatus(n.status) ? n.status : 'todo' })),
        ],
        journal: [journalEntry(author, { kind: 'progress', message: `Avancement appliqué depuis la note : « ${String(p.note || '').slice(0, 300)} »` })],
      }), author)
      return `Avancement appliqué : ${updates.size} tâche(s) mise(s) à jour${newTasks.length ? `, ${newTasks.length} créée(s)` : ''}. Progression : ${res.progress ?? '—'} %.`
    }
    default:
      throw new Error('Type de validation inconnu')
  }
}

export type DecisionResult =
  | { ok: true; status: 'approved' | 'rejected'; message: string; approval: IWorkflowApproval }
  | { ok: false; status: number; error: string; approval?: IWorkflowApproval }

/** Décision atomique : une validation n'est exécutée qu'une fois, même en cas de double clic. */
export async function decideApproval(token: string, decision: 'approve' | 'reject', via: 'email' | 'admin', decidedBy = 'pilote'): Promise<DecisionResult> {
  await connectMongoose()
  if (!/^[a-f0-9]{48}$/.test(token)) return { ok: false, status: 404, error: 'Lien invalide' }
  const status = decision === 'approve' ? 'approved' : 'rejected'
  const a = await WorkflowApproval.findOneAndUpdate(
    { token, status: 'pending', expiresAt: { $gt: new Date() } },
    { $set: { status, decidedAt: new Date(), decidedVia: via, decidedBy } },
    { new: true }
  )
  if (!a) {
    const current = await WorkflowApproval.findOne({ token })
    if (!current) return { ok: false, status: 404, error: 'Lien invalide' }
    if (current.status === 'pending') return { ok: false, status: 410, error: 'Ce lien a expiré', approval: current }
    return { ok: false, status: 409, error: current.status === 'failed' ? `Échec précédent : ${current.error || 'erreur'}` : `Déjà ${current.status === 'approved' ? 'validé' : 'refusé'}${current.result ? ` — ${current.result}` : ''}`, approval: current }
  }
  if (status === 'rejected') {
    a.result = 'Refusé : aucune action effectuée.'
    await a.save()
    return { ok: true, status, message: a.result, approval: a }
  }
  try {
    a.result = await execute(a, decidedBy)
    await a.save()
    return { ok: true, status, message: a.result, approval: a }
  } catch (e: any) {
    a.status = 'failed'
    a.error = String(e?.message || e).slice(0, 500)
    await a.save()
    return { ok: false, status: 409, error: a.error!, approval: a }
  }
}
