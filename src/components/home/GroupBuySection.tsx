'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Flame, Users, ArrowRight, Clock } from 'lucide-react'

interface GroupBuyItem {
  _id: string
  name: string
  image?: string
  basePrice: number
  bestPrice: number
  currency: string
  groupBuyMinQty: number
  groupBuyTargetQty: number
  activeGroups: {
    groupId: string
    currentQty: number
    targetQty: number
    currentPrice: number
    participantCount: number
    deadline: string
  }[]
  hasActiveGroup: boolean
}

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString('fr-FR')} ${currency}`
}

function formatTimeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Expire bientôt'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `Fin dans ${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}j restantes`
}

export default function GroupBuySection() {
  const [items, setItems] = useState<GroupBuyItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products/group-buy?limit=4')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const products = data?.products || []
        // Prioritize products with active groups
        const sorted = [...products].sort((a: GroupBuyItem, b: GroupBuyItem) =>
          Number(b.hasActiveGroup) - Number(a.hasActiveGroup)
        )
        setItems(sorted.slice(0, 4))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="py-12 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Achats groupés en cours</h2>
              <p className="text-sm text-slate-500">Rejoignez un groupe, plus on est moins on paie</p>
            </div>
          </div>
          <Link
            href="/achats-groupes"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item, idx) => {
            const group = item.activeGroups[0]
            const progress = group
              ? Math.min((group.currentQty / group.targetQty) * 100, 100)
              : 0
            const discount = group && item.basePrice > 0
              ? Math.round(((item.basePrice - group.currentPrice) / item.basePrice) * 100)
              : 0

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group relative rounded-2xl border border-slate-200 bg-white hover:shadow-lg hover:border-orange-200 transition-all overflow-hidden"
              >
                {/* Image */}
                <div className="relative h-44 bg-slate-50 overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="300px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <span className="text-xs">{item.name.slice(0, 20)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                      -{discount}%
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                    {item.name}
                  </h3>

                  {group && (
                    <>
                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.currentQty}/{group.targetQty} unités
                          </span>
                          <span className="text-orange-600 font-semibold">
                            {formatPrice(group.currentPrice, item.currency)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Counters */}
                      <div className="grid grid-cols-3 gap-1 mb-3 text-center">
                        <div className="bg-orange-50 rounded-lg p-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-orange-500" />
                            <span className="text-xs font-bold text-orange-700">{group.participantCount}</span>
                          </div>
                          <span className="text-[10px] text-orange-500">participants</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-1.5">
                          <div className="text-xs font-bold text-slate-700">{group.targetQty - group.currentQty}</div>
                          <span className="text-[10px] text-slate-500">places</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{formatTimeLeft(group.deadline)}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">restant</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Prices */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-orange-600">
                      {formatPrice(group?.currentPrice || item.bestPrice, item.currency)}
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(item.basePrice, item.currency)}
                    </span>
                  </div>

                  {/* Savings */}
                  {group && item.basePrice > group.currentPrice && (
                    <div className="text-xs font-semibold text-emerald-600 mb-3">
                      Économisez {formatPrice(item.basePrice - group.currentPrice, item.currency)} / unité
                    </div>
                  )}

                  <Link
                    href={`/achats-groupes?product=${item._id}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Rejoindre
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
