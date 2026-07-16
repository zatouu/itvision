'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Check,
  Shield,
  Clock,
  Truck,
  BadgeCheck,
  MessageCircle,
  CreditCard,
  Banknote,
  Wallet,
  Landmark,
  Smartphone,
  Package,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Lock,
  Percent,
  Gift,
  Star,
} from 'lucide-react'
import Link from 'next/link'
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
      quantityDiscount?: { percent: number; amount: number; label: string }
    }
    shipping?: { method: string; totalCost: number; totalWeight?: number }
    subtotal?: number
    subtotalBeforeDiscounts?: number
    items?: { name: string; qty: number; price: number }[]
    address?: { street?: string; city?: string; department?: string; region?: string; country?: string; notes?: string }
    statusLabel?: string
    shippingMethod?: string
  }
  group: { productName: string; groupId: string }
  settings: PaymentSettings
}

type Provider = 'wave' | 'om' | 'free' | 'virement' | 'gateway'

const WAVE = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#1D1D1B"/><path d="M18 8c-1.5 0-2.5 1-3.5 2.5C13.5 12 12.5 13 11 13s-2.5-1-3.5-2.5C6.5 9 5.5 8 4 8" stroke="#9AE5D3" strokeWidth="2.5" strokeLinecap="round"/></svg>
)
const OM = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#FF6600"/><circle cx="12" cy="12" r="6" fill="#FFF"/><path d="M9 12h6M12 9v6" stroke="#FF6600" strokeWidth="2" strokeLinecap="round"/></svg>
)
const FREE = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#00A0DF"/><path d="M7 12h10M12 7v10" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round"/></svg>
)

const PROVIDERS: { key: Provider; label: string; icon: any; color: string; instructions: string[] }[] = [
  {
    key: 'wave',
    label: 'Wave',
    icon: WAVE,
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    instructions: [
      'Ouvrez l’application Wave sur votre téléphone.',
      'Transférez le montant exact au numéro affiché ci-dessous.',
      'Cliquez sur « J’ai payé » pour confirmer via WhatsApp.',
    ],
  },
  {
    key: 'om',
    label: 'Orange Money',
    icon: OM,
    color: 'bg-orange-50 border-orange-200 hover:border-orange-400',
    instructions: [
      'Composez #144# ou ouvrez l’appli Orange Money.',
      'Effectuez un transfert au numéro marchand ci-dessous.',
      'Cliquez sur « J’ai payé » pour confirmer via WhatsApp.',
    ],
  },
  {
    key: 'free',
    label: 'Free Money',
    icon: FREE,
    color: 'bg-sky-50 border-sky-200 hover:border-sky-400',
    instructions: [
      'Ouvrez l’application Free Money.',
      'Transférez le montant exact au numéro ci-dessous.',
      'Cliquez sur « J’ai payé » pour confirmer via WhatsApp.',
    ],
  },
  {
    key: 'virement',
    label: 'Virement bancaire',
    icon: Landmark,
    color: 'bg-slate-50 border-slate-200 hover:border-slate-400',
    instructions: [
      'Effectuez un virement sur le compte bancaire indiqué.',
      'Indiquez impérativement la référence en libellé.',
      'Envoyez le reçu par WhatsApp pour validation.',
    ],
  },
]

const ADD_ONS = [
  { id: 'assurance', name: 'Assurance transport', price: 1500, icon: Shield },
  { id: 'express', name: 'Livraison express Dakar', price: 2500, icon: Truck },
  { id: 'gift', name: 'Emballage cadeau', price: 1000, icon: Gift },
]

const INSTALLMENTS = [
  { count: 1, label: '1x', available: true },
  { count: 2, label: '2x', available: false },
  { count: 3, label: '3x', available: false },
  { count: 4, label: '4x', available: false },
]

export default function CheckoutInterface({ participant, group, settings }: CheckoutInterfaceProps) {
  const gatewayActive = settings.providers.gateway.active
  const [selectedProvider, setSelectedProvider] = useState<Provider>(gatewayActive ? 'gateway' : 'wave')
  const [selectedInstallment, setSelectedInstallment] = useState<number>(1)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState(participant.status)
  const [addedOns, setAddedOns] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(30 * 60)

  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }, [])

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  const amount = participant.amount + addedOns.reduce((sum, id) => sum + (ADD_ONS.find((a) => a.id === id)?.price || 0), 0)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (paymentStatus === 'paid') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?reference=${encodeURIComponent(participant.reference)}`)
        const data = await res.json()
        if (data?.status === 'paid' || data?.status === 'completed') {
          setPaymentStatus('paid')
          showToast('Paiement confirmé ! Redirection...', 'success')
          setTimeout(() => window.location.href = `/suivi/${participant.reference}`, 2000)
        }
      } catch {}
    }, 8000)
    return () => clearInterval(interval)
  }, [participant.reference, paymentStatus, showToast])

  const handleGatewayPayment = async () => {
    if (loading) return
    setLoading(true)
    try {
      const response = await fetch('/api/payment/checkout/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: participant.reference }),
      })
      const data = await response.json()
      if (data?.url) window.location.href = data.url
      else if (data?.error) showToast(data.error)
      else showToast('Erreur lors du lancement du paiement')
    } catch {
      showToast('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const handleMobilePayment = async () => {
    if (loading || selectedProvider === 'virement') return
    setLoading(true)
    try {
      const providerMap: Record<string, string> = {
        wave: 'wave',
        om: 'orange_money',
        free: 'free_money',
      }
      const apiProvider = providerMap[selectedProvider]
      if (!apiProvider) {
        showToast('Moyen de paiement non pris en charge')
        return
      }
      const response = await fetch('/api/market/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: participant.reference,
          provider: apiProvider,
          clientPhone: participant.phone,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        showToast(data.error || 'Erreur lors du lancement du paiement')
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        showToast('Paiement lancé. Validez sur votre téléphone.', 'success')
      }
    } catch {
      showToast('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const wavePhone = settings.providers.manual.waveMerchantPhone
  const omPhone = settings.providers.manual.orangeMerchantPhone
  const freePhone = settings.providers.manual.freeMoneyMerchantPhone

  const phoneByProvider: Record<string, string> = {
    wave: wavePhone,
    om: omPhone,
    free: freePhone,
    virement: '',
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const toggleAddOn = (id: string) => {
    setAddedOns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const whatsappHref = (message: string) => {
    const phone = wavePhone?.replace(/\D/g, '') || '221000000000'
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  const isPaid = paymentStatus === 'paid' || paymentStatus === 'completed'

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* LEFT: Order Summary */}
        <aside className="lg:sticky lg:top-24 lg:h-fit order-2 lg:order-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h2 className="font-bold text-slate-900 dark:text-slate-200">Récapitulatif de la commande</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Produits</span>
                <span className="font-medium dark:text-slate-200">{participant.subtotal?.toLocaleString('fr-FR') || participant.amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Frais & assurance</span>
                <span className="font-medium dark:text-slate-200">{participant.fees?.totalFees?.toLocaleString('fr-FR') || '0'} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Livraison</span>
                <span className="font-medium dark:text-slate-200">{participant.shipping?.totalCost?.toLocaleString('fr-FR') || '0'} FCFA</span>
              </div>
              {addedOns.length > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Options ajoutées</span>
                  <span className="font-medium">+{addedOns.reduce((sum, id) => sum + (ADD_ONS.find((a) => a.id === id)?.price || 0), 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
              <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-slate-200">
                <span>Total</span>
                <span>{amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-500 dark:text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{group.productName}</p>
              <p>Référence : <span className="font-mono text-violet-600 dark:text-violet-400">{participant.reference}</span></p>
              <p>Client : {participant.name} • {participant.phone}</p>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl">
              <Lock className="w-4 h-4" />
              Paiement sécurisé par escrow — votre argent est protégé jusqu'à la livraison.
            </div>
          </div>
        </aside>

        {/* RIGHT: Payment Methods */}
        <div className="order-1 lg:order-2 space-y-6">
          {/* Provider cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDERS.map((provider) => {
              const Icon = provider.icon
              const active = selectedProvider === provider.key
              return (
                <button
                  key={provider.key}
                  onClick={() => setSelectedProvider(provider.key)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${active ? `ring-2 ring-emerald-500 ${provider.color}` : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'}`}
                >
                  <Icon className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-200">{provider.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Paiement manuel</p>
                  </div>
                  {active && <Check className="w-5 h-5 text-emerald-600 ml-auto" />}
                </button>
              )
            })}
            {gatewayActive && (
              <button
                onClick={() => setSelectedProvider('gateway')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${selectedProvider === 'gateway' ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'}`}
              >
                <CreditCard className="w-10 h-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-200">Carte / Gateway</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Paiement en ligne sécurisé</p>
                </div>
                {selectedProvider === 'gateway' && <Check className="w-5 h-5 text-emerald-600 ml-auto" />}
              </button>
            )}
          </div>

          {/* Installments */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-200">Paiement en échéances</h3>
              <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full font-bold">Bientôt</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {INSTALLMENTS.map((inst) => (
                <button
                  key={inst.count}
                  disabled={!inst.available}
                  onClick={() => inst.available && setSelectedInstallment(inst.count)}
                  className={`py-2 rounded-xl text-sm font-bold border-2 transition ${
                    selectedInstallment === inst.count && inst.available
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : inst.available
                      ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-700 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {inst.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Le paiement fractionné sera activé prochainement selon les moyens disponibles au Sénégal.</p>
          </div>

          {/* Instructions */}
          {selectedProvider !== 'gateway' ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
              <h3 className="font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Instructions {PROVIDERS.find(p => p.key === selectedProvider)?.label}
              </h3>
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside mb-4">
                {PROVIDERS.find(p => p.key === selectedProvider)?.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              {selectedProvider !== 'virement' && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Numéro marchand</p>
                    <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-200">{phoneByProvider[selectedProvider]}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(phoneByProvider[selectedProvider], 'phone')}
                    className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-emerald-400 transition"
                  >
                    {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                  </button>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Montant à transférer</p>
                  <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-200">{amount.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <button
                  onClick={() => copyToClipboard(String(amount), 'amount')}
                  className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-emerald-400 transition"
                >
                  {copiedField === 'amount' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Référence à indiquer</p>
                  <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-200">{participant.reference}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(participant.reference, 'ref')}
                  className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-emerald-400 transition"
                >
                  {copiedField === 'ref' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                </button>
              </div>

              {selectedProvider === 'virement' ? (
                <a
                  href={whatsappHref(`Bonjour DDM+, je confirme mon virement.\nRéférence: ${participant.reference}\nMontant: ${amount.toLocaleString('fr-FR')} FCFA`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
                >
                  <MessageCircle className="w-5 h-5" /> J'ai payé — envoyer le reçu par WhatsApp
                </a>
              ) : (
                <button
                  onClick={handleMobilePayment}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-600 to-violet-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-violet-700 transition disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Chargement...</span>
                  ) : (
                    <><Wallet className="w-5 h-5" /> Payer maintenant</>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
              <h3 className="font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Paiement en ligne
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Payez par carte bancaire, Visa, Mastercard ou mobile money via notre passerelle sécurisée.</p>
              <button
                onClick={handleGatewayPayment}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-600 to-violet-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-violet-700 transition disabled:opacity-60"
              >
                {loading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Chargement...</span> : <><Wallet className="w-5 h-5" /> Payer maintenant</>}
              </button>
            </div>
          )}

          {/* Escrow & trust badges */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-emerald-900 dark:text-emerald-300">Protection acheteur DDM+</h3>
                <p className="text-sm text-emerald-800 dark:text-emerald-400 mt-1">Votre paiement est conservé en escrow. Le vendeur n’est payé qu’après votre validation de la livraison.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="flex flex-col items-center text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <BadgeCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">Vérifié</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">Sécurisé</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">Suivi</span>
              </div>
            </div>
          </div>

          {/* Cross-sell */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Complétez votre commande
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ADD_ONS.map((addon) => {
                const Icon = addon.icon
                const added = addedOns.includes(addon.id)
                return (
                  <div key={addon.id} className={`p-3 rounded-xl border-2 transition ${added ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{addon.name}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">+{addon.price.toLocaleString('fr-FR')} FCFA</p>
                    <button
                      onClick={() => toggleAddOn(addon.id)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition ${added ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      {added ? 'Ajouté' : 'Ajouter'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Countdown banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Annulation automatique si non payé dans</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatTime(timeLeft)}</span>
          </div>
          <Link href="/panier" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
            Retour panier <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
