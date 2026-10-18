import mongoose from 'mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { updateProjectFields, projectsCollection } from '@/lib/projects/persistence'

/**
 * Montants d'un projet, dérivés uniquement des devis et factures qui lui sont liés.
 * Règle : le montant du projet (value) = somme des devis acceptés (versions en vigueur, net à payer).
 * Les factures se comparent à ce montant contractuel ; aucun montant n'est saisi deux fois.
 */

const money = (n: unknown) => Math.round(Number(n) || 0)

export interface ProjectFinanceQuote {
  id: string
  numero: string
  title?: string
  status: string
  version: number
  date?: Date
  subtotal: number
  total: number
  invoiced: number
}

export interface ProjectFinanceInvoice {
  id: string
  numero: string
  status: string
  date?: Date
  dueDate?: Date
  quoteId?: string
  total: number
  credited: number
  paid: number
  balance: number
}

export interface ProjectFinance {
  quotes: ProjectFinanceQuote[]
  invoices: ProjectFinanceInvoice[]
  /** Somme des devis acceptés (net à payer). */
  contracted: number
  /** Devis en cours (brouillon/envoyé), non encore acceptés. */
  pipeline: number
  /** Factures émises (hors brouillon et annulées), avoirs déduits. */
  invoiced: number
  draftInvoiced: number
  paid: number
  outstanding: number
  remainingToInvoice: number
  overInvoiced: number
  acceptedQuotes: number
  sentQuotes: number
  /** Montant enregistré sur le projet (peut différer avant synchronisation). */
  projectValue: number
  coherent: boolean
  warnings: string[]
}

const ISSUED_INVOICE_STATUSES = ['sent', 'partial', 'paid', 'overdue']

export async function computeProjectFinance(projectId: string): Promise<ProjectFinance> {
  if (!mongoose.isValidObjectId(projectId)) throw new Error('Projet invalide')
  const pid = new mongoose.Types.ObjectId(projectId)
  const [project, quotesRaw, invoicesRaw] = await Promise.all([
    projectsCollection().findOne({ _id: pid }, { projection: { value: 1 } }),
    AdminQuote.find({ projectId: pid }).select('numero title status version date subtotal total').sort({ date: -1 }).lean(),
    AdminInvoice.find({ projectId: pid }).select('numero status date dueDate quoteId total creditedAmount amountPaid').sort({ date: -1 }).lean(),
  ])
  return buildProjectFinance(quotesRaw as any[], invoicesRaw as any[], (project as any)?.value)
}

/** Calcul pur (testable sans base) des montants d'un projet à partir de ses devis et factures. */
export function buildProjectFinance(quotesRaw: any[], invoicesRaw: any[], storedValue: unknown): ProjectFinance {
  const invoices: ProjectFinanceInvoice[] = invoicesRaw.map(inv => {
    const total = money(inv.total)
    const credited = money(inv.creditedAmount)
    const paid = money(inv.amountPaid ?? (inv.status === 'paid' ? total : 0))
    return {
      id: String(inv._id),
      numero: String(inv.numero || ''),
      status: String(inv.status || 'draft'),
      date: inv.date,
      dueDate: inv.dueDate,
      quoteId: inv.quoteId ? String(inv.quoteId) : undefined,
      total,
      credited,
      paid,
      balance: inv.status === 'cancelled' ? 0 : Math.max(0, total - credited - paid),
    }
  })

  const invoicedByQuote = new Map<string, number>()
  for (const inv of invoices) {
    if (!inv.quoteId || inv.status === 'cancelled') continue
    invoicedByQuote.set(inv.quoteId, (invoicedByQuote.get(inv.quoteId) || 0) + inv.total - inv.credited)
  }

  const quotes: ProjectFinanceQuote[] = quotesRaw.map(q => ({
    id: String(q._id),
    numero: String(q.numero || ''),
    title: q.title,
    status: String(q.status || 'draft'),
    version: Number(q.version || 1),
    date: q.date,
    subtotal: money(q.subtotal),
    total: money(q.total),
    invoiced: invoicedByQuote.get(String(q._id)) || 0,
  }))

  const accepted = quotes.filter(q => q.status === 'accepted')
  const contracted = accepted.reduce((s, q) => s + q.total, 0)
  const pipeline = quotes.filter(q => q.status === 'draft' || q.status === 'sent').reduce((s, q) => s + q.total, 0)
  const issued = invoices.filter(i => ISSUED_INVOICE_STATUSES.includes(i.status))
  const invoiced = issued.reduce((s, i) => s + i.total - i.credited, 0)
  const draftInvoiced = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.total, 0)
  const paid = issued.reduce((s, i) => s + i.paid, 0)
  const outstanding = issued.reduce((s, i) => s + i.balance, 0)
  const remainingToInvoice = Math.max(0, contracted - invoiced)
  const overInvoiced = contracted > 0 ? Math.max(0, invoiced - contracted) : 0
  const projectValue = money(storedValue)

  const warnings: string[] = []
  if (contracted > 0 && projectValue !== contracted) {
    warnings.push(`Le montant du projet (${projectValue.toLocaleString('fr-FR')} FCFA) diffère des devis acceptés (${contracted.toLocaleString('fr-FR')} FCFA)`)
  }
  if (overInvoiced > 0) {
    warnings.push(`Facturé au-delà du contrat : ${overInvoiced.toLocaleString('fr-FR')} FCFA de plus que les devis acceptés`)
  }
  if (contracted === 0 && invoiced > 0) {
    warnings.push('Des factures sont émises sans devis accepté lié au projet')
  }
  for (const q of accepted) {
    if (q.invoiced > q.total) warnings.push(`Devis ${q.numero} : facturé ${q.invoiced.toLocaleString('fr-FR')} FCFA pour ${q.total.toLocaleString('fr-FR')} FCFA accepté`)
  }

  return {
    quotes,
    invoices,
    contracted,
    pipeline,
    invoiced,
    draftInvoiced,
    paid,
    outstanding,
    remainingToInvoice,
    overInvoiced,
    acceptedQuotes: accepted.length,
    sentQuotes: quotes.filter(q => q.status === 'sent').length,
    projectValue,
    coherent: warnings.length === 0,
    warnings,
  }
}

/**
 * Aligne le projet sur ses devis/factures : montant contractuel, budget prévu, résumé du devis
 * en vigueur, et phase commerciale (prospect → devis envoyé) quand un devis part au client.
 */
export async function syncProjectFinance(projectId: unknown): Promise<ProjectFinance | null> {
  const id = projectId ? String(projectId) : ''
  if (!mongoose.isValidObjectId(id)) return null
  const project = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { status: 1, value: 1, metrics: 1, quote: 1 } }) as any
  if (!project) return null
  const finance = await computeProjectFinance(id)

  const set: Record<string, any> = {}
  if (finance.contracted > 0 && money(project.value) !== finance.contracted) set.value = finance.contracted
  if (finance.contracted > 0 && money(project.metrics?.budgetPlanned) !== finance.contracted) set['metrics.budgetPlanned'] = finance.contracted

  const current = finance.quotes.find(q => q.status === 'accepted') || finance.quotes.find(q => q.status === 'sent')
  if (current && (project.quote?.id !== current.id || money(project.quote?.totalTTC) !== current.total)) {
    set.quote = {
      ...(project.quote || {}),
      id: current.id,
      version: current.version,
      totalHT: current.subtotal,
      totalTTC: current.total,
      status: current.status === 'accepted' ? 'approved' : 'sent',
    }
  }

  // Statut brut « lead » uniquement : sur une base non migrée (« pending »), la phase ne serait pas conservée
  // et chaque synchronisation réécrirait l'historique.
  if (project.status === 'lead' && finance.sentQuotes > 0 && finance.acceptedQuotes === 0) {
    set.status = 'quoted'
  }

  if (Object.keys(set).length) {
    await updateProjectFields(id, set, set.status
      ? { push: { statusHistory: { date: new Date(), status: set.status, author: 'Système', note: 'Devis envoyé au client' } } }
      : {})
    finance.projectValue = set.value ?? finance.projectValue
    finance.warnings = finance.warnings.filter(w => !w.startsWith('Le montant du projet'))
    finance.coherent = finance.warnings.length === 0
  }
  return finance
}

/** Synchronise sans bloquer la requête appelante (les erreurs sont journalisées). */
export function syncProjectFinanceSafe(projectId: unknown) {
  if (!projectId) return
  syncProjectFinance(projectId).catch(err => console.error('[project-finance] synchronisation:', err?.message || err))
}
