'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Star, Palette } from 'lucide-react'
import clsx from 'clsx'

interface ProductDimensions {
  lengthCm: number
  widthCm: number
  heightCm: number
}

interface ProductLogistics {
  weightKg: number | null
  packagingWeightKg: number | null
  volumeM3: number | null
  dimensions: ProductDimensions | null
}

interface ProductSourcing {
  platform?: string | null
  supplierName?: string | null
  supplierContact?: string | null
  productUrl?: string | null
  notes?: string | null
}

interface ProductTabsProps {
  description: string
  features: string[]
  logistics: ProductLogistics
  sourcing: ProductSourcing | null
  leadTimeDays: number | null
  selectedColor: string | null
  selectedVariant: string | null
  quantity: number
}

type TabId = 'description' | 'features' | 'logistics' | 'support' | 'reviews'

export default function ProductTabs({
  description,
  features,
  logistics,
  sourcing,
  leadTimeDays,
  selectedColor,
  selectedVariant,
  quantity
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('description')
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [averageRating, setAverageRating] = useState(4.7)

  const logisticsEntries = []
  if (leadTimeDays) {
    logisticsEntries.push({ label: 'Délai moyen Chine', value: `${leadTimeDays} jours` })
  }
  if (logistics.weightKg) {
    logisticsEntries.push({ label: 'Poids net', value: `${logistics.weightKg.toFixed(2)} kg` })
  }
  if (logistics.packagingWeightKg) {
    logisticsEntries.push({ label: 'Poids emballage', value: `${logistics.packagingWeightKg.toFixed(2)} kg` })
  }
  if (logistics.volumeM3) {
    logisticsEntries.push({ label: 'Volume', value: `${logistics.volumeM3.toFixed(3)} m³` })
  }
  if (logistics.dimensions) {
    const { lengthCm, widthCm, heightCm } = logistics.dimensions
    logisticsEntries.push({ label: 'Dimensions colis', value: `${lengthCm} × ${widthCm} × ${heightCm} cm` })
  }
  if (sourcing?.platform) {
    logisticsEntries.push({ label: 'Plateforme sourcing', value: sourcing.platform })
  }
  if (sourcing?.supplierName) {
    logisticsEntries.push({ label: 'Fournisseur', value: sourcing.supplierName })
  }
  if (sourcing?.supplierContact) {
    logisticsEntries.push({ label: 'Contact', value: sourcing.supplierContact })
  }

  const tabs = [
    { id: 'description' as const, label: 'Description', icon: '📝' },
    { id: 'features' as const, label: 'Points forts', icon: '✨' },
    { id: 'logistics' as const, label: 'Infos logistiques', icon: '📦' },
    { id: 'support' as const, label: 'Garantie & SAV', icon: '🛡️' },
    { id: 'reviews' as const, label: 'Avis clients', icon: '⭐' }
  ]

  // Charger les avis
  useEffect(() => {
    if (activeTab === 'reviews') {
      setReviewsLoading(true)
      setTimeout(() => {
        const mockReviews = [
          {
            id: '1',
            userName: 'Jean D.',
            rating: 5,
            title: 'Excellent produit',
            comment: 'Produit de très bonne qualité, livraison rapide et installation professionnelle. Je recommande !',
            verified: true,
            helpful: 12,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            userName: 'Marie L.',
            rating: 4,
            title: 'Très satisfait',
            comment: 'Bon rapport qualité/prix. Le support client est réactif et professionnel.',
            verified: true,
            helpful: 8,
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            userName: 'Pierre M.',
            rating: 5,
            title: 'Parfait',
            comment: 'Installation rapide, produit conforme à la description. Service impeccable.',
            verified: false,
            helpful: 5,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
        setReviews(mockReviews)
        const avg = mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length
        setAverageRating(avg)
        setReviewsLoading(false)
      }, 500)
    }
  }, [activeTab])

  return (
    <>
      {/* Section personnalisation avec glassmorphism */}
      <motion.section
        className="rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl p-6 hover:border-emerald-500/30 transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Palette className="h-6 w-6 text-emerald-400" />
            <span className="text-base font-bold text-slate-100">Personnalisez votre commande</span>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-full px-4 py-2">
            Choix : <span className="text-emerald-300 font-semibold">{selectedColor || '—'}</span> • <span className="text-emerald-300 font-semibold">{selectedVariant || 'Standard'}</span> • <span className="text-emerald-300 font-semibold">{quantity} unité(s)</span>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-300 leading-relaxed">
          Optimisez vos coûts en ajustant la couleur, le pack et le mode de transport. Nos conseillers recalculent ensuite la marge et les délais pour votre projet.
        </div>
      </motion.section>

      {/* Onglets avec glassmorphism */}
      <motion.section
        className="rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/50 px-6 pt-6 pb-4 bg-slate-900/30">
          {tabs.map((tab, idx) => (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-200 border border-emerald-400/40 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/70 text-slate-400 border border-transparent hover:border-emerald-400/30 hover:text-emerald-200 hover:bg-slate-800/70'
              )}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + idx * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </motion.button>
          ))}
        </div>
        
        <div className="px-6 pb-6 pt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-slate-300"
            >
              {activeTab === 'description' && (
                <p className="leading-relaxed whitespace-pre-line text-base">{description}</p>
              )}

              {activeTab === 'features' && (
                <ul className="space-y-3">
                  {(features.filter(Boolean).length > 0 ? features.filter(Boolean) : [
                    'Qualité professionnelle import Chine',
                    'Installation & support IT Vision Dakar',
                    'Tarification optimisée selon le mode de transport'
                  ]).map((item, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              )}

              {activeTab === 'logistics' && (
                <div className="space-y-5">
                  {logisticsEntries.length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold text-slate-200 mb-4">Spécifications techniques</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {logisticsEntries.map((entry, index) => (
                          <motion.div
                            key={index}
                            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm px-5 py-4 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold">{entry.label}</div>
                            <div className="text-base font-medium text-slate-100">{entry.value || '—'}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {logisticsEntries.length === 0 && (
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm px-5 py-8 text-center text-slate-400">
                      Informations logistiques détaillées disponibles sur demande.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'support' && (
                <ul className="space-y-3">
                  {[
                    'Garantie constructeur 12 mois (extensions possibles)',
                    'Assistance IT Vision 7j/7 sur Dakar & Sénégal',
                    'Maintenance préventive et curative disponible',
                    sourcing?.notes ? `Notes acheteur : ${sourcing.notes}` : 'Support import dédié Chine & Sénégal'
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Résumé des avis */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-slate-800/50">
                    <div className="text-center">
                      <motion.div
                        className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-400"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        {averageRating.toFixed(1)}
                      </motion.div>
                      <div className="flex items-center justify-center gap-1 mt-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={clsx(
                              'h-6 w-6 transition-all',
                              star <= Math.round(averageRating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-slate-600'
                            )}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-slate-400 mt-2">{reviews.length} avis</div>
                    </div>
                    
                    <div className="flex-1 space-y-2 w-full">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviews.filter(r => r.rating === rating).length
                        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 w-16">{rating} étoiles</span>
                            <div className="flex-1 h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, delay: rating * 0.1 }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-10 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Liste des avis */}
                  {reviewsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto"></div>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-base">Aucun avis pour le moment.</p>
                      <p className="text-sm mt-2">Soyez le premier à laisser un avis !</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review, idx) => (
                        <motion.div
                          key={review.id}
                          className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm p-5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-base font-bold text-white shadow-lg">
                                {review.userName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-100">{review.userName}</span>
                                  {review.verified && (
                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-medium rounded-full border border-emerald-500/30">
                                      Vérifié
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={clsx(
                                        'h-3.5 w-3.5',
                                        star <= review.rating
                                          ? 'text-yellow-400 fill-yellow-400'
                                          : 'text-slate-600'
                                      )}
                                    />
                                  ))}
                                  <span className="text-xs text-slate-400 ml-2">
                                    {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {review.title && (
                            <h4 className="text-base font-semibold text-slate-200 mb-2">{review.title}</h4>
                          )}
                          <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>
                          {review.helpful > 0 && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                              <span>👍 {review.helpful} personne{review.helpful > 1 ? 's' : ''} a trouvé cet avis utile</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>
    </>
  )
}
