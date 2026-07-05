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
    <div className="border-b border-slate-100 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide justify-center">
          {loading && pills.length === 0 && (
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 w-24 rounded-full bg-slate-100 animate-pulse" />
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
