'use client'

import { useState, useEffect } from 'react'
import {
  X, MessageCircle, User, Phone, Hash, MapPin,
  Package, Send, Minus, Plus, ShoppingBag, CreditCard,
  CheckCircle, AlertCircle, Info
} from 'lucide-react'

const WA_NUMBER = '221781234567'

export interface OrderLine {
  productId: string
  productName: string
  priceAmount?: number
  currency?: string
  image?: string
  quantity?: number
}

interface WhatsAppOrderDrawerProps {
  isOpen: boolean
  onClose: () => void
  line: OrderLine
}

function generateWhatsAppMessage(
  line: OrderLine,
  buyer: BuyerInfo,
  notes: string
): string {
  const total = line.priceAmount ? line.priceAmount * buyer.quantity : undefined
  const lines: string[] = [
    '*Bonjour IT Vision,*',
    '',
    '*Je souhaite commander :*',
    `• Produit : ${line.productName}`,
    `• Référence : ${line.productId}`,
    `• Quantité : ${buyer.quantity}`,
  ]

  if (line.priceAmount !== undefined) {
    lines.push(
      `• Prix unitaire : ${Math.round(line.priceAmount).toLocaleString('fr-FR')} ${line.currency || 'FCFA'}`
    )
  }
  if (total !== undefined) {
    lines.push(
      `• *Total estimé : ${Math.round(total).toLocaleString('fr-FR')} ${line.currency || 'FCFA'}*`
    )
  }

  lines.push(
    '',
    '*Coordonnées du client :*',
    `• Nom : ${buyer.name}`,
    `• Téléphone : ${buyer.phone}`,
  )

  if (buyer.company.trim()) {
    lines.push(`• Entreprise : ${buyer.company}`)
  }
  if (buyer.location.trim()) {
    lines.push(`• Localisation : ${buyer.location}`)
  }

  if (notes.trim()) {
    lines.push('', '*Notes :*', notes.trim())
  }

  lines.push('', '*Merci de me confirmer la disponibilité et les modalités de livraison.*')

  return lines.join('\n')
}

interface BuyerInfo {
  name: string
  phone: string
  company: string
  location: string
  quantity: number
}

export default function WhatsAppOrderDrawer({ isOpen, onClose, line }: WhatsAppOrderDrawerProps) {
  const [buyer, setBuyer] = useState<BuyerInfo>({
    name: '',
    phone: '',
    company: '',
    location: '',
    quantity: line.quantity ?? 1,
  })
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof BuyerInfo, string>>>({})
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSent(false)
      setErrors({})
      // Tentative de récupération du nom/tel depuis localStorage
      try {
        const saved = localStorage.getItem('itvision:buyerInfo')
        if (saved) {
          const parsed = JSON.parse(saved)
          setBuyer((prev) => ({
            ...prev,
            name: parsed.name || prev.name,
            phone: parsed.phone || prev.phone,
            company: parsed.company || prev.company,
            location: parsed.location || prev.location,
          }))
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setBuyer((prev) => ({ ...prev, quantity: line.quantity ?? 1 }))
    }
  }, [line.productId, isOpen])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof BuyerInfo, string>> = {}
    if (!buyer.name.trim()) errs.name = 'Votre nom est requis'
    if (!buyer.phone.trim()) errs.phone = 'Un numéro de téléphone est requis'
    else {
      const digits = buyer.phone.replace(/\D/g, '')
      if (digits.length < 8) errs.phone = 'Numéro invalide (min 8 chiffres)'
    }
    if (buyer.quantity < 1) errs.quantity = 'Minimum 1'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const msg = generateWhatsAppMessage(line, buyer, notes)
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`

    // Sauvegarder les infos client pour la prochaine fois
    try {
      localStorage.setItem(
        'itvision:buyerInfo',
        JSON.stringify({
          name: buyer.name,
          phone: buyer.phone,
          company: buyer.company,
          location: buyer.location,
        })
      )
    } catch {
      // ignore
    }

    window.open(url, '_blank', 'noopener,noreferrer')
    setSent(true)
    setTimeout(() => {
      onClose()
      setSent(false)
    }, 1200)
  }

  const total = line.priceAmount ? line.priceAmount * buyer.quantity : undefined

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Commander sur WhatsApp</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tous les champs sont transmis à IT Vision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Produit récap */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
            <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-600">
              {line.image ? (
                <img src={line.image} alt={line.productName} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{line.productName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {line.priceAmount !== undefined ? (
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                    {Math.round(line.priceAmount).toLocaleString('fr-FR')} {line.currency || 'FCFA'}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Prix sur devis</span>
                )}
                <span className="text-xs text-gray-400">· Réf. {line.productId.slice(-6)}</span>
              </div>
            </div>
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              <ShoppingBag className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
              Quantité
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBuyer((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                className="w-10 h-10 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white w-8 text-center">
                {buyer.quantity}
              </span>
              <button
                type="button"
                onClick={() => setBuyer((p) => ({ ...p, quantity: p.quantity + 1 }))}
                className="w-10 h-10 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              {total !== undefined && (
                <span className="ml-auto text-sm font-extrabold text-green-600 dark:text-green-400">
                  = {Math.round(total).toLocaleString('fr-FR')} {line.currency || 'FCFA'}
                </span>
              )}
            </div>
          </div>

          {/* Infos acheteur */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <User className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
              Vos informations
            </label>

            <div>
              <input
                type="text"
                placeholder="Votre nom complet *"
                value={buyer.name}
                onChange={(e) => setBuyer((p) => ({ ...p, name: e.target.value }))}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all dark:bg-slate-800 dark:text-white ${
                  errors.name ? 'border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-900/10' : 'border-gray-200 dark:border-slate-700'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
            </div>

            <div>
              <input
                type="tel"
                placeholder="Téléphone (WhatsApp) *"
                value={buyer.phone}
                onChange={(e) => setBuyer((p) => ({ ...p, phone: e.target.value }))}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all dark:bg-slate-800 dark:text-white ${
                  errors.phone ? 'border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-900/10' : 'border-gray-200 dark:border-slate-700'
                }`}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.phone}</p>}
            </div>

            <input
              type="text"
              placeholder="Entreprise (optionnel)"
              value={buyer.company}
              onChange={(e) => setBuyer((p) => ({ ...p, company: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all dark:bg-slate-800 dark:text-white"
            />

            <input
              type="text"
              placeholder="Ville / Localisation (optionnel)"
              value={buyer.location}
              onChange={(e) => setBuyer((p) => ({ ...p, location: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              <Info className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
              Notes (optionnel)
            </label>
            <textarea
              placeholder="Spécifications particulières, délai souhaité, questions..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Aperçu message */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Aperçu du message</p>
            <pre className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
              {generateWhatsAppMessage(line, buyer, notes)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-5 py-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl">
          {sent ? (
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-bold text-sm">
              <CheckCircle className="h-5 w-5" />
              WhatsApp ouvert avec votre commande
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-sm transition-colors shadow-lg shadow-green-500/20"
            >
              <Send className="h-4 w-4" />
              {total !== undefined
                ? `Commander pour ${Math.round(total).toLocaleString('fr-FR')} ${line.currency || 'FCFA'}`
                : 'Commander sur WhatsApp'}
              <CreditCard className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
