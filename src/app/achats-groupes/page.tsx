'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import CountdownBadge from '@/components/group-orders/CountdownBadge'
import StatCounter from '@/components/group-orders/StatCounter'
import LiveActivityFeed from '@/components/group-orders/LiveActivityFeed'
import FeaturedGroupCard from '@/components/group-orders/FeaturedGroupCard'
import CompactGroupCard from '@/components/group-orders/CompactGroupCard'
import {
  Users, Package, Clock, TrendingDown, ArrowRight, Search, Filter,
  Calendar, Target, Zap, ShoppingCart, CheckCircle, AlertCircle,
  Loader2, X, Briefcase, Calculator, Flame, BarChart3, Rocket,
  Sparkles, Heart, Gem, Truck, Star, ChevronDown
} from 'lucide-react'

interface GroupOrder {
  _id?: string
  groupId: string
  status: string
  product: {
    productId: string
    name: string
    image?: string
    basePrice: number
    currency: string
    category?: string
  }
  minQty: number
  targetQty: number
  currentQty: number
  currentUnitPrice: number
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  participants: Array<{ name: string; qty: number; joinedAt?: string }>
  deadline: string
  shippingMethod?: string
  description?: string
  createdAt?: string
  createdBy?: { name?: string }
  // Enriched fields
  progress?: number
  daysLeft?: number
  isAlmostFull?: boolean
  isNew?: boolean
  isPopular?: boolean
  soloPrice?: number
  groupPrice?: number
  savingsPercent?: number
  participantCount?: number
  recentParticipants?: Array<{ name: string; joinedAt?: string }>
}

interface GroupOrdersPublicConfig {
  minJoinQty: number
  maxJoinQtyPerParticipant: number
  defaultDeadlineDays: number
  allowedShippingMethods: string[]
}

interface LiveStats {
  openGroupsCount: number
  totalFilled: number
  totalParticipants: number
  totalSaved: number
}

const formatCurrency = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`
const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric'
})

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Ouvert', color: 'bg-emerald-100 text-emerald-800', icon: Users },
  filled: { label: 'Objectif atteint', color: 'bg-violet-100 text-violet-800', icon: Target },
  ordering: { label: 'En commande', color: 'bg-purple-100 text-purple-800', icon: ShoppingCart },
  ordered: { label: 'Commandé', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  shipped: { label: 'Expédié', color: 'bg-orange-100 text-orange-800', icon: Package },
  delivered: { label: 'Livré', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: AlertCircle }
}

const shippingLabels: Record<string, string> = {
  maritime_60j: 'Maritime ~60 j • à partir de 170 000 F/m³',
  air_15j: 'Fret aérien ~15 j • à partir de 12 000 F/kg',
  express_3j: 'Express ~3 j • à partir de 8 000 F/kg'
}

const buildDefaultDeadline = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function GroupOrdersPage() {
  const router = useRouter()
  const [productIdParam, setProductIdParam] = useState<string | null>(null)

  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [featuredGroups, setFeaturedGroups] = useState<GroupOrder[]>([])
  const [liveStats, setLiveStats] = useState<LiveStats>({ openGroupsCount: 0, totalFilled: 0, totalParticipants: 0, totalSaved: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'recommended' | 'deadline' | 'savings' | 'progress'>('recommended')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'filled'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stats, setStats] = useState({ totalOpen: 0, totalFilled: 0, totalParticipants: 0 })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [productPreview, setProductPreview] = useState<{ id: string; name: string; image?: string | null; price?: number } | null>(null)
  const [groupConfig, setGroupConfig] = useState<GroupOrdersPublicConfig>({
    minJoinQty: 1,
    maxJoinQtyPerParticipant: 50,
    defaultDeadlineDays: 14,
    allowedShippingMethods: Object.keys(shippingLabels)
  })
  const [createForm, setCreateForm] = useState({
    qty: 1,
    deadline: buildDefaultDeadline(14),
    shippingMethod: 'maritime_60j',
    description: '',
    name: '',
    phone: '',
    email: ''
  })

  // Calculator state
  const [calcSoloPrice, setCalcSoloPrice] = useState(50000)
  const [calcQty, setCalcQty] = useState(10)
  const [calcDiscount, setCalcDiscount] = useState(30)
  const [calcTransport, setCalcTransport] = useState<'maritime' | 'air' | 'express'>('maritime')
  const [calcRates, setCalcRates] = useState<Array<{
    id: string
    label: string
    description: string
    durationDays: number
    billing: string
    rate: number
    minimumCharge?: number
    costPerUnit: number
    unit: string
  }>>([])

  // Fetch calculator defaults + shipping rates
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const res = await fetch('/api/shipping/rates-public')
        const data = await res.json()
        if (data.success) {
          setCalcRates(data.rates || [])
          if (data.defaults) {
            setCalcSoloPrice(data.defaults.soloPrice)
            setCalcDiscount(data.defaults.discount)
            setCalcQty(data.defaults.qty)
          }
          // Auto-select first rate if current not available
          const first = (data.rates || [])[0]
          if (first) {
            const map: Record<string, 'maritime' | 'air' | 'express'> = {
              sea_freight: 'maritime',
              air_15: 'air',
              air_express: 'express',
            }
            setCalcTransport((prev) => {
              const hasCurrent = (data.rates || []).some((r: any) => map[r.id] === prev)
              return hasCurrent ? prev : (map[first.id] || 'maritime')
            })
          }
        }
      } catch {
        // silent fallback — calculator keeps hardcoded defaults
      }
    }
    loadDefaults()
  }, [])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const pid = params.get('productId')
      const create = params.get('create') === '1' ? '1' : '0'
      const qty = params.get('qty')

      setProductIdParam(pid)

      if (qty) {
        const parsed = Math.max(1, parseInt(qty) || 1)
        setCreateForm((p) => ({ ...p, qty: parsed }))
      }
      if (create === '1') {
        setShowCreateModal(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchGroups = useCallback(async () => {
    try {
      const url = productIdParam
        ? `/api/group-orders?productId=${encodeURIComponent(productIdParam)}`
        : '/api/group-orders'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setGroups(data.groups)
        setStats(data.stats)
        if (data.config) {
          const minJoinQty = Number(data.config.minJoinQty)
          const maxJoinQtyPerParticipant = Number(data.config.maxJoinQtyPerParticipant)
          const defaultDeadlineDays = Number(data.config.defaultDeadlineDays)
          const allowedShippingMethods = Array.isArray(data.config.allowedShippingMethods)
            ? data.config.allowedShippingMethods.filter((m: string) => typeof m === 'string' && shippingLabels[m])
            : []

          setGroupConfig({
            minJoinQty: Number.isFinite(minJoinQty) && minJoinQty > 0 ? minJoinQty : 1,
            maxJoinQtyPerParticipant:
              Number.isFinite(maxJoinQtyPerParticipant) && maxJoinQtyPerParticipant > 0
                ? maxJoinQtyPerParticipant
                : 50,
            defaultDeadlineDays:
              Number.isFinite(defaultDeadlineDays) && defaultDeadlineDays > 0 ? defaultDeadlineDays : 14,
            allowedShippingMethods:
              allowedShippingMethods.length > 0 ? allowedShippingMethods : Object.keys(shippingLabels)
          })
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }, [productIdParam])

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/group-orders/featured')
      const data = await res.json()
      if (data.success) setFeaturedGroups(data.featured || [])
    } catch {
      // silent
    }
  }, [])

  const fetchLiveStats = useCallback(async () => {
    try {
      const res = await fetch('/api/group-orders/stats')
      const data = await res.json()
      if (data.success) setLiveStats(data.stats)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchGroups()
    fetchFeatured()
    fetchLiveStats()
  }, [fetchGroups, fetchFeatured, fetchLiveStats])

  useEffect(() => {
    setSortBy(productIdParam ? 'recommended' : 'deadline')
  }, [productIdParam])

  useEffect(() => {
    setCreateForm((prev) => {
      const availableShipping =
        groupConfig.allowedShippingMethods.length > 0 ? groupConfig.allowedShippingMethods : Object.keys(shippingLabels)
      const shippingMethod = availableShipping.includes(prev.shippingMethod)
        ? prev.shippingMethod
        : availableShipping[0] || 'maritime_60j'

      const qty = Math.min(
        Math.max(groupConfig.minJoinQty, prev.qty),
        Math.max(groupConfig.minJoinQty, groupConfig.maxJoinQtyPerParticipant)
      )

      return { ...prev, qty, shippingMethod, deadline: buildDefaultDeadline(groupConfig.defaultDeadlineDays) }
    })
  }, [groupConfig])

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setCategoryFilter('all')
    setSortBy(productIdParam ? 'recommended' : 'deadline')
  }

  useEffect(() => {
    const loadProductPreview = async () => {
      if (!productIdParam) {
        setProductPreview(null)
        return
      }
      try {
        const res = await fetch(`/api/catalog/products/${productIdParam}`)
        const data = await res.json()
        if (data?.success && data?.product) {
          setProductPreview({ id: data.product.id, name: data.product.name, image: data.product.image, price: data.product.price })
        } else {
          setProductPreview({ id: productIdParam, name: 'Produit', image: null })
        }
      } catch {
        setProductPreview({ id: productIdParam, name: 'Produit', image: null })
      }
    }
    loadProductPreview()
  }, [productIdParam])

  // When a product is selected, pre-fill calculator with its price
  useEffect(() => {
    if (productPreview?.price && productPreview.price > 0) {
      const rounded = Math.max(5000, Math.min(200000, Math.round(productPreview.price / 5000) * 5000))
      setCalcSoloPrice(rounded)
    }
  }, [productPreview?.price])

  const filteredGroups = groups.filter(g => {
    const matchesSearch =
      g.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.groupId.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (statusFilter === 'open') return g.status === 'open'
    if (statusFilter === 'filled') return g.status === 'filled'
    if (categoryFilter !== 'all') return g.product?.category === categoryFilter
    return true
  })

  const getProgressPercent = (g: GroupOrder) => Math.min(100, Math.round((g.currentQty / g.targetQty) * 100))
  const getDaysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const sortedGroups = useMemo(() => {
    const statusWeight: Record<string, number> = { open: 0, filled: 1, ordering: 2, ordered: 3, shipped: 4, delivered: 5, cancelled: 99 }
    const computeSavingsPercent = (g: GroupOrder) => {
      const savings = g.product.basePrice - g.currentUnitPrice
      if (g.product.basePrice <= 0) return 0
      return Math.max(0, Math.round((savings / g.product.basePrice) * 100))
    }

    const list = [...filteredGroups]
    list.sort((a, b) => {
      const wa = statusWeight[a.status] ?? 50
      const wb = statusWeight[b.status] ?? 50
      if (wa !== wb) return wa - wb

      const da = getDaysLeft(a.deadline)
      const db = getDaysLeft(b.deadline)
      const pa = getProgressPercent(a)
      const pb = getProgressPercent(b)
      const sa = computeSavingsPercent(a)
      const sb = computeSavingsPercent(b)

      if (sortBy === 'deadline') {
        if (da !== db) return da - db
        if (pa !== pb) return pb - pa
        if (sa !== sb) return sb - sa
        return a.groupId.localeCompare(b.groupId)
      }
      if (sortBy === 'savings') {
        if (sa !== sb) return sb - sa
        if (pa !== pb) return pb - pa
        if (da !== db) return da - db
        return a.groupId.localeCompare(b.groupId)
      }
      if (sortBy === 'progress') {
        if (pa !== pb) return pb - pa
        if (da !== db) return da - db
        if (sa !== sb) return sb - sa
        return a.groupId.localeCompare(b.groupId)
      }
      if (pa !== pb) return pb - pa
      if (da !== db) return da - db
      if (sa !== sb) return sb - sa
      return a.groupId.localeCompare(b.groupId)
    })
    return list
  }, [filteredGroups, sortBy])

  // Calculator computed values
  const calcGroupPrice = Math.round(calcSoloPrice * (1 - calcDiscount / 100))
  const calcSavingsPerUnit = calcSoloPrice - calcGroupPrice
  const transportMap: Record<string, 'maritime' | 'air' | 'express'> = {
    sea_freight: 'maritime',
    air_15: 'air',
    air_express: 'express',
  }
  const selectedRate = calcRates.find((r) => transportMap[r.id] === calcTransport)
  const calcTransportCost = selectedRate
    ? Math.round(calcQty * selectedRate.costPerUnit)
    : calcTransport === 'maritime'
      ? Math.round(calcQty * 1500)
      : calcTransport === 'express'
        ? Math.round(calcQty * 5000)
        : Math.round(calcQty * 3500)
  const calcTotalSavings = (calcSavingsPerUnit * calcQty) - calcTransportCost
  const calcMargin = Math.round(calcTotalSavings * 0.6)

  const recommendedGroup = useMemo(() => {
    if (!productIdParam) return null
    if (sortBy !== 'recommended') return null
    if (!sortedGroups || sortedGroups.length === 0) return null
    const top = sortedGroups[0]
    if (top.status !== 'open') return null
    return top
  }, [productIdParam, sortBy, sortedGroups])

  // Seed featured groups if empty for visual demo
  const displayFeatured = featuredGroups.length > 0 ? featuredGroups : [
    {
      groupId: 'GRP-DEMO-1',
      status: 'open',
      product: { productId: 'demo-1', name: 'Caméra IP WiFi 4MP Vision Nocturne - Lot de 10', image: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=400&q=80', basePrice: 45000, currency: 'FCFA', category: 'Électronique' },
      minQty: 10, targetQty: 50, currentQty: 42, currentUnitPrice: 28000,
      priceTiers: [{ minQty: 10, price: 35000, discount: 22 }, { minQty: 25, price: 30000, discount: 33 }, { minQty: 50, price: 28000, discount: 38 }],
      participants: [{ name: 'Ahmed D.', qty: 5 }, { name: 'Fatou S.', qty: 3 }, { name: 'Moussa K.', qty: 8 }, { name: 'Aminata B.', qty: 2 }],
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      shippingMethod: 'air_15j',
      progress: 84, daysLeft: 2, isAlmostFull: true, isPopular: true, isNew: false,
      soloPrice: 45000, groupPrice: 28000, savingsPercent: 38, participantCount: 4,
      recentParticipants: [{ name: 'Ahmed D.' }, { name: 'Fatou S.' }, { name: 'Moussa K.' }, { name: 'Aminata B.' }]
    },
    {
      groupId: 'GRP-DEMO-2',
      status: 'open',
      product: { productId: 'demo-2', name: 'Sneakers Running Légères - Lot de 20 paires', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', basePrice: 35000, currency: 'FCFA', category: 'Mode' },
      minQty: 20, targetQty: 100, currentQty: 67, currentUnitPrice: 18000,
      priceTiers: [{ minQty: 20, price: 25000, discount: 29 }, { minQty: 50, price: 22000, discount: 37 }, { minQty: 100, price: 18000, discount: 49 }],
      participants: [{ name: 'Omar N.', qty: 10 }, { name: 'Sophie L.', qty: 5 }, { name: 'Khalil M.', qty: 8 }],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      shippingMethod: 'maritime_60j',
      progress: 67, daysLeft: 7, isAlmostFull: false, isPopular: true, isNew: true,
      soloPrice: 35000, groupPrice: 18000, savingsPercent: 49, participantCount: 3,
      recentParticipants: [{ name: 'Omar N.' }, { name: 'Sophie L.' }, { name: 'Khalil M.' }]
    },
    {
      groupId: 'GRP-DEMO-3',
      status: 'open',
      product: { productId: 'demo-3', name: 'Set Maquillage Professionnel 48 couleurs - Lot de 15', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80', basePrice: 28000, currency: 'FCFA', category: 'Beauté' },
      minQty: 15, targetQty: 40, currentQty: 38, currentUnitPrice: 15000,
      priceTiers: [{ minQty: 15, price: 20000, discount: 29 }, { minQty: 30, price: 17000, discount: 39 }, { minQty: 40, price: 15000, discount: 46 }],
      participants: [{ name: 'Aïcha D.', qty: 5 }, { name: 'Mariam S.', qty: 3 }, { name: 'Léa B.', qty: 4 }],
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      shippingMethod: 'air_15j',
      progress: 95, daysLeft: 1, isAlmostFull: true, isPopular: false, isNew: false,
      soloPrice: 28000, groupPrice: 15000, savingsPercent: 46, participantCount: 3,
      recentParticipants: [{ name: 'Aïcha D.' }, { name: 'Mariam S.' }, { name: 'Léa B.' }]
    }
  ]

  // Demo groups for grid if real data is empty
  const demoGridGroups: GroupOrder[] = [
    {
      groupId: 'GRP-DEMO-4', status: 'open',
      product: { productId: 'demo-4', name: 'Smartwatch Pro Sport GPS - Lot de 12', image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&q=80', basePrice: 55000, currency: 'FCFA', category: 'Électronique' },
      minQty: 12, targetQty: 30, currentQty: 18, currentUnitPrice: 32000,
      priceTiers: [], participants: [], deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 60, daysLeft: 5, savingsPercent: 42, participantCount: 2
    },
    {
      groupId: 'GRP-DEMO-5', status: 'open',
      product: { productId: 'demo-5', name: 'Lampes LED Solaires Jardin - Lot de 25', image: 'https://images.unsplash.com/photo-1513506003013-d531632103c3?w=400&q=80', basePrice: 18000, currency: 'FCFA', category: 'Maison' },
      minQty: 25, targetQty: 80, currentQty: 34, currentUnitPrice: 8500,
      priceTiers: [], participants: [], deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 43, daysLeft: 10, savingsPercent: 53, participantCount: 2
    },
    {
      groupId: 'GRP-DEMO-6', status: 'filled',
      product: { productId: 'demo-6', name: 'Box Cadeau Luxe Premium - Lot de 20', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80', basePrice: 32000, currency: 'FCFA', category: 'Cadeaux' },
      minQty: 20, targetQty: 50, currentQty: 50, currentUnitPrice: 16500,
      priceTiers: [], participants: [], deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 100, daysLeft: 3, savingsPercent: 48, participantCount: 5
    },
    {
      groupId: 'GRP-DEMO-7', status: 'open',
      product: { productId: 'demo-7', name: 'Enceinte Bluetooth Waterproof - Lot de 15', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', basePrice: 22000, currency: 'FCFA', category: 'Électronique' },
      minQty: 15, targetQty: 60, currentQty: 28, currentUnitPrice: 12000,
      priceTiers: [], participants: [], deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 47, daysLeft: 8, savingsPercent: 45, participantCount: 2
    },
    {
      groupId: 'GRP-DEMO-8', status: 'open',
      product: { productId: 'demo-8', name: 'Sacs à main Cuir PU tendance - Lot de 20', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80', basePrice: 28000, currency: 'FCFA', category: 'Mode' },
      minQty: 20, targetQty: 50, currentQty: 22, currentUnitPrice: 14500,
      priceTiers: [], participants: [], deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 44, daysLeft: 12, savingsPercent: 48, participantCount: 2
    },
    {
      groupId: 'GRP-DEMO-9', status: 'open',
      product: { productId: 'demo-9', name: 'Diffuseur Huiles Essentielles - Lot de 18', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&q=80', basePrice: 20000, currency: 'FCFA', category: 'Maison' },
      minQty: 18, targetQty: 45, currentQty: 15, currentUnitPrice: 11000,
      priceTiers: [], participants: [], deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 33, daysLeft: 14, savingsPercent: 45, participantCount: 1
    }
  ]

  const gridGroups = sortedGroups.length > 0 ? sortedGroups : demoGridGroups
  const categories = [...new Set([...groups, ...demoGridGroups].map(g => g.product?.category).filter(Boolean))]

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketHeader />

      {/* ===== HERO ===== */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text + stats */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-bold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Import groupé depuis la Chine
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Achats groupés
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-violet-400">
                  pour entrepreneurs
                </span>
              </h1>

              <p className="text-lg text-slate-300 mb-8 max-w-lg leading-relaxed">
                Rejoignez des groupes d&apos;achat, réduisez vos coûts d&apos;import et lancez votre business sans gros capital.
              </p>

              {/* Live stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {[
                  { label: 'Groupes ouverts', value: liveStats.openGroupsCount || stats.totalOpen, suffix: '' },
                  { label: 'Objectifs atteints', value: liveStats.totalFilled || stats.totalFilled, suffix: '' },
                  { label: 'Acheteurs actifs', value: liveStats.totalParticipants || stats.totalParticipants, suffix: '' },
                  { label: 'FCFA économisés', value: (liveStats.totalSaved || 0) / 1000, suffix: 'k', prefix: '' }
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center"
                  >
                    <div className="text-xl md:text-2xl font-extrabold text-white">
                      <StatCounter value={s.value} suffix={s.suffix} />
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">{s.label}</div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => document.getElementById('featured-groups')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition"
                >
                  Voir les groupes actifs
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition"
                >
                  Créer un groupe
                </button>
              </div>
            </motion.div>

            {/* Right: live activity feed */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white">Activité en direct</h3>
                </div>
                <LiveActivityFeed />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0 80V40c120 20 240 40 360 20s240-60 360-40 240 60 360 40 240-40 360-20v40H0z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* ===== BENEFITS STRIP ===== */}
      <section className="py-8 px-4 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: TrendingDown, title: 'Prix dégressifs', desc: `Jusqu'à 50% d'économie en groupant vos achats avec d'autres entrepreneurs.` },
              { icon: Truck, title: 'Transport mutualisé', desc: 'Fret maritime, aérien ou express : les frais sont partagés entre tous les participants.' },
              { icon: Package, title: 'Sourcing simplifié', desc: 'Nous gérons les usines, la négociation, l\'inspection et la logistique pour vous.' }
            ].map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-violet-400 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{b.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED GROUPS ===== */}
      <section id="featured-groups" className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Groupes en vedette</h2>
              <p className="text-sm text-slate-500 mt-1">Les offres les plus populaires et urgentes du moment</p>
            </div>
            <Link
              href="#all-groups"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700 transition"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {displayFeatured.slice(0, 3).map((group, i) => (
              <FeaturedGroupCard key={group.groupId} group={group} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== SAVINGS CALCULATOR ===== */}
      <section className="py-12 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-6 md:p-8 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-violet-400 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Simulateur de rentabilité</h2>
                <p className="text-xs text-slate-500">Estimez vos économies et marges en temps réel</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Controls */}
              <div className="space-y-5">
                {/* Solo price */}
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                    <span>Prix unitaire solo</span>
                    <span className="text-violet-700 font-bold">{calcSoloPrice.toLocaleString('fr-FR')} F</span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={200000}
                    step={5000}
                    value={calcSoloPrice}
                    onChange={(e) => setCalcSoloPrice(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>5 000 F</span>
                    <span>200 000 F</span>
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                    <span>Réduction groupée</span>
                    <span className="text-emerald-700 font-bold">{calcDiscount}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={calcDiscount}
                    onChange={(e) => setCalcDiscount(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>5%</span>
                    <span>60%</span>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                    <span>Quantité commandée</span>
                    <span className="text-violet-700 font-bold">{calcQty} unités</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    step={5}
                    value={calcQty}
                    onChange={(e) => setCalcQty(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>5</span>
                    <span>200</span>
                  </div>
                </div>

                {/* Transport */}
                <div>
                  <span className="text-sm font-medium text-slate-700 block mb-2">Mode de transport</span>
                  <div className="flex gap-2">
                    {(calcRates.length > 0
                      ? calcRates.map((r) => {
                          const key = transportMap[r.id] || 'maritime'
                          const label = key === 'maritime' ? 'Maritime' : key === 'air' ? 'Aérien' : 'Express'
                          return { key, label, cost: `~${r.costPerUnit.toLocaleString('fr-FR')} F/u` }
                        })
                      : [
                          { key: 'maritime' as const, label: 'Maritime', cost: '~1 500 F/u' },
                          { key: 'air' as const, label: 'Aérien', cost: '~3 500 F/u' },
                          { key: 'express' as const, label: 'Express', cost: '~5 000 F/u' },
                        ]
                    ).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setCalcTransport(t.key as any)}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                          calcTransport === t.key
                            ? 'bg-violet-50 border-violet-300 text-violet-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div>{t.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{t.cost}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100">
                  <span className="text-sm text-slate-600">Prix solo total</span>
                  <span className="font-bold text-slate-400 line-through">{(calcSoloPrice * calcQty).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100">
                  <span className="text-sm text-slate-600">Prix groupé total</span>
                  <span className="font-bold text-emerald-600">{(calcGroupPrice * calcQty).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100">
                  <span className="text-sm text-slate-600">Fret {calcTransport === 'maritime' ? 'maritime' : calcTransport === 'air' ? 'aérien' : 'express'}</span>
                  <span className="font-bold text-slate-700">{calcTransportCost.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-900">Économie totale</span>
                    <span className="text-xl font-extrabold text-emerald-600">{calcTotalSavings.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Marge estimée (revente)</span>
                    <span className="text-sm font-bold text-violet-600">+{calcMargin.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  Estimation illustrative. Les frais réels varient selon le poids, volume et cours du fret.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-12 px-4 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900">Comment ça marche ?</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">Rejoignez un groupe en 4 étapes simples. Nous gérons l&apos;import pour vous.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Search, title: '1. Choisissez', desc: 'Trouvez un produit et un groupe qui correspond à votre besoin.' },
              { icon: Users, title: '2. Réservez', desc: 'Indiquez votre quantité. Plus il y a de monde, plus le prix baisse.' },
              { icon: TrendingDown, title: '3. On achète', desc: 'Nous regroupons les commandes et négocions le meilleur tarif en Chine.' },
              { icon: Package, title: '4. Vous recevez', desc: 'Transport et livraison au Sénégal. Vous récupérez votre marchandise.' }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-violet-400 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ALL GROUPS ===== */}
      <section id="all-groups" className="py-12 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          {/* Header + filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Tous les groupes actifs</h2>
              <p className="text-sm text-slate-500 mt-1">
                {loading ? 'Chargement…' : `${gridGroups.length} groupe${gridGroups.length > 1 ? 's' : ''} trouvé${gridGroups.length > 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-56"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="open">Ouverts</option>
                <option value="filled">Objectif atteint</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="recommended">Recommandé</option>
                <option value="progress">Proche objectif</option>
                <option value="deadline">Deadline proche</option>
                <option value="savings">Meilleure économie</option>
              </select>

              {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Toutes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat as string)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    categoryFilter === cat
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              <span className="ml-3 text-slate-600">Chargement...</span>
            </div>
          ) : gridGroups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white rounded-2xl border border-slate-200"
            >
              <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">Aucun achat groupé disponible</h3>
              <p className="text-slate-500 mb-6">Revenez bientôt ou créez le premier !</p>
              <Link
                href="/produits"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition"
              >
                <ShoppingCart className="w-5 h-5" />
                Voir les produits
              </Link>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gridGroups.map((group, idx) => (
                <CompactGroupCard key={group.groupId} group={group} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal création achat groupé */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowCreateModal(false)
              setCreateError(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-violet-600 text-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Créer un achat groupé</h2>
                    <p className="text-white/85 text-sm">Lancez un groupe et invitez d&apos;autres personnes à vous rejoindre.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreateError(null)
                    }}
                    className="p-2 hover:bg-white/15 rounded-xl transition"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form
                className="p-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setCreateError(null)
                  if (!productIdParam) {
                    setCreateError('Veuillez ouvrir la création depuis une fiche produit (productId manquant).')
                    return
                  }
                  if (
                    !createForm.name ||
                    !createForm.phone ||
                    createForm.qty < groupConfig.minJoinQty ||
                    createForm.qty > groupConfig.maxJoinQtyPerParticipant
                  ) {
                    setCreateError(
                      `Nom, téléphone et quantité sont requis (quantité entre ${groupConfig.minJoinQty} et ${groupConfig.maxJoinQtyPerParticipant}).`
                    )
                    return
                  }
                  setCreating(true)
                  try {
                    const res = await fetch('/api/group-orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        productId: productIdParam,
                        qty: createForm.qty,
                        deadline: createForm.deadline,
                        shippingMethod: createForm.shippingMethod,
                        description: createForm.description,
                        creator: {
                          name: createForm.name,
                          phone: createForm.phone,
                          email: createForm.email || undefined
                        }
                      })
                    })

                    if (res.status === 401) {
                      const returnUrl = `${window.location.pathname}${window.location.search}`
                      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`)
                      return
                    }
                    const data = await res.json()
                    if (data?.success && data?.group?.groupId) {
                      setShowCreateModal(false)
                      router.push(`/achats-groupes/${data.group.groupId}`)
                      return
                    }
                    setCreateError(data?.error || "Impossible de créer l'achat groupé")
                  } catch {
                    setCreateError("Erreur réseau lors de la création")
                  } finally {
                    setCreating(false)
                  }
                }}
              >
                {/* Produit */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border">
                  {productPreview?.image ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border">
                      <Image src={productPreview.image} alt={productPreview.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white border flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 line-clamp-1">{productPreview?.name || 'Produit'}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">ID: {productIdParam || '—'}</div>
                  </div>
                </div>

                {createError && (
                  <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div>{createError}</div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité initiale</label>
                    <input
                      type="number"
                      min={groupConfig.minJoinQty}
                      max={groupConfig.maxJoinQtyPerParticipant}
                      value={createForm.qty}
                      onChange={(e) =>
                        setCreateForm((p) => {
                          const parsed = parseInt(e.target.value || String(groupConfig.minJoinQty), 10)
                          const safe = Number.isFinite(parsed) ? parsed : groupConfig.minJoinQty
                          const bounded = Math.min(
                            groupConfig.maxJoinQtyPerParticipant,
                            Math.max(groupConfig.minJoinQty, safe)
                          )
                          return { ...p, qty: bounded }
                        })
                      }
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Min {groupConfig.minJoinQty} • Max {groupConfig.maxJoinQtyPerParticipant}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date limite</label>
                    <input
                      type="date"
                      value={createForm.deadline}
                      onChange={(e) => setCreateForm((p) => ({ ...p, deadline: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de transport</label>
                  <select
                    value={createForm.shippingMethod}
                    onChange={(e) => setCreateForm((p) => ({ ...p, shippingMethod: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    {(groupConfig.allowedShippingMethods.length > 0
                      ? groupConfig.allowedShippingMethods
                      : Object.keys(shippingLabels)
                    ).map((k) => (
                      <option key={k} value={k}>{shippingLabels[k] || k}</option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Votre nom</label>
                    <input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Nom et prénom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                    <input
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="+221 77 000 00 00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (optionnel)</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="vous@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description (optionnel)</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    rows={3}
                    placeholder="Ex: Couleur souhaitée, détails de livraison..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 text-white font-bold hover:from-emerald-600 hover:to-violet-600 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Créer le groupe
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <MarketFooter />
    </div>
  )
}
