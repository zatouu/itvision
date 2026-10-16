'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Building2, Clock, ClipboardList, Wrench, Camera, Send, Save, Loader2, Plus, Trash2, AlertTriangle,
  CheckCircle2, ChevronLeft, ChevronRight, PenLine, X, RotateCcw, Package, Lightbulb, CalendarClock,
} from 'lucide-react'
import SignaturePad from '@/components/portal/SignaturePad'
import { reportSubmissionErrors, durationMinutes, MIN_TEXT } from '@/lib/maintenance/report-rules'

type Severity = 'low' | 'medium' | 'high' | 'critical'

type IssueForm = {
  reference: string
  component: string
  location: string
  description: string
  severity: Severity
  impact: string
  requiresQuote: boolean
  recommendedSolution: string
  estimatedCost?: string
  estimatedDurationHours?: string
}

type MaterialForm = {
  name: string
  quantity: number
  unitCost?: string
  unitPrice?: string
  supplierReference?: string
}

type FollowUpForm = {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requiresQuote: boolean
  estimatedCost?: string
  estimatedDurationHours?: string
  recommendedDate?: string
}

type NextActionForm = {
  title: string
  scheduledDate?: string
  assignedTo?: string
  notes?: string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
}

export interface MaintenanceFormData {
  site: string
  clientName: string
  clientContact: string
  clientId?: string
  projectId?: string
  interventionDate: string
  startTime: string
  endTime: string
  interventionType: string
  technician: string
  initialObservations: string
  problemDescription: string
  problemSeverity: Severity
  tasksPerformed: string[]
  results: string
  recommendations: string[]
  /** URLs de nos uploads */
  photosBefore: string[]
  photosAfter: string[]
  technicianSignature: string | null
  clientSignature: string | null
  clientSignatoryName: string
  clientTitle: string
  status: string
  reportId: string
  gpsLocation: { lat: number; lng: number } | null
  issuesDetected: IssueForm[]
  materialsUsed: MaterialForm[]
  followUpRecommendations: FollowUpForm[]
  nextActions: NextActionForm[]
}

interface ClientOption {
  id: string
  clientId?: string
  name: string
  company?: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  activeContracts?: Array<{ projectId?: string; [key: string]: any }>
}

interface EnhancedMaintenanceFormProps {
  projectId?: string
  clientId?: string
  interventionId?: string
  existingReportId?: string
  isReadOnly?: boolean
  existingReport?: Partial<MaintenanceFormData>
  onSave?: (data: MaintenanceFormData) => void
  onSubmit?: (data: MaintenanceFormData) => void
  clients?: ClientOption[]
}

const STEPS = [
  { key: 'intervention', label: 'Intervention', icon: Building2 },
  { key: 'constat', label: 'Constat', icon: ClipboardList },
  { key: 'travaux', label: 'Travaux', icon: Wrench },
  { key: 'photos', label: 'Photos', icon: Camera },
  { key: 'cloture', label: 'Suite et signatures', icon: PenLine },
] as const

const TYPES: Array<{ id: string; label: string }> = [
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'preventive', label: 'Préventive' },
  { id: 'repair', label: 'Dépannage' },
  { id: 'installation', label: 'Installation' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'emergency', label: 'Urgence' },
]

const SEVERITIES: Array<{ id: Severity; label: string; chip: string }> = [
  { id: 'low', label: 'Faible', chip: 'bg-emerald-600 text-white' },
  { id: 'medium', label: 'Modérée', chip: 'bg-amber-500 text-white' },
  { id: 'high', label: 'Élevée', chip: 'bg-orange-600 text-white' },
  { id: 'critical', label: 'Critique', chip: 'bg-red-600 text-white' },
]

const TASK_SUGGESTIONS = [
  'Nettoyage des optiques et boîtiers',
  'Contrôle de l’enregistrement et de l’archivage',
  'Vérification des alimentations et onduleur',
  'Mise à jour des micrologiciels',
  'Test des détecteurs et sirènes',
  'Contrôle des accès et badges',
  'Vérification du réseau et du câblage',
]

// Rattache un message des règles partagées à l'étape où il se corrige
function stepOfError(message: string): number {
  if (/heure|durée|format/i.test(message)) return 0
  if (/constat|anomalie/i.test(message)) return 1
  if (/tâche|résultat|matériel/i.test(message)) return 2
  if (/photo/i.test(message)) return 3
  return 4
}

const inputCls = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-500'
const labelCls = 'mb-1.5 block text-xs font-semibold text-stone-500'

const nowHHMM = () => new Date().toTimeString().slice(0, 5)
const newIssueRef = () => `ISS-${Date.now().toString(36).toUpperCase()}`

function initialData(existing: Partial<MaintenanceFormData>, clientId?: string, projectId?: string): MaintenanceFormData {
  return {
    site: existing.site || '',
    clientName: existing.clientName || '',
    clientContact: existing.clientContact || '',
    clientId: existing.clientId || clientId || '',
    projectId: existing.projectId || projectId || '',
    interventionDate: existing.interventionDate || new Date().toISOString().slice(0, 10),
    startTime: existing.startTime || '',
    endTime: existing.endTime || '',
    interventionType: existing.interventionType || 'maintenance',
    technician: existing.technician || '',
    initialObservations: existing.initialObservations || '',
    problemDescription: existing.problemDescription || '',
    problemSeverity: existing.problemSeverity || 'medium',
    tasksPerformed: existing.tasksPerformed?.length ? existing.tasksPerformed : [''],
    results: existing.results || '',
    recommendations: existing.recommendations?.length ? existing.recommendations : [],
    photosBefore: existing.photosBefore || [],
    photosAfter: existing.photosAfter || [],
    technicianSignature: existing.technicianSignature || null,
    clientSignature: existing.clientSignature || null,
    clientSignatoryName: existing.clientSignatoryName || '',
    clientTitle: existing.clientTitle || '',
    status: existing.status || 'draft',
    reportId: existing.reportId || '',
    gpsLocation: existing.gpsLocation || null,
    issuesDetected: existing.issuesDetected || [],
    materialsUsed: existing.materialsUsed || [],
    followUpRecommendations: existing.followUpRecommendations || [],
    nextActions: existing.nextActions || [],
  }
}

export default function EnhancedMaintenanceForm({
  projectId,
  clientId,
  interventionId,
  existingReportId,
  isReadOnly = false,
  existingReport = {},
  onSave,
  onSubmit,
  clients = [],
}: EnhancedMaintenanceFormProps) {
  const [form, setForm] = useState<MaintenanceFormData>(() => initialData(existingReport, clientId, projectId))
  const [step, setStep] = useState(0)
  const [reportDbId, setReportDbId] = useState<string | null>(existingReportId || null)
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [uploading, setUploading] = useState<'before' | 'after' | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string; details?: string[] } | null>(null)
  const [showChecks, setShowChecks] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [localDraft, setLocalDraft] = useState<MaintenanceFormData | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const linkedToIntervention = !!interventionId
  const storageKey = `tech-report-draft:${existingReportId || interventionId || 'new'}`
  const ro = isReadOnly

  const update = useCallback(<K extends keyof MaintenanceFormData>(key: K, value: MaintenanceFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  // Nom du technicien connecté (signature) et position GPS
  useEffect(() => {
    if (ro) return
    if (!form.technician) {
      fetch('/api/auth/login', { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d?.user) setForm(p => ({ ...p, technician: p.technician || d.user.name || d.user.username || '' })) })
        .catch(() => {})
    }
    if (!form.gpsLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setForm(p => ({ ...p, gpsLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude } })),
        () => {},
        { enableHighAccuracy: false, timeout: 8000 }
      )
    }
    // Montage uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Copie locale : rien n'est perdu si le réseau ou le téléphone coupe pendant la saisie
  useEffect(() => {
    if (ro) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setLocalDraft(JSON.parse(raw))
    } catch {}
  }, [storageKey, ro])

  useEffect(() => {
    if (ro || !dirty) return
    const t = setTimeout(() => {
      try {
        // Les signatures sont lourdes et se refont facilement : non conservées localement
        localStorage.setItem(storageKey, JSON.stringify({ ...form, technicianSignature: null, clientSignature: null }))
      } catch {}
    }, 800)
    return () => clearTimeout(t)
  }, [form, dirty, ro, storageKey])

  useEffect(() => {
    if (!dirty || ro) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, ro])

  const duration = durationMinutes(form.startTime, form.endTime)
  const quoteCount = form.followUpRecommendations.filter(f => f.title.trim() && f.requiresQuote).length
    + form.issuesDetected.filter(i => i.requiresQuote).length

  const submissionErrors = useMemo(() => {
    const errors = reportSubmissionErrors({
      interventionType: form.interventionType,
      initialObservations: form.initialObservations,
      results: form.results,
      tasksPerformed: form.tasksPerformed,
      startTime: form.startTime,
      endTime: form.endTime,
      photosBeforeCount: form.photosBefore.length,
      photosAfterCount: form.photosAfter.length,
      materialsUsed: form.materialsUsed,
      issuesDetected: form.issuesDetected,
      followUpRecommendations: form.followUpRecommendations,
      nextActions: form.nextActions,
    })
    if (!form.site.trim()) errors.unshift('Site d’intervention')
    if (!linkedToIntervention && !form.clientId) errors.unshift('Client')
    return errors
  }, [form, linkedToIntervention])

  const errorsByStep = useMemo(() => {
    const by: string[][] = STEPS.map(() => [])
    for (const e of submissionErrors) by[e === 'Client' || e.startsWith('Site') ? 0 : stepOfError(e)].push(e)
    return by
  }, [submissionErrors])

  const goTo = (n: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)))
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const buildPayload = () => ({
    site: form.site.trim(),
    clientName: form.clientName,
    clientContact: form.clientContact,
    clientId: form.clientId || clientId || undefined,
    projectId: form.projectId || projectId || undefined,
    interventionId: interventionId || undefined,
    interventionDate: form.interventionDate,
    startTime: form.startTime,
    endTime: form.endTime,
    interventionType: form.interventionType,
    initialObservations: form.initialObservations,
    problemDescription: form.problemDescription,
    problemSeverity: form.problemSeverity,
    tasksPerformed: form.tasksPerformed.map(t => t.trim()).filter(Boolean),
    results: form.results,
    recommendations: form.recommendations.map(r => r.trim()).filter(Boolean),
    issuesDetected: form.issuesDetected
      .filter(i => i.component.trim() || i.description.trim())
      .map(i => ({
        reference: i.reference,
        component: i.component.trim() || 'Non précisé',
        location: i.location.trim() || undefined,
        description: i.description.trim() || i.component.trim(),
        severity: i.severity,
        impact: i.impact.trim() || undefined,
        requiresQuote: i.requiresQuote,
        recommendedSolution: i.recommendedSolution.trim() || undefined,
        estimatedCost: i.estimatedCost ? Number(i.estimatedCost) : undefined,
        estimatedDurationHours: i.estimatedDurationHours ? Number(i.estimatedDurationHours) : undefined,
      })),
    materialsUsed: form.materialsUsed
      .filter(m => m.name.trim())
      .map(m => ({
        name: m.name.trim(),
        quantity: Number(m.quantity) || 0,
        unitCost: m.unitCost ? Number(m.unitCost) : undefined,
        unitPrice: m.unitPrice ? Number(m.unitPrice) : undefined,
        supplierReference: m.supplierReference?.trim() || undefined,
      })),
    followUpRecommendations: form.followUpRecommendations
      .filter(f => f.title.trim())
      .map(f => ({
        title: f.title.trim(),
        description: f.description.trim() || undefined,
        priority: f.priority,
        requiresQuote: f.requiresQuote,
        estimatedCost: f.estimatedCost ? Number(f.estimatedCost) : undefined,
        estimatedDurationHours: f.estimatedDurationHours ? Number(f.estimatedDurationHours) : undefined,
        recommendedDate: f.recommendedDate ? new Date(f.recommendedDate).toISOString() : undefined,
      })),
    nextActions: form.nextActions
      .filter(a => a.title.trim())
      .map(a => ({
        title: a.title.trim(),
        scheduledDate: a.scheduledDate ? new Date(a.scheduledDate).toISOString() : undefined,
        assignedTo: a.assignedTo?.trim() || undefined,
        notes: a.notes?.trim() || undefined,
        status: a.status,
      })),
    billing: { needsQuote: quoteCount > 0 },
    photosBefore: form.photosBefore,
    photosAfter: form.photosAfter,
    technician: form.technician,
    technicianSignature: form.technicianSignature,
    clientSignature: form.clientSignature,
    clientSignatoryName: form.clientSignatoryName,
    clientTitle: form.clientTitle,
    gpsLocation: form.gpsLocation,
    templateId: 'manual',
    templateVersion: '2.0',
  })

  async function save(): Promise<string | null> {
    const missing: string[] = []
    if (!form.site.trim()) missing.push('Site d’intervention')
    if (!linkedToIntervention && !form.clientId) missing.push('Client')
    if (!form.startTime) missing.push('Heure d’arrivée')
    if (missing.length) {
      setNotice({ ok: false, text: 'Avant d’enregistrer :', details: missing })
      goTo(0)
      return null
    }
    setBusy('save'); setNotice(null)
    try {
      const res = await fetch('/api/maintenance/reports', {
        method: reportDbId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(reportDbId ? { ...buildPayload(), reportId: reportDbId } : buildPayload()),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Enregistrement impossible')
      const id = reportDbId || String(d.report?._id || d.report?.id || '')
      if (id) setReportDbId(id)
      if (d.report?.reportId) setForm(p => ({ ...p, reportId: d.report.reportId }))
      try { localStorage.removeItem(storageKey) } catch {}
      setLocalDraft(null)
      setDirty(false)
      onSave?.(form)
      return id || null
    } catch (e: any) {
      setNotice({ ok: false, text: e.message || 'Enregistrement impossible. Votre saisie est conservée sur cet appareil.' })
      return null
    } finally {
      setBusy(null)
    }
  }

  async function handleSave() {
    const id = await save()
    if (id) setNotice({ ok: true, text: 'Brouillon enregistré.' })
  }

  async function handleSubmit() {
    setShowChecks(true)
    if (submissionErrors.length) {
      setNotice({ ok: false, text: 'Il manque encore :', details: submissionErrors })
      goTo(stepOfFirstError())
      return
    }
    const id = await save()
    if (!id) return
    setBusy('submit')
    try {
      const res = await fetch('/api/maintenance/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportId: id,
          finalChecks: {
            hasPhotosBefore: form.photosBefore.length > 0,
            hasPhotosAfter: form.photosAfter.length > 0,
            hasTechnicianSignature: !!form.technicianSignature,
            hasClientSignature: !!form.clientSignature,
          },
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw Object.assign(new Error(d.error || 'Envoi impossible'), { details: d.details })
      onSubmit?.({ ...form, status: 'pending_validation' })
    } catch (e: any) {
      setNotice({ ok: false, text: e.message, details: Array.isArray(e.details) ? e.details : undefined })
    } finally {
      setBusy(null)
    }
  }

  function stepOfFirstError() {
    const idx = errorsByStep.findIndex(list => list.length > 0)
    return idx === -1 ? STEPS.length - 1 : idx
  }

  async function uploadPhotos(files: FileList | null, kind: 'before' | 'after') {
    if (!files?.length) return
    setUploading(kind); setNotice(null)
    const urls: string[] = []
    let failed = 0
    for (const file of Array.from(files).slice(0, 10)) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'reports')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const d = await res.json().catch(() => ({}))
        if (res.ok && d.url) urls.push(d.url)
        else failed++
      } catch { failed++ }
    }
    const key = kind === 'before' ? 'photosBefore' : 'photosAfter'
    setForm(p => ({ ...p, [key]: [...p[key], ...urls].slice(0, 30) }))
    setDirty(true)
    if (failed) setNotice({ ok: false, text: `${failed} photo(s) non envoyée(s). Vérifiez la connexion et réessayez.` })
    setUploading(null)
  }

  // Listes : ajout, modification, suppression
  const listOps = <K extends 'issuesDetected' | 'materialsUsed' | 'followUpRecommendations' | 'nextActions' | 'tasksPerformed' | 'recommendations'>(key: K) => ({
    add: (item: MaintenanceFormData[K][number]) => { setForm(p => ({ ...p, [key]: [...(p[key] as any[]), item] })); setDirty(true) },
    set: (index: number, patch: any) => {
      setForm(p => ({ ...p, [key]: (p[key] as any[]).map((it, i) => i === index ? (typeof it === 'string' ? patch : { ...it, ...patch }) : it) }))
      setDirty(true)
    },
    remove: (index: number) => { setForm(p => ({ ...p, [key]: (p[key] as any[]).filter((_, i) => i !== index) })); setDirty(true) },
  })
  const tasks = listOps('tasksPerformed')
  const recos = listOps('recommendations')
  const issues = listOps('issuesDetected')
  const materials = listOps('materialsUsed')
  const followUps = listOps('followUpRecommendations')
  const actions = listOps('nextActions')

  const selectedClient = clients.find(c => c.id === form.clientId)

  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-20 pb-28">
      {/* En-tête et étapes */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-stone-400">{form.reportId || 'Nouveau rapport'}{dirty && !ro ? ' · modifications non enregistrées' : ''}</p>
            <h2 className="truncate text-base font-bold text-stone-900">{form.site || 'Rapport d’intervention'}</h2>
            {(form.clientName || selectedClient) && <p className="truncate text-xs text-stone-500">{form.clientName || selectedClient?.company || selectedClient?.name}</p>}
          </div>
          {quoteCount > 0 && (
            <span className="flex-shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">Devis à prévoir · {quoteCount}</span>
          )}
        </div>
        <ol className="mt-4 grid grid-cols-5 gap-1.5">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const hasErr = showChecks && errorsByStep[i].length > 0
            const done = i < step && errorsByStep[i].length === 0
            return (
              <li key={s.key}>
                <button type="button" onClick={() => goTo(i)} className="flex w-full flex-col items-center gap-1" aria-current={step === i ? 'step' : undefined}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    step === i ? 'bg-emerald-800 text-white' : hasErr ? 'bg-red-100 text-red-600' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'
                  }`}>
                    {done && !hasErr ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className={`hidden text-[10px] font-semibold sm:block ${step === i ? 'text-stone-900' : 'text-stone-400'}`}>{s.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-2 text-center text-xs font-semibold text-stone-700 sm:hidden">{step + 1}. {STEPS[step].label}</p>
      </div>

      {localDraft && !ro && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <span>Une saisie non enregistrée a été retrouvée sur cet appareil.</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setForm(p => ({ ...localDraft, technicianSignature: p.technicianSignature, clientSignature: p.clientSignature })); setLocalDraft(null); setDirty(true) }}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white"><RotateCcw className="h-3.5 w-3.5" />Reprendre</button>
            <button type="button" onClick={() => { try { localStorage.removeItem(storageKey) } catch {} setLocalDraft(null) }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100">Ignorer</button>
          </div>
        </div>
      )}

      {notice && (
        <div className={`mt-3 rounded-2xl px-4 py-3 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`} role="status">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{notice.text}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Fermer"><X className="h-4 w-4 opacity-60" /></button>
          </div>
          {notice.details && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">{notice.details.map(d => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}

      <div className="mt-3 space-y-3">
        {/* 1. Intervention */}
        {step === 0 && (
          <Card title="Intervention" hint={linkedToIntervention ? 'Client et site repris de l’intervention planifiée.' : undefined}>
            {!linkedToIntervention && clients.length > 0 && (
              <div>
                <label className={labelCls} htmlFor="r-client">Client *</label>
                <select id="r-client" className={inputCls} disabled={ro} value={form.clientId || ''}
                  onChange={e => {
                    const c = clients.find(cl => cl.id === e.target.value)
                    setForm(p => ({
                      ...p,
                      clientId: c?.id || '',
                      clientName: c ? (c.company || c.name) : '',
                      clientContact: c?.contactPerson || c?.phone || '',
                      projectId: c?.activeContracts?.find(ct => ct.projectId)?.projectId || '',
                      site: p.site || c?.address || '',
                    }))
                    setDirty(true)
                  }}>
                  <option value="">Choisir un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}{c.contactPerson ? ` · ${c.contactPerson}` : ''}</option>)}
                </select>
              </div>
            )}
            {(linkedToIntervention || clients.length === 0) && (
              <div>
                <label className={labelCls} htmlFor="r-clientname">Client</label>
                <input id="r-clientname" className={inputCls} value={form.clientName} disabled={ro || linkedToIntervention}
                  onChange={e => update('clientName', e.target.value)} placeholder="Nom du client" />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="r-site">Site d’intervention *</label>
              <input id="r-site" className={inputCls} value={form.site} disabled={ro} onChange={e => update('site', e.target.value)} placeholder="Nom du site ou adresse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="r-contact">Interlocuteur sur place</label>
                <input id="r-contact" className={inputCls} value={form.clientContact} disabled={ro} onChange={e => update('clientContact', e.target.value)} placeholder="Nom ou téléphone" />
              </div>
              <div>
                <label className={labelCls} htmlFor="r-date">Date</label>
                <input id="r-date" type="date" className={inputCls} value={form.interventionDate} disabled={ro} onChange={e => update('interventionDate', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['startTime', 'endTime'] as const).map(k => (
                <div key={k}>
                  <label className={labelCls} htmlFor={`r-${k}`}>{k === 'startTime' ? 'Arrivée *' : 'Départ *'}</label>
                  <div className="flex gap-1.5">
                    <input id={`r-${k}`} type="time" className={inputCls} value={form[k]} disabled={ro} onChange={e => update(k, e.target.value)} />
                    {!ro && (
                      <button type="button" onClick={() => update(k, nowHHMM())} className="flex-shrink-0 rounded-xl border border-stone-200 px-2.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50">
                        Maint.
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {duration !== null && (
              <p className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${duration > 0 && duration <= 720 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                <Clock className="h-3.5 w-3.5" /> Durée : {Math.floor(duration / 60)} h {String(duration % 60).padStart(2, '0')}
              </p>
            )}
            <div>
              <p className={labelCls}>Type d’intervention{linkedToIntervention ? ' (fixé par le planning)' : ''}</p>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map(t => (
                  <button key={t.id} type="button" disabled={ro || linkedToIntervention} onClick={() => update('interventionType', t.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default ${form.interventionType === t.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* 2. Constat */}
        {step === 1 && (
          <>
            <Card title="Constat à l’arrivée">
              <TextArea id="r-obs" label="État constaté à l’arrivée *" value={form.initialObservations} disabled={ro} min={MIN_TEXT}
                onChange={v => update('initialObservations', v)} placeholder="Ce que vous avez constaté en arrivant : état du système, symptômes signalés…" />
              <TextArea id="r-pb" label="Problème identifié" value={form.problemDescription} disabled={ro}
                onChange={v => update('problemDescription', v)} placeholder="Cause identifiée, éléments en panne…" rows={3} />
              <div>
                <p className={labelCls}>Gravité</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SEVERITIES.map(s => (
                    <button key={s.id} type="button" disabled={ro} onClick={() => update('problemSeverity', s.id)}
                      className={`rounded-xl py-2 text-xs font-semibold transition ${form.problemSeverity === s.id ? s.chip : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="Anomalies détectées" icon={AlertTriangle} hint="Une ligne par équipement en défaut. Cochez « À chiffrer » pour qu’IT Vision prépare un devis."
              action={!ro && <AddButton onClick={() => issues.add({ reference: newIssueRef(), component: '', location: '', description: '', severity: 'medium', impact: '', requiresQuote: false, recommendedSolution: '', estimatedCost: '', estimatedDurationHours: '' })}>Anomalie</AddButton>}>
              {form.issuesDetected.length === 0 && <Empty>Aucune anomalie signalée.</Empty>}
              {form.issuesDetected.map((it, i) => (
                <Row key={it.reference || i} onRemove={ro ? undefined : () => issues.remove(i)}>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} disabled={ro} value={it.component} onChange={e => issues.set(i, { component: e.target.value })} placeholder="Équipement (ex. caméra C-07)" aria-label="Équipement" />
                    <input className={inputCls} disabled={ro} value={it.location} onChange={e => issues.set(i, { location: e.target.value })} placeholder="Emplacement" aria-label="Emplacement" />
                  </div>
                  <textarea className={inputCls} rows={2} disabled={ro} value={it.description} onChange={e => issues.set(i, { description: e.target.value })} placeholder="Description du défaut" aria-label="Description" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SEVERITIES.map(s => (
                      <button key={s.id} type="button" disabled={ro} onClick={() => issues.set(i, { severity: s.id })}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${it.severity === s.id ? s.chip : 'bg-stone-100 text-stone-500'}`}>{s.label}</button>
                    ))}
                    <label className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-violet-800">
                      <input type="checkbox" disabled={ro} checked={it.requiresQuote} onChange={e => issues.set(i, { requiresQuote: e.target.checked })} className="rounded border-violet-300 text-violet-600" />
                      À chiffrer
                    </label>
                  </div>
                  {it.requiresQuote && (
                    <div className="grid grid-cols-3 gap-2">
                      <input className={`${inputCls} col-span-3`} disabled={ro} value={it.recommendedSolution} onChange={e => issues.set(i, { recommendedSolution: e.target.value })} placeholder="Solution recommandée *" aria-label="Solution recommandée" />
                      <input className={`${inputCls} col-span-2`} disabled={ro} type="number" inputMode="numeric" min={0} value={it.estimatedCost || ''} onChange={e => issues.set(i, { estimatedCost: e.target.value })} placeholder="Coût estimé (FCFA)" aria-label="Coût estimé" />
                      <input className={inputCls} disabled={ro} type="number" inputMode="decimal" min={0} value={it.estimatedDurationHours || ''} onChange={e => issues.set(i, { estimatedDurationHours: e.target.value })} placeholder="Heures" aria-label="Durée estimée" />
                    </div>
                  )}
                </Row>
              ))}
            </Card>
          </>
        )}

        {/* 3. Travaux */}
        {step === 2 && (
          <>
            <Card title="Tâches réalisées *" icon={Wrench} action={!ro && <AddButton onClick={() => tasks.add('')}>Tâche</AddButton>}>
              {form.tasksPerformed.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${t.trim() ? 'text-emerald-500' : 'text-stone-300'}`} />
                  <input className={inputCls} disabled={ro} value={t} onChange={e => tasks.set(i, e.target.value)} placeholder="Tâche réalisée" aria-label={`Tâche ${i + 1}`} />
                  {!ro && form.tasksPerformed.length > 1 && (
                    <button type="button" onClick={() => tasks.remove(i)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
              {!ro && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TASK_SUGGESTIONS.filter(s => !form.tasksPerformed.includes(s)).map(s => (
                    <button key={s} type="button"
                      onClick={() => {
                        const empty = form.tasksPerformed.findIndex(t => !t.trim())
                        if (empty >= 0) tasks.set(empty, s); else tasks.add(s)
                      }}
                      className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-emerald-50 hover:text-emerald-800">
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Matériel posé ou remplacé" icon={Package}
              action={!ro && <AddButton onClick={() => materials.add({ name: '', quantity: 1, unitCost: '', unitPrice: '', supplierReference: '' })}>Matériel</AddButton>}>
              {form.materialsUsed.length === 0 && <Empty>Aucun matériel utilisé.</Empty>}
              {form.materialsUsed.map((m, i) => (
                <Row key={i} onRemove={ro ? undefined : () => materials.remove(i)}>
                  <div className="grid grid-cols-4 gap-2">
                    <input className={`${inputCls} col-span-3`} disabled={ro} value={m.name} onChange={e => materials.set(i, { name: e.target.value })} placeholder="Désignation" aria-label="Désignation" />
                    <input className={inputCls} disabled={ro} type="number" inputMode="numeric" min={1} value={m.quantity || ''} onChange={e => materials.set(i, { quantity: Number(e.target.value) })} placeholder="Qté" aria-label="Quantité" />
                  </div>
                  <input className={inputCls} disabled={ro} value={m.supplierReference || ''} onChange={e => materials.set(i, { supplierReference: e.target.value })} placeholder="Référence ou n° de série (facultatif)" aria-label="Référence" />
                </Row>
              ))}
            </Card>

            <Card title="Résultat">
              <TextArea id="r-res" label="État à votre départ *" value={form.results} disabled={ro} min={MIN_TEXT}
                onChange={v => update('results', v)} placeholder="Système opérationnel, points restant à traiter…" />
            </Card>
          </>
        )}

        {/* 4. Photos */}
        {step === 3 && (
          <Card title="Photos" icon={Camera} hint={form.interventionType === 'installation' ? 'Au moins une photo après installation.' : 'Au moins une photo avant ou après.'}>
            {(['before', 'after'] as const).map(kind => {
              const key = kind === 'before' ? 'photosBefore' : 'photosAfter'
              const list = form[key]
              return (
                <div key={kind}>
                  <p className={labelCls}>{kind === 'before' ? 'Avant' : 'Après'} ({list.length})</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {list.map(url => (
                      <div key={url} className="relative aspect-square">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full rounded-xl object-cover" />
                        </a>
                        {!ro && (
                          <button type="button" onClick={() => { update(key, list.filter(u => u !== url)) }} aria-label="Retirer la photo"
                            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                        )}
                      </div>
                    ))}
                    {!ro && (
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 transition hover:border-emerald-400 hover:text-emerald-600">
                        {uploading === kind ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                        <span className="text-[10px] font-semibold">{uploading === kind ? 'Envoi…' : 'Ajouter'}</span>
                        <input type="file" accept="image/*" multiple capture="environment" className="hidden" disabled={!!uploading}
                          onChange={e => { uploadPhotos(e.target.files, kind); e.target.value = '' }} />
                      </label>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        )}

        {/* 5. Suite et signatures */}
        {step === 4 && (
          <>
            <Card title="Conseils au client" icon={Lightbulb} action={!ro && <AddButton onClick={() => recos.add('')}>Conseil</AddButton>}>
              {form.recommendations.length === 0 && <Empty>Aucun conseil.</Empty>}
              {form.recommendations.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={inputCls} disabled={ro} value={r} onChange={e => recos.set(i, e.target.value)} placeholder="Ex. remplacer la batterie de l’onduleur d’ici 6 mois" aria-label={`Conseil ${i + 1}`} />
                  {!ro && <button type="button" onClick={() => recos.remove(i)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>}
                </div>
              ))}
            </Card>

            <Card title="Travaux complémentaires à proposer" icon={Package} hint="Chaque ligne cochée « À chiffrer » alimente le devis préparé par IT Vision."
              action={!ro && <AddButton onClick={() => followUps.add({ title: '', description: '', priority: 'medium', requiresQuote: true, estimatedCost: '', estimatedDurationHours: '', recommendedDate: '' })}>Proposition</AddButton>}>
              {form.followUpRecommendations.length === 0 && <Empty>Aucun travail complémentaire.</Empty>}
              {form.followUpRecommendations.map((f, i) => (
                <Row key={i} onRemove={ro ? undefined : () => followUps.remove(i)}>
                  <input className={inputCls} disabled={ro} value={f.title} onChange={e => followUps.set(i, { title: e.target.value })} placeholder="Ex. remplacement de la caméra parking" aria-label="Intitulé" />
                  <div className="grid grid-cols-2 gap-2">
                    <select className={inputCls} disabled={ro} value={f.priority} onChange={e => followUps.set(i, { priority: e.target.value })} aria-label="Priorité">
                      <option value="low">Priorité faible</option>
                      <option value="medium">Priorité moyenne</option>
                      <option value="high">Priorité haute</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <input className={inputCls} disabled={ro} type="date" value={f.recommendedDate || ''} onChange={e => followUps.set(i, { recommendedDate: e.target.value })} aria-label="Échéance conseillée" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-violet-800">
                      <input type="checkbox" disabled={ro} checked={f.requiresQuote} onChange={e => followUps.set(i, { requiresQuote: e.target.checked })} className="rounded border-violet-300 text-violet-600" />
                      À chiffrer
                    </label>
                    {f.requiresQuote && (
                      <input className={inputCls} disabled={ro} type="number" inputMode="numeric" min={0} value={f.estimatedCost || ''} onChange={e => followUps.set(i, { estimatedCost: e.target.value })} placeholder="Montant estimé (FCFA) *" aria-label="Montant estimé" />
                    )}
                  </div>
                </Row>
              ))}
            </Card>

            {(form.nextActions.length > 0 || form.followUpRecommendations.some(f => f.priority === 'urgent')) && (
              <Card title="Suivi à planifier" icon={CalendarClock}
                action={!ro && <AddButton onClick={() => actions.add({ title: '', scheduledDate: '', assignedTo: '', notes: '', status: 'pending' })}>Action</AddButton>}>
                {form.nextActions.length === 0 && <Empty>Une proposition urgente demande une action de suivi.</Empty>}
                {form.nextActions.map((a, i) => (
                  <Row key={i} onRemove={ro ? undefined : () => actions.remove(i)}>
                    <input className={inputCls} disabled={ro} value={a.title} onChange={e => actions.set(i, { title: e.target.value })} placeholder="Ex. repasser après livraison de la pièce" aria-label="Action" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inputCls} disabled={ro} type="date" value={a.scheduledDate || ''} onChange={e => actions.set(i, { scheduledDate: e.target.value, status: e.target.value ? 'scheduled' : 'pending' })} aria-label="Date" />
                      <input className={inputCls} disabled={ro} value={a.notes || ''} onChange={e => actions.set(i, { notes: e.target.value })} placeholder="Note" aria-label="Note" />
                    </div>
                  </Row>
                ))}
              </Card>
            )}
            {form.nextActions.length === 0 && !form.followUpRecommendations.some(f => f.priority === 'urgent') && !ro && (
              <button type="button" onClick={() => actions.add({ title: '', scheduledDate: '', assignedTo: '', notes: '', status: 'pending' })}
                className="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-emerald-700 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Prévoir un suivi
              </button>
            )}

            <Card title="Signatures" icon={PenLine} hint="La signature du client est facultative : à défaut, il valide le rapport depuis son espace après publication.">
              <SignatureField label={`Technicien${form.technician ? ` · ${form.technician}` : ''}`} value={form.technicianSignature} disabled={ro}
                onChange={v => update('technicianSignature', v)} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} disabled={ro} value={form.clientSignatoryName} onChange={e => update('clientSignatoryName', e.target.value)} placeholder="Nom du représentant client" aria-label="Nom du représentant client" />
                <input className={inputCls} disabled={ro} value={form.clientTitle} onChange={e => update('clientTitle', e.target.value)} placeholder="Fonction" aria-label="Fonction" />
              </div>
              <SignatureField label="Client" value={form.clientSignature} disabled={ro || !form.clientSignatoryName.trim()}
                disabledHint="Indiquez d’abord le nom du signataire" onChange={v => update('clientSignature', v)} />
            </Card>

            {!ro && (
              <section className={`rounded-2xl border p-4 ${submissionErrors.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                {submissionErrors.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Rapport complet, prêt à être envoyé pour relecture.</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-amber-900">Avant l’envoi, il manque :</p>
                    <ul className="mt-1.5 space-y-1">
                      {submissionErrors.map(e => (
                        <li key={e}>
                          <button type="button" onClick={() => goTo(e === 'Client' || e.startsWith('Site') ? 0 : stepOfError(e))} className="text-left text-xs text-amber-800 underline-offset-2 hover:underline">• {e}</button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* Barre d'actions fixe */}
      {!ro && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0}
              className="rounded-xl border border-stone-200 p-3 text-stone-600 disabled:opacity-30" aria-label="Étape précédente"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={handleSave} disabled={!!busy || !!uploading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-stone-700 disabled:opacity-50">
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => goTo(step + 1)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-3 text-sm font-bold text-white">
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={!!busy || !!uploading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 text-sm font-bold text-white disabled:opacity-50">
                {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Briques d'interface ─────────────────────────────────────────────────────
function Card({ title, hint, icon: Icon, action, children }: {
  title: string
  hint?: string
  icon?: typeof Wrench
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">{Icon && <Icon className="h-4 w-4 text-stone-400" />}{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
      <Plus className="h-3.5 w-3.5" />{children}
    </button>
  )
}

function Row({ onRemove, children }: { onRemove?: () => void; children: ReactNode }) {
  return (
    <div className="relative space-y-2 rounded-xl border border-stone-100 bg-stone-50/60 p-3 pr-10">
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute right-2 top-2 rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer la ligne">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-400">{children}</p>
}

function TextArea({ id, label, value, onChange, placeholder, disabled, rows = 4, min }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  min?: number
}) {
  const len = value.trim().length
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelCls} htmlFor={id}>{label}</label>
        {min && <span className={`text-[10px] tabular-nums ${len >= min ? 'text-emerald-600' : 'text-stone-400'}`}>{len}/{min}</span>}
      </div>
      <textarea id={id} rows={rows} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`${inputCls} resize-y`} />
    </div>
  )
}

function SignatureField({ label, value, onChange, disabled, disabledHint }: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  disabled?: boolean
  disabledHint?: string
}) {
  const [editing, setEditing] = useState(!value)
  return (
    <div>
      <p className={labelCls}>{label}</p>
      {value && !editing ? (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={`Signature ${label}`} className="h-16 flex-1 object-contain" />
          {!disabled && (
            <button type="button" onClick={() => { setEditing(true); onChange(null) }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-100">Refaire</button>
          )}
        </div>
      ) : disabled ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-400">{disabledHint || 'Signature indisponible'}</p>
      ) : (
        <SignaturePad onChange={onChange} height={120} />
      )}
    </div>
  )
}
