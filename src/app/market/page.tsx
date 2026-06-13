'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import HeroSection from '@/components/home/HeroSection'
import CategoryPills1688 from '@/components/home/CategoryPills1688'
import GroupBuySection from '@/components/home/GroupBuySection'
import ProductGrid1688 from '@/components/home/ProductGrid1688'
import TrustBadges from '@/components/home/TrustBadges'
import PartnerBrands from '@/components/home/PartnerBrands'
import SourcingOnDemand from '@/components/home/SourcingOnDemand'
import PromoBanner from '@/components/home/PromoBanner'
import ImageSearchModal from '@/components/ImageSearchModal'
import SourcingRequestModal from '@/components/SourcingRequestModal'

export default function MarketHomePage() {
  const router = useRouter()
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [imageSearchIds, setImageSearchIds] = useState<string[]>([])
  const [showSourcing, setShowSourcing] = useState(false)
  const [sourcingContext, setSourcingContext] = useState<{ file?: File | null; description?: string } | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; phone?: string; email?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/login', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.user) return
        setCurrentUser({
          id: data.user.id,
          name: data.user.name || data.user.username,
          phone: data.user.phone,
          email: data.user.email,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero Alibaba-style */}
      <HeroSection
        onOpenImageSearch={() => setShowImageSearch(true)}
        onOpenSourcing={() => setShowSourcing(true)}
      />

      {/* 2. Categories 1688-style */}
      <CategoryPills1688 />

      {/* 3. Promo Banner Slider */}
      <PromoBanner />

      {/* 4. Group Buy — real products */}
      <GroupBuySection />

      {/* 5. Trending products */}
      <ProductGrid1688
        title="Produits populaires"
        subtitle="Les plus commandés cette semaine"
        endpoint="/api/catalog/products"
        limit={8}
      />

      {/* 6. Trust badges */}
      <TrustBadges />

      {/* 7. New arrivals */}
      <ProductGrid1688
        title="Nouveaux arrivages"
        subtitle="Derniers produits ajoutés au catalogue"
        endpoint="/api/catalog/products"
        limit={8}
      />

      {/* 8. Partner brands */}
      <PartnerBrands />

      {/* 9. Sourcing on demand */}
      <SourcingOnDemand
        onOpenImageSearch={() => setShowImageSearch(true)}
        onOpenSourcing={() => setShowSourcing(true)}
      />

      {/* Modals */}
      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
        onResultsFound={(results) => {
          const ids = results.map((r) => r.id)
          if (ids.length > 0) {
            setImageSearchIds(ids)
            router.push(`/produits?imageIds=${ids.join(',')}`)
          }
          setShowImageSearch(false)
        }}
        onRequestSourcing={(ctx) => {
          setSourcingContext(ctx)
          setShowImageSearch(false)
          setShowSourcing(true)
        }}
      />

      <SourcingRequestModal
        isOpen={showSourcing}
        onClose={() => {
          setShowSourcing(false)
          setSourcingContext(null)
        }}
        currentUser={currentUser}
        initialContext={sourcingContext}
      />
    </main>
  )
}
