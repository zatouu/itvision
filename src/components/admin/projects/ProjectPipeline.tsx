'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Check, ChevronRight, Loader2, PauseCircle, XCircle } from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'
import { readJsonResponse, apiErrorMessage } from '@/lib/http/read-json'
import { PIPELINE, PROJECT_STATUS_META, type NextAction, type ProjectStatus } from '@/lib/projects/workflow'

interface Transition {
  to: ProjectStatus
  label: string
  allowed: boolean
  blocking?: string
  warnings: string[]
}

interface WorkflowState {
  status: ProjectStatus
  migrationRequired: boolean
  transitions: Transition[]
  nextActions: NextAction[]
  finance: { contracted: number; invoiced: number; paid: number; outstanding: number; remainingToInvoice: number; coherent: boolean; warnings: string[] }
}

const fmt = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} F`

export default function ProjectPipeline({
  projectId,
  refreshKey = 0,
  onChanged,
  onNavigate,
}: {
  projectId: string
  refreshKey?: number
  onChanged?: (status: ProjectStatus) => void
  onNavigate?: (tab: NonNullable<NextAction['tab']>) => void
}) {
  const toast = useToastContext()
  const [state, setState] = useState<WorkflowState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<ProjectStatus | null>(null)
  const [forcing, setForcing] = useState<{ to: ProjectStatus; reason: string; note: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow`, { credentials: 'include', cache: 'no-store' })
      const data = await readJsonResponse(res)
      if (res.ok && data.success) setState(data as WorkflowState)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load, refreshKey])

  const move = async (to: ProjectStatus, opts: { force?: boolean; note?: string } = {}) => {
    const target = state?.transitions.find(t => t.to === to)
    if (target?.warnings.length && !opts.force && !confirm(`${target.warnings.join('\n')}\n\nContinuer vers « ${target.label} » ?`)) return
    setBusy(to)
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, force: opts.force, note: opts.note }),
      })
      const data = await readJsonResponse(res)
      if (res.status === 409 && data.canForce) {
        setForcing({ to, reason: data.error || 'Garde-fou du workflow', note: '' })
        return
      }
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data, 'Changement de phase impossible'))
      toast.success(`Phase : ${PROJECT_STATUS_META[to].label}`, data.warning ? { description: data.warning } : undefined)
      setForcing(null)
      onChanged?.(to)
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Changement de phase impossible')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-3 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Chargement du workflow…</div>
  }
  if (!state) return null

  const currentIndex = PIPELINE.indexOf(state.status)
  const side = state.status === 'on_hold' || state.status === 'cancelled'
  const forward = state.transitions.filter(t => PIPELINE.indexOf(t.to) > currentIndex && PIPELINE.includes(t.to))
  const others = state.transitions.filter(t => !forward.includes(t))

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4" aria-label="Cycle de vie du projet">
      {/* Étapes */}
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {PIPELINE.map((s, i) => {
          const done = !side && i < currentIndex
          const current = s === state.status
          return (
            <li key={s} className="flex flex-shrink-0 items-center gap-1">
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                  current ? 'bg-blue-600 text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {done && <Check className="h-3 w-3" />}
                <span className="sm:hidden">{PROJECT_STATUS_META[s].short}</span>
                <span className="hidden sm:inline">{PROJECT_STATUS_META[s].label}</span>
              </span>
              {i < PIPELINE.length - 1 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-stone-300" />}
            </li>
          )
        })}
      </ol>

      {side && (
        <p className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${PROJECT_STATUS_META[state.status].color}`}>
          {state.status === 'on_hold' ? <PauseCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {PROJECT_STATUS_META[state.status].label}
        </p>
      )}

      {state.migrationRequired && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          Base non migrée : les phases détaillées ne sont pas encore conservées. Lancez la migration « migrate-projects-workflow ».
        </p>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        {/* Prochaines actions */}
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">Prochaines actions</p>
          {state.nextActions.length ? (
            <ul className="flex flex-wrap gap-2">
              {state.nextActions.map(a => (
                <li key={a.key}>
                  {a.href ? (
                    <Link href={a.href} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                      {a.label}<ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => a.tab && onNavigate?.(a.tab)} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100">
                      {a.label}<ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-stone-500">Aucune action en attente.</p>}
          {!state.finance.coherent && (
            <ul className="mt-2 space-y-1">
              {state.finance.warnings.map(w => (
                <li key={w} className="flex items-start gap-1.5 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />{w}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Passages de phase */}
        <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
          {forward.map(t => (
            <button key={t.to} type="button" disabled={!!busy} onClick={() => move(t.to)}
              title={t.blocking || t.warnings.join(' · ') || undefined}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60 ${t.blocking ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {busy === t.to ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              {t.label}
            </button>
          ))}
          {others.length > 0 && (
            <select
              aria-label="Autre changement de phase"
              value=""
              disabled={!!busy}
              onChange={e => { const v = e.target.value as ProjectStatus; if (v) move(v) }}
              className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-xs text-stone-700"
            >
              <option value="">Autre phase…</option>
              {others.map(t => <option key={t.to} value={t.to}>{t.label}</option>)}
            </select>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-xs sm:grid-cols-4">
        <div><dt className="text-stone-400">Contrat (devis acceptés)</dt><dd className="font-semibold text-stone-900">{fmt(state.finance.contracted)}</dd></div>
        <div><dt className="text-stone-400">Facturé</dt><dd className="font-semibold text-stone-900">{fmt(state.finance.invoiced)}</dd></div>
        <div><dt className="text-stone-400">Encaissé</dt><dd className="font-semibold text-emerald-700">{fmt(state.finance.paid)}</dd></div>
        <div><dt className="text-stone-400">Reste à facturer</dt><dd className="font-semibold text-blue-700">{fmt(state.finance.remainingToInvoice)}</dd></div>
      </dl>

      {forcing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={() => setForcing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="flex items-start gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />{forcing.reason}</p>
            <label className="mt-3 block text-xs font-medium text-stone-600">
              Motif du passage forcé (obligatoire, tracé dans l’historique)
              <textarea value={forcing.note} onChange={e => setForcing({ ...forcing, note: e.target.value })} rows={3}
                className="mt-1 w-full rounded-xl border border-stone-200 p-2 text-sm" placeholder="Ex. bon de commande papier signé le 12/10" />
            </label>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setForcing(null)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Annuler</button>
              <button type="button" disabled={!forcing.note.trim() || !!busy} onClick={() => move(forcing.to, { force: true, note: forcing.note.trim() })}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                Forcer vers « {PROJECT_STATUS_META[forcing.to].label} »
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
