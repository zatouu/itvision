import AdminQuote from '@/lib/models/AdminQuote'

/**
 * Génère le prochain numéro de devis DEV-YYYY-NNNN sur AdminQuote.
 * L'index unique sur `numero` reste le garde-fou en cas de course.
 */
export async function generateQuoteNumero(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await AdminQuote.countDocuments({ numero: new RegExp(`^DEV-${year}-`) })
  return `DEV-${year}-${String(count + 1).padStart(4, '0')}`
}
