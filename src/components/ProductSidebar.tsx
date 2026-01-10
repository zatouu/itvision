'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Users, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  FileDown, 
  MessageCircle,
  ShieldCheck,
  Truck,
  Wrench,
  Zap,
  TrendingUp
} from 'lucide-react'

interface ActiveGroupBuy {
  id: string
  productName: string
  productId: string
  discount: number
  currentParticipants: number
  targetParticipants: number
  progress: number
  placesLeft: number
  expiresAt?: string
  hoursLeft?: number
  status: 'active' | 'almost_full' | 'ending_soon'
}

interface PromoProduct {
  id: string
  name: string
  originalPrice: number
  promoPrice: number
  discount: number
  badge: string
  endsIn?: string
}

interface ProductSidebarProps {
  currentProductId?: string
}

export default function ProductSidebar({ currentProductId }: ProductSidebarProps) {
  const [groupBuys, setGroupBuys] = useState<ActiveGroupBuy[]>([])
  const [promos, setPromos] = useState<PromoProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch active group buys from API
    const fetchData = async () => {
      try {
        // Appel à l'API réelle
        const params = new URLSearchParams()
        if (currentProductId) {
          params.append('excludeProductId', currentProductId)
        }
        
        const res = await fetch(`/api/group-orders/active?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setGroupBuys(data.groups?.map((g: {
            id: string
            productName: string
            productId: string
            discount: number
            currentParticipants: number
            targetParticipants: number
            progress: number
            placesLeft: number
            hoursLeft?: number
            urgencyStatus: 'active' | 'almost_full' | 'ending_soon'
          }) => ({
            ...g,
            status: g.urgencyStatus
          })) || [])
        } else {
          // Fallback données démo si l'API échoue
          console.warn('Failed to fetch active group orders, using demo data')
          setGroupBuys([])
        }

        // Promos - pour l'instant on garde les données démo
        // TODO: Créer une API /api/products/promos pour récupérer les promos
        setPromos([
          {
            id: 'promo_1',
            name: 'Disque dur surveillance 4TB Seagate',
            originalPrice: 127000,
            promoPrice: 89000,
            discount: 30,
            badge: '-30%',
            endsIn: '48h'
          },
          {
            id: 'promo_2',
            name: 'Switch PoE 8 ports Hikvision',
            originalPrice: 145000,
            promoPrice: 125000,
            discount: 14,
            badge: 'PROMO'
          }
        ])
      } catch (error) {
        console.error('Failed to fetch sidebar data:', error)
        setGroupBuys([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentProductId])

  const formatTimeLeft = (gb: ActiveGroupBuy) => {
    if (gb.hoursLeft !== undefined) {
      const hours = gb.hoursLeft
      const days = Math.floor(hours / 24)
      if (days > 0) return `${days}j`
      if (hours > 0) return `${hours}h`
      return 'Bientôt'
    }
    if (gb.expiresAt) {
      const diff = new Date(gb.expiresAt).getTime() - Date.now()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(hours / 24)
      if (days > 0) return `${days}j`
      if (hours > 0) return `${hours}h`
      return 'Bientôt'
    }
    return 'En cours'
  }

  const getStatusColor = (status: ActiveGroupBuy['status']) => {
    switch (status) {
      case 'almost_full': return 'text-orange-600'
      case 'ending_soon': return 'text-red-600'
      default: return 'text-purple-600'
    }
  }

  const getStatusLabel = (status: ActiveGroupBuy['status']) => {
    switch (status) {
      case 'almost_full': return 'PRESQUE COMPLET'
      case 'ending_soon': return 'SE TERMINE'
      default: return 'EN COURS'
    }
  }

  const getProgressColor = (status: ActiveGroupBuy['status']) => {
    switch (status) {
      case 'almost_full': return 'from-orange-500 to-red-500'
      case 'ending_soon': return 'from-red-500 to-pink-500'
      default: return 'from-purple-500 to-blue-500'
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA'
  }

  if (loading) {
    return (
      <aside className="lg:col-span-3 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </aside>
    )
  }

  return (
    <aside className="lg:col-span-3 space-y-4">
      {/* Achats groupés en cours */}
      {groupBuys.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Achats Groupés</h3>
              <p className="text-[10px] text-gray-500">Rejoignez et économisez</p>
            </div>
            <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {groupBuys.length} actifs
            </span>
          </div>
          
          <div className="space-y-2">
            {groupBuys.map((gb, index) => (
              <motion.div
                key={gb.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link 
                  href={`/achats-groupes/${gb.id}`}
                  className="block p-3 bg-white rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold flex items-center gap-1 ${getStatusColor(gb.status)}`}>
                      {gb.status === 'almost_full' ? (
                        <Zap className="w-3 h-3" />
                      ) : (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                      {getStatusLabel(gb.status)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Expire dans {formatTimeLeft(gb)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {gb.productName}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {Array.from({ length: Math.min(gb.currentParticipants, 3) }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold"
                          style={{ backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4] }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                      {gb.currentParticipants > 3 && (
                        <div className="w-5 h-5 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                          +{gb.currentParticipants - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      -{gb.discount}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(gb.currentParticipants / gb.targetParticipants) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full bg-gradient-to-r ${getProgressColor(gb.status)} rounded-full`}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {gb.currentParticipants}/{gb.targetParticipants} participants • {gb.targetParticipants - gb.currentParticipants} place{gb.targetParticipants - gb.currentParticipants > 1 ? 's' : ''}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>

          <Link 
            href="/achats-groupes"
            className="mt-3 w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 py-2 hover:bg-purple-50 rounded-lg transition-colors"
          >
            Voir tous les achats groupés
            <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      )}

      {/* CTA Bonnes affaires */}
      {promos.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Bonnes Affaires</h3>
              <p className="text-[10px] text-gray-500">Offres limitées</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {promos.map((promo, index) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    promo.discount >= 25 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {promo.badge}
                  </span>
                  {promo.endsIn && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      Fin dans {promo.endsIn}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-800 line-clamp-1">{promo.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(promo.promoPrice)}</span>
                  <span className="text-xs text-gray-400 line-through">{formatCurrency(promo.originalPrice)}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <Link 
            href="/produits?promo=true"
            className="mt-3 w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 py-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            Toutes les promotions
            <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      )}

      {/* CTA Devis rapide */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
            <FileDown className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">Besoin d&apos;un devis ?</h3>
          <p className="text-[11px] text-gray-500 mb-3">Projet sur mesure, quantités importantes</p>
          <Link 
            href="/devis"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
          >
            <MessageCircle className="w-4 h-4" />
            Demander un devis
          </Link>
        </div>
      </motion.div>

      {/* Badge confiance */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Paiement sécurisé</p>
              <p className="text-[10px] text-gray-500">Wave, Orange Money, CB</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Livraison Dakar</p>
              <p className="text-[10px] text-gray-500">Express 24h ou standard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Installation pro</p>
              <p className="text-[10px] text-gray-500">Techniciens certifiés</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Call to action WhatsApp */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm"
      >
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-2">Une question ?</p>
          <a 
            href="https://wa.me/221781234567?text=Bonjour, j'ai une question sur un produit"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Discuter sur WhatsApp
          </a>
        </div>
      </motion.div>
    </aside>
  )
}
