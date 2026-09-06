import type { Metadata } from 'next'
import mongoose from 'mongoose'
import { notFound } from 'next/navigation'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import ProductDetailNew from '@/components/product/ProductDetailNew'
import MarketBottomNav from '@/components/MarketBottomNav'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import Review from '@/lib/models/Review'
import { formatProductDetail, formatSimilarProducts } from '@/lib/catalog-format'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'
import { buildProductJsonLd } from '@/lib/structured-data'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id)

const fetchProductById = async (id: string) => {
  await connectMongoose()
  if (isValidId(id)) {
    return Product.findById(id).lean()
  }
  return Product.findOne({ slug: id }).lean()
}

const fetchSimilarProducts = async (product: any) => {
  const query: Record<string, unknown> = { _id: { $ne: product._id } }
  if (product.category) query.category = product.category

  return Product.find(query)
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(6)
    .lean()
}

const fetchReviewStats = async (productId: string) => {
  await connectMongoose()
  const [result] = await Review.aggregate([
    { $match: { productId, status: 'approved' } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ])
  return result ? { avg: Number(result.avg.toFixed(1)), count: Number(result.count) } : null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await fetchProductById(id)
  if (!product) {
    return {
      title: 'Produit introuvable | Catalogue DDM+',
      description: 'Ce produit n’est plus disponible dans le catalogue.'
    }
  }

  const detail = formatProductDetail(product)
  const title = `${detail.name} — DDM+ Marketplace`
  const description = detail.tagline || detail.description || 'Achetez ce produit en import direct Chine, livraison Dakar. DDM+.'
  const image = detail.image?.startsWith('http') ? detail.image : `${SITE_URL}${detail.image}`
  const price = detail.pricing?.salePrice ?? detail.pricing?.baseCost ?? 0
  const currency = detail.currency || 'FCFA'
  const inStock = detail.availability?.status === 'in_stock' && detail.availability?.stockQuantity > 0

  return {
    title,
    description,
    keywords: [detail.name, detail.category || 'Catalogue', 'import Chine', 'Dakar', 'Sénégal', 'DDM+'],
    alternates: { canonical: `${SITE_URL}/produits/${id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/produits/${id}`,
      type: 'website',
      images: image && image !== `${SITE_URL}/placeholder.svg` ? [{ url: image, width: 1200, height: 630, alt: detail.name }] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image && image !== `${SITE_URL}/placeholder.svg` ? [image] : undefined
    },
    other: {
      'product:price:amount': String(price),
      'product:price:currency': currency,
      'product:availability': inStock ? 'in stock' : 'preorder'
    }
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await fetchProductById(id)
  if (!product) {
    notFound()
  }

  const similarRaw = await fetchSimilarProducts(product)
  const shippingRates = getConfiguredShippingRates()
  const detail = formatProductDetail(product, shippingRates)
  const similar = formatSimilarProducts(similarRaw, shippingRates)
  const reviewStats = await fetchReviewStats(id)

  const image = detail.image?.startsWith('http') ? detail.image : `${SITE_URL}${detail.image}`
  const price = detail.pricing?.salePrice ?? detail.pricing?.baseCost ?? 0
  const inStock = detail.availability?.status === 'in_stock' && detail.availability?.stockQuantity > 0

  const schemas = buildProductJsonLd({
    id: detail.id,
    name: detail.name,
    description: detail.description || detail.tagline,
    category: detail.category,
    image: image === `${SITE_URL}/placeholder.svg` ? undefined : image,
    currency: detail.currency || 'FCFA',
    price,
    salePrice: detail.pricing?.salePrice ?? undefined,
    availability: inStock ? 'InStock' : 'PreOrder',
    url: `${SITE_URL}/produits/${id}`,
    sku: detail.id,
    brand: 'DDM+',
    condition: (detail.condition?.toLowerCase() === 'new' ? 'New' : detail.condition?.toLowerCase() === 'used' ? 'Used' : 'New') as 'New' | 'Used' | 'Refurbished',
    reviewCount: reviewStats?.count,
    reviewRating: reviewStats?.avg,
    breadcrumbs: [
      { name: 'Accueil', url: SITE_URL },
      { name: 'Produits', url: `${SITE_URL}/produits` },
      { name: detail.name, url: `${SITE_URL}/produits/${id}` },
    ],
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <MarketHeader />
      <main>
        <ProductDetailNew product={detail} similar={similar} />
      </main>
      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
