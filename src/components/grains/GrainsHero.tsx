'use client'

import { motion } from 'framer-motion'
import { Sparkles, Wheat, Trophy, Gift } from 'lucide-react'

interface GrainsHeroProps {
  name: string
  balance: number
  tier: string
}

export default function GrainsHero({ name, balance, tier }: GrainsHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-700 text-white p-6 sm:p-8 mb-8">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl"
            initial={{ y: -20, x: Math.random() * 600, opacity: 0 }}
            animate={{ y: 300, opacity: [0, 1, 0] }}
            transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }}
          >
            🌾
          </motion.div>
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wider opacity-90">Programme de fidélité</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-1">Bienvenue, {name} !</h1>
        <p className="opacity-90 text-sm sm:text-base mb-6">Gagnez des Grains à chaque action et transformez-les en récompenses.</p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/30">
            <p className="text-xs opacity-90 mb-1">Votre solde</p>
            <div className="flex items-center gap-2">
              <Wheat className="w-8 h-8 text-amber-100" />
              <span className="text-4xl font-black">{balance.toLocaleString('fr-FR')}</span>
            </div>
            <p className="text-xs opacity-80 mt-1">Grains</p>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col items-center bg-white/15 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
              <Trophy className="w-5 h-5 mb-1" />
              <span className="text-xs opacity-80">Niveau</span>
              <span className="font-bold text-sm">{tier}</span>
            </div>
            <div className="flex flex-col items-center bg-white/15 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
              <Gift className="w-5 h-5 mb-1" />
              <span className="text-xs opacity-80">Récompenses</span>
              <span className="font-bold text-sm">Disponibles</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
