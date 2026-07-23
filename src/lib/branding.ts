/**
 * Configuration centralisée du branding.
 *
 * Marketplace (DDM) et Corporate (IT Vision Plus) ont des identités distinctes.
 * Les clients marketplace ne doivent pas voir le nom "IT Vision Plus".
 *
 * Les emails et domaines restent inchangés tant que les équivalents DDM
 * ne sont pas créés (mails, nom de domaine).
 */

export interface BrandConfig {
  name: string
  fullName: string
  tagline: string
  subtitle?: string
  description: string
  contactEmail: string
  supportEmail: string
  url: string
  whatsapp: string
  address: string
  hashtag?: string
  primaryColor?: string
  secondaryColor?: string
}

export const MARKET_BRAND: BrandConfig = {
  name: 'DDM+',
  fullName: 'Dieund Dal Ma',
  tagline: 'Marketplace import',
  subtitle: 'Import & sourcing',
  description: 'Marketplace import Chine & Sécurité Électronique',
  // Emails conservés tels quels (pas d'email DDM dédié pour l'instant)
  contactEmail: 'contact@itvisionplus.sn',
  supportEmail: 'support@itvisionplus.sn',
  // Domaine conservé tel quel (pas de domaine DDM dédié pour l'instant)
  url: 'https://market.itvisionplus.sn',
  whatsapp: '+221 77 413 34 40',
  address: 'Parcelles Assainies, Unité 25 – Dakar, Sénégal',
  hashtag: '#DDM',
  primaryColor: '#7c3aed',
  secondaryColor: '#4f46e5',
} as const

export const CORPORATE_BRAND: BrandConfig = {
  name: 'IT Vision Plus',
  fullName: 'IT Vision Plus',
  tagline: 'Sécurité électronique & digitalisation',
  subtitle: 'Sécurité électronique, réseau & domotique',
  description: 'Votre partenaire en sécurité électronique et digitalisation',
  contactEmail: 'contact@itvisionplus.sn',
  supportEmail: 'support@itvisionplus.sn',
  url: 'https://itvisionplus.sn',
  whatsapp: '+221 77 413 34 40',
  address: 'Parcelles Assainies, Unité 25 – Dakar, Sénégal',
  hashtag: '#ITVisionPlus',
  primaryColor: '#0f766e',
  secondaryColor: '#047857',
} as const

export const XEUY_BRAND: BrandConfig = {
  name: 'Xeuy Bi',
  fullName: 'Xeuy Bi',
  tagline: 'Services à la demande',
  subtitle: 'Trouvez un prestataire en quelques minutes',
  description: 'Services à la demande au Sénégal',
  contactEmail: 'contact@itvisionplus.sn',
  supportEmail: 'support@itvisionplus.sn',
  url: 'https://xeuy.sn',
  whatsapp: '+221 77 413 34 40',
  address: 'Parcelles Assainies, Unité 25 – Dakar, Sénégal',
  hashtag: '#XeuyBi',
  primaryColor: '#06b6d4',
  secondaryColor: '#0891b2',
}

const MARKET_HOSTS = ['market.itvisionplus.sn', 'ddmplus.sn', 'ddm.itvisionplus.sn', 'market']
const CORPORATE_HOSTS = ['itvisionplus.sn', 'www.itvisionplus.sn', 'staging.itvisionplus.sn', 'admin.itvisionplus.sn']
const XEUY_HOSTS = ['xeuy.sn', 'www.xeuy.sn', 'app.xeuy.sn']

export function getDefaultBrand(): BrandConfig {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  return getBrandFromUrl(siteUrl) || CORPORATE_BRAND
}

export function getBrandFromUrl(url?: string): BrandConfig | null {
  if (!url) return null
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return getBrandFromHost(hostname)
  } catch {
    return null
  }
}

export function getBrandFromHost(host?: string | null): BrandConfig {
  if (!host) return getDefaultBrand()
  const h = host.toLowerCase().split(':')[0].replace(/^www\./, '')

  if (XEUY_HOSTS.some(domain => h === domain || h.endsWith('.' + domain))) return XEUY_BRAND
  if (MARKET_HOSTS.some(domain => h === domain || h.endsWith('.' + domain) || h.startsWith(domain + '.'))) return MARKET_BRAND
  if (CORPORATE_HOSTS.some(domain => h === domain || h.endsWith('.' + domain))) return CORPORATE_BRAND

  // Localhost fallback : tenter de deviner via le port ou l'env
  if (h === 'localhost' || h === '127.0.0.1') {
    const envBrand = process.env.BRAND?.toLowerCase()
    if (envBrand === 'market' || envBrand === 'ddm') return MARKET_BRAND
    if (envBrand === 'xeuy') return XEUY_BRAND
    if (envBrand === 'corporate') return CORPORATE_BRAND
    return getDefaultBrand()
  }

  return getDefaultBrand()
}
