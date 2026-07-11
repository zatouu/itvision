'use client'

import { Check, ShoppingCart, MapPin, CreditCard, PackageCheck } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
  { key: 'cart', label: 'Panier', icon: ShoppingCart },
  { key: 'address', label: 'Adresse', icon: MapPin },
  { key: 'payment', label: 'Paiement', icon: CreditCard },
  { key: 'confirmation', label: 'Confirmation', icon: PackageCheck },
] as const

export type CheckoutStep = typeof steps[number]['key']

interface CheckoutStepperProps {
  currentStep: CheckoutStep
}

export default function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="sticky top-0 z-40 h-[60px] bg-white/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-center">
        <div className="flex items-center w-full max-w-3xl">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isCompleted = idx < currentIndex
            const isActive = idx === currentIndex
            const isFuture = idx > currentIndex
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted || isActive ? '#10B981' : '#F1F5F9',
                      color: isCompleted || isActive ? '#FFFFFF' : '#94A3B8',
                      borderColor: isCompleted || isActive ? '#10B981' : '#E2E8F0',
                    }}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold"
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </motion.div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-ddm-emerald' : isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 bg-slate-200 dark:bg-slate-700 overflow-hidden rounded-full">
                    <motion.div
                      initial={false}
                      animate={{ width: isCompleted ? '100%' : '0%' }}
                      className="h-full bg-ddm-emerald"
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
