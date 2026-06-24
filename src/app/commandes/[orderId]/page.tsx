"use client"
import { useCallback, Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  AlertCircle,
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
  Copy,
  Sparkles,
  LogIn,
  UserPlus,
  Megaphone,
  Bell
} from 'lucide-react'

interface OrderDetails {
  orderId: string
  clientName: string
  clientEmail?: string
  clientPhone: string
  items: any[]
  subtotal: number
  subtotalBeforeDiscounts?: number
  shipping: any
  total: number
  status: string
  paymentStatus: string
  address: any
  createdAt: string
  currency: string
  // Nouveaux champs pour décomposition
  fees?: {
    supplierCost: number
    serviceFeeRate: number
    serviceFeeStandardRate: number
    serviceFeeAmount: number
    serviceFeeSavings: number
    insuranceRate: number
    insuranceAmount: number
    totalFees: number
    quantityDiscount?: {
      percent: number
      amount: number
      label: string
    }
  }
}

function OrderConfirmationContent() {
    const [groupBuyProducts, setGroupBuyProducts] = useState<any[]>([])
    const [similarProducts, setSimilarProducts] = useState<any[]>([])
    const [loadingSuggestions, setLoadingSuggestions] = useState(true)

    // Suggestions produits (group buy + similaires)
    const fetchSuggestions = useCallback(async (order: OrderDetails | null) => {
      if (!order) return
      setLoadingSuggestions(true)
      try {
        // Groupes d'achat en cours
        const groupRes = await fetch('/api/catalog/products?onlyGroupBuy=1&limit=6')
        const groupData = await groupRes.json()
        setGroupBuyProducts(groupData.items || [])

        // Produits similaires (même catégorie que le 1er article)
        const firstCat = order.items?.[0]?.category || ''
        if (firstCat) {
          const simRes = await fetch(`/api/catalog/products?category=${encodeURIComponent(firstCat)}&limit=6`)
          const simData = await simRes.json()
          setSimilarProducts((simData.items || []).filter((p:any) => !order.items.some((it:any) => it.id === p._id)))
        } else {
          setSimilarProducts([])
        }
      } catch (e) {
        setGroupBuyProducts([])
        setSimilarProducts([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, [])
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params?.orderId as string
  const token = searchParams?.get('token') || searchParams?.get('t')
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingAddress, setEditingAddress] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendPhone, setResendPhone] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: '',
    notes: ''
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [statusHistory, setStatusHistory] = useState<string[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimSubject, setClaimSubject] = useState('')
  const [claimMessage, setClaimMessage] = useState('')
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimSubmitted, setClaimSubmitted] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claiming' | 'claimed' | 'failed' | 'conflict'>('idle')

  useEffect(() => {
    if (!orderId) return

    const fetchOrder = async () => {
      try {
        const url = token
          ? `/api/order/${orderId}?token=${encodeURIComponent(token)}`
          : `/api/order/${orderId}`
        const res = await fetch(url)
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
          // Set timeline based on real status
          setCurrentStep(statusIndex(data.order.status))
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
    // Suggestions après chargement commande
    // eslint-disable-next-line
    // (le useEffect suivant gère fetchSuggestions)
  }, [orderId, token])

  // Poll order status every 30s and show toast on change
  useEffect(() => {
    if (!orderId || !order) return
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      try {
        const url = token
          ? `/api/order/${orderId}?token=${encodeURIComponent(token)}`
          : `/api/order/${orderId}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok || !data.success) return

        const newStatus = data.order.status
        if (newStatus !== order.status) {
          setOrder(prev => prev ? { ...prev, ...data.order } : data.order)
          setCurrentStep(statusIndex(newStatus))
          const label = statusLabel(newStatus)
          setToast({ message: `Statut mis à jour : ${label}`, type: newStatus === 'cancelled' ? 'warning' : 'success' })
          setTimeout(() => setToast(null), 5000)
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }

    const timer = setInterval(poll, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [orderId, token, order])

  // Détecter si l'utilisateur est connecté (cookie httpOnly)
  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/login', { method: 'GET' })
        if (!cancelled) {
          setIsAuthenticated(res.ok)
          setAuthChecked(true)
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false)
          setAuthChecked(true)
        }
      }
    }
    checkAuth()
    return () => {
      cancelled = true
    }
  }, [])

  // Si connecté + token, associer automatiquement la commande au compte (idempotent)
  useEffect(() => {
    if (!isAuthenticated || !orderId || !token) return
    if (claimStatus !== 'idle') return

    const claim = async () => {
      try {
        setClaimStatus('claiming')
        const csrfToken = await getCsrfToken()
        const res = await fetch(`/api/order/${encodeURIComponent(orderId)}/claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
          },
          body: JSON.stringify({ token })
        })

        if (res.ok) {
          setClaimStatus('claimed')
          return
        }

        if (res.status === 409) {
          setClaimStatus('conflict')
          return
        }

        setClaimStatus('failed')
      } catch {
        setClaimStatus('failed')
      }
    }

    claim()
  }, [isAuthenticated, orderId, token, claimStatus])

  useEffect(() => {
    if (order) fetchSuggestions(order)
    // eslint-disable-next-line
  }, [order])

  const formatCurrency = (amount: number, currency = 'FCFA') =>
    `${amount.toLocaleString('fr-FR')} ${currency}`

  const submitClaim = async () => {
    if (!claimSubject.trim() || !claimMessage.trim()) return
    setClaimSubmitting(true)
    try {
      const csrfToken = await getCsrfToken()
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify({
          orderId,
          subject: claimSubject,
          message: claimMessage,
          phone: order?.clientPhone,
          email: order?.clientEmail,
        })
      })
      if (res.ok) {
        setClaimSubmitted(true)
        setTimeout(() => {
          setClaimModalOpen(false)
          setClaimSubmitted(false)
          setClaimSubject('')
          setClaimMessage('')
        }, 3000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setClaimSubmitting(false)
    }
  }

  const onboardingRedirect = (() => {
    if (!orderId) return '/compte'
    if (token) {
      return `/commandes/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}&autoclaim=1`
    }
    return `/commandes/${encodeURIComponent(orderId)}`
  })()

  const getCsrfToken = async (): Promise<string | null> => {
    try {
      const csrfRes = await fetch('/api/csrf', { method: 'GET' })
      const csrfData = await csrfRes.json().catch(() => ({}))
      return csrfData?.csrfToken || csrfRes.headers.get('X-CSRF-Token')
    } catch {
      return null
    }
  }

  const copyTrackingLink = async () => {
    try {
      if (typeof window === 'undefined') return
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddressChange = (field: string, value: string) => {
    setAddressForm(prev => ({ ...prev, [field]: value }))
  }

  const saveAddress = async () => {
    // API pour sauvegarder l'adresse
    try {
      const csrfToken = await getCsrfToken()
      const url = token
        ? `/api/order/${orderId}?token=${encodeURIComponent(token)}`
        : `/api/order/${orderId}`
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
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

  const stepItems = [
    { icon: CheckCircle, label: 'Commande confirmée', color: 'emerald', status: 'pending' },
    { icon: MapPin, label: 'Adresse validée', color: 'blue', status: 'confirmed' },
    { icon: Package, label: 'Préparation', color: 'purple', status: 'processing' },
    { icon: Truck, label: 'Expédition', color: 'orange', status: 'shipped' },
    { icon: CheckCircle, label: 'Livraison', color: 'emerald', status: 'delivered' }
  ]

  const statusIndex = (status: string) => {
    if (status === 'cancelled') return -1
    const idx = stepItems.findIndex(s => s.status === status)
    return idx === -1 ? 0 : idx
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'confirmed': return 'Confirmée'
      case 'processing': return 'En traitement'
      case 'shipped': return 'Expédiée'
      case 'delivered': return 'Livrée'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

  const getStepDescription = (status: string) => {
    switch (status) {
      case 'pending': return 'Votre commande est enregistrée. Notre équipe la valide sous 24h.'
      case 'confirmed': return 'Votre commande est confirmée. Nous préparons votre envoi.'
      case 'processing': return 'Votre commande est en cours de préparation chez nos fournisseurs.'
      case 'shipped': return 'Votre commande est en route. Vous serez contacté pour la livraison.'
      case 'delivered': return 'Votre commande est livrée. Merci pour votre confiance !'
      default: return ''
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

            <div className="text-left bg-white/60 border border-red-200 rounded-xl p-4 mb-6">
              <h2 className="text-sm font-bold text-gray-900 mb-2">Renvoyer le lien de suivi</h2>
              <p className="text-xs text-gray-600 mb-3">Entrez l'email utilisé lors de la commande. Si vos informations sont correctes, vous recevrez un nouveau lien (l'ancien sera invalidé).</p>
              <div className="space-y-2">
                <input
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  type="email"
                  placeholder="Email"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={resendPhone}
                  onChange={e => setResendPhone(e.target.value)}
                  type="tel"
                  placeholder="Téléphone (optionnel, recommandé)"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  disabled={resendStatus === 'sending'}
                  onClick={async () => {
                    try {
                      setResendStatus('sending')
                      const csrfToken = await getCsrfToken()
                      await fetch(`/api/order/${orderId}/resend-link`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
                        },
                        body: JSON.stringify({ email: resendEmail, phone: resendPhone || undefined })
                      })
                      setResendStatus('sent')
                      setTimeout(() => setResendStatus('idle'), 5000)
                    } catch (e) {
                      setResendStatus('sent')
                      setTimeout(() => setResendStatus('idle'), 5000)
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
                >
                  {resendStatus === 'sending' ? 'Envoi…' : resendStatus === 'sent' ? 'Demande envoyée' : 'Renvoyer le lien'}
                </button>

                <div className="pt-1 text-xs text-gray-700">
                  Vous ne connaissez plus votre numéro de commande ?{' '}
                  <Link href="/retrouver-ma-commande" className="font-semibold underline">
                    Retrouver ma commande
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/" className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition">
              Retour à l'accueil
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 pb-8">
      {/* Hero confirmation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-blue-600 py-10 md:py-16 px-4 text-white shadow-xl"
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
          <CheckCircle className="h-14 w-14 md:h-20 md:w-20 mx-auto mb-3 md:mb-4 drop-shadow-lg" />
          <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-3">Commande Confirmée!</h1>
          <p className="text-sm md:text-lg text-emerald-100 mb-4 md:mb-6">Votre commande a été créée avec succès</p>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-6 py-4 font-mono font-bold text-xl"
          >
            {order.orderId}
          </motion.div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={copyTrackingLink}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/20 border border-white/25 rounded-xl px-5 py-3 font-semibold transition"
            >
              <Copy className="h-4 w-4" />
              {copiedLink ? 'Lien copié' : 'Copier le lien de suivi'}
            </button>
            <div className="text-sm text-emerald-100/90">
              Gardez ce lien pour retrouver votre commande.
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white ${
              toast.type === 'warning' ? 'bg-red-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="font-medium text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Onboarding compte (optionnel) */}
        {authChecked && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-lg mb-10"
          >
            <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Créer un compte (optionnel)</h2>
                <p className="text-gray-600">
                  Pour retrouver facilement vos commandes et vos achats groupés — sans perdre votre lien.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Astuce: après connexion, cette commande sera automatiquement liée à votre compte.
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Link
                  href={`/login?redirect=${encodeURIComponent(onboardingRedirect)}${order?.clientEmail ? `&email=${encodeURIComponent(order.clientEmail)}` : ''}`}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-xl font-bold transition"
                >
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </Link>
                <Link
                  href={`/market/creer-compte?redirect=${encodeURIComponent(onboardingRedirect)}&name=${encodeURIComponent(order?.clientName || '')}&phone=${encodeURIComponent(order?.clientPhone || '')}&email=${encodeURIComponent(order?.clientEmail || '')}`}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-5 py-3 rounded-xl font-bold transition"
                >
                  <UserPlus className="w-5 h-5" />
                  Créer mon compte
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {authChecked && isAuthenticated && claimStatus === 'claimed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-10"
          >
            <div className="flex items-center gap-3 text-emerald-900">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Commande associée à votre compte.</span>
            </div>
          </motion.div>
        )}

        {authChecked && isAuthenticated && claimStatus === 'conflict' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-10"
          >
            <div className="flex items-center gap-3 text-yellow-900">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Cette commande est déjà associée à un autre compte.</span>
            </div>
          </motion.div>
        )}

        {/* Timeline verticale enrichie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Suivi de votre commande</h2>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              order.status === 'cancelled'
                ? 'bg-red-100 text-red-700'
                : order.status === 'delivered'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {statusLabel(order.status)}
            </span>
          </div>

          {order.status === 'cancelled' ? (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
              <X className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <p className="font-bold text-red-900 text-lg">Commande annulée</p>
              <p className="text-red-700 text-sm mt-1">Cette commande a été annulée. Contactez-nous si vous avez des questions.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
              <div className="relative">
                {stepItems.map((step, idx) => {
                  const Icon = step.icon
                  const isCompleted = idx <= currentStep
                  const isCurrent = idx === currentStep
                  const colorClass = step.color === 'emerald' ? 'emerald' : step.color === 'blue' ? 'blue' : step.color === 'purple' ? 'purple' : 'orange'
                  const estimatedDate = new Date(order.createdAt)
                  estimatedDate.setDate(estimatedDate.getDate() + idx * 3)

                  return (
                    <div key={idx} className="relative pl-10 pb-8 last:pb-0">
                      {/* Ligne verticale */}
                      {idx < stepItems.length - 1 && (
                        <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                      )}

                      {/* Icône */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? `bg-${colorClass}-500 border-${colorClass}-600 text-white`
                            : 'bg-white border-gray-300 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}
                      >
                        <Icon className="w-5 h-5" />
                        {isCompleted && idx < currentStep && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </motion.div>

                      {/* Contenu */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className={`font-bold ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">En cours</span>
                          )}
                          {isCompleted && idx < currentStep && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Terminé</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {isCompleted
                            ? `Atteint le ${estimatedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                            : `Prévu autour du ${estimatedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                          }
                        </p>
                        {isCurrent && (
                          <p className="text-sm text-gray-600 mt-2 bg-blue-50 p-2 rounded-lg">
                            {getStepDescription(step.status)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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

          {/* Bloc statuts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Statuts</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                <p className="text-xs text-gray-600 mb-1 font-medium">Commande</p>
                <p className="text-sm font-bold text-gray-900">
                  {order.status === 'pending' ? '⏳ En attente' :
                   order.status === 'processing' ? '⚙️ Traitement' :
                   order.status === 'shipped' ? '🚚 Expédié' :
                   order.status === 'delivered' ? '✅ Livré' :
                   order.status}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                order.paymentStatus === 'completed' 
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-green-200'
                  : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
              }`}>
                <p className="text-xs text-gray-600 mb-1 font-medium">Paiement</p>
                <p className="text-sm font-bold text-gray-900">
                  {order.paymentStatus === 'completed' ? '✅ Payé' :
                   order.paymentStatus === 'pending' ? '⏳ En attente' :
                   '❌ Échec'}
                </p>
              </div>
            </div>
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

        {/* Récapitulatif financier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 shadow-lg mb-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-amber-600" />
            Récapitulatif financier
          </h2>

          <div className="space-y-4">
            {/* Décomposition détaillée si disponible */}
            {order.fees && (
              <>
                <div className="flex justify-between text-gray-700">
                  <span>Coût fournisseur</span>
                  <span className="font-medium">{formatCurrency(order.fees.supplierCost, order.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Frais de service ({order.fees.serviceFeeRate}%)</span>
                  <span className="font-medium">{formatCurrency(order.fees.serviceFeeAmount, order.currency)}</span>
                </div>
                {order.fees.serviceFeeSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 text-sm">
                    <span>Économie B2B (tarif réduit)</span>
                    <span className="font-medium">-{formatCurrency(order.fees.serviceFeeSavings, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700">
                  <span>Assurance ({order.fees.insuranceRate}%)</span>
                  <span className="font-medium">{formatCurrency(order.fees.insuranceAmount, order.currency)}</span>
                </div>
                {order.fees.quantityDiscount && order.fees.quantityDiscount.amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Réduction volume ({order.fees.quantityDiscount.percent}%)</span>
                    <span className="font-medium">-{formatCurrency(order.fees.quantityDiscount.amount, order.currency)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2" />
              </>
            )}

            {/* Fallback si pas de décomposition */}
            {!order.fees && (
              <div className="flex justify-between text-gray-700">
                <span>Produits (avec frais inclus)</span>
                <span className="font-semibold">{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-700 pb-4 border-b-2">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-600" />
                Transport ({order.shipping.method})
                {order.shipping.weightDetails?.billingMethod === 'volumetric' && (
                  <span className="text-xs text-amber-600">(poids volumétrique)</span>
                )}
              </span>
              <span className="font-semibold">{formatCurrency(order.shipping.totalCost, order.currency)}</span>
            </div>

            {/* Détails poids/volume */}
            <div className="text-sm text-gray-600 space-y-1">
              {order.shipping.weightDetails?.actualWeight > 0 && (
                <p>Poids réel: {order.shipping.weightDetails.actualWeight.toFixed(2)} kg</p>
              )}
              {order.shipping.weightDetails?.volumetricWeight > 0 && (
                <p>Poids volumétrique: {order.shipping.weightDetails.volumetricWeight.toFixed(2)} kg</p>
              )}
              {order.shipping.weightDetails?.billedWeight > 0 && (
                <p className="font-medium">Poids facturé: {order.shipping.weightDetails.billedWeight.toFixed(2)} kg</p>
              )}
              {order.shipping.totalVolume > 0 && (
                <p>Volume total: {order.shipping.totalVolume.toFixed(4)} m³</p>
              )}
            </div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="flex justify-between items-center pt-4 text-2xl font-bold bg-white rounded-xl p-4 border-2 border-amber-200"
            >
              <span className="text-gray-900">Total</span>
              <span className="text-transparent bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text">
                {formatCurrency(order.total, order.currency)}
              </span>
            </motion.div>
          </div>
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
          <button
            onClick={() => setClaimModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-red-300 hover:border-red-400 text-red-700 py-4 rounded-xl font-bold transition"
          >
            <Megaphone className="w-5 h-5" />
            Réclamer
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

        {/* Claim modal */}
        <AnimatePresence>
          {claimModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => !claimSubmitting && setClaimModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
              >
                {!claimSubmitted ? (
                  <>
                    <div className="p-6 border-b shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Réclamer cette commande</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Décrivez votre problème. Notre équipe vous répond sous 24h par SMS/téléphone.
                      </p>
                    </div>
                    <div className="p-6 space-y-3 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Sujet (ex: livraison non reçue)"
                        value={claimSubject}
                        onChange={e => setClaimSubject(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <textarea
                        placeholder="Détaillez votre réclamation..."
                        value={claimMessage}
                        onChange={e => setClaimMessage(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      />
                    </div>
                    <div className="p-4 border-t bg-white shrink-0">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setClaimModalOpen(false)}
                          disabled={claimSubmitting}
                          className="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={submitClaim}
                          disabled={claimSubmitting || !claimSubject.trim() || !claimMessage.trim()}
                          className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
                        >
                          {claimSubmitting ? 'Envoi…' : 'Envoyer'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Réclamation envoyée</h3>
                    <p className="text-gray-600 text-sm">Notre équipe traitera votre demande sous 24h.</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  )
}
