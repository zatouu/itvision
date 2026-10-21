/**
 * Adresse IP du client derrière le proxy nginx de l'EC2.
 *
 * nginx fixe `X-Real-IP $remote_addr` (non falsifiable) et AJOUTE l'IP réelle en fin de
 * `X-Forwarded-For` ($proxy_add_x_forwarded_for). La PREMIÈRE valeur de X-Forwarded-For est donc
 * fournie par le client : s'y fier permettait de contourner les limites de débit en changeant
 * l'en-tête à chaque requête (inscriptions en masse).
 */
type HeaderSource = { headers: { get(name: string): string | null } }

export function getClientIp(req: HeaderSource): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const hops = forwarded.split(',').map(s => s.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }
  return 'unknown'
}
