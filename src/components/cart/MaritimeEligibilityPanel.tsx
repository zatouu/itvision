'use client'

import { Info } from 'lucide-react'

interface MaritimeEligibilityPanelProps {
  volume: number
  threshold: number
  weightKg?: number
  weightThreshold?: number
}

export default function MaritimeEligibilityPanel({
  volume,
  threshold,
  weightKg = 0,
  weightThreshold = 50,
}: MaritimeEligibilityPanelProps) {
  const progress = Math.min(100, (volume / threshold) * 100)
  const eligible = volume >= threshold || weightKg >= weightThreshold

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-b-xl border-x border-b border-violet-200 dark:border-violet-900">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span className="font-medium text-sm dark:text-slate-200">Volume / Poids</span>
        </div>
        <span className={`text-sm font-bold ${eligible ? 'text-ddm-emerald dark:text-emerald-400' : 'text-violet-700 dark:text-violet-400'}`}>
          {volume.toFixed(2)} m³ / {threshold} m³
        </span>
      </div>
      <div className="h-2 bg-violet-100 dark:bg-violet-950/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${eligible ? 'bg-ddm-emerald' : 'bg-violet-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        {eligible
          ? 'Votre commande est éligible à la livraison maritime économique (-30%).'
          : 'Ajoutez des produits pour atteindre 0.05 m³ ou 50 kg et débloquer le fret maritime à -30%.'}
      </p>
    </div>
  )
}
