"use client"
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Camera, Shield, Smartphone, Wifi, Cpu, Database, Star, ShoppingCart, CheckCircle, ArrowRight, Package, ArrowUpDown, Grid, List, X, GitCompare, Sparkles, Clock } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import CartIcon from '@/components/CartIcon'
import CartDrawer from '@/components/CartDrawer'
import ErrorBoundary from '@/components/ErrorBoundary'
import ImageSearchModal, { ImageSearchButton } from '@/components/ImageSearchModal'
import { useEffect, useState, useMemo } from 'react'
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
  const [showFilters, setShowFilters] = useState(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'rating-desc'>('default')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in_stock' | 'preorder'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [comparingProducts, setComparingProducts] = useState<Set<string>>(new Set())
  const [showCompareBar, setShowCompareBar] = useState(false)
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null)
  const [deliveryRange, setDeliveryRange] = useState<{ min: number; max: number } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: any }>>([])
  // Recherche par image
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [imageSearchResults, setImageSearchResults] = useState<string[]>([]) // IDs des produits trouvés

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

    // Charger les produits depuis l'API
    useEffect(() => {
      const fetchProducts = async () => {
        try {
          setLoading(true)
          setError(null)

          const response = await fetch(`/api/catalog/products?page=${currentPage}&limit=24`, {
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
              setCurrentPage(data.pagination.page || 1)
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
              const shippingHighlights = shipping.slice(0, 2).map((opt) => `${opt.label} · ${opt.total.toLocaleString('fr-FR')} ${opt.currency}`)
              const availabilityHighlight = item.availability?.label ? [item.availability.label] : []

              const features = [...featuresFromApi, ...shippingHighlights, ...availabilityHighlight]

              return {
                id: item.id,
                _id: item.id, // Deprecated - utiliser id
                name: item.name,
                category: item.category || 'Catalogue import Chine',
                description: item.description || item.tagline || 'Équipement import direct Chine avec installation Dakar',
                tagline: item.tagline || undefined,
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
                isFeatured: item.isFeatured || false
              }
            })
            setProducts(formatted)
          } else {
            setProducts(getFallbackProducts())
            setError('Mode démonstration - Connexion API indisponible')
          }
        } catch (err) {
          console.error('Error fetching products:', err)
          setProducts(getFallbackProducts())
          setError('Mode démonstration - Connexion API indisponible')
        } finally {
          setLoading(false)
        }
      }

      fetchProducts()
    }, [currentPage])

  // Charger les filtres sauvegardés et l'historique
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedFilters')
      if (saved) {
        setSavedFilters(JSON.parse(saved))
      }
      
      // Restaurer les filtres depuis l'URL ou localStorage
      const urlParams = new URLSearchParams(window.location.search)
      const savedState = localStorage.getItem('productFilters')
      if (savedState) {
        const state = JSON.parse(savedState)
        if (state.search) setSearch(state.search)
        if (state.selected && Array.isArray(state.selected)) setSelected(state.selected)
        if (state.sortBy) setSortBy(state.sortBy)
        if (state.availabilityFilter) setAvailabilityFilter(state.availabilityFilter)
        if (state.priceRange) setPriceRange(state.priceRange)
        if (state.deliveryRange) setDeliveryRange(state.deliveryRange)
        if (state.viewMode) setViewMode(state.viewMode)
        if (state.onlyPrice !== undefined) setOnlyPrice(state.onlyPrice)
        if (state.onlyQuote !== undefined) setOnlyQuote(state.onlyQuote)
      }
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
  }, [search, selected, onlyPrice, onlyQuote, sortBy, availabilityFilter, priceRange, deliveryRange, viewMode])

  // Debounce de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Calcul des produits filtrés et triés
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Si recherche par image active, filtrer uniquement les produits trouvés
      if (imageSearchResults.length > 0) {
        if (!imageSearchResults.includes(product.id)) {
          return false
        }
      }
      
      const text = `${product.name} ${product.description}`.toLowerCase()
      const matchesSearch = debouncedSearch.trim().length === 0 || text.includes(debouncedSearch.toLowerCase())
      const matchesTarif = onlyPrice ? !!product.priceAmount : onlyQuote ? product.requiresQuote : true
      const matchesCategory = selected.length === 0 || selected.includes(product.category || 'Catalogue import Chine')
      const matchesAvailability = availabilityFilter === 'all' || product.availabilityStatus === availabilityFilter
      const matchesPrice = !priceRange || !product.priceAmount || 
        (product.priceAmount >= (priceRange.min || 0) && product.priceAmount <= (priceRange.max || 999999999))
      const matchesDelivery = !deliveryRange || !product.deliveryDays ||
        (product.deliveryDays >= (deliveryRange.min || 0) && product.deliveryDays <= (deliveryRange.max || 999))
      return matchesSearch && matchesTarif && matchesCategory && matchesAvailability && matchesPrice && matchesDelivery
    })

    // Tri des produits
    if (sortBy !== 'default') {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'price-asc':
            return (a.priceAmount || 0) - (b.priceAmount || 0)
          case 'price-desc':
            return (b.priceAmount || 0) - (a.priceAmount || 0)
          case 'name-asc':
            return a.name.localeCompare(b.name, 'fr')
          case 'name-desc':
            return b.name.localeCompare(a.name, 'fr')
          case 'rating-desc':
            return (b.rating || 0) - (a.rating || 0)
          default:
            return 0
        }
      })
    }

    return filtered
  }, [products, debouncedSearch, onlyPrice, onlyQuote, selected, availabilityFilter, priceRange, deliveryRange, sortBy, imageSearchResults])

  // Gestion de la comparaison
  const handleCompareToggle = (productId: string, isSelected: boolean) => {
    setComparingProducts((prev) => {
      const newSet = new Set(prev)
      if (isSelected) {
        if (newSet.size >= 3) {
          alert('Vous ne pouvez comparer que 3 produits maximum')
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
      alert('Sélectionnez au moins 2 produits à comparer')
      return
    }
    const ids = Array.from(comparingProducts).join(',')
    window.location.href = `/produits/compare?ids=${ids}`
  }
  const categories = [
    {
      id: 'cameras',
      title: 'Caméras Surveillance Pro',
      icon: Camera,
      description: 'Hikvision, Dahua, Uniview - Dernière génération 4K avec IA. Approvisionnement direct Chine pour qualité/prix optimal',
      products: [
        {
          name: 'Hikvision DS-2CD2143G2-I',
          model: 'Caméra IP 4K AcuSense',
          price: 'Devis sur WhatsApp',
          features: ['4K Ultra HD 8MP', 'IA AcuSense intégrée', 'Vision nocturne ColorVu', 'Audio bidirectionnel', 'Détection humain/véhicule'],
          rating: 4.9,
          popular: true,
          image: '📷'
        },
        {
          name: 'Hikvision DS-2CD2643G2-IZS',
          model: 'Caméra Varifocale Motorisée',
          price: 'Devis sur WhatsApp',
          features: ['4K 8MP', 'Zoom motorisé 2.8-12mm', 'Vision nocturne 60m', 'IK10 anti-vandalisme', 'H.265+ compression'],
          rating: 4.8,
          image: '🎥'
        },
        {
          name: 'Hikvision DS-2CD2387G2-LU',
          model: 'Caméra Turret ColorVu',
          price: 'Devis sur WhatsApp',
          features: ['8MP 4K', 'ColorVu 24h/24', 'Audio intégré', 'Smart Hybrid Light', 'Strobe lumineux'],
          rating: 4.7,
          image: '📹'
        },
        {
          name: 'Hikvision DS-2DE4A425IW-DE',
          model: 'Caméra PTZ IR 4MP',
          price: 'Devis sur WhatsApp',
          features: ['4MP PTZ', 'Zoom optique 25x', 'Auto-tracking', 'Vision nocturne 100m', 'Protection IP66'],
          rating: 4.9,
          image: '🔄'
        },
        {
          name: 'Dahua DH-IPC-HFW3249T1P-AS-PV',
          model: 'Caméra Full Color 2MP',
          price: 'Devis sur WhatsApp',
          features: ['Full Color 24h/24', 'IA SMD Plus', 'Audio actif deterrent', 'Sirène + LED blanc', 'IP67'],
          rating: 4.8,
          image: '🌈'
        },
        {
          name: 'Uniview IPC2128LR3-PF40-D',
          model: 'Caméra IP 8MP LightHunter',
          price: 'Devis sur WhatsApp',
          features: ['8MP 4K', 'LightHunter 0.005 lux', 'Smart IR 30m', 'Audio intégré', 'IK10 anti-vandalisme'],
          rating: 4.7,
          image: '🌙'
        }
      ]
    },
    {
      id: 'controle-acces',
      title: 'Contrôle d\'Accès Multi-Marques',
      icon: Shield,
      description: 'Hikvision, Dahua, Uniview - Terminaux reconnaissance faciale et biométrique. Import direct (Chine)',
      products: [
        {
          name: 'Hikvision DS-K1T341CMF',
          model: 'Terminal Facial + Empreinte',
          price: 'Devis sur WhatsApp',
          features: ['Reconnaissance faciale', 'Scanner empreintes', 'Lecteur RFID', '1500 utilisateurs', 'Écran 4.3"'],
          rating: 4.8,
          popular: true,
          image: '👤'
        },
        {
          name: 'Hikvision DS-K1T690MF-X',
          model: 'Terminal Ultra Série',
          price: 'Devis sur WhatsApp',
          features: ['Écran 15.6" tactile', '100 000 visages', 'Double caméra 2MP', 'Précision >99%', 'Détection masque'],
          rating: 4.9,
          image: '🖥️'
        },
        {
          name: 'Hikvision DS-K1T671MF',
          model: 'Terminal avec Thermométrie',
          price: 'Devis sur WhatsApp',
          features: ['Mesure température', 'Reconnaissance faciale', 'Écran 7" tactile', 'Détection fièvre', 'Alerte sanitaire'],
          rating: 4.7,
          image: '🌡️'
        },
        {
          name: 'Dahua ASI7213Y-V3',
          model: 'Terminal Facial + QR Code',
          price: 'Devis sur WhatsApp',
          features: ['Reconnaissance faciale rapide', 'Scan QR code', 'Écran 5" IPS', 'Caméra 2MP WDR', 'Détection masque'],
          rating: 4.6,
          image: '📱'
        },
        {
          name: 'Uniview UV-AC-F710-MF-P',
          model: 'Terminal Multimodal Pro',
          price: 'Devis sur WhatsApp',
          features: ['Face + Fingerprint + Card', 'Écran 7" couleur', 'Capacité 50000 faces', 'TCP/IP + WiFi', 'Détection vivacité'],
          rating: 4.5,
          image: '🔐'
        }
      ]
    },
    {
      id: 'alarmes',
      title: 'Kits Alarme Hikvision',
      icon: Shield,
      description: 'Systèmes d\'alarme sans fil avec application mobile et télésurveillance',
      products: [
        {
          name: 'Hikvision AX PRO',
          model: 'Kit Alarme Sans Fil',
          price: 'Devis sur WhatsApp',
          features: ['Hub central', '8 détecteurs inclus', 'App Hik-Connect', 'Sirène 110dB', 'Batterie 24h'],
          rating: 4.8,
          popular: true,
          image: '🚨'
        },
        {
          name: 'Hikvision AX Hub',
          model: 'Centrale Pro',
          price: 'Devis sur WhatsApp',
          features: ['32 zones sans fil', 'Communication 4G/WiFi', 'Sirène intégrée', 'Batterie secours', 'Extensible'],
          rating: 4.7,
          image: '📡'
        }
      ]
    },
    {
      id: 'visiophonie',
      title: 'Visiophonie Hikvision',
      icon: Smartphone,
      description: 'Interphones vidéo IP avec écrans haute définition',
      products: [
        {
          name: 'Hikvision DS-KH6320-WTE1',
          model: 'Moniteur Intérieur 7"',
          price: 'Devis sur WhatsApp',
          features: ['Écran 7" tactile', 'Connexion WiFi', 'App mobile', 'Enregistrement', 'Mémoire 8GB'],
          rating: 4.6,
          popular: true,
          image: '📱'
        },
        {
          name: 'Hikvision DS-KD8003-IME1',
          model: 'Portier Vidéo Extérieur',
          price: 'Devis sur WhatsApp',
          features: ['Caméra 2MP grand angle', 'Vision nocturne IR', 'Audio bidirectionnel', 'Carte RFID', 'IP65'],
          rating: 4.8,
          image: '🚪'
        }
      ]
    },
    {
      id: 'domotique',
      title: '🏠 Domotique & Bâtiment Intelligent',
      icon: Wifi,
      description: '🔄 RETROFIT : Rendez smart votre installation existante OU 🏗️ NEUF : Équipements intelligents directs • WiFi • Bluetooth • Zigbee',
      products: [
        {
          name: '🏠 Hub Central Zigbee',
          model: 'Passerelle Multi-Protocoles',
          price: 'Devis sur WhatsApp',
          features: ['Zigbee 3.0 + WiFi + Bluetooth', 'App mobile unifiée', 'Compatible Alexa/Google', '256 appareils max', 'Contrôle vocal'],
          rating: 4.8,
          popular: true,
          image: '🏠'
        },
        {
          name: '🔄 Micro-Module Retrofit',
          model: 'Smart Switch Encastrable',
          price: 'Devis sur WhatsApp',
          features: ['Installation derrière interrupteur existant', 'Aucun changement visible', 'Contrôle à distance', 'Programmation horaire', 'Retour d\'état'],
          rating: 4.9,
          popular: true,
          image: '🔧'
        },
        {
          name: '🏗️ Interrupteur Smart Direct',
          model: 'Smart Switch Nouvelle Construction',
          price: 'Devis sur WhatsApp',
          features: ['Écran tactile intégré', 'Design moderne', '3 gangs indépendants', 'Contrôle vocal', 'Scénarios avancés'],
          rating: 4.7,
          image: '💡'
        },
        {
          name: '👁️ Capteur Mouvement PIR',
          model: 'Motion Detector Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Détection 120° infrarouge', 'Batterie 2 ans', 'Déclenchement automatique', 'Installation magnétique', 'Discret'],
          rating: 4.6,
          image: '👁️'
        },
        {
          name: '🌡️ Capteur Température/Humidité',
          model: 'Climate Sensor Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Température -20°C à +60°C', 'Humidité 0-100%', 'Historique données', 'Alertes seuils', 'Écran LCD'],
          rating: 4.5,
          image: '🌡️'
        },
        {
          name: '🔌 Prise Connectée 16A',
          model: 'Smart Plug WiFi/Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Mesure consommation temps réel', 'Timer programmable', 'Contrôle à distance', 'Protection surtension', '16A max'],
          rating: 4.4,
          image: '🔌'
        },
        {
          name: '📊 Compteur Intelligent',
          model: 'Smart Energy Meter',
          price: 'Devis sur WhatsApp',
          features: ['Mesure consommation électrique', 'Données temps réel', 'Détection anomalies', 'Export données', 'Installation modulaire'],
          rating: 4.7,
          image: '📊'
        },
        {
          name: '📱 Télécommande Smart',
          model: 'Universal Remote Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Contrôle infrarouge universel', 'Base de données 8000+ appareils', 'Scénarios personalisés', 'App mobile', 'Compact'],
          rating: 4.6,
          image: '📱'
        },
        {
          name: '🚪 Contact Intelligent',
          model: 'Smart Door/Window Sensor',
          price: 'Devis sur WhatsApp',
          features: ['Détection ouverture/fermeture', 'Batterie 2 ans', 'Alertes instantanées', 'Installation aimant', 'Étanche IP54'],
          rating: 4.5,
          image: '🚪'
        },
        {
          name: '🏠 Module Volets/Stores',
          model: 'Smart Shutter Control',
          price: 'Devis sur WhatsApp',
          features: ['Motorisation volets/stores', 'Programmation solaire', 'Contrôle pourcentage', 'Sécurité anti-pincement', 'Installation facile'],
          rating: 4.8,
          image: '🏠'
        },
        {
          name: '🔊 Sirène Intelligente',
          model: 'Smart Alarm Siren Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['110dB volume réglable', 'LED clignotantes', 'Batterie secours', 'Déclenchement automatique', 'Anti-sabotage'],
          rating: 4.7,
          image: '🔊'
        },
        {
          name: '💡 Module Variation',
          model: 'Smart Dimmer Module',
          price: 'Devis sur WhatsApp',
          features: ['Variation 0-100%', 'LED + Halogène compatible', 'Installation 1 ou 2 fils', 'Mémorisation niveaux', 'Protection surcharge'],
          rating: 4.6,
          image: '💡'
        }
      ]
    },
    {
      id: 'reseau',
      title: 'Infrastructure Réseau',
      icon: Database,
      description: 'Équipements réseau professionnels Hikvision pour une connectivité optimale',
      products: [
        {
          name: 'Switch PoE Hikvision',
          model: 'DS-3E0318P-E/M',
          price: 'Devis sur WhatsApp',
          features: ['18 ports PoE+', 'Budget 250W', 'Gestion web', 'VLAN support', 'Garantie 3 ans'],
          rating: 4.8,
          popular: true,
          image: '🔌'
        },
        {
          name: 'NVR Hikvision 32 canaux',
          model: 'DS-7732NI-I4/16P',
          price: 'Devis sur WhatsApp',
          features: ['32 canaux IP', '16 ports PoE', '4K output', 'RAID support', 'VCA avancé'],
          rating: 4.9,
          image: '💾'
        },
        {
          name: 'Point d\'Accès WiFi 6',
          model: 'Enterprise Grade',
          price: 'Devis sur WhatsApp',
          features: ['WiFi 6 AX1800', 'PoE+', 'Dual Band', 'Management cloud', 'Enterprise grade'],
          rating: 4.7,
          image: '📡'
        }
      ]
    },
    {
      id: 'network-cabling',
      title: '🌐 Câblage Réseau & TV Bâtiment',
      icon: Wifi,
      description: 'Infrastructure complète Cat6A/Cat7 + TV satellite. Installation optimale dès la construction pour performance maximale',
      products: [
        {
          name: '📡 Câble Cat6A UTP 305m',
          model: 'Legrand LCS3 Certified',
          price: 'Devis sur WhatsApp',
          features: ['Certifié 10 Gbps', 'Gaine LSOH anti-feu', 'Blindage optimisé', 'Bobine professionnelle', '25 ans garantie'],
          rating: 4.8,
          popular: true,
          image: '📡'
        },
        {
          name: '📺 Câble Coaxial RG6 Triple Blindage',
          model: 'Satellite/TNT Premium',
          price: 'Devis sur WhatsApp',
          features: ['Triple blindage haute qualité', 'Impédance 75Ω précise', 'Gaine extérieure UV résistante', 'Connecteur F intégré', 'Signal optimal'],
          rating: 4.7,
          image: '📺'
        },
        {
          name: '🔌 Prise RJ45 Cat6A Blindée',
          model: 'Legrand Mosaic Professional',
          price: 'Devis sur WhatsApp',
          features: ['Connexion IDC sans outil', 'Blindage 360°', 'Test automatique', 'Détrompeur intégré', 'Finition premium'],
          rating: 4.9,
          image: '🔌'
        },
        {
          name: '🏢 Baie Brassage 19" 12U',
          model: 'Armoire Réseau Professionnelle',
          price: 'Devis sur WhatsApp',
          features: ['19 pouces standard', 'Ventilation optimisée', 'Panneau brassage 24 ports', 'Serre-câbles inclus', 'Serrure sécurisée'],
          rating: 4.6,
          image: '🏢'
        },
        {
          name: '📊 Testeur Certification Cat6A',
          model: 'Qualification Performance',
          price: 'Devis sur WhatsApp',
          features: ['Tests certification TIA/ISO', 'Mesures longueur précises', 'Détection défauts', 'Rapport automatique', 'Traçabilité complète'],
          rating: 4.8,
          image: '📊'
        },
        {
          name: '📋 Documentation Technique',
          model: 'Plan Câblage Complet',
          price: 'Devis sur WhatsApp',
          features: ['Plans AutoCAD détaillés', 'Étiquetage professionnel', 'Numérotation logique', 'Base données Excel', 'Formation équipe'],
          rating: 4.7,
          image: '📋'
        }
      ]
    },
    {
      id: 'fiber-optic',
      title: '⚡ Fibre Optique FTTH Professionnelle',
      icon: Wifi,
      description: '🔗 BPI • PBO • PTO pour opérateurs. Installation complète prête raccordement Orange/Free/SFR. Projet Antalya réalisé ✅',
      products: [
        {
          name: '🔗 BPI 8 Départs Extérieur',
          model: 'CommScope FlexNAP F08',
          price: 'Devis sur WhatsApp',
          features: ['8 sorties fibres SC/APC', 'Étanche IP65', 'Verrouillage sécurisé', 'Montage poteau/mural', 'Norme opérateurs'],
          rating: 4.9,
          popular: true,
          image: '🔗'
        },
        {
          name: '📡 PBO 4 Ports Étage',
          model: 'Point Branchement Optique',
          price: 'Devis sur WhatsApp',
          features: ['4 connecteurs SC/APC', 'Montage mural discret', 'Cassettes de protection', 'Traçabilité fibres', 'Accès sécurisé'],
          rating: 4.8,
          image: '📡'
        },
        {
          name: '🏠 PTO Prise Terminale',
          model: 'Prise Murale SC/APC',
          price: 'Devis sur WhatsApp',
          features: ['Prise finale appartement', 'Connecteur SC/APC', 'Encastrable Legrand', 'Faible perte insertion', 'Finition élégante'],
          rating: 4.7,
          image: '🏠'
        },
        {
          name: '⚡ Fibre G.657.A2 12F',
          model: 'Corning OptiTap Monomode',
          price: 'Devis sur WhatsApp',
          features: ['12 fibres G.657.A2', 'Résistante flexion', 'Gaine LSOH', 'Marquage métrage', 'Qualité Corning'],
          rating: 4.9,
          popular: true,
          image: '⚡'
        },
        {
          name: '🔧 Cassette Soudure 12F',
          model: 'Protection Épissurage',
          price: 'Devis sur WhatsApp',
          features: ['12 soudures protégées', 'Enrouleur fibres', 'Empilage modulaire', 'Identification claire', 'Accès facile'],
          rating: 4.6,
          image: '🔧'
        },
        {
          name: '📊 Tests OTDR + Certification',
          model: 'Mesures Optiques Complètes',
          price: 'Devis sur WhatsApp',
          features: ['Réflectométrie OTDR', 'Mesures perte insertion', 'Certificats conformité', 'Dossier technique opérateur', 'Garantie 25 ans'],
          rating: 4.8,
          image: '📊'
        }
      ]
    },
    {
      id: 'digitalisation',
      title: 'Solutions Digitales',
      icon: Cpu,
      description: 'Digitalisation complète : développement, middleware, data science, DevOps',
      products: [
        {
          name: 'Application Mobile Custom',
          model: 'Développement sur mesure',
          price: 'Devis sur WhatsApp',
          features: ['iOS + Android', 'Backend API', 'Design UX/UI', 'Maintenance incluse', 'Architecture microservices'],
          rating: 4.9,
          popular: true,
          image: '📱'
        },
        {
          name: 'Plateforme Web Enterprise',
          model: 'Solution complète',
          price: 'Devis sur WhatsApp',
          features: ['Spring Boot/React', 'Base de données', 'Sécurité OAuth2', 'CI/CD pipeline', 'Cloud deployment'],
          rating: 4.8,
          image: '🌐'
        },
        {
          name: 'Middleware & API',
          model: 'Intégration systèmes',
          price: 'Devis sur WhatsApp',
          features: ['API Gateway', 'Message queues', 'Data transformation', 'Legacy integration', 'Monitoring'],
          rating: 4.7,
          image: '⚙️'
        },
        {
          name: 'Business Intelligence',
          model: 'Analytics & Reporting',
          price: 'Devis sur WhatsApp',
          features: ['Data warehouse', 'Dashboards interactifs', 'Machine Learning', 'Reporting automatisé', 'Big Data'],
          rating: 4.8,
          image: '📊'
        },
        {
          name: 'DevOps & Cloud',
          model: 'Infrastructure moderne',
          price: 'Devis sur WhatsApp',
          features: ['Docker/Kubernetes', 'CI/CD GitHub Actions', 'Monitoring Grafana', 'Cloud AWS/Azure', 'Sécurité'],
          rating: 4.9,
          image: '☁️'
        }
      ]
    }
  ]

  return (
    <ErrorBoundary>
      <main>
        <Header />
        {/* Local cart icon for produits page */}
        <div className="fixed right-4 bottom-4 z-40">
          <CartIcon count={cartCount} onClick={() => setCartOpen(true)} />
        </div>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      
      {/* Hero Section avec Cartes de Fonctionnalités */}
      <section className="relative bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 page-content pt-24 pb-12 mt-16 overflow-hidden">
        {/* Effets de fond subtils */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header minimaliste */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Catalogue <span className="text-emerald-600">Pro</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Équipements de sécurité • Import direct • Prix compétitifs
            </p>
          </div>
          
          {/* Cartes de fonctionnalités épurées */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* Carte 1 - Import Direct */}
            <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-200 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Import Direct</h3>
              <p className="text-sm text-gray-500">Chine → Dakar sans intermédiaire</p>
            </div>
            
            {/* Carte 2 - Marques Premium */}
            <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Marques Leaders</h3>
              <p className="text-sm text-gray-500">Hikvision, Dahua, Uniview</p>
            </div>
            
            {/* Carte 3 - Livraison Express */}
            <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Express 3 Jours</h3>
              <p className="text-sm text-gray-500">Ou maritime économique 60j</p>
            </div>
            
            {/* Carte 4 - Garantie */}
            <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Garantie & SAV</h3>
              <p className="text-sm text-gray-500">Installation Dakar incluse</p>
            </div>
          </div>
        </div>
      </section>

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

      {/* Products Sections with sidebar filters */}
      <section className="py-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile filter bar */}
          <div className="lg:hidden mb-4 flex items-center justify-between">
            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm mr-2"
            />
            <ImageSearchButton onClick={() => setShowImageSearch(true)} />
            <button onClick={()=>setShowFilters(true)} className="px-3 py-2 border rounded-lg text-sm ml-2">Filtres</button>
          </div>

          <div className="flex gap-6">
            {/* Sidebar Filters Moderne */}
            <aside className="w-72 hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Recherche
                  </h3>
                  <input
                    value={search}
                    onChange={(e)=>setSearch(e.target.value)}
                    placeholder="Rechercher un produit..."
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all mb-3"
                  />
                  {/* Bouton recherche par image */}
                  <ImageSearchButton onClick={() => setShowImageSearch(true)} />
                  {/* Badge résultats recherche image */}
                  {imageSearchResults.length > 0 && (
                    <div className="mt-3 flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="text-xs text-emerald-700 font-medium">
                        {imageSearchResults.length} produit{imageSearchResults.length > 1 ? 's' : ''} similaire{imageSearchResults.length > 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => setImageSearchResults([])}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        Effacer
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Filtres avancés */}
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5 text-emerald-600" />
                    Filtres avancés
                  </h3>
                  
                  {/* Prix */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Prix (FCFA)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        onChange={(e) => {
                          const min = e.target.value ? parseInt(e.target.value) : 0
                          setPriceRange(prev => ({ min, max: prev?.max || 999999999 }))
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        onChange={(e) => {
                          const max = e.target.value ? parseInt(e.target.value) : 999999999
                          setPriceRange(prev => ({ min: prev?.min || 0, max }))
                        }}
                      />
                    </div>
                    {priceRange && (
                      <button
                        onClick={() => setPriceRange(null)}
                        className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  
                  {/* Délai */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Délai (jours)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        onChange={(e) => {
                          const min = e.target.value ? parseInt(e.target.value) : 0
                          setDeliveryRange(prev => ({ min, max: prev?.max || 999 }))
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        onChange={(e) => {
                          const max = e.target.value ? parseInt(e.target.value) : 999
                          setDeliveryRange(prev => ({ min: prev?.min || 0, max }))
                        }}
                      />
                    </div>
                    {deliveryRange && (
                      <button
                        onClick={() => setDeliveryRange(null)}
                        className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-600" />
                    Catégories
                  </h3>
                  <div className="space-y-1 text-xs max-h-48 overflow-y-auto scrollbar-hide">
                    {Array.from(new Set(products.map(p => p.category || 'Catalogue import Chine'))).map((category) => (
                      <label key={category} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-emerald-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selected.includes(category)}
                          onChange={(e)=>{
                            setSelected((prev)=> e.target.checked ? [...prev, category] : prev.filter(id=>id!==category))
                          }}
                          className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-emerald-600" />
                    Tarif
                  </h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={onlyPrice} onChange={(e)=>{ setOnlyPrice(e.target.checked); if (e.target.checked) setOnlyQuote(false) }} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <span className="font-medium text-gray-700">Avec prix</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={onlyQuote} onChange={(e)=>{ setOnlyQuote(e.target.checked); if (e.target.checked) setOnlyPrice(false) }} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <span className="font-medium text-gray-700">Sur devis</span>
                    </label>
                  </div>
                </div>
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    Disponibilité
                  </h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                      <input type="radio" name="availability" checked={availabilityFilter === 'all'} onChange={() => setAvailabilityFilter('all')} className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500" />
                      <span className="font-medium text-gray-700">Tous</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                      <input type="radio" name="availability" checked={availabilityFilter === 'in_stock'} onChange={() => setAvailabilityFilter('in_stock')} className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500" />
                      <span className="font-medium text-gray-700">En stock</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                      <input type="radio" name="availability" checked={availabilityFilter === 'preorder'} onChange={() => setAvailabilityFilter('preorder')} className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500" />
                      <span className="font-medium text-gray-700">Sur commande</span>
                    </label>
                  </div>
                </div>
                {/* Filtres sauvegardés */}
                {savedFilters.length > 0 && (
                  <div className="bg-white border rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Filtres sauvegardés</h3>
                    <div className="space-y-2">
                      {savedFilters.map((saved, index) => (
                        <div key={index} className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              if (saved.filters.search) setSearch(saved.filters.search)
                              if (saved.filters.selected && Array.isArray(saved.filters.selected)) setSelected(saved.filters.selected)
                              if (saved.filters.onlyPrice !== undefined) setOnlyPrice(saved.filters.onlyPrice)
                              if (saved.filters.onlyQuote !== undefined) setOnlyQuote(saved.filters.onlyQuote)
                              if (saved.filters.sortBy) setSortBy(saved.filters.sortBy)
                              if (saved.filters.availabilityFilter) setAvailabilityFilter(saved.filters.availabilityFilter)
                              if (saved.filters.priceRange) setPriceRange(saved.filters.priceRange)
                              if (saved.filters.deliveryRange) setDeliveryRange(saved.filters.deliveryRange)
                              if (saved.filters.viewMode) setViewMode(saved.filters.viewMode)
                            }}
                            className="flex-1 text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded"
                          >
                            {saved.name}
                          </button>
                          <button
                            onClick={() => {
                              const updated = savedFilters.filter((_, i) => i !== index)
                              setSavedFilters(updated)
                              localStorage.setItem('savedFilters', JSON.stringify(updated))
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const name = prompt('Nom du filtre:')
                        if (name) {
                          const newSaved = {
                            name,
                            filters: {
                              search,
                              selected,
                              onlyPrice,
                              onlyQuote,
                              sortBy,
                              availabilityFilter,
                              priceRange,
                              deliveryRange,
                              viewMode
                            }
                          }
                          const updated = [...savedFilters, newSaved]
                          setSavedFilters(updated)
                          localStorage.setItem('savedFilters', JSON.stringify(updated))
                        }
                      }}
                      className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                    >
                      Sauvegarder les filtres actuels
                    </button>
                  </div>
                )}
                {/* Filtres actifs */}
                {(selected.length > 0 || onlyPrice || onlyQuote || availabilityFilter !== 'all' || sortBy !== 'default' || priceRange || deliveryRange) && (
                  <div className="bg-white border rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Filtres actifs</h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelected(selected.filter(c => c !== cat))}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-200"
                        >
                          {cat}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                      {onlyPrice && (
                        <button
                          onClick={() => setOnlyPrice(false)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-200"
                        >
                          Avec prix
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {onlyQuote && (
                        <button
                          onClick={() => setOnlyQuote(false)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-200"
                        >
                          Sur devis
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {availabilityFilter !== 'all' && (
                        <button
                          onClick={() => setAvailabilityFilter('all')}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-200"
                        >
                          {availabilityFilter === 'in_stock' ? 'En stock' : 'Sur commande'}
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {sortBy !== 'default' && (
                        <button
                          onClick={() => setSortBy('default')}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-200"
                        >
                          Tri actif
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {priceRange && (
                        <button
                          onClick={() => setPriceRange(null)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-200"
                        >
                          Prix: {priceRange.min.toLocaleString('fr-FR')} - {priceRange.max.toLocaleString('fr-FR')} FCFA
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {deliveryRange && (
                        <button
                          onClick={() => setDeliveryRange(null)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-200"
                        >
                          Délai: {deliveryRange.min} - {deliveryRange.max} jours
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelected([])
                          setOnlyPrice(false)
                          setOnlyQuote(false)
                          setAvailabilityFilter('all')
                          setSortBy('default')
                          setPriceRange(null)
                          setDeliveryRange(null)
                        }}
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 underline"
                      >
                        Tout effacer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <span className="ml-2 text-gray-600">Chargement des produits...</span>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                  <div className="space-y-6">
                    {/* Contrôles tri et vue en haut */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-emerald-600" />
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">
                            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
                          </h2>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Mode vue */}
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            aria-label="Vue grille"
                          >
                            <Grid className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            aria-label="Vue liste"
                          >
                            <List className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Tri */}
                        <div className="relative">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                          >
                            <option value="default">Trier par</option>
                            <option value="price-asc">Prix croissant</option>
                            <option value="price-desc">Prix décroissant</option>
                            <option value="name-asc">Nom A-Z</option>
                            <option value="name-desc">Nom Z-A</option>
                            <option value="rating-desc">Meilleures notes</option>
                          </select>
                          <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Affichage des produits filtrés */}
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-16">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun produit trouvé</h3>
                        <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
                      </div>
                    ) : (
                      <>
                        {/* Products Grid ou List */}
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            {filteredProducts.map((product) => (
                              <ProductCard
                                key={product.id || product._id}
                                name={product.name}
                                model={product.tagline}
                                price={product.priceAmount ? `${product.priceAmount.toLocaleString('fr-FR')} ${product.currency || 'FCFA'}` : 'Sur devis'}
                                priceAmount={product.priceAmount}
                                currency={product.currency || 'FCFA'}
                                requiresQuote={product.requiresQuote}
                                deliveryDays={product.deliveryDays || 0}
                                features={product.features && product.features.length ? product.features.filter(Boolean) : [product.description]}
                                rating={product.rating || 4.7}
                                images={product.gallery && product.gallery.length ? product.gallery : [product.image || '/file.svg']}
                                shippingOptions={product.shippingOptions}
                                availabilityStatus={product.availabilityStatus}
                                detailHref={`/produits/${product.id || product._id}`}
                                isPopular={product.rating >= 4.8}
                                createdAt={product.createdAt}
                                onCompareToggle={handleCompareToggle}
                                isComparing={comparingProducts.has(product.id || product._id || '')}
                                isImported={product.isImported}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredProducts.map((product) => (
                              <Link
                                key={product.id || product._id}
                                href={`/produits/${product.id || product._id}`}
                                className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-emerald-300 transition-all"
                              >
                                <div className="flex flex-col sm:flex-row gap-4">
                                  <div className="relative w-full sm:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                    <Image
                                      src={product.image || product.gallery?.[0] || '/file.svg'}
                                      alt={product.name}
                                      fill
                                      className="object-contain p-2"
                                      sizes="(max-width: 640px) 100vw, 128px"
                                    />
                                    {product.availabilityStatus === 'in_stock' && (
                                      <div className="absolute top-2 left-2 bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                                        EN STOCK
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                                        {product.tagline && <p className="text-sm text-gray-500 line-clamp-1">{product.tagline}</p>}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-2xl font-bold text-emerald-600">
                                          {product.priceAmount ? `${product.priceAmount.toLocaleString('fr-FR')} ${product.currency || 'FCFA'}` : 'Sur devis'}
                                        </div>
                                        {(product.deliveryDays || 0) > 0 && (
                                          <div className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                                            <Clock className="h-3 w-3" />
                                            {product.deliveryDays}j
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {product.features && product.features.length > 0 && (
                                      <ul className="flex flex-wrap gap-2 mb-3">
                                        {product.features.slice(0, 3).map((f, i) => (
                                          <li key={i} className="flex items-center gap-1 text-xs text-gray-600">
                                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                                            <span className="line-clamp-1">{f}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 text-sm">
                                        <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                                        <span className="font-semibold text-gray-700">{(product.rating || 4.7).toFixed(1)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-emerald-600 font-medium">Voir détails</span>
                                        <ArrowRight className="h-4 w-4 text-emerald-600" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
              )}


                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Précédent
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={loading}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                                currentPage === pageNum
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                              } disabled:opacity-50`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Suivant
                      </button>
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
                {categories.map((c)=> (
                  <label key={c.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={(e)=>{
                      setSelected((prev)=> e.target.checked ? [...prev, c.id] : prev.filter(id=>id!==c.id))
                    }} />
                    <span>{c.title}</span>
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
            <button onClick={()=>setShowFilters(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 font-semibold">Appliquer</button>
          </div>
        </div>
      )}

      {/* Section Explicative déplacée vers /domotique (supprimée ici) */}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-purple-600 text-white">
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
              className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Conseil personnalisé
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            <a
              href="tel:+221774133440"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-all duration-300 inline-flex items-center justify-center"
            >
              📞 +221 77 413 34 40
            </a>
          </div>
        </div>
      </section>

      {/* Barre de comparaison */}
      {showCompareBar && comparingProducts.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-emerald-300 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-emerald-600" />
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
              className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
      />

      <Footer />
    </main>
    </ErrorBoundary>
  )
}