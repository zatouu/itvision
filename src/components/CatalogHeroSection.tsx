'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, TrendingDown, Zap, Search, Filter, Star, Clock, ChevronRight, Target, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GroupBuyFeatured {
  _id: string
  groupId: string
  product: {
    productId: string
    name: string
    image?: string
    basePrice: number
    currency: string
  }
  currentQty: number
  targetQty: number
  currentUnitPrice: number
  deadline: string
}

interface CatalogStats {
  totalProducts: number
  activeGroupBuys: number
  totalParticipants: number
  averageSavings: number
}

export default function CatalogHeroSection({ onSearch }: { onSearch?: (term: string) => void }) {
  const [featuredGroups, setFeaturedGroups] = useState<GroupBuyFeatured[]>([])
  const [stats, setStats] = useState<CatalogStats>({
    totalProducts: 0,
    activeGroupBuys: 0,
    totalParticipants: 0,
    averageSavings: 0
  })
  const [currentSlide, setCurrentSlide] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/group-orders/active')
        if (res.ok) {
          const responseData = await res.json()
          // L'API retourne { success: true, groups: [...] } ou directement un array
          const data = responseData.groups || responseData || []
          setFeaturedGroups(Array.isArray(data) ? data.slice(0, 3) : [])
          
          // Calcul des stats
          const groupsArray = Array.isArray(data) ? data : []
          const totalParticipants = groupsArray.reduce((sum: number, g: any) => sum + (g.currentQty || 0), 0)
          const avgSavings = groupsArray.length > 0 
            ? groupsArray.reduce((sum: number, g: any) => {
                const basePrice = g.product?.basePrice || g.basePrice || 0
                const currentPrice = g.currentUnitPrice || g.currentPrice || basePrice
                const saving = basePrice > 0 ? ((basePrice - currentPrice) / basePrice) * 100 : 0
                return sum + saving
              }, 0) / groupsArray.length
            : 0

          setStats({
            totalProducts: 150, // TODO: API pour compter produits
            activeGroupBuys: groupsArray.length,
            totalParticipants,
            averageSavings: Math.round(avgSavings)
          })
        }
      } catch (err) {
        console.error('Erreur:', err)
      }
    }

    fetchData()
    
    // Auto-slide
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 3)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'FCFA' ? 'XOF' : currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calcProgress = (current: number, target: number) => Math.min((current / target) * 100, 100)
  const calcSavings = (base: number, current: number) => Math.round(((base - current) / base) * 100)
  
  const calcTimeLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    if (diff <= 0) return 'Expiré'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return days > 0 ? `${days}j` : `${hours}h`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && searchTerm) {
      onSearch(searchTerm)
    }
  }

  return (
    <section className="relative bg-gradient-to-br from-white via-purple-50/20 to-blue-50/30 page-content pt-20 pb-12 mt-16 overflow-hidden">
      {/* Effets décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Colonne gauche - Titre + Stats + Recherche */}
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="h-4 w-4" />
              Catalogue Professionnel
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              Nos <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">Produits</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-6">
              Hikvision, Dahua, Uniview. Import direct Chine pour qualité/prix imbattable.
            </p>

            {/* Stats en temps réel */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-lg p-3 shadow-md border border-gray-100 text-center"
              >
                <div className="text-2xl font-bold text-emerald-600">{stats.totalProducts}+</div>
                <div className="text-xs text-gray-600">Produits</div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-lg p-3 shadow-md border border-purple-100 text-center"
              >
                <div className="text-2xl font-bold text-purple-600">{stats.activeGroupBuys}</div>
                <div className="text-xs text-gray-600">Groupes actifs</div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-lg p-3 shadow-md border border-blue-100 text-center"
              >
                <div className="text-2xl font-bold text-blue-600">{stats.totalParticipants}</div>
                <div className="text-xs text-gray-600">Acheteurs</div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-lg p-3 shadow-md border border-emerald-100 text-center"
              >
                <div className="text-2xl font-bold text-emerald-600">-{stats.averageSavings}%</div>
                <div className="text-xs text-gray-600">Économie moy.</div>
              </motion.div>
            </div>

            {/* Barre de recherche améliorée */}
            <form onSubmit={handleSearch} className="relative mb-6">
              <input
                type="text"
                placeholder="Rechercher un produit, marque, référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all shadow-sm text-gray-900 placeholder-gray-400"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2.5 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>

            {/* Filtres rapides */}
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-white border border-purple-200 rounded-lg text-sm font-medium text-gray-700 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Achats groupés
              </button>
              <button className="px-4 py-2 bg-white border border-emerald-200 rounded-lg text-sm font-medium text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                Nouveautés
              </button>
              <button className="px-4 py-2 bg-white border border-orange-200 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center gap-2">
                <Star className="w-4 h-4 text-orange-600" />
                Best sellers
              </button>
            </div>
          </div>

          {/* Colonne droite - Carousel achats groupés */}
          <div className="relative">
            {featuredGroups.length > 0 ? (
              <div className="relative h-80">
                <AnimatePresence mode="wait">
                  {featuredGroups.map((group, index) => {
                    if (index !== currentSlide) return null
                    
                    const progress = calcProgress(group.currentQty, group.targetQty)
                    const savings = calcSavings(group.product.basePrice, group.currentUnitPrice)
                    const timeLeft = calcTimeLeft(group.deadline)
                    const isUrgent = progress >= 70

                    return (
                      <motion.div
                        key={group._id}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                      >
                        <Link href={`/achats-groupes/${group.groupId}`}>
                          <div className="h-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-6 text-white cursor-pointer hover:scale-[1.02] transition-transform">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-5 h-5" />
                                  <span className="text-sm font-semibold uppercase tracking-wide">Achat Groupé</span>
                                </div>
                                <h3 className="text-2xl font-bold line-clamp-2 mb-2">{group.product.name}</h3>
                              </div>
                              {savings > 0 && (
                                <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse">
                                  <TrendingDown className="w-4 h-4" />
                                  -{savings}%
                                </div>
                              )}
                            </div>

                            {/* Prix */}
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm opacity-90">Prix actuel</div>
                                  <div className="text-3xl font-black">
                                    {formatPrice(group.currentUnitPrice, group.product.currency)}
                                  </div>
                                </div>
                                {savings > 0 && (
                                  <div className="text-right">
                                    <div className="text-sm opacity-75 line-through">
                                      {formatPrice(group.product.basePrice, group.product.currency)}
                                    </div>
                                    <div className="text-emerald-300 font-semibold text-sm">
                                      Économie: {formatPrice(group.product.basePrice - group.currentUnitPrice, group.product.currency)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Progression */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  {group.currentQty}/{group.targetQty} unités
                                </span>
                                <span className="font-bold">{Math.round(progress)}%</span>
                              </div>
                              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 1 }}
                                  className={`h-full rounded-full ${
                                    isUrgent 
                                      ? 'bg-gradient-to-r from-orange-400 to-red-400' 
                                      : 'bg-gradient-to-r from-emerald-400 to-green-400'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">Expire dans {timeLeft}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                                <span className="font-bold text-sm">Rejoindre</span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {/* Indicateurs de slide */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {featuredGroups.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlide 
                          ? 'w-8 bg-purple-600' 
                          : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Cartes CTA engageantes quand pas d'achat groupé actif */
              <div className="flex flex-col gap-3 h-80">
                {/* Carte principale - Proposer un achat groupé */}
                <Link href="/achats-groupes" className="flex-1">
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -3 }}
                    className="h-full bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white cursor-pointer shadow-xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">Lancez un Achat Groupé</h3>
                        <p className="text-sm text-white/80">Économisez jusqu'à 40% en achetant ensemble</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold bg-white/20 rounded-lg px-4 py-2 w-fit">
                        <span>Proposer un produit</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                </Link>

                {/* 3 petites cartes alignées horizontalement */}
                <div className="grid grid-cols-3 gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 text-white shadow-lg cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-2">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-sm">Prix dégressifs</div>
                      <div className="text-[10px] text-white/80 leading-tight">Plus nombreux = moins cher</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-3 text-white shadow-lg cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-2">
                        <Target className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-sm">Objectif commun</div>
                      <div className="text-[10px] text-white/80 leading-tight">Quota atteint ensemble</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-3 text-white shadow-lg cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-2">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-sm">Import direct</div>
                      <div className="text-[10px] text-white/80 leading-tight">Livraison optimisée</div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
