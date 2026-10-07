import { connectMongoose } from '@/lib/mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { OPEN_INVOICE_STATUSES } from '@/lib/finance/billing'
import { reminderLevelFor, sendInvoiceReminder } from '@/lib/finance/invoice-reminders'

export const JOB_NAME = 'billing.invoice-reminders'

/**
 * Relances automatiques des factures ouvertes : J-3 (rappel), J+1, J+15, J+30.
 * Chaque niveau n'est envoyé qu'une fois par facture.
 */
export async function runInvoiceRemindersJob() {
  await connectMongoose()
  const invoices = await AdminInvoice.find({
    status: { $in: OPEN_INVOICE_STATUSES },
    dueDate: { $lte: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
  }).lean() as any[]

  let sent = 0
  const errors: string[] = []
  for (const inv of invoices) {
    const level = reminderLevelFor(inv)
    if (!level) continue
    try {
      const result = await sendInvoiceReminder(inv, level)
      if (result.sent) sent++
    } catch (e: any) {
      errors.push(`${inv.numero}: ${e?.message || e}`)
    }
  }
  return { checked: invoices.length, sent, errors }
}
