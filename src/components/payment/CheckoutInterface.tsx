'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Smartphone, Copy, Check, Info, ExternalLink, Package, Shield, Loader2, Banknote, MessageCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { PaymentSettings } from '@/lib/payments/settings'

/* ─── Icônes SVG des moyens de paiement ─── */
function VisaIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1A1F71"/>
      <path d="M19.5 21H17L18.8 11H21.3L19.5 21ZM15.2 11L12.8 18.1L12.5 16.6L12.5 16.6L11.6 12C11.6 12 11.5 11 10.2 11H6.1L6 11.2C6 11.2 7.5 11.5 9.2 12.5L11.4 21H14L18 11H15.2ZM35 21H37.5L35.3 11H33.3C32.2 11 31.9 11.8 31.9 11.8L28 21H30.6L31.1 19.5H34.3L35 21ZM31.9 17.5L33.3 13.5L34.1 17.5H31.9ZM29.2 13.4L29.5 11.5C29.5 11.5 28.2 11 26.8 11C25.3 11 22 11.7 22 14.5C22 17.1 25.6 17.1 25.6 18.5C25.6 19.9 22.4 19.6 21.2 18.7L20.9 20.7C20.9 20.7 22.2 21.3 24 21.3C25.8 21.3 28.8 20.3 28.8 17.7C28.8 15 25.2 14.8 25.2 13.6C25.2 12.4 27.6 12.5 29.2 13.4Z" fill="white"/>
    </svg>
  )
}

function MastercardIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#252525"/>
      <circle cx="19" cy="16" r="9" fill="#EB001B"/>
      <circle cx="29" cy="16" r="9" fill="#F79E1B"/>
      <path d="M24 9.3C25.8 10.8 27 13.2 27 16C27 18.8 25.8 21.2 24 22.7C22.2 21.2 21 18.8 21 16C21 13.2 22.2 10.8 24 9.3Z" fill="#FF5F00"/>
    </svg>
  )
}

function WaveIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1DC3E1"/>
      <path d="M12 20C14 14 17 12 20 12C23 12 24 16 27 16C30 16 32 14 34 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <text x="12" y="26" fill="white" fontSize="6" fontWeight="bold" fontFamily="Arial">WAVE</text>
    </svg>
  )
}

function OrangeMoneyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#FF6600"/>
      <circle cx="24" cy="14" r="7" fill="white"/>
      <circle cx="24" cy="14" r="5" fill="#FF6600"/>
      <text x="10" y="27" fill="white" fontSize="5.5" fontWeight="bold" fontFamily="Arial">ORANGE</text>
    </svg>
  )
}

type TabId = 'card' | 'mobile' | 'manual'

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
  }
  group: {
    productName: string
    groupId: string
  }
  settings: PaymentSettings
}

export default function CheckoutInterface({ participant, group, settings }: CheckoutInterfaceProps) {
  const gatewayActive = settings.providers.gateway.active

  const [activeTab, setActiveTab] = useState<TabId>(gatewayActive ? 'card' : 'mobile')
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

  const isPaid = paymentStatus === 'paid'

  if (isPaid) {
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
            <span className="font-medium text-sm text-gray-800">{group.productName}</span>
          </div>
          <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Référence</span>
            <span className="font-mono bg-gray-100 px-2.5 py-1 rounded text-sm">{participant.reference}</span>
          </div>
          <div className="flex justify-between items-center py-3.5">
            <span className="text-gray-500 text-sm">Montant payé</span>
            <span className="font-bold text-green-600 text-lg">{formatCurrency(participant.amount)}</span>
          </div>
        </div>
        <div className="px-6 pb-6">
          <Link
            href="/compte/commandes"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-violet-500 text-white py-3 rounded-xl font-bold text-sm hover:from-green-600 hover:to-violet-600 transition"
          >
            Suivre ma commande
            <ChevronRight size={16} />
          </Link>
        </div>
      </motion.div>
    )
  }

  const isRetailFallback = participant.fees?.serviceFeeRate === 0 && (participant.fees?.supplierCost ?? 0) > 0

  // Tabs definition
  const tabs: { id: TabId; label: string; icon: React.ReactNode; show: boolean }[] = [
    {
      id: 'card',
      label: 'Carte bancaire',
      icon: <CreditCard size={17} />,
      show: gatewayActive
    },
    {
      id: 'mobile',
      label: 'Mobile Money',
      icon: <Smartphone size={17} />,
      show: true
    },
    {
      id: 'manual',
      label: 'Autre',
      icon: <Banknote size={17} />,
      show: true
    }
  ]

  const wavePhone = settings.providers.manual.waveMerchantPhone
  const orangePhone = settings.providers.manual.orangeMerchantPhone
  const whatsappLink = `https://wa.me/${wavePhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Paiement réf: ${participant.reference} - ${formatCurrency(participant.amount)}`)}`

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row">
      {/* ─── Sidebar Récapitulatif ─── */}
      <div className="md:w-5/12 lg:w-2/5 bg-gradient-to-br from-gray-50 to-violet-50/30 p-6 border-b md:border-b-0 md:border-r border-gray-100">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold">Récapitulatif</h3>
        </div>

        <div className="mb-5 pb-4 border-b border-gray-100">
          <p className="text-gray-400 text-xs mb-1">Commande</p>
          <p className="font-semibold text-gray-800 text-sm leading-snug">{group.productName}</p>
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

        {/* Moyens acceptés en mini-icônes */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Moyens acceptés</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <VisaIcon className="h-6 w-auto rounded" />
            <MastercardIcon className="h-6 w-auto rounded" />
            <WaveIcon className="h-6 w-auto rounded" />
            <OrangeMoneyIcon className="h-6 w-auto rounded" />
          </div>
        </div>
      </div>

      {/* ─── Contenu principal ─── */}
      <div className="md:w-7/12 lg:w-3/5 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Moyen de paiement</h1>
        <p className="text-sm text-gray-400 mb-6">Choisissez comment payer votre commande</p>

        {/* Onglets */}
        <div className="flex gap-1 mb-7 border-b border-slate-200">
          {tabs.filter(t => t.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 sm:px-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </div>
              {activeTab === tab.id && (
                <motion.div layoutId="checkout-tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-violet-500" />
              )}
            </button>
          ))}
        </div>

        {/* ─── Contenu des onglets ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-[320px]"
          >
            {/* ══════════ CARTE BANCAIRE ══════════ */}
            {activeTab === 'card' && gatewayActive && (
              <div className="space-y-6">
                {/* Badges cartes */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl border border-violet-100">
                  <div className="flex gap-2">
                    <VisaIcon className="h-9 w-auto rounded shadow-sm" />
                    <MastercardIcon className="h-9 w-auto rounded shadow-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Visa & Mastercard</p>
                    <p className="text-xs text-slate-500">Paiement sécurisé par carte bancaire</p>
                  </div>
                  <Shield size={20} className="text-green-500" />
                </div>

                {/* Avantages */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>Confirmation instantanée</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>Données chiffrées SSL</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>Aucun stockage de carte</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>Certifié PCI-DSS</span>
                  </div>
                </div>

                {/* Bouton payer */}
                <button
                  onClick={handleGatewayPayment}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-violet-600 hover:from-green-700 hover:to-violet-700 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Redirection en cours...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      <span>Payer {formatCurrency(participant.amount)}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Sécurisé</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  Vous serez redirigé vers notre partenaire sécurisé pour finaliser le paiement.
                </p>
              </div>
            )}

            {/* ══════════ MOBILE MONEY ══════════ */}
            {activeTab === 'mobile' && (
              <div className="space-y-5">
                {/* Si gateway active, proposer le paiement intégré mobile money via PayDunya */}
                {gatewayActive && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200 mb-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 p-1.5 rounded-lg">
                        <Smartphone size={18} className="text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900">Paiement instantané</p>
                        <p className="text-xs text-green-700 mt-0.5">
                          Payez directement via Wave ou Orange Money en cliquant ci-dessous. Votre paiement sera confirmé automatiquement.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleGatewayPayment}
                      disabled={loading}
                      className="mt-3 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-xl shadow transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Redirection...</span>
                        </>
                      ) : (
                        <>
                          <span>Payer {formatCurrency(participant.amount)} via Mobile Money</span>
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span>{gatewayActive ? 'ou transfert manuel' : 'Transfert mobile'}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Wave */}
                <div className="border rounded-xl p-5 hover:border-[#1DC3E1] transition-colors group">
                  <div className="flex items-center gap-3 mb-4">
                    <WaveIcon className="h-8 w-auto rounded shadow-sm" />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">Wave</h4>
                      <p className="text-[11px] text-gray-400">Transfert rapide et gratuit</p>
                    </div>
                    <span className="bg-[#1DC3E1]/10 text-[#1DC3E1] text-[10px] font-bold px-2 py-1 rounded-full">Recommandé</span>
                  </div>
                  <div className="space-y-3 pl-0">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Numéro marchand</p>
                        <p className="text-lg font-mono font-bold text-slate-900">{wavePhone}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(wavePhone, 'wave')}
                        className="text-gray-400 hover:text-[#1DC3E1] p-2 hover:bg-[#1DC3E1]/10 rounded-lg transition"
                      >
                        {copiedField === 'wave' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1.5">
                      <p className="flex items-start gap-2"><span className="text-[#1DC3E1] font-bold">1.</span> Ouvrez l&apos;app Wave → &quot;Envoyer&quot;</p>
                      <p className="flex items-start gap-2"><span className="text-[#1DC3E1] font-bold">2.</span> Numéro : <strong>{wavePhone}</strong></p>
                      <p className="flex items-start gap-2"><span className="text-[#1DC3E1] font-bold">3.</span> Montant : <strong>{formatCurrency(participant.amount)}</strong></p>
                      <p className="flex items-start gap-2"><span className="text-[#1DC3E1] font-bold">4.</span> Note : <strong className="font-mono">{participant.reference}</strong></p>
                    </div>
                    <a
                      href={`https://wave.com/send?amount=${participant.amount}&recipient=${wavePhone.replace(/[^0-9+]/g, '')}&message=${participant.reference}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 mt-1 text-sm bg-[#1DC3E1] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#17a8c3] transition"
                    >
                      <Smartphone size={16} />
                      Ouvrir Wave
                    </a>
                  </div>
                </div>

                {/* Orange Money */}
                <div className="border rounded-xl p-5 hover:border-[#FF6600] transition-colors group">
                  <div className="flex items-center gap-3 mb-4">
                    <OrangeMoneyIcon className="h-8 w-auto rounded shadow-sm" />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">Orange Money</h4>
                      <p className="text-[11px] text-gray-400">USSD ou application</p>
                    </div>
                  </div>
                  <div className="space-y-3 pl-0">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Numéro marchand</p>
                        <p className="text-lg font-mono font-bold text-slate-900">{orangePhone}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(orangePhone, 'orange')}
                        className="text-gray-400 hover:text-[#FF6600] p-2 hover:bg-orange-50 rounded-lg transition"
                      >
                        {copiedField === 'orange' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1.5">
                      <p className="flex items-start gap-2"><span className="text-[#FF6600] font-bold">1.</span> Composez <strong>#144#</strong> ou ouvrez l&apos;app Orange Money</p>
                      <p className="flex items-start gap-2"><span className="text-[#FF6600] font-bold">2.</span> Choisissez &quot;Transfert d&apos;argent&quot;</p>
                      <p className="flex items-start gap-2"><span className="text-[#FF6600] font-bold">3.</span> Numéro : <strong>{orangePhone}</strong></p>
                      <p className="flex items-start gap-2"><span className="text-[#FF6600] font-bold">4.</span> Montant : <strong>{formatCurrency(participant.amount)}</strong></p>
                      <p className="flex items-start gap-2"><span className="text-[#FF6600] font-bold">5.</span> Confirmez avec votre code secret</p>
                    </div>
                  </div>
                </div>

                {/* Confirmation WhatsApp */}
                <div className="bg-amber-50 rounded-xl p-4 text-sm border border-amber-200">
                  <p className="font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <Info size={14} />
                    Après votre transfert
                  </p>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Envoyez la capture d&apos;écran de confirmation par WhatsApp pour une validation rapide de votre commande.
                  </p>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-xs bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    <MessageCircle size={14} />
                    Envoyer sur WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* ══════════ AUTRE (ESPÈCES / VIREMENT) ══════════ */}
            {activeTab === 'manual' && (
              <div className="space-y-5">
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-gray-200 p-2 rounded-lg">
                      <Banknote size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Paiement à la livraison / en espèces</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Payez lors de la réception de votre commande ou passez à nos bureaux.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                      <span>Présentez la référence <strong className="font-mono">{participant.reference}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                      <span>Montant exact : <strong>{formatCurrency(participant.amount)}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                      <span>Contactez-nous pour organiser la remise</span>
                    </div>
                  </div>
                </div>

                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                  <p className="text-sm font-semibold text-violet-900 mb-2">Contact</p>
                  <div className="flex items-center gap-3">
                    <a
                      href={`tel:${wavePhone}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-white border border-violet-200 text-violet-700 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-100 transition"
                    >
                      📞 Appeler
                    </a>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
