'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Clock, TrendingDown, Zap, Target, Megaphone } from 'lucide-react'

interface GroupBuy {
  _id: string
  groupId: string
  product: {
    productId: string
    name: string
    basePrice: number
    currency: string
  }
  currentQty: number
  targetQty: number
  minQty: number
  currentUnitPrice: number
  deadline: string
  priceTiers?: Array<{ minQty: number; price: number }>
}

export default function ProductGroupBuyCard({ 
  productId, 
  onPropose 
}: { 
  productId: string
  onPropose?: () => void
}) {
  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroupBuy = async () => {
      try {
        const res = await fetch(`/api/group-orders/active?productId=${productId}`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.length > 0) {
            setGroupBuy(data[0])
          }
        }
      } catch (err) {
        console.error('Erreur:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroupBuy()
  }, [productId])

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
      <div className="bg-white rounded-lg border p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-3"></div>
        <div className="h-20 bg-gray-200 rounded mb-3"></div>
        <div className="h-3 bg-gray-200 rounded"></div>
      </div>
    )
  }

  // Si un groupe existe pour ce produit
  if (groupBuy) {
    const progress = calcProgress(groupBuy.currentQty, groupBuy.targetQty)
    const savings = calcSavings(groupBuy.product.basePrice, groupBuy.currentUnitPrice)
    const timeLeft = calcTimeLeft(groupBuy.deadline)
    const isUrgent = progress >= 70

    return (
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl border-2 border-purple-300 p-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900 text-sm">Achat Groupé Actif</h3>
          </div>
          {savings > 0 && (
            <div className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              -{savings}%
            </div>
          )}
        </div>

        {/* Prix */}
        <div className="bg-white rounded-lg p-3 mb-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-gray-600">Prix actuel</div>
              <div className="text-2xl font-bold text-purple-600">
                {formatPrice(groupBuy.currentUnitPrice, groupBuy.product.currency)}
              </div>
            </div>
            {savings > 0 && (
              <div className="text-right">
                <div className="text-xs text-gray-500 line-through">
                  {formatPrice(groupBuy.product.basePrice, groupBuy.product.currency)}
                </div>
                <div className="text-xs text-emerald-600 font-semibold">
                  Économie: {formatPrice(groupBuy.product.basePrice - groupBuy.currentUnitPrice, groupBuy.product.currency)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progression */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-700 mb-1.5 font-medium">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {groupBuy.currentQty}/{groupBuy.targetQty} unités
            </span>
            <span className="font-bold text-purple-700">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                isUrgent 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                  : 'bg-gradient-to-r from-purple-500 to-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>🟢 {groupBuy.targetQty - groupBuy.currentQty} places restantes</span>
            <span>Min: {groupBuy.minQty}</span>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 bg-white/70 rounded-lg p-2 mb-3 border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600" />
          <div className="flex-1">
            <div className="text-[10px] text-gray-600">Expire dans</div>
            <div className="text-sm font-bold text-amber-700">{timeLeft}</div>
          </div>
          {isUrgent && (
            <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3" />
              Urgent
            </div>
          )}
        </div>

        {/* Paliers de prix */}
        {groupBuy.priceTiers && groupBuy.priceTiers.length > 0 && (
          <div className="bg-white/50 rounded-lg p-2 mb-3">
            <div className="text-[10px] font-semibold text-gray-600 mb-2">📊 Paliers</div>
            <div className="space-y-1">
              {groupBuy.priceTiers.slice(0, 3).map((tier, i) => {
                const isCurrent = groupBuy.currentQty >= tier.minQty
                return (
                  <div key={i} className={`flex justify-between text-xs px-2 py-1 rounded ${isCurrent ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'text-gray-600'}`}>
                    <span>{tier.minQty}+</span>
                    <span>{formatPrice(tier.price, groupBuy.product.currency)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/achats-groupes/${groupBuy.groupId}`}
          className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-center py-3 rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <Target className="w-4 h-4" />
            Rejoindre le groupe
          </div>
        </Link>

        <p className="text-center text-[10px] text-gray-600 mt-2">
          💡 Partagez pour débloquer les meilleurs prix
        </p>
      </div>
    )
  }

  // Si pas de groupe, proposition de créer
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 p-4 shadow-lg">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="font-bold text-indigo-900 text-sm">Pas de groupe actif</h4>
          <p className="text-xs text-gray-700 mt-1">
            Lancez un achat groupé et invitez d'autres acheteurs pour économiser ensemble
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onPropose}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
      >
        <Users className="w-4 h-4" />
        Proposer un groupe
      </button>

      <p className="text-center text-[10px] text-gray-600 mt-2">
        ✨ Soyez le premier à lancer ce groupe !
      </p>
    </div>
  )
}
