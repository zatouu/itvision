'use client'

import { useState } from 'react'
import { Coins } from 'lucide-react'

interface GrainsToggleProps {
  balance: number
  maxUsable: number
  onToggle: (use: boolean, amount: number) => void
}

export default function GrainsToggle({ balance, maxUsable, onToggle }: GrainsToggleProps) {
  const [enabled, setEnabled] = useState(false)
  const usable = Math.min(balance, maxUsable)
  const valueFcfa = usable * 2

  const handleChange = () => {
    const next = !enabled
    setEnabled(next)
    onToggle(next, usable)
  }

  return (
    <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Utiliser {usable.toLocaleString('fr-FR')} Grains</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Économisez {valueFcfa.toLocaleString('fr-FR')} FCFA</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={handleChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? 'bg-ddm-emerald' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
