'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileText, Loader2, Search, Send, Pencil, AlertTriangle, CheckCircle, Plus, Eye } from 'lucide-react'
import EnhancedMaintenanceForm from '@/components/EnhancedMaintenanceForm'
import ModernModal, { ModalActions, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/ModernModal'
import { REPORT_STATUS, shortDate } from './tech-ui'
import type { ReportDraftContext } from './InterventionSheet'

type Filter = 'all' | 'rejected' | 'draft' | 'pending_validation' | 'done'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'rejected', label: 'À corriger' },
  { id: 'draft', label: 'Brouillons' },
  { id: 'pending_validation', label: 'En validation' },
  { id: 'done', label: 'Validés' },
]

const editable = (status: string) => status === 'draft' || status === 'rejected'

const dateInput = (d?: string | Date) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const amount = (n?: number) => (typeof n === 'number' ? String(n) : '')

function toFormValues(raw: any) {
  return {
    site: raw.site || '',
    clientName: raw.clientId?.company || raw.clientId?.name || raw.clientName || '',
    clientContact: raw.clientContact || '',
    clientId: raw.clientId?._id || raw.clientId,
    projectId: raw.projectId?._id || raw.projectId,
    interventionDate: dateInput(raw.interventionDate),
    startTime: raw.startTime || '',
    endTime: raw.endTime && raw.endTime !== raw.startTime ? raw.endTime : '',
    interventionType: raw.interventionType || 'maintenance',
    initialObservations: raw.initialObservations === 'Observations non renseignées' ? '' : (raw.initialObservations || ''),
    problemDescription: raw.problemDescription || '',
    problemSeverity: raw.problemSeverity || 'medium',
    tasksPerformed: raw.tasksPerformed?.length ? raw.tasksPerformed : [''],
    results: raw.results === 'N/A' ? '' : (raw.results || ''),
    recommendations: raw.recommendations || [],
    photosBefore: (raw.photos?.before || []).map((p: any) => p.url).filter(Boolean),
    photosAfter: (raw.photos?.after || []).map((p: any) => p.url).filter(Boolean),
    technicianSignature: raw.signatures?.technician?.signature || null,
    clientSignature: raw.signatures?.client?.signature || null,
    clientSignatoryName: raw.signatures?.client?.name || '',
    clientTitle: raw.signatures?.client?.title || '',
    issuesDetected: (raw.issuesDetected || []).map((i: any) => ({
      reference: i.reference, component: i.component || '', location: i.location || '', description: i.description || '',
      severity: i.severity || 'medium', impact: i.impact || '', requiresQuote: !!i.requiresQuote,
      recommendedSolution: i.recommendedSolution || '', estimatedCost: amount(i.estimatedCost), estimatedDurationHours: amount(i.estimatedDurationHours),
    })),
    materialsUsed: (raw.materialsUsed || []).map((m: any) => ({
      name: m.name || '', quantity: m.quantity || 1, unitCost: amount(m.unitCost), unitPrice: amount(m.unitPrice), supplierReference: m.supplierReference || '',
    })),
    followUpRecommendations: (raw.followUpRecommendations || []).map((f: any) => ({
      title: f.title || '', description: f.description || '', priority: f.priority || 'medium', requiresQuote: !!f.requiresQuote,
      estimatedCost: amount(f.estimatedCost), estimatedDurationHours: amount(f.estimatedDurationHours), recommendedDate: dateInput(f.recommendedDate),
    })),
    nextActions: (raw.nextActions || []).map((a: any) => ({
      title: a.title || '', scheduledDate: dateInput(a.scheduledDate), assignedTo: a.assignedTo ? String(a.assignedTo) : '', notes: a.notes || '', status: a.status || 'pending',
    })),
    status: raw.status || 'draft',
    reportId: raw.reportId || '',
  } as any
}

export default function ReportsTab({ compose, openReportId, clients, onConsumed, onChanged }: {
  compose: ReportDraftContext | null
  openReportId: string | null
  clients: any[]
  onConsumed: () => void
  onChanged: () => void
}) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<{ kind: 'list' } | { kind: 'view' | 'edit'; report: any } | { kind: 'create'; ctx: ReportDraftContext | null }>({ kind: 'list' })
  const [toSubmit, setToSubmit] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string; details?: string[] } | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/maintenance/reports?limit=100', { credentials: 'include' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setReports(d.reports || [])
      return (d.reports || []) as any[]
    } catch (e: any) {
      setError(e.message || 'Impossible de charger les rapports.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Ouverture demandée depuis une fiche intervention ou une notification
  useEffect(() => {
    if (compose && !loading) {
      const existing = reports.find(r => String(r.interventionId?._id || r.interventionId || '') === compose.interventionId)
      setMode(existing ? { kind: editable(existing.status) ? 'edit' : 'view', report: existing } : { kind: 'create', ctx: compose })
      onConsumed()
    }
  }, [compose, reports, loading, onConsumed])

  useEffect(() => {
    if (!openReportId || loading) return
    const r = reports.find(x => String(x._id) === openReportId)
    if (r) setMode({ kind: editable(r.status) ? 'edit' : 'view', report: r })
    onConsumed()
  }, [openReportId, reports, loading, onConsumed])

  const counts = useMemo(() => ({
    all: reports.length,
    rejected: reports.filter(r => r.status === 'rejected').length,
    draft: reports.filter(r => r.status === 'draft').length,
    pending_validation: reports.filter(r => r.status === 'pending_validation').length,
    done: reports.filter(r => ['validated', 'published', 'archived'].includes(r.status)).length,
  }), [reports])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reports.filter(r => {
      if (filter === 'done' ? !['validated', 'published', 'archived'].includes(r.status) : filter !== 'all' && r.status !== filter) return false
      if (!q) return true
      return [r.reportId, r.site, r.clientId?.name, r.clientId?.company].some(v => String(v || '').toLowerCase().includes(q))
    })
  }, [reports, filter, search])

  async function confirmSubmit() {
    if (!toSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/maintenance/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reportId: toSubmit._id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice({ ok: false, text: d.error || 'Soumission impossible', details: Array.isArray(d.details) ? d.details : undefined })
      } else {
        setNotice({ ok: true, text: 'Rapport envoyé pour validation. Vous serez prévenu de la décision.' })
        await load()
        onChanged()
      }
    } catch {
      setNotice({ ok: false, text: 'Erreur réseau, réessayez.' })
    } finally {
      setSubmitting(false)
      setToSubmit(null)
    }
  }

  const backToList = async () => {
    setMode({ kind: 'list' })
    await load()
    onChanged()
  }

  if (mode.kind === 'create' || mode.kind === 'edit') {
    const raw = mode.kind === 'edit' ? mode.report : null
    const ctx = mode.kind === 'create' ? mode.ctx : null
    const existing: any = raw ? toFormValues(raw) : ctx ? {
      site: ctx.site || '', clientName: ctx.clientName || '', clientId: ctx.clientId || undefined, projectId: ctx.projectId || undefined,
      interventionType: ctx.interventionType || undefined, interventionDate: ctx.date || undefined,
      startTime: ctx.startTime || undefined, endTime: ctx.endTime || undefined,
    } : undefined
    return (
      <div className="space-y-4">
        <button onClick={backToList} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
          <ArrowLeft className="h-4 w-4" /> Mes rapports
        </button>
        {raw?.status === 'rejected' && raw.validation?.comments && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-800"><AlertTriangle className="h-4 w-4" /> Corrections demandées</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">{raw.validation.comments}</p>
          </div>
        )}
        <EnhancedMaintenanceForm
          key={raw?._id || ctx?.interventionId || 'new'}
          projectId={existing?.projectId}
          clientId={existing?.clientId}
          interventionId={raw ? (raw.interventionId?._id || raw.interventionId) : ctx?.interventionId}
          existingReportId={raw?._id}
          existingReport={existing}
          clients={clients}
          onSave={() => { load() }}
          onSubmit={() => { setNotice({ ok: true, text: 'Rapport envoyé pour validation.' }); backToList() }}
        />
      </div>
    )
  }

  if (mode.kind === 'view') {
    const r = mode.report
    const st = REPORT_STATUS[r.status] || REPORT_STATUS.draft
    const list = (arr?: string[]) => (arr || []).filter(s => String(s || '').trim())
    return (
      <div className="space-y-4">
        <button onClick={() => setMode({ kind: 'list' })} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
          <ArrowLeft className="h-4 w-4" /> Mes rapports
        </button>
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-stone-400">{r.reportId}</p>
              <h2 className="text-lg font-bold text-stone-900">{r.site}</h2>
              <p className="text-sm text-stone-500">{r.clientId?.company || r.clientId?.name} · {shortDate(r.interventionDate)} · {r.startTime || '–'} → {r.endTime || '–'}</p>
            </div>
            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st.chip}`}>{st.label}</span>
          </div>
          {r.validation?.comments && (
            <p className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600"><span className="font-semibold">Retour IT Vision : </span>{r.validation.comments}</p>
          )}
          {[
            { t: 'Observations initiales', v: r.initialObservations },
            { t: 'Problème constaté', v: r.problemDescription },
            { t: 'Résultats', v: r.results },
          ].filter(b => b.v && b.v !== 'N/A').map(b => (
            <div key={b.t}>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{b.t}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{b.v}</p>
            </div>
          ))}
          {list(r.tasksPerformed).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tâches réalisées</p>
              <ul className="mt-1 space-y-1">{list(r.tasksPerformed).map((t, n) => <li key={n} className="flex gap-2 text-sm text-stone-800"><CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />{t}</li>)}</ul>
            </div>
          )}
          {list(r.recommendations).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Recommandations</p>
              <ul className="mt-1 space-y-1">{list(r.recommendations).map((t, n) => <li key={n} className="flex gap-2 text-sm text-stone-800"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />{t}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Mes rapports</h2>
          <p className="text-xs text-stone-500">Relus par IT Vision puis publiés dans l’espace du client.</p>
        </div>
        <button onClick={() => setMode({ kind: 'create', ctx: null })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
          <Plus className="h-4 w-4" /> Nouveau
        </button>
      </div>

      {notice && (
        <div className={`rounded-xl px-4 py-3 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          <p className="font-medium">{notice.text}</p>
          {notice.details && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">{notice.details.map(d => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Référence, site ou client"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
            }`}>
            {f.label}
            {counts[f.id] > 0 && <span className={`ml-1.5 tabular-nums ${f.id === 'rejected' && filter !== f.id ? 'text-red-600' : 'opacity-60'}`}>{counts[f.id]}</span>}
          </button>
        ))}
      </div>

      {loading && reports.length === 0 ? (
        <div className="space-y-2">{[0, 1, 2].map(n => <div key={n} className="h-20 animate-pulse rounded-2xl bg-stone-200/60" />)}</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-stone-300" />
          <p className="text-sm font-semibold text-stone-600">{reports.length === 0 ? 'Aucun rapport pour le moment' : 'Aucun rapport dans ce filtre'}</p>
          <p className="mt-1 text-xs text-stone-400">Un rapport détaillé se rédige depuis la fiche d’une intervention.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map(r => {
            const st = REPORT_STATUS[r.status] || REPORT_STATUS.draft
            return (
              <li key={r._id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-stone-400">{r.reportId} · {shortDate(r.interventionDate)}</p>
                    <p className="truncate text-sm font-bold text-stone-900">{r.site}</p>
                    <p className="truncate text-xs text-stone-500">{r.clientId?.company || r.clientId?.name}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.chip}`}>{st.label}</span>
                </div>
                {r.status === 'rejected' && r.validation?.comments && (
                  <p className="mt-2 line-clamp-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{r.validation.comments}</p>
                )}
                <div className="mt-3 flex gap-2">
                  {editable(r.status) ? (
                    <>
                      <button onClick={() => setMode({ kind: 'edit', report: r })}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                        <Pencil className="h-3.5 w-3.5" /> {r.status === 'rejected' ? 'Corriger' : 'Compléter'}
                      </button>
                      {r.status === 'draft' && (
                        <button onClick={() => { setNotice(null); setToSubmit(r) }}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2 text-xs font-semibold text-white hover:bg-emerald-900">
                          <Send className="h-3.5 w-3.5" /> Soumettre
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => setMode({ kind: 'view', report: r })}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                      <Eye className="h-3.5 w-3.5" /> Consulter
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ModernModal isOpen={!!toSubmit} onClose={() => setToSubmit(null)} title="Soumettre le rapport"
        subtitle="Il sera relu par IT Vision avant publication au client" icon={<Send className="h-5 w-5 text-white" />} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">Une fois soumis, le rapport n’est plus modifiable sauf si des corrections sont demandées. L’intervention liée sera marquée terminée.</p>
          <ModalActions>
            <ModalSecondaryButton onClick={() => setToSubmit(null)} disabled={submitting}>Annuler</ModalSecondaryButton>
            <ModalPrimaryButton onClick={confirmSubmit} loading={submitting} icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>Soumettre</ModalPrimaryButton>
          </ModalActions>
        </div>
      </ModernModal>
    </div>
  )
}
