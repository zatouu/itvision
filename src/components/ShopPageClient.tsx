'use client'

import { useEffect, useState, useMemo } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import ScreenShop from '@/components/market/batch1/screens/ScreenShop'

interface ProductItem {
  id: string
  name: string
  slug?: string
  category?: string
  image?: string
  price: number | null
  currency: string
  stockStatus?: string
  stockQuantity?: number
  moq?: number
  basePrice?: number
  hasGroup?: boolean
  save?: number
  isFeatured?: boolean
}

interface ShopData {
  name: string
  description?: string
  logo?: string
  isVerified: boolean
  country?: string
  city?: string
  categories?: string[]
  socialWhatsApp?: string
}

interface ShopPageClientProps {
  shopId: string
  shopName: string
  shopSlug: string
  shopLogo?: string
  shopDescription?: string
  shop?: ShopData
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || name.slice(0, 2).toUpperCase()
}

export default function ShopPageClient({
  shopId,
  shopName,
  shopDescription,
  shop,
}: ShopPageClientProps) {
  const [items, setItems] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/shops/${shopId}/products?page=1&limit=100`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur')
        setItems(data.items || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [shopId])

  const products = useMemo(() =>
    items.map((it) => ({
      id: it.id,
      name: it.name,
      img: it.image || '/placeholder.svg',
      cat: it.category,
      price: typeof it.price === 'number' ? it.price : 0,
      moq: it.moq ?? 1,
      base: it.basePrice,
      hasGroup: it.hasGroup ?? false,
      save: it.save ?? 0,
    })),
  [items])

  const categories = useMemo(() =>
    Array.from(new Set(items.map((p) => p.category).filter(Boolean))) as string[],
  [items])

  const shopData = useMemo(() => ({
    name: shopName,
    initials: getInitials(shopName),
    type: 'partner' as const,
    verified: shop?.isVerified ?? false,
    rating: 0,
    reviewCount: 0,
    yearsActive: 3,
    location: shop?.city ? `${shop.city}, ${shop?.country || 'Sénégal'}` : (shop?.country || 'Sénégal'),
    categories: categories.length ? categories : (shop?.categories ?? ['Général']),
    description: shopDescription || shop?.description,
    responseTime: '< 2h',
    onTimeRate: 98,
    productCount: items.length,
  }), [shopName, shop, shopDescription, categories, items.length])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Erreur</h1>
        <p className="text-slate-600 dark:text-slate-400">{error}</p>
      </div>
    )
  }

  return <ScreenShop shop={shopData} products={products} contactWhatsApp={shop?.socialWhatsApp} />
}
