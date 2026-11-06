'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Wallet, Banknote, Receipt, AlertTriangle,
  RefreshCw, Calendar, Building2, FileText, ArrowUpRight, ArrowDownRight,
  PieChart, Activity, Clock, CheckCircle2, Plus, Download
} from 'lucide-react'

interface TreasuryData {
  kpis: {
    revenueBilled: number
    revenueCollected: number
    receivablesOpen: number
    receivablesOverdue: number
    expensesTotal: number
    expensesPaid: number
    payablesOpen: number
    payablesOverdue: number
    treasuryBalance: number
    projectedBalance: number
    grossMargin: number
    grossMarginPct: number
    invoicesCount: number
    expensesCount: number
    brsRetained: number
    brsPending: number
  }
  pipeline: { draft: number; sent: number; accepted: number }
  cashflow: Array<{ period: string; revenue: number; expense: number; net: number }>
  expensesByCategory: Array<{ category: string; total: number; paid: number; count: number }>
  projectsPL: Array<{
    projectId: string
    projectName: string
    status?: string
    budget: number
    revenueBilled: number
    revenueCollected: number
    expensesTotal: number
    expensesPaid: number
    margin: number
    marginPct: number
    invoicesCount: number
    expensesCount: number
  }>
  topPayables: Array<any>
  topReceivables: Array<any>
}

const CATEGORY_LABELS: Record<string, string> = {
  achat_materiel: 'Achat matériel',
  sous_traitance: 'Sous-traitance',
  transport: 'Transport',
  salaire: 'Salaires',
  loyer: 'Loyer',
  services: 'Services',
  taxes: 'Taxes',
  commissions: 'Commissions',
  marketing: 'Marketing',
  logistique: 'Logistique',
  douane: 'Douane',
  autre: 'Autre'
}

const fmt = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`
const fmtCompact = (n: number) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(Math.round(v))
}

function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function TreasuryDashboard() {
  const [data, setData] = useState<TreasuryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(startOfYear())
  const [endDate, setEndDate] = useState(todayISO())

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ startDate, endDate })
      const res = await fetch(`/api/admin/treasury?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [startDate, endDate])

  const setPreset = (preset: 'month' | 'quarter' | 'year' | 'all') => {
    const now = new Date()
    let start = new Date()
    if (preset === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1)
    else if (preset === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), q * 3, 1)
    }
    else if (preset === 'year') start = new Date(now.getFullYear(), 0, 1)
    else if (preset === 'all') start = new Date(2020, 0, 1)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(now.toISOString().slice(0, 10))
  }

  const cashflowMax = useMemo(() => {
    if (!data?.cashflow?.length) return 1
    return Math.max(1, ...data.cashflow.flatMap(c => [c.revenue, c.expense, Math.abs(c.net)]))
  }, [data])

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-sm text-gray-600 mt-3">Chargement de la trésorerie...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        {error}
      </div>
    )
  }

  if (!data) return null

  const k = data.kpis

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,_rgba(255,255,255,0.4)_1px,_transparent_1px)] bg-[length:20px_20px]" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 mb-3">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Vue 360°</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Trésorerie globale</h1>
              <p className="text-white/80 mt-2 text-sm md:text-base">
                Pilotage financier en temps réel : revenus, dépenses, créances et marge par projet
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1 mr-2">
                {[
                  { k: 'month', label: 'Mois' },
                  { k: 'quarter', label: 'Trimestre' },
                  { k: 'year', label: 'Année' },
                  { k: 'all', label: 'Tout' }
                ].map((p) => (
                  <button
                    key={p.k}
                    onClick={() => setPreset(p.k as any)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
              />
              <span className="text-white/70 text-xs">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
              />
              <button
                onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-emerald-700 rounded-lg hover:bg-white/90"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Solde de trésorerie"
          value={fmt(k.treasuryBalance)}
          sub={`Projeté: ${fmt(k.projectedBalance)}`}
          icon={Wallet}
          color={k.treasuryBalance >= 0 ? 'emerald' : 'red'}
          accent
        />
        <KpiCard
          label="Revenus encaissés"
          value={fmt(k.revenueCollected)}
          sub={`Facturé: ${fmt(k.revenueBilled)}`}
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          label="Dépenses payées"
          value={fmt(k.expensesPaid)}
          sub={`Total: ${fmt(k.expensesTotal)}`}
          icon={TrendingDown}
          color="orange"
        />
        <KpiCard
          label="Marge brute"
          value={fmt(k.grossMargin)}
          sub={`${k.grossMarginPct.toFixed(1)}% du CA`}
          icon={PieChart}
          color={k.grossMargin >= 0 ? 'blue' : 'red'}
        />
      </div>

      {/* Sous-KPIs : créances/dettes / BRS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg"><ArrowDownRight className="h-4 w-4 text-blue-600" /></div>
              <h3 className="text-sm font-semibold text-gray-900">Créances clients</h3>
            </div>
            <Link href="/admin/factures" className="text-xs text-blue-600 hover:underline">Voir →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-50">
              <p className="text-xs text-gray-500">Total ouvert</p>
              <p className="text-xl font-bold text-blue-700">{fmt(k.receivablesOpen)}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50">
              <p className="text-xs text-gray-500">En retard</p>
              <p className="text-xl font-bold text-red-700">{fmt(k.receivablesOverdue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 p-2 rounded-lg"><ArrowUpRight className="h-4 w-4 text-orange-600" /></div>
              <h3 className="text-sm font-semibold text-gray-900">Dettes fournisseurs</h3>
            </div>
            <Link href="/admin/depenses" className="text-xs text-orange-600 hover:underline">Voir →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-orange-50">
              <p className="text-xs text-gray-500">Total ouvert</p>
              <p className="text-xl font-bold text-orange-700">{fmt(k.payablesOpen)}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50">
              <p className="text-xs text-gray-500">En retard</p>
              <p className="text-xl font-bold text-red-700">{fmt(k.payablesOverdue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg"><Receipt className="h-4 w-4 text-blue-600" /></div>
              <h3 className="text-sm font-semibold text-gray-900">Retenue BRS</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-50">
              <p className="text-xs text-gray-500">Total retenu</p>
              <p className="text-xl font-bold text-blue-700">{fmt(k.brsRetained)}</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50">
              <p className="text-xs text-gray-500">À déclarer (non payé)</p>
              <p className="text-xl font-bold text-yellow-700">{fmt(k.brsPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cashflow + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Cashflow mensuel</h3>
              <p className="text-xs text-gray-500">Encaissements vs décaissements</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" />Revenus</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400" />Dépenses</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" />Net</span>
            </div>
          </div>
          {data.cashflow.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              Aucun mouvement sur la période
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-3 h-56 min-w-full pb-2">
                {data.cashflow.map((c) => {
                  const rH = (c.revenue / cashflowMax) * 100
                  const eH = (c.expense / cashflowMax) * 100
                  return (
                    <div key={c.period} className="flex-1 min-w-[60px] flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center gap-1 flex-1">
                        <div
                          className="w-3 bg-emerald-500 rounded-t hover:bg-emerald-600 transition"
                          style={{ height: `${rH}%` }}
                          title={`Revenus: ${fmt(c.revenue)}`}
                        />
                        <div
                          className="w-3 bg-orange-400 rounded-t hover:bg-orange-500 transition"
                          style={{ height: `${eH}%` }}
                          title={`Dépenses: ${fmt(c.expense)}`}
                        />
                      </div>
                      <div className={`text-[11px] font-bold ${c.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {fmtCompact(c.net)}
                      </div>
                      <div className="text-[10px] text-gray-500">{c.period}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Pipeline commercial</h3>
          <div className="space-y-3">
            <PipelineRow label="Brouillons" amount={data.pipeline.draft} color="gray" />
            <PipelineRow label="Devis envoyés" amount={data.pipeline.sent} color="blue" />
            <PipelineRow label="Devis acceptés" amount={data.pipeline.accepted} color="emerald" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/admin/devis"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <FileText className="h-4 w-4" />
              Gérer les devis
            </Link>
          </div>
        </div>
      </div>

      {/* Dépenses par catégorie + P&L par projet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Catégories */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Dépenses par catégorie</h3>
            <Link href="/admin/depenses" className="text-xs text-emerald-600 hover:underline">+ Nouvelle dépense</Link>
          </div>
          {data.expensesByCategory.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Aucune dépense enregistrée</div>
          ) : (
            <div className="space-y-3">
              {data.expensesByCategory.map((c) => {
                const pct = k.expensesTotal > 0 ? (c.total / k.expensesTotal) * 100 : 0
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{CATEGORY_LABELS[c.category] || c.category}</span>
                      <span className="text-gray-900 font-semibold">{fmt(c.total)} <span className="text-xs text-gray-400">({c.count})</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-red-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* P&L projets */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Rentabilité par projet</h3>
            <Link href="/admin/projects" className="text-xs text-emerald-600 hover:underline">Voir projets →</Link>
          </div>
          {data.projectsPL.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Pas de données par projet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.projectsPL.slice(0, 8).map((p) => (
                <div key={p.projectId} className="p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/admin/projects/${p.projectId}`} className="text-sm font-semibold text-gray-900 hover:text-emerald-700 truncate">
                      {p.projectName}
                    </Link>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.margin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {p.margin >= 0 ? '+' : ''}{p.marginPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Facturé</p>
                      <p className="font-semibold text-gray-900">{fmtCompact(p.revenueBilled)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Dépenses</p>
                      <p className="font-semibold text-orange-700">{fmtCompact(p.expensesTotal)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Marge</p>
                      <p className={`font-semibold ${p.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtCompact(p.margin)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Échéances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" /> Factures à encaisser
          </h3>
          {data.topReceivables.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
              Aucune créance en cours
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.topReceivables.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.numero}</p>
                    <p className="text-xs text-gray-500 truncate">{r.clientName || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmt(r.total)}</p>
                    {r.dueDate && (
                      <p className={`text-[11px] ${r.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {r.isOverdue && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
                        {new Date(r.dueDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-orange-600" /> Dépenses à payer
          </h3>
          {data.topPayables.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
              Aucune dépense en attente
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.topPayables.map((p) => {
                const isOverdue = p.dueDate && new Date(p.dueDate) < new Date()
                return (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.label}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.supplier || '—'} {p.projectName && <span className="text-emerald-600">• {p.projectName}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{fmt(p.remaining)}</p>
                      {p.dueDate && (
                        <p className={`text-[11px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {isOverdue && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
                          {new Date(p.dueDate).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Link href="/admin/depenses" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Nouvelle dépense
        </Link>
        <Link href="/admin/factures" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl font-semibold hover:bg-gray-50">
          <Receipt className="h-4 w-4" /> Factures
        </Link>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color, accent }: any) {
  const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    green: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200' },
    red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200' }
  }
  const c = colorClasses[color] || colorClasses.blue
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition ${accent ? `ring-2 ${c.ring}` : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.bg} p-2.5 rounded-xl`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${c.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function PipelineRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-400',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500'
  }
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${colors[color]}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{fmt(amount)}</span>
    </div>
  )
}
