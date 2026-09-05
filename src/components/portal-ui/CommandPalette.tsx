'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface PaletteItem {
  id: string
  label: string
  hint?: string
  icon?: LucideIcon
  keywords?: string[]
  href?: string
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()


export function CommandPalette({
  open,
  onClose,
  onSelect,
  items,
  placeholder = 'Rechercher une page, une action…',
}: {
  open: boolean
  onClose: () => void
  onSelect: (item: PaletteItem) => void
  items: PaletteItem[]
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return items
    return items.filter(i =>
      normalize(`${i.label} ${(i.keywords || []).join(' ')}`).includes(q)
    )
  }, [query, items])

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => { setIndex(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-palette-item="${index}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [index])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[index]
        if (item) { onSelect(item); onClose() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, index, onClose, onSelect])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh] sm:pt-[14vh]">
      <div className="fixed inset-0 bg-emerald-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-stone-100 px-4">
          <Search className="h-4 w-4 flex-shrink-0 text-stone-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent py-3.5 text-sm text-stone-900 outline-none placeholder:text-stone-400"
          />
          <kbd className="hidden sm:inline-flex flex-shrink-0 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-400">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-stone-400">Aucun résultat pour « {query} »</p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  data-palette-item={i}
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => { onSelect(item); onClose() }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    i === index ? 'bg-emerald-50 text-emerald-900' : 'text-stone-700'
                  }`}
                >
                  {Icon && (
                    <Icon className={`h-4 w-4 flex-shrink-0 ${i === index ? 'text-emerald-600' : 'text-stone-400'}`} />
                  )}
                  <span className="flex-1 truncate font-medium">{item.label}</span>
                  {item.hint && <span className="flex-shrink-0 text-xs text-stone-400">{item.hint}</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
