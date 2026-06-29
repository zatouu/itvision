'use client'

import { motion } from 'framer-motion'
import { Crown, ChevronRight, Star, Lock, Sparkles } from 'lucide-react'

interface Tier {
  name: string
  min: number
  color: string
  current: boolean
  benefits?: string[]
}

interface VIPTiersLadderProps {
  tiers: Tier[]
  balance: number
  progressToNext: number
}

export default function VIPTiersLadder({ tiers, balance, progressToNext }: VIPTiersLadderProps) {
  const currentTier = tiers.find((t) => t.current) || tiers[0]
  const nextTier = tiers.find((t) => t.min > balance)
  const currentLevel = tiers.findIndex((t) => t.current) + 1

  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Crown className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold">Votre niveau VIP</h2>
        </div>
        <span className="text-xs text-slate-400">Niveau {currentLevel}</span>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-900 font-black text-xl shadow-lg"
          style={{ backgroundColor: currentTier.color }}
        >
          {currentLevel}
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold" style={{ color: currentTier.color }}>{currentTier.name}</p>
          <p className="text-xs text-slate-300">
            {nextTier ? `${(nextTier.min - balance).toLocaleString('fr-FR')} Grains pour atteindre ${nextTier.name}` : 'Vous avez atteint le niveau maximum !'}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{currentTier.name}</span>
          <span>{nextTier?.name || 'Niveau max'}</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressToNext}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: currentTier.color }}
          />
        </div>
        <p className="text-xs text-slate-300 mt-1 text-right">{progressToNext}%</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {(currentTier.benefits || ['Avantages exclusifs', 'Bonus Grains', 'Livraison prioritaire']).slice(0, 3).map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-medium truncate">{b}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {tiers.map((tier, idx) => {
          const isCurrent = tier.current
          const isNext = nextTier?.name === tier.name
          const unlocked = idx <= (currentLevel - 1)
          return (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-xl border transition ${
                isCurrent ? 'bg-white/10 border-white/10' : 'bg-white/5 border-white/5 opacity-60'
              } ${isNext ? 'ring-1 ring-amber-400/50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: unlocked ? tier.color : '#334155', color: unlocked ? '#0f172a' : '#94a3b8' }}
                >
                  {unlocked ? <Star className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </div>
                <div>
                  <p className="text-sm font-bold">{tier.name}</p>
                  <p className="text-[10px] text-slate-400">{tier.min.toLocaleString('fr-FR')} Grains</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${unlocked ? 'text-amber-400' : 'text-slate-500'}`} />
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
