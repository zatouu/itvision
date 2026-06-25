'use client'

import { LucideIcon } from 'lucide-react'

interface DeliveryOptionCardProps {
  id: string
  label: string
  duration: string
  price: string
  icon: LucideIcon
  selected: boolean
  recommended?: boolean
  onSelect: () => void
}

export default function DeliveryOptionCard({
  label,
  duration,
  price,
  icon: Icon,
  selected,
  recommended,
  onSelect,
}: DeliveryOptionCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative text-left p-4 rounded-xl border-2 transition flex flex-col gap-2 ${
        selected
          ? 'border-ddm-emerald bg-emerald-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {recommended && (
        <span className="absolute -top-2 left-3 px-2 py-0.5 bg-ddm-purple text-white text-[10px] font-bold rounded-full">
          RECOMMANDÉ
        </span>
      )}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? 'bg-ddm-emerald text-white' : 'bg-slate-100 text-slate-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-bold text-sm text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{duration}</p>
      </div>
      <p className={`text-sm font-bold mt-auto ${selected ? 'text-ddm-emerald' : 'text-slate-900'}`}>{price}</p>
    </button>
  )
}
