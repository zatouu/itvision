import type { Metadata } from 'next'
import mongoose from 'mongoose'
import { notFound } from 'next/navigation'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import ProductDetailNew from '@/components/product/ProductDetailNew'
import MarketBottomNav from '@/components/MarketBottomNav'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { formatProductDetail, formatSimilarProducts } from '@/lib/catalog-format'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'

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
      images: image && image !== `${SITE_URL}/file.svg` ? [{ url: image, width: 1200, height: 630, alt: detail.name }] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image && image !== `${SITE_URL}/file.svg` ? [image] : undefined
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

  const image = detail.image?.startsWith('http') ? detail.image : `${SITE_URL}${detail.image}`
  const price = detail.pricing?.salePrice ?? detail.pricing?.baseCost ?? 0
  const inStock = detail.availability?.status === 'in_stock' && detail.availability?.stockQuantity > 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: detail.name,
    image: image === `${SITE_URL}/file.svg` ? undefined : image,
    description: detail.description ?? detail.tagline ?? undefined,
    sku: detail.id,
    brand: {
      '@type': 'Brand',
      name: 'DDM+'
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/produits/${id}`,
      priceCurrency: detail.currency || 'FCFA',
      price: String(price),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      seller: {
        '@type': 'Organization',
        name: 'DDM+ Marketplace',
        url: SITE_URL
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketHeader />
      <main>
        <ProductDetailNew product={detail} similar={similar} />
      </main>
      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
