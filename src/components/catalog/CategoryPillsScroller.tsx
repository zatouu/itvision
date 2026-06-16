'use client'

import {
  Search,
  Shirt,
  Sparkles,
  Home,
  Monitor,
  Car,
  Dumbbell,
  UtensilsCrossed,
  Baby,
  PawPrint,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const defaultPills = [
  'Tous', 'Mode', 'Beauté', 'Maison', 'Électronique', 'Auto', 'Sport', 'Cuisine', 'Bébé', 'Animaux', 'Outils'
]

const pillConfig: Record<string, { icon: LucideIcon; color: string }> = {
  Tous:         { icon: Search,           color: 'blue' },
  Mode:         { icon: Shirt,            color: 'emerald' },
  Beauté:       { icon: Sparkles,         color: 'pink' },
  Maison:       { icon: Home,             color: 'amber' },
  Électronique: { icon: Monitor,          color: 'blue' },
  Auto:         { icon: Car,              color: 'red' },
  Sport:        { icon: Dumbbell,         color: 'cyan' },
  Cuisine:      { icon: UtensilsCrossed, color: 'orange' },
  Bébé:         { icon: Baby,             color: 'violet' },
  Animaux:      { icon: PawPrint,         color: 'green' },
  Outils:       { icon: Wrench,           color: 'slate' },
}

const colorMap: Record<string, { bg: string; border: string; text: string; activeBg: string; activeBorder: string; activeText: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-600',    activeBg: 'bg-blue-100',    activeBorder: 'border-blue-300',    activeText: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-300', activeText: 'text-emerald-700' },
  pink:    { bg: 'bg-pink-50',    border: 'border-pink-200',    text: 'text-pink-600',    activeBg: 'bg-pink-100',    activeBorder: 'border-pink-300',    activeText: 'text-pink-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-600',   activeBg: 'bg-amber-100',   activeBorder: 'border-amber-300',   activeText: 'text-amber-700' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-600',     activeBg: 'bg-red-100',     activeBorder: 'border-red-300',     activeText: 'text-red-700' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-600',    activeBg: 'bg-cyan-100',    activeBorder: 'border-cyan-300',    activeText: 'text-cyan-700' },
  orange:  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600',  activeBg: 'bg-orange-100',  activeBorder: 'border-orange-300',  activeText: 'text-orange-700' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-600',  activeBg: 'bg-violet-100',  activeBorder: 'border-violet-300',  activeText: 'text-violet-700' },
  green:   { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-600',   activeBg: 'bg-green-100',   activeBorder: 'border-green-300',   activeText: 'text-green-700' },
  slate:   { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',   activeBg: 'bg-slate-100',   activeBorder: 'border-slate-300',   activeText: 'text-slate-700' },
}

interface Props {
  categories?: string[]
  active: string
  onSelect: (cat: string) => void
}

export default function CategoryPillsScroller({ categories, active, onSelect }: Props) {
  const pills = categories ?? defaultPills
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide">
          {pills.map((cat) => {
            const isActive = active === cat
            const config = pillConfig[cat] ?? { icon: Search, color: 'slate' }
            const colors = colorMap[config.color] ?? colorMap.slate
            const Icon = config.icon
            return (
              <button
                key={cat}
                onClick={() => onSelect(cat)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex-shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? `${colors.activeBg} ${colors.activeBorder} ${colors.activeText}`
                    : `${colors.bg} ${colors.border} ${colors.text} hover:brightness-95`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
