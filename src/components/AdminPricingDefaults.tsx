 'use client'

import { useEffect, useState } from 'react'
import { Settings, Percent, DollarSign, TrendingUp, Save, Loader2 } from 'lucide-react'

interface PricingDefaults {
  defaultExchangeRate: number
  defaultServiceFeeRate: number
  defaultInsuranceRate: number
  defaultMarginRate: number
}

const DEFAULT_VALUES: PricingDefaults = {
  defaultExchangeRate: 100,
  defaultServiceFeeRate: 10,
  defaultInsuranceRate: 2.5,
  defaultMarginRate: 25
}

export default function AdminPricingDefaults() {
  const [defaults, setDefaults] = useState<PricingDefaults | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => setDefaults({ ...DEFAULT_VALUES, ...(d.defaults || {}) }))
      .catch(() => setDefaults(DEFAULT_VALUES))
  }, [])

  if (!defaults) return (
    <div className="bg-white rounded-xl border p-6 mb-6 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults)
      })
      const data = await res.json()
      if (data.success) {
        setDefaults({ ...DEFAULT_VALUES, ...data.defaults })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Simulation de prix pour prévisualisation
  const examplePrice1688 = 50 // 50 ¥
  const baseCostFCFA = examplePrice1688 * defaults.defaultExchangeRate
  const marginAmount = baseCostFCFA * (defaults.defaultMarginRate / 100)
  const salePriceBase = baseCostFCFA + marginAmount
  const serviceFee = baseCostFCFA * (defaults.defaultServiceFeeRate / 100)
  const insurance = baseCostFCFA * (defaults.defaultInsuranceRate / 100)
  const totalPrice = salePriceBase + serviceFee + insurance

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-emerald-600" />
        <h3 className="text-lg font-bold text-gray-900">⚙️ Paramètres de pricing</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Ces paramètres s'appliquent par défaut à tous les produits importés. 
        Vous pouvez les surcharger individuellement sur chaque produit.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Taux de change */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <label className="block">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2">
              <DollarSign className="h-4 w-4" />
              Taux de change
            </div>
            <div className="text-xs text-blue-600 mb-2">1 ¥ (Yuan) = X FCFA</div>
            <input 
              type="number" 
              className="w-full rounded-lg border-blue-300 px-3 py-2 text-lg font-bold text-center focus:ring-2 focus:ring-blue-500" 
              value={defaults.defaultExchangeRate}
              onChange={e => setDefaults({ ...defaults, defaultExchangeRate: Number(e.target.value) })} 
            />
          </label>
        </div>

        {/* Marge commerciale */}
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <label className="block">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
              <TrendingUp className="h-4 w-4" />
              Marge commerciale
            </div>
            <div className="text-xs text-emerald-600 mb-2">Appliquée sur le coût source</div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="1"
                className="w-full rounded-lg border-emerald-300 px-3 py-2 text-lg font-bold text-center focus:ring-2 focus:ring-emerald-500" 
                value={defaults.defaultMarginRate}
                onChange={e => setDefaults({ ...defaults, defaultMarginRate: Number(e.target.value) })} 
              />
              <span className="text-emerald-700 font-bold">%</span>
            </div>
          </label>
        </div>

        {/* Frais de service */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <label className="block">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-800 mb-2">
              <Percent className="h-4 w-4" />
              Frais de service
            </div>
            <div className="text-xs text-orange-600 mb-2">Sourcing, qualité, suivi</div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.5"
                className="w-full rounded-lg border-orange-300 px-3 py-2 text-lg font-bold text-center focus:ring-2 focus:ring-orange-500" 
                value={defaults.defaultServiceFeeRate}
                onChange={e => setDefaults({ ...defaults, defaultServiceFeeRate: Number(e.target.value) })} 
              />
              <span className="text-orange-700 font-bold">%</span>
            </div>
          </label>
        </div>

        {/* Assurance */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <label className="block">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 mb-2">
              <Percent className="h-4 w-4" />
              Assurance
            </div>
            <div className="text-xs text-purple-600 mb-2">Protection marchandise</div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.1"
                className="w-full rounded-lg border-purple-300 px-3 py-2 text-lg font-bold text-center focus:ring-2 focus:ring-purple-500" 
                value={defaults.defaultInsuranceRate}
                onChange={e => setDefaults({ ...defaults, defaultInsuranceRate: Number(e.target.value) })} 
              />
              <span className="text-purple-700 font-bold">%</span>
            </div>
          </label>
        </div>
      </div>

      {/* Prévisualisation */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">📊 Exemple de calcul (produit à {examplePrice1688} ¥)</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-gray-500 text-xs">Prix source</div>
            <div className="font-bold text-blue-600">{baseCostFCFA.toLocaleString('fr-FR')} FCFA</div>
            <div className="text-[10px] text-gray-400">Affiché sur l'accueil</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-gray-500 text-xs">+ Marge ({defaults.defaultMarginRate}%)</div>
            <div className="font-bold text-emerald-600">+{marginAmount.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-gray-500 text-xs">+ Service ({defaults.defaultServiceFeeRate}%)</div>
            <div className="font-bold text-orange-600">+{serviceFee.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-gray-500 text-xs">+ Assurance ({defaults.defaultInsuranceRate}%)</div>
            <div className="font-bold text-purple-600">+{insurance.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div className="text-center p-2 bg-emerald-100 rounded border border-emerald-300">
            <div className="text-gray-500 text-xs">Prix final client</div>
            <div className="font-bold text-emerald-700 text-lg">{Math.round(totalPrice).toLocaleString('fr-FR')} FCFA</div>
            <div className="text-[10px] text-gray-500">Affiché sur la page produit</div>
          </div>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex items-center gap-3">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50" 
          onClick={save} 
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer
            </>
          )}
        </button>
        {saved && (
          <span className="text-emerald-600 text-sm font-medium animate-pulse">
            ✅ Paramètres sauvegardés !
          </span>
        )}
      </div>
    </div>
  )
}
