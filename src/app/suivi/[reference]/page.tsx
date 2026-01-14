'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Check, 
  Clock, 
  Package, 
  Truck, 
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Camera,
  MessageSquare,
  BadgeCheck
} from 'lucide-react'
import { useParams } from 'next/navigation'

interface TimelineEvent {
  status: string
  timestamp: string
  note?: string
}

interface Guarantee {
  type: string
  description: string
  validUntil: string
  conditions: string
}

interface Transaction {
  reference: string
  status: string
  amount: number
  paidAmount: number
  client: { name: string; phone: string }
  timeline: TimelineEvent[]
  guarantees: Guarantee[]
  delivery?: {
    method?: string
    trackingNumber?: string
    carrier?: string
    estimatedDate?: string
  }
  deliveredAt?: string
  verificationEndsAt?: string
  createdAt: string
}

const statusConfig: Record<string, { 
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  pending_payment: {
    label: 'En attente de paiement',
    description: 'Effectuez votre paiement pour démarrer',
    icon: <Clock className="w-6 h-6" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  payment_received: {
    label: 'Paiement reçu',
    description: 'Nous avons bien reçu votre paiement',
    icon: <Check className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  funds_secured: {
    label: 'Fonds sécurisés',
    description: 'Votre argent est protégé pendant toute la transaction',
    icon: <Shield className="w-6 h-6" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100'
  },
  order_placed: {
    label: 'Commande passée',
    description: 'Votre commande a été transmise au fournisseur',
    icon: <Package className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  order_confirmed: {
    label: 'Commande confirmée',
    description: 'Le fournisseur a confirmé la disponibilité',
    icon: <BadgeCheck className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  in_transit: {
    label: 'En cours de livraison',
    description: 'Votre colis est en route',
    icon: <Truck className="w-6 h-6" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  delivered: {
    label: 'Livré',
    description: 'Votre colis a été livré',
    icon: <Package className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  verification: {
    label: 'Période de vérification',
    description: 'Vérifiez votre commande sous 48h',
    icon: <Clock className="w-6 h-6" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  completed: {
    label: 'Terminé',
    description: 'Transaction complétée avec succès',
    icon: <Check className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  disputed: {
    label: 'Litige en cours',
    description: 'Nous examinons votre réclamation',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  refunded: {
    label: 'Remboursé',
    description: 'Le remboursement a été effectué',
    icon: <RefreshCw className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  }
}

const progressSteps = [
  { key: 'payment_received', label: 'Paiement', shortLabel: 'Payé' },
  { key: 'funds_secured', label: 'Sécurisé', shortLabel: 'Sécurisé' },
  { key: 'order_placed', label: 'Commandé', shortLabel: 'Commandé' },
  { key: 'in_transit', label: 'En route', shortLabel: 'Route' },
  { key: 'delivered', label: 'Livré', shortLabel: 'Livré' },
  { key: 'completed', label: 'Terminé', shortLabel: 'Terminé' }
]

export default function TrackingPage() {
  const params = useParams()
  const reference = params.reference as string
  
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTimeline, setShowTimeline] = useState(false)
  const [showGuarantees, setShowGuarantees] = useState(false)

  useEffect(() => {
    if (reference) {
      fetchTransaction()
    }
  }, [reference])

  const fetchTransaction = async () => {
    try {
      const response = await fetch(`/api/escrow/${reference}`)
      if (!response.ok) {
        throw new Error('Transaction non trouvée')
      }
      const data = await response.json()
      setTransaction(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentStepIndex = () => {
    if (!transaction) return 0
    const statusOrder = ['payment_received', 'funds_secured', 'order_placed', 'order_confirmed', 'in_transit', 'delivered', 'verification', 'completed']
    const index = statusOrder.indexOf(transaction.status)
    return Math.max(0, Math.min(index, progressSteps.length - 1))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeRemaining = () => {
    if (!transaction?.verificationEndsAt) return null
    const end = new Date(transaction.verificationEndsAt).getTime()
    const now = Date.now()
    const diff = end - now
    if (diff <= 0) return null
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}min`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Transaction non trouvée</h1>
          <p className="text-gray-600 mb-6">
            La référence <code className="bg-gray-100 px-2 py-1 rounded">{reference}</code> n&apos;existe pas.
          </p>
          <a href="/" className="text-emerald-600 hover:underline">
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    )
  }

  const currentConfig = statusConfig[transaction.status] || statusConfig.pending_payment
  const currentStepIndex = getCurrentStepIndex()
  const timeRemaining = getTimeRemaining()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8" />
            <span className="text-lg font-semibold">IT Vision Plus</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Suivi de votre commande</h1>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
            <span className="text-sm opacity-90">Référence:</span>
            <span className="font-mono font-bold ml-2">{transaction.reference}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 -mt-4">
        {/* Carte de statut principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6"
        >
          {/* Statut actuel */}
          <div className={`${currentConfig.bgColor} p-6`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center ${currentConfig.color}`}>
                {currentConfig.icon}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${currentConfig.color}`}>
                  {currentConfig.label}
                </h2>
                <p className="text-gray-600">{currentConfig.description}</p>
              </div>
            </div>
            
            {/* Timer pour période de vérification */}
            {timeRemaining && transaction.status === 'delivered' && (
              <div className="mt-4 bg-white/80 rounded-lg p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm text-gray-600">Temps restant pour signaler un problème</p>
                  <p className="font-bold text-amber-600">{timeRemaining}</p>
                </div>
              </div>
            )}
          </div>

          {/* Barre de progression */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Progression</h3>
            <div className="relative">
              {/* Ligne de fond */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded-full"></div>
              {/* Ligne de progression */}
              <div 
                className="absolute top-4 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${(currentStepIndex / (progressSteps.length - 1)) * 100}%` }}
              ></div>
              
              {/* Points */}
              <div className="relative flex justify-between">
                {progressSteps.map((step, index) => (
                  <div key={step.key} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      index < currentStepIndex 
                        ? 'bg-emerald-500 text-white' 
                        : index === currentStepIndex
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-200'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`mt-2 text-xs ${
                      index <= currentStepIndex ? 'text-emerald-600 font-medium' : 'text-gray-400'
                    }`}>
                      <span className="hidden md:inline">{step.label}</span>
                      <span className="md:hidden">{step.shortLabel}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Informations de livraison */}
          {transaction.delivery?.trackingNumber && (
            <div className="px-6 pb-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Suivi de livraison</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Transporteur</span>
                    <p className="font-medium">{transaction.delivery.carrier || 'En cours'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">N° de suivi</span>
                    <p className="font-mono font-medium">{transaction.delivery.trackingNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Garanties */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6"
        >
          <button
            onClick={() => setShowGuarantees(!showGuarantees)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Vos garanties</h3>
                <p className="text-sm text-gray-500">Protection complète de votre achat</p>
              </div>
            </div>
            {showGuarantees ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          <AnimatePresence>
            {showGuarantees && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-3">
                  {transaction.guarantees.map((guarantee, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{guarantee.description}</p>
                        <p className="text-sm text-gray-500">{guarantee.conditions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6"
        >
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Historique</h3>
                <p className="text-sm text-gray-500">{transaction.timeline.length} événements</p>
              </div>
            </div>
            {showTimeline ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          <AnimatePresence>
            {showTimeline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                    {transaction.timeline.slice().reverse().map((event, index) => {
                      const config = statusConfig[event.status] || statusConfig.pending_payment
                      return (
                        <div key={index} className="relative">
                          <div className={`absolute -left-[29px] w-4 h-4 rounded-full ${config.bgColor} border-2 border-white`}></div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">{config.label}</p>
                            {event.note && <p className="text-sm text-gray-500">{event.note}</p>}
                            <p className="text-xs text-gray-400 mt-1">{formatDate(event.timestamp)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Actions - Signaler un problème */}
        {['delivered', 'verification'].includes(transaction.status) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6"
          >
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Un problème avec votre commande ?
            </h3>
            <p className="text-sm text-amber-700 mb-4">
              Vous avez 48h après la livraison pour signaler tout problème.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`/suivi/${reference}/litige`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition"
              >
                <Camera className="w-5 h-5" />
                Signaler un problème
              </a>
              <a
                href={`https://wa.me/221770000000?text=Problème commande ${reference}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-amber-700 border border-amber-300 rounded-lg font-medium hover:bg-amber-100 transition"
              >
                <MessageSquare className="w-5 h-5" />
                WhatsApp
              </a>
            </div>
          </motion.div>
        )}

        {/* Contact */}
        <div className="bg-gray-100 rounded-2xl p-6 text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Besoin d&apos;aide ?</h3>
          <p className="text-sm text-gray-600 mb-4">Notre équipe est disponible pour vous aider</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:+221338000000" className="flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-50 transition">
              <Phone className="w-4 h-4" />
              +221 33 800 00 00
            </a>
            <a href="mailto:support@itvisionplus.com" className="flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-50 transition">
              <Mail className="w-4 h-4" />
              support@itvisionplus.com
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 mt-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span className="font-semibold">IT Vision Plus</span>
          </div>
          <p className="text-gray-400 text-sm">
            Votre partenaire de confiance pour tous vos achats
          </p>
          <p className="text-gray-500 text-xs mt-4">
            © {new Date().getFullYear()} IT Vision Plus - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  )
}
