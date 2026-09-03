const R = 6371 // Earth radius in km
const DEGS_TO_RADS = Math.PI / 180

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEGS_TO_RADS
  const dLng = (lng2 - lng1) * DEGS_TO_RADS
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEGS_TO_RADS) *
    Math.cos(lat2 * DEGS_TO_RADS) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000
}

/**
 * Estimate arrival time in minutes.
 * Rounds to the nearest 5 minutes, minimum 1 min.
 */
export function minutesEta(distanceKm: number, speedKmh = 25): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0
  const minutes = (distanceKm / speedKmh) * 60
  return Math.max(1, Math.round(minutes / 5) * 5)
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b: number
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

export function closestPointIndex(lat: number, lng: number, polyline: Array<{ lat: number; lng: number }>): number {
  let bestIndex = 0
  let bestDist = Infinity
  for (let i = 0; i < polyline.length; i++) {
    const d = haversineMeters(lat, lng, polyline[i].lat, polyline[i].lng)
    if (d < bestDist) {
      bestDist = d
      bestIndex = i
    }
  }
  return bestIndex
}

export function remainingDistanceAlongPolyline(
  lat: number,
  lng: number,
  polyline: Array<{ lat: number; lng: number }>
): { remainingM: number; remainingPolyline: Array<{ lat: number; lng: number }> } {
  if (!polyline.length) return { remainingM: 0, remainingPolyline: [] }

  const index = closestPointIndex(lat, lng, polyline)
  let remainingM = 0
  for (let i = index; i < polyline.length - 1; i++) {
    remainingM += haversineMeters(
      polyline[i].lat,
      polyline[i].lng,
      polyline[i + 1].lat,
      polyline[i + 1].lng
    )
  }
  // Add the small gap from current position to the closest point on the route
  remainingM += haversineMeters(lat, lng, polyline[index].lat, polyline[index].lng)

  const remainingPolyline = [{ lat, lng }, ...polyline.slice(index)]
  return { remainingM, remainingPolyline }
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}
