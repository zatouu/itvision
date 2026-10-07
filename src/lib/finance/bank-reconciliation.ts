import AdminInvoice from '@/lib/models/AdminInvoice'
import { invoiceBalance, OPEN_INVOICE_STATUSES } from '@/lib/finance/billing'
import { invoiceRefKeys, type StatementLine } from '@/lib/finance/bank-statement'

/**
 * Rapprochement bancaire : propose, pour chaque encaissement du relevé, la ou les factures à solder.
 * Priorité au numéro de facture cité dans le libellé, sinon au montant exact du reste dû.
 * Rien n'est enregistré ici : les paiements passent ensuite par l'API de paiement des factures.
 */

export type MatchStatus = 'matched' | 'partial' | 'ambiguous' | 'unmatched' | 'already'
export type MatchConfidence = 'reference' | 'amount_client' | 'amount'

export interface InvoiceSummary {
  invoiceId: string
  numero: string
  client: string
  balance: number
}

export interface MatchResult {
  lineId: string
  status: MatchStatus
  confidence?: MatchConfidence
  allocations: Array<InvoiceSummary & { amount: number }>
  candidates: InvoiceSummary[]
  unallocated: number
  reason?: string
  paymentReference: string
}

interface WorkInvoice {
  id: string
  numero: string
  key?: string
  client: string
  clientWords: string[]
  open: boolean
  balance: number
  payments: Array<{ amount: number; day: string; reference?: string }>
}

const day = (d: unknown) => {
  const date = new Date(d as any)
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const normalize = (s: string) => s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ')

/** Référence enregistrée sur le paiement : sert aussi à détecter un relevé déjà importé. */
export function paymentReferenceFor(line: StatementLine) {
  return (line.reference?.trim() || `REL ${line.date} ${line.label}`).replace(/\s+/g, ' ').slice(0, 100)
}

function summary(inv: WorkInvoice): InvoiceSummary {
  return { invoiceId: inv.id, numero: inv.numero, client: inv.client, balance: inv.balance }
}

function alreadyRecorded(inv: WorkInvoice, line: StatementLine, ref: string) {
  return inv.payments.some(p => p.reference === ref || (p.amount === line.amount && p.day === line.date))
}

function numeroCandidates(keys: string[]) {
  return keys.flatMap(k => {
    const [year, n] = k.split('-')
    return [3, 4].map(pad => `FAC-${year}-${n.padStart(pad, '0')}`).concat(`FAC-${year}-${n}`)
  })
}

export async function matchStatementLines(lines: StatementLine[]) {
  const sorted = [...lines].sort((a, b) => a.date.localeCompare(b.date))
  const minDate = sorted.length ? new Date(`${sorted[0].date}T00:00:00.000Z`) : new Date()
  const referenced = numeroCandidates([...new Set(lines.flatMap(l => invoiceRefKeys(`${l.label} ${l.reference || ''}`)))])

  const docs = await AdminInvoice.find({
    status: { $nin: ['draft', 'cancelled'] },
    $or: [
      { status: { $in: OPEN_INVOICE_STATUSES } },
      { 'payments.date': { $gte: minDate } },
      ...(referenced.length ? [{ numero: { $in: referenced } }] : []),
    ],
  })
    .select('numero status total amountPaid creditedAmount payments.amount payments.date payments.reference client.name client.company')
    .lean() as any[]

  const invoices: WorkInvoice[] = docs.map(d => {
    const client = String(d.client?.company || d.client?.name || '')
    return {
      id: String(d._id),
      numero: String(d.numero),
      key: invoiceRefKeys(d.numero)[0],
      client,
      clientWords: normalize(`${d.client?.company || ''} ${d.client?.name || ''}`).split(' ').filter(w => w.length >= 4),
      open: OPEN_INVOICE_STATUSES.includes(d.status),
      balance: OPEN_INVOICE_STATUSES.includes(d.status) ? invoiceBalance(d) : 0,
      payments: (d.payments || []).map((p: any) => ({ amount: Math.round(Number(p.amount) || 0), day: day(p.date), reference: p.reference })),
    }
  })
  const openInvoices = invoices.filter(i => i.open && i.balance > 0).map(summary)
  const byKey = new Map(invoices.filter(i => i.key).map(i => [i.key!, i]))

  const results: MatchResult[] = sorted.map(line => {
    const paymentReference = paymentReferenceFor(line)
    const base: MatchResult = { lineId: line.id, status: 'unmatched', allocations: [], candidates: [], unallocated: line.amount, paymentReference }
    const keys = invoiceRefKeys(`${line.label} ${line.reference || ''}`)
    const cited = keys.map(k => byKey.get(k)).filter((i): i is WorkInvoice => !!i)

    const recordedOn = (cited.length ? cited : invoices).find(i => alreadyRecorded(i, line, paymentReference))
    if (recordedOn) return { ...base, status: 'already', unallocated: 0, reason: `Déjà enregistré sur ${recordedOn.numero}` }

    if (cited.length) {
      const targets = cited.filter(i => i.balance > 0)
      if (!targets.length) return { ...base, reason: `Facture ${cited.map(i => i.numero).join(', ')} déjà soldée ou non ouverte` }
      let remaining = line.amount
      for (const inv of targets) {
        if (remaining <= 0) break
        const amount = Math.min(remaining, inv.balance)
        base.allocations.push({ ...summary(inv), amount })
        inv.balance -= amount
        remaining -= amount
      }
      const missing = keys.length > cited.length ? 'Numéro cité introuvable pour une partie du libellé. ' : ''
      return {
        ...base,
        status: remaining > 0 ? 'partial' : 'matched',
        confidence: 'reference',
        unallocated: remaining,
        reason: remaining > 0 ? `${missing}Excédent non affecté : ${remaining.toLocaleString('fr-FR')} FCFA` : missing || undefined,
      }
    }

    const sameAmount = invoices.filter(i => i.balance > 0 && i.balance === line.amount)
    const label = normalize(line.label)
    const byClient = sameAmount.filter(i => i.clientWords.some(w => label.includes(w)))
    const pick = sameAmount.length === 1 ? sameAmount[0] : byClient.length === 1 ? byClient[0] : null
    if (pick) {
      base.allocations.push({ ...summary(pick), amount: line.amount })
      pick.balance = 0
      const confidence: MatchConfidence = byClient.includes(pick) ? 'amount_client' : 'amount'
      return { ...base, status: 'matched', confidence, unallocated: 0, reason: confidence === 'amount' ? 'Montant identique au reste dû, sans numéro de facture : à vérifier' : undefined }
    }
    if (sameAmount.length > 1) {
      return { ...base, status: 'ambiguous', candidates: (byClient.length ? byClient : sameAmount).slice(0, 10).map(summary), reason: 'Plusieurs factures ont ce reste dû' }
    }
    return { ...base, reason: keys.length ? 'Numéro de facture cité introuvable' : 'Aucune facture correspondante' }
  })

  return { results, openInvoices }
}
