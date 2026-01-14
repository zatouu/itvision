'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

// Background animé subtil
function TrackingBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient de base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950" />
      
      {/* Grille subtile */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(16,185,129,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Orbes de gradient */}
      <motion.div 
        className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      
      <motion.div 
        className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
      />
    </div>
  )
}

// Card avec effet glass
function GlassCard({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl border border-white/10
      bg-gradient-to-br from-white/[0.08] to-white/[0.02]
      backdrop-blur-xl shadow-2xl shadow-black/20
      ${className}
    `}>
      {/* Effet de brillance */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Étapes du processus
const trackingSteps = [
  {
    icon: ShieldCheckIcon,
    title: 'Paiement sécurisé',
    description: 'Votre argent est protégé jusqu\'à réception'
  },
  {
    icon: TruckIcon,
    title: 'Commande & Expédition',
    description: 'Nous commandons et suivons votre colis'
  },
  {
    icon: ClockIcon,
    title: 'Livraison',
    description: 'Livré chez vous à Dakar'
  },
  {
    icon: CheckCircleIcon,
    title: 'Validation',
    description: 'Vérifiez votre commande sous 48h'
  }
]

export default function SuiviPage() {
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reference.trim()) {
      setError('Veuillez entrer une référence')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Vérifier si la transaction existe
      const res = await fetch(`/api/escrow/${reference.trim().toUpperCase()}`)
      
      if (res.ok) {
        router.push(`/suivi/${reference.trim().toUpperCase()}`)
      } else {
        setError('Référence non trouvée. Vérifiez votre numéro.')
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <TrackingBackground />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <SparklesIcon className="w-4 h-4" />
            Système de garantie sécurisé
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Suivez votre commande
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Entrez votre référence pour voir l&apos;état de votre commande et la protection de votre paiement
          </p>
        </motion.div>

        {/* Formulaire de recherche */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-8 mb-12">
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label className="block text-white/80 font-medium mb-3">
                  Référence de commande
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => {
                      setReference(e.target.value.toUpperCase())
                      setError(null)
                    }}
                    placeholder="Ex: ESC-ABC123..."
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all"
                  />
                  <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/30" />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300"
                >
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                className={`
                  w-full py-4 rounded-xl font-semibold text-white
                  flex items-center justify-center gap-3
                  transition-all
                  ${loading
                    ? 'bg-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/25'
                  }
                `}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Recherche...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    Suivre ma commande
                  </>
                )}
              </motion.button>
            </form>
          </GlassCard>
        </motion.div>

        {/* Comment ça marche */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Comment fonctionne notre garantie ?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trackingSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <GlassCard className="p-6 h-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                      <step.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="text-white/40 text-sm font-medium mb-2">
                      Étape {index + 1}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                    <p className="text-white/50 text-sm">{step.description}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Lien vers achats groupés */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <Link href="/achats-groupes">
            <GlassCard className="p-6 hover:border-emerald-400/30 transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                    <ShieldCheckIcon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Découvrez nos achats groupés</h3>
                    <p className="text-white/50 text-sm">Économisez jusqu&apos;à 30% en achetant ensemble</p>
                  </div>
                </div>
                <ArrowRightIcon className="w-6 h-6 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </GlassCard>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-white/40 text-sm mt-12"
        >
          💬 Besoin d&apos;aide ? Contactez-nous à support@itvision.sn
        </motion.p>
      </div>
    </div>
  )
}
