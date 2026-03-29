
"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Mail,
  Truck,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Star,
  ShoppingCart,
  Eye,
  Zap,
  LogIn,
  UserPlus,
  Users
} from 'lucide-react'
import Link from 'next/link'
import AddressPickerSenegal from '@/components/AddressPickerSenegal'
import CartEngagementSidebar from '@/components/CartEngagementSidebar'
import { applyTierDiscount } from '@/lib/pricing/tiered-pricing'
import { getServiceFeeTier, SERVICE_FEE_TIERS, type ServiceFeeTier } from '@/lib/pricing/tiered-service-fees'
import { calculateBilledWeight } from '@/lib/pricing/volumetric-weight'
import { resolveProductPrice, type MarketplaceTier } from '@/lib/pricing/resolve-product-price'
import { ServiceFeeTierProgress } from '@/components/ServiceFeeTierProgress'
import { useToast } from '@/components/ui/Toaster'
import { BASE_SHIPPING_RATES, type ShippingMethodId, type ShippingRate } from '@/lib/logistics'

const formatCurrency = (v?: number) => (typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-')
const MARKETPLACE_TIER_LABEL: Record<MarketplaceTier, string> = {
  standard: 'Standard',
  pro: 'Pro',
  reseller: 'Revendeur',
  partner: 'Partenaire',
}

export default function PanierPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUser, setAuthUser] = useState<{ name?: string; email?: string; phone?: string } | null>(null)
  const [marketplaceTier, setMarketplaceTier] = useState<MarketplaceTier>('standard')
  const router = useRouter()
  const { addToast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [recentViewed, setRecentViewed] = useState<any[]>([])
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])
  const [shippingMethod, setShippingMethod] = useState<'express' | 'air' | 'sea'>('air')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState<any>({}) // Objet structuré
  const [sending, setSending] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Panier, 2: Adresse, 3: Confirmation
  const [addressValid, setAddressValid] = useState(false)
  const [suggestionScroll, setSuggestionScroll] = useState(0)
  const [shippingRates, setShippingRates] = useState<Record<ShippingMethodId, ShippingRate>>(BASE_SHIPPING_RATES)
  const [serviceFeeTiers, setServiceFeeTiers] = useState<ServiceFeeTier[]>(SERVICE_FEE_TIERS)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [activeGroups, setActiveGroups] = useState<any[]>([])

  // 0. Vérifier l'authentification JWT custom au montage
  useEffect(() => {
    fetch('/api/client/profile', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.profile) {
          setIsAuthenticated(true)
          setAuthUser({ name: data.profile.name, email: data.profile.email, phone: data.profile.phone })
          const tier = data.profile.marketplaceTier
          if (tier === 'standard' || tier === 'pro' || tier === 'reseller' || tier === 'partner') {
            setMarketplaceTier(tier)
          }
          setName((prev: string) => prev || data.profile.name || '')
          setEmail((prev: string) => prev || data.profile.email || '')
          setPhone((prev: string) => prev || data.profile.phone || '')
          if (data.lastAddress) {
            setAddress((prev: any) => (!prev || Object.keys(prev).length === 0 ? data.lastAddress : prev))
          }
        }
      })
      .catch(() => {})
  }, [])

  // 1. Restaurer depuis sessionStorage au montage (pour conserver les infos si redirection login)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('cart_checkout_form')
        if (saved) {
          try {
            const data = JSON.parse(saved)
            setName(prev => prev || data.name || '')
            setPhone(prev => prev || data.phone || '')
            setEmail(prev => prev || data.email || '')
            setAddress((prev: any) => (Object.keys(prev || {}).length === 0 ? data.address : prev))
          } catch {}
        }
    }
  }, [])

  // 2. Sauvegarder les changements pour persistance
  useEffect(() => {
     const hasData = name || phone || email || (address && Object.keys(address).length > 0)
     if (hasData && typeof window !== 'undefined') {
        sessionStorage.setItem('cart_checkout_form', JSON.stringify({ name, phone, email, address }))
     }
  }, [name, phone, email, address])


  const highlightError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: true }))
    setTimeout(() => {
      setErrors(prev => ({ ...prev, [field]: false }))
    }, 2000)
  }

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(d => {
        if (d?.success && d?.rates) setShippingRates(d.rates)
      })
      .catch(() => {
        // fallback: BASE_SHIPPING_RATES
      })
  }, [])

  useEffect(() => {
    fetch('/api/pricing/settings')
      .then(r => r.json())
      .then(d => {
        if (d?.success && Array.isArray(d?.defaults?.serviceFeeTiers) && d.defaults.serviceFeeTiers.length > 0) {
          setServiceFeeTiers(d.defaults.serviceFeeTiers)
        }
      })
      .catch(() => {
        // fallback: SERVICE_FEE_TIERS
      })
  }, [])

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = localStorage.getItem('cart:items')
      setItems(raw ? JSON.parse(raw) : [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Charger les produits suggérés
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        // Récupérer des produits populaires/récents
        const res = await fetch('/api/catalog/products?limit=12&sort=popular')
        const data = await res.json()
        if (data.success && data.items) {
          // Exclure les produits déjà dans le panier
          const cartIds = items.map(i => i.id?.split('-')[0] || i.id)
          const filtered = data.items.filter((p: any) => !cartIds.includes(p._id))
          setSuggestedProducts(filtered.slice(0, 10))
        }
      } catch (e) {
        console.error('Erreur chargement suggestions:', e)
      }
    }
    fetchSuggestions()
  }, [items])

  // Chercher les achats groupés actifs pour les produits du panier
  useEffect(() => {
    if (items.length === 0) { setActiveGroups([]); return }
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
                results.push({ ...g, cartProductId: pid, cartProductName: items.find(i => (i.id?.split('-')[0] || i.id) === pid)?.name })
              }
            }
          } catch {}
        }
        setActiveGroups(results)
      } catch {}
    }
    fetchGroups()
  }, [items])

  // Ajouter un produit suggéré au panier
  const addSuggestedToCart = useCallback((product: any) => {
    const newItem = {
      id: product._id,
      name: product.name,
      image: product.image,
      price: product.price || 0,
      qty: 1,
      weightKg: product.weightKg,
      volumeM3: product.volumeM3
    }
    const updated = [...items, newItem]
    setItems(updated)
    localStorage.setItem('cart:items', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('cart:updated'))
  }, [items])

  // Scroll du carrousel de suggestions
  const scrollSuggestions = (direction: 'left' | 'right') => {
    const container = document.getElementById('suggestions-carousel')
    if (!container) return
    const scrollAmount = 300
    const newScroll = direction === 'left' 
      ? Math.max(0, suggestionScroll - scrollAmount)
      : suggestionScroll + scrollAmount
    container.scrollTo({ left: newScroll, behavior: 'smooth' })
    setSuggestionScroll(newScroll)
  }

  const SHIPPING_CHOICES = useMemo(() => ({
    express: { label: shippingRates.air_express?.label || 'Express 3j', methodId: 'air_express' as const },
    air: { label: shippingRates.air_15?.label || 'Fret aérien 10–15j', methodId: 'air_15' as const },
    sea: { label: shippingRates.sea_freight?.label || 'Maritime 60j', methodId: 'sea_freight' as const }
  }), [shippingRates])

  const transportGlobal = useMemo(() => {
    let totalWeight = 0
    let totalVolume = 0
    let totalVolumetricWeight = 0
    
    for (const it of items) {
      const qty = it.qty || 1
      const w = typeof it.unitWeightKg === 'number' ? it.unitWeightKg : (typeof it.weightKg === 'number' ? it.weightKg : 0)
      const v = typeof it.unitVolumeM3 === 'number' ? it.unitVolumeM3 : (typeof it.volumeM3 === 'number' ? it.volumeM3 : 0)
      totalWeight += w * qty
      totalVolume += v * qty
      
      // Calcul du poids volumétrique
      if (it.lengthCm && it.widthCm && it.heightCm && w > 0) {
        const weightInfo = calculateBilledWeight({
          actualWeightKg: w,
          lengthCm: it.lengthCm,
          widthCm: it.widthCm,
          heightCm: it.heightCm
        })
        totalVolumetricWeight += weightInfo.volumetricWeight * qty
      }
    }

    const selectedMethodId = SHIPPING_CHOICES[shippingMethod]?.methodId || 'air_15'
    const rate = shippingRates[selectedMethodId]
    if (!rate) return 0

    // Pour le fret aérien, utiliser le max entre poids réel et volumétrique
    let billedWeight = totalWeight
    if (rate.billing === 'per_kg') {
      billedWeight = Math.max(totalWeight, totalVolumetricWeight)
    }

    let billed = 0
    if (rate.billing === 'per_cubic_meter') {
      billed = Math.max(totalVolume || 0, 0) * rate.rate
    } else {
      billed = Math.max(billedWeight || 0.1, 0.1) * rate.rate
    }

    const withMinCharge = typeof rate.minimumCharge === 'number' ? Math.max(billed, rate.minimumCharge) : billed
    return Math.round(withMinCharge)
  }, [items, shippingMethod, shippingRates, SHIPPING_CHOICES])

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
      
      // Calcul du poids volumétrique
      if (it.lengthCm && it.widthCm && it.heightCm && w > 0) {
        const weightInfo = calculateBilledWeight({
          actualWeightKg: w,
          lengthCm: it.lengthCm,
          widthCm: it.widthCm,
          heightCm: it.heightCm
        })
        totalVolumetricWeight += weightInfo.volumetricWeight * qty
        if (weightInfo.billingMethod === 'volumetric') {
          hasVolumetric = true
        }
      }
    }
    
    return { 
      totalWeight, 
      totalVolume, 
      totalVolumetricWeight,
      billedWeight: Math.max(totalWeight, totalVolumetricWeight),
      hasVolumetric 
    }
  }, [items])

  const transportLabel = useMemo(() => {
    const selectedMethodId = SHIPPING_CHOICES[shippingMethod]?.methodId || 'air_15'
    const rate = shippingRates[selectedMethodId]
    if (!rate) return 'Transport'
    
    // Si un minimum de facturation est défini qui correspond au prix unitaire (ex: 1kg), on l'indique
    if (rate.minimumCharge && rate.rate && rate.minimumCharge === rate.rate) {
       return `Transport (min 1${rate.billing === 'per_cubic_meter' ? 'm³' : 'kg'})`
    }
    
    return 'Transport'
  }, [shippingMethod, shippingRates, SHIPPING_CHOICES])

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
    window.addEventListener('cart:updated', load as EventListener)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('recent:updated', load as EventListener)
      window.removeEventListener('cart:updated', load as EventListener)
    }
  }, [])

  const breakdown = useMemo(() => {
    let products = 0
    let retailProducts = 0
    let totalQuantity = 0

    // Premier passage: calculer la quantité totale
    for (const it of items) totalQuantity += it.qty || 1

    // Second passage: appliquer le prix selon la logique tier + quantité
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
      const effectivePrice = resolved.appliedPrice
      products += effectivePrice * qty
      retailProducts += retailPrice * qty
    }

    // Appliquer les tarifs progressifs
    const pricingTier = applyTierDiscount(products, totalQuantity)

    const total = pricingTier.finalPrice + transportGlobal
    const wholesaleDiscount = retailProducts > products ? retailProducts - products : 0

    return {
      products: products,
      retailProducts,
      wholesaleDiscount,
      discountAmount: pricingTier.discountAmount,
      discountPercent: pricingTier.discountPercent,
      finalProducts: pricingTier.finalPrice,
      totalQuantity,
      tier: pricingTier.tier,
      total
    }
  }, [items, marketplaceTier, transportGlobal])

  const standardServiceFeeRate = serviceFeeTiers[0]?.feeRate ?? 10

  const removeItem = (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    localStorage.setItem('cart:items', JSON.stringify(next))
  }

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id)
      return
    }
    const next = items.map(i => i.id === id ? { ...i, qty } : i)
    setItems(next)
    localStorage.setItem('cart:items', JSON.stringify(next))
  }

  const handleCheckout = async () => {
    if (items.length === 0) {
      addToast('Votre panier est vide', 'error')
      return
    }
    if (!name || !phone || !addressValid || !address) {
      if (!name) highlightError('name')
      if (!phone) highlightError('phone')
      if (!addressValid) highlightError('address')
      addToast('Veuillez remplir les informations de livraison obligatoires', 'error')
      return
    }

    // Validation téléphone Sénégal
    const cleanedPhone = phone.replace(/\s+/g, '').replace(/^(\+|00)?221/, '')
    if (!/^(77|78|76|70|75)\d{7}$/.test(cleanedPhone)) {
      addToast('Numéro de téléphone invalide (Ex: 77 123 45 67)', 'error')
      highlightError('phone')
      return
    }

    setSending(true)
    try {
      const shippingMap: Record<string, string> = {
        express: 'express_3j',
        air: 'air_15j',
        sea: 'maritime_60j'
      }

      // CSRF token (required in production for unauthenticated POST requests)
      let csrfToken: string | null = null
      try {
        const csrfRes = await fetch('/api/csrf', { method: 'GET' })
        const csrfData = await csrfRes.json().catch(() => ({}))
        csrfToken = csrfData?.csrfToken || csrfRes.headers.get('X-CSRF-Token')
      } catch {
        csrfToken = null
      }
      
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify({ 
          cart: items, 
          name, 
          phone, 
          email: email || undefined,
          address, 
          shippingMethod: shippingMap[shippingMethod] 
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Ne PAS vider le panier ici — le conserver jusqu'à confirmation paiement
        // L'utilisateur peut revenir en arrière sans tout perdre
        const ref = data.orderId || data.reference;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cart:pending_order', ref)
        }
        router.push(`/paiement/checkout/${ref}`)
      } else {
        addToast('Erreur: ' + (data.error || 'erreur inconnue'), 'error')
      }
    } catch (e) {
      console.error(e)
      addToast('Erreur lors de l\'envoi de la commande', 'error')
    } finally {
      setSending(false)
    }
  }

  const stepItems = [
    { number: 1, label: 'Panier', active: step >= 1 },
    { number: 2, label: 'Adresse', active: step >= 2 },
    { number: 3, label: 'Confirmation', active: step >= 3 }
  ]

  // Panier vide
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-violet-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panier vide</h1>
            <p className="text-gray-600 mb-6">Explorez nos produits et ajoutez-les à votre panier pour commencer!</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.a
                href="/produits"
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg"
              >
                <Package className="w-5 h-5" />
                Voir le catalogue
              </motion.a>
              <motion.a
                href="/achats-groupes"
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 bg-white border-2 border-violet-200 text-violet-700 px-8 py-4 rounded-xl font-bold transition hover:bg-violet-50 shadow-sm"
              >
                <Users className="w-5 h-5" />
                Achats groupés
              </motion.a>
            </div>
          </motion.div>

          {/* Incitation achats groupés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-green-50 p-6 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Payez moins cher avec les achats groupés</h3>
            <p className="text-sm text-gray-600 mb-4">
              Rejoignez un groupe d&apos;achat et bénéficiez de tarifs dégressifs — import direct Chine, livraison Sénégal.
            </p>
            <Link
              href="/achats-groupes"
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-800 hover:underline"
            >
              Découvrir les groupes en cours
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-violet-50">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-600 to-violet-600 text-white py-8 px-4 md:px-8 shadow-xl"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step === 3 ? 2 : 1)}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
              )}
              <ShoppingBag className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Votre Panier</h1>
            </div>
            <Link href="/produits" className="text-white/70 hover:text-white text-xs flex items-center gap-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              Catalogue
            </Link>
          </div>

          {/* Progression steps */}
          <div className="flex justify-between items-center relative">
            <div className="absolute top-6 left-0 right-0 h-1 bg-white/20">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${((step - 1) / 2) * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-white"
              />
            </div>
            {stepItems.map((s, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center relative z-10"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all ${
                    s.active
                      ? 'bg-white text-green-600 border-white'
                      : 'bg-white/30 text-white border-white/50'
                  }`}
                >
                  {s.number}
                </motion.div>
                <p className={`text-xs md:text-sm font-medium mt-2 ${s.active ? 'text-white' : 'text-white/70'}`}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Contenu */}
      <div className="relative">
      <div className="hidden 2xl:block absolute right-4 top-8 w-60 z-10">
        <CartEngagementSidebar cartProductIds={items.map(i => i.id)} marketplaceTier={marketplaceTier} />
      </div>
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Produits */}
              <div className="lg:col-span-2">
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-xl border border-gray-200 p-4 shadow-md hover:shadow-lg transition"
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{it.name}</h3>
                          {it.variantId && <p className="text-xs text-gray-500">Variante: {it.variantId}</p>}
                          {(() => {
                            const qty = it.qty || 1
                            const retailPrice = typeof it.price === 'number' ? it.price : 0
                            const hasWholesale = typeof it.b2bPrice === 'number' && it.b2bPrice > 0 && it.b2bPrice < retailPrice
                            const resolved = resolveProductPrice({
                              price: retailPrice,
                              b2bPrice: it.b2bPrice,
                              qty,
                              totalCartQty: breakdown.totalQuantity,
                              marketplaceTier,
                            })
                            const usesWholesale = resolved.priceType === 'wholesale'
                            const effectivePrice = resolved.appliedPrice
                            const discountPct = resolved.savingsPercent
                            return (
                              <>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-sm font-bold ${usesWholesale ? 'text-violet-600' : 'text-green-600'}`}>
                                    {formatCurrency(effectivePrice)}
                                  </span>
                                  {usesWholesale && (
                                    <span className="text-xs line-through text-gray-400">{formatCurrency(it.price)}</span>
                                  )}
                                  {usesWholesale && discountPct > 0 && (
                                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">
                                      -{discountPct}%
                                    </span>
                                  )}
                                </div>
                                {hasWholesale && !usesWholesale && breakdown.totalQuantity < 5 && (
                                  <p className="text-[11px] text-violet-500 mt-0.5">
                                    Prix volume dès 5 pcs : {formatCurrency(it.b2bPrice)} (-{discountPct}%)
                                  </p>
                                )}
                              </>
                            )
                          })()}
                          {recentViewed && recentViewed.some(rv => it.id.startsWith(rv.id)) && (
                            <span className="inline-block text-xs text-green-600 font-semibold mt-1">⭐ Vu récemment</span>
                          )}
                        </div>

                        {/* Qty + Actions */}
                        <div className="flex flex-col items-end gap-3">
                          <motion.div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => updateQty(it.id, (it.qty || 1) - 1)}
                              className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-200 transition"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <div className="w-8 text-center font-semibold text-sm">{it.qty || 1}</div>
                            <button
                              onClick={() => updateQty(it.id, (it.qty || 1) + 1)}
                              className="w-8 h-8 rounded flex items-center justify-center hover:bg-green-100 transition"
                            >
                              <Plus className="w-4 h-4 text-green-600" />
                            </button>
                          </motion.div>
                          <p className="text-sm font-bold text-gray-900">{(() => {
                            const qty = it.qty || 1
                            const retailPrice = typeof it.price === 'number' ? it.price : 0
                            const resolved = resolveProductPrice({
                              price: retailPrice,
                              b2bPrice: it.b2bPrice,
                              qty,
                              totalCartQty: breakdown.totalQuantity,
                              marketplaceTier,
                            })
                            return formatCurrency(resolved.appliedPrice * qty)
                          })()}</p>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => removeItem(it.id)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Banner achats groupés */}
                {activeGroups.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-green-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">Achat groupé disponible !</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {activeGroups.length === 1
                            ? 'Un produit de votre panier est disponible en achat groupé pour moins cher.'
                            : `${activeGroups.length} produits de votre panier sont disponibles en achat groupé.`}
                        </p>
                        <div className="mt-3 space-y-2">
                          {activeGroups.map((g: any) => {
                            const cartItem = items.find(i => (i.id?.split('-')[0] || i.id) === g.cartProductId)
                            const cartPrice = cartItem?.price || 0
                            const saving = cartPrice > 0 && g.currentUnitPrice < cartPrice ? cartPrice - g.currentUnitPrice : 0
                            return (
                              <Link
                                key={g.groupId}
                                href={`/achats-groupes/${g.groupId}`}
                                className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-sm transition"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-gray-900 truncate">{g.cartProductName || g.product?.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Groupe: {formatCurrency(g.currentUnitPrice)} / unité
                                    {saving > 0 && (
                                      <span className="ml-1 font-bold text-green-600">(-{formatCurrency(saving)})</span>
                                    )}
                                  </p>
                                </div>
                                <span className="ml-2 px-2.5 py-1 bg-gradient-to-r from-green-500 to-violet-500 text-white text-[11px] font-bold rounded-lg flex-shrink-0">
                                  Rejoindre
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Récap */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg sticky top-6 h-fit"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-6">Récapitulatif</h3>

                {/* Expédition */}
                <div className="mb-6 pb-6 border-b">
                  <p className="text-sm font-medium text-gray-700 mb-3">Mode de transport</p>
                  <div className="space-y-2">
                    {Object.entries(SHIPPING_CHOICES).map(([key, rate]) => (
                      <motion.label
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      >
                        <input
                          type="radio"
                          name="shipping"
                          checked={shippingMethod === key as any}
                          onChange={() => setShippingMethod(key as any)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm flex-1">{rate.label}</span>
                      </motion.label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    📦 Poids réel: {weightSummary.totalWeight.toFixed(2)}kg
                    {weightSummary.hasVolumetric && (
                      <span className="text-amber-600 ml-1">
                        · 📊 Volumétrique: {weightSummary.totalVolumetricWeight.toFixed(2)}kg
                        · ⚖️ Facturé: {weightSummary.billedWeight.toFixed(2)}kg
                      </span>
                    )}
                    · � Quantité: {breakdown.totalQuantity}
                  </p>
                </div>

                {/* Bandeau prix volume actif */}
                {breakdown.wholesaleDiscount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-violet-50 border border-violet-200 rounded-lg p-4 flex gap-3"
                  >
                    <TrendingDown className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-violet-700 font-semibold">
                        {marketplaceTier === 'standard' ? 'Prix volume appliqué ✅' : `Prix B2B ${MARKETPLACE_TIER_LABEL[marketplaceTier]} appliqué ✅`}
                      </p>
                      <p className="text-violet-600 text-xs mt-1">
                        Vous économisez {formatCurrency(breakdown.wholesaleDiscount)} sur ce panier
                      </p>
                    </div>
                  </motion.div>
                )}
                {/* Incitation prix volume si < 5 pcs et au moins un produit avec b2bPrice */}
                {marketplaceTier === 'standard' && breakdown.totalQuantity < 5 && items.some(i => typeof i.b2bPrice === 'number' && i.b2bPrice > 0 && i.b2bPrice < i.price) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-violet-50 border border-violet-200 rounded-lg p-4 flex gap-3"
                  >
                    <TrendingDown className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-violet-700 font-semibold">Prix volume disponible</p>
                      <p className="text-violet-600 text-xs mt-1">Ajoutez {5 - breakdown.totalQuantity} produit(s) de plus pour débloquer les prix volume selon les offres produit</p>
                    </div>
                  </motion.div>
                )}

                {/* Tarifs progressifs - Réduction par quantité */}
                {breakdown.tier && breakdown.discountAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3"
                  >
                    <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-green-700 font-semibold">{breakdown.tier.label}</p>
                      <p className="text-green-600 text-xs mt-1">Réduction volume: -{formatCurrency(breakdown.discountAmount)}</p>
                    </div>
                  </motion.div>
                )}

                {/* Progression B2B - Réduction sur frais de service */}
                {(() => {
                  const currentAmount = breakdown.products
                  const b2bTier = getServiceFeeTier(currentAmount, serviceFeeTiers)
                  return (
                    <div className="mb-6">
                      <ServiceFeeTierProgress
                        currentAmount={currentAmount}
                        currentFeeRate={b2bTier.feeRate}
                        tiers={serviceFeeTiers}
                        standardFeeRate={standardServiceFeeRate}
                        variant="compact"
                      />
                    </div>
                  )
                })()}

                {/* Prices avec décomposition */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Produits (avec frais)</span>
                    <span className="font-semibold">{formatCurrency(breakdown.products)}</span>
                  </div>
                  {(() => {
                    const currentAmount = breakdown.products
                    const b2bTier = getServiceFeeTier(currentAmount, serviceFeeTiers)
                    const standardFee = Math.round(currentAmount * (standardServiceFeeRate / 100))
                    const actualFee = Math.round(currentAmount * (b2bTier.feeRate / 100))
                    const savings = standardFee - actualFee
                    
                    if (savings > 0) {
                      return (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700 flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold">B2B</span>
                            Frais de service réduits ({b2bTier.feeRate}%)
                          </span>
                          <span className="font-semibold text-green-700">
                            Économie: {formatCurrency(savings)}
                          </span>
                        </div>
                      )
                    }
                    return null
                  })()}
                  {breakdown.wholesaleDiscount > 0 && (
                    <div className="flex justify-between text-sm text-violet-700 font-semibold">
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] bg-violet-100 px-1.5 py-0.5 rounded-full">VOLUME</span>
                        Prix volume (-{Math.round(breakdown.wholesaleDiscount / breakdown.retailProducts * 100)}%)
                      </span>
                      <span>-{formatCurrency(breakdown.wholesaleDiscount)}</span>
                    </div>
                  )}
                  {breakdown.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700 font-semibold">
                      <span>Réduction quantité ({breakdown.discountPercent}%)</span>
                      <span>-{formatCurrency(breakdown.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold text-gray-900 pb-3 border-b">
                    <span>Sous-total</span>
                    <span>{formatCurrency(breakdown.finalProducts)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-600" />
                      {transportLabel}
                      {weightSummary.hasVolumetric && (
                        <span className="text-xs text-amber-600">(poids volumétrique)</span>
                      )}
                    </span>
                    <span className="font-semibold">{formatCurrency(transportGlobal)}</span>
                  </div>
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="flex justify-between items-center pt-3 text-xl font-bold bg-gradient-to-r from-green-50 to-violet-50 rounded-lg p-4"
                  >
                    <span className="text-gray-900">Total</span>
                    <span className="text-transparent bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text">
                      {formatCurrency(breakdown.total)}
                    </span>
                  </motion.div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 text-white py-4 rounded-xl font-bold transition shadow-lg"
                >
                  Continuer vers l'adresse
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <motion.div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Adresse de livraison</h2>
                </div>

                <div className="space-y-6">
                  {/* Encart onboarding (compte optionnel) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-violet-50 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-700" />
                          <p className="text-sm font-semibold text-green-900">Commander sans compte (recommandé)</p>
                        </div>
                        <p className="mt-2 text-sm text-gray-700">
                          Vous pouvez finaliser en invité. Si vous ajoutez un email, vous recevez un lien de suivi.
                        </p>
                        <p className="mt-2 text-xs text-gray-600">
                          Créer un compte reste optionnel, utile pour retrouver facilement vos commandes et participer aux achats groupés.
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-2 md:w-auto">
                        {isAuthenticated ? (
                          <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-sm font-bold text-green-800">
                            <CheckCircle className="w-4 h-4" />
                            {authUser?.name ? `Connecté · ${authUser.name.split(' ')[0]}` : 'Connecté'}
                          </div>
                        ) : (
                          <a
                            href="/login?redirect=/panier"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
                          >
                            <LogIn className="w-4 h-4" />
                            Se connecter
                          </a>
                        )}
                        <a
                          href="/market/creer-compte?redirect=/panier"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-900 ring-1 ring-gray-200 transition hover:bg-gray-50"
                        >
                          <UserPlus className="w-4 h-4" />
                          Créer un compte
                        </a>
                      </div>
                    </div>
                  </motion.div>

                  {/* Nom */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jean Dupont"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${errors.name ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </motion.div>

                  {/* Téléphone */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${errors.phone ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </motion.div>

                  {/* Email (optionnel) */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      Email (optionnel)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Vous pouvez commander sans créer de compte. Si vous renseignez un email, vous recevrez un lien de suivi de commande.
                    </p>
                  </motion.div>

                  {/* Composant AddressPickerSenegal */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <AddressPickerSenegal
                      value={address}
                      onChange={setAddress}
                      onValidation={setAddressValid}
                    />
                  </motion.div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep(1)}
                      className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl font-bold transition"
                    >
                      Retour
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!name || !phone || !addressValid) {
                          if (!name) highlightError('name')
                          if (!phone) highlightError('phone')
                          if (!addressValid) highlightError('address')
                          addToast('Veuillez remplir les informations obligatoires', 'error')
                          return
                        }
                        setStep(3)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition"
                    >
                      Vérifier la commande
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Résumé commande */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Client */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Informations client
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Nom:</span> <span className="font-semibold text-gray-900">{name}</span></p>
                      <p><span className="text-gray-600">Téléphone:</span> <span className="font-semibold text-gray-900">{phone}</span></p>
                      {email && (
                        <p><span className="text-gray-600">Email:</span> <span className="font-semibold text-gray-900">{email}</span></p>
                      )}
                    </div>
                  </motion.div>

                  {/* Adresse */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                      Adresse de livraison
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Rue:</span> <span className="font-semibold text-gray-900">{address?.street || '-'}</span></p>
                      <p><span className="text-gray-600">Quartier:</span> <span className="font-semibold text-gray-900">{address?.neighborhood || '-'}</span></p>
                      <p><span className="text-gray-600">Département:</span> <span className="font-semibold text-gray-900">{address?.department || '-'}</span></p>
                      <p><span className="text-gray-600">Région:</span> <span className="font-semibold text-gray-900">{address?.region || '-'}</span></p>
                      {address?.additionalInfo && (
                        <p><span className="text-gray-600">Info supplémentaire:</span> <span className="font-semibold text-gray-900">{address.additionalInfo}</span></p>
                      )}
                    </div>
                  </motion.div>

                  {/* Articles */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      Produits ({items.length})
                    </h3>
                    <div className="space-y-3">
                      {items.map((it, idx) => (
                        <motion.div
                          key={it.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.05 }}
                          className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{it.name}</p>
                            <p className="text-sm text-gray-600">Quantité: {it.qty || 1}</p>
                          </div>
                          <p className="font-bold text-gray-900">{formatCurrency((it.price || 0) * (it.qty || 1))}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Récap final + CTA */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 shadow-lg sticky top-6 h-fit"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(2)}
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl font-bold transition mb-4"
                  >
                    Retour
                  </motion.button>
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    Récapitulatif
                  </h3>

                  <div className="space-y-4 mb-6">
                    {breakdown.wholesaleDiscount > 0 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Produits (prix normal)</span>
                          <span className="line-through">{formatCurrency(breakdown.retailProducts)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-violet-700 font-semibold">
                          <span className="flex items-center gap-1">
                            <span className="text-[10px] bg-violet-100 px-1.5 py-0.5 rounded-full">VOLUME</span>
                            Produits (prix volume)
                          </span>
                          <span>{formatCurrency(breakdown.products)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Produits</span>
                        <span className="font-semibold">{formatCurrency(breakdown.products)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-700 pb-4 border-b">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-orange-600" />
                        Transport
                      </span>
                      <span className="font-semibold">{formatCurrency(transportGlobal)}</span>
                    </div>
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="flex justify-between items-center p-4 bg-white rounded-xl border-2 border-amber-200"
                    >
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text">
                        {formatCurrency(breakdown.total)}
                      </span>
                    </motion.div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckout}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold transition shadow-lg"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Valider la commande
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(2)}
                    disabled={sending}
                    className="w-full mt-3 px-6 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-900 rounded-xl font-bold transition disabled:opacity-50"
                  >
                    Modifier l'adresse
                  </motion.button>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      ✓ Commande sécurisée · ✓ Livraison rapide · ✓ Suivi en temps réel
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>{/* /relative */}

      {/* Section Produits Suggérés - Visible uniquement à l'étape 1 */}
      {step === 1 && suggestedProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 via-white to-amber-50 py-12 px-4 md:px-8 border-t"
        >
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-amber-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Complétez votre commande</h2>
                  <p className="text-sm text-gray-600">Produits populaires qui pourraient vous intéresser</p>
                </div>
              </div>
              <div className="hidden md:flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => scrollSuggestions('left')}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => scrollSuggestions('right')}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>
            </div>

            {/* Carrousel */}
            <div 
              id="suggestions-carousel"
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {suggestedProducts.map((product, idx) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex-shrink-0 w-[220px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md hover:shadow-xl transition-all group snap-start"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.isFeatured && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" /> Top
                        </span>
                      )}
                      {product.stockStatus === 'in_stock' && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Stock
                        </span>
                      )}
                    </div>
                    {/* Quick actions */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => router.push(`/produits/${product._id}`)}
                        className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1 min-h-[40px]">
                      {product.name}
                    </h3>
                    {product.category && (
                      <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                    )}
                    
                    {/* Prix */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(product.price)}
                      </span>
                      {product.weightKg && (
                        <span className="text-xs text-gray-400">{product.weightKg}kg</span>
                      )}
                    </div>

                    {/* CTA */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addSuggestedToCart(product)}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-violet-600 hover:from-green-700 hover:to-violet-700 text-white py-2 rounded-lg text-sm font-semibold transition"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Ajouter
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Indicateur de quantité */}
            {breakdown.totalQuantity < 5 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">
                    Plus que {5 - breakdown.totalQuantity} produit(s) pour atteindre le minimum !
                  </p>
                  <p className="text-sm text-amber-700">
                    Ajoutez des produits ci-dessus pour compléter votre commande
                  </p>
                </div>
                <div className="text-3xl font-bold text-amber-600">
                  {breakdown.totalQuantity}/5
                </div>
              </motion.div>
            )}

            {/* Promotion quantité */}
            {breakdown.totalQuantity >= 5 && breakdown.totalQuantity < 20 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-800">
                    🎉 Ajoutez {20 - breakdown.totalQuantity} produit(s) pour débloquer -5% supplémentaire !
                  </p>
                  <p className="text-sm text-green-700">
                    Les tarifs dégressifs s&apos;appliquent automatiquement selon la quantité totale
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Section produits vus récemment */}
      {step === 1 && recentViewed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-50 py-10 px-4 md:px-8 border-t"
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-800">Vus récemment</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recentViewed.slice(0, 6).map((product, idx) => (
                <motion.div
                  key={product.id || idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/produits/${product.id}`)}
                  className="flex-shrink-0 w-[160px] bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition"
                >
                  <div className="h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</p>
                  <p className="text-sm font-bold text-green-600 mt-1">{formatCurrency(product.price)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-100 to-gray-50 mt-12 py-8 px-4 md:px-8 border-t"
      >
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-600">
          <p>En continuant, vous acceptez nos conditions de vente et la politique de retour.</p>
        </div>
      </motion.div>
    </div>
  )
}
