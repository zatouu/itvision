'use client'

import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import { LayoutGrid, ChevronDown, ArrowRight, LoaderCircle, RotateCcw } from 'lucide-react'
import { Icon } from '@/components/market/storefront/Icon'
import { mapCategory } from '@/components/market/storefront/data-mappers'

interface Category {
  slug: string
  name: string
  labelFr?: string
  icon?: string
  subCategories?: Category[]
}

export default function CategoryMegaMenu({ embedded = false, onNavigate }: { embedded?: boolean; onNavigate?: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    fetch('/api/catalog/categories', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Categories unavailable')
        const data = await response.json()
        if (!Array.isArray(data.items)) throw new Error('Invalid categories')
        if (!controller.signal.aborted) setCategories(data.items)
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    if (!open || embedded) return
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open, embedded])

  const close = () => { setOpen(false); onNavigate?.() }
  const categoryLink = (category: Category) => `/produits?cat=${encodeURIComponent(category.slug)}`

  return (
    <div ref={containerRef} className="relative min-w-0" onBlur={event => {
      if (!embedded && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
    }}>
      {!embedded && (
        <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <LayoutGrid size={18} />Catégories<ChevronDown size={14} className={open ? 'rotate-180' : ''} />
        </button>
      )}
      {(embedded || open) && (
        <div id={panelId} className={embedded ? 'min-w-0' : 'absolute left-0 top-full z-50 mt-2 w-[min(640px,calc(100vw-2rem))] max-h-[65dvh] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900'}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Par catégorie</h2>
            <Link href="/produits" onClick={close} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">Tout voir<ArrowRight size={14} /></Link>
          </div>
          {loading ? <p role="status" className="flex items-center gap-2 py-4 text-sm text-zinc-500"><LoaderCircle size={18} className="animate-spin" />Chargement des catégories…</p> : error ? (
            <div role="alert" className="text-sm text-zinc-600 dark:text-zinc-300">
              <p>Les catégories sont indisponibles pour le moment.</p>
              <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 flex min-h-11 items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400"><RotateCcw size={16} />Réessayer</button>
            </div>
          ) : categories.length === 0 ? <p className="py-4 text-sm text-zinc-500">Aucune catégorie disponible.</p> : (
            <ul className={embedded ? 'space-y-1' : 'grid items-start gap-x-5 gap-y-1 sm:grid-cols-2'}>
              {categories.map(category => (
                <li key={category.slug} className="min-w-0 border-b border-zinc-100 dark:border-zinc-800">
                  {category.subCategories?.length ? (
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold text-zinc-800 hover:text-emerald-700 dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                        <Icon name={mapCategory(category).icon} size={18} className="shrink-0" /><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{category.labelFr || category.name}</span><ChevronDown size={16} className="shrink-0 group-open:rotate-180" />
                      </summary>
                      <ul className="pb-2 pl-6 text-sm text-zinc-600 dark:text-zinc-300">
                        <li><Link href={categoryLink(category)} onClick={close} className="flex min-h-11 items-center font-semibold text-emerald-700 dark:text-emerald-400">Tout voir : {category.labelFr || category.name}</Link></li>
                        {category.subCategories.map(sub => <li key={sub.slug}><Link href={categoryLink(sub)} onClick={close} className="flex min-h-11 items-center py-2 hover:underline [overflow-wrap:anywhere]">{sub.labelFr || sub.name}</Link></li>)}
                      </ul>
                    </details>
                  ) : <Link href={categoryLink(category)} onClick={close} className="flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-zinc-800 hover:text-emerald-700 dark:text-zinc-100"><Icon name={mapCategory(category).icon} size={18} className="shrink-0" /><span className="[overflow-wrap:anywhere]">{category.labelFr || category.name}</span></Link>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}