"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Truck,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  Home,
  TrendingDown
} from 'lucide-react'
import AddressPickerSenegal from '@/components/AddressPickerSenegal'
import { getTierForQuantity, applyTierDiscount, QUANTITY_TIERS } from '@/lib/pricing/tiered-pricing'

const formatCurrency = (v?: number) => (typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-')

export default function PanierPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [recentViewed, setRecentViewed] = useState<any[]>([])
  const [shippingMethod, setShippingMethod] = useState<'express' | 'air' | 'sea'>('air')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState<any>({}) // Objet structuré
  const [sending, setSending] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Panier, 2: Adresse, 3: Confirmation
  const [addressValid, setAddressValid] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = localStorage.getItem('cart:items')
      setItems(raw ? JSON.parse(raw) : [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  const SHIPPING_RATES = {
    express: { label: 'Express 3j', ratePerKg: 12000, billing: 'per_kg' },
    air: { label: 'Fret aérien 10–15j', ratePerKg: 8000, billing: 'per_kg' },
    sea: { label: 'Maritime 60j', ratePerM3: 140000, billing: 'per_m3' }
  }

  const transportGlobal = useMemo(() => {
    let totalWeight = 0
    let totalVolume = 0
    for (const it of items) {
      const qty = it.qty || 1
      const w = typeof it.unitWeightKg === 'number' ? it.unitWeightKg : (typeof it.weightKg === 'number' ? it.weightKg : 0)
      const v = typeof it.unitVolumeM3 === 'number' ? it.unitVolumeM3 : (typeof it.volumeM3 === 'number' ? it.volumeM3 : 0)
      totalWeight += w * qty
      totalVolume += v * qty
    }

    if (shippingMethod === 'sea') {
      const rate = SHIPPING_RATES.sea.ratePerM3
      return Math.round((totalVolume || 0) * rate)
    }

    const ratePerKg = shippingMethod === 'express' ? SHIPPING_RATES.express.ratePerKg : SHIPPING_RATES.air.ratePerKg
    return Math.round((totalWeight || 0) * ratePerKg)
  }, [items, shippingMethod])

  const weightSummary = useMemo(() => {
    let totalWeight = 0
    let totalVolume = 0
    for (const it of items) {
      const qty = it.qty || 1
      const w = typeof it.unitWeightKg === 'number' ? it.unitWeightKg : (typeof it.weightKg === 'number' ? it.weightKg : 0)
      const v = typeof it.unitVolumeM3 === 'number' ? it.unitVolumeM3 : (typeof it.volumeM3 === 'number' ? it.volumeM3 : 0)
      totalWeight += w * qty
      totalVolume += v * qty
    }
    return { totalWeight, totalVolume }
  }, [items])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const load = () => {
      try {
        const raw = localStorage.getItem('recent:viewed')
        setRecentViewed(raw ? JSON.parse(raw) : [])
      } catch (e) {
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
    let totalQuantity = 0

    for (const it of items) {
      const qty = it.qty || 1
      const price = typeof it.price === 'number' ? it.price : 0
      products += price * qty
      totalQuantity += qty
    }

    // Appliquer les tarifs progressifs
    const pricingTier = applyTierDiscount(products, totalQuantity)

    const total = pricingTier.finalPrice + transportGlobal
    return {
      products: products,
      discountAmount: pricingTier.discountAmount,
      discountPercent: pricingTier.discountPercent,
      finalProducts: pricingTier.finalPrice,
      totalQuantity,
      tier: pricingTier.tier,
      total
    }
  }, [items, transportGlobal])

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
    if (!name || !phone || !addressValid || !address) {
      alert('Veuillez remplir tous les champs')
      return
    }
    setSending(true)
    try {
      const shippingMap: Record<string, string> = {
        express: 'express_3j',
        air: 'air_15j',
        sea: 'maritime_60j'
      }
      
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cart: items, 
          name, 
          phone, 
          address, 
          shippingMethod: shippingMap[shippingMethod] 
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.removeItem('cart:items')
        setItems([])
        router.push(`/commandes/${data.orderId}`)
      } else {
        alert('Erreur: ' + (data.error || 'erreur inconnue'))
      }
    } catch (e) {
      console.error(e)
      alert('Erreur lors de l envoi')
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panier vide</h1>
            <p className="text-gray-600 mb-8">Explorez nos produits et ajoutez-les à votre panier pour commencer!</p>
            <motion.a
              href="/"
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </motion.a>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-8 px-4 md:px-8 shadow-xl"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Votre Panier</h1>
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
                      ? 'bg-white text-emerald-600 border-white'
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
                          <p className="text-sm text-emerald-600 font-bold mt-1">{formatCurrency(it.price)}</p>
                          {recentViewed && recentViewed.some(rv => it.id.startsWith(rv.id)) && (
                            <span className="inline-block text-xs text-emerald-600 font-semibold mt-1">⭐ Vu récemment</span>
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
                              className="w-8 h-8 rounded flex items-center justify-center hover:bg-emerald-100 transition"
                            >
                              <Plus className="w-4 h-4 text-emerald-600" />
                            </button>
                          </motion.div>
                          <p className="text-sm font-bold text-gray-900">{formatCurrency((it.price || 0) * (it.qty || 1))}</p>
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
                    {Object.entries(SHIPPING_RATES).map(([key, rate]) => (
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
                    📦 Poids: {weightSummary.totalWeight.toFixed(2)}kg · 📊 Volume: {weightSummary.totalVolume.toFixed(3)}m³ · 📊 Quantité: {breakdown.totalQuantity}
                  </p>
                </div>

                {/* Avertissement quantité minimale */}
                {breakdown.totalQuantity < 5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-red-700 font-semibold">Quantité minimale: 5 produits</p>
                      <p className="text-red-600 text-xs mt-1">Actuellement: {breakdown.totalQuantity} produits ({5 - breakdown.totalQuantity} manquant(s))</p>
                    </div>
                  </motion.div>
                )}

                {/* Tarifs progressifs */}
                {breakdown.tier && breakdown.discountAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3"
                  >
                    <TrendingDown className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-emerald-700 font-semibold">{breakdown.tier.label}</p>
                      <p className="text-emerald-600 text-xs mt-1">Réduction appliquée: -{formatCurrency(breakdown.discountAmount)}</p>
                    </div>
                  </motion.div>
                )}

                {/* Prices */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Produits (avec frais)</span>
                    <span className="font-semibold">{formatCurrency(breakdown.products)}</span>
                  </div>
                  {breakdown.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-700 font-semibold">
                      <span>Réduction progressive ({breakdown.discountPercent}%)</span>
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
                      Transport (min 1kg)
                    </span>
                    <span className="font-semibold">{formatCurrency(transportGlobal)}</span>
                  </div>
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="flex justify-between items-center pt-3 text-xl font-bold bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-4"
                  >
                    <span className="text-gray-900">Total</span>
                    <span className="text-transparent bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text">
                      {formatCurrency(breakdown.total)}
                    </span>
                  </motion.div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(2)}
                  disabled={breakdown.totalQuantity < 5}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold transition shadow-lg"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
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
                      onClick={() => setStep(3)}
                      disabled={!name || !phone || !addressValid}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition"
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
                      <MapPin className="w-5 h-5 text-emerald-600" />
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
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    Récapitulatif
                  </h3>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Produits</span>
                      <span className="font-semibold">{formatCurrency(breakdown.products)}</span>
                    </div>
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
                      <span className="text-2xl font-bold text-transparent bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text">
                        {formatCurrency(breakdown.total)}
                      </span>
                    </motion.div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckout}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold transition shadow-lg"
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
