import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import ProductValidated from '@/lib/models/Product.validated'
import CorporateProductDetailClient from '@/components/corporate/CorporateProductDetailClient'
import type { ProductDetailData } from '@/components/corporate/CorporateProductDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function getProduct(id: string) {
  try {
    await connectDB()
    const doc = await ProductValidated.findOne({ _id: id, isPublished: { $ne: false } })
      .select('name category description tagline image price b2bPrice currency features stockStatus stockQuantity brand weight dimensions model warranty leadTimeDays')
      .lean() as any
    return doc ?? null
  } catch {
    return null
  }
}

export default async function CorporateProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await getProduct(id)
  if (!doc) notFound()

  const stockStatus: string = doc.stockStatus || 'preorder'
  const stockQuantity: number = typeof doc.stockQuantity === 'number' ? doc.stockQuantity : 0
  const priceAmount: number | undefined =
    typeof doc.b2bPrice === 'number' && doc.b2bPrice > 0
      ? doc.b2bPrice
      : typeof doc.price === 'number' && doc.price > 0
        ? doc.price
        : undefined

  const inStock = stockStatus === 'in_stock'
  const outOfStock = stockStatus === 'out_of_stock'

  const stockLabel = inStock
    ? stockQuantity > 0 ? `${stockQuantity} en stock à Dakar` : 'Disponible à Dakar'
    : outOfStock ? 'Rupture temporaire' : 'Sur commande'

  const product: ProductDetailData = {
    id: String(doc._id),
    name: doc.name || 'Produit',
    category: doc.category || '',
    description: stripHtml(doc.description || doc.tagline || ''),
    tagline: doc.tagline || undefined,
    image: doc.image || undefined,
    features: Array.isArray(doc.features) ? doc.features.filter(Boolean) : [],
    stockStatus,
    stockQuantity,
    stockLabel,
    priceAmount,
    currency: doc.currency || 'FCFA',
    brand: doc.brand || undefined,
    weight: doc.weight ? String(doc.weight) : undefined,
    dimensions: doc.dimensions || undefined,
    model: doc.model || undefined,
    warranty: doc.warranty || undefined,
    availabilityLabel: stockLabel,
    inStock,
    outOfStock,
  }

  return <CorporateProductDetailClient product={product} />
}
