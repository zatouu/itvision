'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Clock, TrendingDown, ArrowRight, Zap, Target } from 'lucide-react'
import { motion } from 'framer-motion'

interface GroupBuy {
  _id: string
  groupId: string
  product: {
    productId: string
    name: string
    image?: string
    basePrice: number
    currency: string
  }
  status: string
  currentQty: number
  minQty: number
  targetQty: number
  currentUnitPrice: number
  deadline: string
  participantsCount: number
  priceTiers?: Array<{
    minQty: number
    price: number
    discount?: number
  }>
}

export default function ActiveGroupBuysSection() {
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActiveGroupBuys = async () => {
      try {
        const res = await fetch('/api/group-orders/active')
        if (res.ok) {
          const data = await res.json()
          setGroupBuys(data.slice(0, 3)) // Limit à 3 pour homepage
        }
      } catch (err) {
        console.error('Erreur chargement achats groupés:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActiveGroupBuys()
  }, [])

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                🎯 Économies Collectives
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Achats Groupés <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">en Cours</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!groupBuys.length) {
    return null // Ne rien afficher si pas de groupes actifs
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'FCFA' ? 'XOF' : currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const calculateTimeLeft = (deadline: string) => {
    const now = new Date().getTime()
    const end = new Date(deadline).getTime()
    const diff = end - now

    if (diff <= 0) return 'Expiré'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}j ${hours}h`
    return `${hours}h restantes`
  }

  const calculateSavings = (basePrice: number, currentPrice: number) => {
    const savingsPercent = Math.round(((basePrice - currentPrice) / basePrice) * 100)
    return savingsPercent > 0 ? savingsPercent : 0
  }

  return (
    <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              🎯 Économies Collectives
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Achats Groupés <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">en Cours</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Rejoignez des groupes d'achat pour bénéficier de prix dégressifs. Plus on est nombreux, plus on économise !
          </p>
        </div>

        {/* Grid des achats groupés */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {groupBuys.map((group, index) => {
            const progress = calculateProgress(group.currentQty, group.targetQty)
            const timeLeft = calculateTimeLeft(group.deadline)
            const savings = calculateSavings(group.product.basePrice, group.currentUnitPrice)
            const isFilling = progress >= 70

            return (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/achats-groupes/${group.groupId}`}>
                  <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-purple-300 cursor-pointer h-full">
                    {/* Badge économie - top right */}
                    {savings > 0 && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          -{savings}%
                        </div>
                      </div>
                    )}

                    {/* Badge urgence si proche de la fin */}
                    {isFilling && (
                      <div className="absolute top-4 left-4 z-10">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
                          <Zap className="w-3 h-3" />
                          Bientôt complet
                        </div>
                      </div>
                    )}

                    {/* Image produit */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {group.product.image ? (
                        <img
                          src={group.product.image}
                          alt={group.product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    </div>

                    {/* Contenu */}
                    <div className="p-5">
                      {/* Titre produit */}
                      <h3 className="font-bold text-gray-900 text-lg mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors min-h-[3.5rem]">
                        {group.product.name}
                      </h3>

                      {/* Prix avec économie */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {formatCurrency(group.currentUnitPrice, group.product.currency)}
                          </div>
                          {savings > 0 && (
                            <div className="text-xs text-gray-500 line-through">
                              {formatCurrency(group.product.basePrice, group.product.currency)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">par unité</div>
                        </div>
                      </div>

                      {/* Progression */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                          <span className="font-medium flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {group.currentQty}/{group.targetQty} unités
                          </span>
                          <span className="font-bold text-purple-700">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`absolute top-0 left-0 h-full rounded-full ${
                              isFilling
                                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                : 'bg-gradient-to-r from-purple-500 to-blue-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Participants et deadline */}
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          <span>{group.participantsCount || 0} participant{(group.participantsCount || 0) > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-orange-600" />
                          <span className="font-medium text-orange-600">{timeLeft}</span>
                        </div>
                      </div>

                      {/* CTA */}
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-xl group-hover:scale-[1.02]"
                      >
                        <Target className="w-4 h-4" />
                        Rejoindre le groupe
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* CTA global */}
        <div className="text-center">
          <Link
            href="/achats-groupes"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            <Users className="w-5 h-5" />
            <span>Voir tous les achats groupés</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            💡 Proposez votre propre achat groupé et invitez d'autres acheteurs
          </p>
        </div>
      </div>
    </section>
  )
}
