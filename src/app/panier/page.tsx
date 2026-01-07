"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

const formatCurrency = (v?: number) => (typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-')

export default function PanierPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [recentViewed, setRecentViewed] = useState<any[]>([])
  const [shippingMethod, setShippingMethod] = useState<'express' | 'air' | 'sea'>('air')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [sending, setSending] = useState(false)

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
    // total weight and volume
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

  // Charger la liste des produits récemment consultés et écouter les updates
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
    let transport = 0

    for (const it of items) {
      const qty = it.qty || 1
      const price = typeof it.price === 'number' ? it.price : 0
      // NB: price inclut déjà frais de service + assurance (pré-calculé au panier produit)
      products += price * qty

      // transport (par item shipping)
      if (it.shipping && typeof it.shipping.cost === 'number') transport += it.shipping.cost * qty
    }

    // Total = produits (avec frais) + transport global
    const total = products + transportGlobal
    return { products, transport, total }
  }, [items, transportGlobal])

  const removeItem = (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    localStorage.setItem('cart:items', JSON.stringify(next))
  }

  const updateQty = (id: string, qty: number) => {
    const next = items.map(i => i.id === id ? { ...i, qty } : i)
    setItems(next)
    localStorage.setItem('cart:items', JSON.stringify(next))
  }

  const submit = async () => {
    if (!name || !phone) {
      alert('Nom et téléphone requis')
      return
    }
    setSending(true)
    try {
      // Mapper les valeurs du panier vers le format API
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
        // Rediriger vers la page de confirmation
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Récapitulatif de la commande</h1>

      {/* Adresse en bloc en haut */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold mb-2">Adresse de livraison</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" className="w-full border rounded px-3 py-2" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className="w-full border rounded px-3 py-2" />
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Adresse complète" className="w-full border rounded px-3 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Produits - colonne centrale large */}
        <div className="lg:col-span-2">
          <div className="space-y-3">
            {items.length === 0 && <div className="p-4 bg-gray-50 rounded">Votre panier est vide.</div>}
            {items.map(it => (
              <div key={it.id} className="flex items-center gap-4 border-b py-4">
                <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {it.image ? <img src={it.image} alt={it.name} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {it.name}
                    {recentViewed && recentViewed.length > 0 && recentViewed.some(rv => it.id.startsWith(rv.id)) && (
                      <span className="ml-2 inline-block text-xs text-emerald-600 font-semibold">Vu récemment</span>
                    )}
                  </div>
                  {it.variantId && <div className="text-xs text-gray-500">Variante: {it.variantId}</div>}
                  <div className="text-sm text-emerald-600 font-semibold mt-1">{formatCurrency(it.price)}</div>
                  {it.shipping && <div className="text-xs text-gray-500">Transport: {formatCurrency(it.shipping.cost)} ({it.shipping.label})</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(it.id, Math.max(0, (it.qty||1) - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center">−</button>
                    <div className="w-10 text-center">{it.qty}</div>
                    <button onClick={() => updateQty(it.id, (it.qty||1) + 1)} className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">+</button>
                  </div>
                  <div className="text-sm">{formatCurrency((it.price||0) * (it.qty||1))}</div>
                  <button className="text-red-600 text-xs" onClick={() => removeItem(it.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Récap à droite */}
        <aside>
          <div className="rounded-lg border p-4 space-y-3 bg-white sticky top-6">
            <div className="text-sm font-medium mb-2">Mode de transport (calcul global)</div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="ship" checked={shippingMethod === 'express'} onChange={() => setShippingMethod('express')} />
                <span className="ml-1">Express 3j — 12 000 FCFA/kg</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="ship" checked={shippingMethod === 'air'} onChange={() => setShippingMethod('air')} />
                <span className="ml-1">Fret aérien 10–15j — 8 000 FCFA/kg</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="ship" checked={shippingMethod === 'sea'} onChange={() => setShippingMethod('sea')} />
                <span className="ml-1">Maritime 60j — 140 000 FCFA/m³</span>
              </label>
              <div className="text-xs text-gray-500">Poids total: {weightSummary.totalWeight.toFixed(2)} kg · Volume total: {weightSummary.totalVolume.toFixed(3)} m³</div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sous-total (produits avec frais inclus)</span>
              <span>{formatCurrency(breakdown.products)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Transport global ({SHIPPING_RATES[shippingMethod].label})</span>
              <span>{formatCurrency(transportGlobal)}</span>
            </div>
            <div className="border-t pt-3 flex flex-col gap-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total final</span>
                <span>{formatCurrency(breakdown.total)}</span>
              </div>
              <div className="text-sm text-gray-500">Le transport est calculé globalement selon le poids/volume total.</div>
            </div>

            <button onClick={submit} disabled={sending || items.length === 0} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded font-semibold">
              Commander <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>

      {/* Pied de page récap (notes, conditions) */}
      <div className="mt-6 text-xs text-gray-500 bg-gray-50 rounded p-3">
        <div>En validant, vous acceptez nos conditions de vente et la politique de retour. Les délais de livraison indiqués sont des estimations.</div>
      </div>
    </div>
  )
}
