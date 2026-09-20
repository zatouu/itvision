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
  coverImage?: string
  isVerified: boolean
  country?: string
  city?: string
  categories?: string[]
  responseTimeHours?: number
  createdAt?: string
  socialWhatsApp?: string
  socialInstagram?: string
  socialFacebook?: string
  socialWebsite?: string
}

import type { SimilarShop } from '@/components/market/batch1/screens/ScreenShop'

interface ShopPageClientProps {
  shopId: string
  shopName: string
  shopSlug: string
  shopLogo?: string
  shopDescription?: string
  followers?: number
  similarShops?: SimilarShop[]
  shop?: ShopData
}

function formatResponseTime(hours?: number): string | undefined {
  if (hours == null || hours < 0) return undefined
  if (hours < 1) return '< 1h'
  if (hours < 24) return `< ${Math.ceil(hours)}h`
  return `< ${Math.ceil(hours / 24)}j`
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
  shopSlug,
  shopDescription,
  followers = 0,
  similarShops = [],
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
    logo: shop?.logo,
    coverImage: shop?.coverImage,
    rating: 0,
    reviewCount: 0,
    memberSince: shop?.createdAt ? new Date(shop.createdAt).getFullYear().toString() : undefined,
    location: shop?.city ? `${shop.city}, ${shop?.country || 'Sénégal'}` : (shop?.country || 'Sénégal'),
    responseTime: formatResponseTime(shop?.responseTimeHours),
    categories: categories.length ? categories : (shop?.categories ?? ['Général']),
    description: shopDescription || shop?.description,
    socials: {
      instagram: shop?.socialInstagram,
      facebook: shop?.socialFacebook,
      website: shop?.socialWebsite,
    },
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

  const whatsappUrl = shop?.socialWhatsApp
    ? `https://wa.me/${shop.socialWhatsApp.replace(/\D/g, '')}`
    : undefined

  return (
    <ScreenShop
      shop={shopData}
      products={products}
      contactWhatsApp={whatsappUrl}
      shopSlug={shopSlug}
      shopId={shopId}
      followers={followers}
      similarShops={similarShops}
    />
  )
}
