"use client"
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import { Camera, Shield, Smartphone, Wifi, Cpu, Database, Star, ShoppingCart, CheckCircle, ArrowRight, Package, ArrowUpDown, Grid, List, X, GitCompare, Sparkles, Clock, Users, Heart, ChevronDown, ChevronUp, SlidersHorizontal, LayoutGrid, Search, Truck } from 'lucide-react'
import CatalogProductCard from '@/components/catalog/CatalogProductCard'
import CatalogToolbar from '@/components/catalog/CatalogToolbar'
import CategoryPillsScroller from '@/components/catalog/CategoryPillsScroller'
import PromoStrip from '@/components/catalog/PromoStrip'
import CartIcon from '@/components/CartIcon'
import CartDrawer from '@/components/CartDrawer'
import ErrorBoundary from '@/components/ErrorBoundary'
import ImageSearchModal, { ImageSearchButton } from '@/components/ImageSearchModal'
import SourcingRequestModal from '@/components/SourcingRequestModal'
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

// Produits de fallback en cas d'erreur API
const getFallbackProducts = (): ApiProduct[] => {
  return [
    {
      id: 'fallback-1',
      _id: 'fallback-1', // Compatibilité
      name: 'Caméra IP Hikvision 4MP',
      category: 'Vidéosurveillance',
      description: 'Caméra de surveillance haute définition avec vision nocturne et IA détection humain/véhicule',
      tagline: 'Livraison express 3 jours ou maritime économique 60 jours',
      priceAmount: 198500,
      currency: 'FCFA',
      image: '/images/fallback-camera.png',
      gallery: ['/images/fallback-camera.png'],
      requiresQuote: false,
      deliveryDays: 3,
      features: ['IA AcuSense intégrée', 'Vision nocturne ColorVu', 'Garantie 2 ans'],
      rating: 4.8,
      shippingOptions: [
        { id: 'air_express', label: 'Express aérien 3 jours', description: 'Livraison 72h Dakar', durationDays: 3, cost: 35000, total: 198500, currency: 'FCFA' },
        { id: 'air_15', label: 'Fret aérien 15 jours', description: 'Groupage aérien économique', durationDays: 15, cost: 22000, total: 185500, currency: 'FCFA' },
        { id: 'sea_freight', label: 'Fret maritime 60 jours', description: 'Transport maritime groupé', durationDays: 60, cost: 95000, total: 258500, currency: 'FCFA' }
      ],
      availabilityLabel: 'Commande sur demande (15 jours)',
      availabilityStatus: 'preorder'
    },
    {
      id: 'fallback-2',
      _id: 'fallback-2', // Compatibilité
      name: 'Terminal Contrôle d\'accès Facial',
      category: 'Contrôle d\'Accès',
      description: 'Terminal biométrique reconnaissance faciale & RFID pour entreprise',
      tagline: 'Sourcing direct usine Chine, installation Dakar',
      priceAmount: 275000,
      currency: 'FCFA',
      image: '/images/fallback-access.png',
      gallery: ['/images/fallback-access.png'],
      requiresQuote: false,
      deliveryDays: 15,
      features: ['Reconnaissance faciale < 0.2s', 'Support RFID & QR code', 'Application mobile incluse'],
      rating: 4.7,
      shippingOptions: [
        { id: 'air_15', label: 'Fret aérien 15 jours', description: 'Groupage aérien économique', durationDays: 15, cost: 45000, total: 275000, currency: 'FCFA' },
        { id: 'sea_freight', label: 'Fret maritime 60 jours', description: 'Transport maritime groupé', durationDays: 60, cost: 90000, total: 320000, currency: 'FCFA' }
      ],
      availabilityLabel: 'Commande sur demande (15 jours)',
      availabilityStatus: 'preorder'
    },
    {
      id: 'fallback-3',
      _id: 'fallback-3', // Compatibilité
      name: 'Kit alarme sans fil AX PRO',
      category: 'Alarme',
      description: 'Pack alarme résidentielle Hikvision AX PRO avec application mobile',
      priceAmount: 325000,
      currency: 'FCFA',
      image: '/images/fallback-alarm.png',
      gallery: ['/images/fallback-alarm.png'],
      requiresQuote: false,
      deliveryDays: 5,
      features: ['Installation rapide Dakar', 'Sirène 110dB', 'Batterie secours 24h'],
      rating: 4.9,
      shippingOptions: [
        { id: 'air_express', label: 'Express aérien 3 jours', description: 'Livraison 72h Dakar', durationDays: 3, cost: 65000, total: 325000, currency: 'FCFA' },
        { id: 'air_15', label: 'Fret aérien 15 jours', description: 'Groupage aérien économique', durationDays: 15, cost: 42000, total: 302000, currency: 'FCFA' }
      ],
      availabilityLabel: 'Disponible immédiatement à Dakar',
      availabilityStatus: 'in_stock'
    },
    {
      id: 'fallback-4',
      _id: 'fallback-4', // Compatibilité
      name: 'Switch PoE 16 ports Hikvision',
      category: 'Réseau',
      description: 'Switch PoE+ 16 ports pour infrastructure vidéosurveillance',
      priceAmount: 415000,
      currency: 'FCFA',
      image: '/images/fallback-network.png',
      gallery: ['/images/fallback-network.png'],
      requiresQuote: false,
      deliveryDays: 15,
      features: ['Budget PoE 230W', 'Gestion web & VLAN', 'Garantie 3 ans'],
      rating: 4.6,
      shippingOptions: [
        { id: 'air_15', label: 'Fret aérien 15 jours', description: 'Groupage aérien économique', durationDays: 15, cost: 65000, total: 415000, currency: 'FCFA' },
        { id: 'sea_freight', label: 'Fret maritime 60 jours', description: 'Transport maritime groupé', durationDays: 60, cost: 120000, total: 470000, currency: 'FCFA' }
      ],
      availabilityLabel: 'Commande sur demande (15 jours)',
      availabilityStatus: 'preorder'
    }
  ]
}

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
  const [activePill, setActivePill] = useState('Tous')
  const [products, setProducts] = useState<ApiProduct[]>([])
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
                image: item.image || item.gallery?.[0] || '/file.svg',
                gallery: Array.isArray(item.gallery) ? item.gallery : undefined,
                requiresQuote: item.requiresQuote || !priceAmount,
                deliveryDays: bestShipping?.durationDays ?? item.availability?.leadTimeDays ?? 0,
                features: features.length ? features : ['Import direct Chine', 'Livraison Dakar sécurisée'],
                rating: item.isFeatured ? 4.9 : 4.7,
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
              setProducts(getFallbackProducts())
              setAllProducts(getFallbackProducts())
            }
            setError('Mode démonstration - Connexion API indisponible')
          }
        } catch (err) {
          console.error('Error fetching products:', err)
          if (currentPage === 1) {
            setProducts(getFallbackProducts())
            setAllProducts(getFallbackProducts())
          }
          setError('Mode démonstration - Connexion API indisponible')
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
      image: p.image ?? '/file.svg',
      price: base,
      originalPrice: orig,
      currency: p.currency ?? 'FCFA',
      rating: p.rating ?? 4.0 + Math.random() * 0.9,
      soldCount: Math.floor(Math.random() * 300) + 20,
      discount: disc > 0 ? disc : undefined,
      origin: p.isImported ? 'Import Chine' : 'Stock Dakar',
      deliveryDays: p.deliveryDays ?? 3,
      isGroupBuy: isG,
      groupProgress: p.groupStats?.bestActiveGroup?.currentQty ?? 0,
      groupTarget: p.groupStats?.bestActiveGroup?.targetQty ?? 50,
      daysLeft: 5,
      isFlash: disc > 20,
      isNew: !!p.isFeatured,
      colorVariants: (Math.random() > 0.5 ? ['#1a1a1a', '#ffffff', '#c41e3a'] : ['#1D4ED8', '#065F46', '#92400E', '#ffffff']) as string[],
    }
  }

  function addToCart(product: any) {
    try {
      const raw = localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const existing = items.find((i: any) => i.id === product.id)
      if (existing) existing.qty = (existing.qty || 1) + 1
      else items.push({ id: product.id, name: product.name, price: product.price, currency: product.currency || 'FCFA', image: product.image, qty: 1 })
      localStorage.setItem('cart:items', JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('cart:updated'))
    } catch {}
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <MarketHeader />
        {/* Local cart icon for produits page */}
        <div className="fixed right-4 bottom-4 z-40">
          <CartIcon count={cartCount} onClick={() => setCartOpen(true)} />
        </div>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      
      {/* === STICKY SEARCH HEADER === */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Search bar compacte */}
          <div className="max-w-3xl mx-auto flex items-center gap-2 bg-white border border-slate-300 rounded-full p-1.5 shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
            <Search className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans 12 458 produits..."
              className="flex-1 outline-none bg-transparent px-2 text-sm min-w-0"
            />
            <button title="Recherche par image" onClick={() => setShowImageSearch(true)} className="p-2 hover:bg-slate-100 rounded-full flex-shrink-0">
              <Camera className="w-4 h-4 text-violet-600" />
            </button>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full text-sm font-medium flex-shrink-0">
              Rechercher
            </button>
          </div>
          {/* Breadcrumb + total */}
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Link href="/" className="hover:text-slate-700">Accueil</Link>
              <span>{'>'}</span>
              <span className="text-slate-700 font-medium">Catalogue</span>
              {activePill !== 'Tous' && (
                <>
                  <span>{'>'}</span>
                  <span className="text-slate-700 font-medium">{activePill}</span>
                </>
              )}
            </div>
            <span><strong className="text-slate-900">{filteredProducts.length.toLocaleString('fr-FR')}</strong> produits trouvés</span>
          </div>
        </div>
        {/* Category pills scroller */}
        <CategoryPillsScroller
          categories={['Tous','Mode','Beauté','Maison','Électronique','Auto','Sport','Cuisine','Bébé','Animaux','Outils']}
          active={activePill}
          onSelect={(cat) => {
            setActivePill(cat)
            if (cat === 'Tous') {
              setSelected([])
            } else {
              const map: Record<string,string> = {
                Mode:'mode', Beauté:'beaute', Maison:'maison', Électronique:'electronique',
                Auto:'auto', Sport:'sport', Cuisine:'cuisine', Bébé:'bebe', Animaux:'animaux', Outils:'outils'
              }
              setSelected(map[cat] ? [map[cat]] : [])
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
      <section className="py-6 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar */}
            <aside className="hidden md:block sticky top-[180px] h-[calc(100vh-200px)] overflow-y-auto pr-2">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-5">
                {/* Filtres actifs */}
                {(() => {
                  const activeFilters = []
                  if (debouncedSearch) activeFilters.push({key:'search',label:`"${debouncedSearch}"`})
                  if (selected.length) activeFilters.push({key:'category',label:`Cat: ${selected.join(', ')}`})
                  if (onlyGroupBuy) activeFilters.push({key:'group',label:'Achat groupé'})
                  if (onlyPrice) activeFilters.push({key:'price',label:'Avec prix'})
                  if (onlyQuote) activeFilters.push({key:'quote',label:'Sur devis'})
                  if (segment !== 'all') activeFilters.push({key:'segment',label:`Seg: ${segment}`})
                  if (availabilityFilter !== 'all') activeFilters.push({key:'avail',label:`Dispo: ${availabilityFilter}`})
                  if (priceRange) activeFilters.push({key:'priceRange',label:`Prix: ${priceRange.min}-${priceRange.max}`})
                  if (activePill !== 'Tous') activeFilters.push({key:'pill',label:`Cat: ${activePill}`})
                  return activeFilters.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-600">Filtres actifs</span>
                        <button onClick={() => {
                          setSearch(''); setDebouncedSearch(''); setSelected([]); setOnlyGroupBuy(false); setOnlyPrice(false); setOnlyQuote(false); setSegment('all'); setAvailabilityFilter('all'); setPriceRange(null); setActivePill('Tous')
                        }} className="text-xs text-violet-600 hover:underline">Réinitialiser</button>
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
                              case 'pill': setActivePill('Tous'); break
                            }
                          }} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-1 flex items-center gap-1">
                            {f.label} <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {/* Prix */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Prix (FCFA)</span>
                  </div>
                  <input type="range" min={0} max={500000} step={5000} value={priceRange?.max ?? 500000} onChange={e => setPriceRange({min: priceRange?.min ?? 0, max: Number(e.target.value)})} className="w-full accent-orange-500 mb-1" />
                  {/* Histogramme de prix visuel */}
                  <div className="flex items-end gap-[2px] h-8 mb-2 px-1">
                    {[30,45,20,60,85,40,55,70,35,50,90,65,30,45,25,55,40,70,50,35].map((h,i)=>{
                      const inRange = priceRange ? (i/20)*500000 <= (priceRange.max ?? 500000) && (i/20)*500000 >= (priceRange.min ?? 0) : true
                      return (
                        <div key={i} className={`flex-1 rounded-t-sm ${inRange ? 'bg-orange-300' : 'bg-slate-200'}`} style={{height:`${h}%`}} />
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={priceRange?.min ?? ''} onChange={e => setPriceRange({min: Number(e.target.value), max: priceRange?.max ?? 500000})} className="w-full text-xs border border-slate-200 rounded px-2 py-1" />
                    <input type="number" placeholder="Max" value={priceRange?.max ?? ''} onChange={e => setPriceRange({min: priceRange?.min ?? 0, max: Number(e.target.value)})} className="w-full text-xs border border-slate-200 rounded px-2 py-1" />
                  </div>
                </div>
                {/* Catégories */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Catégories</span>
                  </div>
                  <div className="space-y-1.5">
                    {['Mode','Beauté','Maison','Électronique','Auto','Sport','Cuisine'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900">
                        <input type="checkbox" checked={selected.includes(cat.toLowerCase())} onChange={() => setSelected(prev => prev.includes(cat.toLowerCase()) ? prev.filter(c => c !== cat.toLowerCase()) : [...prev, cat.toLowerCase()])} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                        <span className="flex-1">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Disponibilité */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Disponibilité</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                      <input type="radio" name="avail-sidebar" checked={availabilityFilter === 'all'} onChange={() => setAvailabilityFilter('all')} className="w-4 h-4 border-slate-300 text-orange-600" />
                      Tous
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                      <input type="radio" name="avail-sidebar" checked={availabilityFilter === 'in_stock'} onChange={() => setAvailabilityFilter('in_stock')} className="w-4 h-4 border-slate-300 text-orange-600" />
                      En stock
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                      <input type="radio" name="avail-sidebar" checked={availabilityFilter === 'preorder'} onChange={() => setAvailabilityFilter('preorder')} className="w-4 h-4 border-slate-300 text-orange-600" />
                      Sur commande
                    </label>
                  </div>
                </div>
                {/* Type d'achat */}
                <div>
                  <div className="flex items-center w-full text-sm font-semibold text-slate-800 mb-2 border-l-2 border-orange-500 pl-2">
                    <span>Type d'achat</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                      <input type="checkbox" checked={!onlyGroupBuy} onChange={() => setOnlyGroupBuy(false)} className="w-4 h-4 rounded border-slate-300 text-orange-600" />
                      <span className="flex-1">Achat individuel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                      <input type="checkbox" checked={onlyGroupBuy} onChange={() => setOnlyGroupBuy(true)} className="w-4 h-4 rounded border-slate-300 text-orange-600" />
                      <span className="flex-1">Achat groupé</span>
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
              />

              {/* Loading skeleton */}
              {loading && filteredProducts.length === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({length: 10}).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden animate-pulse">
                      <div className="aspect-square bg-slate-100" />
                      <div className="p-2.5 space-y-2">
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                        <div className="h-4 bg-slate-100 rounded w-1/3" />
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
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map((product) => (
                    <Link key={product.id || product._id} href={`/produits/${product.id || product._id}`} className="block bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition">
                      <div className="flex gap-3">
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-slate-50">
                          <img src={product.image || product.gallery?.[0] || '/file.svg'} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-slate-900 line-clamp-2">{product.name}</h3>
                          <div className="mt-1 text-xs text-slate-500">{product.rating} ★ · {product.deliveryDays}j</div>
                          <div className="mt-1 text-base font-bold text-orange-600">
                            {product.priceAmount ? `${product.priceAmount.toLocaleString('fr-FR')} ${product.currency || 'FCFA'}` : 'Sur devis'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && filteredProducts.length === 0 && (
                <div className="text-center py-16">
                  <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun produit trouvé</h3>
                  <p className="text-slate-600">Essayez de modifier vos critères de recherche</p>
                </div>
              )}

              {/* Infinite scroll */}
              {hasMore && (
                <div ref={observerTarget} className="mt-8 flex items-center justify-center py-6">
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                  ) : (
                    <p className="text-sm text-slate-400">Faites défiler pour voir plus</p>
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
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Filtres</h3>
              <button onClick={()=>setShowFilters(false)} className="text-sm">Fermer</button>
                    </div>
            <div className="bg-white border rounded-xl p-3">
              <h4 className="font-medium text-gray-900 mb-2">Recherche</h4>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Rechercher..." className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="bg-white border rounded-xl p-3">
              <h4 className="font-medium text-gray-900 mb-2">Catégories</h4>
              <div className="space-y-1 text-sm max-h-56 overflow-auto pr-1">
                {['Mode','Beauté','Maison','Électronique','Auto','Sport','Cuisine'].map((cat)=> (
                  <label key={cat} className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.includes(cat.toLowerCase())} onChange={(e)=>{
                      setSelected((prev)=> e.target.checked ? [...prev, cat.toLowerCase()] : prev.filter(id=>id!==cat.toLowerCase()))
                    }} />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-3">
              <h4 className="font-medium text-gray-900 mb-2">Tarif</h4>
              <div className="space-y-1 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyPrice} onChange={(e)=>{ setOnlyPrice(e.target.checked); if (e.target.checked) setOnlyQuote(false) }} />
                  <span>Avec prix</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyQuote} onChange={(e)=>{ setOnlyQuote(e.target.checked); if (e.target.checked) setOnlyPrice(false) }} />
                  <span>Sur devis</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyGroupBuy} onChange={(e)=> setOnlyGroupBuy(e.target.checked)} />
                  <span>Achat groupé uniquement</span>
                </label>
              </div>
            </div>
            <div className="bg-white border rounded-xl p-3">
              <h4 className="font-medium text-gray-900 mb-2">Segment</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSegment('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'}`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setSegment('import')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'import' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'}`}
                >
                  Import
                </button>
                <button
                  onClick={() => setSegment('in_stock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'in_stock' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'}`}
                >
                  Stock Dakar
                </button>
                <button
                  onClick={() => setSegment('group_buy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${segment === 'group_buy' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'}`}
                >
                  Achats groupés
                </button>
              </div>
            </div>
            <div className="bg-white border rounded-xl p-3">
              <h4 className="font-medium text-gray-900 mb-2">Disponibilité</h4>
              <div className="space-y-1 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability-mobile" checked={availabilityFilter === 'all'} onChange={() => setAvailabilityFilter('all')} />
                  <span>Tous</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability-mobile" checked={availabilityFilter === 'in_stock'} onChange={() => setAvailabilityFilter('in_stock')} />
                  <span>En stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability-mobile" checked={availabilityFilter === 'preorder'} onChange={() => setAvailabilityFilter('preorder')} />
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-green-300 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-gray-900">
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
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      <MarketFooter />
    </main>
    </ErrorBoundary>
  )
}