"use client"
import { useCallback } from 'react'
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
  UserPlus
} from 'lucide-react'

interface OrderDetails {
  orderId: string
  clientName: string
  clientEmail?: string
  clientPhone: string
  items: any[]
  subtotal: number
  shipping: any
  total: number
  status: string
  paymentStatus: string
  address: any
  createdAt: string
  currency: string
}

export default function OrderConfirmationPage() {
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
          // Animation des étapes
          setCurrentStep(0)
          const interval = setInterval(() => {
            setCurrentStep(p => (p < 4 ? p + 1 : p))
          }, 600)
          return () => clearInterval(interval)
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
    { icon: CheckCircle, label: 'Commande confirmée', color: 'emerald' },
    { icon: MapPin, label: 'Adresse validée', color: 'blue' },
    { icon: Package, label: 'Préparation', color: 'purple' },
    { icon: Truck, label: 'Expédition', color: 'orange' },
    { icon: CheckCircle, label: 'Livraison', color: 'emerald' }
  ]

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
          {/* Groupes d'achat en cours */}
          <div className="max-w-5xl mx-auto p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold text-emerald-700 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-emerald-500" /> Groupes d'achat en cours
              </h2>
              {loadingSuggestions ? (
                <div className="text-gray-500 py-8 text-center">Chargement…</div>
              ) : groupBuyProducts.length === 0 ? (
                <div className="text-gray-400 py-8 text-center">Aucun groupe d'achat en cours actuellement.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {groupBuyProducts.map((p:any) => (
                    <div key={p._id} className="bg-white rounded-xl border border-emerald-100 shadow p-4 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{p.name}</div>
                        <div className="text-sm text-gray-600 mb-2">{p.category}</div>
                        <div className="text-xs text-emerald-700 mb-2">À partir de {p.groupBuyBestPrice?.toLocaleString('fr-FR')} FCFA</div>
                        <div className="text-xs text-gray-500 mb-2">{p.groupBuyDiscount ? `Jusqu'à -${p.groupBuyDiscount}%` : ''}</div>
                      </div>
                      <button onClick={() => window.location.href = `/produits/${p._id}?groupbuy=1`} className="mt-2 w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white py-2 rounded-lg font-semibold transition">Rejoindre le groupe</button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Produits similaires */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-500" /> Produits similaires
              </h2>
              {loadingSuggestions ? (
                <div className="text-gray-500 py-8 text-center">Chargement…</div>
              ) : similarProducts.length === 0 ? (
                <div className="text-gray-400 py-8 text-center">Aucun produit similaire trouvé.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {similarProducts.map((p:any) => (
                    <div key={p._id} className="bg-white rounded-xl border border-blue-100 shadow p-4 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{p.name}</div>
                        <div className="text-sm text-gray-600 mb-2">{p.category}</div>
                        <div className="text-xs text-emerald-700 mb-2">{p.price?.toLocaleString('fr-FR')} FCFA</div>
                      </div>
                      <button onClick={() => window.location.href = `/produits/${p._id}` } className="mt-2 w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white py-2 rounded-lg font-semibold transition">Voir le produit</button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
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
                  href={`/register?redirect=${encodeURIComponent(onboardingRedirect)}&name=${encodeURIComponent(order?.clientName || '')}&phone=${encodeURIComponent(order?.clientPhone || '')}&email=${encodeURIComponent(order?.clientEmail || '')}`}
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

        {/* Timeline des étapes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Suivi de votre commande</h2>
          <div className="flex justify-between items-center relative mb-8">
            {/* Ligne de connexion */}
            <div className="absolute top-10 left-0 right-0 h-1 bg-gray-200 -z-10">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${(Math.min(currentStep, 4) / 4) * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
              />
            </div>

            {/* Étapes */}
            {stepItems.map((step, idx) => {
              const Icon = step.icon
              const isCompleted = idx <= currentStep
              const colorClass = step.color === 'emerald' ? 'emerald' : step.color === 'blue' ? 'blue' : step.color === 'purple' ? 'purple' : 'orange'

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col items-center flex-1"
                >
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center font-bold mb-3 border-4 transition-all shadow-lg relative ${
                      isCompleted
                        ? `bg-${colorClass}-500 border-${colorClass}-600 text-white`
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    <Icon className="w-10 h-10" />
                    {isCompleted && idx < currentStep && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                  <p className="text-xs md:text-sm font-medium text-center text-gray-700 px-1">{step.label}</p>
                </motion.div>
              )
            })}
          </div>
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
            <div className="flex justify-between text-gray-700">
              <span>Produits (avec frais inclus)</span>
              <span className="font-semibold">{formatCurrency(order.subtotal, order.currency)}</span>
            </div>

            <div className="flex justify-between text-gray-700 pb-4 border-b-2">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-600" />
                Transport ({order.shipping.method})
              </span>
              <span className="font-semibold">{formatCurrency(order.shipping.totalCost, order.currency)}</span>
            </div>

            {order.shipping.totalWeight > 0 && (
              <p className="text-sm text-gray-600">Poids total: {order.shipping.totalWeight.toFixed(2)} kg</p>
            )}
            {order.shipping.totalVolume > 0 && (
              <p className="text-sm text-gray-600">Volume total: {order.shipping.totalVolume.toFixed(4)} m³</p>
            )}

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
