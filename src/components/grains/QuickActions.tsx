'use client'

import { motion } from 'framer-motion'
import { CircleDot, Calendar, Target } from 'lucide-react'
import Link from 'next/link'

interface QuickActionsProps {
  canSpinFree: boolean
  checkedInToday: boolean
  streak: number
  completedChallenges: number
  totalChallenges: number
}

export default function QuickActions({
  canSpinFree,
  checkedInToday,
  streak,
  completedChallenges,
  totalChallenges,
}: QuickActionsProps) {
  const cards = [
    {
      href: '#wheel',
      icon: CircleDot,
      title: 'Roue de la fortune',
      subtitle: canSpinFree ? '1 spin gratuit/jour' : 'Prochain spin demain',
      gradient: 'from-purple-500 to-violet-600',
    },
    {
      href: '#checkin',
      icon: Calendar,
      title: 'Check-in quotidien',
      subtitle: checkedInToday ? `Jour ${Math.min(streak, 7)}/7 · fait` : `Jour ${Math.min(streak + 1, 7)}/7 · +10 grains`,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      href: '#challenges',
      icon: Target,
      title: 'Défis du jour',
      subtitle: `${completedChallenges}/${totalChallenges} complétés`,
      gradient: 'from-orange-500 to-amber-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {cards.map((card, idx) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Link
            href={card.href}
            className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${card.gradient} text-white shadow-lg hover:shadow-xl transition hover:scale-[1.02]`}
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">{card.title}</h3>
              <p className="text-xs text-white/90">{card.subtitle}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
