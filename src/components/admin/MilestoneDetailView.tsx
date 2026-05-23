'use client'

import { useState, useEffect } from 'react'
import {
  X, CheckCircle2, Circle, AlertTriangle, Clock, FileText,
  Camera, Star, Lightbulb, BookOpen, Users, ChevronRight,
  Save, Loader2, Plus, Trash2, Flag
} from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'

interface Milestone {
  id: string
  name: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  dueDate?: string
  completedDate?: string
  checklist?: Array<{ label: string; done: boolean; required: boolean }>
  expectedDeliverables?: Array<{ name: string; description: string; done: boolean; url?: string }>
  fieldReport?: {
    observations?: string
    issues?: string[]
    satisfaction?: number
    realDuration?: number
    photos?: string[]
    signedBy?: string
    signedAt?: string
  }
  learnings?: Array<{ category: string; insight: string; author: string; createdAt: string }>
  phaseTemplate?: string
}

interface KnowledgeItem {
  _id: string
  phaseTemplate: string
  title: string
  description: string
  expectedTasks: Array<{ label: string; required: boolean; role: string; order: number }>
  expectedDeliverables: Array<{ name: string; description: string; templateUrl?: string }>
  guides: Array<{ title: string; content: string; type: string; url?: string }>
  communityLearnings: Array<{ category: string; insight: string; author: string; createdAt: string }>
}

interface MilestoneDetailViewProps {
  milestone: Milestone
  projectId: string
  projectServiceType?: string
  onClose: () => void
  onUpdate: (m: Milestone) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-700',
  process: 'bg-purple-100 text-purple-700',
  client: 'bg-green-100 text-green-700',
  safety: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-700'
}
const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technique', process: 'Process', client: 'Client', safety: 'Sécurité', other: 'Autre'
}

export default function MilestoneDetailView({ milestone, projectId, projectServiceType, onClose, onUpdate }: MilestoneDetailViewProps) {
  const toast = useToastContext()
  const [activeSection, setActiveSection] = useState<'overview' | 'checklist' | 'deliverables' | 'field' | 'learnings' | 'onboarding'>('overview')
  const [knowledge, setKnowledge] = useState<KnowledgeItem | null>(null)
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [saving, setSaving] = useState(false)

  // Local editable state
  const [editable, setEditable] = useState<Milestone>({ ...milestone })
  const [newCheck, setNewCheck] = useState('')
  const [newDeliverable, setNewDeliverable] = useState({ name: '', description: '' })
  const [newLearning, setNewLearning] = useState({ category: 'technical', insight: '' })
  const [newIssue, setNewIssue] = useState('')

  useEffect(() => { setEditable({ ...milestone }) }, [milestone])

  useEffect(() => {
    if (!milestone.phaseTemplate || !projectServiceType) return
    setLoadingKnowledge(true)
    fetch(`/api/admin/milestone-knowledge?phaseTemplate=${milestone.phaseTemplate}&serviceType=${projectServiceType}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setKnowledge(d.items?.[0] || null))
      .catch(() => {})
      .finally(() => setLoadingKnowledge(false))
  }, [milestone.phaseTemplate, projectServiceType])

  const persist = async (updated: Milestone) => {
    setSaving(true)
    try {
      // Utiliser l'API PATCH dédiée qui merge sans écraser les autres jalons
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ milestoneId: updated.id, updates: updated })
      })
      if (!res.ok) throw new Error()
      onUpdate(updated)
      toast.success('Jalon mis à jour')
    } catch {
      toast.error('Erreur de sauvegarde')
    } finally { setSaving(false) }
  }

  const toggleCheck = (idx: number) => {
    const next = { ...editable }
    next.checklist = next.checklist ? [...next.checklist] : []
    next.checklist[idx] = { ...next.checklist[idx], done: !next.checklist[idx].done }
    setEditable(next)
    // Auto-complete milestone if all required checks are done
    const allRequiredDone = next.checklist.filter(c => c.required).every(c => c.done)
    if (allRequiredDone && next.status !== 'completed') {
      next.status = 'completed'
      next.completedDate = new Date().toISOString()
      // Trigger event-driven orchestration
      fetch(`/api/projects/${projectId}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ type: 'milestone_completed', payload: { milestoneId: next.id } })
      }).catch(() => {})
    }
    persist(next)
  }

  const addCheck = () => {
    if (!newCheck.trim()) return
    const next = { ...editable }
    next.checklist = [...(next.checklist || []), { label: newCheck.trim(), done: false, required: false }]
    setEditable(next)
    setNewCheck('')
    persist(next)
  }

  const addDeliverable = () => {
    if (!newDeliverable.name.trim()) return
    const next = { ...editable }
    next.expectedDeliverables = [...(next.expectedDeliverables || []), { ...newDeliverable, done: false }]
    setEditable(next)
    setNewDeliverable({ name: '', description: '' })
    persist(next)
  }

  const toggleDeliverable = (idx: number) => {
    const next = { ...editable }
    next.expectedDeliverables = next.expectedDeliverables ? [...next.expectedDeliverables] : []
    next.expectedDeliverables[idx] = { ...next.expectedDeliverables[idx], done: !next.expectedDeliverables[idx].done }
    setEditable(next)
    persist(next)
  }

  const addLearning = () => {
    if (!newLearning.insight.trim()) return
    const next = { ...editable }
    next.learnings = [...(next.learnings || []), { ...newLearning, author: 'Admin', createdAt: new Date().toISOString() }]
    setEditable(next)
    setNewLearning({ category: 'technical', insight: '' })
    persist(next)
  }

  const addIssue = () => {
    if (!newIssue.trim()) return
    const next = { ...editable }
    next.fieldReport = { ...(next.fieldReport || {}), issues: [...(next.fieldReport?.issues || []), newIssue.trim()] }
    setEditable(next)
    setNewIssue('')
    persist(next)
  }

  const updateFieldReport = (field: string, value: any) => {
    const next = { ...editable }
    next.fieldReport = { ...(next.fieldReport || {}), [field]: value }
    setEditable(next)
    persist(next)
  }

  const progress = Math.round(((editable.checklist?.filter(c => c.done).length || 0) / Math.max(editable.checklist?.length || 1, 1)) * 100)

  const sections = [
    { key: 'overview' as const, label: 'Vue d\'ensemble', icon: Flag },
    { key: 'checklist' as const, label: 'Checklist', icon: CheckCircle2 },
    { key: 'deliverables' as const, label: 'Livrables', icon: FileText },
    { key: 'field' as const, label: 'Terrain', icon: Camera },
    { key: 'learnings' as const, label: 'Retours', icon: Lightbulb },
    { key: 'onboarding' as const, label: 'Onboarding', icon: BookOpen },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full my-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                editable.status === 'completed' ? 'bg-green-100 text-green-700' :
                editable.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                editable.status === 'delayed' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {editable.status === 'completed' ? 'Terminé' : editable.status === 'in_progress' ? 'En cours' : editable.status === 'delayed' ? 'Retard' : 'En attente'}
              </span>
              <span className="text-xs text-gray-500">{progress}% complété</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{editable.name}</h2>
            {editable.description && <p className="text-sm text-gray-500 mt-0.5">{editable.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              {editable.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Échéance : {new Date(editable.dueDate).toLocaleDateString('fr-FR')}</span>}
              {editable.completedDate && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Terminé le : {new Date(editable.completedDate).toLocaleDateString('fr-FR')}</span>}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sections nav */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-200 overflow-x-auto">
          {sections.map(sec => {
            const Icon = sec.icon
            const active = activeSection === sec.key
            return (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {sec.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Checklist" value={`${editable.checklist?.filter(c => c.done).length || 0} / ${editable.checklist?.length || 0}`} color="blue" icon={CheckCircle2} />
                <StatCard label="Livrables" value={`${editable.expectedDeliverables?.filter(d => d.done).length || 0} / ${editable.expectedDeliverables?.length || 0}`} color="emerald" icon={FileText} />
                <StatCard label="Satisfaction terrain" value={editable.fieldReport?.satisfaction ? `${editable.fieldReport.satisfaction}/10` : '—'} color="amber" icon={Star} />
              </div>

              {editable.fieldReport?.observations && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-gray-400" />Observations terrain</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{editable.fieldReport.observations}</p>
                </div>
              )}

              {(editable.learnings || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-gray-400" />Retours d'expérience</h4>
                  <div className="space-y-2">
                    {(editable.learnings || []).slice(0, 3).map((l, i) => (
                      <div key={i} className={`text-sm px-3 py-2 rounded-lg ${CATEGORY_COLORS[l.category] || 'bg-gray-50 text-gray-700'}`}>
                        <span className="font-semibold">{CATEGORY_LABELS[l.category] || l.category}</span> · {l.insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <input value={newCheck} onChange={e => setNewCheck(e.target.value)} placeholder="Nouvelle tâche..." className="input flex-1" onKeyDown={e => e.key === 'Enter' && addCheck()} />
                <button onClick={addCheck} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {(editable.checklist || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                    <button onClick={() => toggleCheck(idx)} className="flex-shrink-0">
                      {item.done ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.label}</span>
                    {item.required && <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Requis</span>}
                    <button onClick={() => {
                      const next = { ...editable, checklist: (editable.checklist || []).filter((_, i) => i !== idx) }
                      setEditable(next); persist(next)
                    }} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {(editable.checklist || []).length === 0 && <p className="text-sm text-gray-500 text-center py-6">Aucune tâche définie</p>}
              </div>
            </div>
          )}

          {activeSection === 'deliverables' && (
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <input value={newDeliverable.name} onChange={e => setNewDeliverable({ ...newDeliverable, name: e.target.value })} placeholder="Nom du livrable" className="input flex-1" />
                <input value={newDeliverable.description} onChange={e => setNewDeliverable({ ...newDeliverable, description: e.target.value })} placeholder="Description" className="input flex-1" />
                <button onClick={addDeliverable} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {(editable.expectedDeliverables || []).map((d, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                    <button onClick={() => toggleDeliverable(idx)} className="flex-shrink-0">
                      {d.done ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${d.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{d.name}</p>
                      {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                    </div>
                    {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Voir</a>}
                  </div>
                ))}
                {(editable.expectedDeliverables || []).length === 0 && <p className="text-sm text-gray-500 text-center py-6">Aucun livrable défini</p>}
              </div>
            </div>
          )}

          {activeSection === 'field' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations terrain</label>
                <textarea value={editable.fieldReport?.observations || ''} onChange={e => updateFieldReport('observations', e.target.value)} placeholder="Décrivez la réalité terrain, les contraintes rencontrées..." className="input min-h-[100px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée réelle (heures)</label>
                  <input type="number" value={editable.fieldReport?.realDuration || ''} onChange={e => updateFieldReport('realDuration', Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satisfaction client (1-10)</label>
                  <input type="number" min={1} max={10} value={editable.fieldReport?.satisfaction || ''} onChange={e => updateFieldReport('satisfaction', Number(e.target.value))} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Problèmes rencontrés</label>
                <div className="flex gap-2 mb-2">
                  <input value={newIssue} onChange={e => setNewIssue(e.target.value)} placeholder="Ajouter un problème..." className="input flex-1" onKeyDown={e => e.key === 'Enter' && addIssue()} />
                  <button onClick={addIssue} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-1">
                  {(editable.fieldReport?.issues || []).map((issue, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-red-50 text-red-700 px-3 py-1.5 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1">{issue}</span>
                      <button onClick={() => updateFieldReport('issues', (editable.fieldReport?.issues || []).filter((_, j) => j !== i))} className="hover:text-red-900"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signé par</label>
                <input value={editable.fieldReport?.signedBy || ''} onChange={e => updateFieldReport('signedBy', e.target.value)} placeholder="Nom du signataire" className="input" />
              </div>
            </div>
          )}

          {activeSection === 'learnings' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-indigo-900 mb-3">Ajouter un retour d'expérience</h4>
                <div className="flex gap-2 mb-2">
                  <select value={newLearning.category} onChange={e => setNewLearning({ ...newLearning, category: e.target.value })} className="input w-40">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input value={newLearning.insight} onChange={e => setNewLearning({ ...newLearning, insight: e.target.value })} placeholder="Insight, leçon apprise..." className="input flex-1" onKeyDown={e => e.key === 'Enter' && addLearning()} />
                  <button onClick={addLearning} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-indigo-600">Ces retours enrichissent la base de connaissances pour la formation future.</p>
              </div>
              <div className="space-y-3">
                {(editable.learnings || []).map((l, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[l.category]}`}>{CATEGORY_LABELS[l.category] || l.category}</span>
                      <span className="text-xs text-gray-400">{l.author} · {new Date(l.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-gray-800">{l.insight}</p>
                  </div>
                ))}
                {(editable.learnings || []).length === 0 && <p className="text-sm text-gray-500 text-center py-6">Aucun retour d'expérience</p>}
              </div>
            </div>
          )}

          {activeSection === 'onboarding' && (
            <div className="space-y-6">
              {loadingKnowledge ? (
                <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
              ) : knowledge ? (
                <>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{knowledge.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{knowledge.description}</p>
                  </div>

                  {knowledge.expectedTasks?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Users className="w-4 h-4" />Tâches attendues</h4>
                      <div className="space-y-2">
                        {knowledge.expectedTasks.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded-lg">
                            <ChevronRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="flex-1">{t.label}</span>
                            {t.required && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Requis</span>}
                            <span className="text-xs text-gray-400">{t.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {knowledge.expectedDeliverables?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" />Livrables attendus</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {knowledge.expectedDeliverables.map((d, i) => (
                          <div key={i} className="p-3 bg-white border border-gray-200 rounded-xl">
                            <p className="text-sm font-medium text-gray-900">{d.name}</p>
                            <p className="text-xs text-gray-500">{d.description}</p>
                            {d.templateUrl && <a href={d.templateUrl} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Template →</a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {knowledge.guides?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" />Guides & ressources</h4>
                      <div className="space-y-2">
                        {knowledge.guides.map((g, i) => (
                          <div key={i} className="p-3 bg-white border border-gray-200 rounded-xl">
                            <p className="text-sm font-semibold text-gray-900">{g.title}</p>
                            <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{g.content}</p>
                            {g.url && <a href={g.url} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Voir la ressource →</a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {knowledge.communityLearnings?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4" />Connaissances communautaires</h4>
                      <div className="space-y-2">
                        {knowledge.communityLearnings.map((l, i) => (
                          <div key={i} className={`text-sm px-3 py-2 rounded-lg ${CATEGORY_COLORS[l.category] || 'bg-gray-50'}`}>
                            <span className="font-semibold">{CATEGORY_LABELS[l.category] || l.category}</span> · {l.insight}
                            <span className="text-xs opacity-70 ml-1">— {l.author}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun template d'onboarding pour ce jalon.</p>
                  <p className="text-xs text-gray-400 mt-1">Créez un template via l'API ou associez un phaseTemplate au jalon.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <span className="text-xs text-gray-500">{saving && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Sauvegarde...</span>}</span>
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Fermer</button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  const map: Record<string, string> = { blue: 'bg-blue-50 border-blue-100', emerald: 'bg-emerald-50 border-emerald-100', amber: 'bg-amber-50 border-amber-100' }
  const textMap: Record<string, string> = { blue: 'text-blue-700', emerald: 'text-emerald-700', amber: 'text-amber-700' }
  return (
    <div className={`p-4 rounded-xl border ${map[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${textMap[color]}`} />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className={`text-lg font-bold ${textMap[color]}`}>{value}</p>
    </div>
  )
}
