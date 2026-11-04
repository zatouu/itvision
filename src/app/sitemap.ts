import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'
import ProductCategory from '@/lib/models/ProductCategory'
import Shop from '@/lib/models/Shop'
import { CORPORATE_SITE_URL, MARKET_SITE_URL } from '@/lib/branding'
import { isMarketHost } from '@/lib/middleware/domain'
import { corporateCatalogFilter } from '@/lib/market/corporate-catalog'

type Entry = MetadataRoute.Sitemap[number]

const page = (base: string, path: string, priority: number, changeFrequency: Entry['changeFrequency']): Entry => ({
  url: `${base}${path}`,
  lastModified: new Date(),
  priority,
  changeFrequency,
})

const lastMod = (doc: { updatedAt?: Date | string }) => (doc.updatedAt ? new Date(doc.updatedAt) : new Date())

// Pages vitrines du site corporate (les espaces privés sont exclus via robots.txt)
const CORPORATE_PAGES: Array<[string, number, Entry['changeFrequency']]> = [
  ['', 1.0, 'weekly'],
  ['/services', 0.9, 'monthly'],
  ['/services/videosurveillance', 0.9, 'monthly'],
  ['/services/controle-acces', 0.9, 'monthly'],
  ['/services/securite-incendie', 0.8, 'monthly'],
  ['/services/network-cabling', 0.8, 'monthly'],
  ['/services/fiber-optic', 0.8, 'monthly'],
  ['/services/maintenance', 0.8, 'monthly'],
  ['/services/qhse', 0.6, 'monthly'],
  ['/domotique', 0.8, 'monthly'],
  ['/digitalisation', 0.7, 'monthly'],
  ['/portail-valeur', 0.5, 'monthly'],
  ['/realisations', 0.7, 'monthly'],
  ['/produits', 0.8, 'weekly'],
  ['/generateur-devis', 0.7, 'monthly'],
  ['/about', 0.6, 'yearly'],
  ['/contact', 0.8, 'yearly'],
]

const MARKET_PAGES: Array<[string, number, Entry['changeFrequency']]> = [
  ['', 1.0, 'daily'],
  ['/produits', 0.9, 'daily'],
  ['/achats-groupes', 0.9, 'daily'],
  ['/market/boutiques', 0.7, 'weekly'],
  ['/comment-ca-marche', 0.6, 'monthly'],
  ['/tarification', 0.5, 'monthly'],
  ['/devenir-vendeur', 0.5, 'monthly'],
]

async function corporateSitemap(): Promise<MetadataRoute.Sitemap> {
  const base = CORPORATE_SITE_URL
  const pages = CORPORATE_PAGES.map(([path, priority, freq]) => page(base, path, priority, freq))
  try {
    await connectMongoose()
    const products = await Product.find(corporateCatalogFilter()).select('_id updatedAt').limit(2000).lean()
    return [
      ...pages,
      ...products.map((p: any) => ({ url: `${base}/produits/${String(p._id)}`, lastModified: lastMod(p), priority: 0.6, changeFrequency: 'weekly' as const })),
    ]
  } catch (err) {
    console.warn('[sitemap] corporate : MongoDB indisponible, pages statiques seules.', err)
    return pages
  }
}

async function marketSitemap(): Promise<MetadataRoute.Sitemap> {
  const base = MARKET_SITE_URL
  const pages = MARKET_PAGES.map(([path, priority, freq]) => page(base, path, priority, freq))
  try {
    await connectMongoose()
    const [products, groupOrders, categories, shops] = await Promise.all([
      Product.find({ isPublished: { $ne: false }, status: { $ne: 'deleted' } }).select('_id updatedAt').sort({ updatedAt: -1 }).limit(10000).lean(),
      GroupOrder.find({ status: { $in: ['open', 'filled'] } }).select('groupId updatedAt').limit(1000).lean(),
      ProductCategory.find({ isActive: true }).select('slug updatedAt').limit(300).lean(),
      Shop.find({ status: 'active' }).select('slug updatedAt').limit(1000).lean(),
    ])
    return [
      ...pages,
      ...categories.filter((c: any) => c.slug).map((c: any) => ({ url: `${base}/produits?cat=${encodeURIComponent(c.slug)}`, lastModified: lastMod(c), priority: 0.7, changeFrequency: 'daily' as const })),
      ...products.map((p: any) => ({ url: `${base}/produits/${String(p._id)}`, lastModified: lastMod(p), priority: 0.8, changeFrequency: 'weekly' as const })),
      ...groupOrders.filter((g: any) => g.groupId).map((g: any) => ({ url: `${base}/achats-groupes/${g.groupId}`, lastModified: lastMod(g), priority: 0.7, changeFrequency: 'daily' as const })),
      ...shops.filter((s: any) => s.slug).map((s: any) => ({ url: `${base}/boutiques/${s.slug}`, lastModified: lastMod(s), priority: 0.6, changeFrequency: 'weekly' as const })),
    ]
  } catch (err) {
    console.warn('[sitemap] market : MongoDB indisponible, pages statiques seules.', err)
    return pages
  }
}

// Généré à la requête (et non au build Docker, où Mongo est injoignable) et propre à chaque domaine
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const onMarket = isMarketHost((await headers()).get('host') || '')
  return onMarket ? marketSitemap() : corporateSitemap()
}
