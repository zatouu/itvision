'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  qty: number
  price: number
}

interface OrderDetails {
  orderId: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  items: OrderItem[]
  total: number
  status: string
  paymentStatus: string
}

export default function ReturnRequestPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params?.orderId as string
  const token = searchParams?.get('token') || searchParams?.get('t')

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!orderId) return
    const fetchOrder = async () => {
      try {
        const url = `/api/order/${orderId}${token ? `?token=${encodeURIComponent(token)}` : ''}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Commande introuvable')
        setOrder(data.order)
        const initial: Record<string, number> = {}
        data.order.items.forEach((item: OrderItem) => { initial[item.id] = item.qty })
        setSelectedItems(initial)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId, token])

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = { ...prev }
      if (next[id] === 0) {
        const item = order?.items.find(i => i.id === id)
        next[id] = item?.qty || 1
      } else {
        next[id] = 0
      }
      return next
    })
  }

  const updateQty = (id: string, qty: number) => {
    const item = order?.items.find(i => i.id === id)
    if (!item) return
    setSelectedItems(prev => ({ ...prev, [id]: Math.max(0, Math.min(qty, item.qty)) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    const items = order.items
      .filter(item => (selectedItems[item.id] || 0) > 0)
      .map(item => ({ productId: item.id, name: item.name, qty: selectedItems[item.id] }))

    if (items.length === 0) {
      setError('Veuillez sélectionner au moins un article à retourner')
      return
    }
    if (!reason.trim()) {
      setError('Veuillez indiquer la raison du retour')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/returns${token ? `?token=${encodeURIComponent(token)}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          orderReference: order.orderId,
          items,
          reason,
          details,
          photos: []
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création de la demande')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl p-8 shadow max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Erreur</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl p-8 shadow max-w-md">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Demande envoyée</h1>
          <p className="text-gray-600 mb-6">Votre demande de retour a été enregistrée. Notre équipe vous contactera sous 24h.</p>
          <Link href={`/commandes/${orderId}${token ? `?token=${token}` : ''}`} className="text-emerald-600 font-medium">
            Retour à la commande
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href={`/commandes/${orderId}${token ? `?token=${token}` : ''}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-emerald-600 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la commande
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Demande de retour</h1>
              <p className="text-sm text-gray-500">Commande {order?.orderId}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Articles à retourner</h2>
              <div className="space-y-2">
                {order?.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={(selectedItems[item.id] || 0) > 0}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 text-emerald-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">Commandé: {item.qty}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={item.qty}
                      value={selectedItems[item.id] || 0}
                      onChange={e => updateQty(item.id, Number(e.target.value))}
                      disabled={(selectedItems[item.id] || 0) === 0}
                      className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1 disabled:bg-gray-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Raison du retour</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Choisir une raison</option>
                <option value="defective">Produit défectueux</option>
                <option value="wrong">Produit non conforme / erreur de commande</option>
                <option value="damaged">Produit endommagé à la livraison</option>
                <option value="changed">Je me suis trompé / changé d&apos;avis</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Détails complémentaires</label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Décrivez le problème..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-400 transition"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer la demande de retour'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
