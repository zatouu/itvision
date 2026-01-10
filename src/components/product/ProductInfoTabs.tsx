'use client'

import { useState, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  Loader2,
  Star,
  Package,
  FileText,
  Truck,
  ShieldCheck,
  MessageSquare
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export type InfoTabId = 'description' | 'features' | 'logistics' | 'support' | 'reviews'

export interface LogisticsEntry {
  label: string
  value: string | null
}

export interface Review {
  id: string
  userName: string
  rating: number
  title?: string
  comment: string
  verified?: boolean
  helpful?: number
  createdAt: string
}

export interface ProductInfoTabsProps {
  /** Description HTML du produit */
  description?: string | null
  /** Liste des caractéristiques */
  features?: string[]
  /** Entrées logistiques à afficher */
  logisticsEntries?: LogisticsEntry[]
  /** Avis clients (optionnel, peut être chargé dynamiquement) */
  reviews?: Review[]
  /** Callback pour charger les avis */
  onLoadReviews?: () => Promise<Review[]>
  /** Note moyenne */
  averageRating?: number
  /** Onglet actif initial */
  defaultTab?: InfoTabId
  /** Callback lors du changement d'onglet */
  onTabChange?: (tab: InfoTabId) => void
  /** Classe CSS additionnelle */
  className?: string
}

// ============================================================================
// CONFIGURATION DES ONGLETS
// ============================================================================

interface TabConfig {
  id: InfoTabId
  label: string
  icon: React.ElementType
}

const TABS: TabConfig[] = [
  { id: 'description', label: 'Description', icon: FileText },
  { id: 'features', label: 'Caractéristiques', icon: CheckCircle },
  { id: 'logistics', label: 'Logistique', icon: Truck },
  { id: 'support', label: 'Garantie & SAV', icon: ShieldCheck },
  { id: 'reviews', label: 'Avis clients', icon: MessageSquare }
]

const FALLBACK_FEATURES = [
  'Qualité professionnelle import Chine',
  'Installation & support IT Vision Dakar',
  'Tarification optimisée selon le mode de transport'
]

const SUPPORT_ITEMS = [
  'Garantie constructeur 12 mois (extensions possibles)',
  'Assistance IT Vision 7j/7 sur Dakar & Sénégal',
  'Maintenance préventive et curative disponible',
  'Support import dédié & livraison sécurisée'
]

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function DescriptionTab({ description }: { description?: string | null }) {
  if (!description) {
    return (
      <p className="text-gray-500 italic">
        Description détaillée disponible sur demande auprès de nos équipes sourcing.
      </p>
    )
  }

  return (
    <div
      className="prose prose-emerald max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-800"
      dangerouslySetInnerHTML={{ __html: description }}
    />
  )
}

function FeaturesTab({ features }: { features?: string[] }) {
  const displayFeatures = features?.filter(Boolean).length
    ? features.filter(Boolean)
    : FALLBACK_FEATURES

  return (
    <ul className="space-y-3">
      {displayFeatures.map((feature, index) => (
        <li key={index} className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <span className="text-gray-700">{feature}</span>
        </li>
      ))}
    </ul>
  )
}

function LogisticsTab({ entries }: { entries?: LogisticsEntry[] }) {
  if (!entries || entries.length === 0) {
    return (
      <p className="text-gray-600 text-center py-8">
        Informations logistiques détaillées disponibles sur demande.
      </p>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Spécifications techniques
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200"
          >
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {entry.label}
            </div>
            <div className="text-base font-semibold text-gray-900">
              {entry.value || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SupportTab() {
  return (
    <ul className="space-y-3">
      {SUPPORT_ITEMS.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <span className="text-gray-700">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ReviewsTab({
  reviews,
  averageRating,
  loading
}: {
  reviews: Review[]
  averageRating: number
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucun avis pour le moment.</p>
        <p className="text-sm text-gray-500 mt-2">
          Soyez le premier à laisser un avis !
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Résumé avec note moyenne */}
      <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
        <div className="text-center">
          <div className="text-5xl font-bold text-emerald-600">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={clsx(
                  'h-5 w-5',
                  star <= Math.round(averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                )}
              />
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {reviews.length} avis
          </div>
        </div>
      </div>

      {/* Liste des avis */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-gray-50 rounded-xl p-6 border border-gray-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white">
                  {review.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {review.userName}
                    </span>
                    {review.verified && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                        Vérifié
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={clsx(
                          'h-3 w-3',
                          star <= review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(review.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
            {review.title && (
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                {review.title}
              </h4>
            )}
            <p className="text-gray-700 leading-relaxed">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ProductInfoTabs({
  description,
  features,
  logisticsEntries,
  reviews: initialReviews,
  onLoadReviews,
  averageRating: initialAvgRating,
  defaultTab = 'description',
  onTabChange,
  className
}: ProductInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<InfoTabId>(defaultTab)
  const [reviews, setReviews] = useState<Review[]>(initialReviews || [])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [averageRating, setAverageRating] = useState(initialAvgRating || 0)

  // Gérer le changement d'onglet
  const handleTabChange = (tab: InfoTabId) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  // Charger les avis quand l'onglet est sélectionné
  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0 && onLoadReviews) {
      setReviewsLoading(true)
      onLoadReviews()
        .then((loadedReviews) => {
          setReviews(loadedReviews)
          if (loadedReviews.length > 0) {
            const avg =
              loadedReviews.reduce((sum, r) => sum + r.rating, 0) /
              loadedReviews.length
            setAverageRating(avg)
          }
        })
        .catch(console.error)
        .finally(() => setReviewsLoading(false))
    }
  }, [activeTab, reviews.length, onLoadReviews])

  // Mock data pour les avis si pas de callback fourni
  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0 && !onLoadReviews) {
      setReviewsLoading(true)
      // Simuler un chargement
      setTimeout(() => {
        const mockReviews: Review[] = [
          {
            id: '1',
            userName: 'Jean D.',
            rating: 5,
            title: 'Excellent produit',
            comment:
              'Produit de très bonne qualité, livraison rapide et installation professionnelle. Je recommande !',
            verified: true,
            helpful: 12,
            createdAt: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000
            ).toISOString()
          },
          {
            id: '2',
            userName: 'Marie L.',
            rating: 4,
            title: 'Très satisfait',
            comment:
              'Bon rapport qualité/prix. Le support client est réactif et professionnel.',
            verified: true,
            helpful: 8,
            createdAt: new Date(
              Date.now() - 10 * 24 * 60 * 60 * 1000
            ).toISOString()
          }
        ]
        setReviews(mockReviews)
        const avg =
          mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length
        setAverageRating(avg)
        setReviewsLoading(false)
      }, 500)
    }
  }, [activeTab, reviews.length, onLoadReviews])

  return (
    <div className={className}>
      {/* Navigation des onglets */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 hidden sm:block" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenu des onglets */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'description' && (
            <motion.div
              key="description"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DescriptionTab description={description} />
            </motion.div>
          )}

          {activeTab === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FeaturesTab features={features} />
            </motion.div>
          )}

          {activeTab === 'logistics' && (
            <motion.div
              key="logistics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LogisticsTab entries={logisticsEntries} />
            </motion.div>
          )}

          {activeTab === 'support' && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SupportTab />
            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ReviewsTab
                reviews={reviews}
                averageRating={averageRating}
                loading={reviewsLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
