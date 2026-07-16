'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Camera, X, Clock, TrendingUp } from 'lucide-react'
import { trackEvent } from '@/utils/analytics'

const RECENT_KEY = 'search:recent'
const MAX_RECENT = 6

export interface SearchSuggestion {
  id: string
  slug: string
  name: string
  image: string
  category: string
  price: number | null
  currency: string
  stockStatus?: string
}

interface SearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSearch: (term: string) => void
  onCameraClick?: () => void
  onSelect?: (suggestion: SearchSuggestion) => void
  placeholder?: string
}

function formatPrice(price: number | null, currency: string) {
  if (price === null || Number.isNaN(price)) return 'Sur devis'
  return `${Math.round(price).toLocaleString('fr-FR')} ${currency}`
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  onCameraClick,
  onSelect,
  placeholder = 'Rechercher un produit...',
}: SearchAutocompleteProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [trending, setTrending] = useState<SearchSuggestion[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw))
    } catch {}
  }, [])

  const saveRecent = useCallback((term: string) => {
    if (typeof window === 'undefined' || !term.trim()) return
    try {
      setRecent((prev) => {
        const next = [term.trim(), ...prev.filter((t) => t !== term.trim())].slice(0, MAX_RECENT)
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
        return next
      })
    } catch {}
  }, [])

  const clearRecent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window === 'undefined') return
    localStorage.removeItem(RECENT_KEY)
    setRecent([])
  }, [])

  // Fetch suggestions and trending
  useEffect(() => {
    if (!isOpen) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    const fetchSuggestions = async () => {
      if (value.trim().length < 2) {
        setSuggestions([])
        return
      }

      setLoading(true)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(
          `/api/catalog/search/suggestions?q=${encodeURIComponent(value.trim())}&limit=8`,
          { signal: controller.signal }
        )
        const data = await res.json().catch(() => ({}))
        setSuggestions(data.suggestions || [])
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    }

    debounceRef.current = setTimeout(fetchSuggestions, 180)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [value, isOpen])

  // Fetch trending once on open
  useEffect(() => {
    if (!isOpen || trending.length > 0) return
    let cancelled = false
    const controller = new AbortController()

    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/catalog/search/suggestions?trendingLimit=6', {
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (!cancelled) setTrending(data.trending || [])
      } catch (err: any) {
        if (err.name !== 'AbortError') setTrending([])
      }
    }

    fetchTrending()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, trending.length])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleSearch = useCallback((term: string) => {
    const clean = term.trim()
    if (!clean) return
    saveRecent(clean)
    trackEvent('search', { search_term: clean })
    onSearch(clean)
    setIsOpen(false)
    inputRef.current?.blur()
  }, [onSearch, saveRecent])

  const handleSelect = useCallback((suggestion: SearchSuggestion) => {
    saveRecent(suggestion.name)
    trackEvent('select_content', { content_type: 'product', item_id: suggestion.id })
    if (onSelect) {
      onSelect(suggestion)
    } else {
      router.push(`/produits/${suggestion.slug || suggestion.id}`)
    }
    setIsOpen(false)
  }, [onSelect, router, saveRecent])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = value.trim().length >= 2
      ? suggestions
      : [...recent.map((r) => ({ type: 'recent' as const, label: r })), ...trending]

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < items.length) {
        const item = items[activeIndex]
        if ('type' in item && item.type === 'recent') {
          handleSearch(item.label)
        } else if ('id' in item) {
          handleSelect(item as SearchSuggestion)
        }
      } else {
        handleSearch(value)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }, [activeIndex, handleSearch, handleSelect, recent, suggestions, trending, value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setActiveIndex(-1)
    if (!isOpen) setIsOpen(true)
  }, [onChange, isOpen])

  const handleFocus = useCallback(() => {
    setIsOpen(true)
    setActiveIndex(-1)
  }, [])

  const handleRecentClick = useCallback((term: string) => {
    onChange(term)
    handleSearch(term)
  }, [handleSearch, onChange])

  const showSuggestions = value.trim().length >= 2

  const allItems = useMemo(() => {
    if (showSuggestions) return suggestions
    return [...recent.map((label) => ({ type: 'recent' as const, label })), ...trending]
  }, [recent, showSuggestions, suggestions, trending])

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-3 flex-shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 outline-none bg-transparent px-2 text-sm min-w-0 dark:text-slate-200"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="search-autocomplete-list"
          aria-expanded={isOpen}
        />
        {onCameraClick && (
          <button
            type="button"
            title="Recherche par image"
            onClick={onCameraClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full flex-shrink-0"
          >
            <Camera className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </button>
        )}
        <button
          type="button"
          onClick={() => handleSearch(value)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full text-sm font-medium flex-shrink-0"
        >
          Rechercher
        </button>
      </div>

      {isOpen && (
        <div
          id="search-autocomplete-list"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 max-h-[70vh] overflow-y-auto"
        >
          {showSuggestions ? (
            <>
              {loading && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Recherche en cours...
                </div>
              )}
              {!loading && suggestions.length === 0 && value.trim().length >= 2 && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Aucun produit trouvé pour “{value}”
                </div>
              )}
              {suggestions.length > 0 && (
                <ul className="py-2">
                  {suggestions.map((s, idx) => (
                    <li
                      key={s.id}
                      role="option"
                      aria-selected={activeIndex === idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(s)}
                      className={`px-4 py-2 flex items-center gap-3 cursor-pointer ${
                        activeIndex === idx
                          ? 'bg-orange-50 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <img
                        src={s.image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-900 flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {s.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {s.category}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        {formatPrice(s.price, s.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="py-2">
              {recent.length > 0 && (
                <div className="mb-1">
                  <div className="flex items-center justify-between px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Historique
                    </span>
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="flex items-center gap-1 text-red-500 hover:text-red-600"
                    >
                      <X className="w-3 h-3" /> Effacer
                    </button>
                  </div>
                  <ul>
                    {recent.map((term, idx) => (
                      <li
                        key={term}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleRecentClick(term)}
                        className={`px-4 py-2 text-sm cursor-pointer ${
                          activeIndex === idx
                            ? 'bg-orange-50 dark:bg-slate-700'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {term}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {trending.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Tendances
                  </div>
                  <ul>
                    {trending.map((s, idx) => {
                      const index = recent.length + idx
                      return (
                        <li
                          key={s.id}
                          role="option"
                          aria-selected={activeIndex === index}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => handleSelect(s)}
                          className={`px-4 py-2 flex items-center gap-3 cursor-pointer ${
                            activeIndex === index
                              ? 'bg-orange-50 dark:bg-slate-700'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <img
                            src={s.image}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover bg-slate-100 dark:bg-slate-900 flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {s.category}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                            {formatPrice(s.price, s.currency)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {recent.length === 0 && trending.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Commencez à taper pour rechercher un produit
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
