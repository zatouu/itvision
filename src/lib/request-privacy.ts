import { createHmac } from 'crypto'

/**
 * Confidentialité des demandes Xeuy tant qu'aucun prestataire n'est retenu :
 * position floutée et adresse réduite au quartier. L'adresse exacte n'est
 * transmise qu'au prestataire assigné (GET /api/services/requests/[id]).
 */

/** Marge ajoutée au rayon de recherche géo pour ne rater aucune demande dont la position floutée est dans le rayon. */
export const APPROXIMATION_MAX_METERS = 450

function fuzzSecret(): string {
  return process.env.LOCATION_FUZZ_SECRET || process.env.JWT_SECRET || 'xeuy-location-fuzz'
}

/**
 * Décale la position de 250 à 450 m. Stable par demande (le marqueur ne saute pas) et dérivé
 * d'un secret serveur : impossible à retrancher en connaissant seulement l'identifiant.
 */
export function approximateCoordinates(requestId: string, lng: number, lat: number): [number, number] {
  const digest = createHmac('sha256', fuzzSecret()).update(requestId).digest()
  const angle = (digest.readUInt16BE(0) / 65536) * 2 * Math.PI
  const meters = 250 + (digest.readUInt16BE(2) / 65536) * 200
  const dLat = (meters * Math.cos(angle)) / 111_320
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))
  return [Number((lng + dLng).toFixed(5)), Number((lat + dLat).toFixed(5))]
}

const LANDMARK_SEPARATOR = ' — '

/**
 * Zone publique d'une adresse : quartier / commune / ville, sans repère précis.
 * L'app compose l'adresse ainsi : « <repère saisi par le client> — <quartier, commune, ville> ».
 * - avec séparateur : seule la partie géocodée (déjà au niveau du quartier) est gardée ;
 * - sans séparateur : impossible de distinguer un repère d'un quartier. On ne garde que le format
 *   du géocodage (au moins 3 segments « quartier, commune, ville ») réduit à ses deux derniers
 *   segments sans chiffre (numéros de rue, villa, porte…) ; sinon rien (« À proximité » côté app).
 */
export function publicArea(address: unknown): string | null {
  if (typeof address !== 'string') return null
  const text = address.trim()
  if (!text) return null

  const sepIndex = text.lastIndexOf(LANDMARK_SEPARATOR)
  if (sepIndex >= 0) {
    const area = text.slice(sepIndex + LANDMARK_SEPARATOR.length).trim()
    const parts = area.split(',').map(p => p.trim()).filter(Boolean).slice(0, 3)
    return parts.length ? parts.join(', ').slice(0, 120) : null
  }

  const parts = text.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length < 3) return null
  const safe = parts.filter(p => !/\d/.test(p)).slice(-2)
  return safe.length ? safe.join(', ').slice(0, 120) : null
}
