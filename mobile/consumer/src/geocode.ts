const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

export interface GeoAddress {
  display: string
  neighbourhood?: string
  suburb?: string
  city?: string
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=fr`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ITVision-Mobile/1.0' },
    })
    if (!r.ok) return null
    const data = await r.json()
    const addr = data.address || {}
    return {
      display: data.display_name || '',
      neighbourhood: addr.neighbourhood || addr.hamlet || '',
      suburb: addr.suburb || addr.quarter || '',
      city: addr.city || addr.town || addr.village || '',
    }
  } catch {
    return null
  }
}
