'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, ShoppingCart, BarChart3, Heart } from 'lucide-react'
import RetryNotice from '@/components/market/storefront/RetryNotice'
import { mapCatalogItem } from '@/components/market/storefront/data-mappers'
import { useQuickAdd } from '@/components/market/storefront/useQuickAdd'
import { formatFcfa } from '@/components/market/storefront/formatFcfa'
import type { Product } from '@/components/market/storefront/types'

const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700'

export default function WishlistPage() {
  const router = useRouter()
  const { quickAdd, toast } = useQuickAdd()
  const [ids, setIds] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [guest, setGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([])
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    async function load() {
      try {
        const response = await fetch('/api/favorites', { credentials: 'include', signal: controller.signal })
        const isGuest = response.status === 401
        if (!response.ok && !isGuest) throw new Error('Vos favoris sont temporairement indisponibles.')
        const data = isGuest ? { favorites: JSON.parse(localStorage.getItem('wishlist:items') || '[]') } : await response.json()
        if (!Array.isArray(data.favorites)) throw new Error('Impossible de lire vos favoris.')
        const favorites = [...new Set<string>(data.favorites.filter((value: unknown): value is string => typeof value === 'string'))]
        const loaded: Product[] = []
        for (let offset = 0; offset < favorites.length; offset += 50) {
          const params = new URLSearchParams({ ids: favorites.slice(offset, offset + 50).join(','), limit: '50' })
          const catalog = await fetch(`/api/catalog/products?${params}`, { signal: controller.signal })
          if (!catalog.ok) throw new Error('Les produits favoris ne peuvent pas être chargés. Votre liste est conservée.')
          const result = await catalog.json()
          if (!Array.isArray(result.products)) throw new Error('Les informations des produits sont incomplètes.')
          loaded.push(...result.products.map(mapCatalogItem))
        }
        if (controller.signal.aborted) return
        setGuest(isGuest); setIds(favorites); setProducts(loaded); setSelected([])
        try { localStorage.setItem('wishlist:items', JSON.stringify(favorites)); window.dispatchEvent(new CustomEvent('wishlist:updated')) } catch {}
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Favoris indisponibles.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [attempt])

  async function remove() {
    if (removing) return
    setRemoving(true); setActionError(null)
    const removed: string[] = []
    try {
      if (guest) localStorage.setItem('wishlist:items', JSON.stringify(ids.filter(id => !pendingRemoval.includes(id))))
      for (const id of pendingRemoval) {
        if (!guest) {
          const response = await fetch(`/api/favorites?productId=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
          if (!response.ok) throw new Error('La suppression n’a pas pu être terminée. Les favoris restants sont conservés.')
        }
        removed.push(id)
      }
      setPendingRemoval([])
    } catch (failure) { setActionError(failure instanceof Error ? failure.message : 'Suppression impossible.') }
    finally {
      const remaining = ids.filter(id => !removed.includes(id))
      setIds(remaining); setProducts(previous => previous.filter(product => !removed.includes(product.id)))
      setSelected(previous => previous.filter(id => !removed.includes(id)))
      setPendingRemoval(previous => previous.filter(id => !removed.includes(id)))
      try { localStorage.setItem('wishlist:items', JSON.stringify(remaining)); window.dispatchEvent(new CustomEvent('wishlist:updated')) } catch { setActionError('Le stockage local est indisponible. Vos favoris invités ne peuvent pas être conservés sur cet appareil.') }
      setRemoving(false)
    }
  }

  function addSelected() {
    setActionError(null)
    const choices = products.filter(product => selected.includes(product.id))
    if (choices.some(product => product.hasVariants || product.price <= 0 || product.availabilityStatus === 'out_of_stock')) {
      setActionError('Certains produits nécessitent une configuration ou ne sont pas disponibles. Ouvrez leur fiche avant de les ajouter.')
      return
    }
    choices.forEach(quickAdd)
  }

  function compare() {
    if (selected.length < 2 || selected.length > 3) return
    try { localStorage.setItem('compare:ids', selected.join(',')); window.dispatchEvent(new CustomEvent('compare:updated')) } catch {}
    router.push(`/produits/compare?${new URLSearchParams({ ids: selected.join(',') })}`)
  }

  return <div className="min-h-screen bg-zinc-50 pb-28 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link href="/produits" className="inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft size={18} aria-hidden="true"/>Catalogue</Link>
      <h1 className="mt-3 text-2xl font-bold tracking-normal">Mes favoris</h1>
      {loading ? <p role="status" className="py-12 text-sm">Chargement des favoris…</p> : error ? <RetryNotice message={error} onRetry={() => setAttempt(value => value + 1)}/> : <>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{ids.length} favori{ids.length > 1 ? 's' : ''}{guest ? ' sur cet appareil' : ''}</p>
        {actionError && <p role="alert" className="my-4 text-sm text-red-700 dark:text-red-300">{actionError}</p>}
        {ids.length > 0 && <div className="my-5 flex flex-wrap items-center gap-3 border-y border-zinc-200 py-4 dark:border-zinc-800">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={removing || products.length === 0} checked={products.length > 0 && selected.length === products.length} onChange={event => setSelected(event.target.checked ? products.map(product => product.id) : [])} className="h-5 w-5 accent-emerald-700"/>Tout sélectionner</label>
          {selected.length > 0 && <><button disabled={removing} onClick={addSelected} className={buttonClass}><ShoppingCart size={18} aria-hidden="true"/>Ajouter la sélection</button>
          <button disabled={selected.length < 2 || selected.length > 3} onClick={compare} className={buttonClass}><BarChart3 size={18} aria-hidden="true"/>Comparer</button>
          <button disabled={removing} onClick={() => setPendingRemoval(selected)} className={buttonClass}><Trash2 size={18} aria-hidden="true"/>Retirer la sélection</button></>}
          <button disabled={removing} title="Vider la liste" aria-label="Vider la liste" onClick={() => setPendingRemoval(ids)} className={`${buttonClass} ml-auto text-red-700 dark:text-red-300`}><Trash2 size={18} aria-hidden="true"/></button>
        </div>}
        {pendingRemoval.length > 0 && <div role="alert" className="my-4 rounded-lg border border-zinc-300 p-4 text-sm dark:border-zinc-700"><p>Retirer {pendingRemoval.length} favori{pendingRemoval.length > 1 ? 's' : ''} de votre liste ?</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={removing} onClick={remove} className={buttonClass}>{removing ? 'Suppression…' : 'Confirmer la suppression'}</button><button disabled={removing} onClick={() => setPendingRemoval([])} className={buttonClass}>Annuler</button></div></div>}
        {ids.length === 0 ? <div className="py-14"><Heart size={28} className="mb-4 text-emerald-700" aria-hidden="true"/><h2 className="text-lg font-semibold">Aucun favori pour le moment</h2><Link href="/produits" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Explorer le catalogue</Link></div> : <>
          {products.length < ids.length && <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Certains produits de votre liste ne sont plus disponibles.</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <article key={product.id} className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between gap-2"><label className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm"><input type="checkbox" aria-label={`Sélectionner ${product.name}`} checked={selected.includes(product.id)} disabled={removing} onChange={event => setSelected(previous => event.target.checked ? [...previous, product.id] : previous.filter(id => id !== product.id))} className="h-5 w-5 accent-emerald-700"/>Sélectionner</label><button title="Retirer des favoris" aria-label={`Retirer ${product.name} des favoris`} disabled={removing} onClick={() => setPendingRemoval([product.id])} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-red-700 dark:text-red-300"><Trash2 size={18} aria-hidden="true"/></button></div>
            <Link href={`/produits/${product.id}`}><Image src={product.images[0] || '/placeholder.svg'} width={320} height={240} alt={product.name} className="aspect-[4/3] w-full rounded-lg bg-zinc-50 object-contain dark:bg-zinc-800"/><h2 className="mt-3 break-words text-base font-semibold">{product.name}</h2></Link>
            <p className="mt-2 break-words text-lg font-bold tabular-nums">{product.price > 0 ? formatFcfa(product.price) : 'Prix sur demande'}</p><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{product.minOrderQty > 1 ? `Lot minimum : ${product.minOrderQty} pièces` : 'Vendu à l’unité'}</p>
            <button disabled={product.availabilityStatus === 'out_of_stock'} onClick={() => product.hasVariants || product.price <= 0 ? router.push(`/produits/${product.id}`) : quickAdd(product)} className={`${buttonClass} mt-4 w-full`}><ShoppingCart size={18} aria-hidden="true"/>{product.availabilityStatus === 'out_of_stock' ? 'Indisponible' : product.hasVariants || product.price <= 0 ? 'Voir les options' : 'Ajouter au panier'}</button>
          </article>)}</div>
        </>}
      </>}
    </div>{toast}
  </div>
}