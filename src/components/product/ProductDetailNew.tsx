'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'
import {
  ChevronDown, ChevronRight, CheckCircle, Package, Truck,
  Eye, TrendingUp, ShieldCheck, Info, Minus, Plus,
  MessageCircle, ShoppingCart, Star, Plane, Ship, Lock, RefreshCw,
} from 'lucide-react'
import { trackEvent } from '@/utils/analytics'
import { useToast } from '@/components/ui/Toaster'

import {
  ProductDetailData, SimilarProductSummary,
  formatCurrency,
} from './types'
import ProductGallery from './ProductGallery'
import VariantSelectors from './VariantSelectors'
import StickyPriceBar from './StickyPriceBar'
import MobileBottomBar from './MobileBottomBar'
import ProductReviews from '@/components/ProductReviews'
import ProductQnA from './ProductQnA'

interface Props { product: ProductDetailData; similar: SimilarProductSummary[] }

const parseMarkdown = (text: string): string => {
  if (!text) return ''
  const sections = text.split(/\n\n+/)
  const htmlParts: string[] = []
  let specRows: string[] = []
  const flushSpecs = () => {
    if (specRows.length > 0) { htmlParts.push('<table class="w-full text-sm border-collapse mb-4"><tbody>' + specRows.join('') + '</tbody></table>'); specRows = [] }
  }
  for (const section of sections) {
    const t = section.trim()
    if (!t) continue
    if (/^\*\*[^*]+\*\*$/.test(t)) { flushSpecs(); htmlParts.push(`<h3 class="text-base font-semibold text-gray-900 dark:text-slate-200 mt-4 mb-2">${t.replace(/\*\*/g, '')}</h3>`); continue }
    if (/^- \*\*/.test(t)) {
      for (const line of t.split('\n')) {
        const m = line.match(/^- \*\*(.+?)\*\*:\s*(.+)$/)
        if (m) { const bg = specRows.length % 2 === 0 ? 'bg-gray-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'; specRows.push(`<tr class="${bg}"><td class="py-2 px-3 text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap border-b border-gray-100 dark:border-slate-700">${m[1]}</td><td class="py-2 px-3 text-gray-900 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700">${m[2]}</td></tr>`) }
      }
      continue
    }
    flushSpecs()
    htmlParts.push(`<p class="text-sm text-gray-700 dark:text-slate-300 leading-relaxed mb-3">${t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}</p>`)
  }
  flushSpecs()
  return htmlParts.join('\n')
}

// Small spinner component
function LoaderSpinner() {
  return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '221774133440'

export default function ProductDetailNew({ product, similar }: Props) {
  const { addToast } = useToast()
  const baseGallery = product.gallery?.length ? product.gallery : [product.image || '/placeholder.svg']
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    product.variantGroups?.forEach(g => { const d = g.variants.find(v => v.isDefault) || g.variants[0]; if (d) initial[g.name] = d.id })
    return initial
  })
  const [quantity, setQuantity] = useState(1)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(
    () => {
      const first = product.pricing.shippingOptions?.[0]
      return first ? first.id : null
    }
  )
  const [isFavorite, setIsFavorite] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [activeTab, setActiveTab] = useState<'description'|'specs'|'shipping'|'reviews'|'qa'>('description')
  const [showPriceDetails, setShowPriceDetails] = useState(false)
  const [adding, setAdding] = useState(false)
  const [productReviewStats, setProductReviewStats] = useState<{ rating: number; reviewCount: number }>({ rating: 0, reviewCount: 0 })

  useEffect(() => {
    let cancelled = false
    fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}&limit=1`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && d?.success && d?.stats) {
          setProductReviewStats({ rating: d.stats.avgRating || 0, reviewCount: d.stats.total || 0 })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [product.id])

  const stats = useMemo(() => ({
    rating: productReviewStats.rating,
    reviewCount: productReviewStats.reviewCount,
    soldToday: 0,
    liveViewers: 0,
  }), [productReviewStats])

  const gallery = useMemo(() => {
    const vi = product.variantGroups?.flatMap(g => g.variants).find(v => Object.values(selectedVariants).includes(v.id))?.image
    return (vi && !baseGallery.includes(vi)) ? [vi, ...baseGallery] : baseGallery
  }, [selectedVariants, product.variantGroups, baseGallery])

  const baseUnitPrice = product.pricing.totalWithFees ?? product.pricing.salePrice ?? 0
  const originalPrice = product.pricing.baseCost ? Math.round(baseUnitPrice * 1.35) : null
  const discountPercent = originalPrice ? Math.round((1 - baseUnitPrice / originalPrice) * 100) : 0

  const comboPrice = useMemo(() => {
    let maxPrice = 0, hasPrice = false
    for (const g of product.variantGroups ?? []) {
      const vid = selectedVariants[g.name]
      if (!vid) continue
      const v = g.variants.find(x => x.id === vid)
      if (v?.priceFCFA && v.priceFCFA > 0) { maxPrice = Math.max(maxPrice, v.priceFCFA); hasPrice = true }
    }
    return hasPrice ? maxPrice : baseUnitPrice
  }, [selectedVariants, product.variantGroups, baseUnitPrice])

  const totalProductPrice = comboPrice * quantity

  const shippingEstimate = useMemo(() => {
    if (!selectedShippingId) return null
    const opt = product.pricing.shippingOptions.find((s: any) => s.id === selectedShippingId)
    if (!opt) return null
    return {
      cost: (opt.cost || 0) * quantity,
      method: opt.label,
      label: `${quantity} unité${quantity > 1 ? 's' : ''}`,
    }
  }, [selectedShippingId, quantity, product.pricing.shippingOptions])

  const grandTotal = totalProductPrice + (shippingEstimate?.cost ?? 0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const currency = product.pricing.currency || 'XOF'
    trackEvent('view_item', {
      currency,
      value: comboPrice,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category || undefined,
        price: comboPrice,
        quantity: 1,
      }],
    })
  }, [product.id, comboPrice])

  useEffect(() => { const onScroll = () => setShowStickyBar(window.scrollY > 500); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])
  useEffect(() => { if (typeof window === 'undefined') return; try { const favs = JSON.parse(localStorage.getItem('wishlist:items') || '[]'); setIsFavorite(favs.includes(product.id)) } catch { setIsFavorite(false) } }, [product.id])

  const handleVariantSelect = useCallback((groupName: string, variantId: string) => {
    const wasSelected = selectedVariants[groupName] === variantId
    setSelectedVariants(prev => { if (wasSelected) { const n = { ...prev }; delete n[groupName]; return n } return { ...prev, [groupName]: variantId } })
  }, [selectedVariants])

  const toggleFavorite = useCallback(() => {
    if (typeof window === 'undefined') return
    try { const favs = JSON.parse(localStorage.getItem('wishlist:items') || '[]'); if (isFavorite) { localStorage.setItem('wishlist:items', JSON.stringify(favs.filter((id: string) => id !== product.id))); setIsFavorite(false) } else { favs.push(product.id); localStorage.setItem('wishlist:items', JSON.stringify(favs)); setIsFavorite(true) } window.dispatchEvent(new CustomEvent('wishlist:updated')) } catch {}
  }, [isFavorite, product.id])

  const addToCart = useCallback((redirect = false) => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const currency = product.pricing.currency
      const selectedList = (product.variantGroups ?? []).flatMap(g => {
        const vid = selectedVariants[g.name]
        if (!vid) return []
        const v = g.variants.find(x => x.id === vid)
        return v ? [{ groupName: g.name, variant: v }] : []
      })
      const variantIds = selectedList.map(x => x.variant.id)
      const variantLabels = selectedList.map(x => x.variant.name)
      const dedupeKey = [product.id, ...variantIds.sort(), selectedShippingId || ''].join('|')
      const existingIndex = items.findIndex((item: any) => {
        const existingVariantIds = Array.isArray(item.variantIds) ? item.variantIds.slice().sort() : []
        const itemKey = [item.id, ...existingVariantIds, item.shipping?.id || ''].join('|')
        return itemKey === dedupeKey
      })

      // Vérification du stock (frontend, avant appel API)
      const currentCartQty = items.reduce((sum: number, item: any) => {
        if (item.id !== product.id) return sum
        const itemVariantIds = Array.isArray(item.variantIds) ? item.variantIds.slice().sort() : []
        const sameVariant = itemVariantIds.join('|') === variantIds.slice().sort().join('|')
        return sameVariant ? sum + (item.qty || 1) : sum
      }, 0)
      const totalRequestedQty = currentCartQty + quantity
      const selectedVariantsWithStock = selectedList
        .map(x => x.variant.stock)
        .filter((s): s is number => typeof s === 'number')
      const variantStock = selectedVariantsWithStock.length > 0
        ? Math.min(...selectedVariantsWithStock)
        : null
      const availableStock = variantStock !== null ? variantStock : (product.availability.stockQuantity || 0)
      if (product.availability.status === 'out_of_stock' || availableStock <= 0) {
        addToast('Ce produit est actuellement en rupture de stock', 'error')
        return
      }
      if (totalRequestedQty > availableStock) {
        addToast(`Stock insuffisant. Disponible: ${availableStock} unité${availableStock > 1 ? 's' : ''} (dont ${currentCartQty} déjà dans le panier)`, 'error')
        return
      }

      const selectedShipping = product.pricing.shippingOptions?.find((s: any) => s.id === selectedShippingId)
      const shippingMeta = selectedShipping ? {
        id: selectedShipping.id,
        label: selectedShipping.label,
        durationDays: selectedShipping.durationDays,
        cost: selectedShipping.cost,
        currency: selectedShipping.currency
      } : undefined
      if (existingIndex >= 0) {
        items[existingIndex].qty += quantity
      } else {
        const combinedLabel = selectedList.map(x => x.variant.name).join(' · ')
        items.push({
          id: product.id,
          name: selectedList.length > 0 ? `${product.name} — ${combinedLabel}` : product.name,
          qty: quantity,
          price: comboPrice,
          currency,
          requiresQuote: !!product.requiresQuote,
          variantIds: variantIds.length > 0 ? variantIds : undefined,
          variantLabels: variantLabels.length > 0 ? variantLabels : undefined,
          shipping: shippingMeta
        })
      }
      window.localStorage.setItem('cart:items', JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('cart:updated'))
      trackEvent('add_to_cart', {
        currency,
        value: comboPrice * quantity,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_category: product.category || undefined,
          item_variant: variantLabels.join(' · ') || undefined,
          price: comboPrice,
          quantity,
        }],
      })
      addToast(`${product.name} (${quantity} unité${quantity > 1 ? 's' : ''}) ajouté au panier`, 'success')
      if (redirect) setTimeout(() => { window.location.href = '/panier' }, 200)
    } finally { setAdding(false) }
  }, [product, quantity, comboPrice, selectedShippingId, selectedVariants, addToast])

  const whatsappUrl = () => {
    const selectedList = (product.variantGroups ?? []).flatMap(g => { const vid = selectedVariants[g.name]; if (!vid) return []; const v = g.variants.find(x => x.id === vid); return v ? [v.name] : [] })
    const variantInfo = selectedList.length > 0 ? `\nVariante: ${selectedList.join(' · ')}` : ''
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Bonjour, je souhaite un devis pour: ${product.name}.${variantInfo}\nQuantité: ${quantity}.\nMerci de me recontacter.`)}`
  }

  const getShippingIcon = (id?: string) => { if (!id) return Plane; if (id.includes('sea')) return Ship; if (id.includes('truck')) return Truck; return Plane }

  const tabs = [
    { id: 'description' as const, label: 'Description' },
    { id: 'specs' as const, label: 'Spécifications' },
    { id: 'shipping' as const, label: 'Expédition' },
    { id: 'reviews' as const, label: `Avis${stats.reviewCount > 0 ? ` (${stats.reviewCount})` : ''}` },
    { id: 'qa' as const, label: 'Q&A' },
  ]

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen pb-32 lg:pb-0">
      <StickyPriceBar productName={product.name} gallery={gallery} comboPrice={comboPrice} show={showStickyBar} onAddToCart={() => addToCart(false)} onBuyNow={() => addToCart(true)} />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 mb-4 flex-wrap">
          <Link href="/" className="hover:text-emerald-600">Accueil</Link><ChevronRight className="w-3 h-3" />
          <Link href="/produits" className="hover:text-emerald-600">Produits</Link>
          {product.category && (<><ChevronRight className="w-3 h-3" /><span className="text-gray-900 dark:text-slate-300 font-medium">{product.category}</span></>)}
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0">
            <ProductGallery productName={product.name} gallery={gallery} isImported={product.isImported} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} onShare={() => {}} />

            <button className="mt-3 w-full py-2.5 border-2 border-violet-200 dark:border-violet-900 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              Trouver des produits similaires par photo
            </button>

            {/* Tabs */}
            <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-xl z-10">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("flex-1 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap", activeTab === tab.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300")}>{tab.label}</button>
                ))}
              </div>
              <div className="p-5">
                {activeTab === 'description' && (product.description ? <div className="dark:text-slate-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(product.description) }} /> : <p className="text-gray-500 dark:text-slate-400 italic">Description détaillée disponible sur demande.</p>)}
                {activeTab === 'specs' && (
                  <div className="grid md:grid-cols-2 gap-3">
                    {product.features.filter(Boolean).map((f, i) => (<div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span className="text-gray-700 dark:text-slate-300 text-sm">{f}</span></div>))}
                    {product.logistics.dimensions && (<div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm col-span-2 text-gray-700 dark:text-slate-300"><Package className="w-4 h-4 text-blue-500" /><span>{product.logistics.dimensions.lengthCm} × {product.logistics.dimensions.widthCm} × {product.logistics.dimensions.heightCm} cm</span></div>)}
                  </div>
                )}
                {activeTab === 'shipping' && (
                  <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg"><Truck className="w-5 h-5 text-blue-600 mt-0.5" /><div><p className="font-medium text-gray-900 dark:text-slate-200">Transport international vers Sénégal</p><p className="text-gray-600 dark:text-slate-400 mt-1">Délai estimé: {product.availability.leadTimeDays ?? 15} jours ouvrés</p></div></div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {product.pricing.shippingOptions.map((opt: any) => {
                        const Icon = getShippingIcon(opt.id)
                        return (
                          <div key={opt.id} className={clsx("p-3 rounded-lg border", selectedShippingId === opt.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800')}>
                            <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4 text-gray-500 dark:text-slate-400" /><span className="font-medium text-gray-900 dark:text-slate-200">{opt.label}</span></div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{opt.deliveryDays ? `${opt.deliveryDays} jours` : 'Délai variable'}</p>
                            <p className="text-sm font-bold text-emerald-600 mt-1">{typeof opt.cost === 'number' ? `${opt.cost.toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm">
                      <Info className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-200">À propos des délais</p>
                        <p className="text-gray-600 dark:text-slate-400 mt-1">Les délais sont indicatifs et peuvent varier selon la disponibilité fournisseur et la douane. Pour les produits en stock à Dakar, la livraison est généralement sous 24-72h.</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'reviews' && (
                  <ProductReviews productId={product.id} />
                )}
                {activeTab === 'qa' && (
                  <ProductQnA productId={product.id} />
                )}
              </div>
            </div>

            {/* Cross-sell / Frequently bought together */}
            {similar.length > 1 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200 mb-4">Souvent achetés ensemble</h2>
                <div className="space-y-3">
                  {similar.slice(0, 3).map((item, i) => (
                    <Link key={item.id} href={`/produits/${item.id}`} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 hover:border-emerald-300 hover:shadow-md transition group">
                      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-50 dark:bg-slate-700 rounded-lg overflow-hidden">
                        <Image src={item.image || '/placeholder.svg'} alt={item.name} fill className="object-cover p-1 group-hover:scale-105 transition" sizes="64px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-200 line-clamp-2">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-emerald-600 font-bold text-sm">{formatCurrency(item.priceAmount) || 'Sur devis'}</span>
                          {item.deliveryDays && <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.deliveryDays}j</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Products */}
            {similar.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200 mb-4">Produits similaires</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {similar.slice(0, 6).map(item => (
                    <Link key={item.id} href={`/produits/${item.id}`} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-emerald-300 hover:shadow-md transition group flex flex-col">
                      <div className="relative aspect-square bg-gray-50 dark:bg-slate-700"><Image src={item.image || '/placeholder.svg'} alt={item.name} fill className="object-cover p-3 group-hover:scale-105 transition" sizes="(max-width: 640px) 50vw, 33vw" /></div>
                      <div className="p-3 flex-1 flex flex-col">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-200 line-clamp-2 mb-1">{item.name}</h4>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-emerald-600 font-bold text-sm">{formatCurrency(item.priceAmount) || 'Sur devis'}</span>
                          {item.deliveryDays && <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.deliveryDays}j</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full lg:w-[460px] flex-shrink-0">
            <div className="lg:sticky lg:top-4 space-y-4">

              {/* Header */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full"><ShieldCheck className="w-3 h-3" />DDM+ · Import direct</span>
                  <span className={clsx("text-xs font-medium px-2 py-1 rounded-full", product.availability.status === 'in_stock' ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400")}>{product.availability.label}</span>
                  {product.isImported && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-full">
                      <Ship className="w-3 h-3" />Import Chine
                    </span>
                  )}
                  {!product.isImported && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                      <Package className="w-3 h-3" />Stock Dakar
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-200 leading-tight">{product.name}</h1>
                {product.tagline && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{product.tagline}</p>}
                {(stats.rating > 0 || stats.reviewCount > 0) && (
                  <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                    {stats.rating > 0 && (
                      <div className="flex items-center gap-1">{[1,2,3,4,5].map(s => <Star key={s} className={s <= Math.round(stats.rating) ? "w-3.5 h-3.5 text-amber-400 fill-amber-400" : "w-3.5 h-3.5 text-gray-300 dark:text-slate-600"} />)}<span className="font-medium ml-1">{stats.rating}</span></div>
                    )}
                    {stats.reviewCount > 0 && (
                      <><span className="text-gray-300 dark:text-slate-600">·</span><span className="text-gray-600 dark:text-slate-400">{stats.reviewCount} avis</span></>
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {product.availability.stockQuantity > 0 && product.availability.stockQuantity < 20 && (<span className="text-red-600 flex items-center gap-1 font-medium">⚠️ Plus que {product.availability.stockQuantity} en stock</span>)}
                  {product.availability.stockQuantity > 0 && product.availability.stockQuantity >= 20 && (<span className="text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle className="w-3 h-3" /> En stock</span>)}
                </div>
                {product.tags && product.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {product.tags.slice(0, 6).map((tag, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full capitalize">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Block */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-emerald-600">{formatCurrency(comboPrice)}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400">/unité</span>
                  {originalPrice && originalPrice > comboPrice && (<><span className="text-lg text-gray-400 dark:text-slate-500 line-through">{formatCurrency(originalPrice)}</span><span className="text-sm bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">-{discountPercent}%</span></>)}
                </div>

                {/* Price comparison cards */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className={clsx("rounded-lg border p-2 text-center", quantity === 1 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">1 pc</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-200">{formatCurrency(comboPrice)}</p>
                    <p className="text-[10px] text-emerald-600">Actuel</p>
                  </div>
                  {product.b2bPrice && product.b2bPrice > 0 && product.b2bPrice < comboPrice && (
                    <div className={clsx("rounded-lg border p-2 text-center", quantity >= (product.groupBuyMinQty || 5) ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30" : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">Dès {product.groupBuyMinQty || 5} pcs</p>
                      <p className="text-sm font-bold text-violet-600">{formatCurrency(product.b2bPrice)}</p>
                      <p className="text-[10px] text-violet-600">-{Math.round((1 - product.b2bPrice / comboPrice) * 100)}%</p>
                    </div>
                  )}
                  {product.groupBuyEnabled && product.groupBuyBestPrice && product.groupBuyBestPrice < comboPrice && (
                    <div className={clsx("rounded-lg border p-2 text-center", product.groupBuyCurrentQty && product.groupBuyCurrentQty >= (product.groupBuyMinQty || 5) ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">En groupe</p>
                      <p className="text-sm font-bold text-rose-600">{formatCurrency(product.groupBuyBestPrice)}</p>
                      <p className="text-[10px] text-rose-600">Groupe</p>
                    </div>
                  )}
                </div>

                <button onClick={() => setShowPriceDetails(!showPriceDetails)} className="mt-2 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 hover:text-emerald-600">
                  <Info className="w-3 h-3" />Transparence des prix{showPriceDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {showPriceDetails && (product.pricing.baseCost || product.pricing.fees) && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 space-y-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                    {product.pricing.baseCost && (<div className="flex justify-between"><span>Prix source</span><span className="text-gray-600 dark:text-slate-300 font-medium">{formatCurrency(product.pricing.baseCost)}</span></div>)}
                    {product.pricing.fees && (<><div className="flex justify-between"><span>Frais de service ({product.pricing.fees.serviceFeeRate}%)</span><span className="text-gray-600 dark:text-slate-300 font-medium">+{formatCurrency(product.pricing.fees.serviceFeeAmount)}</span></div><div className="flex justify-between"><span>Assurance ({product.pricing.fees.insuranceRate}%)</span><span className="text-gray-600 dark:text-slate-300 font-medium">+{formatCurrency(product.pricing.fees.insuranceAmount)}</span></div></>)}
                  </div>
                )}
              </div>

              {/* Group Buy Banner */}
              {product.groupBuyEnabled && (
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-500 to-teal-600 p-3 text-white shadow-sm overflow-hidden relative">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                  <div className="relative flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">Achat groupé activé</p>
                        <p className="text-[10px] text-white/80 truncate">
                          Dès {product.groupBuyMinQty ?? 5} personnes · Objectif {product.groupBuyTargetQty ?? 20} unités
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold">{formatCurrency(product.groupBuyBestPrice)}</p>
                      <p className="text-[10px] text-white/80">/unité en groupe</p>
                    </div>
                  </div>
                  <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/90 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((product.groupBuyCurrentQty || 0) / (product.groupBuyTargetQty || 1) * 100))}%` }} />
                  </div>
                  <div className="relative mt-2 flex items-center justify-between">
                    <p className="text-[10px] text-white/80">
                      {product.groupBuyCurrentQty || 0} / {product.groupBuyTargetQty || 20} unités engagées
                    </p>
                    <p className="text-[10px] text-white/80">
                      {product.groupBuyDiscount ? `-${Math.round(product.groupBuyDiscount)}% de réduction` : ''}
                    </p>
                  </div>
                  <div className="relative mt-2 flex gap-2">
                    <Link
                      href={`/achats-groupes?productId=${product.id}`}
                      className="flex-1 text-center bg-white text-emerald-700 hover:bg-white/90 text-xs font-bold py-1.5 rounded-lg transition"
                    >
                      Rejoindre
                    </Link>
                    <Link
                      href={`/achats-groupes/nouveau?productId=${product.id}`}
                      className="flex-1 text-center bg-white/15 hover:bg-white/25 text-white text-xs font-bold py-1.5 rounded-lg transition"
                    >
                      Créer
                    </Link>
                  </div>
                </div>
              )}

              {/* Variants + Quantity */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <VariantSelectors variantGroups={product.variantGroups} selectedVariants={selectedVariants} onSelect={handleVariantSelect} />
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-2">Quantité</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:border-emerald-400 transition"><Minus className="w-4 h-4 text-gray-600 dark:text-slate-400" /></button>
                    <span className="w-16 text-center font-bold text-gray-900 dark:text-slate-200">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:border-emerald-400 transition"><Plus className="w-4 h-4 text-gray-600 dark:text-slate-400" /></button>
                  </div>
                  {product.priceTiers && product.priceTiers.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {product.priceTiers.map((tier, i) => (
                        <button key={i} onClick={() => setQuantity(tier.minQty)} className={clsx("flex-shrink-0 px-3 py-2 rounded-lg border-2 text-center transition", quantity >= tier.minQty ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-slate-700 hover:border-emerald-300")}>
                          <p className="text-xs font-bold text-gray-900 dark:text-slate-200">{tier.minQty}{tier.maxQty ? `-${tier.maxQty}` : '+'}</p>
                          <p className="text-xs text-emerald-600 font-bold">{formatCurrency(tier.price)}/pc</p>
                          {tier.discount && <p className="text-[10px] text-red-500">-{tier.discount}%</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Cards */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-2">Transport</p>
                <div className="space-y-2">
                  {product.pricing.shippingOptions.map((opt: any) => {
                    const Icon = getShippingIcon(opt.id)
                    return (
                      <button key={opt.id} onClick={() => setSelectedShippingId(opt.id)} className={clsx("w-full flex items-center gap-3 p-3 rounded-lg border-2 transition text-left", selectedShippingId === opt.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-slate-700 hover:border-emerald-300")}>
                        <Icon className="w-5 h-5 text-gray-500 dark:text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-slate-200">{opt.label}</p><p className="text-xs text-gray-500 dark:text-slate-400">{opt.deliveryDays ? `${opt.deliveryDays} jours` : 'Délai variable'}</p></div>
                        <span className="text-sm font-bold text-emerald-600 flex-shrink-0">{typeof opt.cost === 'number' ? `${opt.cost.toLocaleString('fr-FR')} F` : 'Sur devis'}</span>
                      </button>
                    )
                  })}
                </div>
                {shippingEstimate && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                    <p className="text-gray-700 dark:text-slate-300">Transport: <span className="font-medium dark:text-slate-200">{shippingEstimate.method}</span> · {shippingEstimate.label}</p>
                    <p className="text-emerald-600 font-bold mt-1">+ {formatCurrency(shippingEstimate.cost)}</p>
                  </div>
                )}
              </div>

              {/* Total Estimate */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-100">Estimation totale</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{quantity} unité{quantity > 1 ? 's' : ''}</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
                {shippingEstimate && <p className="text-xs text-emerald-100 mt-1">Dont transport: {formatCurrency(shippingEstimate.cost)}</p>}
              </div>

              {/* CTAs */}
              <div className="space-y-2">
                <div className="flex items-stretch gap-2 h-8">
                  <button
                    onClick={() => addToCart(false)}
                    disabled={adding}
                    className="flex-1 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-800 text-orange-600 text-[11px] font-medium transition hover:bg-orange-50 dark:hover:bg-orange-950/30 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 flex items-center justify-center gap-1"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Panier</span>
                    <span className="sm:hidden">Panier</span>
                  </button>
                  <button
                    onClick={() => addToCart(true)}
                    disabled={adding}
                    className="flex-[1.35] rounded-lg bg-emerald-500 text-white text-[11px] font-semibold transition hover:bg-emerald-600 disabled:bg-gray-400 flex items-center justify-center gap-1 shadow-sm"
                  >
                    {adding ? <LoaderSpinner /> : <><ShoppingCart className="w-3.5 h-3.5" />Acheter</>}
                  </button>
                </div>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-7 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition"
                >
                  <MessageCircle className="w-3 h-3" />
                  WhatsApp
                </a>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2">
                {[{ icon: ShieldCheck, label: 'Qualité garantie' }, { icon: Lock, label: 'Paiement sécurisé' }, { icon: RefreshCw, label: 'Satisfait ou remboursé' }].map((b, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                    <b.icon className="w-5 h-5 text-emerald-500 mb-1" />
                    <span className="text-[10px] text-gray-600 dark:text-slate-400 font-medium">{b.label}</span>
                  </div>
                ))}
              </div>

              {/* Supplier */}
              {product.supplier && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-3">Fournisseur</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-lg">🏭</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-200">{product.supplier.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{product.supplier.location} · {product.supplier.yearsInBusiness} ans</p>
                    </div>
                    {product.supplier.verified && <span className="text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Vérifié</span>}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      <MobileBottomBar comboPrice={comboPrice} onWhatsApp={() => window.open(whatsappUrl(), '_blank')} onAddToCart={() => addToCart(false)} onBuyNow={() => addToCart(true)} />
    </div>
  )
}

