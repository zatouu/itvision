import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, apiRateLimiter } from '@/lib/rate-limiter'

/**
 * Décode une polyline Google encodée en tableau de coordonnées {lat,lng}.
 */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
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

function parseCoord(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null
  const [lat, lng] = value.split(',').map(v => Number(v.trim()))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export async function GET(request: NextRequest) {
  const rateLimit = applyRateLimit(request, apiRateLimiter)
  if (rateLimit) return rateLimit

  try {
    const { searchParams } = new URL(request.url)
    const origin = parseCoord(searchParams.get('origin'))
    const destination = parseCoord(searchParams.get('destination'))
    const mode = (searchParams.get('mode') || 'driving').toLowerCase()

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Paramètres origin et destination requis (format: lat,lng)' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé Google Maps non configurée sur le serveur' },
        { status: 503 }
      )
    }

    const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`)
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`)
    url.searchParams.set('mode', mode)
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const data = await res.json()

    if (data.status !== 'OK' || !data.routes?.length) {
      return NextResponse.json(
        { error: data.status || 'Aucun itinéraire trouvé', googleStatus: data.status },
        { status: 400 }
      )
    }

    const leg = data.routes[0].legs[0]
    const encoded = data.routes[0].overview_polyline?.points || ''

    return NextResponse.json({
      success: true,
      polyline: decodePolyline(encoded),
      distance: {
        text: leg.distance?.text || '',
        value: leg.distance?.value || 0, // mètres
      },
      duration: {
        text: leg.duration?.text || '',
        value: leg.duration?.value || 0, // secondes
      },
      origin,
      destination,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    console.error('[Route] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
