import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { projectsCollection } from '@/lib/projects/persistence'
import { requestApproval, fcfa } from '@/lib/workflow/approvals'

/**
 * Devis accepté → deux validations envoyées au pilote :
 *  1. facture d'acompte au % convenu sur le devis ;
 *  2. budget prévisionnel du projet (achat estimé / revente par ligne) = démarrage.
 * Jamais bloquant : appelé en tâche de fond après l'acceptation.
 */
export async function onQuoteAccepted(quoteId: string) {
  try {
    await connectMongoose()
    const q = await AdminQuote.findById(quoteId).lean() as any
    if (!q || q.status !== 'accepted') return
    const client = q.client?.name || 'Client'
    const project = q.projectId
      ? await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(String(q.projectId)) }, { projection: { name: 1, budgetLines: 1 } }) as any
      : null

    const percent = Number(q.depositPercent) || 0
    if (percent > 0 && percent < 100 && !(await AdminInvoice.exists({ quoteId: String(q._id), status: { $ne: 'cancelled' } }))) {
      const amount = Math.round((Number(q.total) || 0) * percent / 100)
      await requestApproval({
        type: 'deposit_invoice',
        dedupeKey: `deposit:${q._id}`,
        quoteId: String(q._id),
        projectId: q.projectId ? String(q.projectId) : null,
        title: `Facture d’acompte ${percent} % — devis ${q.numero}`,
        summary: `${client} a accepté le devis ${q.numero}${q.title ? ` (${q.title})` : ''}.\nValider crée la facture d’acompte en brouillon ; le reliquat sera proposé à la fin des travaux.`,
        lines: [
          { label: 'Total du devis', value: fcfa(q.total) },
          { label: `Acompte ${percent} %`, value: fcfa(amount) },
          { label: 'Reliquat à la livraison', value: fcfa((Number(q.total) || 0) - amount) },
          ...(project ? [{ label: 'Projet', value: project.name }] : []),
        ],
        payload: { quoteId: String(q._id), percent },
      })
    }

    const alreadyBudgeted = (project?.budgetLines || []).some((l: any) => l.quoteId === String(q._id))
    if (project && !alreadyBudgeted && (q.products || []).length) {
      const lines = (q.products || []).map((p: any) => ({
        label: p.description,
        quantity: Number(p.quantity) || 1,
        unitCost: Number(p.unitCost) || 0,
        unitPrice: Number(p.netUnitPrice ?? p.unitPrice) || 0,
        isLabor: !!p.isLabor,
      }))
      const sale = lines.reduce((s: number, l: any) => s + l.unitPrice * l.quantity, 0)
      const cost = lines.reduce((s: number, l: any) => s + l.unitCost * l.quantity, 0)
      const missing = lines.filter((l: any) => !l.unitCost).length
      await requestApproval({
        type: 'project_budget',
        dedupeKey: `budget:${q._id}`,
        quoteId: String(q._id),
        projectId: String(project._id),
        title: `Démarrer « ${project.name} » avec son budget`,
        summary: `Le budget prévisionnel est prérempli depuis le devis ${q.numero} : chaque ligne devient un achat à confirmer au prix réel.${missing ? `\n${missing} ligne(s) sans prix d’achat estimé : à compléter à l’achat.` : ''}`,
        lines: [
          ...lines.slice(0, 12).map((l: any) => ({
            label: `${l.quantity} × ${String(l.label).slice(0, 60)}${l.isLabor ? ' (M.O.)' : ''}`,
            value: `${l.unitCost ? fcfa(l.unitCost * l.quantity) : '—'} → ${fcfa(l.unitPrice * l.quantity)}`,
          })),
          ...(lines.length > 12 ? [{ label: `… ${lines.length - 12} autre(s) ligne(s)` }] : []),
          { label: 'Achat estimé → vente', value: `${fcfa(cost)} → ${fcfa(sale)}` },
          { label: 'Marge prévue', value: `${fcfa(sale - cost)}${sale > 0 ? ` (${Math.round((sale - cost) / sale * 100)} %)` : ''}` },
        ],
        payload: { projectId: String(project._id), quoteId: String(q._id), lines },
      })
    }
  } catch (e) {
    console.error('[workflow] devis accepté:', e)
  }
}

/** Travaux terminés (toutes les tâches faites, recette ou fin) → facture du reliquat de chaque devis accepté. */
export async function onProjectWorksDone(projectId: string) {
  try {
    await connectMongoose()
    if (!mongoose.isValidObjectId(projectId)) return
    const project = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(projectId) }, { projection: { name: 1 } }) as any
    const quotes = await AdminQuote.find({ projectId, status: 'accepted' }).select('numero total client title').lean() as any[]
    for (const q of quotes) {
      const invoices = await AdminInvoice.find({ quoteId: String(q._id), status: { $ne: 'cancelled' } }).select('numero total creditedAmount').lean() as any[]
      const invoiced = invoices.reduce((s, i) => s + (Number(i.total) || 0) - (Number(i.creditedAmount) || 0), 0)
      const remaining = Math.max(0, Math.round((Number(q.total) || 0) - invoiced))
      if (remaining <= 0) continue
      await requestApproval({
        type: 'balance_invoice',
        dedupeKey: `balance:${q._id}`,
        quoteId: String(q._id),
        projectId,
        title: `Facture du reliquat — ${project?.name || `devis ${q.numero}`}`,
        summary: `Les travaux de « ${project?.name || 'ce projet'} » sont terminés.\nValider crée la facture du solde en brouillon.`,
        lines: [
          { label: `Devis ${q.numero}`, value: fcfa(q.total) },
          { label: 'Déjà facturé', value: `${fcfa(invoiced)}${invoices.length ? ` (${invoices.map(i => i.numero).join(', ')})` : ''}` },
          { label: 'Reliquat à facturer', value: fcfa(remaining) },
        ],
        payload: { quoteId: String(q._id) },
      })
    }
  } catch (e) {
    console.error('[workflow] fin de travaux:', e)
  }
}
