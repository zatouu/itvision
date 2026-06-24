'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import HeroCarousel from '@/components/home/HeroCarousel'
import CompactSearchBar from '@/components/home/CompactSearchBar'
import QuickCategoriesGrid from '@/components/home/QuickCategoriesGrid'
import FeatureBanners from '@/components/home/FeatureBanners'
import FlashSaleSection from '@/components/home/FlashSaleSection'
import GroupBuySection from '@/components/home/GroupBuySection'
import PopularProducts from '@/components/home/PopularProducts'
import CategoryShowcase from '@/components/home/CategoryShowcase'
import FinalCTABanner from '@/components/home/FinalCTABanner'
import NewArrivals from '@/components/home/NewArrivals'
import SourcingOnDemand from '@/components/home/SourcingOnDemand'
import TrustBadges from '@/components/home/TrustBadges'
import SocialProofSection from '@/components/home/SocialProofSection'
import ImageSearchModal from '@/components/ImageSearchModal'
import SourcingRequestModal from '@/components/SourcingRequestModal'

export default function MarketHomePage() {
  const router = useRouter()
  const [showImageSearch, setShowImageSearch] = useState(false)
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
    <main className="min-h-screen bg-white pb-20 md:pb-0">
      {/* 1. Hero Carousel en premier (full width) */}
      <HeroCarousel />

      {/* 2. Search bar compacte centrée */}
      <CompactSearchBar onOpenImageSearch={() => setShowImageSearch(true)} />

      {/* 3. Grille catégories rapides (12 icônes) */}
      <QuickCategoriesGrid />

      {/* 4. Badges de confiance */}
      <TrustBadges />

      {/* 5. Flash Sale */}
      <FlashSaleSection />

      {/* 6. Achats groupés actifs */}
      <GroupBuySection />

      {/* 7. Nouveautés */}
      <NewArrivals />

      {/* 8. Produits populaires multi-cat */}
      <PopularProducts />

      {/* 9. Sourcing à la demande */}
      <SourcingOnDemand
        onOpenImageSearch={() => setShowImageSearch(true)}
        onOpenSourcing={() => setShowSourcing(true)}
      />

      {/* 10. Categories showcase (6 grands blocs) */}
      <CategoryShowcase />

      {/* 11. Témoignages & preuve sociale */}
      <SocialProofSection />

      {/* 12. CTA final */}
      <FinalCTABanner />

      {/* Modals */}
      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
        onResultsFound={(results) => {
          const ids = results.map((r) => r.id)
          if (ids.length > 0) {
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
