'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  Loader2,
  Home,
  MapPin,
  Package,
  Truck,
  Clock,
  DollarSign,
  Edit2,
  Check,
  X,
  ChevronRight,
  Download
} from 'lucide-react'
import { OrderTrackingTimeline, OrderPriceSummary, OrderStatusBadges } from '@/components/order'

interface OrderDetails {
  orderId: string
  clientName: string
  clientPhone: string
  items: any[]
  subtotal: number
  shipping: any
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'completed' | 'failed'
  address: any
  createdAt: string
  currency: string
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: '',
    notes: ''
  })

  useEffect(() => {
    if (!orderId) return

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/order/${orderId}`)
        const data = await res.json()

        if (res.ok && data.success) {
          setOrder(data.order)
          setAddressForm(data.order.address || {
            street: '',
            city: '',
            postalCode: '',
            country: '',
            notes: ''
          })
        } else {
          setError(data.error || 'Commande non trouvée')
        }
      } catch (e) {
        console.error(e)
        setError('Erreur lors de la récupération de la commande')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const formatCurrency = (amount: number, currency = 'FCFA') =>
    `${amount.toLocaleString('fr-FR')} ${currency}`

  const handleAddressChange = (field: string, value: string) => {
    setAddressForm(prev => ({ ...prev, [field]: value }))
  }

  const saveAddress = async () => {
    // API pour sauvegarder l'adresse
    try {
      const res = await fetch(`/api/order/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressForm })
      })
      if (res.ok) {
        setOrder(prev => prev ? { ...prev, address: addressForm } : null)
        setEditingAddress(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de votre commande...</p>
        </motion.div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center shadow-lg">
            <X className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-900 mb-2">Erreur</h1>
            <p className="text-red-700 mb-6">{error || 'Commande non trouvée'}</p>
            <Link href="/" className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition">
              Retour à l'accueil
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Hero confirmation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-blue-600 py-16 px-4 text-white shadow-xl"
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -right-32 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-16 -left-32 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <CheckCircle className="h-20 w-20 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Commande Confirmée!</h1>
          <p className="text-lg text-emerald-100 mb-6">Votre commande a été créée avec succès</p>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-6 py-4 font-mono font-bold text-xl"
          >
            {order.orderId}
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Timeline des étapes - DYNAMIQUE basée sur le statut réel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <OrderTrackingTimeline 
            status={order.status} 
            paymentStatus={order.paymentStatus}
            shippingMethod={order.shipping?.method}
          />
        </motion.div>

        {/* Grille principale - Infos client et adresse */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bloc client */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Informations de commande</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nom</p>
                  <p className="text-lg font-semibold text-gray-900">{order.clientName}</p>
                </div>
                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                  {order.items.length} article{order.items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="pb-4 border-b">
                <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                <p className="text-lg font-semibold text-gray-900">{order.clientPhone}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Date de commande</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <p className="text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bloc statuts - Nouveau composant avec statuts explicites */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Statuts</h3>
            <OrderStatusBadges 
              orderStatus={order.status} 
              paymentStatus={order.paymentStatus} 
            />
          </motion.div>
        </div>

        {/* Bloc adresse modifiable */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Adresse de livraison</h2>
            </div>
            {!editingAddress && (
              <button
                onClick={() => setEditingAddress(true)}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!editingAddress ? (
              <motion.div
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-4 md:gap-6"
              >
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Rue</p>
                  <p className="text-gray-900 font-medium">{addressForm.street || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ville</p>
                  <p className="text-gray-900 font-medium">{addressForm.city || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Code postal</p>
                  <p className="text-gray-900 font-medium">{addressForm.postalCode || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Pays</p>
                  <p className="text-gray-900 font-medium">{addressForm.country || '—'}</p>
                </div>
                {addressForm.notes && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Notes</p>
                    <p className="text-gray-900 font-medium">{addressForm.notes}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.form
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
                onSubmit={e => { e.preventDefault(); saveAddress() }}
              >
                <input
                  type="text"
                  placeholder="Rue"
                  value={addressForm.street}
                  onChange={e => handleAddressChange('street', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Ville"
                    value={addressForm.city}
                    onChange={e => handleAddressChange('city', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                  <input
                    type="text"
                    placeholder="Code postal"
                    value={addressForm.postalCode}
                    onChange={e => handleAddressChange('postalCode', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Pays"
                  value={addressForm.country}
                  onChange={e => handleAddressChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
                <textarea
                  placeholder="Notes additionnelles (optional)"
                  value={addressForm.notes}
                  onChange={e => handleAddressChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium transition"
                  >
                    <Check className="w-5 h-5" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAddress(false)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-900 py-3 rounded-lg font-medium transition"
                  >
                    <X className="w-5 h-5" />
                    Annuler
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Produits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Articles</h2>
          </div>

          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + idx * 0.05 }}
                className="flex justify-between items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Quantité: {item.qty}</p>
                </div>
                <p className="font-bold text-gray-900 ml-4">{formatCurrency(item.price * item.qty, item.currency)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Récapitulatif prix rassurant - SANS recalcul */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <OrderPriceSummary total={order.total} currency={order.currency} />
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold transition shadow-lg hover:shadow-xl"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-900 py-4 rounded-xl font-bold transition"
          >
            <Download className="w-5 h-5" />
            Imprimer
          </button>
        </motion.div>

        {/* Info box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-blue-50 to-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-6 shadow-md"
        >
          <p className="text-gray-700">
            <strong className="text-emerald-700">Prochaines étapes:</strong> Vous recevrez une confirmation par SMS/téléphone. Notre équipe traitera votre commande dans les 24 heures et vous contactera pour finaliser les détails de livraison.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
