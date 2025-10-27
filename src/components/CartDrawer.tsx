'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, Trash2, ArrowRight } from 'lucide-react'
import { trackEvent } from '@/utils/analytics'

export interface CartItem {
  id: string
  name: string
  price?: number
  currency?: string
  requiresQuote?: boolean
  qty: number
}

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = localStorage.getItem('cart:items')
      if (raw) setItems(JSON.parse(raw))
    } catch (error) {
      console.error('Error loading cart items:', error)
      setItems([])
    }
  }, [open])

  const save = (next: CartItem[]) => {
    try {
      setItems(next)
      if (typeof window !== 'undefined') localStorage.setItem('cart:items', JSON.stringify(next))
    } catch (error) {
      console.error('Error saving cart items:', error)
    }
  }

  const remove = (id: string) => {
    const next = items.filter(i => i.id !== id)
    save(next)
    trackEvent('remove_from_cart', { productId: id })
  }

  const total = useMemo(() => items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0), [items])

  const submitOrder = async () => {
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: items, name, phone, address })
      })
      if (!res.ok) throw new Error('Order failed')
      trackEvent('order_submitted', { total, count: items.length })
      alert('Commande envoyée ! Nous vous recontactons très vite.')
      save([])
      onClose()
    } catch (e) {
      alert('Une erreur est survenue. Merci de réessayer.')
    }
  }

  return (
    <div className={`fixed inset-0 z-[100] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Panel */}
      <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Votre Panier</h3>
          <button onClick={onClose} aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>

        {/* Items */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[55vh]">
          {items.length === 0 && <p className="text-sm text-gray-500">Votre panier est vide.</p>}
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">Quantité: {item.qty}</div>
                {!item.requiresQuote && (
                  <div className="text-sm text-emerald-600 font-semibold">
                    {(item.price || 0).toLocaleString()} {item.currency || 'Fcfa'}
                  </div>
                )}
              </div>
              <button className="text-red-600 hover:text-red-700" onClick={() => remove(item.id)} aria-label="Supprimer">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-lg font-bold text-gray-900">{total.toLocaleString()} Fcfa</span>
          </div>

          {/* Guest form */}
          <div className="grid grid-cols-1 gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" className="border rounded-lg px-3 py-2 text-sm" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className="border rounded-lg px-3 py-2 text-sm" />
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Adresse" className="border rounded-lg px-3 py-2 text-sm" />
          </div>

          <button onClick={submitOrder} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold">
            Commander <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}


