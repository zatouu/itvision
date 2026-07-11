'use client'

import { Users, ArrowRight } from 'lucide-react'

interface GroupBuyOpportunityCardProps {
  opportunity: any
}

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-'

export default function GroupBuyOpportunityCard({ opportunity }: GroupBuyOpportunityCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-violet-200 dark:border-violet-900 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center">
          <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate">{opportunity.cartProductName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Groupe #{opportunity.groupId}</p>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Participants</span>
          <span className="font-medium dark:text-slate-300">{opportunity.memberCount || 0} / {opportunity.targetCapacity || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Prix groupe</span>
          <span className="font-bold text-ddm-emerald dark:text-emerald-400">{formatCurrency(opportunity.groupPrice || opportunity.price)}</span>
        </div>
      </div>
      <a
        href={`/achats-groupes/${opportunity.groupId}`}
        className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 py-2 rounded-lg transition"
      >
        Rejoindre le groupe <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  )
}
