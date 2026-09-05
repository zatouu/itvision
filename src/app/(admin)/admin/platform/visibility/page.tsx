'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw, Eye, Radio, Users, ShieldCheck, Sliders } from 'lucide-react'

type EscalationStage = {
  stage: number
  radiusKm: number
  delaySec: number
  minOffersToStop: number
  minProvidersToStop: number
}

type VisibilityConfig = {
  enabled: boolean
  requireKycForNotification: boolean
  browseScope: 'all' | 'category'
  defaultRadiusKm: number
  maxRadiusKm: number
  presenceFreshnessSec: number
  maxProvidersPerWave: number
  escalation: EscalationStage[]
  scoreWeights: {
    distance: number
    availability: number
    category: number
    rating: number
    responsiveness: number
  }
  fallback: {
    useLastKnownPosition: boolean
    useProfileCity: boolean
  }
}

export default function VisibilityConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<VisibilityConfig | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/visibility-config', { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
      }
    } catch (e) {
      setError('Erreur chargement configuration')
    } finally {
      setLoading(false)
    }
  }

  const updateStage = (index: number, field: keyof EscalationStage, value: number) => {
    if (!config) return
    const next = [...config.escalation]
    next[index] = { ...next[index], [field]: value }
    setConfig({ ...config, escalation: next })
  }

  const addStage = () => {
    if (!config) return
    const nextStage = config.escalation.length
    setConfig({
      ...config,
      escalation: [
        ...config.escalation,
        { stage: nextStage, radiusKm: 10, delaySec: 60, minOffersToStop: 1, minProvidersToStop: 5 },
      ],
    })
  }

  const removeStage = (index: number) => {
    if (!config) return
    setConfig({ ...config, escalation: config.escalation.filter((_, i) => i !== index) })
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/visibility-config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Configuration de visibilité sauvegardée')
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

  const handleReset = () => {
    fetchConfig()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Configuration introuvable'}</div>
      </div>
    )
  }

  const NumberField = ({
    label,
    value,
    onChange,
    min,
    max,
  }: {
    label: string
    value: number
    onChange: (v: number) => void
    min?: number
    max?: number
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-stone-700">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Eye className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Visibilité & Notifications</h1>
            <p className="text-sm text-stone-500">Paramètres du moteur d'escalade et de diffusion des missions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-stone-700 hover:bg-stone-50"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 text-emerald-800 p-4 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-stone-900">Interrupteurs principaux</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer">
              <div>
                <div className="font-medium text-stone-900">Visibility Engine activé</div>
                <div className="text-xs text-stone-500">Si désactivé, retour au mode legacy</div>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer">
              <div>
                <div className="font-medium text-stone-900">Exiger KYC pour recevoir les notifications</div>
                <div className="text-xs text-stone-500">Off = tout prestataire géolocalisé est notifié</div>
              </div>
              <input
                type="checkbox"
                checked={config.requireKycForNotification}
                onChange={(e) => setConfig({ ...config, requireKycForNotification: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-stone-900 mb-1">Demandes visibles dans l'app prestataire</div>
              <div className="text-xs text-stone-500 mb-3">Portée de navigation (écran "Demandes à proximité")</div>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="browseScope"
                    checked={config.browseScope === 'category'}
                    onChange={() => setConfig({ ...config, browseScope: 'category' })}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-stone-900">Uniquement ses métiers (recommandé)</div>
                    <div className="text-xs text-stone-500">Le prestataire ne voit que les demandes de ses catégories et sous-catégories</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="browseScope"
                    checked={config.browseScope === 'all'}
                    onChange={() => setConfig({ ...config, browseScope: 'all' })}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-stone-900">Toutes les catégories</div>
                    <div className="text-xs text-stone-500">Le prestataire voit toutes les demandes de la zone, quel que soit son métier</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-stone-900">Paramètres généraux</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Rayon par défaut (km)"
              value={config.defaultRadiusKm}
              onChange={(v) => setConfig({ ...config, defaultRadiusKm: v })}
              min={1}
              max={500}
            />
            <NumberField
              label="Rayon max d'escalade (km)"
              value={config.maxRadiusKm}
              onChange={(v) => setConfig({ ...config, maxRadiusKm: v })}
              min={1}
              max={1000}
            />
            <NumberField
              label="Fraîcheur position (sec)"
              value={config.presenceFreshnessSec}
              onChange={(v) => setConfig({ ...config, presenceFreshnessSec: v })}
              min={30}
              max={86400}
            />
            <NumberField
              label="Max prestataires/vague"
              value={config.maxProvidersPerWave}
              onChange={(v) => setConfig({ ...config, maxProvidersPerWave: v })}
              min={1}
              max={500}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-stone-900">Vagues d'escalade</h2>
          </div>
          <button
            onClick={addStage}
            className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
          >
            + Ajouter un palier
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-3 py-2 text-left">Palier</th>
                <th className="px-3 py-2 text-left">Rayon (km)</th>
                <th className="px-3 py-2 text-left">Délai (sec)</th>
                <th className="px-3 py-2 text-left">Arrêt offres</th>
                <th className="px-3 py-2 text-left">Arrêt notifiés</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {config.escalation.map((stage, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 font-medium">{stage.stage}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={stage.radiusKm}
                      min={1}
                      onChange={(e) => updateStage(i, 'radiusKm', Number(e.target.value))}
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={stage.delaySec}
                      min={0}
                      onChange={(e) => updateStage(i, 'delaySec', Number(e.target.value))}
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={stage.minOffersToStop}
                      min={0}
                      onChange={(e) => updateStage(i, 'minOffersToStop', Number(e.target.value))}
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={stage.minProvidersToStop}
                      min={0}
                      onChange={(e) => updateStage(i, 'minProvidersToStop', Number(e.target.value))}
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {config.escalation.length > 1 && (
                      <button
                        onClick={() => removeStage(i)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-stone-900">Poids du scoring</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(config.scoreWeights).map(([key, val]) => (
              <NumberField
                key={key}
                label={key}
                value={val}
                onChange={(v) =>
                  setConfig({
                    ...config,
                    scoreWeights: { ...config.scoreWeights, [key]: v },
                  })
                }
                min={0}
                max={10}
              />
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-stone-900">Fallbacks</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer">
              <div className="font-medium text-stone-900">Dernière position connue</div>
              <input
                type="checkbox"
                checked={config.fallback.useLastKnownPosition}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fallback: { ...config.fallback, useLastKnownPosition: e.target.checked },
                  })
                }
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer">
              <div className="font-medium text-stone-900">Ville du profil</div>
              <input
                type="checkbox"
                checked={config.fallback.useProfileCity}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fallback: { ...config.fallback, useProfileCity: e.target.checked },
                  })
                }
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="text-xs text-stone-400">
        Modification sans redéploiement. Prise en compte dans les 30 secondes (cache de configuration).
      </div>
    </div>
  )
}
