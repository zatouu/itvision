"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'

const formatCurrency = (v?: number) => (typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-')

export default function PanierPage() {
  const [items, setItems] = useState<any[]>([])
  const [recentViewed, setRecentViewed] = useState<any[]>([])
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
    let service = 0
    let insurance = 0
    let transport = 0

    for (const it of items) {
      const qty = it.qty || 1
      const price = typeof it.price === 'number' ? it.price : 0
      products += price * qty

      // service fee: prefer explicit amount, else rate, else range.min if present
      let svc = 0
      if (typeof it.serviceFeeAmount === 'number') svc = it.serviceFeeAmount * qty
      else if (typeof it.serviceFeeRate === 'number') svc = Math.round(price * (it.serviceFeeRate / 100)) * qty
      else if (it.serviceFeeRange && typeof it.serviceFeeRange.min === 'number') svc = Math.round(price * (it.serviceFeeRange.min / 100)) * qty
      service += svc

      // insurance
      let ins = 0
      if (typeof it.insuranceAmount === 'number') ins = it.insuranceAmount * qty
      else if (typeof it.insurancePercent === 'number') ins = Math.round(price * (it.insurancePercent / 100)) * qty
      insurance += ins

      // transport
      if (it.shipping && typeof it.shipping.cost === 'number') transport += it.shipping.cost * qty
    }

    const subtotal = products
    const total = subtotal + service + insurance + transport
    return { products, service, insurance, transport, subtotal, total }
  }, [items])

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
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: items, name, phone, address })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        alert(`Commande enregistrée (${data.orderId})`)
        localStorage.removeItem('cart:items')
        setItems([])
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
            <div className="flex justify-between text-sm text-gray-600">
              <span>Produits</span>
              <span>{formatCurrency(breakdown.products)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Frais de service</span>
              <span>{formatCurrency(breakdown.service)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Assurance</span>
              <span>{formatCurrency(breakdown.insurance)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Transport</span>
              <span>{formatCurrency(breakdown.transport)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(breakdown.total)}</span>
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
