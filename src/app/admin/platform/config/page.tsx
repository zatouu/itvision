'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw, Shield, Coins, ToggleLeft, AlertTriangle } from 'lucide-react'

type AppConfigData = {
  monetization: {
    mode: 'free' | 'points' | 'commission'
    freeUntil?: string
    pointsPerWonMission: number
    welcomePoints: number
    referralBonusPoints: number
    commissionRate: number
    fcfaPerPoint: number
    escrowCostPoints: number
  }
  escrow: {
    enabled: boolean
    mandatory: boolean
    disputeWindowHours: number
  }
}

export default function PlatformConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<AppConfigData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/platform/config', { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
      }
    } catch (e) {
      setError('Erreur chargement config')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/platform/config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monetization: config.monetization,
          escrow: config.escrow,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Configuration sauvegardée avec succès')
        setConfig(data.config)
      } else {
        setError(data.error || 'Erreur sauvegarde')
      }
    } catch (e) {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const updateMonetization = (field: keyof AppConfigData['monetization'], value: any) => {
    if (!config) return
    setConfig({ ...config, monetization: { ...config.monetization, [field]: value } })
  }

  const updateEscrow = (field: keyof AppConfigData['escrow'], value: any) => {
    if (!config) return
    setConfig({ ...config, escrow: { ...config.escrow, [field]: value } })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuration Plateforme</h1>
        <p className="text-sm text-gray-500 mt-1">
          Activez/désactivez les fonctionnalités et ajustez les paramètres de monétisation.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <Shield className="h-4 w-4" />
          {success}
        </div>
      )}

      {config && (
        <div className="space-y-6">
          {/* ─── Monétisation ─── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Coins className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Monétisation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de monétisation
                </label>
                <select
                  value={config.monetization.mode}
                  onChange={(e) => updateMonetization('mode', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="free">Gratuit (accumulation de XC)</option>
                  <option value="points">XC (consommation)</option>
                  <option value="commission">Commission (% sur transactions)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  En mode gratuit, les XC s'accumulent mais ne sont pas consommés.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gratuit jusqu'au
                </label>
                <input
                  type="date"
                  value={config.monetization.freeUntil ? config.monetization.freeUntil.split('T')[0] : ''}
                  onChange={(e) => updateMonetization('freeUntil', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Laissez vide pour ne pas définir de date butoir.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  XC par mission gagnée (provider)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.pointsPerWonMission}
                  onChange={(e) => updateMonetization('pointsPerWonMission', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  XC de bienvenue (nouveau user)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.welcomePoints}
                  onChange={(e) => updateMonetization('welcomePoints', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bonus parrainage (XC)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.referralBonusPoints}
                  onChange={(e) => updateMonetization('referralBonusPoints', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.monetization.commissionRate}
                  onChange={(e) => updateMonetization('commissionRate', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FCFA par XC (taux recharge)
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.monetization.fcfaPerPoint}
                  onChange={(e) => updateMonetization('fcfaPerPoint', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coût escrow (XC client)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.escrowCostPoints}
                  onChange={(e) => updateMonetization('escrowCostPoints', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  XC prélevés au client pour chaque paiement sécurisé.
                </p>
              </div>
            </div>
          </section>

          {/* ─── Escrow ─── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ToggleLeft className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Escrow & Litiges</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between md:block">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escrow activé
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.escrow.enabled}
                    onChange={(e) => updateEscrow('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              <div className="flex items-center justify-between md:block">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escrow obligatoire
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.escrow.mandatory}
                    onChange={(e) => updateEscrow('mandatory', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fenêtre de litige (heures)
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.escrow.disputeWindowHours}
                  onChange={(e) => updateEscrow('disputeWindowHours', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </section>

          {/* ─── Actions ─── */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={fetchConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
