'use client'

import { useState, useEffect } from 'react'
import ProtectedPage from '@/components/ProtectedPage'
import { Tag, RefreshCw, CheckCircle, AlertCircle, Eye, Zap } from 'lucide-react'

interface ProductPricingRow {
  id: string
  name: string
  category: string
  price: number
  b2bPrice: number | null
  hasB2bPrice: boolean
}

interface BatchResult {
  id: string
  name: string
  retailPrice: number
  oldB2bPrice: number | null
  newB2bPrice: number
  discount: string
}

function formatCurrency(v: number) {
  return `${v.toLocaleString('fr-FR')} FCFA`
}

export default function B2bPricingPage() {
  return (
    <ProtectedPage requiredRole={['ADMIN', 'SUPER_ADMIN']}>
      <B2bPricingContent />
    </ProtectedPage>
  )
}

function B2bPricingContent() {
  const [products, setProducts] = useState<ProductPricingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{ total: number; withB2bPrice: number; withoutB2bPrice: number } | null>(null)

  const [discountPercent, setDiscountPercent] = useState(15)
  const [force, setForce] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [applying, setApplying] = useState(false)
  const [batchResult, setBatchResult] = useState<{ preview: BatchResult[]; updatedCount: number; previewCount: number; dryRun: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'missing' | 'has'>('all')

  useEffect(() => {
    fetch('/api/admin/products/batch-b2b-pricing', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProducts(data.products || [])
          setSummary({ total: data.total, withB2bPrice: data.withB2bPrice, withoutB2bPrice: data.withoutB2bPrice })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRun = async () => {
    setError(null)
    setSuccess(null)
    setBatchResult(null)
    setApplying(true)
    try {
      const res = await fetch('/api/admin/products/batch-b2b-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ discountPercent, force, dryRun })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setBatchResult(data)
      if (!dryRun) {
        setSuccess(`${data.updatedCount} produit(s) mis à jour avec b2bPrice à -${discountPercent}%`)
        // Reload stats
        const r2 = await fetch('/api/admin/products/batch-b2b-pricing', { credentials: 'include' })
        const d2 = await r2.json()
        if (d2.success) {
          setProducts(d2.products || [])
          setSummary({ total: d2.total, withB2bPrice: d2.withB2bPrice, withoutB2bPrice: d2.withoutB2bPrice })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setApplying(false)
    }
  }

  const filteredProducts = products.filter(p => {
    if (filter === 'missing') return !p.hasB2bPrice
    if (filter === 'has') return p.hasB2bPrice
    return true
  })

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 flex items-center justify-center">
          <Tag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing B2B en masse</h1>
          <p className="text-sm text-gray-500">Calculer et appliquer le b2bPrice (prix volume) sur tous les produits</p>
        </div>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            <p className="text-xs text-gray-500 mt-1">Produits total</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{summary.withB2bPrice}</p>
            <p className="text-xs text-green-600 mt-1">Avec b2bPrice ✓</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{summary.withoutB2bPrice}</p>
            <p className="text-xs text-amber-600 mt-1">Sans b2bPrice ⚠</p>
          </div>
        </div>
      )}

      {/* Paramètres */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-600" />
          Paramètres du calcul
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remise volume : <span className="text-violet-700 font-bold">-{discountPercent}%</span>
            </label>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={discountPercent}
              onChange={e => setDiscountPercent(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>-5%</span><span>-20% (défaut)</span><span>-40%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Ex: produit à 10 000 FCFA → b2bPrice = {Math.round(10000 * (1 - discountPercent / 100)).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={force}
                onChange={e => setForce(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <span className="text-sm text-gray-700">
                <strong>Forcer</strong> — recalculer même les produits qui ont déjà un b2bPrice
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <span className="text-sm text-gray-700">
                <strong>Simulation</strong> — aperçu sans modifier la base
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { setDryRun(true); handleRun() }}
            disabled={applying}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium text-sm transition disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Aperçu (simulation)
          </button>
          <button
            onClick={() => { setDryRun(false); handleRun() }}
            disabled={applying}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 shadow"
          >
            {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Appliquer en base
          </button>
        </div>
      </div>

      {/* Résultat batch */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {batchResult && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">
              {batchResult.dryRun ? '📋 Aperçu' : '✅ Résultat'} — {batchResult.previewCount} produit(s) {batchResult.dryRun ? 'à mettre à jour' : 'mis à jour'}
            </h3>
            {!batchResult.dryRun && (
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                {batchResult.updatedCount} modifiés en base
              </span>
            )}
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4">Produit</th>
                  <th className="pb-2 pr-4 text-right">Prix retail</th>
                  <th className="pb-2 pr-4 text-right">Ancien b2bPrice</th>
                  <th className="pb-2 text-right">Nouveau b2bPrice</th>
                </tr>
              </thead>
              <tbody>
                {batchResult.preview.slice(0, 50).map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800 truncate max-w-xs">{r.name}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{formatCurrency(r.retailPrice)}</td>
                    <td className="py-2 pr-4 text-right text-gray-400">{r.oldB2bPrice ? formatCurrency(r.oldB2bPrice) : '—'}</td>
                    <td className="py-2 text-right text-violet-700 font-semibold">{formatCurrency(r.newB2bPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Liste produits */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-800">Catalogue actuel</h2>
          <div className="flex gap-2">
            {(['all', 'missing', 'has'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition ${
                  filter === f ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'missing' ? 'Sans b2bPrice' : 'Avec b2bPrice'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b sticky top-0 bg-white">
                  <th className="p-3">Produit</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3 text-right">Prix retail</th>
                  <th className="p-3 text-right">b2bPrice actuel</th>
                  <th className="p-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800 max-w-xs truncate">{p.name}</td>
                    <td className="p-3 text-gray-500 text-xs">{p.category}</td>
                    <td className="p-3 text-right text-gray-700">{formatCurrency(p.price)}</td>
                    <td className="p-3 text-right text-violet-700 font-semibold">
                      {p.b2bPrice ? formatCurrency(p.b2bPrice) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-right">
                      {p.hasB2bPrice
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ OK</span>
                        : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠ Manquant</span>
                      }
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400 text-sm">Aucun produit</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
