'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, Info, ExternalLink, Package, Loader2, MessageCircle,
  Lock, ShieldCheck, Smartphone, Shield, Clock, CreditCard, Building2,
  Truck, ChevronRight, Timer, AlertCircle, Gift, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { PaymentSettings } from '@/lib/payments/settings'

/* ─── Types ─── */
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
    shipping?: {
      method: string
      totalCost: number
      totalWeight?: number
      weightDetails?: { actualWeight: number; volumetricWeight: number; billedWeight: number; billingMethod: 'actual' | 'volumetric' }
    }
    subtotal?: number
    subtotalBeforeDiscounts?: number
    items?: { name: string; qty: number; price: number; image?: string }[]
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

type Provider = 'wave' | 'orange' | 'free' | 'transfer' | 'gateway'

/* ─── Icônes SVG des moyens de paiement ─── */
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

function FreeMoneyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#00A651"/>
      <circle cx="18" cy="16" r="6" fill="white"/>
      <path d="M18 11v10M13 16h10" stroke="#00A651" strokeWidth="2" strokeLinecap="round"/>
      <text x="28" y="18" fill="white" fontSize="6" fontWeight="bold" fontFamily="Arial">Free</text>
    </svg>
  )
}

function TransferIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#334155"/>
      <path d="M12 10h24M12 16h20M12 22h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="38" cy="22" r="3" fill="#10B981"/>
    </svg>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount)
}

function formatCurrencyShort(amount: number) {
  return `${amount.toLocaleString('fr-FR')} F`
}

function cleanPhone(phone: string) {
  return phone.replace(/[^0-9]/g, '')
}

/* ─── Composants atomiques ─── */
function PaymentProviderCard({
  provider,
  selected,
  onSelect
}: {
  provider: { id: Provider; name: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; recommended?: boolean }
  selected: boolean
  onSelect: () => void
}) {
  const Icon = provider.icon
  return (
    <button
      onClick={onSelect}
      className={`relative p-3 sm:p-4 rounded-xl border-2 transition text-left w-full ${
        selected
          ? 'border-emerald-500 bg-emerald-50/60 shadow-lg ring-2 ring-emerald-100'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      {provider.recommended && (
        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          Recommandé
        </span>
      )}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <Icon className="w-12 h-8 sm:w-14 sm:h-9 mb-2" />
      <p className="font-bold text-sm text-slate-900">{provider.name}</p>
      <p className="text-xs text-slate-500">{provider.subtitle}</p>
    </button>
  )
}

function PaymentInstructions({
  provider,
  amount,
  reference,
  phones,
  onCopy
}: {
  provider: Provider
  amount: number
  reference: string
  phones: { wave: string; orange: string; free: string }
  onCopy: (text: string, field: string) => void
  copiedField: string | null
}) {
  const waveDeep = `wave://pay?amount=${amount}&number=${cleanPhone(phones.wave)}`
  const whatsappText = `Paiement réf: ${reference} - ${formatCurrency(amount)}`
  const whatsappLink = `https://wa.me/${cleanPhone(phones.wave)}?text=${encodeURIComponent(whatsappText)}`

  const [copied, setCopied] = useState<string | null>(null)
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(field)
    onCopy(text, field)
    setTimeout(() => setCopied(null), 2000)
  }

  const content = () => {
    switch (provider) {
      case 'wave':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
              <WaveIcon className="w-16 h-10 rounded" />
              <div>
                <p className="text-sm font-bold text-slate-900">Payer avec Wave</p>
                <p className="text-xs text-slate-500">Transfert rapide et sécurisé</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
              <li>Ouvrez l'application Wave</li>
              <li>Envoyez {formatCurrency(amount)} au numéro ci-dessous</li>
              <li>Indiquez la référence <strong>{reference}</strong> dans le motif</li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-900 font-medium mb-1">Numéro marchand Wave</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono font-bold">{phones.wave}</code>
                <button onClick={() => handleCopy(phones.wave, 'wave-phone')} className="p-1.5 hover:bg-amber-100 rounded">
                  {copied === 'wave-phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                </button>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Référence à indiquer</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono font-bold">{reference}</code>
                <button onClick={() => handleCopy(reference, 'ref')} className="p-1.5 hover:bg-slate-200 rounded">
                  {copied === 'ref' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <a href={waveDeep} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#1DC3E1] text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition">
                <Smartphone className="w-4 h-4" /> Ouvrir Wave
              </a>
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold text-sm hover:bg-emerald-200 transition">
                <MessageCircle className="w-4 h-4" /> Confirmer WhatsApp
              </a>
            </div>
          </div>
        )
      case 'orange':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
              <OrangeMoneyIcon className="w-16 h-10 rounded" />
              <div>
                <p className="text-sm font-bold text-slate-900">Payer avec Orange Money</p>
                <p className="text-xs text-slate-500">Depuis l'app ou par USSD</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
              <li>Composez <strong>#144#391#</strong> ou ouvrez l'app Orange Money</li>
              <li>Saisissez le numéro <strong>{phones.orange}</strong></li>
              <li>Montant <strong>{formatCurrency(amount)}</strong> — Motif <strong>{reference}</strong></li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-900 font-medium mb-1">Numéro marchand Orange Money</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono font-bold">{phones.orange}</code>
                <button onClick={() => handleCopy(phones.orange, 'orange-phone')} className="p-1.5 hover:bg-amber-100 rounded">
                  {copied === 'orange-phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                </button>
              </div>
            </div>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold text-sm hover:bg-emerald-200 transition">
              <MessageCircle className="w-4 h-4" /> Confirmer sur WhatsApp
            </a>
          </div>
        )
      case 'free':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <FreeMoneyIcon className="w-16 h-10 rounded" />
              <div>
                <p className="text-sm font-bold text-slate-900">Payer avec Free Money</p>
                <p className="text-xs text-slate-500">Transfert vers le compte marchand</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
              <li>Ouvrez l'application Free Money</li>
              <li>Envoyez {formatCurrency(amount)} au numéro <strong>{phones.free}</strong></li>
              <li>Motif : <strong>{reference}</strong></li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-900 font-medium mb-1">Numéro marchand Free Money</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono font-bold">{phones.free}</code>
                <button onClick={() => handleCopy(phones.free, 'free-phone')} className="p-1.5 hover:bg-amber-100 rounded">
                  {copied === 'free-phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                </button>
              </div>
            </div>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold text-sm hover:bg-emerald-200 transition">
              <MessageCircle className="w-4 h-4" /> Confirmer sur WhatsApp
            </a>
          </div>
        )
      case 'transfer':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-xl">
              <TransferIcon className="w-16 h-10 rounded" />
              <div>
                <p className="text-sm font-bold text-slate-900">Payer par virement bancaire</p>
                <p className="text-xs text-slate-500">Virement ou dépôt en agence</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Titulaire</span>
                <span className="font-medium">DDM+ SARL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Banque</span>
                <span className="font-medium">ORABANK / CBAO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IBAN / RIB</span>
                <span className="font-medium">SNxx xxxx xxxx xxxx</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Motif obligatoire</span>
                <span className="font-mono font-bold">{reference}</span>
              </div>
            </div>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold text-sm hover:bg-emerald-200 transition">
              <MessageCircle className="w-4 h-4" /> Envoyer le reçu par WhatsApp
            </a>
          </div>
        )
      case 'gateway':
      default:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
              <CreditCard className="w-10 h-10 text-violet-600" />
              <div>
                <p className="text-sm font-bold text-slate-900">Payer par carte bancaire</p>
                <p className="text-xs text-slate-500">Visa, Mastercard, PayDunya</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Vous serez redirigé vers notre passerelle de paiement sécurisée pour finaliser la transaction.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <h3 className="font-bold text-slate-900 mb-4">Instructions de paiement</h3>
      {content()}
    </div>
  )
}

function InstallmentSelector({
  amount,
  selected,
  onSelect
}: {
  amount: number
  selected: number | null
  onSelect: (installments: number | null) => void
}) {
  const options = useMemo(() => {
    return [
      { id: 1, label: 'Comptant', amount, period: '1x', popular: false },
      { id: 2, label: '2x', amount: Math.ceil(amount / 2), period: '2 mois', popular: false },
      { id: 3, label: '3x', amount: Math.ceil(amount / 3), period: '3 mois', popular: true },
      { id: 4, label: '4x', amount: Math.ceil(amount / 4), period: '4 mois', popular: false },
    ]
  }, [amount])

  return (
    <section className="bg-gradient-to-r from-violet-50 to-emerald-50 border border-violet-200 rounded-xl p-4 mb-6">
      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-violet-600" />
        Payez en plusieurs fois sans frais
        <span className="ml-auto text-[10px] text-slate-500 font-normal">Bientôt disponible</span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(selected === opt.id ? null : opt.id)}
            className={`p-3 rounded-lg border-2 text-center transition ${
              selected === opt.id
                ? 'border-violet-500 bg-violet-100'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } ${opt.popular ? 'relative' : ''}`}
          >
            {opt.popular && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                Populaire
              </span>
            )}
            <p className="text-xs text-slate-500">{opt.label}</p>
            <p className="font-bold text-slate-900 text-sm">{formatCurrencyShort(opt.amount)}</p>
            <p className="text-[10px] text-slate-500">{opt.period}</p>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Le paiement échelonné sera activé prochainement selon les options locales disponibles.
      </p>
    </section>
  )
}

function EscrowBanner() {
  return (
    <section className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-3">
      <Shield className="w-8 h-8 text-emerald-600 flex-shrink-0" />
      <div>
        <h3 className="font-bold text-emerald-900 mb-1">🔐 Vos fonds sont sécurisés</h3>
        <p className="text-sm text-emerald-800">
          Votre paiement est conservé en séquestre jusqu'à confirmation de livraison.
          En cas de problème, vous êtes remboursé automatiquement sous 48h.
        </p>
        <Link href="/protection-acheteur" className="text-xs text-emerald-700 underline mt-1 inline-block">
          En savoir plus sur la protection acheteur →
        </Link>
      </div>
    </section>
  )
}

function TrustBadge({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5 p-2">
      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <span className="text-[10px] sm:text-xs text-slate-600 font-medium">{label}</span>
    </div>
  )
}

function PaymentTrustBadges() {
  return (
    <div className="grid grid-cols-4 gap-2 mb-6 bg-white border border-slate-200 rounded-xl p-2">
      <TrustBadge icon={Lock} label="Sécurisé SSL" />
      <TrustBadge icon={ShieldCheck} label="Marchand vérifié" />
      <TrustBadge icon={Smartphone} label="Paiement mobile" />
      <TrustBadge icon={Shield} label="Satisfait/remboursé" />
    </div>
  )
}

function AddOnProductCard({ product }: { product: any }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 min-w-[140px]">
      <div className="aspect-square bg-slate-100 rounded-lg mb-2 overflow-hidden relative">
        <Image src={product.image || '/branding/ddm-logo-mono.svg'} alt={product.name} fill className="object-cover" />
      </div>
      <p className="text-xs font-bold text-slate-900 line-clamp-2 min-h-[2.5em]">{product.name}</p>
      <p className="text-xs text-emerald-600 font-bold mt-1">{formatCurrencyShort(product.price)}</p>
      <button className="mt-2 w-full py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition">
        + Ajouter
      </button>
    </div>
  )
}

function CancelCountdown({ createdAt }: { createdAt: Date }) {
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    const end = new Date(createdAt).getTime() + 30 * 60 * 1000
    const update = () => {
      const diff = Math.max(0, end - Date.now())
      setRemaining(diff)
      if (diff <= 0) clearInterval(interval)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const mm = Math.floor(remaining / 60000)
  const ss = Math.floor((remaining % 60000) / 1000)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-orange-500 text-white py-2.5 text-center text-sm shadow-lg">
      <Timer className="inline w-4 h-4 mr-1 -mt-0.5" />
      Votre commande sera annulée dans <strong>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</strong> si le paiement n'est pas reçu
    </div>
  )
}

/* ─── Composant principal ─── */
export default function CheckoutInterface({ participant, group, settings }: CheckoutInterfaceProps) {
  const gatewayActive = settings.providers.gateway.active
  const [selectedProvider, setSelectedProvider] = useState<Provider>(gatewayActive ? 'gateway' : 'wave')
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState(participant.status)

  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }, [])

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

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
      if (!response.ok) throw new Error(data.error || 'Erreur inconnue')
      window.location.href = data.url
    } catch (error: any) {
      console.error(error)
      showToast(error.message || "Erreur lors de l'initialisation du paiement.")
      setLoading(false)
    }
  }

  const phones = {
    wave: settings.providers.manual.waveMerchantPhone,
    orange: settings.providers.manual.orangeMerchantPhone,
    free: settings.providers.manual.freeMoneyMerchantPhone
  }

  const providers = useMemo(() => {
    const list: { id: Provider; name: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; recommended?: boolean }[] = [
      { id: 'wave', name: 'Wave', subtitle: 'Recommandé', icon: WaveIcon, recommended: true },
      { id: 'orange', name: 'Orange Money', subtitle: 'Mobile', icon: OrangeMoneyIcon },
      { id: 'free', name: 'Free Money', subtitle: 'Mobile', icon: FreeMoneyIcon },
      { id: 'transfer', name: 'Virement', subtitle: 'Bancaire', icon: TransferIcon },
    ]
    if (gatewayActive) {
      list.unshift({ id: 'gateway', name: 'Carte', subtitle: 'Visa/Mastercard', icon: CreditCard as any })
    }
    return list
  }, [gatewayActive])

  const isPaid = paymentStatus === 'paid'
  const isRetailFallback = participant.fees?.serviceFeeRate === 0 && (participant.fees?.supplierCost ?? 0) > 0
  const orderCreatedAt = new Date()

  const addOnProducts = useMemo(() => {
    // Placeholder cross-sell products until API is wired
    return [
      { id: '1', name: 'Câble USB-C renforcé', price: 15488, image: '/branding/ddm-logo-mono.svg' },
      { id: '2', name: 'Coque de protection', price: 4810, image: '/branding/ddm-logo-mono.svg' },
      { id: '3', name: 'Support bureau', price: 10400, image: '/branding/ddm-logo-mono.svg' },
    ]
  }, [])

  if (isPaid) {
    const trackingUrl = `/commandes/${participant.reference}`
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-emerald-200"
      >
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-10 text-center text-white">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <Check size={40} strokeWidth={3} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Paiement Validé !</h2>
          <p className="opacity-90">Merci {participant.name}, votre commande est confirmée.</p>
        </div>
        <div className="p-6 space-y-3">
          <Link href={trackingUrl} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-violet-500 text-white py-3 rounded-xl font-bold text-sm hover:from-emerald-600 hover:to-violet-600 transition">
            <Package size={18} /> Suivre ma commande
          </Link>
          <button onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}${trackingUrl}`, 'tracking')} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-600 py-3 rounded-xl font-bold text-sm transition">
            {copiedField === 'tracking' ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            {copiedField === 'tracking' ? 'Lien copié' : 'Copier le lien de suivi'}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* ─── LEFT: Order Summary ─── */}
        <aside className="lg:sticky lg:top-24 lg:h-fit order-2 lg:order-1">
          <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Récapitulatif
            </h2>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {(participant.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden relative shrink-0">
                    <Image src={item.image || '/branding/ddm-logo-mono.svg'} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-slate-700">{item.qty}× {item.name}</p>
                  </div>
                  <span className="font-bold text-emerald-600 text-xs">{formatCurrencyShort(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{isRetailFallback ? 'Produits' : 'Coût fournisseur'}</span>
                <span className="font-medium">{formatCurrencyShort(participant.fees?.supplierCost || 0)}</span>
              </div>
              {!isRetailFallback && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Frais service ({participant.fees?.serviceFeeRate}%)</span>
                    <span className="font-medium">{formatCurrencyShort(participant.fees?.serviceFeeAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Assurance ({participant.fees?.insuranceRate}%)</span>
                    <span className="font-medium">{formatCurrencyShort(participant.fees?.insuranceAmount || 0)}</span>
                  </div>
                </>
              )}
              {participant.shipping && (
                <div className="flex justify-between text-slate-600">
                  <span>Transport</span>
                  <span className="font-medium">{formatCurrencyShort(participant.shipping.totalCost)}</span>
                </div>
              )}
              {participant.fees?.quantityDiscount && participant.fees.quantityDiscount.amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Réduction volume</span>
                  <span className="font-medium">-{formatCurrencyShort(participant.fees.quantityDiscount.amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">Montant total à payer</p>
              <p className="text-3xl font-extrabold text-emerald-600">{formatCurrency(participant.amount)}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-900 font-medium mb-1">Référence de paiement</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono truncate">{participant.reference}</code>
                <button onClick={() => copyToClipboard(participant.reference, 'ref')} className="p-1 hover:bg-amber-100 rounded">
                  {copiedField === 'ref' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                </button>
              </div>
              <p className="text-[10px] text-amber-700 mt-2 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> Notez cette référence dans le motif du transfert
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-medium mb-1 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Livraison estimée</p>
              <p className="text-sm text-slate-700">15-17 Novembre 2024</p>
              <p className="text-xs text-slate-500">Dakar & régions</p>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {['Wave', 'Orange Money', 'Free Money', 'Carte'].map((m) => (
                <span key={m} className="text-[10px] px-2 py-1 bg-slate-100 rounded-full text-slate-600">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── RIGHT: Payment Methods ─── */}
        <div className="order-1 lg:order-2 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Moyen de paiement</h2>
            <p className="text-slate-500 text-sm">Choisissez comment payer votre commande</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {providers.map((provider) => (
              <PaymentProviderCard
                key={provider.id}
                provider={provider}
                selected={selectedProvider === provider.id}
                onSelect={() => setSelectedProvider(provider.id)}
              />
            ))}
          </div>

          <InstallmentSelector
            amount={participant.amount}
            selected={selectedInstallment}
            onSelect={setSelectedInstallment}
          />

          {selectedProvider === 'gateway' ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl mb-4">
                <CreditCard className="w-10 h-10 text-violet-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Payer par carte bancaire</p>
                  <p className="text-xs text-slate-500">Visa, Mastercard, PayDunya</p>
                </div>
              </div>
              <button
                onClick={handleGatewayPayment}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-violet-700 transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {loading ? 'Redirection...' : `Payer ${formatCurrency(participant.amount)}`}
              </button>
            </div>
          ) : (
            <PaymentInstructions
              provider={selectedProvider}
              amount={participant.amount}
              reference={participant.reference}
              phones={phones}
              onCopy={copyToClipboard}
              copiedField={copiedField}
            />
          )}

          <EscrowBanner />
          <PaymentTrustBadges />

          {/* Cross-sell */}
          <section className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-violet-600" /> Ajoutez un produit avant de payer
                </h3>
                <p className="text-xs text-slate-600">Économisez sur le transport en ajoutant maintenant</p>
              </div>
              <Link href="/produits" className="text-violet-600 text-sm hover:underline">Voir tout →</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {addOnProducts.map((p) => (
                <AddOnProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>

          {/* Buyer protection card */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Protection acheteur DDM+</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Paiement sécurisé en séquestre</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Contrôle qualité avant expédition</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Remboursement sous 48h en cas de litige</li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <CancelCountdown createdAt={orderCreatedAt} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-2xl text-sm font-medium ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
