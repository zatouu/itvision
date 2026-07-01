'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Search, Tag, X } from 'lucide-react'

export interface CategoryOption {
  category: string
  label?: string
  name?: string
  icon?: string
  color?: string
  count?: number
  subCategories?: Array<{ slug: string; name: string; label?: string; icon?: string }>
}

interface CategorySelectProps {
  value: string
  options: CategoryOption[]
  onChange: (value: string) => void
  placeholder?: string
  allowEmpty?: boolean
  emptyLabel?: string
  showSubCategories?: boolean
  showCounts?: boolean
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function CategorySelect({
  value,
  options,
  onChange,
  placeholder = 'Choisir une catégorie',
  allowEmpty = true,
  emptyLabel = '— Aucune catégorie —',
  showSubCategories = true,
  showCounts = true,
  className = '',
  disabled = false,
  size = 'md'
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLabel = useMemo(() => {
    if (!value) return ''
    for (const opt of options) {
      if (opt.category === value) return opt.label || opt.name || value
      if (showSubCategories) {
        for (const sub of opt.subCategories || []) {
          if (sub.slug === value) return sub.label || sub.name || sub.slug
        }
      }
    }
    return value
  }, [value, options, showSubCategories])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options
      .map((opt) => {
        const selfLabel = (opt.label || opt.name || opt.category).toLowerCase()
        const matchSelf = selfLabel.includes(q)
        const matchedSubs = (opt.subCategories || []).filter((sub) =>
          (sub.label || sub.name || sub.slug).toLowerCase().includes(q)
        )
        if (matchSelf) return opt
        if (matchedSubs.length > 0) return { ...opt, subCategories: matchedSubs }
        return null
      })
      .filter(Boolean) as CategoryOption[]
  }, [options, search])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (isOpen && value) {
      const parent = options.find((opt) => opt.subCategories?.some((s) => s.slug === value))
      if (parent) {
        setExpanded((prev) => new Set(prev).add(parent.category))
      }
    }
  }, [isOpen, value, options])

  const heightClass = size === 'sm' ? 'h-9' : 'h-10'
  const textClass = size === 'sm' ? 'text-sm' : 'text-sm'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left transition hover:border-emerald-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 ${heightClass} ${textClass} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <span className="flex items-center gap-1">
          {value && allowEmpty && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="rounded p-0.5 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une catégorie..."
                className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-auto p-1">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${!value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {emptyLabel}
              </button>
            )}

            {filtered.length === 0 && (
              <div className="px-2 py-3 text-center text-sm text-gray-500">Aucune catégorie trouvée</div>
            )}

            {filtered.map((opt) => {
              const isSelected = value === opt.category
              const hasSubs = showSubCategories && (opt.subCategories?.length || 0) > 0
              const isExpanded = expanded.has(opt.category)

              return (
                <div key={opt.category}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasSubs) {
                        onChange(opt.category)
                        setIsOpen(false)
                      }
                    }}
                    className={`group flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="flex items-center gap-2">
                      {hasSubs ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpanded((prev) => {
                              const n = new Set(prev)
                              if (n.has(opt.category)) {
                                n.delete(opt.category)
                              } else {
                                n.add(opt.category)
                              }
                              return n
                            })
                          }}
                          className="rounded p-0.5 hover:bg-gray-200"
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </span>
                      ) : (
                        <Tag className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium">{opt.label || opt.name || opt.category}</span>
                      {showCounts && typeof opt.count === 'number' && (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{opt.count}</span>
                      )}
                    </span>
                    {!hasSubs && isSelected && <span className="text-emerald-600">✓</span>}
                  </button>

                  {hasSubs && isExpanded && (
                    <div className="ml-4 border-l border-gray-100 pl-2">
                      {opt.subCategories?.map((sub) => {
                        const isSubSelected = value === sub.slug
                        return (
                          <button
                            key={sub.slug}
                            type="button"
                            onClick={() => {
                              onChange(sub.slug)
                              setIsOpen(false)
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${isSubSelected ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 text-gray-400" />
                              <span>{sub.label || sub.name || sub.slug}</span>
                            </span>
                            {isSubSelected && <span className="text-emerald-600">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
