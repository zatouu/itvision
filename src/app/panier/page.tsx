'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Trash2, Heart, Users, ShoppingBag, Package, Zap,
  ChevronLeft, ChevronRight, Sparkles, AlertCircle, TrendingDown,
  Clock, Eye, Star, Lock, Award, RefreshCw, Headphones, MessageCircle,
  ChevronDown, ChevronUp, Info, MapPin, Home
} from 'lucide-react'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'
import { useToast } from '@/components/ui/Toaster'
import CheckoutStepper from '@/components/cart/CheckoutStepper'
import CartItemCard from '@/components/cart/CartItemCard'
import MaritimeEligibilityPanel from '@/components/cart/MaritimeEligibilityPanel'
import PromoCodeInput from '@/components/cart/PromoCodeInput'
import GrainsToggle from '@/components/cart/GrainsToggle'
import TransportSelector, { type ShippingMethod, type TransportOption } from '@/components/cart/TransportSelector'
import PriceBreakdown from '@/components/cart/PriceBreakdown'
import TrustBadge from '@/components/cart/TrustBadge'
import CompactProductCard from '@/components/cart/CompactProductCard'
import GroupBuyOpportunityCard from '@/components/cart/GroupBuyOpportunityCard'
import { applyTierDiscount } from '@/lib/pricing/tiered-pricing'
import { getServiceFeeTier, SERVICE_FEE_TIERS, type ServiceFeeTier } from '@/lib/pricing/tiered-service-fees'
import { calculateBilledWeight } from '@/lib/pricing/volumetric-weight'
import { resolveProductPrice, type MarketplaceTier } from '@/lib/pricing/resolve-product-price'
import { ServiceFeeTierProgress } from '@/components/ServiceFeeTierProgress'
import { BASE_SHIPPING_RATES, type ShippingMethodId, type ShippingRate } from '@/lib/logistics'
import {
  DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS,
  evaluateSeaFreightEligibility,
  sanitizeSeaFreightEligibilitySettings,
  type SeaFreightEligibilitySettings,
} from '@/lib/shipping/sea-freight-eligibility'

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-'

const MARKETPLACE_TIER_LABEL: Record<MarketplaceTier, string> = {
  standard: 'Standard',
  pro: 'Pro',
  reseller: 'Revendeur',
  partner: 'Partenaire',
}

export default function PanierPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUser, setAuthUser] = useState<{ name?: string; email?: string; phone?: string } | null>(null)
  const [marketplaceTier, setMarketplaceTier] = useState<MarketplaceTier>('standard')
  const [items, setItems] = useState<any[]>([])
  const [recentViewed, setRecentViewed] = useState<any[]>([])
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('air')
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null)
  const [useGrains, setUseGrains] = useState(false)
  const [grainsBalance, setGrainsBalance] = useState(0)
  const [sending, setSending] = useState(false)
  const [showMobileSummary, setShowMobileSummary] = useState(false)
  const [shippingRates, setShippingRates] = useState<Record<ShippingMethodId, ShippingRate>>(BASE_SHIPPING_RATES)
  const [seaFreightEligibility, setSeaFreightEligibility] = useState<SeaFreightEligibilitySettings>(
    DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS
  )
  const [serviceFeeTiers, setServiceFeeTiers] = useState<ServiceFeeTier[]>(SERVICE_FEE_TIERS)
  const [activeGroups, setActiveGroups] = useState<any[]>([])
  const [showMaritimePanel, setShowMaritimePanel] = useState(false)
  const [suggestionScroll, setSuggestionScroll] = useState(0)

  // Auth + profile
  useEffect(() => {
    fetch('/api/client/profile', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.profile) {
          setIsAuthenticated(true)
          setAuthUser({
            name: data.profile.name,
            email: data.profile.email,
            phone: data.profile.phone,
          })
          const tier = data.profile.marketplaceTier
          if (['standard', 'pro', 'reseller', 'partner'].includes(tier)) {
            setMarketplaceTier(tier)
          }
          setGrainsBalance(data.profile.grainsBalance || 0)
        }
      })
      .catch(() => {})
  }, [])

  // Scroll mobile summary
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => setShowMobileSummary(window.scrollY > 250)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Shipping rates & pricing settings
  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(d => {
        if (d?.success && d?.rates) setShippingRates(d.rates)
        if (d?.success && d?.seaFreightEligibility) {
          setSeaFreightEligibility(
            sanitizeSeaFreightEligibilitySettings(d.seaFreightEligibility, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS)
          )
        }
      })
      .catch(() => {})

    fetch('/api/pricing/settings')
      .then(r => r.json())
      .then(d => {
        if (d?.success && Array.isArray(d?.defaults?.serviceFeeTiers) && d.defaults.serviceFeeTiers.length > 0) {
          setServiceFeeTiers(d.defaults.serviceFeeTiers)
        }
      })
      .catch(() => {})
  }, [])

  // Cart sync
  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncCartItems = () => {
      try {
        const raw = localStorage.getItem('cart:items')
        const parsed = raw ? JSON.parse(raw) : []
        setItems(parsed)
        setSelectedIds(new Set(parsed.map((i: any) => i.id)))
      } catch {
        setItems([])
      }
    }
    syncCartItems()
    window.addEventListener('storage', syncCartItems)
    window.addEventListener('cart:updated', syncCartItems as EventListener)
    return () => {
      window.removeEventListener('storage', syncCartItems)
      window.removeEventListener('cart:updated', syncCartItems as EventListener)
    }
  }, [])

  // Recent viewed
  useEffect(() => {
    if (typeof window === 'undefined') return
    const load = () => {
      try {
        const raw = localStorage.getItem('recent:viewed')
        setRecentViewed(raw ? JSON.parse(raw) : [])
      } catch {
        setRecentViewed([])
      }
    }
    load()
    window.addEventListener('storage', load)
    window.addEventListener('recent:updated', load as EventListener)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('recent:updated', load as EventListener)
    }
  }, [])

  // Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (items.length === 0) {
        setSuggestedProducts([])
        return
      }
      try {
        const cartIds = items.map(i => i.id?.split('-')[0] || i.id)
        const categories = [...new Set(items.map(i => i.category).filter(Boolean))]
        let products: any[] = []

        for (const category of categories.slice(0, 3)) {
          try {
            const res = await fetch(`/api/catalog/products?category=${encodeURIComponent(category)}&limit=6`)
            const data = await res.json()
            if (data.success && data.items) {
              products = [...products, ...data.items.filter((p: any) => !cartIds.includes(p._id))]
            }
          } catch {}
        }

        if (products.length < 10) {
          const res = await fetch('/api/catalog/products?limit=12&sort=popular')
          const data = await res.json()
          if (data.success && data.items) {
            products = [...products, ...data.items.filter((p: any) => !cartIds.includes(p._id))]
          }
        }

        const seen = new Set<string>()
        setSuggestedProducts(products.filter((p: any) => {
          if (seen.has(p._id)) return false
          seen.add(p._id)
          return true
        }).slice(0, 10))
      } catch (e) {
        console.error('Erreur chargement suggestions:', e)
      }
    }
    fetchSuggestions()
  }, [items])

  // Active group orders for cart products
  useEffect(() => {
    if (items.length === 0) {
      setActiveGroups([])
      return
    }
    const fetchGroups = async () => {
      try {
        const productIds = items.map(i => i.id?.split('-')[0] || i.id).filter(Boolean)
        const unique = [...new Set(productIds)]
        const results: any[] = []
        for (const pid of unique.slice(0, 5)) {
          try {
            const res = await fetch(`/api/group-orders?productId=${encodeURIComponent(pid)}&limit=1`)
            const data = await res.json()
            if (data?.success && data.groups?.length > 0) {
              const g = data.groups[0]
              if (g.status === 'open') {
                results.push({
                  ...g,
                  cartProductId: pid,
                  cartProductName: items.find(i => (i.id?.split('-')[0] || i.id) === pid)?.name,
                })
              }
            }
          } catch {}
        }
        setActiveGroups(results)
      } catch {}
    }
    fetchGroups()
  }, [items])

  // Weight & volume summary
  const weightSummary = useMemo(() => {
    let totalWeight = 0
    let totalVolume = 0
    let totalVolumetricWeight = 0
    let hasVolumetric = false
    for (const it of items) {
      const qty = it.qty || 1
      const w = typeof it.unitWeightKg === 'number' ? it.unitWeightKg : (typeof it.weightKg === 'number' ? it.weightKg : 0)
      const v = typeof it.unitVolumeM3 === 'number' ? it.unitVolumeM3 : (typeof it.volumeM3 === 'number' ? it.volumeM3 : 0)
      totalWeight += w * qty
      totalVolume += v * qty
      if (it.lengthCm && it.widthCm && it.heightCm && w > 0) {
        const info = calculateBilledWeight({
          actualWeightKg: w,
          lengthCm: it.lengthCm,
          widthCm: it.widthCm,
          heightCm: it.heightCm,
        })
        totalVolumetricWeight += info.volumetricWeight * qty
        if (info.billingMethod === 'volumetric') hasVolumetric = true
      }
    }
    return {
      totalWeight,
      totalVolume,
      totalVolumetricWeight,
      billedWeight: Math.max(totalWeight, totalVolumetricWeight),
      hasVolumetric,
    }
  }, [items])

  // Transport cost
  const transportGlobal = useMemo(() => {
    const map: Record<ShippingMethod, ShippingMethodId> = {
      express: 'air_express',
      air: 'air_15',
      sea: 'sea_freight',
    }
    const methodId = map[shippingMethod] || 'air_15'
    const rate = shippingRates[methodId]
    if (!rate) return 0

    let billed = 0
    if (rate.billing === 'per_cubic_meter') {
      billed = Math.max(weightSummary.totalVolume, 0) * rate.rate
    } else {
      billed = Math.max(weightSummary.billedWeight || 0.1, 0.1) * rate.rate
    }
    return Math.round(typeof rate.minimumCharge === 'number' ? Math.max(billed, rate.minimumCharge) : billed)
  }, [items, shippingMethod, shippingRates, weightSummary])

  // Breakdown
  const breakdown = useMemo(() => {
    let products = 0
    let retailProducts = 0
    let totalQuantity = 0
    for (const it of items) totalQuantity += it.qty || 1
    for (const it of items) {
      const qty = it.qty || 1
      const retailPrice = typeof it.price === 'number' ? it.price : 0
      const resolved = resolveProductPrice({
        price: retailPrice,
        b2bPrice: it.b2bPrice,
        qty,
        totalCartQty: totalQuantity,
        marketplaceTier,
      })
      products += resolved.appliedPrice * qty
      retailProducts += retailPrice * qty
    }
    const pricingTier = applyTierDiscount(products, totalQuantity)
    const wholesaleDiscount = retailProducts > products ? retailProducts - products : 0

    const serviceFeeRate = getServiceFeeTier(pricingTier.finalPrice, serviceFeeTiers).feeRate / 100
    const serviceFees = Math.round(pricingTier.finalPrice * serviceFeeRate)
    const insurance = Math.round(pricingTier.finalPrice * 0.02)

    const subtotal = pricingTier.finalPrice + serviceFees + insurance
    const promoDiscount = promo?.discount || 0
    const grainsDiscount = useGrains ? Math.min(grainsBalance * 2, subtotal * 0.5) : 0
    const total = subtotal + transportGlobal - promoDiscount - grainsDiscount

    return {
      products,
      retailProducts,
      wholesaleDiscount,
      discountAmount: pricingTier.discountAmount,
      discountPercent: pricingTier.discountPercent,
      finalProducts: pricingTier.finalPrice,
      totalQuantity,
      tier: pricingTier.tier,
      serviceFees,
      insurance,
      subtotal,
      promoDiscount,
      grainsDiscount,
      totalSavings: wholesaleDiscount + pricingTier.discountAmount + promoDiscount + grainsDiscount,
      total,
    }
  }, [items, marketplaceTier, transportGlobal, promo, useGrains, grainsBalance, serviceFeeTiers])

  // Sea freight eligibility
  const seaFreightCheck = useMemo(() => {
    const hasDimensionsOrVolumeData = items.some((it) => {
      const hasVolume = typeof it.volumeM3 === 'number' && it.volumeM3 > 0
      const hasDims = typeof it.lengthCm === 'number' && it.lengthCm > 0 && typeof it.widthCm === 'number' && it.widthCm > 0 && typeof it.heightCm === 'number' && it.heightCm > 0
      return hasVolume || hasDims
    })
    return evaluateSeaFreightEligibility(
      {
        totalVolumeM3: Number(weightSummary.totalVolume.toFixed(4)),
        totalBilledWeightKg: Number(weightSummary.billedWeight.toFixed(2)),
        totalOrderValueFcfa: Math.round(breakdown.finalProducts || 0),
        hasDimensionsOrVolumeData,
      },
      seaFreightEligibility
    )
  }, [items, weightSummary, breakdown.finalProducts, seaFreightEligibility])

  useEffect(() => {
    if (shippingMethod === 'sea' && !seaFreightCheck.eligible) setShippingMethod('air')
  }, [shippingMethod, seaFreightCheck.eligible])

  const selectedItems = useMemo(() => items.filter(i => selectedIds.has(i.id)), [items, selectedIds])
  const selectedCount = selectedItems.length

  const toggleSelectAll = () => {
    if (selectedCount === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id)
      return
    }
    const next = items.map(i => (i.id === id ? { ...i, qty } : i))
    setItems(next)
    localStorage.setItem('cart:items', JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('cart:updated'))
  }

  const removeItem = (id: string) => {
    const item = items.find(i => i.id === id)
    const next = items.filter(i => i.id !== id)
    setItems(next)
    localStorage.setItem('cart:items', JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('cart:updated'))
    addToast(item ? `${item.name} retiré du panier` : 'Article retiré du panier', 'info')
  }

  const removeSelected = () => {
    const next = items.filter(i => !selectedIds.has(i.id))
    setItems(next)
    localStorage.setItem('cart:items', JSON.stringify(next))
    setSelectedIds(new Set())
    window.dispatchEvent(new CustomEvent('cart:updated'))
  }

  const addSuggestedToCart = useCallback((product: any) => {
    const existing = items.find(item => item.id === product._id)
    const updated = existing
      ? items.map(item => (item.id === product._id ? { ...item, qty: (item.qty || 1) + 1 } : item))
      : [
          ...items,
          {
            id: product._id,
            name: product.name,
            image: product.image,
            price: product.price || 0,
            qty: 1,
            weightKg: product.weightKg,
            volumeM3: product.volumeM3,
          },
        ]
    setItems(updated)
    localStorage.setItem('cart:items', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('cart:updated'))
    addToast(`${product.name} ajouté au panier`, 'success')
  }, [items, addToast])

  const applyPromo = (code: string) => {
    if (!code.trim()) return
    // Simulate promo: DDM10 = -10%, DDM20 = -20%
    let discount = 0
    if (code === 'DDM10') discount = Math.round(breakdown.subtotal * 0.1)
    else if (code === 'DDM20') discount = Math.round(breakdown.subtotal * 0.2)
    else {
      addToast('Code promo invalide', 'error')
      return
    }
    setPromo({ code, discount })
    addToast(`Code promo ${code} appliqué : -${formatCurrency(discount)}`, 'success')
  }

  const handleGrainsToggle = (use: boolean, amount: number) => {
    setUseGrains(use)
  }

  const proceedToCheckout = () => {
    if (selectedCount === 0) {
      addToast('Veuillez sélectionner au moins un article', 'error')
      return
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_cart', JSON.stringify({
        items: selectedItems,
        shippingMethod,
        promo,
        useGrains,
        grainsAmount: useGrains ? Math.min(grainsBalance, breakdown.subtotal * 0.5 / 2) : 0,
      }))
    }
    router.push('/checkout/adresse')
  }

  const requestQuoteWhatsApp = () => {
    const text = encodeURIComponent(`Bonjour DDM+, je souhaite un devis pour mon panier de ${items.length} article(s) pour un total de ${formatCurrency(breakdown.total)}.`)
    window.open(`https://wa.me/221778000000?text=${text}`, '_blank')
  }

  const scrollSuggestions = (direction: 'left' | 'right') => {
    const container = document.getElementById('suggestions-carousel')
    if (!container) return
    const amount = 300
    const newScroll = direction === 'left' ? Math.max(0, suggestionScroll - amount) : suggestionScroll + amount
    container.scrollTo({ left: newScroll, behavior: 'smooth' })
    setSuggestionScroll(newScroll)
  }

  const maritimeThreshold = seaFreightEligibility.minVolumeM3 || 0.05
  const itemsToMaritime = Math.max(0, Math.ceil((maritimeThreshold - weightSummary.totalVolume) / 0.01))
  const maritimeProgress = Math.min(100, (weightSummary.totalVolume / maritimeThreshold) * 100)
  const shippingUpgradeAvailable = !seaFreightCheck.eligible && weightSummary.totalVolume > 0

  const transportOptions: TransportOption[] = useMemo(() => {
    const express = shippingRates.air_express
    const air = shippingRates.air_15
    const sea = shippingRates.sea_freight
    return [
      {
        id: 'express',
        label: express?.label || 'Express 3j',
        duration: `${express?.durationDays || 3} jours ouvrés · 12 000 F/kg`,
        price: transportGlobal,
        weightPrice: '12 000 F/kg',
        recommended: false,
      },
      {
        id: 'air',
        label: air?.label || 'Aérien 10-15j',
        duration: `${air?.durationDays || '10-15'} jours · 8 500 F/kg`,
        price: transportGlobal,
        weightPrice: '8 500 F/kg',
        bestPrice: true,
      },
      {
        id: 'sea',
        label: sea?.label || 'Maritime 45-60j',
        duration: `${sea?.durationDays || '45-60'} jours · 6 000 F/kg`,
        price: transportGlobal,
        weightPrice: '6 000 F/kg',
        recommended: false,
      },
    ]
  }, [shippingRates, transportGlobal])

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <MarketHeader />
        <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Votre panier est vide</h1>
          <p className="text-slate-500 mb-6">Découvrez nos produits et commencez vos achats.</p>
          <Link href="/produits" className="inline-flex items-center gap-2 px-6 py-3 bg-ddm-emerald text-white rounded-xl font-bold hover:bg-ddm-emerald-dark transition">
            Continuer les achats <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <MarketFooter />
        <MarketBottomNav />
      </div>
    )
  }

  const monthlyAmount = Math.round(breakdown.total / 3)
  const allSelected = items.length > 0 && selectedCount === items.length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MarketHeader />
      <div className="pt-16">
        <CheckoutStepper currentStep="cart" />
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href="/market" className="hover:text-ddm-emerald">Accueil</Link>
              <span>/</span>
              <span className="text-ddm-emerald font-medium">Panier</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 text-ddm-emerald" />
              Mon panier
              <span className="text-slate-500 text-lg font-normal">({items.length} article{items.length > 1 ? 's' : ''})</span>
            </h1>
          </div>
          <Link href="/produits" className="text-ddm-emerald-dark hover:underline text-sm font-medium flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Continuer mes achats
          </Link>
        </div>

        {/* Urgency maritime banner */}
        {shippingUpgradeAvailable && (
          <div className="mb-6">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <Zap className="w-6 h-6 text-orange-600 animate-pulse" />
              <div className="flex-1">
                <p className="font-bold text-orange-900 text-sm">
                  Plus que {itemsToMaritime} article(s) pour bénéficier de la livraison maritime à -30% !
                </p>
                <div className="mt-2 h-2 bg-orange-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${maritimeProgress}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
              <Link href="/produits" className="text-orange-700 font-medium text-sm whitespace-nowrap hover:underline">
                Ajouter →
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Select all / delete */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-ddm-emerald rounded"
                />
                Tout sélectionner ({selectedCount}/{items.length})
              </label>
              {selectedCount > 0 && (
                <button
                  onClick={removeSelected}
                  className="text-red-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer la sélection ({selectedCount})
                </button>
              )}
            </div>

            {/* Cart items */}
            <div className="space-y-3">
              {items.map(item => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggle={() => toggleItem(item.id)}
                  onQtyChange={qty => updateQty(item.id, qty)}
                  onRemove={() => removeItem(item.id)}
                  onAddToFavorites={() => addToast('Ajouté aux favoris', 'success')}
                  onGroupBuy={() => router.push(`/achats-groupes?productId=${item.id}`)}
                />
              ))}
            </div>

            {/* Maritime eligibility panel */}
            <div className="border border-violet-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowMaritimePanel(!showMaritimePanel)}
                className="w-full bg-violet-50 p-3 flex items-center justify-between"
              >
                <span className="font-medium text-sm text-violet-900 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Éligibilité fret maritime
                </span>
                {showMaritimePanel ? <ChevronUp className="w-4 h-4 text-violet-700" /> : <ChevronDown className="w-4 h-4 text-violet-700" />}
              </button>
              <AnimatePresence>
                {showMaritimePanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <MaritimeEligibilityPanel
                      volume={weightSummary.totalVolume}
                      threshold={maritimeThreshold}
                      weightKg={weightSummary.billedWeight}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Service fee tier progress */}
            <ServiceFeeTierProgress currentAmount={breakdown.finalProducts} currentFeeRate={breakdown.serviceFees / (breakdown.finalProducts || 1) * 100} tiers={serviceFeeTiers} />

            {/* Cross-sell suggestions */}
            {suggestedProducts.length > 0 && (
              <section className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-ddm-purple" /> Complétez votre commande
                  </h3>
                  <div className="hidden md:flex gap-2">
                    <button onClick={() => scrollSuggestions('left')} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <button onClick={() => scrollSuggestions('right')} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
                <div
                  id="suggestions-carousel"
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {suggestedProducts.map(product => (
                    <div key={product._id} className="w-[160px] md:w-[180px] flex-shrink-0 snap-start">
                      <CompactProductCard product={product} onAdd={addSuggestedToCart} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Group buy opportunities */}
            {activeGroups.length > 0 && (
              <section className="mt-6">
                <div className="bg-gradient-to-r from-violet-50 to-emerald-50 border border-violet-200 rounded-2xl p-5">
                  <h3 className="font-bold text-lg text-slate-900 mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-600" /> Économisez plus avec les achats groupés !
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">Certains produits de votre panier ont des groupes actifs.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {activeGroups.map(opp => (
                      <GroupBuyOpportunityCard key={opp.groupId} opportunity={opp} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Minimum cart alerts */}
            {breakdown.totalQuantity < 5 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 text-sm">Plus que {5 - breakdown.totalQuantity} produit(s) pour atteindre le minimum !</p>
                </div>
                <div className="text-2xl font-bold text-amber-600">{breakdown.totalQuantity}/5</div>
              </div>
            )}
            {breakdown.totalQuantity >= 5 && breakdown.totalQuantity < 20 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">🎉 Ajoutez {20 - breakdown.totalQuantity} produit(s) pour débloquer -5% supplémentaire !</p>
                </div>
              </div>
            )}

            {/* Recently viewed */}
            {recentViewed.length > 0 && (
              <section className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-900">Vus récemment</h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {recentViewed.slice(0, 6).map((product, idx) => (
                    <div
                      key={product.id || idx}
                      onClick={() => router.push(`/produits/${product.id}`)}
                      className="w-[140px] flex-shrink-0 bg-white rounded-lg border border-slate-200 p-2 cursor-pointer hover:shadow-md transition"
                    >
                      <div className="h-20 bg-slate-100 rounded-lg mb-2 overflow-hidden">
                        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
                      </div>
                      <p className="text-xs font-medium text-slate-900 line-clamp-2">{product.name}</p>
                      <p className="text-xs font-bold text-ddm-emerald mt-1">{formatCurrency(product.price)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right sticky summary */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-ddm-emerald" /> Résumé de commande
              </h2>

              <PromoCodeInput onApply={applyPromo} appliedCode={promo?.code} />

              {grainsBalance > 0 && (
                <GrainsToggle
                  balance={grainsBalance}
                  maxUsable={Math.min(grainsBalance, Math.floor(breakdown.subtotal * 0.5 / 2))}
                  onToggle={handleGrainsToggle}
                />
              )}

              <TransportSelector
                value={shippingMethod}
                onChange={(m) => {
                  if (m === 'sea' && !seaFreightCheck.eligible) {
                    addToast('Maritime indisponible : volume/poids insuffisant', 'error')
                    return
                  }
                  setShippingMethod(m)
                }}
                options={transportOptions}
              />

              <PriceBreakdown
                subtotal={breakdown.finalProducts}
                serviceFees={breakdown.serviceFees}
                transport={transportGlobal}
                insurance={breakdown.insurance}
                promoDiscount={breakdown.promoDiscount}
                grainsDiscount={breakdown.grainsDiscount}
                total={breakdown.total}
                totalSavings={breakdown.totalSavings}
              />

              <div className="space-y-2 pt-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={proceedToCheckout}
                  disabled={sending || selectedCount === 0}
                  className="w-full h-14 bg-ddm-emerald hover:bg-ddm-emerald-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition"
                >
                  {sending ? 'Traitement...' : <>
                    <Zap className="w-5 h-5" /> Passer commande ({selectedCount} article{selectedCount > 1 ? 's' : ''}) →
                  </>}
                </motion.button>
                <button
                  onClick={requestQuoteWhatsApp}
                  className="w-full py-3 border-2 border-slate-300 hover:border-ddm-emerald rounded-xl font-medium text-sm text-slate-700 flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Demander un devis WhatsApp
                </button>
                <p className="text-xs text-center text-slate-500">
                  💳 Paiement en 3x sans frais avec Wave · {formatCurrency(monthlyAmount)}/mois
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200">
                <TrustBadge icon={Lock} label="Paiement sécurisé" />
                <TrustBadge icon={Award} label="Qualité garantie" />
                <TrustBadge icon={RefreshCw} label="Retour 30j" />
                <TrustBadge icon={Headphones} label="Support 7j/7" />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile sticky summary */}
      <AnimatePresence>
        {showMobileSummary && items.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:hidden"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">Total ({breakdown.totalQuantity} article{breakdown.totalQuantity > 1 ? 's' : ''})</p>
                <p className="text-xl font-bold text-ddm-emerald">{formatCurrency(breakdown.total)}</p>
                {breakdown.totalSavings > 0 && <p className="text-[10px] text-ddm-emerald">Économie {formatCurrency(breakdown.totalSavings)}</p>}
              </div>
              <button
                onClick={proceedToCheckout}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 bg-ddm-emerald text-white px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
              >
                Commander <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-100 mt-12 py-6 px-4 border-t text-center text-sm text-slate-600">
        <p>En continuant, vous acceptez nos conditions de vente et la politique de retour.</p>
      </div>
      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
