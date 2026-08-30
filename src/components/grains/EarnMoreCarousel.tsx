'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Heart, MessageSquare, ShoppingBag, Users, FileText, Truck, Gift } from 'lucide-react'

const ACTIONS = [
  { icon: Heart, label: 'Ajouter favori', grains: '+5', color: 'from-red-400 to-pink-500' },
  { icon: MessageSquare, label: 'Laisser un avis', grains: '+50', color: 'from-orange-400 to-amber-500' },
  { icon: ShoppingBag, label: 'Premier achat FCFA', grains: '+50', color: 'from-emerald-400 to-teal-500' },
  { icon: Truck, label: 'Livraison reçue', grains: '+50', color: 'from-blue-400 to-indigo-500' },
  { icon: Users, label: 'Rejoindre un groupe', grains: '+25', color: 'from-purple-400 to-violet-500' },
  { icon: Gift, label: 'Anniversaire', grains: '+300', color: 'from-pink-400 to-rose-500' },
  { icon: Users, label: 'Parrainer un ami', grains: '+500', color: 'from-cyan-400 to-blue-500' },
  { icon: FileText, label: 'Compléter profil', grains: '+50', color: 'from-lime-400 to-green-500' },
]

export default function EarnMoreCarousel() {
  const ref = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!ref.current) return
    const amount = 240
    ref.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <Gift className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Comment gagner plus de Grains ?</h2>
      </div>

      <div className="relative group px-2">
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={ref}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {ACTIONS.map((action, idx) => {
            const Icon = action.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`snap-start shrink-0 w-36 sm:w-40 rounded-2xl p-4 bg-gradient-to-br ${action.color} text-white shadow-md hover:shadow-lg transition hover:scale-[1.02] cursor-pointer`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold leading-tight">{action.label}</p>
                <p className="text-xs text-white/90 mt-1">{action.grains}</p>
              </motion.div>
            )
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  )
}
