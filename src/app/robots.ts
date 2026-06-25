import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/produits', '/achats-groupes', '/market', '/panier', '/retrouver-ma-commande'],
        disallow: ['/admin', '/api', '/compte', '/commandes', '/paiement/', '/payment/']
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  }
}
