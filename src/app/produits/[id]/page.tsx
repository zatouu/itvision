import type { Metadata } from 'next'
import mongoose from 'mongoose'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductDetailExperience from '@/components/ProductDetailExperience'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { formatProductDetail, formatSimilarProducts } from '@/lib/catalog-format'

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id)

const fetchProductById = async (id: string) => {
  if (!isValidId(id)) return null
  await connectMongoose()
  return Product.findById(id).lean()
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
      title: 'Produit introuvable | Catalogue IT Vision',
      description: 'Ce produit n’est plus disponible dans le catalogue.'
    }
  }

  const detail = formatProductDetail(product)
  const title = `${detail.name} | Catalogue IT Vision`
  const description = detail.tagline || detail.description || 'Catalogue import Chine & disponibilité Dakar - IT Vision'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: detail.image ? [{ url: detail.image, width: 1200, height: 630, alt: detail.name }] : undefined
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
  const detail = formatProductDetail(product)
  const similar = formatSimilarProducts(similarRaw)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-[120px] bg-gradient-to-b from-gray-50 to-white">
        <ProductDetailExperience product={detail} similar={similar} />
      </main>
      <Footer />
    </div>
  )
}
