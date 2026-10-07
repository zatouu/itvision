/**
 * Devis issu d'un rapport d'intervention : barème unique partagé par la route admin
 * (/api/admin/reports/[id]/generate-quote) et l'agent quote_draft.
 */
import { computeQuoteTotals, DEFAULT_BRS_THRESHOLD } from '@/lib/finance/billing'

export const REPORT_HOURLY_RATE = 35000 // FCFA/h

export interface ReportQuoteLine {
  description: string
  quantity: number
  unitPrice: number
  total: number
  isLabor?: boolean
  catalogLookup?: boolean
  catalogMatched?: boolean
}

/** Lignes : matériel installé/utilisé + main d'œuvre + frais annexes. */
export function buildReportQuoteLines(report: any): ReportQuoteLine[] {
  const lines: ReportQuoteLine[] = []

  for (const eq of report?.equipmentInstalled || []) {
    const quantity = Number(eq.quantity) || 1
    const unitPrice = Number(eq.unitPrice) || 0
    lines.push({ description: `Matériel : ${eq.name || eq.type || 'Équipement'}`, quantity, unitPrice, total: quantity * unitPrice })
  }

  for (const m of report?.materialsUsed || []) {
    const quantity = Number(m.quantity) || 1
    const unitPrice = Number(m.unitPrice) || 0
    lines.push({
      description: `Matériel : ${m.name}${m.sku ? ` (${m.sku})` : ''}`,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      catalogLookup: !unitPrice, // prix manquant → à résoudre via le catalogue
    })
  }

  const duration = Number(report?.totalDuration) || Number(report?.interventionDuration) || 2
  lines.push({
    description: "Main d'œuvre technique",
    quantity: duration,
    unitPrice: REPORT_HOURLY_RATE,
    total: duration * REPORT_HOURLY_RATE,
    isLabor: true,
  })

  for (const exp of report?.additionalExpenses || []) {
    const amount = Number(exp.amount) || 0
    lines.push({ description: exp.description || 'Frais annexes', quantity: 1, unitPrice: amount, total: amount })
  }

  return lines
}

/** Totaux : régime BRS (5 % sur la main-d'œuvre au-delà du seuil commun) — jamais de TVA en plus de la BRS. */
export function priceReportQuote(lines: ReportQuoteLine[]) {
  return computeQuoteTotals(lines, { applyBRS: true, brsThreshold: DEFAULT_BRS_THRESHOLD })
}
