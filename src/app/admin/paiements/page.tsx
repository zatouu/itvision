'use client'

import { useEffect, useState } from 'react'

type PaymentSettings = {
  groupOrders: {
    enabled: boolean
    chatEnabled: boolean
    paymentLinksEnabled: boolean
    paymentManagementEnabled: boolean
  }
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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

  useEffect(() => {
    load()
  }, [])

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
        setMessage('Paramètres enregistrés')
      } else {
        setMessage(data?.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      setMessage('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-white border rounded-xl p-6">Chargement…</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-white border rounded-xl p-6">Impossible de charger les paramètres.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white border rounded-xl p-6">
          <h1 className="text-xl font-bold text-gray-900">Paiements & fonctionnalités</h1>
          <p className="text-sm text-gray-600 mt-1">
            Active/désactive des fonctionnalités sensibles (achats groupés, chat, génération de liens).
          </p>

          {message && (
            <div className="mt-3 text-sm rounded-lg border px-3 py-2 bg-gray-50">
              {message}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">Achats groupés</div>
                <div className="text-xs text-gray-600">Bloque création & inscription côté public.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.groupOrders.enabled}
                onChange={(e) => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, enabled: e.target.checked } })}
                className="h-5 w-5"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">Chat achats groupés</div>
                <div className="text-xs text-gray-600">Désactive l\'accès chat côté participants.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.groupOrders.chatEnabled}
                onChange={(e) => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, chatEnabled: e.target.checked } })}
                className="h-5 w-5"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">Génération de liens de paiement</div>
                <div className="text-xs text-gray-600">Autorise l\'admin à générer/renvoyer des liens.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.groupOrders.paymentLinksEnabled}
                onChange={(e) => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, paymentLinksEnabled: e.target.checked } })}
                className="h-5 w-5"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">Gestion manuelle des paiements</div>
                <div className="text-xs text-gray-600">Autorise les actions admin: payé/partiel/remboursé.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.groupOrders.paymentManagementEnabled}
                onChange={(e) => setSettings({ ...settings, groupOrders: { ...settings.groupOrders, paymentManagementEnabled: e.target.checked } })}
                className="h-5 w-5"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              disabled={saving}
              onClick={save}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              disabled={saving}
              onClick={load}
              className="px-4 py-2 rounded-lg border font-semibold disabled:opacity-60"
            >
              Recharger
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900">Note</h2>
          <p className="text-xs text-gray-600 mt-1">
            Ces paramètres sont persistés dans <span className="font-mono">data/payment-settings.json</span> côté serveur.
          </p>
        </div>
      </div>
    </div>
  )
}
