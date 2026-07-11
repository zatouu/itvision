'use client'

import { useState } from 'react'
import { Tag } from 'lucide-react'
import { motion } from 'framer-motion'

interface PromoCodeInputProps {
  onApply: (code: string) => void
  appliedCode?: string | null
}

export default function PromoCodeInput({ onApply, appliedCode }: PromoCodeInputProps) {
  const [code, setCode] = useState(appliedCode || '')

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Code promo"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ddm-emerald/30 focus:border-ddm-emerald"
        />
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onApply(code)}
        disabled={!code.trim()}
        className="px-4 py-2.5 bg-ddm-navy text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
      >
        Appliquer
      </motion.button>
    </div>
  )
}
