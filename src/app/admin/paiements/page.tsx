'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard, 
  Settings, 
  Smartphone, 
  ShieldCheck, 
  AlertCircle, 
  Save, 
  RotateCw,
  Eye,
  EyeOff
} from 'lucide-react'

// Doit correspondre à src/lib/payments/settings.ts
type PaymentSettings = {
  groupOrders: {
    enabled: boolean
    chatEnabled: boolean
    paymentLinksEnabled: boolean
    paymentManagementEnabled: boolean
  },
  providers: {
    manual: {
      waveMerchantPhone: string
      orangeMerchantPhone: string
      instructions: string
    },
    gateway: {
      active: boolean
      provider: 'paydunya' | 'stripe' | 'cinetpay'
      apiKey: string
      apiSecret: string
      merchantId: string
    },
    escrow: {
      enabled: boolean
      holdPercentage: number
    }
  }
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'manual' | 'gateway' | 'escrow'>('general')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/payment-settings')
      const data = await res.json()
      if (data?.success && data?.settings) {
        setSettings(data.settings)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const data = await res.json().catch(() => ({}))
      if (data?.success && data?.settings) {
        setSettings(data.settings)
        setMessage('Configuration enregistrée avec succès')
      } else {
        setMessage(data?.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      setMessage('Erreur critique lors de l\'enregistrement')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        Chargement de la configuration...
      </div>
    )
  }

  const tabs = [
    { id: 'general', label: 'Général & Features', icon: Settings },
    { id: 'manual', label: 'Mobile Money (P2P)', icon: Smartphone },
    { id: 'gateway', label: 'Passerelle API', icon: CreditCard },
    { id: 'escrow', label: 'Escrow / Garantie', icon: ShieldCheck }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuration des Paiements</h1>
            <p className="text-gray-500 text-sm mt-1">Gérez les méthodes de paiement, les clés API et les fonctionnalités.</p>
          </div>
          <div className="flex items-center gap-2">
             <button
              onClick={load}
              className="p-2 text-gray-600 hover:bg-white rounded-lg transition"
              title="Recharger"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition shadow-sm disabled:opacity-50"
            >
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border flex items-center gap-3 ${message.includes('Erreur') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
          >
            <AlertCircle className="w-5 h-5" />
            {message}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white border-b-2 border-emerald-500 text-emerald-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8">
          
          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Fonctionnalités Achats Groupés</h2>
              <div className="grid gap-4">
                <Toggle 
                  label="Activer les achats groupés" 
                  description="Permet la création et l'inscription aux achats groupés sur le site public."
                  checked={settings.groupOrders.enabled} 
                  onChange={v => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, enabled: v } })} 
                />
                <Toggle 
                  label="Chat communautaire" 
                  description="Active l'espace de discussion pour les participants d'un groupe."
                  checked={settings.groupOrders.chatEnabled} 
                  onChange={v => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, chatEnabled: v } })} 
                />
                <Toggle 
                  label="Liens de paiement auto" 
                  description="Permet de générer des liens de paiement pour chaque participant."
                  checked={settings.groupOrders.paymentLinksEnabled} 
                  onChange={v => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, paymentLinksEnabled: v } })} 
                />
                <Toggle 
                  label="Gestion manuelle (Admin)" 
                  description="Autorise les administrateurs à marquer des commandes comme payées manuellement."
                  checked={settings.groupOrders.paymentManagementEnabled} 
                  onChange={v => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, paymentManagementEnabled: v } })} 
                />
              </div>
            </div>
          )}

          {/* MENUAL / P2P */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                 <h2 className="text-lg font-semibold text-gray-900">Mobile Money (Peer-to-Peer)</h2>
                 <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Mode Manuel</span>
              </div>
              <p className="text-sm text-gray-500">
                Ces numéros seront affichés aux clients pour effectuer leurs transferts manuellement. 
                Les instructions générées utiliseront ces valeurs.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro Marchand Wave</label>
                  <input 
                    type="text" 
                    value={settings.providers.manual.waveMerchantPhone}
                    onChange={e => setSettings({ ...settings, providers: { ...settings.providers, manual: { ...settings.providers.manual, waveMerchantPhone: e.target.value } } })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="+22177..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro Marchand Orange Money</label>
                  <input 
                    type="text" 
                    value={settings.providers.manual.orangeMerchantPhone}
                    onChange={e => setSettings({ ...settings, providers: { ...settings.providers, manual: { ...settings.providers.manual, orangeMerchantPhone: e.target.value } } })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="+22177..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions complémentaires</label>
                <textarea 
                  rows={4}
                  value={settings.providers.manual.instructions}
                  onChange={e => setSettings({ ...settings, providers: { ...settings.providers, manual: { ...settings.providers.manual, instructions: e.target.value } } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Paiement à la livraison possible sous conditions..."
                />
              </div>
            </div>
          )}

          {/* GATEWAY */}
          {activeTab === 'gateway' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                 <h2 className="text-lg font-semibold text-gray-900">Passerelle de Paiement Automatisée</h2>
                 <Toggle 
                    label="Activer l'intégration" 
                    checked={settings.providers.gateway.active} 
                    onChange={v => setSettings({ ...settings, providers: { ...settings.providers, gateway: { ...settings.providers.gateway, active: v } } })}
                    compact
                  />
              </div>
              
              <div className={`space-y-6 ${!settings.providers.gateway.active ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                  <div className="flex gap-4">
                    {['paydunya', 'cinetpay', 'stripe'].map(p => (
                      <button
                        key={p}
                        onClick={() => setSettings({ ...settings, providers: { ...settings.providers, gateway: { ...settings.providers.gateway, provider: p as any } } })}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize ${
                          settings.providers.gateway.provider === p 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clé API (Master Key / Public)</label>
                    <div className="relative">
                      <input 
                        type={showSecrets ? "text" : "password"}
                        value={settings.providers.gateway.apiKey}
                        onChange={e => setSettings({ ...settings, providers: { ...settings.providers, gateway: { ...settings.providers.gateway, apiKey: e.target.value } } })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
                        placeholder="Ex: sk_live_..."
                      />
                       <button onClick={() => setShowSecrets(!showSecrets)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                        {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Token Secret (Private Token)</label>
                    <div className="relative">
                      <input 
                        type={showSecrets ? "text" : "password"}
                        value={settings.providers.gateway.apiSecret}
                        onChange={e => setSettings({ ...settings, providers: { ...settings.providers, gateway: { ...settings.providers.gateway, apiSecret: e.target.value } } })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
                        placeholder="Ex: tk_..."
                      />
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant Marchand / Service ID</label>
                     <input 
                        type="text"
                        value={settings.providers.gateway.merchantId}
                        onChange={e => setSettings({ ...settings, providers: { ...settings.providers, gateway: { ...settings.providers.gateway, merchantId: e.target.value } } })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Optionnel selon fournisseur"
                      />
                  </div>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    L'activation remplacera l'affichage des instructions manuelles par un bouton de paiement redirigeant vers {settings.providers.gateway.provider}.
                    Assurez-vous que les clés sont valides en production.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ESCROW */}
          {activeTab === 'escrow' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Garantie & Escrow</h2>
              <div className="space-y-6">
                <Toggle 
                  label="Afficher la protection achats" 
                  description="Affiche les badges de garantie et le suivi détaillé des fonds pour rassurer le client."
                  checked={settings.providers.escrow.enabled} 
                  onChange={v => setSettings({ ...settings, providers: { ...settings.providers, escrow: { ...settings.providers.escrow, enabled: v } } })} 
                />

                <div className="opacity-75">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage de retenue (virtuel)</label>
                   <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="10"
                        value={settings.providers.escrow.holdPercentage}
                        onChange={e => setSettings({ ...settings, providers: { ...settings.providers, escrow: { ...settings.providers.escrow, holdPercentage: parseInt(e.target.value) } } })}
                        className="flex-1"
                      />
                      <span className="font-bold text-gray-900 w-16 text-right">{settings.providers.escrow.holdPercentage}%</span>
                   </div>
                   <p className="text-xs text-gray-500 mt-1">Indique au client quel pourcentage de son paiement est "sécurisé" avant livraison.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange, compact = false }: { label: string, description?: string, checked: boolean, onChange: (v: boolean) => void, compact?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${compact ? '' : 'bg-gray-50 p-4 rounded-lg border border-gray-100'}`}>
      <div>
        <div className={`font-semibold text-gray-900 ${compact ? 'text-base' : ''}`}>{label}</div>
        {description && <div className="text-xs text-gray-600 mt-1">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
          checked ? 'bg-emerald-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`${
            checked ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </button>
    </div>
  )
}
