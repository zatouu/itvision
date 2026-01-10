'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Clock, TrendingDown, Zap, Tag, Gift } from 'lucide-react'

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
  currentQty: number
  targetQty: number
  currentUnitPrice: number
  deadline: string
}

export default function CompactGroupBuysSidebar({ excludeProductId }: { excludeProductId?: string }) {
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroupBuys = async () => {
      try {
        const params = new URLSearchParams()
        if (excludeProductId) params.append('excludeProductId', excludeProductId)
        
        const res = await fetch(`/api/group-orders/active?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setGroupBuys(data.slice(0, 4))
        }
      } catch (err) {
        console.error('Erreur:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroupBuys()
  }, [excludeProductId])

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
    return days > 0 ? `${days}j ${hours}h` : `${hours}h`
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg border p-3 animate-pulse">
            <div className="h-16 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Titre section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-3 text-white">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Achats Groupés Actifs
        </h3>
        <p className="text-xs opacity-90 mt-1">Économisez ensemble</p>
      </div>

      {/* Liste compacte */}
      {groupBuys.length > 0 ? (
        <div className="space-y-3">
          {groupBuys.map(group => {
            const progress = calcProgress(group.currentQty, group.targetQty)
            const savings = calcSavings(group.product.basePrice, group.currentUnitPrice)
            const timeLeft = calcTimeLeft(group.deadline)
            const isUrgent = progress >= 70

            return (
              <Link key={group._id} href={`/achats-groupes/${group.groupId}`}>
                <div className="bg-white rounded-lg border hover:border-purple-300 hover:shadow-md transition-all p-3 group cursor-pointer">
                  {/* Image + badges */}
                  <div className="relative mb-2">
                    {group.product.image ? (
                      <img 
                        src={group.product.image} 
                        alt={group.product.name}
                        className="w-full h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    
                    {savings > 0 && (
                      <div className="absolute top-1 right-1 bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3" />
                        -{savings}%
                      </div>
                    )}
                    
                    {isUrgent && (
                      <div className="absolute top-1 left-1 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                        <Zap className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Titre */}
                  <h4 className="font-semibold text-gray-900 text-xs mb-1.5 line-clamp-2 group-hover:text-purple-600 transition-colors min-h-[2rem]">
                    {group.product.name}
                  </h4>

                  {/* Prix */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-purple-600">
                      {formatPrice(group.currentUnitPrice, group.product.currency)}
                    </div>
                    {savings > 0 && (
                      <div className="text-xs text-gray-500 line-through">
                        {formatPrice(group.product.basePrice, group.product.currency)}
                      </div>
                    )}
                  </div>

                  {/* Progression */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{group.currentQty}/{group.targetQty}</span>
                      <span className="font-semibold">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isUrgent 
                            ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                            : 'bg-gradient-to-r from-purple-500 to-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-600" />
                      <span className="font-medium text-orange-600">{timeLeft}</span>
                    </div>
                    <span className="text-purple-600 font-medium group-hover:underline">
                      Rejoindre →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* CTA voir tous */}
          <Link 
            href="/achats-groupes"
            className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-center py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
          >
            Voir tous les groupes
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-4 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Aucun achat groupé actif</p>
        </div>
      )}

      {/* Carte Promo */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-200 p-3">
        <div className="flex items-start gap-2 mb-2">
          <Gift className="w-4 h-4 text-emerald-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-900 text-xs">Offre Flash</h4>
            <p className="text-xs text-gray-600 mt-0.5">Installation offerte</p>
          </div>
        </div>
        <Link
          href="/produits?category=Vidéosurveillance"
          className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center py-2 rounded text-xs font-semibold transition-colors"
        >
          Découvrir
        </Link>
      </div>

      {/* CTA Proposer */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-3">
        <div className="flex items-start gap-2 mb-2">
          <Tag className="w-4 h-4 text-indigo-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-indigo-900 text-xs">Proposer un groupe</h4>
            <p className="text-xs text-gray-600 mt-0.5">Invitez d'autres acheteurs</p>
          </div>
        </div>
        <Link
          href="/produits"
          className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 rounded text-xs font-semibold transition-colors"
        >
          Créer mon groupe
        </Link>
      </div>
    </div>
  )
}
