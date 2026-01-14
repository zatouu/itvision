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
  Camera,
  MessageSquare,
  BadgeCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  ArrowRight,
  Zap,
  Star
} from 'lucide-react'
import { useParams } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Animated Background avec particules
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950" />
      
      {/* Grille hi-tech */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Orbes lumineux */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px]"
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Particules flottantes */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-emerald-400/40 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant Progress Ring animé
// ─────────────────────────────────────────────────────────────────────────────

function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background: `conic-gradient(from 0deg, rgba(16, 185, 129, 0.4) ${progress}%, transparent ${progress}%)`
        }}
      />
      
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
            filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))'
          }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span 
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {progress}%
        </motion.span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant Step animé pour la timeline
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedStep({ 
  step, 
  index, 
  currentIndex, 
  total 
}: { 
  step: { key: string; label: string; icon: React.ReactNode }
  index: number
  currentIndex: number
  total: number
}) {
  const isCompleted = index < currentIndex
  const isCurrent = index === currentIndex

  return (
    <div className="flex flex-col items-center relative">
      {/* Connecting line */}
      {index < total - 1 && (
        <div className="absolute top-6 left-1/2 w-full h-[2px] bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={{ width: '0%' }}
            animate={{ width: isCompleted ? '100%' : '0%' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}
          />
        </div>
      )}
      
      {/* Step circle */}
      <motion.div
        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
          isCompleted 
            ? 'bg-gradient-to-br from-emerald-500 to-teal-500' 
            : isCurrent
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
              : 'bg-white/5 border border-white/20'
        }`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        whileHover={{ scale: 1.1 }}
      >
        {/* Glow ring for current */}
        {isCurrent && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-400"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        
        {isCompleted ? (
          <Check className="w-5 h-5 text-white" />
        ) : (
          <span className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-white/40'}`}>
            {step.icon}
          </span>
        )}
      </motion.div>
      
      {/* Label */}
      <motion.span
        className={`mt-3 text-xs font-medium ${
          isCompleted || isCurrent ? 'text-emerald-400' : 'text-white/40'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.2 }}
      >
        {step.label}
      </motion.span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Glassmorphism Card
// ─────────────────────────────────────────────────────────────────────────────

function GlassCard({ 
  children, 
  className = '',
  hover = true,
  glow = false
}: { 
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}) {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/5 backdrop-blur-xl
        border border-white/10
        ${hover ? 'hover:bg-white/10 hover:border-white/20' : ''}
        transition-all duration-300
        ${className}
      `}
      whileHover={hover ? { y: -2 } : undefined}
    >
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
      )}
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      </div>
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge animé
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending_payment: { label: 'En attente', color: 'from-amber-500 to-orange-500', icon: <Clock className="w-4 h-4" /> },
    payment_received: { label: 'Paiement reçu', color: 'from-green-500 to-emerald-500', icon: <Check className="w-4 h-4" /> },
    funds_secured: { label: 'Fonds sécurisés', color: 'from-emerald-500 to-teal-500', icon: <Shield className="w-4 h-4" /> },
    order_placed: { label: 'Commandé', color: 'from-blue-500 to-indigo-500', icon: <Package className="w-4 h-4" /> },
    order_confirmed: { label: 'Confirmé', color: 'from-blue-500 to-cyan-500', icon: <BadgeCheck className="w-4 h-4" /> },
    in_transit: { label: 'En livraison', color: 'from-indigo-500 to-purple-500', icon: <Truck className="w-4 h-4" /> },
    delivered: { label: 'Livré', color: 'from-green-500 to-emerald-500', icon: <Package className="w-4 h-4" /> },
    verification: { label: 'Vérification', color: 'from-amber-500 to-yellow-500', icon: <Clock className="w-4 h-4" /> },
    completed: { label: 'Terminé', color: 'from-emerald-500 to-green-500', icon: <CheckCircle2 className="w-4 h-4" /> },
    disputed: { label: 'Litige', color: 'from-red-500 to-rose-500', icon: <AlertTriangle className="w-4 h-4" /> },
    refunded: { label: 'Remboursé', color: 'from-blue-500 to-cyan-500', icon: <RefreshCw className="w-4 h-4" /> },
  }

  const config = statusConfig[status] || statusConfig.pending_payment

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${config.color} text-white font-medium text-sm`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
    >
      {config.icon}
      {config.label}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Guarantee Card avec animation
// ─────────────────────────────────────────────────────────────────────────────

function GuaranteeCard({ 
  icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  return (
    <motion.div
      className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileHover={{ x: 5 }}
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="text-sm text-white/60">{description}</p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const progressSteps = [
  { key: 'payment_received', label: 'Paiement', icon: <Zap className="w-4 h-4" /> },
  { key: 'funds_secured', label: 'Sécurisé', icon: <Lock className="w-4 h-4" /> },
  { key: 'order_placed', label: 'Commandé', icon: <Package className="w-4 h-4" /> },
  { key: 'in_transit', label: 'En route', icon: <Truck className="w-4 h-4" /> },
  { key: 'delivered', label: 'Livré', icon: <Package className="w-4 h-4" /> },
  { key: 'completed', label: 'Terminé', icon: <Star className="w-4 h-4" /> },
]

export default function TrackingPage() {
  const params = useParams()
  const reference = params.reference as string
  
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    if (reference) {
      fetchTransaction()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  const fetchTransaction = async () => {
    try {
      const response = await fetch(`/api/escrow/${reference}`)
      if (!response.ok) throw new Error('Transaction non trouvée')
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
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const getTimeRemaining = () => {
    if (!transaction?.verificationEndsAt) return null
    const end = new Date(transaction.verificationEndsAt).getTime()
    const diff = end - Date.now()
    if (diff <= 0) return null
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return { hours, minutes, total: diff }
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <AnimatedBackground />
        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-full border-4 border-emerald-500/30 border-t-emerald-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-white/60">Chargement de votre commande...</p>
        </motion.div>
      </div>
    )
  }

  // Error State
  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <AnimatedBackground />
        <GlassCard className="max-w-md p-8 text-center relative z-10">
          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Transaction introuvable</h1>
          <p className="text-white/60 mb-6">
            La référence <code className="bg-white/10 px-2 py-1 rounded font-mono">{reference}</code> n&apos;existe pas.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white font-medium hover:opacity-90 transition"
          >
            Retour à l&apos;accueil
            <ArrowRight className="w-4 h-4" />
          </a>
        </GlassCard>
      </div>
    )
  }

  const currentStepIndex = getCurrentStepIndex()
  const progressPercent = Math.round((currentStepIndex / (progressSteps.length - 1)) * 100)
  const timeRemaining = getTimeRemaining()
  const isCompleted = transaction.status === 'completed'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AnimatedBackground />
      
      {/* Confetti effect when completed */}
      {isCompleted && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#10b981', '#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)]
              }}
              initial={{ top: '-10%', opacity: 1 }}
              animate={{ 
                top: '110%', 
                opacity: 0,
                rotate: Math.random() * 360,
                x: (Math.random() - 0.5) * 200
              }}
              transition={{ 
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Logo */}
            <motion.div 
              className="inline-flex items-center gap-3 mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  IT Vision Plus
                </span>
                <p className="text-xs text-white/40">Suivi sécurisé</p>
              </div>
            </motion.div>

            {/* Reference */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-white/40 text-sm">Référence</span>
              <span className="font-mono font-bold text-emerald-400">{transaction.reference}</span>
            </motion.div>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 pb-12">
        {/* Main Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-8 mb-6" glow>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Progress Ring */}
              <div className="flex-shrink-0">
                <ProgressRing progress={progressPercent} size={140} />
              </div>
              
              {/* Status Info */}
              <div className="flex-1 text-center lg:text-left">
                <StatusBadge status={transaction.status} />
                
                <h1 className="text-2xl lg:text-3xl font-bold mt-4 mb-2">
                  {isCompleted ? (
                    <span className="flex items-center justify-center lg:justify-start gap-2">
                      <Sparkles className="w-8 h-8 text-yellow-400" />
                      Transaction complétée !
                    </span>
                  ) : (
                    `Bonjour ${transaction.client.name}`
                  )}
                </h1>
                
                <p className="text-white/60">
                  {isCompleted 
                    ? 'Merci pour votre confiance. Votre commande a été livrée avec succès.'
                    : 'Suivez l\'avancement de votre commande en temps réel'}
                </p>

                {/* Amount */}
                <div className="mt-4 inline-flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5">
                  <span className="text-white/40">Montant</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {transaction.amount.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                  </span>
                  {transaction.paidAmount >= transaction.amount && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" /> Payé
                    </span>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 mb-6">
            <h3 className="text-sm font-medium text-white/40 mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Progression de votre commande
            </h3>
            
            <div className="flex justify-between items-start">
              {progressSteps.map((step, index) => (
                <AnimatedStep
                  key={step.key}
                  step={step}
                  index={index}
                  currentIndex={currentStepIndex}
                  total={progressSteps.length}
                />
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Timer for verification period */}
        {timeRemaining && ['delivered', 'verification'].includes(transaction.status) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <GlassCard className="p-6 mb-6 border-amber-500/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-400">Période de vérification</h3>
                  <p className="text-sm text-white/60">Vérifiez votre commande et signalez tout problème</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">
                    {timeRemaining.hours}h {timeRemaining.minutes}m
                  </div>
                  <p className="text-xs text-white/40">restantes</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Delivery Info */}
        {transaction.delivery?.trackingNumber && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Suivi de livraison</h3>
                  <p className="text-sm text-white/40">Votre colis est en route</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">Transporteur</p>
                  <p className="font-medium">{transaction.delivery.carrier || 'En cours'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">N° de suivi</p>
                  <p className="font-mono font-medium text-emerald-400">{transaction.delivery.trackingNumber}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Guarantees Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard className="overflow-hidden mb-6">
            <button
              onClick={() => setActiveSection(activeSection === 'guarantees' ? null : 'guarantees')}
              className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Vos garanties IT Vision</h3>
                  <p className="text-sm text-white/40">Protection complète de votre achat</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: activeSection === 'guarantees' ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-white/40" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {activeSection === 'guarantees' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 space-y-3">
                    <GuaranteeCard
                      icon={<RefreshCw className="w-5 h-5" />}
                      title="Remboursement intégral"
                      description="Si votre commande n'est pas livrée dans les délais"
                      delay={0.1}
                    />
                    <GuaranteeCard
                      icon={<Package className="w-5 h-5" />}
                      title="Remplacement gratuit"
                      description="En cas de produit défectueux ou endommagé"
                      delay={0.2}
                    />
                    <GuaranteeCard
                      icon={<Clock className="w-5 h-5" />}
                      title="48h de vérification"
                      description="Pour vérifier votre commande après réception"
                      delay={0.3}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* Timeline Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="overflow-hidden mb-6">
            <button
              onClick={() => setActiveSection(activeSection === 'timeline' ? null : 'timeline')}
              className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Historique complet</h3>
                  <p className="text-sm text-white/40">{transaction.timeline.length} événements</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: activeSection === 'timeline' ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-white/40" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {activeSection === 'timeline' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0">
                    <div className="relative pl-8 border-l border-white/10 space-y-6">
                      {transaction.timeline.slice().reverse().map((event, index) => (
                        <motion.div
                          key={index}
                          className="relative"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-950" />
                          <div>
                            <p className="font-medium text-white">{event.note || event.status}</p>
                            <p className="text-xs text-white/40 mt-1">{formatDate(event.timestamp)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* Action: Report Problem */}
        {['delivered', 'verification'].includes(transaction.status) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <GlassCard className="p-6 mb-6 border-amber-500/20">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-semibold text-amber-400">Un problème ?</h3>
                  <p className="text-sm text-white/60">Signalez tout souci dans les 48h</p>
                </div>
                <div className="flex gap-3">
                  <motion.a
                    href={`/suivi/${reference}/litige`}
                    className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-slate-900 rounded-xl font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Camera className="w-5 h-5" />
                    Signaler
                  </motion.a>
                  <motion.a
                    href={`https://wa.me/221770000000?text=Problème commande ${reference}`}
                    className="flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded-xl font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MessageSquare className="w-5 h-5" />
                    WhatsApp
                  </motion.a>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <GlassCard className="p-6 text-center">
            <h3 className="font-semibold mb-2">Besoin d&apos;aide ?</h3>
            <p className="text-sm text-white/40 mb-4">Notre équipe est disponible 7j/7</p>
            <div className="flex flex-wrap justify-center gap-3">
              <motion.a 
                href="tel:+221338000000" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
                whileHover={{ scale: 1.05 }}
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                +221 33 800 00 00
              </motion.a>
              <motion.a 
                href="mailto:support@itvisionplus.com" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
                whileHover={{ scale: 1.05 }}
              >
                <Mail className="w-4 h-4 text-emerald-400" />
                support@itvisionplus.com
              </motion.a>
            </div>
          </GlassCard>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              IT Vision Plus
            </span>
          </div>
          <p className="text-white/40 text-sm">
            Votre partenaire de confiance pour tous vos achats
          </p>
          <p className="text-white/20 text-xs mt-4">
            © {new Date().getFullYear()} IT Vision Plus - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  )
}
