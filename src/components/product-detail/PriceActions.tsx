'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, MessageCircle, ShieldCheck, Plane, Ship, Truck } from 'lucide-react'
import clsx from 'clsx'
import type { ShippingOptionPricing } from '@/lib/logistics'

interface PriceActionsProps {
  totalPriceLabel: string | null
  unitPriceLabel: string | null
  quantity: number
  showQuote: boolean
  availabilityClass: string
  availabilityNote: string
  shippingEnabled: boolean
  shippingOptions: ShippingOptionPricing[]
  selectedShippingId: string | null
  activeShipping: ShippingOptionPricing | null
  adding: boolean
  onShippingChange: (id: string) => void
  onAddToCart: (redirect: boolean) => void
  onNegotiate: () => void
  onWhatsApp: () => void
  formatCurrency: (amount: number, currency: string) => string | null
}

const shippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  if (methodId.includes('truck')) return Truck
  return Plane
}

export default function PriceActions({
  totalPriceLabel,
  unitPriceLabel,
  quantity,
  showQuote,
  availabilityClass,
  availabilityNote,
  shippingEnabled,
  shippingOptions,
  selectedShippingId,
  activeShipping,
  adding,
  onShippingChange,
  onAddToCart,
  onNegotiate,
  onWhatsApp,
  formatCurrency
}: PriceActionsProps) {
  return (
    <motion.div
      className="sticky top-6 w-full rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/15 backdrop-blur-xl p-6 shadow-2xl shadow-emerald-500/20 space-y-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {/* Effet de glow animé en arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-50 animate-pulse pointer-events-none" />
      
      <div className="relative z-10 space-y-6">
        {/* Prix principal avec effet néon */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-xs uppercase tracking-wider text-emerald-200 font-bold mb-2">Prix catalogue</div>
          <motion.div
            className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-teal-100 to-emerald-100"
            animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ backgroundSize: '200% 100%' }}
          >
            {totalPriceLabel || unitPriceLabel || 'Sur devis'}
          </motion.div>
          {!showQuote && quantity > 1 && (
            <div className="text-xs text-emerald-200/70 mt-2">
              {quantity} unité(s) × {unitPriceLabel}
            </div>
          )}
          {!showQuote && quantity === 1 && unitPriceLabel && (
            <div className="text-xs text-emerald-200/70 mt-2">Prix unitaire</div>
          )}
        </motion.div>

        {/* Badge disponibilité avec glassmorphism */}
        <motion.div
          className={clsx(
            'rounded-2xl px-4 py-3 text-xs font-bold border backdrop-blur-sm',
            availabilityClass
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>{availabilityNote}</span>
          </div>
        </motion.div>

        {/* Modes de transport */}
        {shippingEnabled && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-xs uppercase tracking-wider text-emerald-200/70 font-bold">Modes de transport</div>
            <div className="flex flex-wrap gap-2">
              {shippingOptions.map((option, idx) => {
                const Icon = shippingIcon(option.id)
                const active = option.id === selectedShippingId
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    onClick={() => onShippingChange(option.id)}
                    className={clsx(
                      'flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition-all duration-300',
                      active
                        ? 'border-emerald-400/80 bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-emerald-100 shadow-lg shadow-emerald-500/30 scale-105'
                        : 'border-emerald-400/20 bg-slate-900/30 text-emerald-200 hover:border-emerald-300/60 hover:scale-105'
                    )}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + idx * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </motion.button>
                )
              })}
            </div>
            {activeShipping && (
              <motion.div
                className="rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 backdrop-blur-sm px-4 py-3 text-xs text-emerald-100 font-medium"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>{activeShipping.label}</span>
                  <span className="font-bold text-base">{formatCurrency(activeShipping.cost, activeShipping.currency)}</span>
                </div>
                <div className="text-[11px] text-emerald-200/80">
                  Délai estimé : {activeShipping.durationDays} jours
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Boutons d'action avec effets de halo */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {!showQuote && (
            <>
              <motion.button
                type="button"
                onClick={() => onAddToCart(true)}
                disabled={adding}
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-6 py-4 text-base font-bold text-white transition-all shadow-lg shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <ShoppingCart className="h-5 w-5" />
                {adding ? 'Ajout en cours...' : 'Acheter maintenant'}
              </motion.button>
              
              <motion.button
                type="button"
                onClick={() => onAddToCart(false)}
                disabled={adding}
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl border-2 border-emerald-400/70 bg-transparent backdrop-blur-sm px-6 py-4 text-base font-bold text-emerald-200 transition-all hover:border-emerald-300 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <ShoppingCart className="h-5 w-5" />
                {adding ? 'Ajout...' : 'Ajouter au panier'}
              </motion.button>
            </>
          )}
          
          <motion.button
            type="button"
            onClick={onNegotiate}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/50 bg-slate-900/60 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-emerald-200 hover:border-emerald-300/80 hover:bg-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageCircle className="h-4 w-4" />
            Négocier le tarif
          </motion.button>
          
          <motion.button
            type="button"
            onClick={onWhatsApp}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-500/60 bg-green-500/15 backdrop-blur-sm px-6 py-3 text-sm font-bold text-green-200 hover:border-green-400 hover:bg-green-500/25 hover:shadow-lg hover:shadow-green-500/30 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            Demander un devis WhatsApp
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}
