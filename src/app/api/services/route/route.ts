import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, apiRateLimiter } from '@/lib/rate-limiter'
import { requireAuth } from '@/lib/jwt'

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

type RouteResult = {
  polyline: Array<{ lat: number; lng: number }>
  distanceMeters: number
  durationSeconds: number
  distanceText?: string
  durationText?: string
  provider: 'google' | 'osrm'
}

const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org'

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

/** Google Directions : uniquement si GOOGLE_MAPS_API_KEY est configurée sur le serveur. */
async function googleRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode: string): Promise<RouteResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`)
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`)
  url.searchParams.set('mode', mode)
  url.searchParams.set('key', apiKey)
  const res = await fetch(url.toString(), { cache: 'no-store', signal: AbortSignal.timeout(8000) })
  const data = await res.json()
  if (data.status !== 'OK' || !data.routes?.length) {
    console.warn('[Route] Google indisponible, repli OSRM :', data.status)
    return null
  }
  const leg = data.routes[0].legs[0]
  return {
    polyline: decodePolyline(data.routes[0].overview_polyline?.points || ''),
    distanceMeters: leg.distance?.value || 0,
    durationSeconds: leg.duration?.value || 0,
    distanceText: leg.distance?.text,
    durationText: leg.duration?.text,
    provider: 'google',
  }
}

/** Repli sans clé : serveur OSRM (OpenStreetMap). Même encodage de polyline que Google (précision 5). */
async function osrmRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode: string): Promise<RouteResult | null> {
  const profile = mode === 'walking' ? 'foot' : mode === 'bicycling' ? 'bike' : 'driving'
  const url = `${OSRM_URL.replace(/\/+$/, '')}/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline`
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'XeuyBi/1.0 (itvisionplus.sn)' } })
  if (!res.ok) return null
  const data = await res.json()
  const route = data?.routes?.[0]
  if (data?.code !== 'Ok' || !route?.geometry) return null
  return {
    polyline: decodePolyline(route.geometry),
    distanceMeters: Math.round(route.distance || 0),
    durationSeconds: Math.round(route.duration || 0),
    provider: 'osrm',
  }
}

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, apiRateLimiter)
  if (rateLimit) return rateLimit

  // Réservé aux utilisateurs connectés : sans quoi n'importe qui peut brûler
  // le quota Google (ou abuser du serveur OSRM public) au nom de la plateforme.
  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  }

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

    // Google si la clé est configurée, sinon (ou en cas d'échec) OSRM : l'itinéraire ne dépend plus de la clé
    const route = await googleRoute(origin, destination, mode).catch(() => null)
      || await osrmRoute(origin, destination, mode).catch(() => null)

    if (!route || route.polyline.length === 0) {
      return NextResponse.json({ error: 'Aucun itinéraire trouvé' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      provider: route.provider,
      polyline: route.polyline,
      distance: {
        text: route.distanceText || formatDistance(route.distanceMeters),
        value: route.distanceMeters, // mètres
      },
      duration: {
        text: route.durationText || formatDuration(route.durationSeconds),
        value: route.durationSeconds, // secondes
      },
      origin,
      destination,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    console.error('[Route] Error:', message)
    return NextResponse.json({ error: 'Itinéraire indisponible' }, { status: 500 })
  }
}
