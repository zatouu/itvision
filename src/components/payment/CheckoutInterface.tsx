'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Info, ExternalLink, Package, Loader2, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import PaymentMethodSelector from './PaymentMethodSelector'
import type { PaymentSettings } from '@/lib/payments/settings'

interface CheckoutInterfaceProps {
  participant: {
    name: string
    phone: string
    amount: number
    reference: string
    status: string
    fees?: {
      supplierCost: number
      serviceFeeRate: number
      serviceFeeStandardRate: number
      serviceFeeAmount: number
      serviceFeeSavings: number
      insuranceRate: number
      insuranceAmount: number
      totalFees: number
      quantityDiscount?: {
        percent: number
        amount: number
        label: string
      }
    }
    shipping?: {
      method: string
      totalCost: number
      totalWeight?: number
      weightDetails?: {
        actualWeight: number
        volumetricWeight: number
        billedWeight: number
        billingMethod: 'actual' | 'volumetric'
      }
    }
    subtotal?: number
    subtotalBeforeDiscounts?: number
    items?: { name: string; qty: number; price: number }[]
    address?: { street?: string; city?: string; department?: string; region?: string; country?: string; notes?: string }
    statusLabel?: string
    shippingMethod?: string
  }
  group: {
    productName: string
    groupId: string
  }
  settings: PaymentSettings
}

export default function CheckoutInterface({ participant, group, settings }: CheckoutInterfaceProps) {
  const gatewayActive = settings.providers.gateway.active

  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }, [])

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  const handleGatewayPayment = async () => {
    if (loading) return
    setLoading(true)

    try {
      const response = await fetch('/api/payment/checkout/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: participant.reference })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur inconnue')
      }

      window.location.href = data.url
    } catch (error: any) {
      console.error(error)
      showToast(error.message || "Erreur lors de l'initialisation du paiement.")
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount)
  }

  // Polling du statut de paiement (vérifie toutes les 15s si le paiement a été validé)
  const [paymentStatus, setPaymentStatus] = useState(participant.status)
  useEffect(() => {
    if (paymentStatus === 'paid') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?reference=${encodeURIComponent(participant.reference)}`)
        const data = await res.json()
        if (data?.status === 'paid' || data?.status === 'completed') {
          setPaymentStatus('paid')
          showToast('Paiement confirmé !', 'success')
          clearInterval(interval)
        }
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [participant.reference, paymentStatus, showToast])

  const wavePhone = settings.providers.manual.waveMerchantPhone
  const orangePhone = settings.providers.manual.orangeMerchantPhone
  const whatsappLink = `https://wa.me/${wavePhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Paiement réf: ${participant.reference} - ${formatCurrency(participant.amount)}`)}`

  const isPaid = paymentStatus === 'paid'

  if (isPaid) {
    const trackingUrl = `/commandes/${participant.reference}`
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-green-200"
      >
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-10 text-center text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-4"
          >
            <Check size={40} strokeWidth={3} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Paiement Validé !</h2>
          <p className="opacity-90">Merci {participant.name}, votre commande est confirmée.</p>
        </div>
        <div className="p-6 space-y-0">
          <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Commande</span>
            <span className="font-medium text-sm text-gray-800 text-right max-w-[60%]">{group.productName}</span>
          </div>
          <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Référence</span>
            <span className="font-mono bg-gray-100 px-2.5 py-1 rounded text-sm">{participant.reference}</span>
          </div>
          <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Montant payé</span>
            <span className="font-bold text-green-600 text-lg">{formatCurrency(participant.amount)}</span>
          </div>
          {participant.address && (
            <div className="flex justify-between items-start py-3.5 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Livraison</span>
              <span className="text-sm text-gray-800 text-right">
                {participant.address.street || ''}<br />
                {participant.address.city || ''} {participant.address.department || ''}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-3.5">
            <span className="text-gray-500 text-sm">Statut</span>
            <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Confirmée</span>
          </div>
        </div>
        <div className="px-6 pb-6 space-y-3">
          <Link
            href={trackingUrl}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-violet-500 text-white py-3 rounded-xl font-bold text-sm hover:from-green-600 hover:to-violet-600 transition"
          >
            <Package size={18} />
            Suivre ma commande
          </Link>
          <button
            onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}${trackingUrl}`, 'tracking')}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-600 py-3 rounded-xl font-bold text-sm transition"
          >
            {copiedField === 'tracking' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            {copiedField === 'tracking' ? 'Lien copié' : 'Copier le lien de suivi'}
          </button>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-3 rounded-xl font-bold text-sm transition"
          >
            <MessageCircle size={18} />
            Confirmer sur WhatsApp
          </a>
        </div>
      </motion.div>
    )
  }

  const isRetailFallback = participant.fees?.serviceFeeRate === 0 && (participant.fees?.supplierCost ?? 0) > 0

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row">
      {/* Mobile sticky summary bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Total à payer</p>
            <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text text-transparent">
              {formatCurrency(participant.amount)}
            </p>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('payment-methods')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="flex-1 max-w-[200px] bg-gradient-to-r from-emerald-500 to-violet-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition"
          >
            Choisir le paiement
          </button>
        </div>
      </div>

      {/* ─── Sidebar Récapitulatif ─── */}
      <div className="md:w-5/12 lg:w-2/5 bg-gradient-to-br from-gray-50 to-violet-50/30 p-6 border-b md:border-b-0 md:border-r border-gray-100">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold">Récapitulatif</h3>
        </div>

        <div className="mb-5 pb-4 border-b border-gray-100">
          <p className="text-gray-400 text-xs mb-1">Commande</p>
          <p className="font-semibold text-gray-800 text-sm leading-snug">{group.productName}</p>
          {participant.items && participant.items.length > 0 && (
            <div className="mt-3 space-y-2">
              {participant.items.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                  <span className="line-clamp-1 flex-1 mr-2">{item.qty}× {item.name}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
              {participant.items.length > 4 && (
                <p className="text-xs text-gray-400">+ {participant.items.length - 4} autres articles</p>
              )}
            </div>
          )}
        </div>

        {participant.fees && (
          <div className="mb-5 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span className="text-gray-500">{isRetailFallback ? 'Produits' : 'Coût fournisseur'}</span>
              <span className="font-medium">{formatCurrency(participant.fees.supplierCost)}</span>
            </div>
            {!isRetailFallback && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span className="text-gray-500">Frais service ({participant.fees.serviceFeeRate}%)</span>
                  <span className="font-medium">{formatCurrency(participant.fees.serviceFeeAmount)}</span>
                </div>
                {participant.fees.serviceFeeSavings > 0 && (
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Économie B2B</span>
                    <span>-{formatCurrency(participant.fees.serviceFeeSavings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span className="text-gray-500">Assurance ({participant.fees.insuranceRate}%)</span>
                  <span className="font-medium">{formatCurrency(participant.fees.insuranceAmount)}</span>
                </div>
              </>
            )}
            {participant.fees.quantityDiscount && participant.fees.quantityDiscount.amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Réduction volume</span>
                <span>-{formatCurrency(participant.fees.quantityDiscount.amount)}</span>
              </div>
            )}
            {participant.shipping && (
              <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1 text-gray-500">
                  Transport
                  {participant.shipping.weightDetails?.billingMethod === 'volumetric' && (
                    <span className="text-xs text-amber-600">(volumétrique)</span>
                  )}
                </span>
                <span className="font-medium">{formatCurrency(participant.shipping.totalCost)}</span>
              </div>
            )}
          </div>
        )}

        <div className="mb-5 pt-4 border-t border-gray-100">
          <p className="text-gray-400 text-xs mb-1">Montant total à payer</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text text-transparent">
            {formatCurrency(participant.amount)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-violet-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1.5">Référence de paiement</p>
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono font-bold text-gray-800 text-sm truncate">{participant.reference}</code>
            <button
              onClick={() => copyToClipboard(participant.reference, 'ref')}
              className="text-violet-400 hover:text-violet-600 flex-shrink-0 p-1 hover:bg-violet-50 rounded transition"
            >
              {copiedField === 'ref' ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2 flex items-start gap-1">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>Notez cette référence dans le motif du transfert.</span>
          </p>
        </div>

        <Link href="/compte/commandes" className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition">
          <ExternalLink size={12} />
          Voir mes commandes
        </Link>

        {/* Moyens acceptés */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Moyens acceptés</p>
          <div className="flex flex-wrap gap-1.5">
            {['Wave', 'Orange Money', 'Free Money', 'Carte'].map((m) => (
              <span key={m} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md font-medium">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Contenu principal ─── */}
      <div id="payment-methods" className="md:w-7/12 lg:w-3/5 p-6 md:p-8">
        <PaymentMethodSelector
          reference={participant.reference}
          amount={participant.amount}
          gatewayActive={gatewayActive}
          phones={{
            wave: wavePhone,
            orange: orangePhone,
            free: settings.providers.manual.freeMoneyMerchantPhone
          }}
          onGatewayPay={handleGatewayPayment}
          gatewayLoading={loading}
          whatsappLink={whatsappLink}
        />
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-2xl text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
