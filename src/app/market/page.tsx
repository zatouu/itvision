'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import HeroCarousel from '@/components/home/HeroCarousel'
import CompactSearchBar from '@/components/home/CompactSearchBar'
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
    <main className="min-h-screen bg-white dark:bg-slate-950 pb-20 md:pb-0">
      {/* Hero + recherche + catégories icônes */}
      <HeroCarousel />

      <CompactSearchBar onOpenImageSearch={() => setShowImageSearch(true)} />

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
