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
    <div className="flex items-center justify-between mb-3 bg-white border border-slate-100 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">
          <strong className="text-slate-900">{count.toLocaleString('fr-FR')}</strong> produits
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Sort tabs - Alibaba style */}
        <div className="flex items-center">
          {tabs.map((tab) => {
            if (tab.key === 'price') {
              return (
                <button
                  key={tab.key}
                  onClick={() => onSortChange(isPriceAsc ? 'price-desc' : 'price-asc')}
                  className={`flex items-center gap-0.5 px-2.5 py-1 text-xs font-medium transition-colors ${
                    isPrice
                      ? 'text-orange-600 bg-orange-50 rounded'
                      : 'text-slate-600 hover:text-slate-900'
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
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'text-orange-600 bg-orange-50 rounded'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* View toggle */}
        <div className="hidden md:flex border border-slate-200 rounded p-0.5">
          <button
            onClick={() => onViewChange('grid')}
            className={`p-1 rounded ${view === 'grid' ? 'bg-slate-100' : ''}`}
            aria-label="Vue grille"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`p-1 rounded ${view === 'list' ? 'bg-slate-100' : ''}`}
            aria-label="Vue liste"
          >
            <List className="w-3.5 h-3.5 text-slate-600" />
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
