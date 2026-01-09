'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Clock, CreditCard, Package } from 'lucide-react'

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
type PaymentStatus = 'pending' | 'completed' | 'failed'

interface OrderStatusBadgesProps {
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
}

/**
 * Composant affichant les statuts explicites de commande et paiement
 * Remplace les labels vagues par des statuts clairs et rassurants
 */
export default function OrderStatusBadges({ orderStatus, paymentStatus }: OrderStatusBadgesProps) {
  
  // Configuration du statut commande
  const getOrderStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          primaryText: '✔ Commande enregistrée',
          secondaryText: '⏳ En cours de traitement',
          bgClass: 'from-amber-50 to-orange-50',
          borderClass: 'border-amber-200',
          iconBgClass: 'bg-amber-100',
          iconColorClass: 'text-amber-600'
        }
      case 'confirmed':
        return {
          icon: CheckCircle,
          primaryText: '✔ Commande confirmée',
          secondaryText: '⏳ Préparation en cours',
          bgClass: 'from-emerald-50 to-green-50',
          borderClass: 'border-emerald-200',
          iconBgClass: 'bg-emerald-100',
          iconColorClass: 'text-emerald-600'
        }
      case 'processing':
        return {
          icon: Package,
          primaryText: '✔ Commande confirmée',
          secondaryText: '📦 En préparation',
          bgClass: 'from-blue-50 to-indigo-50',
          borderClass: 'border-blue-200',
          iconBgClass: 'bg-blue-100',
          iconColorClass: 'text-blue-600'
        }
      case 'shipped':
        return {
          icon: Package,
          primaryText: '✔ Commande expédiée',
          secondaryText: '🚚 En transit vers vous',
          bgClass: 'from-purple-50 to-violet-50',
          borderClass: 'border-purple-200',
          iconBgClass: 'bg-purple-100',
          iconColorClass: 'text-purple-600'
        }
      case 'delivered':
        return {
          icon: CheckCircle,
          primaryText: '✔ Commande livrée',
          secondaryText: '🎉 Merci pour votre confiance !',
          bgClass: 'from-emerald-50 to-green-50',
          borderClass: 'border-emerald-200',
          iconBgClass: 'bg-emerald-100',
          iconColorClass: 'text-emerald-600'
        }
      case 'cancelled':
        return {
          icon: Clock,
          primaryText: '❌ Commande annulée',
          secondaryText: 'Contactez le support',
          bgClass: 'from-red-50 to-rose-50',
          borderClass: 'border-red-200',
          iconBgClass: 'bg-red-100',
          iconColorClass: 'text-red-600'
        }
      default:
        return {
          icon: Clock,
          primaryText: 'Statut inconnu',
          secondaryText: '',
          bgClass: 'from-gray-50 to-gray-100',
          borderClass: 'border-gray-200',
          iconBgClass: 'bg-gray-100',
          iconColorClass: 'text-gray-600'
        }
    }
  }

  // Configuration du statut paiement
  const getPaymentStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return {
          icon: CreditCard,
          primaryText: '✔ Paiement reçu',
          secondaryText: 'Transaction validée',
          bgClass: 'from-emerald-50 to-green-50',
          borderClass: 'border-emerald-200',
          iconBgClass: 'bg-emerald-100',
          iconColorClass: 'text-emerald-600'
        }
      case 'pending':
        return {
          icon: Clock,
          primaryText: '⏳ Paiement en attente',
          secondaryText: 'Validation finale en cours (moins de 24h)',
          bgClass: 'from-amber-50 to-orange-50',
          borderClass: 'border-amber-200',
          iconBgClass: 'bg-amber-100',
          iconColorClass: 'text-amber-600'
        }
      case 'failed':
        return {
          icon: CreditCard,
          primaryText: '❌ Paiement échoué',
          secondaryText: 'Veuillez réessayer ou contacter le support',
          bgClass: 'from-red-50 to-rose-50',
          borderClass: 'border-red-200',
          iconBgClass: 'bg-red-100',
          iconColorClass: 'text-red-600'
        }
      default:
        return {
          icon: Clock,
          primaryText: 'Statut inconnu',
          secondaryText: '',
          bgClass: 'from-gray-50 to-gray-100',
          borderClass: 'border-gray-200',
          iconBgClass: 'bg-gray-100',
          iconColorClass: 'text-gray-600'
        }
    }
  }

  const orderConfig = getOrderStatusConfig(orderStatus)
  const paymentConfig = getPaymentStatusConfig(paymentStatus)

  const OrderIcon = orderConfig.icon
  const PaymentIcon = paymentConfig.icon

  return (
    <div className="space-y-4">
      {/* Statut Commande */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`p-4 rounded-xl bg-gradient-to-br ${orderConfig.bgClass} border ${orderConfig.borderClass}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full ${orderConfig.iconBgClass} flex items-center justify-center flex-shrink-0`}>
            <OrderIcon className={`w-5 h-5 ${orderConfig.iconColorClass}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Commande</p>
            <p className="text-sm font-bold text-gray-900">{orderConfig.primaryText}</p>
            {orderConfig.secondaryText && (
              <p className="text-xs text-gray-600 mt-0.5">{orderConfig.secondaryText}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Statut Paiement */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-4 rounded-xl bg-gradient-to-br ${paymentConfig.bgClass} border ${paymentConfig.borderClass}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full ${paymentConfig.iconBgClass} flex items-center justify-center flex-shrink-0`}>
            <PaymentIcon className={`w-5 h-5 ${paymentConfig.iconColorClass}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Paiement</p>
            <p className="text-sm font-bold text-gray-900">{paymentConfig.primaryText}</p>
            {paymentConfig.secondaryText && (
              <p className="text-xs text-gray-600 mt-0.5">{paymentConfig.secondaryText}</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
