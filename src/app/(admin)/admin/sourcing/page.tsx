'use client'

import { useEffect, useState, useCallback } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import {
  Search, Loader2, RefreshCw, Globe, CheckCircle, XCircle,
  AlertTriangle, Clock, PackageOpen, Play,
} from 'lucide-react'

interface ScanJob {
  id: string
  query: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'waiting_human'
  attempts: number
  result?: {
    found?: number
    extracted?: number
    imported?: number
    skipped?: number
    blocked?: string | null
  }
  error?: string
  createdAt: string
  updatedAt: string
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'En file', cls: 'bg-slate-100 text-slate-600', icon: Clock },
  running: { label: 'En cours', cls: 'bg-blue-100 text-blue-700', icon: Loader2 },
  done: { label: 'Terminé', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  failed: { label: 'Échoué', cls: 'bg-red-100 text-red-700', icon: XCircle },
  waiting_human: { label: 'Attente humaine', cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
}

export default function AdminSourcingPage() {
  const [jobs, setJobs] = useState<ScanJob[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')
  const [urls, setUrls] = useState('')
  const [category, setCategory] = useState('')
  const [maxItems, setMaxItems] = useState(10)
  const [groupBuyEligible, setGroupBuyEligible] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sourcing', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setJobs(data.jobs || [])
        setCategories(data.categories || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Rafraîchit tant qu'un scan est actif
  useEffect(() => {
    const active = jobs.some((j) => j.status === 'pending' || j.status === 'running')
    if (!active) return
    const t = setInterval(() => void load(), 8000)
    return () => clearInterval(t)
  }, [jobs, load])

  const launch = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setLaunching(true)
    try {
      const res = await fetch('/api/admin/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: query.trim() || undefined,
          urls: urls.trim() ? urls.split('\n').map((u) => u.trim()).filter(Boolean) : undefined,
          category: category || undefined,
          maxItems,
          groupBuyEligible,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Erreur au lancement')
      } else {
        setQuery('')
        setUrls('')
        await load()
      }
    } catch {
      setFormError('Erreur réseau')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Veille sourcing 1688' }]} />

      <div className="flex items-center gap-3 mt-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <Globe className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Veille sourcing 1688</h1>
          <p className="text-sm text-slate-500">
            L&apos;agent navigue sur 1688 comme un acheteur, extrait les offres, calcule le prix
            (sourcing + marge + frais + assurance) et crée des brouillons soumis à la modération.
          </p>
        </div>
      </div>

      {/* Formulaire de lancement */}
      <form onSubmit={launch} className="bg-white rounded-2xl border border-slate-200 p-5 mb-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Recherche 1688 (mot-clé, idéalement en chinois)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ex : 蓝牙耳机 (écouteurs bluetooth)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
              />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Ou URLs d&apos;offres 1688 directes (une par ligne — ex : liens de vos contacts)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={'https://detail.1688.com/offer/123456789.html\nhttps://detail.1688.com/offer/987654321.html'}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Catégorie catalogue</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 bg-white"
            >
              <option value="">Import Chine (défaut)</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Produits max</label>
            <input
              type="number"
              min={1}
              max={30}
              value={maxItems}
              onChange={(e) => setMaxItems(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={groupBuyEligible}
              onChange={(e) => setGroupBuyEligible(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            Éligible achats groupés (min 5 pcs, cible 20)
          </label>
          <button
            type="submit"
            disabled={launching || (query.trim().length < 2 && urls.trim().length === 0)}
            className="sm:ml-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Lancer la veille
          </button>
        </div>
        {formError && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> {formError}
          </p>
        )}
      </form>

      {/* Historique des scans */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Historique des veilles</h2>
        <button onClick={() => void load()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Rafraîchir">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <PackageOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucune veille lancée. Le premier scan enrichira le catalogue de brouillons à modérer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => {
            const meta = STATUS_META[j.status] || STATUS_META.pending
            const Icon = meta.icon
            return (
              <div key={j.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                    <Icon className={`w-3.5 h-3.5 ${j.status === 'running' ? 'animate-spin' : ''}`} />
                    {meta.label}
                  </span>
                  <span className="font-medium text-slate-900 text-sm">« {j.query} »</span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {new Date(j.createdAt).toLocaleString('fr-FR')}
                    {j.attempts > 1 && ` · ${j.attempts} tentatives`}
                  </span>
                </div>
                {j.result && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                    <span>{j.result.found ?? 0} offres trouvées</span>
                    <span>{j.result.extracted ?? 0} extraites</span>
                    <span className="font-semibold text-emerald-700">{j.result.imported ?? 0} brouillons → modération</span>
                    {(j.result.skipped ?? 0) > 0 && <span className="text-slate-400">{j.result.skipped} ignorées</span>}
                  </div>
                )}
                {(j.result?.blocked || j.error) && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {j.result?.blocked ? `Blocage : ${j.result.blocked}` : j.error}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
