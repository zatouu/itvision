'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Crown, FolderKanban, Loader2, MapPin, Navigation, Phone, Plus, Users,
} from 'lucide-react'
import ProjectJournal from '@/components/projects/ProjectJournal'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'
import {
  TASK_STATUSES,
  TASK_STATUS_META,
  type ProjectJournalEntry,
  type ProjectTask,
  type ProjectTeamMember,
  type TaskStatus,
} from '@/lib/projects/workflow'
import { mapsUrl, shortDate, telUrl } from './tech-ui'

interface ProjectItem {
  id: string
  name: string
  status: string
  progress: number
  address: string
  client: string
  endDate: string | null
  role: 'lead' | 'member'
  myOpenTasks: number
  freeTasks: number
  tasksDone: number
  tasksTotal: number
  openBlockers: number
  nextMilestone: { name: string; dueDate: string | null } | null
  active: boolean
}

interface Detail {
  myRole: 'lead' | 'member'
  techId: string
  canManage: boolean
  project: {
    id: string; name: string; description: string; statusLabel: string; progress: number; address: string; currentPhase: string
    startDate: string | null; endDate: string | null
    client: { company?: string; contact?: string; phone?: string } | null
    site: { name?: string; address?: string; access?: string; constraints: string[]; contacts: Array<{ name: string; role?: string; phone?: string }> } | null
    milestones: Array<{ id: string; name: string; status: string; dueDate: string | null }>
    tasks: ProjectTask[]
  }
  team: ProjectTeamMember[]
  journal: ProjectJournalEntry[]
}

const MILESTONE_LABEL: Record<string, string> = { pending: 'À venir', in_progress: 'En cours', completed: 'Terminé', delayed: 'En retard' }

/** Onglet « Projets » du portail technicien : projets de son équipe, ses tâches, le journal de chantier. */
export default function ProjectsTab({ refreshKey, openId, onOpened }: { refreshKey: number; openId: string | null; onOpened: () => void }) {
  const [items, setItems] = useState<ProjectItem[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/tech/projects', { credentials: 'include' })
      .then(async res => ({ res, data: await readJsonResponse(res) }))
      .then(({ res, data }) => {
        if (cancelled) return
        if (!res.ok) throw new Error(apiErrorMessage(res, data, 'Projets indisponibles'))
        setItems(data.projects || [])
        setError('')
      })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [refreshKey, selected])

  useEffect(() => {
    if (openId) { setSelected(openId); onOpened() }
  }, [openId, onOpened])

  if (selected) return <ProjectSheet id={selected} refreshKey={refreshKey} onBack={() => setSelected(null)} />

  const active = (items || []).filter(p => p.active)
  const closed = (items || []).filter(p => !p.active)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Mes projets</h2>
        <p className="text-xs text-stone-500">Chantiers dont vous faites partie : vos tâches et le journal de l’équipe.</p>
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : items === null ? (
        <div className="space-y-2">{[0, 1].map(n => <div key={n} className="h-28 animate-pulse rounded-2xl bg-stone-200/60" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <FolderKanban className="mx-auto mb-2 h-8 w-8 text-stone-300" />
          <p className="text-sm font-semibold text-stone-600">Aucun projet pour le moment</p>
          <p className="mt-1 text-xs text-stone-400">Vous serez prévenu dès qu’on vous affecte à un chantier.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">{active.map(p => <ProjectCard key={p.id} p={p} onOpen={() => setSelected(p.id)} />)}</ul>
          {closed.length > 0 && (
            <>
              <h3 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Terminés</h3>
              <ul className="space-y-2 opacity-80">{closed.map(p => <ProjectCard key={p.id} p={p} onOpen={() => setSelected(p.id)} />)}</ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

function ProjectCard({ p, onOpen }: { p: ProjectItem; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-bold text-stone-900">
              {p.role === 'lead' && <Crown className="h-4 w-4 flex-shrink-0 text-amber-500" aria-label="Responsable" />}
              <span className="truncate">{p.name}</span>
            </p>
            <p className="truncate text-xs text-stone-500">{[p.client, p.address].filter(Boolean).join(' · ')}</p>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-300" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, p.progress)}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-stone-600">{p.progress} %</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          {p.myOpenTasks > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">{p.myOpenTasks} tâche{p.myOpenTasks > 1 ? 's' : ''} pour vous</span>}
          {p.freeTasks > 0 && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">{p.freeTasks} libre{p.freeTasks > 1 ? 's' : ''}</span>}
          {p.openBlockers > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700"><AlertTriangle className="h-3 w-3" />{p.openBlockers} blocage{p.openBlockers > 1 ? 's' : ''}</span>}
          {p.nextMilestone && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">Jalon : {p.nextMilestone.name}{p.nextMilestone.dueDate ? ` · ${shortDate(p.nextMilestone.dueDate)}` : ''}</span>}
        </div>
      </button>
    </li>
  )
}

function ProjectSheet({ id, refreshKey, onBack }: { id: string; refreshKey: number; onBack: () => void }) {
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'tasks' | 'journal' | 'infos'>('tasks')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/tech/projects/${id}`, { credentials: 'include', cache: 'no-store' })
    const d = await readJsonResponse(res)
    if (!res.ok) { setError(apiErrorMessage(res, d, 'Projet indisponible')); return }
    setData(d as Detail)
    setError('')
  }, [id])

  useEffect(() => { load() }, [load, refreshKey])

  const tasks = data?.project.tasks || []
  const me = data?.techId
  const canAdvance = (t: ProjectTask) => !!data && (data.canManage || !t.assigneeId || t.assigneeId === me)
  const groups = useMemo(() => {
    const open = tasks.filter(t => t.status !== 'done')
    return [
      { key: 'mine', title: 'Mes tâches', items: open.filter(t => t.assigneeId === me) },
      { key: 'free', title: 'Libres (à prendre)', items: open.filter(t => !t.assigneeId) },
      { key: 'others', title: 'Équipe', items: open.filter(t => t.assigneeId && t.assigneeId !== me) },
      { key: 'done', title: 'Terminées', items: tasks.filter(t => t.status === 'done') },
    ].filter(g => g.items.length)
  }, [tasks, me])

  const call = async (method: 'PATCH' | 'POST', body: unknown) => {
    const res = await fetch(`/api/projects/${id}/tasks`, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await readJsonResponse(res)
    if (!res.ok || !d.success) throw new Error(apiErrorMessage(res, d, 'Opération impossible'))
    setData(prev => prev ? { ...prev, project: { ...prev.project, tasks: d.tasks || prev.project.tasks, progress: d.progress ?? prev.project.progress } } : prev)
  }

  const move = async (task: ProjectTask, status: TaskStatus) => {
    setBusy(task.id); setNotice('')
    try {
      await call('PATCH', { taskId: task.id, status })
      if (status === 'done') setNotice(`« ${task.title} » terminée. Pensez à consigner ce qui a été fait.`)
      load()
    } catch (e: any) {
      setNotice(e.message)
    } finally {
      setBusy(null)
    }
  }

  const addTask = async () => {
    if (!newTitle.trim()) return
    setBusy('new')
    try {
      await call('POST', { title: newTitle.trim(), assigneeId: newAssignee })
      setNewTitle(''); setNewAssignee('')
    } catch (e: any) {
      setNotice(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (error) return (
    <div className="space-y-3">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500"><ArrowLeft className="h-4 w-4" />Mes projets</button>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    </div>
  )
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>

  const p = data.project
  const lead = data.team.find(m => m.role === 'lead')

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" />Mes projets</button>

      <section className="rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-200">
          <span>{p.statusLabel}</span>
          {data.myRole === 'lead' && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 font-semibold text-amber-200"><Crown className="h-3 w-3" />Vous êtes responsable</span>}
        </div>
        <h2 className="mt-1 text-lg font-bold">{p.name}</h2>
        <p className="text-sm text-emerald-100/90">{p.client?.company || p.client?.contact}</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(100, p.progress)}%` }} /></div>
          <span className="text-sm font-bold tabular-nums">{p.progress} %</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.address && <a href={mapsUrl(p.site?.address || p.address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15"><Navigation className="h-3.5 w-3.5" />Itinéraire</a>}
          {lead && lead.id !== me && lead.phone && <a href={telUrl(lead.phone)} className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15"><Phone className="h-3.5 w-3.5" />Responsable</a>}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/60 p-1">
        {([['tasks', 'Tâches'], ['journal', 'Journal'], ['infos', 'Infos']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`rounded-xl py-2 text-sm font-semibold ${view === k ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>{l}</button>
        ))}
      </div>

      {notice && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800" role="status">{notice}</p>}

      {view === 'tasks' && (
        <div className="space-y-4">
          {data.canManage && (
            <div className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-row">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nouvelle tâche" className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm" />
              <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
                <option value="">Libre</option>
                {data.team.map(m => <option key={m.id} value={m.id}>{m.id === me ? 'Moi' : m.name}</option>)}
              </select>
              <button onClick={addTask} disabled={!newTitle.trim() || busy === 'new'} className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Ajouter
              </button>
            </div>
          )}
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Aucune tâche sur ce projet pour l’instant.</p>
          ) : groups.map(g => (
            <section key={g.key} className="space-y-2">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">{g.title} · {g.items.length}</h3>
              <ul className="space-y-2">
                {g.items.map(t => (
                  <li key={t.id} className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-start gap-2">
                      {t.status === 'done' ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> : <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${t.status === 'todo' ? 'bg-stone-300' : 'bg-sky-500'}`} />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${t.status === 'done' ? 'text-stone-500 line-through' : 'text-stone-900'}`}>{t.title}</p>
                        {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{t.description}</p>}
                        <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-stone-400">
                          {t.assignee && g.key !== 'mine' && <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{t.assignee}</span>}
                          {t.dueDate && <span className="inline-flex items-center gap-0.5"><CalendarDays className="h-3 w-3" />{shortDate(t.dueDate)}</span>}
                        </p>
                      </div>
                    </div>
                    {canAdvance(t) && (
                      <div className="mt-2.5 flex gap-1.5">
                        {TASK_STATUSES.filter(s => s !== t.status && s !== 'review').map(s => (
                          <button key={s} onClick={() => move(t, s)} disabled={busy === t.id}
                            className={`flex-1 rounded-xl py-2 text-xs font-semibold disabled:opacity-50 ${s === 'done' ? 'bg-emerald-800 text-white' : 'border border-stone-200 text-stone-700'}`}>
                            {busy === t.id ? '…' : s === 'todo' ? 'Remettre à faire' : s === 'in_progress' ? (t.assigneeId ? 'Commencer' : 'Je la prends') : TASK_STATUS_META[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {view === 'journal' && (
        <ProjectJournal
          projectId={p.id}
          mode="tech"
          tasks={tasks}
          team={data.team}
          techId={me}
          canManage={data.canManage}
          initial={data.journal}
          onMutated={() => load()}
        />
      )}

      {view === 'infos' && (
        <div className="space-y-3">
          {(p.site?.access || p.site?.constraints?.length || p.description) && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
              {p.description && <p className="whitespace-pre-wrap text-stone-700">{p.description}</p>}
              {p.site?.access && <p className="mt-2 text-stone-700"><span className="font-semibold">Accès : </span>{p.site.access}</p>}
              {!!p.site?.constraints?.length && <ul className="mt-2 list-inside list-disc text-stone-600">{p.site.constraints.map(c => <li key={c}>{c}</li>)}</ul>}
            </div>
          )}
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-900"><MapPin className="h-4 w-4 text-stone-400" />{p.site?.address || p.address || 'Adresse non renseignée'}</p>
            {p.site?.contacts?.map(c => (
              <a key={`${c.name}-${c.phone}`} href={telUrl(c.phone)} className="flex items-center justify-between border-t border-stone-100 py-2 text-sm">
                <span>{c.name}{c.role ? <span className="text-stone-400"> · {c.role}</span> : null}</span>
                {c.phone && <Phone className="h-4 w-4 text-emerald-700" />}
              </a>
            ))}
          </div>
          {p.milestones.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-stone-900">Jalons</p>
              <ul className="space-y-2">
                {p.milestones.map(m => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className={m.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-800'}>{m.name}</span>
                    <span className="flex-shrink-0 text-xs text-stone-500">{MILESTONE_LABEL[m.status] || m.status}{m.dueDate ? ` · ${shortDate(m.dueDate)}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-stone-900">Équipe</p>
            <ul className="space-y-2">
              {data.team.map(m => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5">{m.role === 'lead' && <Crown className="h-3.5 w-3.5 text-amber-500" />}{m.id === me ? `${m.name} (vous)` : m.name}</span>
                  {m.phone && m.id !== me && <a href={telUrl(m.phone)} aria-label={`Appeler ${m.name}`} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50"><Phone className="h-4 w-4" /></a>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
