'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Landmark, Upload, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, FileText,
  Settings2, SearchCheck, HelpCircle, XCircle, History,
} from 'lucide-react'
import {
  decodeStatementFile, parseCsv, findHeaderRow, extractCreditLines,
  type ColumnKey, type ColumnMapping, type StatementLine,
} from '@/lib/finance/bank-statement'

interface InvoiceSummary { invoiceId: string; numero: string; client: string; balance: number }
interface MatchResult {
  lineId: string
  status: 'matched' | 'partial' | 'ambiguous' | 'unmatched' | 'already'
  confidence?: 'reference' | 'amount_client' | 'amount'
  allocations: Array<InvoiceSummary & { amount: number }>
  candidates: InvoiceSummary[]
  unallocated: number
  reason?: string
  paymentReference: string
}

type Group = 'ready' | 'review' | 'unmatched' | 'already'

const fmt = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`
const fmtDate = (iso: string) => iso.split('-').reverse().join('/')

const COLUMN_LABELS: Array<[ColumnKey, string]> = [
  ['date', 'Date'],
  ['label', 'Libellé'],
  ['credit', 'Crédit'],
  ['amount', 'Montant signé'],
  ['reference', 'Référence'],
]

const GROUPS: Record<Group, { label: string; hint: string; icon: any; card: string; chip: string }> = {
  ready: { label: 'Prêts', hint: 'Numéro de facture ou client reconnu', icon: CheckCircle2, card: 'border-emerald-200 bg-emerald-50 text-emerald-800', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  review: { label: 'À vérifier', hint: 'Montant seul, partiel ou plusieurs factures', icon: HelpCircle, card: 'border-amber-200 bg-amber-50 text-amber-800', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  unmatched: { label: 'Non trouvés', hint: 'À affecter manuellement', icon: XCircle, card: 'border-stone-200 bg-stone-50 text-stone-700', chip: 'bg-stone-100 text-stone-600 border-stone-200' },
  already: { label: 'Déjà saisis', hint: 'Présents dans les règlements', icon: History, card: 'border-stone-200 bg-white text-stone-500', chip: 'bg-white text-stone-400 border-stone-200' },
}

function groupOf(r: MatchResult): Group {
  if (r.status === 'already') return 'already'
  if (r.status === 'unmatched') return 'unmatched'
  if (r.status === 'matched' && r.confidence !== 'amount') return 'ready'
  return 'review'
}

const STEPS = ['Importer le relevé', 'Vérifier les propositions', 'Enregistrer les paiements']

export default function BankReconciliation() {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [headerIndex, setHeaderIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [showMapping, setShowMapping] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState<MatchResult[] | null>(null)
  const [openInvoices, setOpenInvoices] = useState<InvoiceSummary[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [manual, setManual] = useState<Record<string, string>>({})
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<Group | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const header = rows[headerIndex] || []
  const lines = useMemo(() => extractCreditLines(rows, headerIndex, mapping), [rows, headerIndex, mapping])
  const lineById = useMemo(() => new Map(lines.map(l => [l.id, l])), [lines])
  const step = !results ? 0 : notice ? 2 : 1

  const reset = () => {
    setFileName(''); setRows([]); setMapping({}); setResults(null); setNotice(''); setError(''); setApplyErrors({}); setFilter('all'); setShowMapping(false)
  }

  const analyse = async (statementLines: StatementLine[] = lines) => {
    if (!statementLines.length) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lines: statementLines }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Analyse impossible')
      const list: MatchResult[] = data.results
      setResults(list)
      setOpenInvoices(data.openInvoices || [])
      setManual({})
      setChecked(Object.fromEntries(list.map(r => [r.lineId, groupOf(r) === 'ready'])))
    } catch (e: any) {
      setError(e?.message || 'Analyse impossible')
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    reset()
    if (file.size > 5 * 1024 * 1024) return setError('Fichier trop volumineux (5 Mo maximum)')
    if (!/\.(csv|txt)$/i.test(file.name)) return setError('Format attendu : CSV (export de la banque en ligne, ou Excel « CSV séparateur point-virgule »)')
    const parsed = parseCsv(decodeStatementFile(await file.arrayBuffer()))
    const detected = findHeaderRow(parsed)
    setFileName(file.name)
    setRows(parsed)
    setHeaderIndex(detected.index)
    setMapping(detected.mapping)
    const found = extractCreditLines(parsed, detected.index, detected.mapping)
    if (found.length) await analyse(found)
    else {
      setShowMapping(true)
      setError('Aucun encaissement reconnu automatiquement : indiquez les colonnes Date et Crédit (ou Montant signé) ci-dessous.')
    }
  }

  const allocationsFor = (r: MatchResult) => {
    const line = lineById.get(r.lineId)
    const chosen = manual[r.lineId]
    if (chosen && line) {
      const inv = openInvoices.find(i => i.invoiceId === chosen) || r.candidates.find(i => i.invoiceId === chosen)
      return inv ? [{ ...inv, amount: Math.min(line.amount, inv.balance) }] : []
    }
    return r.allocations
  }

  const all = results || []
  const visible = filter === 'all' ? all : all.filter(r => groupOf(r) === filter)
  const selectable = (r: MatchResult) => r.status !== 'already' && allocationsFor(r).length > 0
  const selected = all.filter(r => checked[r.lineId] && selectable(r))
  const selectedTotal = selected.reduce((s, r) => s + allocationsFor(r).reduce((a, x) => a + x.amount, 0), 0)
  const visibleSelectable = visible.filter(selectable)
  const allVisibleChecked = visibleSelectable.length > 0 && visibleSelectable.every(r => checked[r.lineId])

  const stats = (Object.keys(GROUPS) as Group[]).map(g => {
    const own = all.filter(r => groupOf(r) === g)
    return { g, count: own.length, amount: own.reduce((s, r) => s + (lineById.get(r.lineId)?.amount || 0), 0) }
  })

  const apply = async () => {
    if (!selected.length) return
    if (!confirm(`Enregistrer ${selected.length} encaissement(s) pour ${fmt(selectedTotal)} ?`)) return
    setBusy(true)
    setError('')
    setNotice('')
    const errors: Record<string, string> = {}
    let saved = 0
    setProgress({ done: 0, total: selected.length })
    // Séquentiel : deux lignes peuvent viser la même facture (verrou optimiste côté API)
    for (const [idx, r] of selected.entries()) {
      const line = lineById.get(r.lineId)
      if (line) {
        for (const alloc of allocationsFor(r)) {
          try {
            const res = await fetch(`/api/admin/invoices/${encodeURIComponent(alloc.invoiceId)}/payments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ amount: alloc.amount, date: line.date, method: 'Virement', reference: r.paymentReference, note: 'Rapprochement bancaire' }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) throw new Error(data?.error || 'Paiement refusé')
            saved++
          } catch (e: any) {
            errors[r.lineId] = `${alloc.numero} : ${e?.message || 'Paiement refusé'}`
            break
          }
        }
      }
      setProgress({ done: idx + 1, total: selected.length })
    }
    const failed = Object.keys(errors).length
    setApplyErrors(errors)
    setProgress(null)
    setBusy(false)
    await analyse()
    setNotice(`${saved} paiement(s) enregistré(s)${failed ? ` ; ${failed} ligne(s) en erreur, détail dans le tableau` : ''}.`)
    setFilter('all')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm"><Landmark className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Rapprochement bancaire</h1>
            <p className="text-sm text-stone-600">Les virements reçus sont rapprochés des factures ouvertes. Rien n&apos;est enregistré sans votre validation.</p>
          </div>
        </div>
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${i < step ? 'bg-emerald-600 border-emerald-600 text-white' : i === step ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-stone-200 text-stone-400 bg-white'}`}>
                <span className="font-semibold">{i + 1}</span>{s}
              </span>
              {i < STEPS.length - 1 && <span className="w-4 h-px bg-stone-300" />}
            </li>
          ))}
        </ol>
      </div>

      {!fileName ? (
        <label
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); void onFile(e.dataTransfer.files?.[0]) }}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition ${dragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'}`}
        >
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-700"><Upload className="h-7 w-7" /></div>
          <div className="text-center">
            <p className="font-semibold text-stone-800">Déposez le relevé bancaire ici ou cliquez pour le choisir</p>
            <p className="text-sm text-stone-500 mt-1">Fichier CSV exporté depuis la banque en ligne (5 Mo max). Colonnes, dates et montants sont reconnus automatiquement.</p>
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 max-w-xl text-center">
            Astuce : le rapprochement est le plus fiable quand le client indique le numéro de facture (ex. FAC-2026-012) dans le libellé du virement ; il figure déjà sur les factures et les relances.
          </p>
          <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={e => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-stone-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-stone-800 truncate">{fileName}</p>
                <p className="text-xs text-stone-500">{lines.length} encaissement(s) · {fmt(lines.reduce((s, l) => s + l.amount, 0))} · débits ignorés</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMapping(v => !v)} aria-expanded={showMapping} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50">
                <Settings2 className="h-4 w-4" />Colonnes
              </button>
              <button onClick={reset} disabled={busy} className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-50">Autre relevé</button>
            </div>
          </div>
          {showMapping && (
            <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <label className="text-xs text-stone-600">Ligne d&apos;en-tête
                  <select value={headerIndex} onChange={e => setHeaderIndex(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm">
                    {rows.slice(0, 15).map((r, i) => <option key={i} value={i}>{i + 1}. {r.slice(0, 3).join(' | ').slice(0, 40)}</option>)}
                  </select>
                </label>
                {COLUMN_LABELS.map(([key, label]) => (
                  <label key={key} className="text-xs text-stone-600">{label}
                    <select
                      value={mapping[key] ?? ''}
                      onChange={e => setMapping(m => ({ ...m, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                      className="mt-1 w-full px-2 py-1.5 border border-stone-300 rounded-lg text-sm"
                    >
                      <option value="">—</option>
                      {header.map((h, i) => <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-stone-500">« Montant signé » sert quand le relevé n&apos;a qu&apos;une colonne de montants : seuls les montants positifs sont retenus.</p>
                <button onClick={() => analyse()} disabled={busy || lines.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Relancer l&apos;analyse
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />{notice}</p>}
      {busy && !results && <p className="text-sm text-stone-500 inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Recherche des factures correspondantes…</p>}

      {results && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map(({ g, count, amount }) => {
              const G = GROUPS[g]
              const active = filter === g
              return (
                <button key={g} onClick={() => setFilter(active ? 'all' : g)} aria-pressed={active}
                  className={`text-left rounded-xl border p-4 transition ${G.card} ${active ? 'ring-2 ring-offset-1 ring-emerald-500' : 'hover:shadow-sm'} ${count ? '' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{G.label}</span>
                    <G.icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold mt-1">{count}</div>
                  <div className="text-xs opacity-80">{fmt(amount)} · {G.hint}</div>
                </button>
              )
            })}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-stone-200 text-sm">
              <span className="text-stone-600">
                {filter === 'all' ? 'Toutes les lignes' : GROUPS[filter].label} · {visible.length}
                {filter !== 'all' && <button onClick={() => setFilter('all')} className="ml-2 text-emerald-700 hover:underline">Tout afficher</button>}
              </span>
              <button onClick={() => analyse()} disabled={busy} className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Réanalyser
              </button>
            </div>
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-stone-500">Aucune ligne dans cette catégorie.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-stone-50 text-stone-600 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        <input type="checkbox" aria-label="Tout sélectionner" disabled={!visibleSelectable.length} checked={allVisibleChecked}
                          onChange={e => setChecked(c => ({ ...c, ...Object.fromEntries(visibleSelectable.map(r => [r.lineId, e.target.checked])) }))} />
                      </th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Libellé</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                      <th className="px-3 py-2 text-left">Facture(s)</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {visible.map(r => {
                      const line = lineById.get(r.lineId)
                      if (!line) return null
                      const allocs = allocationsFor(r)
                      const g = groupOf(r)
                      const choices = r.candidates.length ? r.candidates : openInvoices
                      const isChecked = !!checked[r.lineId] && selectable(r)
                      return (
                        <tr key={r.lineId} className={applyErrors[r.lineId] ? 'bg-red-50/60' : isChecked ? 'bg-emerald-50/40' : g === 'already' ? 'text-stone-400' : ''}>
                          <td className="px-3 py-2 align-top">
                            <input type="checkbox" aria-label={`Sélectionner ${line.label}`} disabled={!selectable(r)} checked={isChecked}
                              onChange={e => setChecked(c => ({ ...c, [r.lineId]: e.target.checked }))} />
                          </td>
                          <td className="px-3 py-2 align-top whitespace-nowrap">{fmtDate(line.date)}</td>
                          <td className="px-3 py-2 align-top max-w-md">
                            <div className="truncate" title={line.label}>{line.label || '—'}</div>
                            {line.reference && <div className="text-xs text-stone-500">Réf. {line.reference}</div>}
                          </td>
                          <td className="px-3 py-2 align-top text-right whitespace-nowrap font-semibold">{fmt(line.amount)}</td>
                          <td className="px-3 py-2 align-top">
                            {r.allocations.length > 0 && !manual[r.lineId] ? (
                              <ul className="space-y-1">
                                {r.allocations.map(a => (
                                  <li key={a.invoiceId} className="whitespace-nowrap">
                                    <Link href={`/admin/factures?search=${encodeURIComponent(a.numero)}`} target="_blank" className="font-medium text-emerald-700 hover:underline inline-flex items-center gap-1">
                                      {a.numero}<ExternalLink className="h-3 w-3" />
                                    </Link>
                                    <span className="text-stone-500"> · {a.client}</span>
                                    <div className="text-xs text-stone-500">{fmt(a.amount)} sur {fmt(a.balance)} dus{a.amount === a.balance ? ' · soldée' : ''}</div>
                                  </li>
                                ))}
                              </ul>
                            ) : g !== 'already' && choices.length > 0 ? (
                              <select
                                value={manual[r.lineId] || ''}
                                onChange={e => {
                                  const v = e.target.value
                                  setManual(m => ({ ...m, [r.lineId]: v }))
                                  setChecked(c => ({ ...c, [r.lineId]: !!v }))
                                }}
                                className={`px-2 py-1 border rounded-lg text-sm max-w-xs ${manual[r.lineId] ? 'border-emerald-400' : 'border-stone-300'}`}
                              >
                                <option value="">{r.candidates.length ? `Choisir parmi ${r.candidates.length} factures` : 'Affecter à une facture…'}</option>
                                {choices.map(i => <option key={i.invoiceId} value={i.invoiceId}>{i.numero} · {i.client} · reste {fmt(i.balance)}</option>)}
                              </select>
                            ) : <span className="text-stone-400">—</span>}
                            {manual[r.lineId] && allocs[0] && allocs[0].amount < line.amount && (
                              <div className="text-xs text-amber-700 mt-1">Seuls {fmt(allocs[0].amount)} seront affectés (reste dû)</div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${GROUPS[g].chip}`}>
                              {r.status === 'partial' ? 'Partiel' : r.status === 'ambiguous' ? 'À choisir' : r.confidence === 'amount' ? 'Montant seul' : GROUPS[g].label}
                            </span>
                            {r.reason && <div className="text-xs text-stone-500 mt-1 max-w-xs">{r.reason}</div>}
                            {applyErrors[r.lineId] && (
                              <div className="text-xs text-red-700 mt-1 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{applyErrors[r.lineId]}</div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="fixed bottom-4 inset-x-0 z-30 px-4 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto bg-stone-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
              {progress ? (
                <div className="flex-1" role="status">
                  <div className="text-sm">Enregistrement {progress.done}/{progress.total}…</div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round(progress.done / progress.total * 100)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  <span className="font-semibold">{selected.length}</span> encaissement(s) sélectionné(s) · <span className="font-semibold">{fmt(selectedTotal)}</span>
                </div>
              )}
              <button onClick={apply} disabled={busy || selected.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-40">
                <SearchCheck className="h-4 w-4" />Enregistrer les paiements
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
