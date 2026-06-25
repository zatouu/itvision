import { MetadataRoute } from 'next'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'
import ProductCategory from '@/lib/models/ProductCategory'
import Shop from '@/lib/models/Shop'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectMongoose()

  const [products, groupOrders, categories, shops] = await Promise.all([
    Product.find({ status: { $ne: 'deleted' } })
      .select('_id updatedAt')
      .limit(5000)
      .lean(),
    GroupOrder.find({ status: { $in: ['open', 'pending', 'confirmed'] } })
      .select('groupId updatedAt')
      .limit(500)
      .lean(),
    ProductCategory.find().select('slug updatedAt').limit(200).lean(),
    Shop.find({ status: 'active' }).select('slug updatedAt').limit(200).lean()
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), priority: 1.0, changeFrequency: 'daily' },
    { url: `${SITE_URL}/produits`, lastModified: new Date(), priority: 0.9, changeFrequency: 'daily' },
    { url: `${SITE_URL}/achats-groupes`, lastModified: new Date(), priority: 0.8, changeFrequency: 'daily' },
    { url: `${SITE_URL}/market/boutiques`, lastModified: new Date(), priority: 0.8, changeFrequency: 'daily' },
    { url: `${SITE_URL}/panier`, lastModified: new Date(), priority: 0.4, changeFrequency: 'monthly' },
    { url: `${SITE_URL}/retrouver-ma-commande`, lastModified: new Date(), priority: 0.5, changeFrequency: 'monthly' },
  ]

  const productRoutes = products.map((p: any) => ({
    url: `${SITE_URL}/produits/${String(p._id)}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    priority: 0.8,
    changeFrequency: 'daily' as const
  }))

  const groupRoutes = groupOrders.map((g: any) => ({
    url: `${SITE_URL}/achats-groupes/${g.groupId}`,
    lastModified: g.updatedAt ? new Date(g.updatedAt) : new Date(),
    priority: 0.7,
    changeFrequency: 'daily' as const
  }))

  const categoryRoutes = categories.map((c: any) => ({
    url: `${SITE_URL}/produits?categorie=${encodeURIComponent(c.slug)}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    priority: 0.6,
    changeFrequency: 'daily' as const
  }))

  const shopRoutes = shops.map((s: any) => ({
    url: `${SITE_URL}/boutiques/${s.slug}`,
    lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
    priority: 0.7,
    changeFrequency: 'daily' as const
  }))

  return [...staticRoutes, ...productRoutes, ...groupRoutes, ...categoryRoutes, ...shopRoutes]
}
