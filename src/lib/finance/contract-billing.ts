import mongoose from 'mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Client from '@/lib/models/Client'
import User from '@/lib/models/User'
import { computeInvoiceTotals, nextInvoiceNumero, inferInvoiceRegime, DEFAULT_TAX_REGIME, LABOR_INVOICE_CATEGORY } from '@/lib/finance/billing'

const PERIOD_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, annual: 12 }
const DUE_DAYS = 30

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/** Échéance en cours d'un contrat (null si pas encore commencé). */
export function currentBillingPeriod(startDate: Date, frequency: string | undefined, now = new Date()) {
  const months = PERIOD_MONTHS[frequency || ''] || 12
  const start = new Date(startDate)
  if (now < start) return null
  let k = Math.floor(((now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth()) / months)
  if (addMonths(start, k * months) > now) k -= 1
  const periodStart = addMonths(start, k * months)
  const periodEnd = new Date(addMonths(start, (k + 1) * months).getTime() - 24 * 60 * 60 * 1000)
  return { periodStart, periodEnd, months }
}

/** Société (Client) et compte (User) d'un contrat : clientId a une sémantique mixte selon l'historique. */
async function resolveBillingParty(clientId: unknown): Promise<{ company: any; userId?: mongoose.Types.ObjectId; companyId?: mongoose.Types.ObjectId } | null> {
  const id = String(clientId || '')
  if (!mongoose.isValidObjectId(id)) return null
  const company = await Client.findById(id).lean() as any
  if (company) return { company, companyId: company._id }
  const user = await User.findById(id).select('name email phone companyClientId').lean() as any
  if (!user) return null
  const linked = user.companyClientId ? await Client.findById(user.companyClientId).lean() as any : null
  return { company: linked || { name: user.name, email: user.email, phone: user.phone }, userId: user._id, companyId: linked?._id }
}

const fmtDay = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/**
 * Factures brouillon des contrats à facturation automatique, une par échéance (idempotent :
 * index unique contrat + début de période). L'admin relit puis envoie, rien ne part au client tout seul.
 */
export async function runContractBilling(opts: { dryRun?: boolean; now?: Date } = {}) {
  const now = opts.now || new Date()
  const contracts = await MaintenanceContract.find({ status: 'active', autoBilling: true, annualPrice: { $gt: 0 } })
    .select('contractNumber name clientId annualPrice paymentFrequency startDate endDate')
    .lean() as any[]

  const created: Array<{ contractNumber: string; numero?: string; amount: number; periodStart: Date }> = []
  const skipped: Array<{ contractNumber: string; reason: string }> = []

  for (const c of contracts) {
    const period = currentBillingPeriod(c.startDate, c.paymentFrequency, now)
    if (!period) { skipped.push({ contractNumber: c.contractNumber, reason: 'pas encore commencé' }); continue }
    if (c.endDate && period.periodStart > new Date(c.endDate)) { skipped.push({ contractNumber: c.contractNumber, reason: 'contrat échu' }); continue }
    if (await AdminInvoice.exists({ maintenanceContractId: c._id, billingPeriodStart: period.periodStart })) continue

    const party = await resolveBillingParty(c.clientId)
    if (!party) { skipped.push({ contractNumber: c.contractNumber, reason: 'client introuvable' }); continue }

    const amount = Math.round((c.annualPrice * period.months) / 12)
    if (opts.dryRun) { created.push({ contractNumber: c.contractNumber, amount, periodStart: period.periodStart }); continue }

    const companyId = party.companyId
    // Même régime fiscal que la dernière facture de ce client, sinon le régime par défaut
    const last = companyId ? await AdminInvoice.findOne({ clientCompanyId: companyId }).sort({ date: -1 }).select('taxRegime taxRate brsAmount').lean() as any : null
    const taxRegime = last ? inferInvoiceRegime(last) : DEFAULT_TAX_REGIME
    const totals = computeInvoiceTotals(
      [{ description: `Contrat de maintenance « ${c.name} » (n° ${c.contractNumber}) — période du ${fmtDay(period.periodStart)} au ${fmtDay(period.periodEnd)}`, quantity: 1, unitPrice: amount, category: LABOR_INVOICE_CATEGORY }],
      { taxRegime, taxRate: last?.taxRate }
    )

    try {
      const invoice = await AdminInvoice.create({
        numero: await nextInvoiceNumero(now),
        date: now,
        dueDate: new Date(now.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000),
        status: 'draft',
        clientUserId: party.userId,
        clientCompanyId: companyId,
        maintenanceContractId: c._id,
        billingPeriodStart: period.periodStart,
        billingPeriodEnd: period.periodEnd,
        client: {
          name: party.company?.company || party.company?.name || 'Client',
          company: party.company?.company,
          email: party.company?.email,
          phone: party.company?.phone,
          address: party.company?.address,
          city: party.company?.city,
        },
        items: totals.items,
        subtotal: totals.subtotal,
        taxRegime: totals.taxRegime,
        brsThreshold: totals.brsThreshold,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        brsAmount: totals.brsAmount,
        total: totals.total,
        notes: `Échéance ${c.paymentFrequency === 'monthly' ? 'mensuelle' : c.paymentFrequency === 'quarterly' ? 'trimestrielle' : 'annuelle'} du contrat ${c.contractNumber}.`,
        terms: `Paiement à ${DUE_DAYS} jours.`,
      })
      created.push({ contractNumber: c.contractNumber, numero: invoice.numero, amount, periodStart: period.periodStart })
    } catch (err: any) {
      // Exécution concurrente : l'autre instance a déjà créé la facture de cette échéance
      if (err?.code !== 11000) throw err
    }
  }

  return { created, skipped, scanned: contracts.length }
}
