'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink,
  CreditCard,
  Building,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react'

interface PaymentLink {
  provider: 'wave' | 'orange_money' | 'manual'
  url?: string
  phoneNumber?: string
  instructions: string
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  productName: string
  quantity: number
  unitPrice: number
  phone: string
  email?: string
}

export default function GroupBuyPaymentModal({
  isOpen,
  onClose,
  groupId,
  productName,
  quantity,
  unitPrice,
  phone,
  email
}: PaymentModalProps) {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([])
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange_money' | 'manual'>('wave')
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const totalAmount = quantity * unitPrice

  const fetchPaymentLinks = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/group-orders/${groupId}/payment-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération des liens')
      }
      
      setPaymentLinks(data.paymentLinks)
      setReference(data.payment.reference)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const sendPaymentEmail = async () => {
    setSendingEmail(true)
    try {
      const response = await fetch(`/api/group-orders/${groupId}/payment-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, sendEmail: true })
      })
      
      if (response.ok) {
        setEmailSent(true)
      }
    } catch {
      // Silently fail
    } finally {
      setSendingEmail(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  React.useEffect(() => {
    if (isOpen && paymentLinks.length === 0) {
      fetchPaymentLinks()
    }
  }, [isOpen])

  const selectedLink = paymentLinks.find(l => l.provider === selectedMethod)

  const methodConfig = {
    wave: {
      name: 'Wave',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      icon: '📱',
      recommended: true
    },
    orange_money: {
      name: 'Orange Money',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '📱',
      recommended: false
    },
    manual: {
      name: 'Autre méthode',
      color: 'from-gray-500 to-slate-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: '🏦',
      recommended: false
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white relative">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-1 rounded-full hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <CreditCard className="w-8 h-8 mb-2 opacity-90" />
              <h2 className="text-xl font-bold">Paiement Achat Groupé</h2>
              <p className="text-violet-100 text-sm">{productName}</p>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                  <p className="text-gray-500 mt-4">Génération des liens de paiement...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-red-600 font-medium">{error}</p>
                  <button
                    onClick={fetchPaymentLinks}
                    className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount Box */}
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-5 mb-6 border border-violet-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Montant à payer</p>
                        <p className="text-3xl font-bold text-violet-700">
                          {totalAmount.toLocaleString('fr-FR')} <span className="text-lg">FCFA</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {quantity} × {unitPrice.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Référence</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                            {reference || '...'}
                          </code>
                          {reference && (
                            <button
                              onClick={() => copyToClipboard(reference, 'reference')}
                              className="p-1 hover:bg-white rounded transition"
                            >
                              {copiedField === 'reference' ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-3 mb-6">
                    {(['wave', 'orange_money', 'manual'] as const).map((method) => {
                      const config = methodConfig[method]
                      const isSelected = selectedMethod === method
                      
                      return (
                        <button
                          key={method}
                          onClick={() => setSelectedMethod(method)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected 
                              ? `${config.borderColor} ${config.bgColor} shadow-sm` 
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{config.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{config.name}</span>
                                {config.recommended && (
                                  <span className="text-xs bg-cyan-500 text-white px-2 py-0.5 rounded-full">
                                    Recommandé
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Selected Method Details */}
                  {selectedLink && (
                    <div className={`rounded-xl border p-5 ${methodConfig[selectedMethod].bgColor} ${methodConfig[selectedMethod].borderColor}`}>
                      {selectedLink.phoneNumber && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-1">Numéro de paiement</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{selectedLink.phoneNumber}</span>
                            <button
                              onClick={() => copyToClipboard(selectedLink.phoneNumber || '', 'phone')}
                              className="p-1 hover:bg-white rounded transition"
                            >
                              {copiedField === 'phone' ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {selectedMethod === 'wave' && selectedLink.url && (
                        <a
                          href={selectedLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition mb-4"
                        >
                          <Smartphone className="w-5 h-5" />
                          Payer avec Wave
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      
                      <div className="text-sm text-gray-600 whitespace-pre-line">
                        {selectedLink.instructions.split('\n').slice(0, 8).join('\n')}
                      </div>
                    </div>
                  )}

                  {/* Email Instructions */}
                  {email && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={sendPaymentEmail}
                        disabled={sendingEmail || emailSent}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition disabled:opacity-50"
                      >
                        {sendingEmail ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : emailSent ? (
                          <>
                            <Check className="w-4 h-4" />
                            Instructions envoyées à {email}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Recevoir les instructions par email
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Warning */}
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">Important</p>
                        <p>
                          N&apos;oubliez pas d&apos;indiquer la référence <strong>{reference}</strong> lors de votre paiement pour que nous puissions l&apos;identifier rapidement.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
