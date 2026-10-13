import { SENEGAL_REGIONS } from '@/lib/senegal-address'

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\b(region|departement|department|district|de|du|of)\b/g, '').replace(/[^a-z0-9]/g, '')

export function mapGeocodedAddress(address: Record<string, string>) {
  if (address.country_code?.toLowerCase() !== 'sn') throw new Error('La livraison est disponible au Sénégal uniquement.')
  const candidates = [address.state, address.region, address.county, address.state_district, address.city, address.town].filter(Boolean).map(normalize)
  const region = Object.keys(SENEGAL_REGIONS).find(value => candidates.includes(normalize(value))) || ''
  const department = Object.keys(SENEGAL_REGIONS[region]?.departments || {}).find(value =>
    [address.county, address.state_district, address.municipality, address.city, address.town].filter(Boolean).map(normalize).includes(normalize(value))) || ''
  return {
    region,
    department,
    neighborhood: (address.neighbourhood || address.quarter || address.suburb || address.city_district || address.village || address.hamlet || '').slice(0, 120),
    street: [address.house_number, address.road || address.pedestrian || address.street].filter(Boolean).join(' ').slice(0, 300),
  }
}