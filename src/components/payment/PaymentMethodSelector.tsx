'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  CreditCard, Smartphone, Check, Copy, Truck, Shield, ChevronRight,
  Loader2, Wallet, Building2, MessageCircle
} from 'lucide-react'

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

type Provider = 'wave' | 'orange' | 'free' | 'gateway' | 'cod'

interface PaymentMethodSelectorProps {
  reference: string
  amount: number
  gatewayActive: boolean
  phones: {
    wave: string
    orange: string
    free: string
  }
  onGatewayPay: () => void
  gatewayLoading: boolean
  whatsappLink: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount)
}

function cleanPhone(phone: string) {
  return phone.replace(/[^0-9]/g, '')
}

const PROVIDERS: {
  id: Provider
  label: string
  short: string
  color: string
  bg: string
  border: string
  text: string
  icon: React.ComponentType<{ className?: string }>
  recommended?: boolean
}[] = [
  {
    id: 'wave',
    label: 'Wave',
    short: 'Wave',
    color: '#1DC3E1',
    bg: 'bg-[#1DC3E1]/10',
    border: 'border-[#1DC3E1]/30',
    text: 'text-[#1DC3E1]',
    icon: WaveIcon,
    recommended: true
  },
  {
    id: 'orange',
    label: 'Orange Money',
    short: 'Orange',
    color: '#FF6600',
    bg: 'bg-[#FF6600]/10',
    border: 'border-[#FF6600]/30',
    text: 'text-[#FF6600]',
    icon: OrangeMoneyIcon
  },
  {
    id: 'free',
    label: 'Free Money',
    short: 'Free',
    color: '#00A651',
    bg: 'bg-[#00A651]/10',
    border: 'border-[#00A651]/30',
    text: 'text-[#00A651]',
    icon: FreeMoneyIcon
  }
]

function buildDeeplink(provider: Provider, phone: string, amount: number, reference: string) {
  const clean = cleanPhone(phone)
  const amountInt = Math.round(amount)
  const message = encodeURIComponent(`Paiement ${reference}`)
  switch (provider) {
    case 'wave':
      return `wave://send?phone=${clean}&amount=${amountInt}&message=${message}`
    case 'orange':
      return `orange-money-sn://send?phone=${clean}&amount=${amountInt}&message=${message}`
    case 'free':
      return `free-money://send?phone=${clean}&amount=${amountInt}&message=${message}`
    default:
      return '#'
  }
}

export default function PaymentMethodSelector({
  reference,
  amount,
  gatewayActive,
  phones,
  onGatewayPay,
  gatewayLoading,
  whatsappLink
}: PaymentMethodSelectorProps) {
  const [selected, setSelected] = useState<Provider>(gatewayActive ? 'gateway' : 'wave')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showCod, setShowCod] = useState(false)

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  const activeProvider = PROVIDERS.find(p => p.id === selected) || PROVIDERS[0]

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Moyen de paiement</h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Choisissez comment payer votre commande</p>
      </div>

      {/* Option gateway intégrée si active */}
      {gatewayActive && (
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelected('gateway')}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${
            selected === 'gateway'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-violet-500 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 dark:text-slate-200">Paiement instantané</p>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">Rapide</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Carte, Wave, Orange Money, Free Money</p>
          </div>
          {selected === 'gateway' && <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
        </motion.button>
      )}

      {/* Séparateur si gateway active */}
      {gatewayActive && (
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          <span>ou paiement manuel</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
        </div>
      )}

      {/* Tuiles Mobile Money */}
      <div className="grid grid-cols-3 gap-3">
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon
          const isSelected = selected === provider.id
          return (
            <motion.button
              key={provider.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(provider.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition ${
                isSelected
                  ? `${provider.border} ${provider.bg}`
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className="h-8 w-auto rounded shadow-sm" />
                {provider.recommended && !gatewayActive && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-emerald-500 text-white px-1 py-0.5 rounded-full font-bold">Top</span>
                )}
              </div>
              <span className={`text-xs font-bold ${isSelected ? provider.text : 'text-gray-600 dark:text-slate-400'}`}>{provider.short}</span>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: provider.color }} />}
            </motion.button>
          )
        })}
      </div>

      {/* Contenu du provider sélectionné */}
      <AnimatePresence mode="wait">
        {selected === 'gateway' ? (
          <motion.div
            key="gateway"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg">
                  <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Paiement sécurisé en ligne</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Vous serez redirigé vers notre partenaire de paiement pour finaliser la transaction.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onGatewayPay}
              disabled={gatewayLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-violet-600 hover:from-emerald-600 hover:to-violet-700 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {gatewayLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Redirection...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  <span>Payer {formatCurrency(amount)}</span>
                </>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className={`rounded-xl border-2 p-4 ${activeProvider.border} ${activeProvider.bg}`}>
              <div className="flex items-center gap-3 mb-3">
                <activeProvider.icon className="h-8 w-auto rounded shadow-sm" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Payer avec {activeProvider.label}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Transfert rapide et sécurisé</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100 dark:border-slate-700">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">Numéro marchand</p>
                    <p className="text-lg font-mono font-bold text-slate-900 dark:text-slate-200">
                      {selected === 'wave' ? phones.wave : selected === 'orange' ? phones.orange : phones.free}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selected === 'wave' ? phones.wave : selected === 'orange' ? phones.orange : phones.free, selected)}
                    className="text-gray-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition"
                  >
                    {copiedField === selected ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100 dark:border-slate-700 text-xs text-gray-600 dark:text-slate-400 space-y-1.5">
                  <p className="flex items-start gap-2"><span className={`font-bold ${activeProvider.text}`}>1.</span> Ouvrez l&apos;app {activeProvider.label}</p>
                  <p className="flex items-start gap-2"><span className={`font-bold ${activeProvider.text}`}>2.</span> Envoyez <strong>{formatCurrency(amount)}</strong> au numéro ci-dessus</p>
                  <p className="flex items-start gap-2"><span className={`font-bold ${activeProvider.text}`}>3.</span> Indiquez la référence : <strong className="font-mono">{reference}</strong></p>
                </div>
              </div>

              <a
                href={buildDeeplink(selected, selected === 'wave' ? phones.wave : selected === 'orange' ? phones.orange : phones.free, amount, reference)}
                className="mt-3 w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl transition active:scale-[0.98]"
                style={{ backgroundColor: activeProvider.color }}
              >
                <Smartphone size={18} />
                Ouvrir {activeProvider.label}
              </a>
            </div>

            {/* WhatsApp confirmation */}
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-900/40">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-2">
                <Shield size={14} />
                Validation plus rapide
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed mb-3">
                Envoyez la capture d&apos;écran de confirmation par WhatsApp pour une validation sous 5 min.
              </p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-green-700 transition"
              >
                <MessageCircle size={14} />
                Confirmer sur WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sécurité badges */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        {[{ icon: Shield, label: 'Sécurisé' }, { icon: Building2, label: 'Marchand vérifié' }, { icon: Smartphone, label: 'Paiement mobile' }].map((b, i) => (
          <div key={i} className="flex flex-col items-center text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg min-h-[72px] justify-center">
            <b.icon className="w-5 h-5 text-emerald-500 mb-1.5" />
            <span className="text-xs text-gray-600 dark:text-slate-400 font-medium leading-tight">{b.label}</span>
          </div>
        ))}
      </div>

      {/* Paiement à la livraison - option secondaire */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
        <button
          onClick={() => setShowCod(!showCod)}
          className="w-full flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
        >
          <span className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Préférez-vous payer à la livraison ?
          </span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showCod ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {showCod && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-400">
                <p className="mb-2">
                  Le paiement à la livraison est disponible pour certaines commandes. Veuillez nous contacter pour confirmer l&apos;éligibilité.
                </p>
                <div className="flex gap-2">
                  <Link
                    href={whatsappLink}
                    target="_blank"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-green-700 transition"
                  >
                    <MessageCircle size={14} />
                    Demander sur WhatsApp
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
