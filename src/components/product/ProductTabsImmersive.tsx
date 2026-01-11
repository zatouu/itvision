'use client'

import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Cpu,
  Layers,
  Target,
  MessageSquare,
  Star,
  Camera,
  ChevronRight
} from 'lucide-react'
import ProductRichContent, { type SpecGroup, type UsageScenario } from './ProductRichContent'
import ProductReviewsWithMedia, { type Review, type NewReviewData } from './ProductReviewsWithMedia'

// ============================================================================
// TYPES
// ============================================================================

export type ProductTabId = 'description' | 'specs' | 'usage' | 'reviews'

export interface ProductTabsImmersiveProps {
  /** Description du produit */
  description?: string | null
  /** Caractéristiques */
  features?: string[]
  /** Groupes de spécifications */
  specGroups?: SpecGroup[]
  /** Scénarios d'utilisation */
  scenarios?: UsageScenario[]
  /** Images rich content (type 1688) */
  richImages?: string[]
  /** URL vidéo produit */
  videoUrl?: string
  /** URL fiche technique PDF */
  datasheetUrl?: string
  /** Avis clients */
  reviews?: Review[]
  /** Note moyenne */
  averageRating?: number
  /** Distribution des notes */
  ratingDistribution?: { [key: number]: number }
  /** Nombre total d'avis */
  totalReviews?: number
  /** ID du produit (pour les avis) */
  productId: string
  /** Callback charger plus d'avis */
  onLoadMoreReviews?: () => Promise<void>
  /** Callback soumettre avis */
  onSubmitReview?: (data: NewReviewData) => Promise<void>
  /** Callback marquer utile */
  onMarkHelpful?: (reviewId: string, helpful: boolean) => Promise<void>
  /** L'utilisateur peut laisser un avis */
  canReview?: boolean
  /** L'utilisateur a déjà laissé un avis */
  hasReviewed?: boolean
  /** Onglet actif initial */
  defaultTab?: ProductTabId
  /** Sticky tabs */
  stickyTabs?: boolean
  /** Classe CSS */
  className?: string
}

// ============================================================================
// CONFIGURATION DES ONGLETS
// ============================================================================

interface TabConfig {
  id: ProductTabId
  label: string
  shortLabel: string
  icon: React.ElementType
  badge?: string | number
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ProductTabsImmersive({
  description,
  features = [],
  specGroups = [],
  scenarios = [],
  richImages = [],
  videoUrl,
  datasheetUrl,
  reviews = [],
  averageRating = 0,
  ratingDistribution = {},
  totalReviews = 0,
  productId,
  onLoadMoreReviews,
  onSubmitReview,
  onMarkHelpful,
  canReview = true,
  hasReviewed = false,
  defaultTab = 'description',
  stickyTabs = true,
  className
}: ProductTabsImmersiveProps) {
  const [activeTab, setActiveTab] = useState<ProductTabId>(defaultTab)
  const [isSticky, setIsSticky] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Compter les médias dans les avis
  const mediaReviewsCount = reviews.filter((r) => r.media && r.media.length > 0).length

  // Configuration des onglets
  const tabs: TabConfig[] = [
    { id: 'description', label: 'Description', shortLabel: 'Description', icon: FileText },
    { id: 'specs', label: 'Caractéristiques', shortLabel: 'Specs', icon: Cpu },
    { id: 'usage', label: 'Utilisation', shortLabel: 'Usage', icon: Target },
    {
      id: 'reviews',
      label: 'Avis clients',
      shortLabel: 'Avis',
      icon: MessageSquare,
      badge: totalReviews > 0 ? totalReviews : undefined
    }
  ]

  // Handle sticky behavior
  useEffect(() => {
    if (!stickyTabs || !tabsRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    )

    observer.observe(tabsRef.current)
    return () => observer.disconnect()
  }, [stickyTabs])

  // Scroll to content on tab change
  const handleTabChange = (tabId: ProductTabId) => {
    setActiveTab(tabId)
    // Smooth scroll to content if not in view
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      if (rect.top < 0) {
        contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <div className={clsx('', className)}>
      {/* Tabs navigation */}
      <div ref={tabsRef} className="relative">
        {/* Spacer for sticky */}
        {stickyTabs && isSticky && <div className="h-14" />}

        <div
          className={clsx(
            'bg-white border-b border-gray-200 transition-shadow z-30',
            stickyTabs && isSticky && 'fixed top-16 left-0 right-0 shadow-md'
          )}
        >
          <div className={clsx('max-w-7xl mx-auto', stickyTabs && isSticky && 'px-4')}>
            <nav className="flex overflow-x-auto scrollbar-hide -mb-px">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={clsx(
                      'relative flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                      isActive
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    {tab.badge && (
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-semibold',
                          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                    {tab.id === 'reviews' && averageRating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {averageRating.toFixed(1)}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div ref={contentRef} className="pt-6">
        <AnimatePresence mode="wait">
          {/* Description tab */}
          {activeTab === 'description' && (
            <motion.div
              key="description"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Text description */}
              {description && (
                <div className="mb-8">
                  <div
                    className="prose prose-emerald max-w-none text-gray-600"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                </div>
              )}

              {/* Rich content */}
              <ProductRichContent
                blocks={[]}
                features={features}
                richImages={richImages}
                videoUrl={videoUrl}
                datasheetUrl={datasheetUrl}
              />

              {/* Empty state */}
              {!description && features.length === 0 && richImages.length === 0 && !videoUrl && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    Description détaillée disponible sur demande
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Specs tab */}
          {activeTab === 'specs' && (
            <motion.div
              key="specs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProductRichContent
                blocks={[]}
                specGroups={specGroups}
                datasheetUrl={datasheetUrl}
              />

              {specGroups.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <Cpu className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    Caractéristiques techniques disponibles sur demande
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Usage tab */}
          {activeTab === 'usage' && (
            <motion.div
              key="usage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProductRichContent blocks={[]} scenarios={scenarios} />

              {scenarios.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    Cas d'utilisation disponibles prochainement
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Reviews tab */}
          {activeTab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProductReviewsWithMedia
                productId={productId}
                reviews={reviews}
                averageRating={averageRating}
                ratingDistribution={ratingDistribution}
                totalReviews={totalReviews}
                onLoadMore={onLoadMoreReviews}
                onSubmitReview={onSubmitReview}
                onMarkHelpful={onMarkHelpful}
                canReview={canReview}
                hasReviewed={hasReviewed}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reviews teaser (shown on other tabs) */}
      {activeTab !== 'reviews' && totalReviews > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={clsx(
                      'w-5 h-5',
                      averageRating >= star ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
                    )}
                  />
                ))}
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm ml-2">({totalReviews} avis)</span>
              </div>
              {mediaReviewsCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  <Camera className="w-4 h-4" />
                  {mediaReviewsCount} avec photos/vidéos
                </span>
              )}
            </div>
            <button
              onClick={() => setActiveTab('reviews')}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition"
            >
              Voir tous les avis
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
