'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, ShoppingBag, Tag, Copy, Check } from 'lucide-react'

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

const FILTERS = ['Tous', 'Réduction', 'Livraison', 'Cadeau']

export default function RewardsShop({ rewards, balance, onRedeem }: RewardsShopProps) {
  const [filter, setFilter] = useState('Tous')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<{ rewardId: string; code: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const filtered = rewards.filter((r) => {
    if (filter === 'Tous') return true
    if (filter === 'Réduction') return r.type === 'discount'
    if (filter === 'Livraison') return r.type === 'free_shipping'
    if (filter === 'Cadeau') return r.type === 'gift'
    return true
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

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
        <ShoppingBag className="w-5 h-5 text-emerald-600" /> Boutique de récompenses
      </h2>

      <div className="flex gap-2 flex-wrap mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((reward, idx) => {
          const canAfford = balance >= reward.cost
          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">{reward.title}</h3>
              <p className="text-xs text-slate-500 mb-3 flex-1">{reward.description}</p>
              {reward.minOrderAmount && (
                <p className="text-[10px] text-slate-400 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Min. {reward.minOrderAmount.toLocaleString('fr-FR')} F
                </p>
              )}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-sm font-black text-amber-600">{reward.cost} Grains</span>
                <button
                  onClick={() => handleRedeem(reward.id)}
                  disabled={!canAfford || redeeming === reward.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    canAfford
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
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
