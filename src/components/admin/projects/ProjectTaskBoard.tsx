'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { CalendarDays, GripVertical, Loader2, Pencil, Plus, Trash2, User, X } from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  TASK_STATUSES,
  TASK_STATUS_META,
  type ProjectTask,
  type TaskStatus,
} from '@/lib/projects/workflow'

interface Milestone { id: string; name: string }

type Draft = { taskId?: string; title: string; description: string; status: TaskStatus; priority: ProjectTask['priority']; assignee: string; dueDate: string; milestoneId: string }

const emptyDraft = (status: TaskStatus = 'todo'): Draft => ({ title: '', description: '', status, priority: 'medium', assignee: '', dueDate: '', milestoneId: '' })
const dateInput = (d?: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : '')

export default function ProjectTaskBoard({
  projectId,
  milestones = [],
  team = [],
  onProgress,
}: {
  projectId: string
  milestones?: Milestone[]
  team?: string[]
  onProgress?: (progress: number | null) => void
}) {
  const toast = useToastContext()
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TaskStatus | null>(null)
  const moveQueue = useRef<Promise<void>>(Promise.resolve())

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { credentials: 'include', cache: 'no-store' })
      const data = await readJsonResponse(res)
      if (res.ok && data.success) setTasks(data.tasks || [])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const call = async (method: 'POST' | 'PATCH' | 'DELETE', body?: unknown, query = '') => {
    const res = await fetch(`/api/projects/${projectId}/tasks${query}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await readJsonResponse(res)
    if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data, 'Opération impossible'))
    setTasks(data.tasks || [])
    onProgress?.(data.progress ?? null)
    return data
  }

  const columns = useMemo(() => TASK_STATUSES.map(status => ({
    status,
    items: tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order),
  })), [tasks])

  const moveTask = (id: string, status: TaskStatus, beforeId?: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const target = tasks.filter(t => t.status === status && t.id !== id).sort((a, b) => a.order - b.order)
    const index = beforeId ? Math.max(0, target.findIndex(t => t.id === beforeId)) : target.length
    target.splice(index, 0, { ...task, status })
    const moves = target.map((t, i) => ({ id: t.id, status, order: i }))
    // Mise à jour optimiste : la carte bouge immédiatement
    setTasks(prev => prev.map(t => { const m = moves.find(x => x.id === t.id); return m ? { ...t, status: m.status, order: m.order } : t }))
    // Envois en série : deux déplacements rapprochés ne se croisent pas
    moveQueue.current = moveQueue.current.then(async () => {
      try {
        await call('PATCH', { moves })
      } catch (e: any) {
        toast.error(e?.message || 'Déplacement impossible')
        await load()
      }
    })
  }

  const onDrop = (e: DragEvent, status: TaskStatus, beforeId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData('text/task-id') || dragId
    setOverCol(null)
    setDragId(null)
    if (id) moveTask(id, status, beforeId)
  }

  const save = async () => {
    if (!draft?.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        assignee: draft.assignee,
        dueDate: draft.dueDate || null,
        milestoneId: draft.milestoneId,
      }
      if (draft.taskId) await call('PATCH', { taskId: draft.taskId, ...payload })
      else await call('POST', payload)
      toast.success(draft.taskId ? 'Tâche mise à jour' : 'Tâche ajoutée')
      setDraft(null)
    } catch (e: any) {
      toast.error(e?.message || 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (task: ProjectTask) => {
    if (!confirm(`Supprimer la tâche « ${task.title} » ?`)) return
    try {
      await call('DELETE', undefined, `?taskId=${encodeURIComponent(task.id)}`)
      toast.success('Tâche supprimée')
    } catch (e: any) {
      toast.error(e?.message || 'Suppression impossible')
    }
  }

  const done = tasks.filter(t => t.status === 'done').length

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-900">Tableau des tâches</p>
          <p className="text-xs text-stone-500">{tasks.length ? `${done}/${tasks.length} terminée(s) — l’avancement du projet suit le tableau` : 'Découpez le projet en tâches : l’avancement est calculé automatiquement.'}</p>
        </div>
        <button type="button" onClick={() => setDraft(emptyDraft())} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />Nouvelle tâche
        </button>
      </div>
      {tasks.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round((done / tasks.length) * 100)}%` }} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map(col => (
          <div
            key={col.status}
            onDragOver={e => { if (dragId) { e.preventDefault(); setOverCol(col.status) } }}
            onDragLeave={() => setOverCol(c => (c === col.status ? null : c))}
            onDrop={e => onDrop(e, col.status)}
            className={`flex min-h-[8rem] flex-col rounded-2xl border p-2 transition-colors ${overCol === col.status ? 'border-blue-400 bg-blue-50/60' : 'border-stone-200 bg-stone-50'}`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TASK_STATUS_META[col.status].color}`}>{TASK_STATUS_META[col.status].label}</span>
              <span className="text-xs text-stone-400">{col.items.length}</span>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {col.items.map(task => {
                const late = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().toDateString())
                return (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/task-id', task.id); e.dataTransfer.effectAllowed = 'move'; setDragId(task.id) }}
                    onDragEnd={() => { setDragId(null); setOverCol(null) }}
                    onDragOver={e => { if (dragId) e.preventDefault() }}
                    onDrop={e => onDrop(e, col.status, task.id)}
                    className={`group rounded-xl border bg-white p-2.5 shadow-sm ${dragId === task.id ? 'opacity-50' : ''} ${late ? 'border-red-200' : 'border-stone-200'}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 hidden h-4 w-4 flex-shrink-0 cursor-grab text-stone-300 md:block" aria-hidden="true" />
                      <button type="button" onClick={() => setDraft({ taskId: task.id, title: task.title, description: task.description || '', status: task.status, priority: task.priority, assignee: task.assignee || '', dueDate: dateInput(task.dueDate), milestoneId: task.milestoneId || '' })}
                        className="min-w-0 flex-1 text-left text-sm font-medium text-stone-900 hover:text-blue-700">
                        {task.title}
                      </button>
                      <button type="button" onClick={() => remove(task)} aria-label="Supprimer la tâche" className="rounded p-0.5 text-stone-300 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`rounded px-1.5 py-0.5 font-medium ${TASK_PRIORITY_META[task.priority].color}`}>{TASK_PRIORITY_META[task.priority].label}</span>
                      {task.assignee && <span className="inline-flex items-center gap-0.5 text-stone-500"><User className="h-3 w-3" />{task.assignee}</span>}
                      {task.dueDate && <span className={`inline-flex items-center gap-0.5 ${late ? 'font-semibold text-red-600' : 'text-stone-500'}`}><CalendarDays className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>}
                    </div>
                    {/* Mobile : pas de glisser-déposer tactile, changement de colonne par liste */}
                    <select
                      aria-label="Déplacer la tâche"
                      value={task.status}
                      onChange={e => moveTask(task.id, e.target.value as TaskStatus)}
                      className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs md:hidden"
                    >
                      {TASK_STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS_META[s].label}</option>)}
                    </select>
                  </li>
                )
              })}
            </ul>
            <button type="button" onClick={() => setDraft(emptyDraft(col.status))} className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-stone-500 hover:bg-white hover:text-stone-800">
              <Plus className="h-3.5 w-3.5" />Ajouter
            </button>
          </div>
        ))}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={() => setDraft(null)}>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-stone-900"><Pencil className="h-4 w-4" />{draft.taskId ? 'Modifier la tâche' : 'Nouvelle tâche'}</p>
              <button type="button" onClick={() => setDraft(null)} aria-label="Fermer" className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-stone-600">Titre
                <input autoFocus value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" placeholder="Ex. Tirer les câbles du bâtiment B" />
              </label>
              <label className="block text-xs font-medium text-stone-600">Description
                <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-stone-600">Colonne
                  <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as TaskStatus })} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm">
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS_META[s].label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-stone-600">Priorité
                  <select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as ProjectTask['priority'] })} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm">
                    {TASK_PRIORITIES.map(p => <option key={p} value={p}>{TASK_PRIORITY_META[p].label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-stone-600">Responsable
                  <input list="project-team" value={draft.assignee} onChange={e => setDraft({ ...draft, assignee: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" placeholder="Nom" />
                  <datalist id="project-team">{team.map(t => <option key={t} value={t} />)}</datalist>
                </label>
                <label className="block text-xs font-medium text-stone-600">Échéance
                  <input type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
                </label>
              </div>
              {milestones.length > 0 && (
                <label className="block text-xs font-medium text-stone-600">Jalon
                  <select value={draft.milestoneId} onChange={e => setDraft({ ...draft, milestoneId: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm">
                    <option value="">Aucun</option>
                    {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Annuler</button>
              <button type="button" onClick={save} disabled={saving || !draft.title.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
