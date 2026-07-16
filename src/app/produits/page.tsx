"use client"
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import { Camera, Shield, Smartphone, Wifi, Cpu, Database, Star, ShoppingCart, CheckCircle, ArrowRight, Package, ArrowUpDown, Grid, List, X, GitCompare, Sparkles, Clock, Users, Heart, ChevronDown, ChevronUp, SlidersHorizontal, LayoutGrid, Search, Truck } from 'lucide-react'
import CatalogProductCard from '@/components/catalog/CatalogProductCard'
import CatalogToolbar from '@/components/catalog/CatalogToolbar'
import CategoryPillsScroller, { type PillCategory } from '@/components/catalog/CategoryPillsScroller'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import PromoStrip from '@/components/catalog/PromoStrip'
import CartIcon from '@/components/CartIcon'
import CartDrawer from '@/components/CartDrawer'
import ErrorBoundary from '@/components/ErrorBoundary'
import ImageSearchModal, { ImageSearchButton } from '@/components/ImageSearchModal'
import SourcingRequestModal from '@/components/SourcingRequestModal'
import QuickViewModal from '@/components/catalog/QuickViewModal'
import MarketBottomNav from '@/components/MarketBottomNav'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Interface pour les produits de l'API
interface ShippingOptionSummary {
  id: string
  label: string
  description: string
  durationDays: number
  cost: number
  total: number
  currency: string
}

interface ApiProduct {
  id: string
  _id?: string // Deprecated, utiliser id
  name: string
  category: string
  description: string
  tagline?: string
  condition?: 'new' | 'used' | 'refurbished'
  priceAmount?: number
  currency?: string
  image?: string
  gallery?: string[]
  requiresQuote: boolean
  deliveryDays?: number
  features: string[]
  rating: number
  shippingOptions: ShippingOptionSummary[]
  availabilityLabel?: string
  availabilityStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  createdAt?: string
  isFeatured?: boolean
  isImported?: boolean // Indicateur si produit importé (sans exposer les détails)
  // Données physiques utilisées pour le calcul du transport (si disponibles)
  weightKg?: number
  grossWeightKg?: number
  netWeightKg?: number
  volumeM3?: number
  // Prix wholesale B2B
  b2bPrice?: number
  // Achat groupé
  groupBuyEnabled?: boolean
  groupBuyBestPrice?: number
  groupBuyDiscount?: number
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  priceTiers?: Array<{ minQty: number; price: number; discount?: number }>

  groupStats?: {
    activeGroupCount: number
    bestActiveGroup?: {
      groupId: string
      status?: string
      currentQty?: number
      targetQty?: number
      currentPrice?: number
      participantCount?: number
      deadline?: string
    } | null
  }
}

// metadata export is not allowed in a client component; title handled elsewhere


export default function ProduitsPage() {
  const [cartOpen, setCartOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [onlyPrice, setOnlyPrice] = useState(false)
  const [onlyQuote, setOnlyQuote] = useState(false)
  const [onlyGroupBuy, setOnlyGroupBuy] = useState(false)
  const [segment, setSegment] = useState<'all' | 'import' | 'in_stock' | 'group_buy'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [pillCategories, setPillCategories] = useState<PillCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const activePill = useMemo(() => {
    if (selected.length === 0) return 'tous'
    if (selected.length === 1 && pillCategories.some(c => c.slug === selected[0])) return selected[0]
    return ''
  }, [selected, pillCategories])

  const getCategoryName = (slug: string) => pillCategories.find(c => c.slug === slug)?.name || slug
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'rating-desc' | 'groupbuy-discount-desc'>('default')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in_stock' | 'preorder'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [comparingProducts, setComparingProducts] = useState<Set<string>>(new Set())
  const [showCompareBar, setShowCompareBar] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null)
  const [deliveryRange, setDeliveryRange] = useState<{ min: number; max: number } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([])
  const observerTarget = useRef<HTMLDivElement>(null)
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: any }>>([])
  // Recherche par image
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [imageSearchResults, setImageSearchResults] = useState<string[]>([]) // IDs des produits trouvés
  // Handoff vers "Trouvez-moi ce produit"
  const [showSourcing, setShowSourcing] = useState(false)
  const [sourcingContext, setSourcingContext] = useState<{ file?: File | null; description?: string } | null>(null)
  const [sourcingUser, setSourcingUser] = useState<{ id?: string; name?: string; phone?: string; email?: string } | null>(null)
  // Vue rapide
  const [quickViewProduct, setQuickViewProduct] = useState<ApiProduct | null>(null)

  // Favoris (utilisé pour le mode liste)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => {
      try {
        const raw = localStorage.getItem('wishlist:items')
        const items = raw ? JSON.parse(raw) : []
        setFavoriteIds(Array.isArray(items) ? items.filter((x: any) => typeof x === 'string') : [])
      } catch {
        setFavoriteIds([])
      }
    }

    update()
    window.addEventListener('wishlist:updated', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('wishlist:updated', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  // Charger les catégories dynamiques depuis l'API
  useEffect(() => {
    let cancelled = false
    async function loadCategories() {
      try {
        const res = await fetch('/api/catalog/categories')
        const data = await res.json().catch(() => ({}))
        if (!cancelled && data?.success && Array.isArray(data.items)) {
          const colorFor = (name: string) => {
            const map: Record<string, string> = {
              sécurité: 'emerald', securite: 'emerald',
              informatique: 'blue',
              domotique: 'orange',
              électronique: 'violet', electronique: 'violet',
              mobilier: 'amber',
              packs: 'pink', 'packs-cadeaux': 'pink',
            }
            return map[name.toLowerCase()] || 'slate'
          }
          const pills: PillCategory[] = data.items.map((c: any) => ({
            name: c.labelFr || c.name,
            slug: c.slug,
            color: colorFor(c.labelFr || c.name || c.slug),
          }))
          setPillCategories(pills)
        }
      } catch {
        // ignore: les pills par défaut s'afficheront grâce à CategoryPillsScroller
      } finally {
        if (!cancelled) setCategoriesLoading(false)
      }
    }
    loadCategories()
    return () => { cancelled = true }
  }, [])

  const toggleFavoriteFromList = (e: React.MouseEvent, productId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof window === 'undefined') return
    const id = String(productId || '').trim()
    if (!id) return

    ;(async () => {
      try {
        const raw = localStorage.getItem('wishlist:items')
        const favorites = raw ? JSON.parse(raw) : []
        const set = new Set<string>(Array.isArray(favorites) ? favorites : [])

        const nextIsFavorite = !set.has(id)
        if (nextIsFavorite) {
          set.add(id)
        } else {
          set.delete(id)
        }

        const next = Array.from(set)
        localStorage.setItem('wishlist:items', JSON.stringify(next))
        window.dispatchEvent(new CustomEvent('wishlist:updated'))

        // Persister côté compte si connecté (ignore 401)
        if (nextIsFavorite) {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id })
          }).catch(() => null)
        } else {
          await fetch(`/api/favorites?productId=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null)
        }
      } catch {
        // Ignore
      }
    })()
  }

  const isRestoringRef = useRef(true)
  const urlSyncRef = useRef<{ filterKey: string; page: number }>({ filterKey: '', page: 1 })
  const lastUrlRef = useRef<string>('')

  const applyUrlParamsToState = (urlParams: URLSearchParams) => {
    const parseBool = (value: string | null) => value === '1' || value === 'true'
    const parseIntSafe = (value: string | null) => {
      if (!value) return null
      const n = parseInt(value, 10)
      return Number.isFinite(n) ? n : null
    }

    const q = urlParams.get('q') ?? ''
    const category = urlParams.get('category')
    const urlSelected = category
      ? category
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const urlSegment = urlParams.get('segment')
    const nextSegment = (urlSegment === 'all' || urlSegment === 'import' || urlSegment === 'in_stock' || urlSegment === 'group_buy')
      ? urlSegment
      : 'all'

    const urlAvailability = urlParams.get('availability')
    const nextAvailability = (urlAvailability === 'all' || urlAvailability === 'in_stock' || urlAvailability === 'preorder')
      ? urlAvailability
      : 'all'

    const urlSortBy = urlParams.get('sortBy')
    const nextSortBy = (urlSortBy === 'default' || urlSortBy === 'price-asc' || urlSortBy === 'price-desc' || urlSortBy === 'name-asc' || urlSortBy === 'name-desc' || urlSortBy === 'rating-desc' || urlSortBy === 'groupbuy-discount-desc')
      ? urlSortBy
      : 'default'

    const urlView = urlParams.get('view')
    const nextViewMode = (urlView === 'grid' || urlView === 'list') ? urlView : null

    const minPrice = parseIntSafe(urlParams.get('minPrice'))
    const maxPrice = parseIntSafe(urlParams.get('maxPrice'))
    const nextPriceRange = (minPrice !== null || maxPrice !== null)
      ? { min: minPrice ?? 0, max: maxPrice ?? 999999999 }
      : null

    const minDeliveryDays = parseIntSafe(urlParams.get('minDeliveryDays'))
    const maxDeliveryDays = parseIntSafe(urlParams.get('maxDeliveryDays'))
    const nextDeliveryRange = (minDeliveryDays !== null || maxDeliveryDays !== null)
      ? { min: minDeliveryDays ?? 0, max: maxDeliveryDays ?? 999 }
      : null

    const pageParam = parseIntSafe(urlParams.get('page'))
    const nextPage = pageParam && pageParam > 0 ? pageParam : 1

    const imageIds = urlParams.get('imageIds')
    const nextImageSearchResults = imageIds
      ? imageIds.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    isRestoringRef.current = true
    setSearch(q)
    setDebouncedSearch(q)
    setSelected(urlSelected)
    setSegment(nextSegment)
    setAvailabilityFilter(nextAvailability)
    setSortBy(nextSortBy)
    setOnlyGroupBuy(parseBool(urlParams.get('onlyGroupBuy')))
    setOnlyPrice(parseBool(urlParams.get('onlyPrice')))
    setOnlyQuote(parseBool(urlParams.get('onlyQuote')))
    setPriceRange(nextPriceRange)
    setDeliveryRange(nextDeliveryRange)
    if (nextViewMode) setViewMode(nextViewMode)
    setCurrentPage(nextPage)
    setImageSearchResults(nextImageSearchResults)
    setTimeout(() => {
      isRestoringRef.current = false
    }, 0)
  }

  // Reset pagination when filters change (search/segment/filters/sort/imageIds)
  useEffect(() => {
    if (isRestoringRef.current) return
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    selected.join('|'),
    onlyPrice,
    onlyQuote,
    onlyGroupBuy,
    segment,
    sortBy,
    availabilityFilter,
    priceRange?.min,
    priceRange?.max,
    deliveryRange?.min,
    deliveryRange?.max,
    imageSearchResults.join(',')
  ])

  // Sync filters to URL (shareable) + support back/forward via popstate
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isRestoringRef.current) return

    const params = new URLSearchParams()

    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    if (selected.length > 0) params.set('category', selected.join(','))
    if (segment !== 'all') params.set('segment', segment)
    if (availabilityFilter !== 'all') params.set('availability', availabilityFilter)

    if (onlyGroupBuy) params.set('onlyGroupBuy', '1')
    if (onlyPrice) params.set('onlyPrice', '1')
    if (onlyQuote) params.set('onlyQuote', '1')

    if (sortBy !== 'default') params.set('sortBy', sortBy)
    if (viewMode !== 'grid') params.set('view', viewMode)

    if (priceRange) {
      if (priceRange.min > 0) params.set('minPrice', String(priceRange.min))
      if (priceRange.max < 999999999) params.set('maxPrice', String(priceRange.max))
    }

    if (deliveryRange) {
      if (deliveryRange.min > 0) params.set('minDeliveryDays', String(deliveryRange.min))
      if (deliveryRange.max < 999) params.set('maxDeliveryDays', String(deliveryRange.max))
    }

    if (currentPage > 1) params.set('page', String(currentPage))
    if (imageSearchResults.length > 0) params.set('imageIds', imageSearchResults.join(','))

    const basePath = window.location.pathname
    const hash = window.location.hash || ''
    const query = params.toString()
    const nextUrl = query ? `${basePath}?${query}${hash}` : `${basePath}${hash}`

    if (lastUrlRef.current === nextUrl) return
    if (nextUrl === `${basePath}${window.location.search}${hash}`) {
      lastUrlRef.current = nextUrl
      return
    }

    const filterKey = [
      debouncedSearch.trim(),
      selected.join(','),
      segment,
      availabilityFilter,
      onlyGroupBuy ? '1' : '0',
      onlyPrice ? '1' : '0',
      onlyQuote ? '1' : '0',
      sortBy,
      viewMode,
      priceRange ? `${priceRange.min}-${priceRange.max}` : '',
      deliveryRange ? `${deliveryRange.min}-${deliveryRange.max}` : '',
      imageSearchResults.join(',')
    ].join('|')

    const shouldPush = urlSyncRef.current.filterKey === filterKey && urlSyncRef.current.page !== currentPage
    if (shouldPush) {
      window.history.pushState({}, '', nextUrl)
    } else {
      window.history.replaceState({}, '', nextUrl)
    }

    urlSyncRef.current = { filterKey, page: currentPage }
    lastUrlRef.current = nextUrl
  }, [
    debouncedSearch,
    selected,
    onlyPrice,
    onlyQuote,
    onlyGroupBuy,
    segment,
    sortBy,
    availabilityFilter,
    priceRange,
    deliveryRange,
    viewMode,
    currentPage,
    imageSearchResults
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPopState = () => {
      applyUrlParamsToState(new URLSearchParams(window.location.search))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // UX: si on choisit "Meilleure économie", on bascule sur le segment achats groupés.
  // Si on quitte ce segment, on remet le tri par défaut.
  useEffect(() => {
    if (sortBy === 'groupbuy-discount-desc' && segment !== 'group_buy') {
      setSegment('group_buy')
    }
  }, [sortBy])

  useEffect(() => {
    if (segment !== 'group_buy' && sortBy === 'groupbuy-discount-desc') {
      setSortBy('default')
    }
  }, [segment])

  useEffect(() => {
    const sync = () => {
      try {
        if (typeof window === 'undefined') return
        const raw = localStorage.getItem('cart:items')
        const items = raw ? JSON.parse(raw) : []
        const count = items.reduce((s: number, i: any) => s + (i.qty || 1), 0)
        setCartCount(count)
      } catch (error) {
        console.error('Error syncing cart:', error)
        setCartCount(0)
      }
    }
    sync()
    window.addEventListener('cart:updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('cart:updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // Charger les produits depuis l'API (filtres/tri côté serveur)
  useEffect(() => {
    const fetchProducts = async () => {
        try {
          setLoading(true)
          setError(null)

          const params = new URLSearchParams()

          // Mode recherche image : on charge explicitement les IDs du ranking
          // sans appliquer les filtres classiques (catégories, prix, etc.)
          const hasImageIds = imageSearchResults.length > 0
          if (hasImageIds) {
            params.set('ids', imageSearchResults.slice(0, 50).join(','))
            params.set('limit', String(Math.min(imageSearchResults.length, 50)))
          } else {
            params.set('page', String(currentPage))
            params.set('limit', '24')

            if (debouncedSearch.trim()) {
              params.set('q', debouncedSearch.trim())
            }

            if (selected.length > 0) {
              params.set('category', selected.join(','))
            }

            if (segment && segment !== 'all') {
              params.set('segment', segment)
            }

            if (availabilityFilter && availabilityFilter !== 'all') {
              params.set('availability', availabilityFilter)
            }

            if (onlyGroupBuy) params.set('onlyGroupBuy', '1')
            if (onlyPrice) params.set('onlyPrice', '1')
            if (onlyQuote) params.set('onlyQuote', '1')

            if (sortBy && sortBy !== 'default') {
              params.set('sortBy', sortBy)
            }

            // Enrichir les produits avec les groupes actifs uniquement quand utile
            const needsGroupStats = segment === 'group_buy' || onlyGroupBuy || sortBy === 'groupbuy-discount-desc'
            if (needsGroupStats) {
              params.set('includeGroupStats', '1')
            }

            if (priceRange) {
              if (typeof priceRange.min === 'number') params.set('minPrice', String(priceRange.min))
              if (typeof priceRange.max === 'number') params.set('maxPrice', String(priceRange.max))
            }

            if (deliveryRange) {
              if (typeof deliveryRange.min === 'number') params.set('minDeliveryDays', String(deliveryRange.min))
              if (typeof deliveryRange.max === 'number') params.set('maxDeliveryDays', String(deliveryRange.max))
            }
          }

          const response = await fetch(`/api/catalog/products?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()

          if (data.success && Array.isArray(data.products)) {
            // Gestion de la pagination
            if (data.pagination) {
              setTotalPages(data.pagination.totalPages || 1)
              setHasMore(data.pagination.hasMore || false)
            }
            const formatted: ApiProduct[] = data.products.map((item: any): ApiProduct => {
              const shipping: ShippingOptionSummary[] = Array.isArray(item.pricing?.shippingOptions)
                ? item.pricing.shippingOptions.map((opt: any) => ({
                    id: opt.id,
                    label: opt.label,
                    description: opt.description,
                    durationDays: opt.durationDays,
                    cost: opt.cost,
                    total: opt.total,
                    currency: opt.currency
                  }))
                : []

              const bestShipping = shipping.length > 0
                ? shipping.reduce((prev, current) => (prev.total <= current.total ? prev : current))
                : null

              const salePrice = typeof item.pricing?.salePrice === 'number' ? item.pricing.salePrice : undefined
              const baseCost = typeof item.pricing?.baseCost === 'number' ? item.pricing.baseCost : undefined
              // Listing must show only the source price (baseCost). If not available, fall back to salePrice.
              const priceAmount = !item.requiresQuote
                ? (baseCost ?? salePrice)
                : undefined

              const featuresFromApi = Array.isArray(item.features) ? item.features.filter(Boolean) : []
              const shippingHighlights = shipping.slice(0, 2).map((opt) => `${opt.label} · ${typeof opt.total === 'number' ? opt.total.toLocaleString('fr-FR') : '—'} ${opt.currency || 'FCFA'}`)
              const availabilityHighlight = item.availability?.label ? [item.availability.label] : []

              const features = [...featuresFromApi, ...shippingHighlights, ...availabilityHighlight]

              return {
                id: item.id,
                _id: item.id, // Deprecated - utiliser id
                name: item.name,
                category: item.category || 'Catalogue import Chine',
                description: item.description || item.tagline || 'Équipement import direct Chine avec installation Dakar',
                tagline: item.tagline || undefined,
                condition: item.condition || undefined,
                priceAmount,
                currency: item.pricing?.currency || 'FCFA',
                image: item.image || item.gallery?.[0] || '/placeholder.svg',
                gallery: Array.isArray(item.gallery) ? item.gallery : undefined,
                requiresQuote: item.requiresQuote || !priceAmount,
                deliveryDays: bestShipping?.durationDays ?? item.availability?.leadTimeDays ?? 0,
                features: features.length ? features : ['Import direct Chine', 'Livraison Dakar sécurisée'],
                rating: typeof item.rating === 'number' ? item.rating : undefined,
                shippingOptions: shipping,
                availabilityLabel: item.availability?.label || undefined,
                availabilityStatus: (item.availability?.status === 'in_stock' || item.availability?.status === 'preorder' || item.availability?.status === 'out_of_stock')
                  ? item.availability.status
                  : 'preorder',
                createdAt: item.createdAt || undefined,
                isFeatured: item.isFeatured || false,
                isImported: !!item.isImported,
                // Données physiques (utilisées par le panier pour calcul transport)
                weightKg: typeof item.logistics?.weightKg === 'number' ? item.logistics.weightKg : undefined,
                volumeM3: typeof item.logistics?.volumeM3 === 'number' ? item.logistics.volumeM3 : undefined,
                // Achat groupé
                groupBuyEnabled: !!item.groupBuyEnabled,
                groupBuyBestPrice: typeof item.groupBuyBestPrice === 'number' ? item.groupBuyBestPrice : undefined,
                groupBuyDiscount: typeof item.groupBuyDiscount === 'number' ? item.groupBuyDiscount : undefined,
                groupBuyMinQty: typeof item.groupBuyMinQty === 'number' ? item.groupBuyMinQty : undefined,
                groupBuyTargetQty: typeof item.groupBuyTargetQty === 'number' ? item.groupBuyTargetQty : undefined,
                priceTiers: Array.isArray(item.priceTiers) ? item.priceTiers : undefined,
                groupStats: item.groupStats
                  ? {
                      activeGroupCount: typeof item.groupStats.activeGroupCount === 'number' ? item.groupStats.activeGroupCount : 0,
                      bestActiveGroup: item.groupStats.bestActiveGroup ?? null
                    }
                  : undefined
              }
            })
            // Infinite scroll: append products instead of replacing
            // En mode recherche image, on remplace toujours (pas de pagination)
            if (currentPage === 1 || hasImageIds) {
              setAllProducts(formatted)
            } else {
              setAllProducts(prev => [...prev, ...formatted])
            }
            setProducts(formatted)
          } else {
            if (currentPage === 1) {
              setProducts([])
              setAllProducts([])
            }
            setError('Impossible de charger les produits. Veuillez réessayer.')
          }
        } catch (err) {
          console.error('Error fetching products:', err)
          if (currentPage === 1) {
            setProducts([])
            setAllProducts([])
          }
          setError('Impossible de charger les produits. Veuillez réessayer.')
        } finally {
          setLoading(false)
          setLoadingMore(false)
        }
      }

      fetchProducts()
    }, [
      currentPage,
      debouncedSearch,
      selected,
      onlyPrice,
      onlyQuote,
      onlyGroupBuy,
      segment,
      sortBy,
      availabilityFilter,
      priceRange,
      deliveryRange,
      imageSearchResults
    ])

  // Charger les filtres sauvegardés et l'historique
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedFilters')
      if (saved) {
        setSavedFilters(JSON.parse(saved))
      }
      
      // Restaurer les filtres depuis l'URL ou localStorage
      const urlParams = new URLSearchParams(window.location.search)
      const hasUrlFilters = Array.from(urlParams.keys()).some((k) => [
        'q',
        'category',
        'segment',
        'availability',
        'onlyGroupBuy',
        'onlyPrice',
        'onlyQuote',
        'sortBy',
        'minPrice',
        'maxPrice',
        'minDeliveryDays',
        'maxDeliveryDays',
        'page',
        'view',
        'imageIds'
      ].includes(k))

      if (hasUrlFilters) {
        applyUrlParamsToState(urlParams)
      } else {
        isRestoringRef.current = true
        const savedState = localStorage.getItem('productFilters')
        if (savedState) {
          const state = JSON.parse(savedState)
          if (typeof state.search === 'string') {
            setSearch(state.search)
            setDebouncedSearch(state.search)
          }
          if (state.selected && Array.isArray(state.selected)) setSelected(state.selected)
          if (state.sortBy) setSortBy(state.sortBy)
          if (state.availabilityFilter) setAvailabilityFilter(state.availabilityFilter)
          if (state.priceRange) setPriceRange(state.priceRange)
          if (state.deliveryRange) setDeliveryRange(state.deliveryRange)
          if (state.viewMode) setViewMode(state.viewMode)
          if (state.onlyPrice !== undefined) setOnlyPrice(state.onlyPrice)
          if (state.onlyQuote !== undefined) setOnlyQuote(state.onlyQuote)
          if (state.onlyGroupBuy !== undefined) setOnlyGroupBuy(state.onlyGroupBuy)
          if (state.segment) setSegment(state.segment)
        }
        setTimeout(() => {
          isRestoringRef.current = false
        }, 0)
      }

      const basePath = window.location.pathname
      const hash = window.location.hash || ''
      lastUrlRef.current = `${basePath}${window.location.search}${hash}`
    } catch (error) {
      console.error('Error loading saved filters:', error)
    }
  }, [])

  // Sauvegarder les filtres dans localStorage
  useEffect(() => {
    try {
      const state = {
        search,
        selected,
        onlyPrice,
        onlyQuote,
        onlyGroupBuy,
        segment,
        sortBy,
        availabilityFilter,
        priceRange,
        deliveryRange,
        viewMode
      }
      localStorage.setItem('productFilters', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving filters:', error)
    }
  }, [search, selected, onlyPrice, onlyQuote, onlyGroupBuy, segment, sortBy, availabilityFilter, priceRange, deliveryRange, viewMode])

  // Debounce de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Infinite scroll: use accumulated products
  const filteredProducts = useMemo(() => {
    const productsToFilter = currentPage === 1 ? products : allProducts
    if (imageSearchResults.length === 0) return productsToFilter
    return productsToFilter.filter((product) => imageSearchResults.includes(product.id))
  }, [products, allProducts, imageSearchResults, currentPage])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!observerTarget.current || loading || loadingMore || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setLoadingMore(true)
          setCurrentPage(prev => prev + 1)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore])

  // Gestion de la comparaison
  const handleCompareToggle = (productId: string, isSelected: boolean) => {
    setComparingProducts((prev) => {
      const newSet = new Set(prev)
      if (isSelected) {
        if (newSet.size >= 3) {
          showToast('Vous ne pouvez comparer que 3 produits maximum')
          return prev
        }
        newSet.add(productId)
      } else {
        newSet.delete(productId)
      }
      setShowCompareBar(newSet.size > 0)
      return newSet
    })
  }

  const handleCompare = () => {
    if (comparingProducts.size < 2) {
      showToast('Sélectionnez au moins 2 produits à comparer')
      return
    }
    const ids = Array.from(comparingProducts).join(',')
    window.location.href = `/produits/compare?ids=${ids}`
  }

  function apiToCatalog(p: ApiProduct) {
    const base = p.priceAmount ?? p.b2bPrice ?? 0
    const orig = (p.b2bPrice && p.b2bPrice > base) ? p.b2bPrice : undefined
    const disc = orig ? Math.round(((orig - base) / orig) * 100) : 0
    const isG = !!p.groupBuyEnabled && !!p.groupStats?.bestActiveGroup
    return {
      id: p.id,
      name: p.name,
      image: p.image ?? '/placeholder.svg',
      price: base,
      originalPrice: orig,
      currency: p.currency ?? 'FCFA',
      rating: p.rating ?? 4.5,
      soldCount: 0,
      discount: disc > 0 ? disc : undefined,
      origin: p.isImported ? 'Import Chine' : 'Stock Dakar',
      deliveryDays: p.deliveryDays ?? 3,
      isGroupBuy: isG,
      groupProgress: p.groupStats?.bestActiveGroup?.currentQty ?? 0,
      groupTarget: p.groupStats?.bestActiveGroup?.targetQty ?? 50,
      daysLeft: undefined,
      isFlash: disc > 20,
      isNew: !!p.isFeatured,
      colorVariants: [] as string[],
    }
  }

  function addToCart(product: any, qty = 1) {
    try {
      const price = product.price ?? product.priceAmount ?? product.b2bPrice ?? 0
      const raw = localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const existing = items.find((i: any) => i.id === product.id)
      if (existing) existing.qty = (existing.qty || 0) + qty
      else items.push({ id: product.id, name: product.name, price, currency: product.currency || 'FCFA', image: product.image, qty })
      localStorage.setItem('cart:items', JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('cart:updated'))
      showToast(`${product.name} ajouté au panier`)
    } catch {
      showToast('Erreur lors de l\'ajout au panier')
    }
  }

  function handleQuickView(product: ApiProduct) {
    setQuickViewProduct(product)
  }

  const quickViewData = quickViewProduct ? {
    id: quickViewProduct.id,
    name: quickViewProduct.name,
    description: quickViewProduct.description,
    image: quickViewProduct.image,
    gallery: quickViewProduct.gallery,
    priceAmount: quickViewProduct.priceAmount,
    b2bPrice: quickViewProduct.b2bPrice,
    currency: quickViewProduct.currency,
    rating: quickViewProduct.rating,
    availabilityStatus: quickViewProduct.availabilityStatus,
    availabilityLabel: quickViewProduct.availabilityLabel,
    deliveryDays: quickViewProduct.deliveryDays,
    features: quickViewProduct.features,
    shippingOptions: quickViewProduct.shippingOptions,
    condition: quickViewProduct.condition,
    origin: quickViewProduct.isImported ? 'Import Chine' : 'Stock Dakar',
  } : null

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 pb-20 md:pb-0">
        <MarketHeader />
        {/* Local cart icon for produits page — hidden on mobile where bottom nav is present */}
        <div className="fixed right-4 bottom-4 z-40 hidden md:block">
          <CartIcon count={cartCount} onClick={() => setCartOpen(true)} />
        </div>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      
      {/* === STICKY SEARCH HEADER === */}
      <div className="sticky top-20 md:top-28 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* Search bar compacte */}
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full p-1.5 shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
            <SearchAutocomplete
              value={search}
              onChange={setSearch}
              onSearch={(term) => {
                setSearch(term)
                setDebouncedSearch(term)
                setCurrentPage(1)
              }}
              onCameraClick={() => setShowImageSearch(true)}
              placeholder="Rechercher un produit..."
            />
          </div>
          {/* Breadcrumb */}
          <div className="flex items-center mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-300">Accueil</Link>
              <span>{'>'}</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Catalogue</span>
              {activePill && activePill !== 'tous' && (
                <>
                  <span>{'>'}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{getCategoryName(activePill)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Category pills scroller */}
        <CategoryPillsScroller
          categories={pillCategories}
          active={activePill}
          loading={categoriesLoading}
          onSelect={(cat) => {
            if (cat.slug === 'tous') {
              setSelected([])
            } else {
              setSelected([cat.slug])
            }
          }}
        />
      </div>

      {/* === MINI PROMO STRIP === */}
      <PromoStrip />

      {/* Affichage d'erreur */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MAIN AREA : SIDEBAR + GRID === */}
      <section className="py-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar */}
            <aside className="hidden md:block sticky top-[180px] h-[calc(100vh-200px)] overflow-y-auto pr-2">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-5">
                {/* Filtres actifs */}
                {(() => {
                  const activeFilters = []
                  if (debouncedSearch) activeFilters.push({key:'search',label:`"${debouncedSearch}"`})
                  if (selected.length) activeFilters.push({key:'category',label:`Cat: ${selected.map(getCategoryName).join(', ')}`})
                  if (onlyGroupBuy) activeFilters.push({key:'group',label:'Achat groupé'})
                  if (onlyPrice) activeFilters.push({key:'price',label:'Avec prix'})
                  if (onlyQuote) activeFilters.push({key:'quote',label:'Sur devis'})
                  if (segment !== 'all') activeFilters.push({key:'segment',label:`Seg: ${segment}`})
                  if (availabilityFilter !== 'all') activeFilters.push({key:'avail',label:`Dispo: ${availabilityFilter}`})
                  if (priceRange) activeFilters.push({key:'priceRange',label:`Prix: ${priceRange.min}-${priceRange.max}`})
                  return activeFilters.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filtres actifs</span>
                        <button onClick={() => {
                          setSearch(''); setDebouncedSearch(''); setSelected([]); setOnlyGroupBuy(false); setOnlyPrice(false); setOnlyQuote(false); setSegment('all'); setAvailabilityFilter('all'); setPriceRange(null)
                        }} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Réinitialiser</button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activeFilters.map(f => (
                          <button key={f.key} onClick={() => {
                            switch(f.key){
                              case 'search': setSearch(''); setDebouncedSearch(''); break
                              case 'category': setSelected([]); break
                              case 'group': setOnlyGroupBuy(false); break
                              case 'price': setOnlyPrice(false); break
                              case 'quote': setOnlyQuote(false); break
                              case 'segment': setSegment('all'); break
                              case 'avail': setAvailabilityFilter('all'); break
                              case 'priceRange': setPriceRange(null); break
                            }
                          }} className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900 rounded-full px-2 py-1 flex items-center gap-1">
                            {f.label} <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {/* Prix */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Prix (FCFA)</span>
                  </div>
                  <input type="range" min={0} max={500000} step={5000} value={priceRange?.max ?? 500000} onChange={e => setPriceRange({min: priceRange?.min ?? 0, max: Number(e.target.value)})} className="w-full accent-orange-500 mb-1" />
                  {/* Histogramme de prix visuel */}
                  <div className="flex items-end gap-[2px] h-8 mb-2 px-1">
                    {[30,45,20,60,85,40,55,70,35,50,90,65,30,45,25,55,40,70,50,35].map((h,i)=>{
                      const inRange = priceRange ? (i/20)*500000 <= (priceRange.max ?? 500000) && (i/20)*500000 >= (priceRange.min ?? 0) : true
                      return (
                        <div key={i} className={`flex-1 rounded-t-sm ${inRange ? 'bg-orange-300 dark:bg-orange-600' : 'bg-slate-200 dark:bg-slate-600'}`} style={{height:`${h}%`}} />
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={priceRange?.min ?? ''} onChange={e => setPriceRange({min: Number(e.target.value), max: priceRange?.max ?? 500000})} className="w-full text-xs border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded px-2 py-1" />
                    <input type="number" placeholder="Max" value={priceRange?.max ?? ''} onChange={e => setPriceRange({min: priceRange?.min ?? 0, max: Number(e.target.value)})} className="w-full text-xs border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded px-2 py-1" />
                  </div>
                </div>
                {/* Catégories */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Catégories</span>
                  </div>
                  <div className="space-y-1.5">
                    {pillCategories.map((cat) => {
                      const dotClass = {
                        emerald: 'bg-emerald-400',
                        blue: 'bg-blue-400',
                        pink: 'bg-pink-400',
                        amber: 'bg-amber-400',
                        red: 'bg-red-400',
                        cyan: 'bg-cyan-400',
                        orange: 'bg-orange-400',
                        violet: 'bg-violet-400',
                        green: 'bg-green-400',
                        slate: 'bg-slate-400'
                      }[cat.color || 'slate'] || 'bg-orange-400'
                      return (
                        <label key={cat.slug} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                          <input type="checkbox" checked={selected.includes(cat.slug)} onChange={() => setSelected(prev => prev.includes(cat.slug) ? prev.filter(c => c !== cat.slug) : [...prev, cat.slug])} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500" />
                          <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${selected.includes(cat.slug) ? dotClass : 'bg-slate-200 dark:bg-slate-600'}`} />
                          <span className="flex-1 dark:text-slate-300">{cat.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                {/* Disponibilité */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Disponibilité</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                      <input type="radio" name="avail-sidebar" checked={availabilityFilter === 'all'} onChange={() => setAvailabilityFilter('all')} className="w-4 h-4 border-slate-300 dark:border-slate-600 text-orange-600" />
                      Tous
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                      <input type="radio" name="avail-sidebar" checked={availabilityFilter === 'in_stock'} onChange={() => setAvailabilityFilter('in_stock')} className="w-4 h-4 border-slate-300 dark:border-slate-600 text-orange-600" />
                      En stock
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                      <input type="radio" name="avail-sidebar" checked={availabilityFilter === 'preorder'} onChange={() => setAvailabilityFilter('preorder')} className="w-4 h-4 border-slate-300 dark:border-slate-600 text-orange-600" />
                      Sur commande
                    </label>
                  </div>
                </div>
                {/* Type d'achat */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Type d'achat</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={!onlyGroupBuy} onChange={() => setOnlyGroupBuy(false)} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-600" />
                      <span className="flex-1 dark:text-slate-300">Achat individuel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={onlyGroupBuy} onChange={() => setOnlyGroupBuy(true)} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-600" />
                      <span className="flex-1 dark:text-slate-300">Achat groupé</span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main grid */}
            <div>
              {/* Toolbar */}
              <CatalogToolbar
                count={filteredProducts.length}
                sort={sortBy}
                onSortChange={(v: string) => setSortBy(v as typeof sortBy)}
                view={viewMode}
                onViewChange={setViewMode}
                onOpenMobileFilters={() => setShowFilters(true)}
                activeFiltersCount={
                  (debouncedSearch ? 1 : 0) +
                  (selected.length ? 1 : 0) +
                  (segment !== 'all' ? 1 : 0) +
                  (availabilityFilter !== 'all' ? 1 : 0) +
                  (onlyGroupBuy ? 1 : 0) +
                  (onlyPrice ? 1 : 0) +
                  (onlyQuote ? 1 : 0) +
                  (priceRange ? 1 : 0)
                }
              />

              {/* Loading skeleton */}
              {loading && filteredProducts.length === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({length: 10}).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden animate-pulse">
                      <div className="aspect-square bg-slate-100 dark:bg-slate-700" />
                      <div className="p-2.5 space-y-2">
                        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/2" />
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Grid */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredProducts.map((product, idx) => {
                    const p = apiToCatalog(product)
                    const pid = String(product.id || product._id || '')
                    return (
                      <CatalogProductCard
                        key={p.id}
                        product={p}
                        index={idx}
                        isFavorite={favoriteSet.has(pid)}
                        onToggleFavorite={toggleFavoriteFromList}
                        onAddToCart={addToCart}
                        onQuickView={() => handleQuickView(product)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map((product, idx) => {
                    const p = apiToCatalog(product)
                    const pid = String(product.id || product._id || '')
                    const isFavorite = favoriteSet.has(pid)
                    return (
                      <div
                        key={pid}
                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:shadow-md hover:border-orange-200 transition"
                      >
                        <div className="flex gap-4">
                          <Link href={`/produits/${pid}`} className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-700">
                            <img src={product.image || product.gallery?.[0] || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            {product.isFeatured && (
                              <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">✨ Nouveau</span>
                            )}
                          </Link>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <Link href={`/produits/${pid}`} className="font-semibold text-slate-900 dark:text-slate-200 text-sm line-clamp-2 hover:text-orange-600 transition">
                                {product.name}
                              </Link>
                              <button
                                onClick={(e) => toggleFavoriteFromList(e, pid)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition flex-shrink-0"
                                aria-label="Ajouter aux favoris"
                              >
                                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {product.rating !== undefined && product.rating > 0 && (
                                <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {product.rating.toFixed(1)}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 dark:text-slate-400">· {product.deliveryDays}j</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">· {product.isImported ? 'Import Chine' : 'Stock Dakar'}</span>
                              {product.groupBuyEnabled && (
                                <span className="text-xs bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded font-medium">👥 Groupe</span>
                              )}
                              {product.availabilityStatus === 'in_stock' && (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">En stock</span>
                              )}
                              {product.availabilityStatus === 'preorder' && (
                                <span className="text-xs bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Sur commande</span>
                              )}
                            </div>

                            {product.features && product.features.length > 0 && (
                              <div className="hidden sm:flex items-center gap-2 mt-2 flex-wrap">
                                {product.features.slice(0, 3).map((f, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{f}</span>
                                ))}
                              </div>
                            )}

                            <div className="mt-auto pt-2 flex items-center justify-between gap-3">
                              <div className="text-base font-bold text-orange-600">
                                {product.priceAmount ? `${product.priceAmount.toLocaleString('fr-FR')} ${product.currency || 'FCFA'}` : 'Sur devis'}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleQuickView(product)}
                                  className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-orange-600 transition"
                                >
                                  Vue rapide
                                </button>
                                <button
                                  onClick={() => addToCart(p)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                                >
                                  + Panier
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty state */}
              {!loading && filteredProducts.length === 0 && (
                <div className="text-center py-16">
                  <Package className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-2">Aucun produit trouvé</h3>
                  <p className="text-slate-600 dark:text-slate-400">Essayez de modifier vos critères de recherche</p>
                </div>
              )}

              {/* Infinite scroll */}
              {hasMore && (
                <div ref={observerTarget} className="mt-8 flex items-center justify-center py-6">
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Faites défiler pour voir plus</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* Mobile Filters Drawer */}
      {showFilters && (
        <div className="lg:hidden fixed inset-0 z-50" aria-hidden={!showFilters}>
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowFilters(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold dark:text-slate-200">Filtres</h3>
              <button onClick={()=>setShowFilters(false)} className="text-sm dark:text-slate-400">Fermer</button>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <h4 className="font-medium text-gray-900 dark:text-slate-200 mb-2">Recherche</h4>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Rechercher..." className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <h4 className="font-medium text-gray-900 dark:text-slate-200 mb-2">Catégories</h4>
              <div className="space-y-1 text-sm max-h-56 overflow-auto pr-1 dark:text-slate-400">
                {pillCategories.map((cat)=> (
                  <label key={cat.slug} className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.includes(cat.slug)} onChange={(e)=>{
                      setSelected((prev)=> e.target.checked ? [...prev, cat.slug] : prev.filter(id=>id!==cat.slug))
                    }} className="rounded border-slate-300 dark:border-slate-600" />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <h4 className="font-medium text-gray-900 dark:text-slate-200 mb-2">Tarif</h4>
              <div className="space-y-1 text-sm dark:text-slate-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyPrice} onChange={(e)=>{ setOnlyPrice(e.target.checked); if (e.target.checked) setOnlyQuote(false) }} className="rounded border-slate-300 dark:border-slate-600" />
                  <span>Avec prix</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyQuote} onChange={(e)=>{ setOnlyQuote(e.target.checked); if (e.target.checked) setOnlyPrice(false) }} className="rounded border-slate-300 dark:border-slate-600" />
                  <span>Sur devis</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyGroupBuy} onChange={(e)=> setOnlyGroupBuy(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600" />
                  <span>Achat groupé uniquement</span>
                </label>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <h4 className="font-medium text-gray-900 dark:text-slate-200 mb-2">Segment</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSegment('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-green-300'}`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setSegment('import')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'import' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-green-300'}`}
                >
                  Import
                </button>
                <button
                  onClick={() => setSegment('in_stock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'in_stock' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-green-300'}`}
                >
                  Stock Dakar
                </button>
                <button
                  onClick={() => setSegment('group_buy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'group_buy' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-green-300'}`}
                >
                  Achats groupés
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <h4 className="font-medium text-gray-900 dark:text-slate-200 mb-2">Disponibilité</h4>
              <div className="space-y-1 text-sm dark:text-slate-400">
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability-mobile" checked={availabilityFilter === 'all'} onChange={() => setAvailabilityFilter('all')} className="border-slate-300 dark:border-slate-600" />
                  <span>Tous</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability-mobile" checked={availabilityFilter === 'in_stock'} onChange={() => setAvailabilityFilter('in_stock')} className="border-slate-300 dark:border-slate-600" />
                  <span>En stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability-mobile" checked={availabilityFilter === 'preorder'} onChange={() => setAvailabilityFilter('preorder')} className="border-slate-300 dark:border-slate-600" />
                  <span>Sur commande</span>
                </label>
              </div>
            </div>
            <button onClick={()=>setShowFilters(false)} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 font-semibold">Appliquer</button>
          </div>
        </div>
      )}

      {/* Section Explicative déplacée vers /domotique (supprimée ici) */}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-green-600 via-green-700 to-violet-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Besoin d'aide pour choisir ?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Nos experts vous accompagnent dans le choix des produits les plus adaptés à vos besoins et votre budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/221774133440?text=Bonjour, j'ai besoin d'aide pour choisir des produits de sécurité électronique. Voici mes informations:%0A- Nom:%0A- Type de projet:%0A- Budget approximatif:%0A- Besoins spécifiques:%0AMerci"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Conseil WhatsApp
            </a>
            <Link
              href="/contact"
              className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Conseil personnalisé
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            <a
              href="tel:+221774133440"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-all duration-300 inline-flex items-center justify-center"
            >
              📞 +221 77 413 34 40
            </a>
          </div>
        </div>
      </section>

      {/* Barre de comparaison */}
      {showCompareBar && comparingProducts.size > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-900 rounded-xl shadow-2xl px-4 py-3 md:px-6 md:py-4 flex items-center gap-3 md:gap-4 max-w-[92vw] md:max-w-2xl">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">
              {comparingProducts.size} produit{comparingProducts.size > 1 ? 's' : ''} sélectionné{comparingProducts.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setComparingProducts(new Set())
                setShowCompareBar(false)
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Effacer
            </button>
            <button
              onClick={handleCompare}
              disabled={comparingProducts.size < 2}
              className="px-4 py-1.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Comparer ({comparingProducts.size})
            </button>
          </div>
        </div>
      )}

      {/* Modal de recherche par image */}
      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
        onResultsFound={(results) => {
          // Stocker les IDs des produits trouvés pour le filtrage
          const productIds = results.map(r => r.id)
          setImageSearchResults(productIds)
          // Fermer le modal
          setShowImageSearch(false)
        }}
        onRequestSourcing={(ctx) => {
          setSourcingContext(ctx)
          setShowImageSearch(false)
          // Lazy-load user profile pour pré-remplir téléphone si connecté
          if (!sourcingUser) {
            fetch('/api/auth/login', { credentials: 'include' })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data?.user) {
                  setSourcingUser({
                    id: data.user.id,
                    name: data.user.name || data.user.username,
                    phone: data.user.phone,
                    email: data.user.email,
                  })
                }
              })
              .catch(() => {})
          }
          setShowSourcing(true)
        }}
      />

      {/* Modal "Trouvez-moi ce produit" */}
      <SourcingRequestModal
        isOpen={showSourcing}
        onClose={() => {
          setShowSourcing(false)
          setSourcingContext(null)
        }}
        currentUser={sourcingUser}
        initialContext={sourcingContext}
      />

      {/* Modal Vue Rapide */}
      {quickViewData && (
        <QuickViewModal
          product={quickViewData}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={(product, qty) => addToCart(product, qty)}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      <MarketFooter />
      <MarketBottomNav />
    </main>
    </ErrorBoundary>
  )
}