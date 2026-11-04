/**
 * Lien de paiement Wave Business : https://pay.wave.com/m/<code_marchand>/c/sn/?amount=<N>
 * Le code marchand (M_sn_…) est public — il figure dans tout lien de paiement.
 * Fonction pure : utilisable côté client comme serveur.
 */
export function buildWavePayLink(payUrl: string | undefined | null, amount: number): string | null {
  if (!payUrl || typeof payUrl !== 'string') return null
  const base = payUrl.split('?')[0].trim()
  if (!/^https:\/\/pay\.wave\.com\/m\//.test(base)) return null
  const safeAmount = Math.max(0, Math.round(amount))
  return `${base}${base.endsWith('/') ? '' : '/'}?amount=${safeAmount}`
}
