'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Package, Truck, Home, Info, Clock } from 'lucide-react'
import { useState } from 'react'

/**
 * Mapping des statuts backend vers les étapes de la timeline
 * 
 * Backend status → Timeline step index
 * - pending / confirmed → 0 (Commande confirmée)
 * - processing → 1 (Préparation en cours)
 * - shipped → 2 (Expédition en cours)
 * - delivered → 3 (Livraison effectuée)
 */

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface OrderTrackingTimelineProps {
  status: OrderStatus
  paymentStatus?: 'pending' | 'completed' | 'failed'
  shippingMethod?: string
}

// Configuration des étapes de la timeline
const TIMELINE_STEPS = [
  {
    id: 'confirmed',
    icon: CheckCircle,
    label: 'Commande confirmée',
    description: 'Votre commande a été enregistrée et est en cours de validation.',
    activeStatuses: ['pending', 'confirmed'] as OrderStatus[]
  },
  {
    id: 'preparation',
    icon: Package,
    label: 'Préparation',
    description: 'Notre équipe procède à l\'achat du produit auprès de notre fournisseur et à sa préparation pour l\'expédition.',
    activeStatuses: ['processing'] as OrderStatus[]
  },
  {
    id: 'shipping',
    icon: Truck,
    label: 'Expédition',
    description: 'Votre commande est en cours de transport vers le Sénégal.',
    activeStatuses: ['shipped'] as OrderStatus[]
  },
  {
    id: 'delivered',
    icon: Home,
    label: 'Livraison',
    description: 'Votre commande a été livrée. Merci pour votre confiance !',
    activeStatuses: ['delivered'] as OrderStatus[]
  }
]

// Fonction pour déterminer l'index de l'étape actuelle
function getCurrentStepIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1
  if (status === 'pending' || status === 'confirmed') return 0
  if (status === 'processing') return 1
  if (status === 'shipped') return 2
  if (status === 'delivered') return 3
  return 0
}

// Fonction pour obtenir le statut d'une étape
function getStepStatus(stepIndex: number, currentStepIndex: number): 'completed' | 'active' | 'pending' {
  if (stepIndex < currentStepIndex) return 'completed'
  if (stepIndex === currentStepIndex) return 'active'
  return 'pending'
}

export default function OrderTrackingTimeline({ 
  status, 
  paymentStatus = 'pending',
  shippingMethod 
}: OrderTrackingTimelineProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  const currentStepIndex = getCurrentStepIndex(status)
  
  // Message contextuel basé sur le statut actuel
  const currentStep = TIMELINE_STEPS[currentStepIndex]
  const contextMessage = currentStep?.description || ''

  // Si commande annulée
  if (status === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">❌</span>
        </div>
        <h3 className="text-lg font-bold text-red-800 mb-2">Commande annulée</h3>
        <p className="text-red-600">Cette commande a été annulée. Contactez-nous pour plus d&apos;informations.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Suivi de votre commande
      </h2>

      {/* Timeline horizontale */}
      <div className="relative">
        {/* Ligne de connexion de fond */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 z-0" />
        
        {/* Ligne de progression */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStepIndex / (TIMELINE_STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute top-8 left-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 z-0"
        />

        {/* Étapes */}
        <div className="flex justify-between relative z-10">
          {TIMELINE_STEPS.map((step, idx) => {
            const Icon = step.icon
            const stepStatus = getStepStatus(idx, currentStepIndex)
            const isHovered = hoveredStep === idx

            return (
              <div
                key={step.id}
                className="flex flex-col items-center flex-1 relative"
                onMouseEnter={() => setHoveredStep(idx)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {/* Cercle de l'étape */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.1, type: 'spring', stiffness: 200 }}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 cursor-pointer
                    ${stepStatus === 'completed' 
                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-200' 
                      : stepStatus === 'active'
                        ? 'bg-blue-500 border-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}
                >
                  {stepStatus === 'completed' ? (
                    <CheckCircle className="w-8 h-8" />
                  ) : (
                    <Icon className="w-8 h-8" />
                  )}
                </motion.div>

                {/* Label de l'étape */}
                <p className={`
                  mt-3 text-xs md:text-sm font-medium text-center px-1 transition-colors
                  ${stepStatus === 'completed' ? 'text-emerald-700' : 
                    stepStatus === 'active' ? 'text-blue-700 font-bold' : 'text-gray-400'}
                `}>
                  {step.label}
                </p>

                {/* Badge actif */}
                {stepStatus === 'active' && (
                  <motion.span
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium"
                  >
                    En cours
                  </motion.span>
                )}

                {/* Tooltip info au survol */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full mt-2 w-48 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl z-20"
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                      <p>{step.description}</p>
                    </div>
                    {/* Flèche du tooltip */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Message contextuel sous la timeline */}
      <motion.div
        key={currentStepIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-blue-800">{currentStep?.label}:</span>{' '}
              {contextMessage}
            </p>
            {shippingMethod && currentStepIndex >= 2 && (
              <p className="text-xs text-gray-500 mt-1">
                Mode de livraison: {shippingMethod}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
