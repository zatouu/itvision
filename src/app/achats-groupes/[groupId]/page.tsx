'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  Package,
  Clock,
  TrendingDown,
  ArrowLeft,
  Calendar,
  Target,
  Zap,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  User,
  Plus,
  Minus,
  Truck,
  DollarSign,
  Share2,
  Copy
} from 'lucide-react'
import GroupOrderChat, { saveGroupChatAccess } from '@/components/group-orders/GroupOrderChat'

interface Participant {
  _id?: string
  name: string
  qty: number
  unitPrice: number
  totalAmount: number
  paymentStatus: string
  joinedAt: string
}

interface GroupOrder {
  groupId: string
  status: string
  product: {
    productId: string
    name: string
    image?: string
    basePrice: number
    currency: string
  }
  minQty: number
  targetQty: number
  currentQty: number
  currentUnitPrice: number
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  participants: Participant[]
  deadline: string
  shippingMethod?: string
  shippingCostPerUnit?: number
  description?: string
  createdBy: { name: string; phone: string }
  createdAt: string
}

const formatCurrency = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`
const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { 
  day: 'numeric', month: 'long', year: 'numeric' 
})
const formatDateTime = (date: string) => new Date(date).toLocaleString('fr-FR')

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Ouvert aux inscriptions', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  filled: { label: 'Objectif atteint !', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ordering: { label: 'Commande en cours', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  ordered: { label: 'Commandé au fournisseur', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  shipped: { label: 'En cours de livraison', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  delivered: { label: 'Livré', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Annulé', color: 'text-red-700', bgColor: 'bg-red-100' }
}

const shippingLabels: Record<string, string> = {
  'maritime_60j': 'Maritime (~60 jours)',
  'air_15j': 'Aérien (~15 jours)',
  'express_3j': 'Express (~3 jours)'
}

export default function GroupOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  
  const [group, setGroup] = useState<GroupOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Form state
  const [joinForm, setJoinForm] = useState({
    name: '',
    phone: '',
    email: '',
    qty: 1
  })

  useEffect(() => {
    fetchGroup()
  }, [groupId])

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/group-orders/${groupId}`)
      const data = await res.json()
      if (data.success) {
        setGroup(data.group)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinForm.name || !joinForm.phone || joinForm.qty < 1) {
      setNotification({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires' })
      return
    }
    
    setJoining(true)
    try {
      const res = await fetch(`/api/group-orders/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinForm)
      })

      if (res.status === 401) {
        const returnUrl = `${window.location.pathname}${window.location.search}`
        router.push(
          `/market/creer-compte?redirect=${encodeURIComponent(returnUrl)}&name=${encodeURIComponent(joinForm.name || '')}&phone=${encodeURIComponent(joinForm.phone || '')}&email=${encodeURIComponent(joinForm.email || '')}`
        )
        return
      }
      const data = await res.json()
      
      if (data.success) {
        setNotification({ type: 'success', message: 'Inscription réussie ! Vous serez contacté pour le paiement.' })

        // Activer le chat du groupe sur cet appareil
        const chatToken = data?.chat?.token
        const chatParticipantId = data?.chat?.participantId
        if (typeof chatToken === 'string' && chatToken) {
          saveGroupChatAccess(groupId, chatToken, typeof chatParticipantId === 'string' ? chatParticipantId : null)
        }

        setShowJoinModal(false)
        setJoinForm({ name: '', phone: '', email: '', qty: 1 })
        fetchGroup()
      } else {
        setNotification({ type: 'error', message: data.error || 'Erreur lors de l\'inscription' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erreur de connexion' })
    } finally {
      setJoining(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const calculatePriceForQty = (qty: number): number => {
    if (!group) return 0
    const totalQty = group.currentQty + qty
    const sortedTiers = [...group.priceTiers].sort((a, b) => b.minQty - a.minQty)
    for (const tier of sortedTiers) {
      if (totalQty >= tier.minQty && (!tier.maxQty || totalQty <= tier.maxQty)) {
        return tier.price
      }
    }
    return group.product.basePrice
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Achat groupé non trouvé</h1>
        <Link href="/achats-groupes" className="text-emerald-600 hover:underline">
          Retour aux achats groupés
        </Link>
      </div>
    )
  }

  const progress = Math.min(100, Math.round((group.currentQty / group.targetQty) * 100))
  const daysLeft = Math.max(0, Math.ceil((new Date(group.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const status = statusConfig[group.status] || statusConfig.open
  const savings = group.product.basePrice - group.currentUnitPrice
  const savingsPercent = Math.round((savings / group.product.basePrice) * 100)
  const isOpen = group.status === 'open' && daysLeft > 0
  const estimatedPrice = calculatePriceForQty(joinForm.qty)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/achats-groupes" className="flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-5 h-5" />
            Tous les achats groupés
          </Link>
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <p className="text-white/80 text-sm">Achat groupé</p>
              <h1 className="text-2xl font-bold">{group.groupId}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Produit */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border shadow-lg overflow-hidden"
            >
              <div className="md:flex">
                <div className="relative md:w-72 h-64 bg-gray-100">
                  {group.product.image ? (
                    <Image
                      src={group.product.image}
                      alt={group.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-20 h-20 text-gray-300" />
                    </div>
                  )}
                  {savingsPercent > 0 && (
                    <span className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                      -{savingsPercent}%
                    </span>
                  )}
                </div>
                <div className="p-6 flex-1">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${status.bgColor} ${status.color} mb-3`}>
                    {status.label}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{group.product.name}</h2>
                  
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(group.currentUnitPrice)}
                    </span>
                    {savings > 0 && (
                      <span className="text-lg text-gray-400 line-through">
                        {formatCurrency(group.product.basePrice)}
                      </span>
                    )}
                    <span className="text-gray-500">/unité</span>
                  </div>
                  
                  {group.description && (
                    <p className="text-gray-600 mb-4">{group.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {daysLeft > 0 ? `${daysLeft} jours restants` : 'Terminé'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fin: {formatDate(group.deadline)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Progression */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border shadow-lg p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                Progression de l&apos;achat groupé
              </h3>
              
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Quantité réservée</span>
                  <span className="font-bold text-gray-900">{group.currentQty} / {group.targetQty} unités</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${
                      progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-blue-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-500">Min: {group.minQty}</span>
                  <span className={`font-semibold ${progress >= 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
                    {progress}%
                  </span>
                  <span className="text-gray-500">Cible: {group.targetQty}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-gray-900">{group.participants.length} participant{group.participants.length > 1 ? 's' : ''}</span>
                </div>
                {group.currentQty >= group.minQty && (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    Minimum atteint !
                  </span>
                )}
              </div>
            </motion.div>

            {/* Paliers de prix */}
            {group.priceTiers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                  Prix dégressifs - Plus on est nombreux, moins c&apos;est cher !
                </h3>
                
                <div className="space-y-3">
                  {group.priceTiers.map((tier, i) => {
                    const isActive = group.currentQty >= tier.minQty && (!tier.maxQty || group.currentQty <= tier.maxQty)
                    const discount = tier.discount || Math.round(((group.product.basePrice - tier.price) / group.product.basePrice) * 100)
                    
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-4 rounded-xl transition ${
                          isActive 
                            ? 'bg-emerald-100 border-2 border-emerald-500' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isActive && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                          <span className={`font-semibold ${isActive ? 'text-emerald-800' : 'text-gray-700'}`}>
                            {tier.minQty}+ unités
                          </span>
                          {discount > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                              -{discount}%
                            </span>
                          )}
                        </div>
                        <span className={`text-xl font-bold ${isActive ? 'text-emerald-600' : 'text-gray-600'}`}>
                          {formatCurrency(tier.price)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Participants */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl border shadow-lg p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Participants ({group.participants.length})
              </h3>
              
              {group.participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Soyez le premier à rejoindre cet achat groupé !
                </p>
              ) : (
                <div className="space-y-3">
                  {group.participants.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(p.joinedAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{p.qty} unité{p.qty > 1 ? 's' : ''}</p>
                        <p className="text-sm text-gray-500">{formatCurrency(p.totalAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Chat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <GroupOrderChat groupId={group.groupId} />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card rejoindre */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl border shadow-lg p-6 sticky top-4"
            >
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">Prix actuel par unité</p>
                <p className="text-4xl font-bold text-emerald-600">{formatCurrency(group.currentUnitPrice)}</p>
                {savings > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Économie de {formatCurrency(savings)} par unité
                  </p>
                )}
              </div>
              
              {isOpen ? (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-6 h-6" />
                  Rejoindre cet achat
                </button>
              ) : (
                <div className="text-center py-4 bg-gray-100 rounded-xl text-gray-600">
                  {group.status === 'cancelled' ? 'Achat annulé' : 'Inscriptions fermées'}
                </div>
              )}
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier le lien'}
                </button>
                <button className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
              
              {/* Infos transport */}
              {group.shippingMethod && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                    <Truck className="w-5 h-5" />
                    Transport
                  </p>
                  <p className="text-blue-700">{shippingLabels[group.shippingMethod] || group.shippingMethod}</p>
                  {group.shippingCostPerUnit && (
                    <p className="text-sm text-blue-600 mt-1">
                      +{formatCurrency(group.shippingCostPerUnit)} / unité
                    </p>
                  )}
                </div>
              )}
              
              {/* Créateur */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500 mb-2">Créé par</p>
                <p className="font-semibold text-gray-900">{group.createdBy.name}</p>
                <p className="text-sm text-gray-600">{formatDate(group.createdAt)}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modal Rejoindre */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Rejoindre l&apos;achat groupé</h2>
                <p className="text-gray-600">{group.product.name}</p>
              </div>
              
              <form onSubmit={handleJoin} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={joinForm.name}
                    onChange={e => setJoinForm({ ...joinForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Votre nom"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={joinForm.phone}
                    onChange={e => setJoinForm({ ...joinForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="77 123 45 67"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    value={joinForm.email}
                    onChange={e => setJoinForm({ ...joinForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="email@exemple.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <Package className="w-4 h-4 inline mr-1" />
                    Quantité souhaitée *
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setJoinForm({ ...joinForm, qty: Math.max(1, joinForm.qty - 1) })}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      value={joinForm.qty}
                      onChange={e => setJoinForm({ ...joinForm, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setJoinForm({ ...joinForm, qty: joinForm.qty + 1 })}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Estimation */}
                <div className="p-4 bg-emerald-50 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix unitaire estimé</span>
                    <span className="font-semibold">{formatCurrency(estimatedPrice)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-900">Total estimé</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(estimatedPrice * joinForm.qty)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Le prix final peut varier selon le nombre total de participants
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={joining}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {joining ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirmer
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
