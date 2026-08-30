'use client'

import { motion } from 'framer-motion'
import { Wheat, TrendingUp, ShoppingBag, Clock, Award } from 'lucide-react'

interface GrainsHeroProps {
  name: string
  balance: number
  tier: string
  weeklyEarned?: number
  spent?: number
  expiringSoon?: number
  lifetime?: number
}

const TIERS = [
  { name: 'Bronze', min: 0, color: '#B45309' },
  { name: 'Argent', min: 1000, color: '#94A3B8' },
  { name: 'Or', min: 3000, color: '#F59E0B' },
  { name: 'Platine', min: 7500, color: '#10B981' },
]

export default function GrainsHero({
  name,
  balance,
  tier,
  weeklyEarned = 320,
  spent = 500,
  expiringSoon = 200,
  lifetime = 4850,
}: GrainsHeroProps) {
  const currentTier = TIERS.find((t) => t.name.toLowerCase() === tier.toLowerCase()) || TIERS[0]
  const nextTier = TIERS.find((t) => t.min > balance) || TIERS[TIERS.length - 1]
  const prevMin = currentTier.min
  const progress = Math.min(100, Math.max(0, ((balance - prevMin) / (nextTier.min - prevMin)) * 100))

  const stats = [
    { label: 'Gagnés cette semaine', value: `+${weeklyEarned}`, icon: TrendingUp },
    { label: 'Dépenses', value: `${spent}`, icon: ShoppingBag },
    { label: 'Expirent dans 30j', value: `${expiringSoon}`, icon: Clock },
    { label: 'Total lifetime', value: `${lifetime}`, icon: Award },
  ]

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 text-white p-6 sm:p-8 mb-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(24)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-sm"
            initial={{ y: -20, opacity: 0, rotate: (i * 47) % 360 }}
            animate={{ y: 400, opacity: [0, 1, 0], rotate: ((i * 47) % 360) + 180 }}
            transition={{ duration: 3 + ((i * 7) % 4), repeat: Infinity, delay: ((i * 13) % 40) / 10 }}
            style={{ left: `${(i * 29) % 100}%` }}
          >
            {['✦', '★', '●', '✧'][i % 4]}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
        <div className="flex flex-col items-center lg:items-start">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 shadow-2xl flex items-center justify-center border-4 border-amber-100">
              <Wheat className="w-16 h-16 sm:w-20 sm:h-20 text-amber-900" />
            </div>
            <motion.div
              className="absolute -inset-3 rounded-full border-2 border-white/40"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              style={{ borderStyle: 'dashed' }}
            />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-white/80">MASSIVE</p>
        </div>

        <div className="flex-1 text-center lg:text-left w-full">
          <p className="text-sm font-medium opacity-90 mb-1">Bienvenue, {name} !</p>
          <h1 className="text-4xl sm:text-5xl font-black mb-1">{balance.toLocaleString('fr-FR')} Grains</h1>
          <p className="text-sm opacity-80 mb-5">Gagnez des Grains à chaque action et transformez-les en récompenses.</p>

          <div className="relative mb-2">
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs font-bold">
              {TIERS.map((t) => (
                <div key={t.name} className={`flex flex-col items-center ${t.name === currentTier.name ? 'text-white' : 'text-white/60'}`}>
                  <span className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: t.color }} />
                  <span>{t.name}</span>
                  <span className="font-normal text-[10px] opacity-70">{t.min} min</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/80 mt-1">{nextTier.min - balance} grains pour {nextTier.name}</p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1 opacity-80">
              <stat.icon className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-medium">{stat.label}</span>
            </div>
            <p className="text-xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
