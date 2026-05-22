'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit3, Save, Loader2, CheckCircle2, AlertCircle, Clock,
  FileText, Image as ImageIcon, TrendingDown, Wallet, Activity,
  FolderKanban, MessageSquare, Flag, Layers, BarChart3, Zap, Trash2,
  Plus, X, ExternalLink, Download, Lock, Unlock, Play, Check,
  ChevronRight, Calendar, MapPin, Phone, Mail, Building2, User,
  DollarSign, Package, Wrench
} from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'
import WorkflowMiniPanel from '@/components/WorkflowMiniPanel'
import MilestoneDetailView from '@/components/admin/MilestoneDetailView'

interface Project {
  _id: string
  name: string
  description?: string
  address: string
  clientId: string
  clientCompanyId?: any
  status: string
  startDate: string
  endDate?: string
  currentPhase?: string
  progress: number
  serviceType?: string
  clientSnapshot?: { company: string; contact: string; phone: string; email: string }
  value?: number
  margin?: number
  assignedTo?: string[]
  milestones?: Array<{
    id: string; name: string; status: 'pending' | 'in_progress' | 'completed' | 'delayed'
    dueDate?: string; description?: string; completedDate?: string
  }>
  sharedNotes?: Array<{
    id: string; author: string; role: 'ADMIN' | 'TECHNICIAN' | 'CLIENT'
    createdAt: string; message: string; clientVisible?: boolean
  }>
  timeline?: Array<{
    id: string; date: string; type: string; title: string
    description?: string; author: string
  }>
  documents?: Array<{ id: string; name: string; url: string; type: string; uploadDate?: string }>
  metrics?: { tasksTotal?: number; tasksCompleted?: number; budgetPlanned?: number; budgetUsed?: number; satisfactionScore?: number }
  clientAccess?: boolean
  quote?: { id: string; totalHT: number; totalTTC: number; status: string } | null
  createdAt: string
  updatedAt: string
}

interface ExpenseItem {
  _id: string; numero: string; label: string; category: string
  amountTTC: number; netPayable: number; paymentStatus: string
  expenseDate: string; paidAmount: number
}

interface ProjectImage {
  _id: string; filename: string; url: string; title?: string; description?: string; isMain: boolean; order: number; createdAt: string
}

type TabKey = 'overview' | 'edit' | 'milestones' | 'notes' | 'expenses' | 'documents' | 'photos' | 'timeline' | 'workflow' | 'cashflow'

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: FolderKanban },
  { key: 'edit', label: 'Édition', icon: Edit3 },
  { key: 'milestones', label: 'Jalons', icon: Flag },
  { key: 'notes', label: 'Notes', icon: MessageSquare },
  { key: 'expenses', label: 'Dépenses', icon: TrendingDown },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'photos', label: 'Photos', icon: ImageIcon },
  { key: 'timeline', label: 'Timeline', icon: Activity },
  { key: 'workflow', label: 'Workflow', icon: Zap },
  { key: 'cashflow', label: 'Cashflow', icon: Wallet },
]

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700', quoted: 'bg-blue-100 text-blue-700',
  negotiation: 'bg-purple-100 text-purple-700', approved: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-blue-100 text-blue-700', testing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700', maintenance: 'bg-indigo-100 text-indigo-700',
  on_hold: 'bg-orange-100 text-orange-700'
}
const STATUS_LABELS: Record<string, string> = {
  lead: 'Prospect', quoted: 'Devisé', negotiation: 'Négociation', approved: 'Approuvé',
  in_progress: 'En cours', testing: 'Tests', completed: 'Terminé', maintenance: 'Maintenance', on_hold: 'En pause'
}
const MSTATUS_LABELS: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', completed: 'Terminé', delayed: 'Retard' }
const MSTATUS_COLORS: Record<string, string> = { pending: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', delayed: 'bg-orange-100 text-orange-700' }

const fmt = (n?: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} FCFA`
const fd = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const toast = useToastContext()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editing, setEditing] = useState<Partial<Project>>({})

  // Associated data
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [images, setImages] = useState<ProjectImage[]>([])
  const [loadingAssoc, setLoadingAssoc] = useState(false)

  // Milestones
  const [newMilestone, setNewMilestone] = useState({ name: '', dueDate: '' })

  // Notes
  const [newNote, setNewNote] = useState('')

  // Document upload
  const [newDoc, setNewDoc] = useState({ name: '', url: '', type: '' })

  // Milestone detail modal
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null)

  const loadProject = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects?id=${id}`, { credentials: 'include' })
      const data = await res.json()
      const p = (data.projects || []).find((x: any) => String(x._id || x.id) === id)
      if (p) {
        const normalized: Project = { ...p, _id: String(p._id || p.id) }
        setProject(normalized)
        setEditing({ ...normalized })
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadAssoc = async () => {
    setLoadingAssoc(true)
    try {
      const [eRes, iRes] = await Promise.all([
        fetch(`/api/admin/expenses?projectId=${id}`, { credentials: 'include' }),
        fetch(`/api/projects/${id}/images`, { credentials: 'include' })
      ])
      if (eRes.ok) { const d = await eRes.json(); setExpenses(d.expenses || []) }
      if (iRes.ok) { const d = await iRes.json(); setImages(d.images || []) }
    } catch (e) { console.error(e) }
    setLoadingAssoc(false)
  }

  useEffect(() => { loadProject() }, [id])
  useEffect(() => { if (project) loadAssoc() }, [project])

  const handleSave = async () => {
    if (!editing._id) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editing._id,
          name: editing.name,
          description: editing.description,
          address: editing.address,
          status: editing.status,
          progress: editing.progress,
          currentPhase: editing.currentPhase,
          endDate: editing.endDate || null,
          value: editing.value,
          serviceType: editing.serviceType,
          milestones: editing.milestones,
          clientAccess: editing.clientAccess,
          assignedTo: editing.assignedTo
        })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const updated = data.project as Project
      setProject(updated)
      setEditing({ ...updated })
      toast.success('Projet mis à jour', { description: updated.name })
    } catch (err: any) {
      toast.error('Erreur lors de la sauvegarde')
    } finally { setSaving(false) }
  }

  const handleAddMilestone = () => {
    if (!newMilestone.name.trim()) return
    const m = { id: Date.now().toString(), name: newMilestone.name.trim(), status: 'pending' as const, dueDate: newMilestone.dueDate || undefined }
    setEditing(prev => ({ ...prev, milestones: [...(prev.milestones || []), m] }))
    setNewMilestone({ name: '', dueDate: '' })
  }

  const handleMilestoneStatus = (mid: string, status: 'pending' | 'in_progress' | 'completed' | 'delayed') => {
    setEditing(prev => ({
      ...prev,
      milestones: (prev.milestones || []).map(m => m.id === mid ? { ...m, status } : m)
    }))
  }

  const handleRemoveMilestone = (mid: string) => {
    setEditing(prev => ({ ...prev, milestones: (prev.milestones || []).filter(m => m.id !== mid) }))
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !project?._id) return
    const note = { id: Date.now().toString(), author: 'Admin', role: 'ADMIN' as const, createdAt: new Date().toISOString(), message: newNote.trim(), clientVisible: false }
    const updatedNotes = [...(project.sharedNotes || []), note]
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ id: project._id, sharedNotes: updatedNotes })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProject(prev => prev ? { ...prev, sharedNotes: data.project.sharedNotes || updatedNotes } : prev)
      setNewNote('')
      toast.success('Note ajoutée')
    } catch { toast.error('Erreur') }
  }

  const handleAddDoc = async () => {
    if (!newDoc.name.trim() || !newDoc.url.trim() || !project?._id) return
    const doc = { id: Date.now().toString(), name: newDoc.name.trim(), url: newDoc.url.trim(), type: newDoc.type || 'document', uploadDate: new Date().toISOString() }
    try {
      const res = await fetch(`/api/projects/${project._id}/documents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ document: doc })
      })
      if (!res.ok) throw new Error()
      setProject(prev => prev ? { ...prev, documents: [...(prev.documents || []), doc] } : prev)
      setNewDoc({ name: '', url: '', type: '' })
      toast.success('Document ajouté')
    } catch { toast.error('Erreur') }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Supprimer ce document ?')) return
    try {
      const res = await fetch(`/api/projects/${project!._id}/documents?documentId=${docId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error()
      setProject(prev => prev ? { ...prev, documents: (prev.documents || []).filter(d => d.id !== docId) } : prev)
      toast.success('Document supprimé')
    } catch { toast.error('Erreur') }
  }

  const cashflow = useMemo(() => {
    const totalExpenses = expenses.filter(e => e.paymentStatus !== 'cancelled').reduce((s, e) => s + (e.netPayable || e.amountTTC || 0), 0)
    const totalPaid = expenses.filter(e => e.paymentStatus === 'paid').reduce((s, e) => s + (e.paidAmount || 0), 0)
    const projectValue = project?.value || 0
    const margin = projectValue - totalExpenses
    return { totalExpenses, totalPaid, projectValue, margin, count: expenses.length }
  }, [expenses, project])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Projet introuvable</p>
        <Link href="/admin/projects" className="text-blue-600 hover:underline mt-2 inline-block">Retour aux projets</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.push('/admin/projects')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 truncate">{project.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[project.status] || project.status}
                </span>
                {project.serviceType && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {project.serviceType}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.address}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fd(project.startDate)} {project.endDate ? `→ ${fd(project.endDate)}` : ''}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'edit' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-px">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Progression" value={`${project.progress || 0}%`} color="blue" icon={CheckCircle2} />
              <KpiCard label="Budget" value={fmt(project.value)} color="emerald" icon={DollarSign} />
              <KpiCard label="Dépenses" value={fmt(cashflow.totalExpenses)} color="orange" icon={TrendingDown} />
              <KpiCard label="Marge" value={fmt(cashflow.margin)} color={cashflow.margin >= 0 ? 'green' : 'red'} icon={Wallet} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Infos */}
              <div className="lg:col-span-2 space-y-6">
                <SectionCard title="Informations du projet" icon={FolderKanban}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <InfoRow label="Description" value={project.description || '—'} full />
                    <InfoRow label="Phase" value={project.currentPhase || '—'} />
                    <InfoRow label="Type de service" value={project.serviceType || '—'} />
                    <InfoRow label="Progression" value={`${project.progress || 0}%`} />
                    <InfoRow label="Accès client" value={project.clientAccess ? 'Activé' : 'Désactivé'} />
                    <InfoRow label="Date de création" value={fd(project.createdAt)} />
                    <InfoRow label="Dernière mise à jour" value={fd(project.updatedAt)} />
                  </div>
                </SectionCard>

                <SectionCard title="Client" icon={Building2}>
                  {project.clientSnapshot ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <InfoRow label="Entreprise" value={project.clientSnapshot.company} />
                      <InfoRow label="Contact" value={project.clientSnapshot.contact} />
                      <InfoRow label="Téléphone" value={project.clientSnapshot.phone} />
                      <InfoRow label="Email" value={project.clientSnapshot.email} />
                    </div>
                  ) : <p className="text-gray-500 text-sm">Aucune information client</p>}
                </SectionCard>

                {project.quote && (
                  <SectionCard title="Devis associé" icon={FileText}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total TTC</span>
                      <span className="font-bold text-gray-900">{fmt(project.quote.totalTTC)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600">Statut</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{project.quote.status}</span>
                    </div>
                  </SectionCard>
                )}

                {/* Milestones mini */}
                <SectionCard title="Jalons" icon={Flag} action={{ label: 'Voir tout', onClick: () => setActiveTab('milestones') }}>
                  {(project.milestones || []).length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun jalon défini</p>
                  ) : (
                    <div className="space-y-2">
                      {(project.milestones || []).slice(0, 5).map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMilestone(m)}
                          className="w-full flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span className="font-medium text-gray-900">{m.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${MSTATUS_COLORS[m.status]}`}>{MSTATUS_LABELS[m.status]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <SectionCard title="Équipe" icon={User}>
                  {(project.assignedTo || []).length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun technicien assigné</p>
                  ) : (
                    <div className="space-y-2">
                      {project.assignedTo!.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                            {t.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-700">{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Métriques" icon={BarChart3}>
                  <div className="space-y-3 text-sm">
                    <MetricRow label="Tâches" value={`${project.metrics?.tasksCompleted || 0} / ${project.metrics?.tasksTotal || 0}`} />
                    <MetricRow label="Budget utilisé" value={`${project.metrics?.budgetUsed || 0} / ${project.metrics?.budgetPlanned || 0} FCFA`} />
                    <MetricRow label="Satisfaction" value={`${project.metrics?.satisfactionScore || 0}/10`} />
                  </div>
                </SectionCard>

                <SectionCard title="Workflow" icon={Zap} action={{ label: 'Gérer', onClick: () => setActiveTab('workflow') }}>
                  <WorkflowMiniPanel projectId={project._id} />
                </SectionCard>
              </div>
            </div>
          </div>
        )}

        {/* EDIT */}
        {activeTab === 'edit' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nom">
                <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input" />
              </Field>
              <Field label="Adresse">
                <input value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} className="input" />
              </Field>
              <Field label="Type de service">
                <input value={editing.serviceType || ''} onChange={e => setEditing({ ...editing, serviceType: e.target.value })} className="input" />
              </Field>
              <Field label="Phase actuelle">
                <input value={editing.currentPhase || ''} onChange={e => setEditing({ ...editing, currentPhase: e.target.value })} className="input" />
              </Field>
              <Field label="Date de fin">
                <input type="date" value={editing.endDate?.slice(0, 10) || ''} onChange={e => setEditing({ ...editing, endDate: e.target.value || undefined })} className="input" />
              </Field>
              <Field label="Valeur (FCFA)">
                <input type="number" value={editing.value || 0} onChange={e => setEditing({ ...editing, value: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="Progression (%)">
                <input type="range" min={0} max={100} value={editing.progress || 0} onChange={e => setEditing({ ...editing, progress: Number(e.target.value) })} className="w-full" />
                <span className="text-sm text-gray-600">{editing.progress || 0}%</span>
              </Field>
              <Field label="Statut">
                <select value={editing.status || ''} onChange={e => setEditing({ ...editing, status: e.target.value })} className="input">
                  {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input min-h-[100px]" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.clientAccess} onChange={e => setEditing({ ...editing, clientAccess: e.target.checked })} className="rounded" />
              Accès portail client activé
            </label>
          </div>
        )}

        {/* MILESTONES */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau jalon</label>
                  <input value={newMilestone.name} onChange={e => setNewMilestone({ ...newMilestone, name: e.target.value })} placeholder="Nom du jalon" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                  <input type="date" value={newMilestone.dueDate} onChange={e => setNewMilestone({ ...newMilestone, dueDate: e.target.value })} className="input" />
                </div>
                <button onClick={handleAddMilestone} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(editing.milestones || []).map(m => (
                <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3 group hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedMilestone(m)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                    {m.dueDate && <p className="text-xs text-gray-500 mt-0.5">Échéance : {fd(m.dueDate)}</p>}
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <select value={m.status} onChange={e => handleMilestoneStatus(m.id, e.target.value as any)} className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                      {Object.keys(MSTATUS_LABELS).map(s => <option key={s} value={s}>{MSTATUS_LABELS[s]}</option>)}
                    </select>
                    <button onClick={() => handleRemoveMilestone(m.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {(editing.milestones || []).length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-white border border-gray-200 rounded-xl"><Flag className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun jalon</p></div>
              )}
            </div>
          </div>
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelle note</label>
              <div className="flex gap-2">
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Ajouter une note..." className="input flex-1 min-h-[60px]" />
                <button onClick={handleAddNote} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 self-end"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="space-y-3">
              {(project.sharedNotes || []).slice().reverse().map(note => (
                <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${note.role === 'CLIENT' ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700'}`}>{note.role === 'CLIENT' ? 'C' : 'A'}</div>
                    <div><p className="text-xs font-medium text-gray-900">{note.author}</p><p className="text-[10px] text-gray-400">{note.role} · {fd(note.createdAt)}</p></div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{note.message}</p>
                </div>
              ))}
              {(project.sharedNotes || []).length === 0 && (
                <div className="text-center py-10 text-gray-500"><MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune note</p></div>
              )}
            </div>
          </div>
        )}

        {/* EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCardMini label="Total dépenses" value={fmt(cashflow.totalExpenses)} color="orange" />
                <KpiCardMini label="Payé" value={fmt(cashflow.totalPaid)} color="emerald" />
                <KpiCardMini label="Reste" value={fmt(cashflow.totalExpenses - cashflow.totalPaid)} color="red" />
                <KpiCardMini label="Nombre" value={`${cashflow.count}`} color="blue" />
              </div>
            </div>
            {loadingAssoc ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-10 bg-white border border-gray-200 rounded-xl text-gray-500"><TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune dépense liée</p></div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="text-left px-4 py-3 font-semibold text-gray-700">N°</th><th className="text-left px-4 py-3 font-semibold text-gray-700">Libellé</th><th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th><th className="text-right px-4 py-3 font-semibold text-gray-700">Montant</th><th className="text-center px-4 py-3 font-semibold text-gray-700">Statut</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map(e => (
                      <tr key={e._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.numero}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.label}</td>
                        <td className="px-4 py-3 text-gray-600">{fd(e.expenseDate)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(e.amountTTC)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${e.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : e.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                            {e.paymentStatus === 'paid' ? 'Payée' : e.paymentStatus === 'partial' ? 'Partiel' : 'À payer'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} className="input" placeholder="Nom du document" /></div>
                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">URL</label><input value={newDoc.url} onChange={e => setNewDoc({ ...newDoc, url: e.target.value })} className="input" placeholder="https://..." /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><input value={newDoc.type} onChange={e => setNewDoc({ ...newDoc, type: e.target.value })} className="input" placeholder="pdf, xlsx..." /></div>
                <button onClick={handleAddDoc} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 self-end"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(project.documents || []).map(d => (
                <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">{d.name}</a>
                    <p className="text-[10px] text-gray-400">{d.type} · {fd(d.uploadDate)}</p>
                  </div>
                  <button onClick={() => handleDeleteDoc(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {(project.documents || []).length === 0 && (
                <div className="text-center py-10 text-gray-500 col-span-full bg-white border border-gray-200 rounded-xl"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun document</p></div>
              )}
            </div>
          </div>
        )}

        {/* PHOTOS */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {loadingAssoc ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
            ) : images.length === 0 ? (
              <div className="text-center py-10 bg-white border border-gray-200 rounded-xl text-gray-500"><ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune photo</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map(img => (
                  <div key={img._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
                    <a href={img.url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-gray-100 relative">
                      <img src={img.url} alt={img.title || img.filename} className="w-full h-full object-cover" />
                    </a>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{img.title || img.filename}</p>
                      {img.description && <p className="text-xs text-gray-500 truncate">{img.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-0 relative pl-6 border-l-2 border-gray-200">
            {(project.timeline || []).length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-white border border-gray-200 rounded-xl"><Activity className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun événement</p></div>
            ) : (
              (project.timeline || []).map((t, i) => (
                <div key={t.id || i} className="mb-6 relative">
                  <div className="absolute -left-[31px] top-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Calendar className="w-3.5 h-3.5" /></div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                    {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><Calendar className="w-3 h-3" />{fd(t.date)}{t.author && <span>· {t.author}</span>}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* WORKFLOW */}
        {activeTab === 'workflow' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <WorkflowMiniPanel projectId={project._id} />
          </div>
        )}

        {/* CASHFLOW */}
        {activeTab === 'cashflow' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Valeur projet" value={fmt(project.value)} color="blue" icon={DollarSign} />
              <KpiCard label="Dépenses" value={fmt(cashflow.totalExpenses)} color="orange" icon={TrendingDown} />
              <KpiCard label="Payé" value={fmt(cashflow.totalPaid)} color="emerald" icon={CheckCircle2} />
              <KpiCard label="Marge" value={fmt(cashflow.margin)} color={cashflow.margin >= 0 ? 'green' : 'red'} icon={Wallet} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Répartition</h3>
              <div className="space-y-4">
                <CashflowBar label="Valeur du projet" amount={project.value || 0} total={Math.max(project.value || 0, cashflow.totalExpenses)} color="bg-blue-500" />
                <CashflowBar label="Dépenses totales" amount={cashflow.totalExpenses} total={Math.max(project.value || 0, cashflow.totalExpenses)} color="bg-orange-500" />
                <CashflowBar label="Payé" amount={cashflow.totalPaid} total={Math.max(project.value || 0, cashflow.totalExpenses)} color="bg-emerald-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Milestone Detail Modal */}
      {selectedMilestone && project && (
        <MilestoneDetailView
          milestone={selectedMilestone}
          projectId={project._id}
          projectServiceType={project.serviceType}
          onClose={() => setSelectedMilestone(null)}
          onUpdate={(updated) => {
            setProject(prev => prev ? { ...prev, milestones: (prev.milestones || []).map((m: any) => m.id === updated.id ? updated : m) } : prev)
            setEditing(prev => ({ ...prev, milestones: (prev.milestones || []).map((m: any) => m.id === updated.id ? updated : m) }))
            setSelectedMilestone(null)
          }}
        />
      )}
    </div>
  )
}

/* ---------- UI Helpers ---------- */

function KpiCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  const map: Record<string, string> = { blue: 'bg-blue-50 border-blue-100', emerald: 'bg-emerald-50 border-emerald-100', orange: 'bg-orange-50 border-orange-100', green: 'bg-green-50 border-green-100', red: 'bg-red-50 border-red-100' }
  const textMap: Record<string, string> = { blue: 'text-blue-700', emerald: 'text-emerald-700', orange: 'text-orange-700', green: 'text-green-700', red: 'text-red-700' }
  return (
    <div className={`p-4 rounded-xl border ${map[color] || map.blue}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${textMap[color] || textMap.blue}`} />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className={`text-xl font-bold ${textMap[color] || textMap.blue}`}>{value}</p>
    </div>
  )
}

function KpiCardMini({ label, value, color }: { label: string; value: string; color: string }) {
  const map: Record<string, string> = { blue: 'bg-blue-50 border-blue-100 text-blue-700', emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700', orange: 'bg-orange-50 border-orange-100 text-orange-700', red: 'bg-red-50 border-red-100 text-red-700' }
  return (
    <div className={`p-3 rounded-xl border ${map[color] || map.blue}`}>
      <p className="text-[11px] text-gray-500 font-medium">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, action }: { title: string; icon: any; children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {action && <button onClick={action.onClick} className="text-xs text-blue-600 hover:underline font-medium">{action.label}</button>}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function CashflowBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">{fmt(amount)}</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
