'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import {
  Camera, Shield, Lock, Wifi, Bell, Cpu, Sparkles,
  Phone, Mail, CheckCircle, ArrowRight, PackageCheck, MessageCircle,
  Menu, X, ChevronRight, ShoppingBag, Search, Hash, Tag
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import WhatsAppOrderDrawer, { OrderLine } from './WhatsAppOrderDrawer'

// ── Types ──────────────────────────────────────────────
type StockStatus = 'in_stock' | 'preorder' | 'out_of_stock'

interface CorporateProduct {
  id: string
  name: string
  category: string
  description: string
  image?: string
  priceAmount?: number
  currency: string
  features: string[]
  stockStatus: StockStatus
  stockQuantity: number
  availabilityLabel: string
}

// ── Config ────────────────────────────────────────────
const CATEGORIES: Array<{ label: string; icon: LucideIcon; aliases: string[] }> = [
  { label: 'Vidéosurveillance', icon: Camera, aliases: ['Vidéosurveillance', 'Camera', 'Caméra', 'CCTV'] },
  { label: "Contrôle d'accès", icon: Lock, aliases: ["Contrôle d'Accès", "Contrôle d'accès", 'Biométrie'] },
  { label: 'Alarme & détection', icon: Bell, aliases: ['Alarme', 'Alarmes', 'Détection'] },
  { label: 'Réseau & connectivité', icon: Wifi, aliases: ['Réseau', 'Reseau', 'Wifi', 'Switch', 'PoE'] },
  { label: 'Domotique', icon: Cpu, aliases: ['Domotique', 'Smart Home'] },
  { label: 'Gadgets & accessoires', icon: Sparkles, aliases: ['Gadgets', 'Accessoires'] },
  { label: 'Sécurité incendie', icon: Shield, aliases: ['Sécurité incendie', 'Incendie'] },
]

const CATEGORY_ORDER = CATEGORIES.map((c) => c.label)
const CATEGORY_ICONS = Object.fromEntries(CATEGORIES.map((c) => [c.label, c.icon])) as Record<string, LucideIcon>

// ── Helpers ───────────────────────────────────────────
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function stockBadgeClasses(status: StockStatus) {
  if (status === 'in_stock') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (status === 'out_of_stock') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
}

function stockLabelShort(status: StockStatus) {
  if (status === 'in_stock') return 'En stock'
  if (status === 'out_of_stock') return 'Rupture'
  return 'Sur commande'
}

// ── Component ─────────────────────────────────────────
interface Props {
  products: CorporateProduct[]
}

export default function CorporateCatalogClient({ products }: Props) {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLine, setDrawerLine] = useState<OrderLine>({ productId: '', productName: '' })

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CorporateProduct[]>()
    for (const p of products) {
      const list = map.get(p.category) ?? []
      list.push(p)
      map.set(p.category, list)
    }
    return map
  }, [products])

  const allCategories = useMemo(() => {
    return [
      ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
      ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
    ]
  }, [grouped])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const q = normalizeStr(search)
    return products.filter((p) =>
      normalizeStr(p.name).includes(q) ||
      normalizeStr(p.description).includes(q) ||
      normalizeStr(p.category).includes(q) ||
      p.features.some((f) => normalizeStr(f).includes(q))
    )
  }, [products, search])

  const filteredGrouped = useMemo(() => {
    const map = new Map<string, CorporateProduct[]>()
    for (const p of filteredProducts) {
      if (activeCat && p.category !== activeCat) continue
      const list = map.get(p.category) ?? []
      list.push(p)
      map.set(p.category, list)
    }
    return map
  }, [filteredProducts, activeCat])

  const openDrawer = (p: CorporateProduct) => {
    setDrawerLine({
      productId: p.id,
      productName: p.name,
      priceAmount: p.priceAmount,
      currency: p.currency,
      image: p.image,
      quantity: 1,
    })
    setDrawerOpen(true)
  }

  // Scroll spy pour highlight catégorie active dans sidebar
  useEffect(() => {
    if (activeCat || search) return
    const handler = () => {
      const sections = allCategories.map((c) => {
        const el = document.getElementById(`cat-${c.replace(/\s+/g, '-').toLowerCase()}`)
        return el ? { cat: c, top: el.getBoundingClientRect().top } : null
      }).filter(Boolean) as { cat: string; top: number }[]
      const visible = sections.filter((s) => s.top < 200)
      if (visible.length > 0) {
        setActiveCat(visible[visible.length - 1].cat)
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [allCategories, activeCat, search])

  const scrollToCat = (cat: string) => {
    const id = `cat-${cat.replace(/\s+/g, '-').toLowerCase()}`
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveCat(cat)
      setSidebarOpen(false)
    }
  }

  const clearSearch = () => {
    setSearch('')
    setActiveCat(null)
  }

  const totalCount = products.length
  const filteredCount = filteredProducts.length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Header compact ── */}
      <header className="border-b border-gray-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">Catalogue IT Vision</h1>
              <p className="text-[11px] text-gray-400">{filteredCount} équipements · Dakar & commande</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden sm:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une caméra, alarme..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all dark:text-white"
              />
              {search && (
                <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/221781234567?text=${encodeURIComponent('Bonjour IT Vision, je souhaite des informations sur vos équipements.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white hover:bg-[#1ebe5d] transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Devis</span>
            </a>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden mt-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-green-500 transition-all dark:text-white"
            />
            {search && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Layout sidebar + main ── */}
      <div className="mx-auto max-w-7xl flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 px-4">
          <div className="mb-4">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Catégories</h2>
            <button
              onClick={clearSearch}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                !activeCat && !search
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800'
              }`}
            >
              <Tag className="h-4 w-4" />
              Tous les produits
              <span className="ml-auto text-[10px] font-bold bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-gray-500">
                {totalCount}
              </span>
            </button>
          </div>

          <div className="space-y-0.5">
            {allCategories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] ?? Shield
              const count = grouped.get(cat)?.length ?? 0
              const isActive = activeCat === cat && !search
              return (
                <button
                  key={cat}
                  onClick={() => scrollToCat(cat)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{cat}</span>
                  <span className="ml-auto text-[10px] font-bold bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-gray-500">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border border-green-100 dark:border-green-800">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">Besoin d'aide ?</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">Nos experts vous conseillent gratuitement.</p>
            <a
              href={`https://wa.me/221781234567?text=${encodeURIComponent('Bonjour, je souhaite être conseillé pour mon projet.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Discuter sur WhatsApp
            </a>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-50 p-5 overflow-y-auto lg:hidden shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Catégories</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { clearSearch(); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    !activeCat
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Tag className="h-4 w-4" />
                  Tous les produits
                  <span className="ml-auto text-[10px] font-bold bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-gray-500">{totalCount}</span>
                </button>
                {allCategories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat] ?? Shield
                  const count = grouped.get(cat)?.length ?? 0
                  return (
                    <button
                      key={cat}
                      onClick={() => scrollToCat(cat)}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{cat}</span>
                      <span className="ml-auto text-[10px] font-bold bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-gray-500">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 px-4 py-6 lg:px-8 min-w-0">
          {filteredCount === 0 ? (
            <div className="text-center py-20">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Aucun produit trouvé</h3>
              <p className="text-sm text-gray-500 mt-1">Essayez un autre terme ou revenez au catalogue.</p>
              <button
                onClick={clearSearch}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition-colors"
              >
                <X className="h-4 w-4" />
                Réinitialiser
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {(search ? [null] : Array.from(filteredGrouped.keys())).map((cat, idx) => {
                const items = cat ? (filteredGrouped.get(cat) ?? []) : filteredProducts
                if (items.length === 0) return null
                const catLabel = cat ?? 'Résultats de recherche'
                const Icon = cat ? (CATEGORY_ICONS[cat] ?? Shield) : Search
                const anchorId = cat ? `cat-${cat.replace(/\s+/g, '-').toLowerCase()}` : undefined
                return (
                  <section key={cat ?? 'search'} id={anchorId} className="scroll-mt-24">
                    {/* En-tête catégorie */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">{catLabel}</h2>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                          {items.length}
                        </span>
                      </div>
                      {cat && (
                        <a
                          href={`/contact?categorie=${encodeURIComponent(cat)}`}
                          className="text-xs font-semibold text-green-700 hover:underline dark:text-green-400"
                        >
                          Devis lot →
                        </a>
                      )}
                    </div>

                    {/* Grille améliorée */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((p) => (
                        <ProductCard key={p.id} product={p} onOrder={() => openDrawer(p)} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* CTA final */}
      <section className="px-4 py-10 border-t border-gray-100 dark:border-slate-800">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 p-7 text-center text-white shadow-lg">
          <h2 className="text-lg font-bold sm:text-xl">Un projet à sécuriser ?</h2>
          <p className="mt-1.5 text-sm text-white/80">
            Nos équipes vous accompagnent de l&apos;étude à l&apos;installation, maintenance incluse.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/221781234567?text=${encodeURIComponent("Bonjour IT Vision, je souhaite discuter d'un projet de sécurisation.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1ebe5d] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors"
            >
              Devis entreprise
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Drawer WhatsApp */}
      <WhatsAppOrderDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        line={drawerLine}
      />
    </div>
  )
}

// ── Product Card ──────────────────────────────────────
function ProductCard({ product, onOrder }: { product: CorporateProduct; onOrder: () => void }) {
  const inStock = product.stockStatus === 'in_stock'
  const outOfStock = product.stockStatus === 'out_of_stock'
  const Icon = CATEGORY_ICONS[product.category] ?? Shield

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300 dark:border-slate-800 dark:bg-slate-900">
      {/* Image */}
      <a href={`/corporate-produits/${product.id}`} className="relative block h-40 flex-shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon className="h-12 w-12 text-slate-300 dark:text-slate-700" />
          </div>
        )}
        <span className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${stockBadgeClasses(product.stockStatus)}`}>
          <PackageCheck className="h-2.5 w-2.5" />
          {stockLabelShort(product.stockStatus)}
        </span>
        {product.priceAmount === undefined && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            Sur devis
          </span>
        )}
      </a>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <a
            href={`/corporate-produits/${product.id}`}
            className="block text-sm font-bold leading-snug text-gray-900 hover:text-green-700 dark:text-white dark:hover:text-green-400 line-clamp-2"
          >
            {product.name}
          </a>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Features pills */}
        {product.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {product.features.slice(0, 3).map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <CheckCircle className="h-2.5 w-2.5 text-green-500" />
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Prix + CTAs */}
        <div className="mt-auto pt-3 flex items-center gap-2">
          <div className="flex-1">
            {product.priceAmount !== undefined ? (
              <div className="text-sm font-extrabold text-green-600 dark:text-green-400">
                {Math.round(product.priceAmount).toLocaleString('fr-FR')} <span className="text-[10px] font-semibold">{product.currency}</span>
              </div>
            ) : (
              <div className="text-xs font-semibold text-gray-400">Prix sur devis</div>
            )}
          </div>
          <button
            onClick={onOrder}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1ebe5d] transition-colors shadow-sm"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Acheter
          </button>
          <a
            href={`/corporate-produits/${product.id}`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors"
            title="Voir le détail"
          >
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  )
}
