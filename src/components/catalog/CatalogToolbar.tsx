'use client'

import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react'

interface Props {
  count: number
  sort: string
  onSortChange: (sort: string) => void
  view: 'grid' | 'list'
  onViewChange: (v: 'grid' | 'list') => void
  onOpenMobileFilters: () => void
}

const sortOptions = [
  { value: 'default', label: 'Popularité' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'rating-desc', label: 'Mieux notés' },
  { value: 'groupbuy-discount-desc', label: 'Achats groupés' },
]

export default function CatalogToolbar({
  count,
  sort,
  onSortChange,
  view,
  onViewChange,
  onOpenMobileFilters,
}: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">
          <strong>{count.toLocaleString('fr-FR')}</strong> résultats
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileFilters}
          className="md:hidden flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filtres
        </button>

        <div className="hidden md:flex border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={() => onViewChange('grid')}
            className={`p-1.5 rounded ${view === 'grid' ? 'bg-slate-100' : ''}`}
            aria-label="Vue grille"
          >
            <LayoutGrid className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`p-1.5 rounded ${view === 'list' ? 'bg-slate-100' : ''}`}
            aria-label="Vue liste"
          >
            <List className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            ▼
          </span>
        </div>
      </div>
    </div>
  )
}
