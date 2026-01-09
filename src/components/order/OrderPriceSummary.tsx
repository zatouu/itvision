'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Info, Shield, Truck, Package, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface OrderPriceSummaryProps {
  total: number
  currency?: string
}

/**
 * Composant de récapitulatif prix post-commande
 * 
 * Objectif: Rassurer le client sur ce qui est inclus dans son prix
 * SANS recalculer ni dupliquer les détails vus au checkout
 * 
 * IMPORTANT: Ne jamais mentionner "1688" ou autres noms de fournisseurs
 */
export default function OrderPriceSummary({ total, currency = 'FCFA' }: OrderPriceSummaryProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString('fr-FR')} ${currency}`

  const includedItems = [
    {
      icon: Package,
      text: 'Achat direct fournisseur (import Chine)',
      color: 'emerald'
    },
    {
      icon: Truck,
      text: 'Transport international',
      color: 'blue'
    },
    {
      icon: Shield,
      text: 'Assurance marchandise',
      color: 'purple'
    },
    {
      icon: Sparkles,
      text: 'Frais de gestion et de suivi ITVision+',
      color: 'amber'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-2xl border border-emerald-200 p-6 shadow-lg"
    >
      {/* En-tête avec total */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-emerald-100">
        <h3 className="text-lg font-bold text-gray-900">Total payé</h3>
        <span className="text-2xl font-bold text-transparent bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Ce qui est inclus */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Votre prix inclut :
          </h4>
          <div 
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors">
              <Info className="w-3 h-3 text-gray-600" />
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-0 top-full mt-2 w-64 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl z-20"
              >
                <p>
                  Nous achetons directement auprès des fournisseurs en Chine pour vous proposer le meilleur prix.
                </p>
                <div className="absolute -top-2 left-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {includedItems.map((item, idx) => {
            const Icon = item.icon
            const colorClasses = {
              emerald: 'bg-emerald-100 text-emerald-600',
              blue: 'bg-blue-100 text-blue-600',
              purple: 'bg-purple-100 text-purple-600',
              amber: 'bg-amber-100 text-amber-600'
            }
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Badge aucun frais caché */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-emerald-600 text-white rounded-xl p-4 text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <Shield className="w-5 h-5" />
          <span className="font-semibold">Aucun frais caché</span>
        </div>
        <p className="text-emerald-100 text-xs mt-1">
          Le prix affiché est le prix final que vous payez
        </p>
      </motion.div>
    </motion.div>
  )
}
