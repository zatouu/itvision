'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Camera, Smartphone, Shirt, Home, Sparkles, Car, Gamepad2, Dumbbell, ChefHat, Baby, Dog, Wrench, LayoutGrid } from 'lucide-react'
import { quickCategories } from '@/lib/home-data'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphone, Shirt, Home, Sparkles, Car, Gamepad2,
  Dumbbell, ChefHat, Baby, Dog, Wrench, LayoutGrid,
}

interface CompactSearchBarProps {
  onOpenImageSearch?: () => void
}

export default function CompactSearchBar({ onOpenImageSearch }: CompactSearchBarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (q?: string) => {
    const term = q || query
    if (term.trim()) {
      router.push(`/produits?q=${encodeURIComponent(term.trim())}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto -mt-8 relative z-10 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex items-center p-1.5 md:p-2">
        <Search className="w-5 h-5 text-slate-400 ml-3 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Rechercher un produit, marque ou par photo..."
          className="flex-1 px-3 py-2 outline-none bg-transparent text-sm md:text-base text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-w-0"
        />
        <button
          type="button"
          onClick={onOpenImageSearch}
          className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-full transition-colors"
          title="Recherche par image"
        >
          <Camera className="w-5 h-5 text-violet-600" />
        </button>
        <button
          onClick={() => handleSearch()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 md:px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ml-1 flex-shrink-0"
        >
          Rechercher
        </button>
      </div>

      {/* Catégories rapides sous forme d'icônes */}
      <div className="mt-3 -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x">
          {quickCategories.map((cat) => {
            const Icon = iconMap[cat.icon] || LayoutGrid
            return (
              <button
                key={cat.label}
                onClick={() => router.push(cat.href)}
                className="flex flex-col items-center gap-1.5 group flex-shrink-0 snap-start min-w-[3.5rem]"
              >
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:border-emerald-500 group-hover:ring-2 ring-emerald-500/20 transition shadow-sm">
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 text-center leading-tight max-w-[4.5rem] line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
