'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Check, Gift, Share2, Star, Users, ShoppingBag, Heart, Eye, ShoppingCart, MessageSquare, CircleDollarSign } from 'lucide-react'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  share: Share2,
  review: Star,
  invite: Users,
  order: ShoppingCart,
  group_join: Users,
  favorite: Heart,
  visit: Eye,
  star: Star,
  first_purchase: ShoppingBag,
  review_product: MessageSquare,
  spend: CircleDollarSign,
}

interface Challenge {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  grainsReward: number
  action: string
  targetCount: number
  progress: number
  completed: boolean
  claimed: boolean
}

interface ChallengesGridProps {
  challenges: Challenge[]
  onClaim: (challengeId: string) => Promise<void>
}

export default function ChallengesGrid({ challenges, onClaim }: ChallengesGridProps) {
  const [claiming, setClaiming] = useState<string | null>(null)

  const handleClaim = async (id: string) => {
    setClaiming(id)
    try {
      await onClaim(id)
    } finally {
      setClaiming(null)
    }
  }

  const getStatus = (c: Challenge) => {
    if (c.claimed) return { label: 'Réclamé', className: 'bg-emerald-100 text-emerald-700' }
    if (c.completed) return { label: 'Réclamer', className: 'bg-emerald-600 text-white hover:bg-emerald-700' }
    if (c.progress >= c.targetCount * 0.7) return { label: 'Bientôt fini', className: 'bg-amber-100 text-amber-700' }
    if (c.progress > 0) return { label: 'En cours', className: 'bg-slate-100 text-slate-500' }
    return { label: 'A commencer', className: 'bg-slate-100 text-slate-500' }
  }

  return (
    <section id="challenges" className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
          <Target className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Défis - Gagnez des Grains en explorant</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {challenges.map((challenge, idx) => {
          const Icon = ICONS[challenge.icon] || Gift
          const percent = Math.min(100, Math.round((challenge.progress / challenge.targetCount) * 100))
          const status = getStatus(challenge)
          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition flex flex-col"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center text-purple-600">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">{challenge.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{challenge.description}</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-orange-400 rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>{challenge.progress}/{challenge.targetCount}</span>
                  <span>{percent}%</span>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-600">+{challenge.grainsReward}</span>
                <button
                  onClick={() => handleClaim(challenge.id)}
                  disabled={!challenge.completed || challenge.claimed || claiming === challenge.id}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${status.className}`}
                >
                  {challenge.claimed ? (
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Réclamé</span>
                  ) : claiming === challenge.id ? (
                    '...'
                  ) : (
                    status.label
                  )}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
