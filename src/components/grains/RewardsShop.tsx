'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, ShoppingBag, Tag, Copy, Check, Truck, Crown, Package } from 'lucide-react'

interface Reward {
  id: string
  title: string
  description: string
  icon: string
  cost: number
  type: string
  value: any
  minOrderAmount?: number
  imageUrl?: string
}

interface RewardsShopProps {
  rewards: Reward[]
  balance: number
  onRedeem: (rewardId: string) => Promise<{ code: string; expiresAt: string }>
}

const FILTERS = ['Tout', 'Réductions', 'Cadeaux', 'Livraison', 'Premium']

const TYPE_MAP: Record<string, string> = {
  discount: 'Réductions',
  gift: 'Cadeaux',
  free_shipping: 'Livraison',
  premium: 'Premium',
}

export default function RewardsShop({ rewards, balance, onRedeem }: RewardsShopProps) {
  const [filter, setFilter] = useState('Tout')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<{ rewardId: string; code: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const filtered = rewards.filter((r) => {
    if (filter === 'Tout') return true
    return TYPE_MAP[r.type] === filter || (filter === 'Premium' && (r.type === 'premium' || r.cost >= 1500))
  })

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId)
    try {
      const data = await onRedeem(rewardId)
      setRedeemed({ rewardId, code: data.code, expiresAt: data.expiresAt })
    } finally {
      setRedeeming(null)
    }
  }

  const copyCode = () => {
    if (redeemed?.code) {
      navigator.clipboard.writeText(redeemed.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const typeBadge = (type: string) => {
    switch (type) {
      case 'free_shipping': return { icon: Truck, color: 'bg-blue-100 text-blue-700', label: 'Livraison' }
      case 'discount': return { icon: Tag, color: 'bg-red-100 text-red-700', label: 'Réduction' }
      case 'premium': return { icon: Crown, color: 'bg-purple-100 text-purple-700', label: 'Premium' }
      default: return { icon: Gift, color: 'bg-amber-100 text-amber-700', label: 'Cadeau' }
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Boutique des Grains</h2>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4 gap-3">
        {filtered.map((reward, idx) => {
          const canAfford = balance >= reward.cost
          const badge = typeBadge(reward.type)
          const BadgeIcon = badge.icon
          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${badge.color} flex items-center justify-center`}>
                  <BadgeIcon className="w-4 h-4" />
                </div>
                {reward.type === 'free_shipping' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white">populaire</span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-xs leading-tight mb-1">{reward.title}</h3>
              <p className="text-[10px] text-slate-500 mb-2 flex-1 leading-tight">{reward.description}</p>
              {reward.minOrderAmount && (
                <p className="text-[9px] text-slate-400 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Min. {reward.minOrderAmount.toLocaleString('fr-FR')} F
                </p>
              )}
              <div className="mt-auto flex items-center justify-between gap-1">
                <span className="text-xs font-black text-amber-600">{reward.cost}</span>
                <button
                  onClick={() => handleRedeem(reward.id)}
                  disabled={!canAfford || redeeming === reward.id}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    canAfford
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {redeeming === reward.id ? '...' : canAfford ? 'Échanger' : 'Solde insuffisant'}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {redeemed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Récompense obtenue !</h3>
              <p className="text-sm text-slate-600 mb-4">Utilisez ce code lors de votre prochaine commande.</p>
              <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between mb-4">
                <code className="font-mono font-bold text-slate-900">{redeemed.code}</code>
                <button onClick={copyCode} className="p-1.5 hover:bg-slate-200 rounded">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">Expire le {new Date(redeemed.expiresAt).toLocaleDateString('fr-FR')}</p>
              <button onClick={() => setRedeemed(null)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition">
                Super !
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
