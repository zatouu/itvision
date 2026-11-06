'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Zap, Flame } from 'lucide-react'
import CountdownBadge from './CountdownBadge'

interface Props {
  group: any
  index: number
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function FeaturedGroupCard({ group, index }: Props) {
  const progress = group.progress || 0
  const urgency = progress >= 90 ? 'urgent' : progress >= 50 ? 'medium' : 'low'
  const isAlmostFull = group.isAlmostFull || (group.targetQty - group.currentQty <= 3 && group.targetQty > group.currentQty)

  const urgencyGradient = urgency === 'urgent'
    ? 'from-orange-500 to-red-500'
    : 'from-violet-500 to-emerald-500'

  const ctaClass = urgency === 'urgent'
    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
    : 'bg-emerald-500 hover:bg-emerald-600 text-white'

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-violet-300 transition-all duration-300 group"
    >
      {/* Product image */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        {group.product?.image ? (
          <Image
            src={group.product.image}
            alt={group.product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <span className="text-4xl">📦</span>
          </div>
        )}

        {/* Top-left urgency badge */}
        {isAlmostFull && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg animate-pulse flex items-center gap-1 shadow-lg">
            <Flame className="w-3 h-3" />
            Plus que {group.targetQty - group.currentQty} places !
          </div>
        )}
        {!isAlmostFull && group.isPopular && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow">
            <Zap className="w-3 h-3" />
            Populaire
          </div>
        )}
        {group.isNew && !isAlmostFull && !group.isPopular && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow">
            ✨ Nouveau
          </div>
        )}

        {/* Top-right category */}
        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-slate-700 text-[10px] px-2 py-1 rounded-lg font-medium">
          {group.product?.category || 'Import'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-[15px] text-slate-900 line-clamp-2 min-h-[2.5rem] leading-snug">
          {group.product?.name}
        </h3>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {group.participantCount || group.participants?.length || 0}/{group.targetQty} participants
            </span>
            <span className="text-violet-600 font-bold">{progress}%</span>
          </div>

          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.2 }}
              className={`h-full rounded-full bg-gradient-to-r ${urgencyGradient}`}
            />
          </div>

          {/* Avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {(group.recentParticipants || []).slice(0, 4).map((p: any, i: number) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-emerald-400 flex items-center justify-center text-[8px] font-bold text-white border-2 border-white"
                  title={p.name}
                >
                  {getInitials(p.name)}
                </div>
              ))}
            </div>
            {(group.participantCount || 0) > 4 && (
              <span className="text-[10px] text-slate-500">
                +{(group.participantCount || 0) - 4} acheteurs
              </span>
            )}
            {(group.participantCount || 0) === 0 && (
              <span className="text-[10px] text-slate-400 italic">Soyez le premier participant</span>
            )}
          </div>
        </div>

        {/* Prices */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Prix solo</span>
            <span className="text-slate-400 line-through">
              {(group.soloPrice || 0).toLocaleString('fr-FR')} F
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-700">Prix groupé</span>
            <span className="text-base font-extrabold text-emerald-600">
              {(group.groupPrice || group.currentUnitPrice || 0).toLocaleString('fr-FR')} F
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              -{group.savingsPercent || 0}% économie
            </span>
          </div>
        </div>

        {/* Countdown */}
        <CountdownBadge deadline={group.deadline} urgency={urgency} />

        {/* CTA */}
        <Link
          href={`/achats-groupes/${group.groupId}`}
          className={`block w-full py-2.5 rounded-xl font-bold text-center text-sm transition ${ctaClass}`}
        >
          {isAlmostFull ? 'Rejoindre maintenant' : `Être le ${(group.participantCount || 0) + 1}ème`}
        </Link>
      </div>
    </motion.article>
  )
}
