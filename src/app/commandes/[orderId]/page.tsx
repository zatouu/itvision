'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  Download,
  User,
  Phone,
  Mail,
  Calendar,
  Wrench,
  Shield,
  CreditCard,
  FileText,
  Copy,
  MessageCircle,
  AlertCircle,
  Plane,
  Ship
} from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  image?: string
  qty: number
  price: number
  currency: string
  variant?: string
  wantsInstallation?: boolean
  shipping?: {
    id: string
    label: string
    cost: number
  }
}

interface OrderDetails {
  orderId: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  items: OrderItem[]
  subtotal: number
  shipping: {
    method?: string
    cost: number
    estimatedDays?: number
  }
  serviceFees?: number
  insurance?: number
  installation?: {
    requested: boolean
  }
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'partial' | 'completed' | 'failed'
  address: {
    street?: string
    city?: string
    region?: string
    postalCode?: string
    country?: string
    notes?: string
  }
  createdAt: string
  currency: string
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!orderId) return

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/order/${orderId}`)
        const data = await res.json()

        if (res.ok && data.success) {
          setOrder(data.order)
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.orderId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100' },
      confirmed: { label: 'Confirmée', color: 'text-blue-700', bg: 'bg-blue-100' },
      processing: { label: 'En préparation', color: 'text-purple-700', bg: 'bg-purple-100' },
      shipped: { label: 'Expédiée', color: 'text-indigo-700', bg: 'bg-indigo-100' },
      delivered: { label: 'Livrée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
      cancelled: { label: 'Annulée', color: 'text-red-700', bg: 'bg-red-100' }
    }
    return configs[status] || configs.pending
  }

  const getPaymentConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
      pending: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
      partial: { label: 'Acompte versé', color: 'text-blue-700', bg: 'bg-blue-100', icon: CreditCard },
      completed: { label: 'Payé', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
      failed: { label: 'Échoué', color: 'text-red-700', bg: 'bg-red-100', icon: X }
    }
    return configs[status] || configs.pending
  }

  const getShippingIcon = (method?: string) => {
    if (method?.includes('express') || method?.includes('air')) return Plane
    if (method?.includes('sea') || method?.includes('maritime')) return Ship
    return Truck
  }

  // Vérifie si au moins un article demande l'installation
  const hasInstallationRequested = order?.installation?.requested || 
    order?.items?.some(item => item.wantsInstallation)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center"
        >
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chargement de votre commande...</p>
        </motion.div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Commande non trouvée</h1>
          <p className="text-gray-500 mb-6">{error || 'Cette commande n\'existe pas ou a été supprimée.'}</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-medium transition">
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </motion.div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(order.status)
  const paymentConfig = getPaymentConfig(order.paymentStatus)
  const ShippingIcon = getShippingIcon(order.shipping?.method)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header de confirmation */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-8 h-8" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Commande confirmée !</h1>
            <p className="text-emerald-100 mb-4">Merci pour votre confiance</p>
            
            {/* Numéro de commande copiable */}
            <button
              onClick={copyOrderId}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur px-4 py-2 rounded-lg transition group"
            >
              <span className="font-mono text-lg">{order.orderId}</span>
              {copied ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Copy className="w-4 h-4 opacity-60 group-hover:opacity-100" />
              )}
            </button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Bloc 1: Statuts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-bold text-gray-900">Statut de la commande</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Commande</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  {statusConfig.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Paiement</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${paymentConfig.bg} ${paymentConfig.color}`}>
                  <paymentConfig.icon className="w-3.5 h-3.5" />
                  {paymentConfig.label}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bloc 2: Informations client */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="font-bold text-gray-900">Vos informations</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nom</p>
                <p className="font-medium text-gray-900">{order.clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Téléphone</p>
                <p className="font-medium text-gray-900">{order.clientPhone}</p>
              </div>
            </div>
            {order.clientEmail && (
              <div className="flex items-center gap-3 md:col-span-2">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{order.clientEmail}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 md:col-span-2">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Date de commande</p>
                <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bloc 3: Adresse de livraison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="font-bold text-gray-900">Adresse de livraison</h2>
          </div>
          <div className="p-5">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-medium text-gray-900">{order.address?.street || 'Non renseignée'}</p>
              {order.address?.city && (
                <p className="text-gray-600">{order.address.city}{order.address?.region ? `, ${order.address.region}` : ''}</p>
              )}
              {order.address?.postalCode && (
                <p className="text-gray-500 text-sm">{order.address.postalCode}</p>
              )}
              <p className="text-gray-500 text-sm">{order.address?.country || 'Sénégal'}</p>
              {order.address?.notes && (
                <p className="text-gray-500 text-sm mt-2 italic">📝 {order.address.notes}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Bloc 4: Articles commandés */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="font-bold text-gray-900">Articles commandés</h2>
            </div>
            <span className="text-sm text-gray-500">{order.items.length} article{order.items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center gap-4">
                {/* Image produit */}
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                {/* Détails */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  {item.variant && (
                    <p className="text-xs text-gray-500">{item.variant}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">Qté: {item.qty}</p>
                    {item.wantsInstallation && (
                      <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        <Wrench className="w-3 h-3" />
                        Installation
                      </span>
                    )}
                  </div>
                </div>
                {/* Prix */}
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(item.price * item.qty, item.currency)}</p>
                  {item.qty > 1 && (
                    <p className="text-xs text-gray-400">{formatCurrency(item.price, item.currency)}/u</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bloc 5: Livraison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShippingIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-bold text-gray-900">Livraison</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 capitalize">{order.shipping?.method || 'Standard'}</p>
                {order.shipping?.estimatedDays && (
                  <p className="text-sm text-gray-500">Délai estimé: ~{order.shipping.estimatedDays} jours</p>
                )}
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(order.shipping?.cost || 0, order.currency)}</p>
            </div>
          </div>
        </motion.div>

        {/* Bloc 6: Installation (si demandée) */}
        {hasInstallationRequested && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl shadow-sm border border-orange-200 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-orange-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Installation demandée</h2>
                <p className="text-xs text-orange-600">Un technicien vous contactera</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-orange-500" />
                <p className="text-gray-700">
                  {order.items.filter(i => i.wantsInstallation).length > 0 
                    ? `${order.items.filter(i => i.wantsInstallation).length} article(s) avec installation`
                    : 'Installation professionnelle incluse'}
                </p>
              </div>
              <div className="p-3 bg-orange-100/50 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-800">
                  Notre équipe technique vous contactera sous 24-48h pour planifier l'intervention et convenir d'un rendez-vous.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bloc 7: Récapitulatif financier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="font-bold text-gray-900">Récapitulatif</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total articles</span>
              <span>{formatCurrency(order.subtotal, order.currency)}</span>
            </div>
            {order.serviceFees && order.serviceFees > 0 && (
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Frais de service
                </span>
                <span>{formatCurrency(order.serviceFees, order.currency)}</span>
              </div>
            )}
            {order.insurance && order.insurance > 0 && (
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Assurance
                </span>
                <span>{formatCurrency(order.insurance, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Livraison</span>
              <span>{formatCurrency(order.shipping?.cost || 0, order.currency)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(order.total, order.currency)}</span>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl font-medium transition"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 py-3.5 rounded-xl font-medium transition"
          >
            <Download className="w-4 h-4" />
            Imprimer
          </button>
        </motion.div>

        {/* Info prochaines étapes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-5 border border-blue-100"
        >
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            Prochaines étapes
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Vous recevrez une confirmation par SMS/téléphone</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Notre équipe traitera votre commande sous 24h</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Nous vous contacterons pour finaliser les détails de livraison</span>
            </li>
            {hasInstallationRequested && (
              <li className="flex items-start gap-2">
                <Wrench className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>Un technicien sera assigné pour l'installation de vos équipements</span>
              </li>
            )}
          </ul>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-center py-4"
        >
          <p className="text-sm text-gray-500">
            Une question ? Contactez-nous au{' '}
            <a href="tel:+221338889090" className="text-emerald-600 font-medium hover:underline">
              +221 33 888 90 90
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
