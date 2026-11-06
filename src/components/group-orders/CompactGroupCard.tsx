'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Clock, Zap } from 'lucide-react'

interface Props {
  group: any
  index: number
}

export default function CompactGroupCard({ group, index }: Props) {
  const progress = group.progress || Math.min(100, Math.round((group.currentQty / group.targetQty) * 100))
  const daysLeft = Math.ceil((new Date(group.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const savingsPercent = group.savingsPercent || 0

  const urgency = progress >= 90 ? 'urgent' : progress >= 50 ? 'medium' : 'low'
  const progressColor = urgency === 'urgent'
    ? 'bg-gradient-to-r from-orange-500 to-red-500'
    : 'bg-gradient-to-r from-violet-500 to-emerald-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      whileHover={{ y: -4 }}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-violet-200 transition-all duration-200 group"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        {group.product?.image ? (
          <Image
            src={group.product.image}
            alt={group.product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-400"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <span className="text-3xl">📦</span>
          </div>
        )}

        {/* Discount badge */}
        {savingsPercent > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            -{savingsPercent}%
          </span>
        )}

        {/* Status */}
        {group.status === 'filled' && (
          <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            Objectif atteint
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug min-h-[2rem]">
          {group.product?.name}
        </h3>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-600 flex items-center gap-0.5">
              <Users className="w-3 h-3" />
              {group.participantCount || group.participants?.length || 0}/{group.targetQty}
            </span>
            <span className="text-violet-600 font-bold">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, delay: index * 0.04 }}
              className={`h-full rounded-full ${progressColor}`}
            />
          </div>
        </div>

        {/* Prices */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-extrabold text-emerald-600">
            {(group.groupPrice || group.currentUnitPrice || 0).toLocaleString('fr-FR')} F
          </span>
          {group.soloPrice > 0 && (
            <span className="text-[10px] text-slate-400 line-through">
              {group.soloPrice.toLocaleString('fr-FR')} F
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {daysLeft > 0 ? `${daysLeft}j rest.` : 'Terminé'}
          </span>
          <Link
            href={`/achats-groupes/${group.groupId}`}
            className="inline-flex items-center gap-0.5 px-2 py-1 bg-violet-50 text-violet-700 rounded-lg font-semibold hover:bg-violet-100 transition"
          >
            <Zap className="w-3 h-3" />
            Rejoindre
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
