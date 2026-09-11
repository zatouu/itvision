'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import ScreenShop from '@/components/market/batch1/screens/ScreenShop'

interface VendorProduct {
  id: string
  name: string
  image: string
  price: number | null
  currency: string
  category?: string
  moq?: number
  basePrice?: number
  hasGroup?: boolean
  save?: number
}

interface VendorInfo {
  name: string
  slug: string
  verified: boolean
  rating: number | null
  productCount: number
  description?: string
  location?: string
  responseTime?: string
  onTimeRate?: number
  categories?: string[]
  type?: 'factory' | 'partner'
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || name.slice(0, 2).toUpperCase()
}

export default function VendorStorefrontPage() {
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''

  const [vendor, setVendor] = useState<VendorInfo | null>(null)
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    const fetchVendor = async () => {
      try {
        const res = await fetch(`/api/catalog/products?sellerSlug=${encodeURIComponent(slug)}&limit=100`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement')

        const items: VendorProduct[] = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.image || '/placeholder.svg',
          price: typeof p.price === 'number' ? p.price : 0,
          currency: p.currency || 'FCFA',
          category: p.category || p.cat,
          moq: p.minOrderQty ?? p.moq ?? 1,
          basePrice: p.basePrice ?? p.originalPrice,
          hasGroup: !!p.hasActiveGroup,
          save: p.discountPct,
        }))

        setProducts(items)

        const categories = Array.from(new Set(items.map((p) => p.category).filter(Boolean))) as string[]
        if (data.products?.length > 0) {
          const first = data.products[0]
          setVendor({
            name: first.sellerName || slug,
            slug,
            verified: !!first.sellerVerified,
            rating: typeof first.sellerRating === 'number' ? first.sellerRating : 0,
            productCount: data.total || items.length,
            description: first.sellerDescription,
            location: first.sellerLocation || 'Sénégal',
            responseTime: first.sellerResponseTime || '< 2h',
            onTimeRate: typeof first.sellerOnTimeRate === 'number' ? first.sellerOnTimeRate : 98,
            categories,
            type: first.sellerType === 'factory' ? 'factory' : 'partner',
          })
        } else {
          setVendor({
            name: slug,
            slug,
            verified: false,
            rating: 0,
            productCount: 0,
            categories,
            type: 'partner',
          })
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchVendor()
  }, [slug])

  const shop = useMemo(() => {
    if (!vendor) return null
    return {
      name: vendor.name,
      initials: getInitials(vendor.name),
      type: vendor.type || 'partner',
      verified: vendor.verified,
      rating: vendor.rating ?? 0,
      reviewCount: 0,
      yearsActive: 3,
      location: vendor.location || 'Sénégal',
      categories: vendor.categories?.length ? vendor.categories : ['Général'],
      description: vendor.description,
      responseTime: vendor.responseTime || '< 2h',
      onTimeRate: vendor.onTimeRate ?? 98,
      productCount: vendor.productCount,
    }
  }, [vendor])

  const screenProducts = useMemo(() =>
    products.map((p) => ({
      id: p.id,
      name: p.name,
      img: p.image,
      cat: p.category,
      price: p.price ?? 0,
      base: p.basePrice,
      moq: p.moq,
      hasGroup: p.hasGroup,
      save: p.save,
    })),
  [products])

  return (
    <ScreenShop
      shop={shop ?? { name: slug, initials: getInitials(slug), type: 'partner', verified: false, rating: 0, reviewCount: 0, yearsActive: 0, location: '', categories: [], productCount: 0 }}
      products={screenProducts}
      isLoading={loading}
      error={error ?? undefined}
    />
  )
}
