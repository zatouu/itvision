'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw, Shield, Coins, ToggleLeft, AlertTriangle, Sparkles } from 'lucide-react'

type AiFeatureMode = 'free' | 'quota' | 'eligible' | 'points'

const AI_FEATURES: { key: string; label: string; audience: 'client' | 'provider'; vision?: boolean }[] = [
  { key: 'clarify_request', label: 'Questions de précision (demande)', audience: 'client' },
  { key: 'enhance_request', label: 'Reformulation de la demande', audience: 'client' },
  { key: 'photo_analysis', label: 'Analyse des photos (vision)', audience: 'client', vision: true },
  { key: 'analyze_request', label: 'Analyse d\'une demande', audience: 'provider' },
  { key: 'mission_help', label: 'Aide pendant la mission', audience: 'provider' },
  { key: 'suggest_offer', label: 'Suggestion de prix / offre', audience: 'provider' },
  { key: 'daily_tips', label: 'Conseils du jour', audience: 'provider' },
]

const AI_MODE_LABELS: Record<AiFeatureMode, string> = {
  free: 'Gratuit',
  quota: 'Quota/jour puis XC',
  eligible: 'Gratuit si éligible, sinon quota puis XC',
  points: 'XC uniquement',
}

type AiConfigData = {
  enabled: boolean
  freeUntil?: string
  features: Record<string, { enabled: boolean; mode: AiFeatureMode }>
  eligibility: { minCompletedMissions: number; minScoreXeuy: number; minReliability: number; requireKyc: boolean }
  pricing: { textCostPoints: number; visionCostPoints: number }
  dailyFreeQuota: { client: number; provider: number }
  maxImagesPerCall: number
}

const DEFAULT_AI: AiConfigData = {
  enabled: true,
  features: Object.fromEntries(AI_FEATURES.map(f => [f.key, { enabled: true, mode: (f.key === 'daily_tips' ? 'free' : 'quota') as AiFeatureMode }])),
  eligibility: { minCompletedMissions: 10, minScoreXeuy: 70, minReliability: 80, requireKyc: true },
  pricing: { textCostPoints: 1, visionCostPoints: 3 },
  dailyFreeQuota: { client: 2, provider: 2 },
  maxImagesPerCall: 3,
}

type AppConfigData = {
  ai?: AiConfigData
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

function withAiDefaults(cfg: AppConfigData): AppConfigData {
  const ai = cfg.ai || ({} as Partial<AiConfigData>)
  return {
    ...cfg,
    ai: {
      ...DEFAULT_AI,
      ...ai,
      features: { ...DEFAULT_AI.features, ...(ai.features || {}) },
      eligibility: { ...DEFAULT_AI.eligibility, ...(ai.eligibility || {}) },
      pricing: { ...DEFAULT_AI.pricing, ...(ai.pricing || {}) },
      dailyFreeQuota: { ...DEFAULT_AI.dailyFreeQuota, ...(ai.dailyFreeQuota || {}) },
    },
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
        setConfig(withAiDefaults(data.config))
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
          ai: config.ai,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Configuration sauvegardée avec succès')
        setConfig(withAiDefaults(data.config))
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

  const ai = config?.ai || DEFAULT_AI
  const updateAi = (patch: Partial<AiConfigData>) => {
    if (!config) return
    setConfig({ ...config, ai: { ...ai, ...patch } })
  }
  const updateAiFeature = (key: string, patch: Partial<{ enabled: boolean; mode: AiFeatureMode }>) => {
    updateAi({ features: { ...ai.features, [key]: { ...(ai.features[key] || { enabled: true, mode: 'quota' }), ...patch } } })
  }

  const inputCls = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const toggleCls = "w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"

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
        <h1 className="text-2xl font-bold text-stone-900">Configuration Plateforme</h1>
        <p className="text-sm text-stone-500 mt-1">
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
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Coins className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900">Monétisation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Mode de monétisation
                </label>
                <select
                  value={config.monetization.mode}
                  onChange={(e) => updateMonetization('mode', e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="free">Gratuit (accumulation de XC)</option>
                  <option value="points">XC (consommation)</option>
                  <option value="commission">Commission (% sur transactions)</option>
                </select>
                <p className="text-xs text-stone-500 mt-1">
                  En mode gratuit, les XC s'accumulent mais ne sont pas consommés.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Gratuit jusqu'au
                </label>
                <input
                  type="date"
                  value={config.monetization.freeUntil ? config.monetization.freeUntil.split('T')[0] : ''}
                  onChange={(e) => updateMonetization('freeUntil', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Laissez vide pour ne pas définir de date butoir.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  XC par mission gagnée (provider)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.pointsPerWonMission}
                  onChange={(e) => updateMonetization('pointsPerWonMission', Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  XC de bienvenue (nouveau user)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.welcomePoints}
                  onChange={(e) => updateMonetization('welcomePoints', Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Bonus parrainage (XC)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.referralBonusPoints}
                  onChange={(e) => updateMonetization('referralBonusPoints', Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Commission (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.monetization.commissionRate}
                  onChange={(e) => updateMonetization('commissionRate', Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  FCFA par XC (taux recharge)
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.monetization.fcfaPerPoint}
                  onChange={(e) => updateMonetization('fcfaPerPoint', Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Coût escrow (XC client)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.monetization.escrowCostPoints}
                  onChange={(e) => updateMonetization('escrowCostPoints', Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-stone-500 mt-1">
                  XC prélevés au client pour chaque paiement sécurisé.
                </p>
              </div>
            </div>
          </section>

          {/* ─── Escrow ─── */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ToggleLeft className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900">Escrow & Litiges</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between md:block">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Escrow activé
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.escrow.enabled}
                    onChange={(e) => updateEscrow('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              <div className="flex items-center justify-between md:block">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Escrow obligatoire
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.escrow.mandatory}
                    onChange={(e) => updateEscrow('mandatory', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Fenêtre de litige (heures)
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.escrow.disputeWindowHours}
                  onChange={(e) => updateEscrow('disputeWindowHours', Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </section>

          {/* ─── Assistant IA ─── */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-violet-100 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">Assistant IA (apps mobiles)</h2>
                  <p className="text-xs text-stone-500">Gratuit au lancement, puis semi-premium : quota journalier, éligibilité prestataire, XC.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer gap-3">
                <span className="text-sm font-medium text-stone-700">{ai.enabled ? 'IA activée' : 'IA désactivée'}</span>
                <input type="checkbox" checked={ai.enabled} onChange={(e) => updateAi({ enabled: e.target.checked })} className="sr-only peer" />
                <div className={toggleCls} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Tout gratuit jusqu'au</label>
                <input
                  type="date"
                  value={ai.freeUntil ? ai.freeUntil.split('T')[0] : ''}
                  onChange={(e) => updateAi({ freeUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className={inputCls}
                />
                <p className="text-xs text-stone-500 mt-1">Tant que cette date n'est pas passée, les modes ci-dessous sont ignorés.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Appels gratuits / jour (client)</label>
                <input type="number" min={0} value={ai.dailyFreeQuota.client} onChange={(e) => updateAi({ dailyFreeQuota: { ...ai.dailyFreeQuota, client: Number(e.target.value) } })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Appels gratuits / jour (prestataire)</label>
                <input type="number" min={0} value={ai.dailyFreeQuota.provider} onChange={(e) => updateAi({ dailyFreeQuota: { ...ai.dailyFreeQuota, provider: Number(e.target.value) } })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Coût d'un appel texte (XC)</label>
                <input type="number" min={0} value={ai.pricing.textCostPoints} onChange={(e) => updateAi({ pricing: { ...ai.pricing, textCostPoints: Number(e.target.value) } })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Coût d'un appel avec photos (XC)</label>
                <input type="number" min={0} value={ai.pricing.visionCostPoints} onChange={(e) => updateAi({ pricing: { ...ai.pricing, visionCostPoints: Number(e.target.value) } })} className={inputCls} />
                <p className="text-xs text-stone-500 mt-1">La vision coûte 5 à 10× plus cher que le texte côté fournisseur.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Photos max par appel</label>
                <input type="number" min={1} max={5} value={ai.maxImagesPerCall} onChange={(e) => updateAi({ maxImagesPerCall: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-stone-800 mb-3">Fonctionnalités</h3>
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-2 py-2 font-medium">Fonction</th>
                    <th className="px-2 py-2 font-medium">Public</th>
                    <th className="px-2 py-2 font-medium">Mode</th>
                    <th className="px-2 py-2 font-medium text-right">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {AI_FEATURES.map((f) => {
                    const fc = ai.features[f.key] || { enabled: true, mode: 'quota' as AiFeatureMode }
                    return (
                      <tr key={f.key} className={fc.enabled ? '' : 'opacity-60'}>
                        <td className="px-2 py-2 text-stone-800">{f.label}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${f.audience === 'client' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {f.audience === 'client' ? 'Client' : 'Prestataire'}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <select value={fc.mode} onChange={(e) => updateAiFeature(f.key, { mode: e.target.value as AiFeatureMode })} className="w-full min-w-[12rem] rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            {(Object.keys(AI_MODE_LABELS) as AiFeatureMode[])
                              .filter(m => m !== 'eligible' || f.audience === 'provider')
                              .map(m => <option key={m} value={m}>{AI_MODE_LABELS[m]}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={fc.enabled} onChange={(e) => updateAiFeature(f.key, { enabled: e.target.checked })} className="sr-only peer" />
                            <div className={toggleCls} />
                          </label>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-stone-800 mt-6 mb-3">Éligibilité prestataire (mode « Gratuit si éligible »)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Missions terminées min.</label>
                <input type="number" min={0} value={ai.eligibility.minCompletedMissions} onChange={(e) => updateAi({ eligibility: { ...ai.eligibility, minCompletedMissions: Number(e.target.value) } })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Score Xeuy min. (/100)</label>
                <input type="number" min={0} max={100} value={ai.eligibility.minScoreXeuy} onChange={(e) => updateAi({ eligibility: { ...ai.eligibility, minScoreXeuy: Number(e.target.value) } })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Fiabilité min. (/100)</label>
                <input type="number" min={0} max={100} value={ai.eligibility.minReliability} onChange={(e) => updateAi({ eligibility: { ...ai.eligibility, minReliability: Number(e.target.value) } })} className={inputCls} />
              </div>
              <div className="flex items-center justify-between md:block">
                <label className="block text-sm font-medium text-stone-700 mb-2">KYC vérifié requis</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={ai.eligibility.requireKyc} onChange={(e) => updateAi({ eligibility: { ...ai.eligibility, requireKyc: e.target.checked } })} className="sr-only peer" />
                  <div className={toggleCls} />
                </label>
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
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 text-stone-700 px-5 py-2.5 text-sm font-medium hover:bg-stone-50 transition disabled:opacity-50"
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
