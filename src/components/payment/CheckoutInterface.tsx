'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Phone, Smartphone, Copy, Check, Info } from 'lucide-react'
import type { PaymentSettings } from '@/lib/payments/settings'

interface CheckoutInterfaceProps {
  participant: {
    name: string
    phone: string
    amount: number
    reference: string
    status: string
    // Nouveaux champs pour décomposition
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
  const [activeTab, setActiveTab] = useState<'gateway' | 'manual' | 'other'>(
    settings.providers.gateway.active ? 'gateway' : 'manual'
  )
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGatewayPayment = async () => {
    if (loading) return
    setLoading(true)

    try {
      const response = await fetch('/api/payment/paydunya/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reference: participant.reference })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur inconnue')
      }

      // Redirection vers PayDunya
      window.location.href = data.url
    } catch (error) {
      console.error(error)
      alert("Une erreur est survenue lors de l'initialisation du paiement.")
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount)
  }

  const isPaid = participant.status === 'paid'

  if (isPaid) {
    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-green-200">
             <div className="bg-green-600 px-6 py-8 text-center text-white">
                <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Check size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Paiement Validé !</h2>
                <p className="opacity-90">Merci {participant.name}, votre participation est confirmée.</p>
            </div>
            <div className="p-6">
                <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-gray-600">Produit</span>
                    <span className="font-medium">{group.productName}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-gray-600">Référence</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{participant.reference}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600">Montant payé</span>
                    <span className="font-bold text-green-600">{formatCurrency(participant.amount)}</span>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar Recap */}
      <div className="md:w-1/3 bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-slate-200">
        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">Récapitulatif</h3>
        
        <div className="mb-6">
          <p className="text-slate-600 text-sm mb-1">Produit</p>
          <p className="font-medium text-slate-800">{group.productName}</p>
        </div>

        {/* Décomposition des prix si disponible */}
        {participant.fees && (
          <div className="mb-6 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Fournisseur</span>
              <span>{formatCurrency(participant.fees.supplierCost)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Frais ({participant.fees.serviceFeeRate}%)</span>
              <span>{formatCurrency(participant.fees.serviceFeeAmount)}</span>
            </div>
            {participant.fees.serviceFeeSavings > 0 && (
              <div className="flex justify-between text-emerald-600 text-xs">
                <span>Économie B2B</span>
                <span>-{formatCurrency(participant.fees.serviceFeeSavings)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Assurance ({participant.fees.insuranceRate}%)</span>
              <span>{formatCurrency(participant.fees.insuranceAmount)}</span>
            </div>
            {participant.fees.quantityDiscount && participant.fees.quantityDiscount.amount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Réduction volume</span>
                <span>-{formatCurrency(participant.fees.quantityDiscount.amount)}</span>
              </div>
            )}
            {participant.shipping && (
              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                <span className="flex items-center gap-1">
                  Transport
                  {participant.shipping.weightDetails?.billingMethod === 'volumetric' && (
                    <span className="text-xs text-amber-600">(volumétrique)</span>
                  )}
                </span>
                <span>{formatCurrency(participant.shipping.totalCost)}</span>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <p className="text-slate-600 text-sm mb-1">Montant à payer</p>
          <p className="text-3xl font-bold text-indigo-600">{formatCurrency(participant.amount)}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Référence transaction</p>
          <div className="flex items-center justify-between">
            <code className="font-mono font-bold text-slate-700">{participant.reference}</code>
            <button onClick={() => copyToClipboard(participant.reference)} className="text-indigo-500 hover:text-indigo-700">
                {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-xs text-orange-600 mt-2 flex items-start gap-1">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>Important: Mettez cette référence dans le motif du paiement.</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:w-2/3 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Moyen de paiement</h1>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8 border-b border-slate-200 pb-1">
          {settings.providers.gateway.active && (
            <button
              onClick={() => setActiveTab('gateway')}
              className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'gateway' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard size={18} />
                <span>Paiement en ligne</span>
              </div>
              {activeTab === 'gateway' && (
                <motion.div layoutId="underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'manual' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Smartphone size={18} />
              <span>Wave / Orange Money</span>
            </div>
            {activeTab === 'manual' && (
              <motion.div layoutId="underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px]">
          {activeTab === 'gateway' && settings.providers.gateway.active && (
            <div className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-indigo-900">Paiement sécurisé</h4>
                        <p className="text-sm text-indigo-700 mt-1">
                            Vous allez être redirigé vers la plateforme sécurisée de notre partenaire 
                            <span className="capitalize font-bold"> {settings.providers.gateway.provider}</span>.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-slate-600">Cartes acceptées :</p>
                    <div className="flex gap-2">
                        <div className="h-8 w-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">VISA</div>
                        <div className="h-8 w-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">MC</div>
                        {settings.providers.gateway.provider === 'paydunya' && (
                            <div className="h-8 w-20 bg-blue-500 rounded border border-blue-600 flex items-center justify-center text-xs font-bold text-white">PayDunya</div>
                        )}
                        {settings.providers.gateway.provider === 'stripe' && (
                            <div className="h-8 w-16 bg-slate-800 rounded border border-slate-900 flex items-center justify-center text-xs font-bold text-white">Stripe</div>
                        )}
                    </div>
                </div>
                
                <button 
                    onClick={handleGatewayPayment}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <span>Initialisation...</span>
                    ) : (
                        <>
                            <span>Payer {formatCurrency(participant.amount)}</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Sécurisé</span>
                        </>
                    )}
                </button>
                
                <p className="text-center text-xs text-slate-400 mt-4">
                    Vos données de paiement sont chiffrées. Aucun stockage sur nos serveurs.
                </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-6">
                 <div className="grid gap-4">
                    {/* Wave */}
                    <div className="border rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer group pb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-100 p-2 rounded-full text-[#00b4d8]">
                                <Smartphone size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800">Wave</h4>
                            <span className="ml-auto bg-blue-100 text-[#00b4d8] text-xs font-bold px-2 py-1 rounded">Recommandé</span>
                        </div>
                        <div className="space-y-2 pl-12">
                             <p className="text-sm text-slate-600">Envoyez le montant au numéro suivant :</p>
                             <div className="flex items-center gap-2">
                                <span className="text-xl font-mono font-bold text-slate-900">{settings.providers.manual.waveMerchantPhone}</span>
                                <button onClick={() => copyToClipboard(settings.providers.manual.waveMerchantPhone)} className="text-slate-400 hover:text-blue-500 p-1">
                                    <Copy size={16} />
                                </button>
                             </div>
                             <p className="text-sm text-slate-600 mt-2">
                                Notez la référence <strong className="font-mono">{participant.reference}</strong> dans le transfert (ou envoyez-nous une capture).
                             </p>
                             
                             <a 
                                href={`https://wave.com/send?amount=${participant.amount}&recipient=${settings.providers.manual.waveMerchantPhone}&message=${participant.reference}`} 
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-2 text-sm bg-[#00b4d8] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#009bc2]"
                             >
                                Ouvrir l'application Wave
                             </a>
                        </div>
                    </div>

                    {/* Orange Money */}
                    <div className="border rounded-xl p-4 hover:border-orange-400 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-orange-100 p-2 rounded-full text-[#ff6b00]">
                                <Smartphone size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800">Orange Money</h4>
                        </div>
                        <div className="space-y-2 pl-12">
                             <p className="text-sm text-slate-600">Envoyez le montant au :</p>
                             <div className="flex items-center gap-2">
                                <span className="text-xl font-mono font-bold text-slate-900">{settings.providers.manual.orangeMerchantPhone}</span>
                                <button onClick={() => copyToClipboard(settings.providers.manual.orangeMerchantPhone)} className="text-slate-400 hover:text-orange-500 p-1">
                                    <Copy size={16} />
                                </button>
                             </div>
                             <p className="text-xs text-slate-500">Ou sur le code marchand si disponible.</p>
                        </div>
                    </div>
                 </div>

                 <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800 border border-amber-200">
                    <p className="font-semibold mb-1">Après votre paiement :</p>
                    <p>
                        Veuillez nous envoyer la capture d'écran ou l'ID de transaction par WhatsApp 
                        au <strong>{settings.providers.manual.waveMerchantPhone}</strong> pour validation rapide.
                    </p>
                 </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
