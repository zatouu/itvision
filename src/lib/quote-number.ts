import { nextQuoteNumero } from '@/lib/finance/billing'

/** Prochain numéro de devis DEV-YYYY-NNNN (compteur atomique, cf. lib/finance/billing). */
export async function generateQuoteNumero(): Promise<string> {
  return nextQuoteNumero()
}
