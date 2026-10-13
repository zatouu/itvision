import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthServer } from '@/lib/auth-server'
import { mapGeocodedAddress } from '@/lib/market/address-geocoding'
import { getRedisClient } from '@/lib/redis'

export const runtime = 'nodejs'
const coordinates = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).strict()
let nextRequestAt = 0
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated) return reply({ error: 'Non authentifié' }, 401)
  const parsed = coordinates.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reply({ error: 'Coordonnées invalides.' }, 400)
  try {
    const redis = getRedisClient()
    if (redis?.status === 'ready') {
      const acquired = await redis.set('market:address-geocoding:throttle', '1', 'PX', 1200, 'NX')
      if (!acquired) return reply({ error: 'Le service est occupé. Réessayez dans quelques secondes.' }, 429)
    } else {
      if (process.env.NODE_ENV === 'production') return reply({ error: 'La localisation est temporairement indisponible. Vous pouvez saisir votre adresse.' }, 503)
      if (Date.now() < nextRequestAt) return reply({ error: 'Veuillez patienter avant de réessayer.' }, 429)
      nextRequestAt = Date.now() + 1200
    }
    const endpoint = new URL(process.env.ADDRESS_GEOCODING_URL || 'https://nominatim.openstreetmap.org/reverse')
    if (endpoint.protocol !== 'https:') throw new Error('Configuration invalide')
    endpoint.search = new URLSearchParams({ lat: String(parsed.data.latitude), lon: String(parsed.data.longitude), format: 'jsonv2', addressdetails: '1', 'accept-language': 'fr' }).toString()
    const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'DDMPlus-Address/1.0 (+https://market.itvisionplus.sn)', Accept: 'application/json' } })
    if (!response.ok) return reply({ error: 'Adresse introuvable pour le moment. Réessayez ou complétez les champs manuellement.' }, 502)
    const data = z.object({ address: z.record(z.string(), z.string()) }).safeParse(await response.json())
    if (!data.success) return reply({ error: 'Aucune adresse trouvée à cette position.' }, 422)
    if (data.data.address.country_code?.toLowerCase() !== 'sn') return reply({ error: 'La livraison est disponible au Sénégal uniquement.' }, 422)
    return reply({ address: mapGeocodedAddress(data.data.address), attribution: '© OpenStreetMap contributors' })
  } catch {
    return reply({ error: 'Le service de localisation est indisponible. La saisie manuelle reste disponible.' }, 503)
  }
}