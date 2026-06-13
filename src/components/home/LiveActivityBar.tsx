'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ShoppingCart, Package, Flame } from 'lucide-react'

interface Activity {
  id: string
  type: 'join' | 'order' | 'new' | 'group'
  user: string
  text: string
  time: string
}

const ACTIVITIES: Activity[] = [
  { id: '1', type: 'group', user: 'Ahmed D.', text: 'a rejoint un achat groupé', time: 'il y a 2 min' },
  { id: '2', type: 'order', user: 'Fatou N.', text: 'a commandé 12 caméras Hikvision', time: 'il y a 5 min' },
  { id: '3', type: 'join', user: 'Omar S.', text: 'a demandé un devis import', time: 'il y a 8 min' },
  { id: '4', type: 'new', user: 'Mariama K.', text: 'a reçu son colis de Chine', time: 'il y a 12 min' },
  { id: '5', type: 'group', user: 'Ibrahima F.', text: 'a rejoint un achat groupé', time: 'il y a 15 min' },
  { id: '6', type: 'order', user: 'Aminata D.', text: 'a commandé un pack revendeur', time: 'il y a 18 min' },
  { id: '7', type: 'new', user: 'Lamine N.', text: 'a publié une recherche par photo', time: 'il y a 22 min' },
  { id: '8', type: 'group', user: 'Seynabou D.', text: 'a rejoint un achat groupé', time: 'il y a 25 min' },
]

const ICONS = {
  join: User,
  order: ShoppingCart,
  new: Package,
  group: Flame,
}

const COLORS = {
  join: 'bg-blue-100 text-blue-600',
  order: 'bg-emerald-100 text-emerald-600',
  new: 'bg-violet-100 text-violet-600',
  group: 'bg-orange-100 text-orange-600',
}

export default function LiveActivityBar() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ACTIVITIES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const activity = ACTIVITIES[current]
  const Icon = ICONS[activity.type]
  const color = COLORS[activity.type]

  return (
    <div className="py-3 bg-white border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Activité
          </span>
          <div className="flex-1 h-8 relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-center gap-2"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${color}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <span className="text-sm text-slate-700">
                  <span className="font-semibold">{activity.user}</span> {activity.text}
                </span>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-auto">{activity.time}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {ACTIVITIES.slice(0, 4).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current % 4 ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
