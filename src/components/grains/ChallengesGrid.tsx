'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Check, Gift, Share2, Star, Users, ShoppingBag, Heart, Eye } from 'lucide-react'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  share: Share2,
  review: Star,
  invite: Users,
  order: ShoppingBag,
  group_join: Users,
  favorite: Heart,
  visit: Eye,
  star: Gift,
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

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" /> Défis & missions
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map((challenge, idx) => {
          const Icon = ICONS[challenge.icon] || Gift
          const percent = Math.min(100, Math.round((challenge.progress / challenge.targetCount) * 100))
          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-sm">{challenge.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{challenge.description}</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Progression</span>
                  <span>{challenge.progress}/{challenge.targetCount}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600">+{challenge.grainsReward} Grains</span>
                <button
                  onClick={() => handleClaim(challenge.id)}
                  disabled={!challenge.completed || challenge.claimed || claiming === challenge.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    challenge.claimed
                      ? 'bg-emerald-100 text-emerald-700'
                      : challenge.completed
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {challenge.claimed ? (
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Réclamé</span>
                  ) : claiming === challenge.id ? (
                    '...'
                  ) : challenge.completed ? (
                    'Réclamer'
                  ) : (
                    'En cours'
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
