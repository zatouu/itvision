'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, PackageCheck, RotateCcw, X } from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'
import NumInput from '@/components/ui/NumInput'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'

interface BudgetLine {
  id: string
  quoteId?: string
  label: string
  quantity: number
  unitCost: number
  unitPrice: number
  isLabor: boolean
  status: 'planned' | 'purchased' | 'cancelled'
  actualUnitCost?: number
}

const fmt = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} F`

/**
 * Budget prévisionnel du projet (issu du devis accepté) : achat estimé vs revente par ligne.
 * « Acheté » au prix réel crée la dépense ; l'écart estimé/réel et la marge restent visibles.
 */
export default function ProjectBudgetPanel({ projectId, onExpensesChanged }: {
  projectId: string
  onExpensesChanged?: () => void
}) {
  const toast = useToastContext()
  const [lines, setLines] = useState<BudgetLine[] | null>(null)
  const [acceptedQuotes, setAcceptedQuotes] = useState<Array<{ id: string; numero: string }>>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [actual, setActual] = useState<Record<string, string>>({})
  const [paidNow, setPaidNow] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const [res, fin] = await Promise.all([
      fetch(`/api/projects/${projectId}/budget`, { credentials: 'include', cache: 'no-store' }),
      fetch(`/api/projects/${projectId}/finance`, { credentials: 'include', cache: 'no-store' }),
    ])
    const data = await readJsonResponse(res)
    const finData = await readJsonResponse(fin)
    setLines(res.ok ? data.lines || [] : [])
    setAcceptedQuotes((finData?.finance?.quotes || []).filter((q: any) => q.status === 'accepted').map((q: any) => ({ id: q.id, numero: q.numero })))
  }, [projectId])

  useEffect(() => { load() }, [load])

  const act = async (payload: Record<string, unknown>, key: string, success: string) => {
    setBusy(key)
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data, 'Opération impossible'))
      setLines(data.lines)
      toast.success(success)
      if (payload.action === 'purchase') onExpensesChanged?.()
    } catch (e: any) {
      toast.error(e?.message || 'Opération impossible')
    } finally {
      setBusy(null)
    }
  }

  if (lines === null) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>

  const importable = acceptedQuotes.filter(q => !lines.some(l => l.quoteId === q.id))
  const active = lines.filter(l => l.status !== 'cancelled')
  const estimated = active.reduce((s, l) => s + l.unitCost * l.quantity, 0)
  const sale = active.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const real = active.reduce((s, l) => s + (l.status === 'purchased' ? (l.actualUnitCost ?? 0) : l.unitCost) * l.quantity, 0)
  const purchased = active.filter(l => l.status === 'purchased').length

  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900"><PackageCheck className="h-4 w-4 text-emerald-600" />Budget prévisionnel (depuis le devis)</h3>
          <p className="text-xs text-stone-500">Confirmez chaque achat au prix réel : la dépense est créée et la marge recalculée. Interne, jamais visible du client ni des techniciens.</p>
        </div>
        {importable.map(q => (
          <button key={q.id} type="button" disabled={!!busy} onClick={() => act({ action: 'import', quoteId: q.id }, `import:${q.id}`, `Budget importé depuis ${q.numero}`)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60">
            {busy === `import:${q.id}` && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Préremplir depuis {q.numero}
          </button>
        ))}
      </div>

      {lines.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-500">
          {acceptedQuotes.length ? 'Aucun budget : préremplissez-le depuis le devis accepté.' : 'Le budget se prérempli dès qu’un devis du projet est accepté.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 border-b border-stone-100 p-4 text-xs sm:grid-cols-4">
            <div><p className="text-stone-400">Achat estimé</p><p className="font-semibold text-stone-900">{fmt(estimated)}</p></div>
            <div><p className="text-stone-400">Achat réel / prévu</p><p className={`font-semibold ${real > estimated ? 'text-red-700' : 'text-stone-900'}`}>{fmt(real)}</p></div>
            <div><p className="text-stone-400">Revente (devis)</p><p className="font-semibold text-stone-900">{fmt(sale)}</p></div>
            <div><p className="text-stone-400">Marge projetée</p><p className={`font-semibold ${sale - real >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(sale - real)}{sale > 0 && ` (${Math.round((sale - real) / sale * 100)} %)`}</p></div>
          </div>
          <p className="px-4 pt-3 text-xs text-stone-500">{purchased}/{active.length} achat(s) confirmé(s)</p>
          <ul className="divide-y divide-stone-100">
            {lines.map(l => {
              const unit = actual[l.id] ?? (l.unitCost ? String(l.unitCost) : '')
              const gap = l.status === 'purchased' ? ((l.actualUnitCost ?? 0) - l.unitCost) * l.quantity : 0
              return (
                <li key={l.id} className={`flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center ${l.status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium text-stone-900 ${l.status === 'cancelled' ? 'line-through' : ''}`}>
                      {l.quantity} × {l.label}{l.isLabor && <span className="ml-1.5 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">M.O.</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      Estimé {l.unitCost ? fmt(l.unitCost * l.quantity) : '—'} · Revente {fmt(l.unitPrice * l.quantity)}
                      {l.status === 'purchased' && <> · <span className="font-semibold text-stone-700">Réel {fmt((l.actualUnitCost ?? 0) * l.quantity)}</span>{l.unitCost > 0 && gap !== 0 && <span className={gap > 0 ? ' text-red-600' : ' text-emerald-700'}> ({gap > 0 ? '+' : ''}{fmt(gap)})</span>}</>}
                    </p>
                  </div>
                  {l.status === 'planned' && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="flex items-center gap-1 text-xs text-stone-500">
                        Prix unit. réel
                        <NumInput integer min={0} value={unit === '' ? undefined : Number(unit)} onChange={v => setActual(a => ({ ...a, [l.id]: v == null ? '' : String(v) }))}
                          className="w-24 rounded-lg border border-stone-200 px-2 py-1.5 text-sm" />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-stone-500">
                        <input type="checkbox" checked={!!paidNow[l.id]} onChange={e => setPaidNow(p => ({ ...p, [l.id]: e.target.checked }))} className="rounded" />payé
                      </label>
                      <button type="button" disabled={!!busy || unit === ''}
                        onClick={() => act({ action: 'purchase', lineId: l.id, actualUnitCost: Number(unit), paymentStatus: paidNow[l.id] ? 'paid' : 'unpaid' }, l.id, 'Achat confirmé : dépense créée')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {busy === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{l.isLabor ? 'Payé' : 'Acheté'}
                      </button>
                      <button type="button" disabled={!!busy} onClick={() => act({ action: 'cancel', lineId: l.id }, `c:${l.id}`, 'Ligne retirée du budget')}
                        aria-label="Pas nécessaire" title="Pas nécessaire" className="rounded-lg border border-stone-200 p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-700"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  {l.status === 'purchased' && <span className="self-start rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 lg:self-center">Acheté</span>}
                  {l.status === 'cancelled' && (
                    <button type="button" disabled={!!busy} onClick={() => act({ action: 'restore', lineId: l.id }, `r:${l.id}`, 'Ligne remise en prévision')}
                      className="inline-flex items-center gap-1 self-start rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50 lg:self-center"><RotateCcw className="h-3.5 w-3.5" />Rétablir</button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
