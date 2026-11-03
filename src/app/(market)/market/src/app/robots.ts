import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { CORPORATE_SITE_URL, MARKET_SITE_URL } from '@/lib/branding'
import { isMarketHost } from '@/lib/middleware/domain'

// Espaces privés, transactionnels ou techniques : jamais indexés, quel que soit le site
const PRIVATE_PATHS = [
  '/api/', '/admin', '/login', '/register', '/forgot-password', '/reset-password',
  '/compte', '/commandes', '/paiement/', '/payment/', '/checkout', '/panier', '/messages',
  '/suivi/', '/validation/', '/grains', '/espace-vendeur',
]

// itvisionplus.sn et ddm.sn sont servis par la même app : un robots.txt par domaine
export default async function robots(): Promise<MetadataRoute.Robots> {
  const onMarket = isMarketHost((await headers()).get('host') || '')

  if (onMarket) {
    return {
      rules: [{
        userAgent: '*',
        allow: '/',
        disallow: [...PRIVATE_PATHS, '/corporate-produits', '/market/compte', '/precommande/', '/produits/compare', '/produits/favoris'],
      }],
      sitemap: `${MARKET_SITE_URL}/sitemap.xml`,
      host: MARKET_SITE_URL,
    }
  }

  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [...PRIVATE_PATHS, '/portail-entreprise', '/tech-interface', '/workflows', '/workflow-engine', '/corporate-produits'],
    }],
    sitemap: `${CORPORATE_SITE_URL}/sitemap.xml`,
    host: CORPORATE_SITE_URL,
  }
}
