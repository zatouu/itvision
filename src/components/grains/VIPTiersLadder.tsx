'use client'

import { Crown, ChevronRight } from 'lucide-react'

interface Tier {
  name: string
  min: number
  color: string
  current: boolean
}

interface VIPTiersLadderProps {
  tiers: Tier[]
  balance: number
  progressToNext: number
}

export default function VIPTiersLadder({ tiers, balance, progressToNext }: VIPTiersLadderProps) {
  const currentTier = tiers.find((t) => t.current) || tiers[0]
  const nextTier = tiers.find((t) => t.min > balance)

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900">Échelons VIP</h2>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-bold text-slate-900">{currentTier.name}</span>
          <span className="text-slate-500">{nextTier ? `Prochain : ${nextTier.name}` : 'Niveau max'}</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressToNext}%`, backgroundColor: currentTier.color }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">{balance.toLocaleString('fr-FR')} / {nextTier ? nextTier.min.toLocaleString('fr-FR') : 'MAX'} Grains</p>
      </div>

      <div className="space-y-2">
        {tiers.map((tier, idx) => (
          <div
            key={tier.name}
            className={`flex items-center justify-between p-3 rounded-xl border-2 transition ${
              tier.current ? 'border-amber-400 bg-amber-50' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: tier.color }}
              >
                {idx + 1}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{tier.name}</p>
                <p className="text-xs text-slate-500">{tier.min.toLocaleString('fr-FR')} Grains min.</p>
              </div>
            </div>
            {tier.current ? (
              <span className="text-xs font-bold text-amber-600">Actuel</span>
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-300" />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
