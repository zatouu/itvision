'use client'

import { useEffect, useState } from 'react'
import { FileSpreadsheet, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

type JournalCode = 'VT' | 'AC' | 'BQ'
interface Summary { code: JournalCode; name: string; entries: number; lines: number; debit: number; credit: number }
interface Line { journal: JournalCode; date: string; piece: string; account: string; thirdParty?: string; label: string; debit: number; credit: number }

const JOURNALS: Array<{ code: JournalCode; label: string; hint: string }> = [
  { code: 'VT', label: 'Ventes', hint: 'Factures et avoirs' },
  { code: 'AC', label: 'Achats', hint: 'Dépenses' },
  { code: 'BQ', label: 'Banque / caisse', hint: 'Encaissements, paiements, remboursements' },
]

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR')

function presetRange(preset: string): [string, string] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'prev-month': return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))]
    case 'quarter': return [iso(new Date(y, Math.floor(m / 3) * 3, 1)), iso(now)]
    case 'prev-year': return [iso(new Date(y - 1, 0, 1)), iso(new Date(y - 1, 11, 31))]
    case 'year': return [iso(new Date(y, 0, 1)), iso(now)]
    default: return [iso(new Date(y, m, 1)), iso(now)]
  }
}

const PRESETS = [
  { k: 'prev-month', label: 'Mois précédent' },
  { k: 'month', label: 'Mois en cours' },
  { k: 'quarter', label: 'Trimestre' },
  { k: 'year', label: 'Année' },
  { k: 'prev-year', label: 'Année précédente' },
]

export default function AccountingExport() {
  const [[start, end], setRange] = useState<[string, string]>(() => presetRange('prev-month'))
  const [journals, setJournals] = useState<JournalCode[]>(['VT', 'AC', 'BQ'])
  const [summary, setSummary] = useState<Summary[] | null>(null)
  const [preview, setPreview] = useState<Line[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const query = new URLSearchParams({ start, end, journals: journals.join(',') }).toString()

  useEffect(() => {
    if (!journals.length || !start || !end) { setSummary(null); return }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/admin/accounting-export?${query}&format=json`, { credentials: 'include', signal: ctrl.signal })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || 'Aperçu indisponible')
        setSummary(data.summary)
        setPreview(data.preview || [])
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e?.message || 'Aperçu indisponible')
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [query])

  const toggle = (code: JournalCode) =>
    setJournals(js => js.includes(code) ? js.filter(j => j !== code) : [...js, code].sort((a, b) => JOURNALS.findIndex(j => j.code === a) - JOURNALS.findIndex(j => j.code === b)))

  const totalLines = (summary || []).reduce((s, j) => s + j.lines, 0)
  const unbalanced = (summary || []).filter(j => j.debit !== j.credit)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export comptable</h2>
            <p className="text-sm text-gray-600">Écritures des factures, avoirs, dépenses et règlements, prêtes à importer (CSV, plan SYSCOHADA).</p>
          </div>
        </div>
        <a
          href={`/api/admin/accounting-export?${query}&format=csv`}
          aria-disabled={!totalLines}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${totalLines ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}
        >
          <Download className="h-4 w-4" />
          Télécharger {totalLines ? `(${totalLines} lignes)` : ''}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => {
          const [s, e] = presetRange(p.k)
          const active = s === start && e === end
          return (
            <button key={p.k} onClick={() => setRange([s, e])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {p.label}
            </button>
          )
        })}
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <input type="date" value={start} max={end} onChange={e => setRange([e.target.value, end])} className="px-2 py-1 border border-gray-300 rounded-lg text-sm" aria-label="Du" />
        <span className="text-gray-400 text-sm">au</span>
        <input type="date" value={end} min={start} onChange={e => setRange([start, e.target.value])} className="px-2 py-1 border border-gray-300 rounded-lg text-sm" aria-label="Au" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {JOURNALS.map(j => {
          const on = journals.includes(j.code)
          const s = summary?.find(x => x.code === j.code)
          return (
            <button key={j.code} onClick={() => toggle(j.code)} aria-pressed={on}
              className={`text-left rounded-xl border p-4 transition ${on ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 bg-gray-50 opacity-60 hover:opacity-100'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{j.code} · {j.label}</span>
                <input type="checkbox" readOnly checked={on} className="pointer-events-none" tabIndex={-1} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{j.hint}</p>
              {on && s && (
                <div className="mt-3 text-sm text-gray-700 space-y-0.5">
                  <div>{s.entries} écriture(s) · {s.lines} ligne(s)</div>
                  <div className="text-xs text-gray-500">Débit {fmt(s.debit)} · Crédit {fmt(s.credit)}</div>
                  {s.debit === s.credit
                    ? <div className="text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Équilibré</div>
                    : <div className="text-xs text-red-700 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Écart {fmt(s.debit - s.credit)}</div>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {loading && <p className="text-sm text-gray-500 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Calcul de l&apos;aperçu…</p>}
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {unbalanced.length > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Journal déséquilibré ({unbalanced.map(j => j.code).join(', ')}) : vérifier les montants des documents concernés avant import.
        </p>
      )}
      {summary && totalLines === 0 && !loading && <p className="text-sm text-gray-500">Aucune écriture sur cette période.</p>}

      {preview.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">
            Aperçu des premières lignes {totalLines > preview.length ? `(${preview.length} sur ${totalLines})` : ''}
          </summary>
          <div className="mt-3 overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>{['Jnl', 'Date', 'Pièce', 'Compte', 'Tiers', 'Libellé', 'Débit', 'Crédit'].map(h => <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((l, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{l.journal}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{l.date.split('-').reverse().join('/')}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{l.piece}</td>
                    <td className="px-2 py-1 font-mono">{l.account}</td>
                    <td className="px-2 py-1 max-w-[10rem] truncate">{l.thirdParty}</td>
                    <td className="px-2 py-1 max-w-xs truncate" title={l.label}>{l.label}</td>
                    <td className="px-2 py-1 text-right">{l.debit ? fmt(l.debit) : ''}</td>
                    <td className="px-2 py-1 text-right">{l.credit ? fmt(l.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Comptes par défaut (411 clients, 401 fournisseurs, 706/701 ventes, 4431/4452 TVA, 4449/447 BRS, 521 banque, 571 caisse) : à faire valider par l&apos;expert-comptable.
          </p>
        </details>
      )}
    </div>
  )
}
