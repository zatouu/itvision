'use client'

import {
  Search,
  Shield,
  Laptop,
  Home,
  Smartphone,
  Armchair,
  Gift,
  Package,
  LucideIcon,
} from 'lucide-react'

export interface PillCategory {
  name: string
  slug: string
  icon?: LucideIcon
  color?: string
}

const defaultPills: PillCategory[] = [
  { name: 'Tous', slug: 'tous', icon: Search, color: 'blue' },
  { name: 'Sécurité', slug: 'securite', icon: Shield, color: 'emerald' },
  { name: 'Informatique', slug: 'informatique', icon: Laptop, color: 'blue' },
  { name: 'Domotique', slug: 'domotique', icon: Home, color: 'orange' },
  { name: 'Électronique', slug: 'electronique', icon: Smartphone, color: 'violet' },
  { name: 'Mobilier', slug: 'mobilier', icon: Armchair, color: 'amber' },
  { name: 'Packs', slug: 'packs-cadeaux', icon: Gift, color: 'pink' },
]

const colorMap: Record<string, { bg: string; border: string; text: string; activeBg: string; activeBorder: string; activeText: string }> = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-950/30',       border: 'border-blue-200 dark:border-blue-900',       text: 'text-blue-600 dark:text-blue-400',       activeBg: 'bg-blue-100 dark:bg-blue-950/50',       activeBorder: 'border-blue-300 dark:border-blue-800',       activeText: 'text-blue-700 dark:text-blue-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900', text: 'text-emerald-600 dark:text-emerald-400', activeBg: 'bg-emerald-100 dark:bg-emerald-950/50', activeBorder: 'border-emerald-300 dark:border-emerald-800', activeText: 'text-emerald-700 dark:text-emerald-300' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-950/30',       border: 'border-pink-200 dark:border-pink-900',       text: 'text-pink-600 dark:text-pink-400',       activeBg: 'bg-pink-100 dark:bg-pink-950/50',       activeBorder: 'border-pink-300 dark:border-pink-800',       activeText: 'text-pink-700 dark:text-pink-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30',    border: 'border-amber-200 dark:border-amber-900',    text: 'text-amber-600 dark:text-amber-400',    activeBg: 'bg-amber-100 dark:bg-amber-950/50',    activeBorder: 'border-amber-300 dark:border-amber-800',    activeText: 'text-amber-700 dark:text-amber-300' },
  red:     { bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-200 dark:border-red-900',         text: 'text-red-600 dark:text-red-400',         activeBg: 'bg-red-100 dark:bg-red-950/50',         activeBorder: 'border-red-300 dark:border-red-800',         activeText: 'text-red-700 dark:text-red-300' },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-950/30',       border: 'border-cyan-200 dark:border-cyan-900',       text: 'text-cyan-600 dark:text-cyan-400',       activeBg: 'bg-cyan-100 dark:bg-cyan-950/50',       activeBorder: 'border-cyan-300 dark:border-cyan-800',       activeText: 'text-cyan-700 dark:text-cyan-300' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-950/30',   border: 'border-orange-200 dark:border-orange-900',   text: 'text-orange-600 dark:text-orange-400',   activeBg: 'bg-orange-100 dark:bg-orange-950/50',   activeBorder: 'border-orange-300 dark:border-orange-800',   activeText: 'text-orange-700 dark:text-orange-300' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-950/30',   border: 'border-violet-200 dark:border-violet-900',   text: 'text-violet-600 dark:text-violet-400',   activeBg: 'bg-violet-100 dark:bg-violet-950/50',   activeBorder: 'border-violet-300 dark:border-violet-800',   activeText: 'text-violet-700 dark:text-violet-300' },
  green:   { bg: 'bg-green-50 dark:bg-green-950/30',     border: 'border-green-200 dark:border-green-900',     text: 'text-green-600 dark:text-green-400',     activeBg: 'bg-green-100 dark:bg-green-950/50',     activeBorder: 'border-green-300 dark:border-green-800',     activeText: 'text-green-700 dark:text-green-300' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-800',       border: 'border-slate-200 dark:border-slate-700',     text: 'text-slate-600 dark:text-slate-400',     activeBg: 'bg-slate-100 dark:bg-slate-700',         activeBorder: 'border-slate-300 dark:border-slate-600',     activeText: 'text-slate-700 dark:text-slate-300' },
}

interface Props {
  categories?: PillCategory[]
  active: string
  onSelect: (category: PillCategory) => void
  loading?: boolean
}

export default function CategoryPillsScroller({ categories, active, onSelect, loading }: Props) {
  const source = categories && categories.length > 0 ? categories : defaultPills
  const hasTous = source.some(c => c.slug === 'tous')
  const pills = hasTous ? source : [{ name: 'Tous', slug: 'tous', icon: Search, color: 'blue' }, ...source]
  return (
    <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide justify-center">
          {loading && pills.length === 0 && (
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 w-24 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />
              ))}
            </div>
          )}
          {pills.map((cat) => {
            const isActive = active === cat.slug
            const color = cat.color || 'slate'
            const Icon = cat.icon || Package
            const colors = colorMap[color] ?? colorMap.slate
            return (
              <button
                key={cat.slug}
                onClick={() => onSelect(cat)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex-shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? `${colors.activeBg} ${colors.activeBorder} ${colors.activeText}`
                    : `${colors.bg} ${colors.border} ${colors.text} hover:brightness-95`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
