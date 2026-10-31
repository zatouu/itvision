'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Clock, Eye, EyeOff, Loader2, NotebookPen, RotateCcw, Send, Trash2, X } from 'lucide-react'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'
import { uploadFile } from '@/lib/http/upload-file'
import {
  JOURNAL_INPUT_KINDS,
  JOURNAL_KIND_META,
  TASK_STATUS_META,
  type JournalKind,
  type ProjectJournalEntry,
  type ProjectTask,
  type ProjectTeamMember,
  type TaskStatus,
} from '@/lib/projects/workflow'

type Filter = 'all' | 'blocker' | 'progress' | 'task' | 'presence'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'progress', label: 'Avancement' },
  { id: 'blocker', label: 'Blocages' },
  { id: 'task', label: 'Tâches' },
  { id: 'presence', label: 'Présences' },
]

const PLACEHOLDER: Record<string, string> = {
  progress: 'Ce qui a été fait aujourd’hui : câbles tirés, caméras posées, tests…',
  blocker: 'Ce qui bloque : matériel manquant, accès refusé, attente client…',
  note: 'Information utile pour l’équipe ou le suivi',
}

const when = (d: string | Date) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export interface JournalMutation { tasks?: ProjectTask[]; progress?: number | null }

/**
 * Journal de chantier d'un projet, partagé entre la fiche admin et le portail technicien.
 * - Technicien : consigne en son nom, coche ses tâches avancées, signale un blocage, joint des photos.
 * - Admin : consigne en son nom ou pour le compte d'un membre de l'équipe, publie une entrée au client.
 */
export default function ProjectJournal({ projectId, mode, tasks, team, techId, canManage, initial, onMutated }: {
  projectId: string
  mode: 'admin' | 'tech'
  tasks: ProjectTask[]
  team: ProjectTeamMember[]
  /** Fiche du technicien connecté (mode tech). */
  techId?: string
  /** Admin ou responsable : peut faire avancer toutes les tâches et lever les blocages. */
  canManage: boolean
  initial?: ProjectJournalEntry[]
  onMutated?: (m: JournalMutation) => void
}) {
  const [entries, setEntries] = useState<ProjectJournalEntry[] | null>(initial || null)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [kind, setKind] = useState<JournalKind>('progress')
  const [message, setMessage] = useState('')
  const [onBehalf, setOnBehalf] = useState('')
  const [updates, setUpdates] = useState<Record<string, TaskStatus>>({})
  const [photos, setPhotos] = useState<string[]>([])
  const [hours, setHours] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/journal?limit=200`, { credentials: 'include', cache: 'no-store' })
    const data = await readJsonResponse(res)
    if (res.ok && data.success) setEntries(data.journal || [])
    else setError(apiErrorMessage(res, data, 'Journal indisponible'))
  }, [projectId])

  useEffect(() => { if (!initial) load() }, [initial, load])
  useEffect(() => { if (initial) setEntries(initial) }, [initial])

  // Personne pour qui l'on consigne : soi-même (tech), ou le membre choisi par l'admin
  const actingFor = mode === 'tech' ? techId : onBehalf || undefined
  const taskTitle = useMemo(() => new Map(tasks.map(t => [t.id, t.title])), [tasks])
  const advanceable = useMemo(() => tasks
    .filter(t => t.status !== 'done')
    .filter(t => canManage || !t.assigneeId || t.assigneeId === techId)
    .sort((a, b) => Number(b.assigneeId === actingFor) - Number(a.assigneeId === actingFor)), [tasks, canManage, techId, actingFor])

  const shown = useMemo(() => (entries || []).filter(e => filter === 'all' || e.kind === filter || (filter === 'progress' && e.kind === 'report')), [entries, filter])
  const openBlockers = (entries || []).filter(e => e.kind === 'blocker' && !e.resolvedAt).length

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true); setError('')
    try {
      for (const file of Array.from(files).slice(0, 12 - photos.length)) {
        const up = await uploadFile(file, { fields: { type: 'projects' } })
        setPhotos(p => [...p, up.url])
      }
    } catch (e: any) {
      setError(e?.message || 'Envoi de la photo impossible')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => { setMessage(''); setUpdates({}); setPhotos([]); setHours(''); setKind('progress') }

  const submit = async () => {
    setSending(true); setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/journal`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind, message, photos, hours: hours || undefined,
          taskUpdates: Object.entries(updates).map(([taskId, status]) => ({ taskId, status })),
          ...(mode === 'admin' && onBehalf ? { technicianId: onBehalf } : {}),
        }),
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data, 'Enregistrement impossible'))
      reset()
      onMutated?.({ tasks: data.tasks, progress: data.progress })
      await load()
    } catch (e: any) {
      setError(e?.message || 'Enregistrement impossible')
    } finally {
      setSending(false)
    }
  }

  const patch = async (entry: ProjectJournalEntry, body: Record<string, unknown>) => {
    setBusyId(entry.id); setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/journal`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, ...body }),
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data, 'Modification impossible'))
      setEntries(prev => (prev || []).map(e => (e.id === entry.id ? data.entry : e)))
    } catch (e: any) {
      setError(e?.message || 'Modification impossible')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (entry: ProjectJournalEntry) => {
    if (!confirm('Supprimer cette entrée du journal ?')) return
    setBusyId(entry.id)
    try {
      const res = await fetch(`/api/projects/${projectId}/journal?entryId=${encodeURIComponent(entry.id)}`, { method: 'DELETE', credentials: 'include' })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiErrorMessage(res, data, 'Suppression impossible'))
      setEntries(prev => (prev || []).filter(e => e.id !== entry.id))
    } catch (e: any) {
      setError(e?.message || 'Suppression impossible')
    } finally {
      setBusyId(null)
    }
  }

  const canSend = !sending && !uploading && (message.trim() || Object.keys(updates).length || photos.length)
  const accent = mode === 'tech' ? 'bg-emerald-800 hover:bg-emerald-900' : 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="space-y-4">
      {/* Saisie */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900"><NotebookPen className="h-4 w-4 text-stone-400" />Consigner</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {JOURNAL_INPUT_KINDS.map(k => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${kind === k ? (k === 'blocker' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white') : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {JOURNAL_KIND_META[k].label}
            </button>
          ))}
        </div>

        {mode === 'admin' && team.length > 0 && (
          <label className="mb-3 block text-xs font-medium text-stone-600">Consigné pour
            <select value={onBehalf} onChange={e => setOnBehalf(e.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
              <option value="">Moi (administration)</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name}{m.role === 'lead' ? ' (responsable)' : ''}</option>)}
            </select>
          </label>
        )}

        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder={PLACEHOLDER[kind]}
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none" />

        {advanceable.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-stone-600">Tâches avancées</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {advanceable.map(t => (
                <li key={t.id} className="flex flex-col gap-1.5 rounded-xl bg-stone-50 px-3 py-2 sm:flex-row sm:items-center">
                  <span className="min-w-0 flex-1 text-sm text-stone-800">
                    {t.title}
                    {t.assignee && <span className="ml-1.5 text-xs text-stone-400">· {t.assignee}</span>}
                  </span>
                  <select value={updates[t.id] || ''} onChange={e => setUpdates(u => {
                    const next = { ...u }
                    if (e.target.value) next[t.id] = e.target.value as TaskStatus
                    else delete next[t.id]
                    return next
                  })} className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs">
                    <option value="">{TASK_STATUS_META[t.status].label} (inchangée)</option>
                    {(['in_progress', 'review', 'done'] as TaskStatus[]).filter(s => s !== t.status).map(s => <option key={s} value={s}>→ {TASK_STATUS_META[s].label}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map(url => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" onClick={() => setPhotos(p => p.filter(x => x !== url))} aria-label="Retirer la photo"
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-stone-900 p-0.5 text-white"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}Photos
              <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
            </label>
            <label className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs text-stone-600">
              <Clock className="h-4 w-4" />
              <input type="number" min="0" max="24" step="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="h" aria-label="Heures passées" className="w-12 bg-transparent text-sm focus:outline-none" />
            </label>
          </div>
          <button type="button" onClick={submit} disabled={!canSend}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${kind === 'blocker' ? 'bg-red-600 hover:bg-red-700' : accent}`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {kind === 'blocker' ? 'Signaler' : 'Enregistrer'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
      </div>

      {/* Fil */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`}>
            {f.label}{f.id === 'blocker' && openBlockers > 0 && <span className="ml-1 text-red-500">{openBlockers}</span>}
          </button>
        ))}
      </div>

      {entries === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          {entries.length ? 'Rien dans ce filtre.' : 'Le journal est vide : chaque avancement consigné s’affiche ici.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map(e => {
            const meta = JOURNAL_KIND_META[e.kind] || JOURNAL_KIND_META.note
            const blockerOpen = e.kind === 'blocker' && !e.resolvedAt
            const canResolve = e.kind === 'blocker' && (canManage || (!!techId && e.technicianId === techId))
            return (
              <li key={e.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${blockerOpen ? 'border-red-200' : 'border-stone-200'}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className="text-sm font-medium text-stone-900">{e.onBehalfOf || e.authorName}</span>
                  {e.onBehalfOf && <span className="text-xs text-stone-400">saisi par {e.authorName}</span>}
                  <span className="text-xs text-stone-400">· {when(e.date)}</span>
                  {e.hours ? <span className="text-xs text-stone-400">· {e.hours} h</span> : null}
                  {e.clientVisible && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">Visible client</span>}
                  {e.kind === 'blocker' && e.resolvedAt && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Levé</span>}
                </div>
                <p className={`mt-1.5 whitespace-pre-wrap text-sm ${e.kind === 'task' ? 'text-stone-600' : 'text-stone-800'}`}>{e.message}</p>
                {e.geo && (
                  <a href={`https://www.google.com/maps?q=${e.geo.lat},${e.geo.lng}`} target="_blank" rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-teal-700 hover:underline">
                    Position au pointage
                  </a>
                )}
                {e.kind !== 'task' && !!e.taskIds?.length && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.taskIds.map(id => taskTitle.get(id) && (
                      <span key={id} className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{taskTitle.get(id)}</span>
                    ))}
                  </div>
                )}
                {!!e.photos?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {e.photos.map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {(canResolve || mode === 'admin') && e.kind !== 'task' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canResolve && (
                      <button type="button" disabled={busyId === e.id} onClick={() => patch(e, { resolved: blockerOpen })}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50">
                        {blockerOpen ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Lever le blocage</> : <><RotateCcw className="h-3.5 w-3.5" />Rouvrir</>}
                      </button>
                    )}
                    {mode === 'admin' && (
                      <>
                        <button type="button" disabled={busyId === e.id} onClick={() => patch(e, { clientVisible: !e.clientVisible })}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50">
                          {e.clientVisible ? <><EyeOff className="h-3.5 w-3.5" />Retirer du portail client</> : <><Eye className="h-3.5 w-3.5" />Publier au client</>}
                        </button>
                        <button type="button" disabled={busyId === e.id} onClick={() => remove(e)} aria-label="Supprimer l’entrée"
                          className="inline-flex items-center rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                )}
                {blockerOpen && !canResolve && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5" />En attente de résolution</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
