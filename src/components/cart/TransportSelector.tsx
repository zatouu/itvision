'use client'

import { Plane, Ship, Truck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export type ShippingMethod = 'express' | 'air' | 'sea'

export interface TransportOption {
  id: ShippingMethod
  label: string
  duration: string
  price: number
  weightPrice: string
  bestPrice?: boolean
  recommended?: boolean
}

interface TransportSelectorProps {
  value: ShippingMethod
  onChange: (method: ShippingMethod) => void
  options: TransportOption[]
}

const iconMap: Record<ShippingMethod, typeof Plane> = {
  express: Zap,
  air: Plane,
  sea: Ship,
}

export default function TransportSelector({ value, onChange, options }: TransportSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => {
        const Icon = iconMap[opt.id]
        const selected = value === opt.id
        return (
          <motion.button
            key={opt.id}
            whileTap={{ scale: 0.99 }}
            onClick={() => onChange(opt.id)}
            className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
              selected
                ? 'border-ddm-emerald bg-emerald-50/60'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {selected && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-ddm-emerald" />
            )}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? 'bg-ddm-emerald text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">{opt.label}</span>
                {opt.bestPrice && (
                  <span className="px-1.5 py-0.5 bg-ddm-emerald text-white text-[10px] font-bold rounded">BEST PRICE</span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{opt.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{opt.weightPrice}</p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
