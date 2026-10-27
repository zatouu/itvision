'use client'

import { useEffect, useMemo, useState } from 'react'
import { Crown, Loader2, Phone, Search, Settings2, UserPlus, Users, X } from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'
import type { ProjectTeamMember } from '@/lib/projects/workflow'

interface TechOption { _id: string; name: string; specialties?: string[]; isActive?: boolean; isAvailable?: boolean }

const since = (d?: string | Date | null) => {
  if (!d) return 'aucune activité consignée'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  return days <= 0 ? 'actif aujourd’hui' : days === 1 ? 'actif hier' : `dernière activité il y a ${days} j`
}

/**
 * Équipe terrain du projet : responsable + membres. L'équipe est facultative — sans elle,
 * l'administrateur pilote le projet seul (tâches, journal) et y intègre les techniciens au fil de l'eau.
 */
export default function ProjectTeamCard({ projectId, team, onChanged }: {
  projectId: string
  team: ProjectTeamMember[]
  onChanged: (team: ProjectTeamMember[]) => void
}) {
  const toast = useToastContext()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<TechOption[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [lead, setLead] = useState('')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const openEditor = () => {
    setSelected(team.map(m => m.id))
    setLead(team.find(m => m.role === 'lead')?.id || '')
    setQuery('')
    setOpen(true)
  }

  useEffect(() => {
    if (!open || options) return
    fetch('/api/technicians?limit=100', { credentials: 'include' })
      .then(readJsonResponse)
      .then(d => setOptions((d.technicians || []).map((t: any) => ({ _id: String(t._id), name: t.name, specialties: t.specialties, isActive: t.isActive, isAvailable: t.isAvailable }))))
      .catch(() => setOptions([]))
  }, [open, options])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (options || [])
      .filter(t => t.isActive !== false || selected.includes(t._id))
      .filter(t => !q || [t.name, ...(t.specialties || [])].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => Number(selected.includes(b._id)) - Number(selected.includes(a._id)) || a.name.localeCompare(b.name))
  }, [options, query, selected])

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
    if (lead === id) setLead('')
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadTechnicianId: lead || null, technicianIds: selected }),
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data, 'Enregistrement impossible'))
      onChanged(data.team || [])
      toast.success('Équipe mise à jour', { description: 'Les techniciens ajoutés sont prévenus dans leur espace.' })
      setOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const sorted = [...team].sort((a, b) => Number(b.role === 'lead') - Number(a.role === 'lead'))

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-900">Équipe terrain</h3>
        </div>
        <button type="button" onClick={openEditor} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          <Settings2 className="h-3.5 w-3.5" />Gérer
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">Aucun technicien : vous pilotez ce projet seul. Ajoutez l’équipe quand elle est prête à utiliser l’outil.</p>
          <button type="button" onClick={openEditor} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            <UserPlus className="h-4 w-4" />Affecter des techniciens
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map(m => (
            <li key={m.id} className="flex items-start gap-2.5">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.role === 'lead' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-stone-900">
                  <span className="truncate">{m.name}</span>
                  {m.role === 'lead' && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"><Crown className="h-3 w-3" />Responsable</span>}
                  {m.isActive === false && <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">Désactivé</span>}
                </p>
                <p className="text-xs text-stone-500">{m.openTasks ? `${m.openTasks} tâche(s) ouverte(s)` : 'Aucune tâche ouverte'} · {since(m.lastActivityAt)}</p>
              </div>
              {m.phone && (
                <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`} aria-label={`Appeler ${m.name}`} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-100 p-4">
              <div>
                <p className="text-sm font-semibold text-stone-900">Équipe du projet</p>
                <p className="text-xs text-stone-500">Cochez les techniciens, puis désignez le responsable.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="border-b border-stone-100 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou spécialité" className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-3 text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {options === null ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
              ) : visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-stone-500">Aucun technicien trouvé.</p>
              ) : (
                <ul className="space-y-1">
                  {visible.map(t => {
                    const checked = selected.includes(t._id)
                    return (
                      <li key={t._id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${checked ? 'bg-blue-50' : 'hover:bg-stone-50'}`}>
                        <input id={`tech-${t._id}`} type="checkbox" checked={checked} onChange={() => toggle(t._id)} className="h-4 w-4 rounded border-stone-300" />
                        <label htmlFor={`tech-${t._id}`} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block truncate text-sm font-medium text-stone-900">{t.name}</span>
                          <span className="block truncate text-xs text-stone-500">{(t.specialties || []).join(', ') || '—'}{t.isAvailable === false ? ' · indisponible' : ''}</span>
                        </label>
                        {checked && (
                          <button type="button" onClick={() => setLead(lead === t._id ? '' : t._id)}
                            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${lead === t._id ? 'bg-amber-100 text-amber-800' : 'border border-stone-200 text-stone-600 hover:bg-white'}`}>
                            <Crown className="h-3.5 w-3.5" />{lead === t._id ? 'Responsable' : 'Désigner'}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">{selected.length} technicien(s){lead ? '' : ' · pas de responsable'}</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Annuler</button>
                <button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
