import { connectMongoose } from '@/lib/mongoose'
import { runContractBilling } from '@/lib/finance/contract-billing'
import { addNotification } from '@/lib/notifications-memory'

export const JOB_NAME = 'billing.contract-billing'

/** Factures brouillon des échéances de contrats (autoBilling), à relire et envoyer depuis l'admin. */
export async function runContractBillingJob() {
  await connectMongoose()
  const result = await runContractBilling()
  if (result.created.length > 0) {
    addNotification({
      userId: 'admin',
      type: 'info',
      title: 'Factures de contrats à envoyer',
      message: `${result.created.length} facture(s) brouillon créée(s) pour les échéances de contrats : ${result.created.map(c => c.numero).join(', ')}`,
      actionUrl: '/admin/factures',
      metadata: { invoices: result.created.map(c => c.numero) },
    })
  }
  return { created: result.created.length, skipped: result.skipped, scanned: result.scanned }
}
