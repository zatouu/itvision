const R = 6371 // rayon terrestre en km

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000
}

/**
 * Estime le temps d'arrivée en minutes.
 * arrondi au 5 minutes le plus proche, minimum 5 min.
 */
export function minutesEta(distanceKm: number, speedKmh = 25): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0
  const minutes = (distanceKm / speedKmh) * 60
  return Math.max(5, Math.round(minutes / 5) * 5)
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}
