'use client'

import { LayoutGrid, List, SlidersHorizontal, ChevronUp, ChevronDown, ArrowDownWideNarrow } from 'lucide-react'

interface Props {
  count: number
  sort: string
  onSortChange: (sort: string) => void
  view: 'grid' | 'list'
  onViewChange: (v: 'grid' | 'list') => void
  onOpenMobileFilters: () => void
  activeFiltersCount?: number
}

const sortOptions = [
  { key: 'default', label: 'Recommandé' },
  { key: 'price-asc', label: 'Prix croissant' },
  { key: 'price-desc', label: 'Prix décroissant' },
  { key: 'rating-desc', label: 'Évaluation' },
  { key: 'groupbuy-discount-desc', label: 'Meilleures économies' },
  { key: 'name-asc', label: 'Nom A-Z' },
  { key: 'name-desc', label: 'Nom Z-A' },
]

export default function CatalogToolbar({
  count,
  sort,
  onSortChange,
  view,
  onViewChange,
  onOpenMobileFilters,
  activeFiltersCount = 0,
}: Props) {
  const isPriceAsc = sort === 'price-asc'
  const isPriceDesc = sort === 'price-desc'
  const isPrice = isPriceAsc || isPriceDesc

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-200">{count.toLocaleString('fr-FR')}</strong> produits
        </span>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline-flex items-center gap-1">
          <ArrowDownWideNarrow className="w-3 h-3" /> Trier
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
        {/* Sort tabs */}
        {sortOptions.map((tab) => {
          if (tab.key === 'price-asc' || tab.key === 'price-desc') return null
          const active = sort === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onSortChange(tab.key)}
              className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                active
                  ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          )
        })}

        {/* Prix toggle asc/desc */}
        <button
          onClick={() => onSortChange(isPriceAsc ? 'price-desc' : 'price-asc')}
          className={`whitespace-nowrap flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            isPrice
              ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          Prix
          <span className="flex flex-col -space-y-1">
            <ChevronUp className={`w-3 h-3 ${isPriceAsc ? 'text-orange-600' : 'text-slate-300 dark:text-slate-600'}`} />
            <ChevronDown className={`w-3 h-3 ${isPriceDesc ? 'text-orange-600' : 'text-slate-300 dark:text-slate-600'}`} />
          </span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

        {/* View toggle */}
        <div className="hidden md:flex items-center gap-0.5">
          <button
            onClick={() => onViewChange('grid')}
            className={`p-1.5 rounded-lg transition-colors border ${view === 'grid' ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 border-orange-200 dark:border-orange-900' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-transparent'}`}
            aria-label="Vue grille"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`p-1.5 rounded-lg transition-colors border ${view === 'list' ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 border-orange-200 dark:border-orange-900' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-transparent'}`}
            aria-label="Vue liste"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile filter button */}
        <button
          onClick={onOpenMobileFilters}
          className="md:hidden relative flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtres
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
