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
  Copy,
  MessageCircle,
  Briefcase,
  TrendingUp,
  Gift,
  Megaphone,
  Timer,
  Calculator,
  Flame,
  Eye,
  BarChart3
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
  open: { label: 'Ouvert aux inscriptions', color: 'text-green-700', bgColor: 'bg-green-100' },
  filled: { label: 'Objectif atteint !', color: 'text-violet-700', bgColor: 'bg-violet-100' },
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
  const [leaving, setLeaving] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [resalePrice, setResalePrice] = useState(0)
  
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

  // Countdown timer en temps réel
  useEffect(() => {
    if (!group) return
    const updateCountdown = () => {
      const diff = new Date(group.deadline).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      })
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [group])

  // Initialiser le prix de revente suggéré
  useEffect(() => {
    if (group && resalePrice === 0) {
      setResalePrice(Math.round(group.currentUnitPrice * 1.35))
    }
  }, [group, resalePrice])

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

  const handleLeave = async () => {
    if (!confirm('Êtes-vous sûr de vouloir vous retirer de cet achat groupé ?')) return
    setLeaving(true)
    try {
      const res = await fetch(`/api/group-orders/${groupId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.success) {
        setNotification({ type: 'success', message: 'Vous avez quitté l\'achat groupé' })
        fetchGroup()
      } else {
        setNotification({ type: 'error', message: data.error || 'Erreur lors du retrait' })
      }
    } catch {
      setNotification({ type: 'error', message: 'Erreur de connexion' })
    } finally {
      setLeaving(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnWhatsApp = () => {
    if (!group) return
    const savPct = group.product.basePrice > 0 ? Math.round(((group.product.basePrice - group.currentUnitPrice) / group.product.basePrice) * 100) : 0
    const remaining = group.targetQty - group.currentQty
    const text = encodeURIComponent(
      `🔥🔥 *OFFRE IMPORT CHINE — ${group.product.name}* 🔥🔥\n\n` +
      `💰 *${formatCurrency(group.currentUnitPrice)}* au lieu de ~${formatCurrency(group.product.basePrice)}` +
      `${savPct > 0 ? ` *(−${savPct}%)*` : ''}\n\n` +
      `📦 ${group.currentQty}/${group.targetQty} réservés — *${remaining > 0 ? `${remaining} places restantes` : 'Presque complet !'}*\n` +
      `👥 ${group.participants.length} personne${group.participants.length > 1 ? 's' : ''} déjà inscrite${group.participants.length > 1 ? 's' : ''}\n` +
      `⏰ *${daysLeft > 0 ? `Plus que ${daysLeft}j` : 'Dernières heures'}* pour en profiter !\n\n` +
      `💡 Plus on est nombreux, plus le prix baisse.\n` +
      `💼 Idéal pour les revendeurs et entrepreneurs !\n\n` +
      `👉 Rejoins le groupe ici :\n${window.location.href}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareAsStatus = () => {
    if (!group) return
    const savPct = group.product.basePrice > 0 ? Math.round(((group.product.basePrice - group.currentUnitPrice) / group.product.basePrice) * 100) : 0
    const text = encodeURIComponent(
      `� *ACHAT GROUPÉ EN COURS !*\n\n` +
      `📦 *${group.product.name}*\n` +
      `💰 À seulement *${formatCurrency(group.currentUnitPrice)}*${savPct > 0 ? ` (−${savPct}% vs marché)` : ''}\n\n` +
      `👥 Déjà ${group.participants.length} participant${group.participants.length > 1 ? 's' : ''} !\n` +
      `⏰ ${daysLeft > 0 ? `${daysLeft} jours restants` : '⚠️ Dernières heures !'}\n\n` +
      `🔥 *Tu veux acheter ou revendre ?*\n` +
      `Import direct de Chine, prix imbattable.\n` +
      `Clique ici pour rejoindre 👇\n\n` +
      `${window.location.href}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareForEntrepreneurs = () => {
    if (!group) return
    const margin35 = Math.round(group.currentUnitPrice * 0.35)
    const text = encodeURIComponent(
      `💼 *OPPORTUNITÉ BUSINESS — Import Chine* 💼\n\n` +
      `📦 *${group.product.name}*\n` +
      `💰 Prix import groupé : *${formatCurrency(group.currentUnitPrice)}*\n` +
      `� Marge estimée : *+${formatCurrency(margin35)}/unité* (revente ~${formatCurrency(group.currentUnitPrice + margin35)})\n\n` +
      `✅ 10 unités = *${formatCurrency(margin35 * 10)} de bénéfice*\n` +
      `✅ 20 unités = *${formatCurrency(margin35 * 20)} de bénéfice*\n\n` +
      `⏰ ${daysLeft > 0 ? `Plus que ${daysLeft}j` : 'Dernières heures'} pour commander !\n\n` +
      `👉 Détails et inscription :\n${window.location.href}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareOnTikTok = () => {
    if (!group) return
    const savPct = group.product.basePrice > 0 ? Math.round(((group.product.basePrice - group.currentUnitPrice) / group.product.basePrice) * 100) : 0
    const caption =
      `🔥 ACHAT GROUPÉ — ${group.product.name}\n` +
      `💰 ${formatCurrency(group.currentUnitPrice)}${savPct > 0 ? ` (-${savPct}%)` : ''}\n` +
      `👥 ${group.participants.length} participant${group.participants.length > 1 ? 's' : ''}\n` +
      `📦 Import direct Chine — Idéal revendeurs !\n` +
      `🔗 ${window.location.href}\n` +
      `#AchatGroupé #ImportChine #BonPlan #ITVision #Business`
    navigator.clipboard.writeText(caption)
    setNotification({ type: 'success', message: 'Texte copié ! Collez-le dans votre vidéo TikTok' })
    setTimeout(() => setNotification(null), 3000)
    window.open('https://www.tiktok.com/upload', '_blank')
  }

  const shareOnInstagram = () => {
    if (!group) return
    const savPct = group.product.basePrice > 0 ? Math.round(((group.product.basePrice - group.currentUnitPrice) / group.product.basePrice) * 100) : 0
    const caption =
      `🔥 ACHAT GROUPÉ DISPO !\n\n` +
      `📦 ${group.product.name}\n` +
      `💰 ${formatCurrency(group.currentUnitPrice)}${savPct > 0 ? ` (-${savPct}% vs marché)` : ''}\n\n` +
      `👥 Rejoins le groupe pour payer moins cher\n` +
      `💼 Parfait pour les revendeurs & entrepreneurs\n\n` +
      `🔗 Lien en bio ou DM pour le lien direct\n` +
      `${window.location.href}\n\n` +
      `#AchatGroupé #ImportChine #BonPlan #ITVision #Business #Sénégal`
    navigator.clipboard.writeText(caption)
    setNotification({ type: 'success', message: 'Texte copié ! Collez-le dans votre story/post Instagram' })
    setTimeout(() => setNotification(null), 3000)
    window.open('https://www.instagram.com/', '_blank')
  }

  const calculateSavingsForNewParticipant = (qty: number): number => {
    if (!group) return 0
    const currentTotal = group.currentQty
    const newTotal = currentTotal + qty
    
    // Trouver le nouveau palier
    const sortedTiers = [...group.priceTiers].sort((a, b) => a.minQty - b.minQty)
    let newTier = sortedTiers[0]
    for (const tier of sortedTiers) {
      if (newTotal >= tier.minQty) {
        newTier = tier
      }
    }
    
    const currentSavings = (group.product.basePrice - group.currentUnitPrice) * qty
    const potentialNewSavings = newTier ? (group.product.basePrice - newTier.price) * qty : 0
    
    return potentialNewSavings > currentSavings ? potentialNewSavings - currentSavings : 0
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
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Achat groupé non trouvé</h1>
        <Link href="/achats-groupes" className="text-green-600 hover:underline">
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-violet-50">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-violet-600 text-white py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/achats-groupes" className="flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-5 h-5" />
            Tous les achats groupés
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <p className="text-white/80 text-sm">Achat groupé</p>
                <h1 className="text-2xl font-bold">{group.groupId}</h1>
              </div>
            </div>
            
            {/* Countdown timer */}
            {isOpen && (
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-white/80" />
                <div className="flex gap-1.5">
                  {[
                    { value: countdown.days, label: 'j' },
                    { value: countdown.hours, label: 'h' },
                    { value: countdown.minutes, label: 'm' },
                    { value: countdown.seconds, label: 's' }
                  ].map((unit, i) => (
                    <div key={i} className="bg-white/20 backdrop-blur rounded-lg px-2.5 py-1.5 text-center min-w-[44px]">
                      <span className="text-lg font-bold tabular-nums">{String(unit.value).padStart(2, '0')}</span>
                      <span className="text-[10px] text-white/70 ml-0.5">{unit.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Badges urgence + preuve sociale */}
          <div className="mt-4 flex flex-wrap gap-2">
            {progress >= 80 && progress < 100 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/90 rounded-full text-xs font-bold">
                <Flame className="w-3.5 h-3.5" />
                Presque complet !
              </span>
            )}
            {progress >= 100 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-400/90 rounded-full text-xs font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                Objectif atteint !
              </span>
            )}
            {daysLeft <= 3 && daysLeft > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/90 rounded-full text-xs font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                Plus que {daysLeft}j !
              </span>
            )}
            {group.participants.length >= 3 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                <Eye className="w-3.5 h-3.5" />
                {group.participants.length} personnes ont rejoint
              </span>
            )}
            {savingsPercent >= 10 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400/90 text-yellow-900 rounded-full text-xs font-bold">
                <TrendingDown className="w-3.5 h-3.5" />
                -{savingsPercent}% vs marché
              </span>
            )}
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
                    <span className="text-3xl font-bold text-green-600">
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
                <Target className="w-5 h-5 text-green-600" />
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
                      progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-green-400 to-violet-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-500">Min: {group.minQty}</span>
                  <span className={`font-semibold ${progress >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
                    {progress}%
                  </span>
                  <span className="text-gray-500">Cible: {group.targetQty}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-900">{group.participants.length} participant{group.participants.length > 1 ? 's' : ''}</span>
                </div>
                {group.currentQty >= group.minQty && (
                  <span className="flex items-center gap-1 text-green-600 font-semibold">
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
                  <TrendingDown className="w-5 h-5 text-green-600" />
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
                            ? 'bg-green-100 border-2 border-green-500' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isActive && <CheckCircle className="w-5 h-5 text-green-600" />}
                          <span className={`font-semibold ${isActive ? 'text-green-800' : 'text-gray-700'}`}>
                            {tier.minQty}+ unités
                          </span>
                          {discount > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                              -{discount}%
                            </span>
                          )}
                        </div>
                        <span className={`text-xl font-bold ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
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
                <Users className="w-5 h-5 text-green-600" />
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
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold">
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
                <p className="text-4xl font-bold text-green-600">{formatCurrency(group.currentUnitPrice)}</p>
                {savings > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Économie de {formatCurrency(savings)} par unité
                  </p>
                )}
              </div>
              
              {isOpen ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-violet-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-violet-600 transition flex items-center justify-center gap-2"
                  >
                    <Zap className="w-6 h-6" />
                    Rejoindre cet achat
                  </button>
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="w-full py-3 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                    Se retirer du groupe
                  </button>
                </div>
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
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button
                  onClick={shareOnWhatsApp}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Partager
                </button>
              </div>
              
              {/* Partage amélioré — multi-plateforme */}
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-violet-50 rounded-xl border border-green-200">
                <p className="text-sm font-bold text-green-800 flex items-center gap-2 mb-3">
                  <Megaphone className="w-4 h-4" />
                  Partage = prix qui baissent !
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={shareAsStatus}
                    className="py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Statut WhatsApp
                  </button>
                  <button
                    onClick={shareForEntrepreneurs}
                    className="py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Entrepreneurs
                  </button>
                  <button
                    onClick={shareOnTikTok}
                    className="py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.17 8.17 0 005.58 2.19V12a4.83 4.83 0 01-3.77-1.54V6.69h3.77z"/></svg>
                    TikTok
                  </button>
                  <button
                    onClick={shareOnInstagram}
                    className="py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Instagram
                  </button>
                </div>
                <p className="text-[11px] text-green-700/80 mt-2 text-center">
                  Chaque nouveau participant fait baisser le prix pour tout le monde
                </p>
              </div>

              {/* Calculateur de marge entrepreneur */}
              <div className="mt-4 p-4 bg-white rounded-xl border-2 border-violet-200">
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-violet-600" />
                  Calculateur de marge revendeur
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Prix d&apos;achat (import groupé)</label>
                    <div className="px-3 py-2 bg-green-50 rounded-lg text-green-700 font-bold text-sm">
                      {formatCurrency(group.currentUnitPrice)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Votre prix de revente</label>
                    <input
                      type="number"
                      value={resalePrice}
                      onChange={(e) => setResalePrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  {(() => {
                    const marginPerUnit = resalePrice - group.currentUnitPrice
                    const marginPct = group.currentUnitPrice > 0 ? Math.round((marginPerUnit / group.currentUnitPrice) * 100) : 0
                    return (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Marge / unité</span>
                          <span className={`font-bold ${marginPerUnit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {marginPerUnit > 0 ? '+' : ''}{formatCurrency(marginPerUnit)} ({marginPct}%)
                          </span>
                        </div>
                        {[5, 10, 20, 50].map(qty => (
                          <div key={qty} className="flex justify-between text-xs">
                            <span className="text-gray-500">{qty} unités vendues</span>
                            <span className={`font-semibold ${marginPerUnit > 0 ? 'text-green-700' : 'text-red-500'}`}>
                              {marginPerUnit > 0 ? '+' : ''}{formatCurrency(marginPerUnit * qty)}
                            </span>
                          </div>
                        ))}
                        {marginPerUnit > 0 && (
                          <div className="mt-2 p-2 bg-violet-50 rounded-lg">
                            <p className="text-xs text-violet-800 font-semibold flex items-center gap-1">
                              <BarChart3 className="w-3.5 h-3.5" />
                              {marginPct >= 30
                                ? 'Excellente marge pour la revente !'
                                : marginPct >= 15
                                ? 'Bonne marge — idéal pour les revendeurs'
                                : 'Marge correcte — augmentez votre prix de revente'}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
              
              {/* Infos transport */}
              {group.shippingMethod && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
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
              <div className="mt-4 pt-4 border-t">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
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
                
                {/* Estimation avec incitation */}
                <div className="p-4 bg-green-50 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix unitaire estimé</span>
                    <span className="font-semibold">{formatCurrency(estimatedPrice)}</span>
                  </div>
                  
                  {/* Calcul de l'économie potentielle si nouveaux participants */}
                  {(() => {
                    const additionalSavings = calculateSavingsForNewParticipant(joinForm.qty)
                    if (additionalSavings > 0) {
                      return (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-white p-2 rounded-lg">
                          <TrendingUp className="w-4 h-4" />
                          <span>
                            Invite des amis pour économiser encore 
                            <strong className="ml-1">{formatCurrency(additionalSavings)}</strong> de plus !
                          </span>
                        </div>
                      )
                    }
                    return null
                  })()}
                  
                  <div className="border-t border-green-200 pt-2 flex justify-between text-lg">
                    <span className="font-semibold text-gray-900">Total estimé</span>
                    <span className="font-bold text-green-600">{formatCurrency(estimatedPrice * joinForm.qty)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    * Le prix final peut baisser si plus de personnes rejoignent
                  </p>
                </div>
                
                {/* Section Entrepreneur / Bulk */}
                <div className="p-4 bg-gradient-to-br from-violet-50 to-green-50 rounded-xl border border-violet-200">
                  <p className="text-sm font-bold text-violet-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Revendeur ? Calculez votre bénéfice
                  </p>
                  <p className="text-xs text-violet-700 mt-1 mb-3">
                    Import direct de Chine à prix groupé. Revendez au Sénégal avec une marge attractive.
                  </p>
                  <div className="space-y-2">
                    {[
                      { qty: 5, label: '5 unités' },
                      { qty: 10, label: '10 unités' },
                      { qty: 20, label: '20 unités' },
                      { qty: 50, label: '50 unités' }
                    ].map(({ qty, label }) => {
                      const price = calculatePriceForQty(qty)
                      const margin = Math.round(price * 0.35)
                      const profit = margin * qty
                      return (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setJoinForm({ ...joinForm, qty })}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition border ${
                            joinForm.qty === qty
                              ? 'bg-violet-100 border-violet-400 ring-2 ring-violet-300'
                              : 'bg-white border-gray-200 hover:border-violet-300'
                          }`}
                        >
                          <span className="font-semibold text-gray-800">{label}</span>
                          <span className="text-xs text-gray-500">{formatCurrency(price * qty)}</span>
                          <span className="font-bold text-green-600 text-xs">+{formatCurrency(profit)} marge</span>
                        </button>
                      )
                    })}
                  </div>
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
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-violet-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-violet-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
