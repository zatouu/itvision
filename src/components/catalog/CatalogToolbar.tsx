'use client'

import { LayoutGrid, List, SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  count: number
  sort: string
  onSortChange: (sort: string) => void
  view: 'grid' | 'list'
  onViewChange: (v: 'grid' | 'list') => void
  onOpenMobileFilters: () => void
}

const tabs = [
  { key: 'default', label: 'Recommandé' },
  { key: 'price', label: 'Prix' },
  { key: 'rating-desc', label: 'Évaluation' },
  { key: 'groupbuy-discount-desc', label: 'Groupés' },
  { key: 'name-asc', label: 'Nouveauté' },
]

export default function CatalogToolbar({
  count,
  sort,
  onSortChange,
  view,
  onViewChange,
  onOpenMobileFilters,
}: Props) {
  const isPriceAsc = sort === 'price-asc'
  const isPriceDesc = sort === 'price-desc'
  const isPrice = isPriceAsc || isPriceDesc

  return (
    <div className="flex items-center justify-between mb-3 bg-white border border-slate-100 rounded-lg px-3 py-0 overflow-hidden">
      {/* Left: count */}
      <span className="text-xs text-slate-500 py-2 flex-shrink-0">
        <strong className="text-slate-900">{count.toLocaleString('fr-FR')}</strong> produits
      </span>

      <div className="flex items-center gap-1">
        {/* Sort tabs - underline active style */}
        <div className="flex items-center h-full">
          {tabs.map((tab) => {
            if (tab.key === 'price') {
              return (
                <button
                  key={tab.key}
                  onClick={() => onSortChange(isPriceAsc ? 'price-desc' : 'price-asc')}
                  className={`relative flex items-center gap-0.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    isPrice
                      ? 'text-orange-600 border-orange-500'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  <span className="flex flex-col -space-y-1">
                    <ChevronUp className={`w-3 h-3 ${isPriceAsc ? 'text-orange-600' : 'text-slate-300'}`} />
                    <ChevronDown className={`w-3 h-3 ${isPriceDesc ? 'text-orange-600' : 'text-slate-300'}`} />
                  </span>
                </button>
              )
            }
            const active = sort === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onSortChange(tab.key)}
                className={`relative px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  active
                    ? 'text-orange-600 border-orange-500'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* View toggle */}
        <div className="hidden md:flex items-center gap-0.5">
          <button
            onClick={() => onViewChange('grid')}
            className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'text-orange-500' : 'text-slate-400 hover:text-slate-700'}`}
            aria-label="Vue grille"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`p-1.5 rounded transition-colors ${view === 'list' ? 'text-orange-500' : 'text-slate-400 hover:text-slate-700'}`}
            aria-label="Vue liste"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile filter button */}
        <button
          onClick={onOpenMobileFilters}
          className="md:hidden flex items-center gap-1 px-2 py-1 border border-slate-200 rounded text-xs text-slate-600"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filtres
        </button>
      </div>
    </div>
  )
}
