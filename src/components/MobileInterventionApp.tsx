'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin,
  Camera,
  Clock,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Battery,
  Wifi,
  Signal,
  Calendar,
  Wrench,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Home,
  List,
  Play,
  Pause,
  Send,
  X,
  User,
  FileText,
  Edit3,
  Save,
  Loader
} from 'lucide-react'

interface MobileInterventionAppProps {
  onComplete?: (report: any) => void
}

type View = 'loading' | 'auth' | 'dashboard' | 'adhoc' | 'wizard' | 'success'

type User = {
  id: string
  name?: string
  email?: string
  role: string
}

type Technician = {
  _id: string
  name: string
  email: string
}

type ClientSummary = {
  id: string
  name: string
  company?: string
  address?: string
  phone?: string
  activeContracts?: Array<{ contractId: string; projectId?: string; type: string }>
}

type Intervention = {
  _id: string
  interventionNumber?: string
  clientId?: string | { _id: string; name: string }
  projectId?: string | { _id: string; name: string }
  site?: string
  date?: string
  scheduledDate?: string
  scheduledTime?: string
  heureDebut?: string
  heureFin?: string
  typeIntervention?: 'maintenance' | 'preventive' | 'installation' | 'repair' | 'inspection' | 'emergency' | string
  description?: string
  status: string
  priority?: string
  technicienId?: string
}

interface ReportState {
  site: string
  clientName: string
  clientContact: string
  clientTitle: string
  interventionDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  typeIntervention: 'maintenance' | 'preventive' | 'installation' | 'repair' | 'inspection' | 'emergency'
  problemDescription: string
  initialObservations: string
  tasksPerformed: string[]
  recommendations: string[]
  photosBefore: string[]
  photosAfter: string[]
  technicianSignature: string | null
  clientSignature: string | null
  gpsLocation: { lat: number; lng: number; address?: string } | null
}

const STEPS = [
  { id: 'start', title: 'Arrivée', icon: MapPin },
  { id: 'diagnostic', title: 'Diagnostic', icon: Eye },
  { id: 'photos-before', title: 'Photos Avant', icon: Camera },
  { id: 'tasks', title: 'Intervention', icon: Wrench },
  { id: 'photos-after', title: 'Photos Après', icon: Camera },
  { id: 'signature', title: 'Signature', icon: Edit3 },
  { id: 'summary', title: 'Récap', icon: FileText }
]

const TYPE_OPTIONS: { value: ReportState['typeIntervention']; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'preventive', label: 'Visite préventive' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'repair', label: 'Réparation' },
  { value: 'installation', label: 'Installation' },
  { value: 'inspection', label: 'Inspection' }
]

function pad(n: number) { return n.toString().padStart(2, '0') }

function formatTimer(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function toDateInput(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split('T')[0]
  return date.toISOString().split('T')[0]
}

function toTimeInput(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function computeDurationMinutes(start: string, end: string) {
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
  }
  const s = parse(start)
  const e = parse(end)
  if (s === null || e === null) return 0
  let diff = e - s
  if (diff < 0) diff += 24 * 60
  return diff
}

function timeFromMinutes(minutes: number) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${pad(h)}:${pad(m)}`
}

function getId(obj: any) {
  if (!obj) return undefined
  if (typeof obj === 'string') return obj
  return obj._id ? String(obj._id) : String(obj)
}

function getName(obj: any) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return obj.name || ''
}

function getSite(intervention: Intervention) {
  if (intervention.site) return intervention.site
  if (typeof intervention.clientId === 'object' && intervention.clientId?.name) {
    return intervention.clientId.name
  }
  return 'Site non précisé'
}

function fetchJson(input: string, init?: RequestInit) {
  return fetch(input, { ...init, credentials: 'include' } as RequestInit)
}

// --- Signature pad helpers (top-level pour être accessibles depuis SignaturePad) ---

function getPointerPos(canvas: HTMLCanvasElement, e: React.PointerEvent) {
  const rect = canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function startDraw(
  e: React.PointerEvent<HTMLCanvasElement>,
  setter: (v: boolean) => void,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2
  setter(true)
  const { x, y } = getPointerPos(canvas, e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function moveDraw(
  e: React.PointerEvent<HTMLCanvasElement>,
  drawing: boolean,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  if (!drawing) return
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { x, y } = getPointerPos(canvas, e)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function endDraw(
  e: React.PointerEvent<HTMLCanvasElement>,
  setter: (v: boolean) => void,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onChange: (base64: string) => void
) {
  setter(false)
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx && e) {
    const { x, y } = getPointerPos(canvas, e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  onChange(canvas.toDataURL('image/png'))
}

function clearSignature(canvasRef: React.RefObject<HTMLCanvasElement | null>, onChange: (val: null) => void) {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  onChange(null)
}

export default function MobileInterventionApp({ onComplete }: MobileInterventionAppProps) {
  const [view, setView] = useState<View>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)

  const [reportId, setReportId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<{ reportId: string; reportNumber?: string } | null>(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [reportData, setReportData] = useState<ReportState>({
    site: '',
    clientName: '',
    clientContact: '',
    clientTitle: '',
    interventionDate: toDateInput(new Date()),
    startTime: toTimeInput(new Date()),
    endTime: toTimeInput(new Date()),
    durationMinutes: 0,
    typeIntervention: 'maintenance',
    problemDescription: '',
    initialObservations: '',
    tasksPerformed: [],
    recommendations: [],
    photosBefore: [],
    photosAfter: [],
    technicianSignature: null,
    clientSignature: null,
    gpsLocation: null
  })

  const [adhocClientId, setAdhocClientId] = useState('')
  const [adhocSite, setAdhocSite] = useState('')
  const [adhocType, setAdhocType] = useState<ReportState['typeIntervention']>('maintenance')
  const [adhocDescription, setAdhocDescription] = useState('')
  const [adhocPriority, setAdhocPriority] = useState('medium')

  const techCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const clientCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawingTech, setIsDrawingTech] = useState(false)
  const [isDrawingClient, setIsDrawingClient] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // --- Auth & data loading ---
  useEffect(() => {
    let mounted = true
    const bootstrap = async () => {
      try {
        const authRes = await fetchJson('/api/auth/login')
        if (!authRes.ok) {
          if (mounted) setView('auth')
          return
        }
        const authData = await authRes.json()
        if (!authData?.user) {
          if (mounted) setView('auth')
          return
        }
        if (mounted) setUser(authData.user)

        // Récupérer le technicien lié au user
        let tech: Technician | null = null
        if (authData.user?.email) {
          const techRes = await fetchJson(`/api/technicians?email=${encodeURIComponent(authData.user.email)}`)
          if (techRes.ok) {
            const techData = await techRes.json()
            tech = techData.technicians?.[0] || null
          }
        }
        if (!tech && authData.user?.id) {
          const techRes = await fetchJson(`/api/technicians?userId=${encodeURIComponent(authData.user.id)}`)
          if (techRes.ok) {
            const techData = await techRes.json()
            tech = techData.technicians?.[0] || null
          }
        }
        if (!tech) {
          if (mounted) {
            setTechnician({ _id: authData.user.id, name: authData.user.name || 'Technicien', email: authData.user.email || '' })
          }
        } else if (mounted) {
          setTechnician(tech)
        }

        // Charger les clients (pour ad-hoc)
        const clientsRes = await fetchJson('/api/tech/clients?limit=200')
        if (clientsRes.ok && mounted) {
          const clientsData = await clientsRes.json()
          setClients(clientsData.clients || [])
        }

        if (mounted) setView('dashboard')
      } catch (err) {
        console.error('[MobileInterventionApp] Bootstrap error:', err)
        if (mounted) setView('auth')
      }
    }
    bootstrap()
    return () => { mounted = false }
  }, [])

  // Charger les interventions quand le technicien est connu
  useEffect(() => {
    if (!technician) return
    const today = new Date().toISOString().split('T')[0]
    const load = async () => {
      try {
        const res = await fetchJson(`/api/interventions?status=scheduled,pending,in_progress&date=${today}&technicianId=${technician._id}&limit=50`)
        if (!res.ok) return
        const data = await res.json()
        setInterventions(data.interventions || [])
      } catch (err) {
        console.error('[MobileInterventionApp] Load interventions error:', err)
      }
    }
    load()
  }, [technician])

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  // Géolocalisation
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportData(prev => ({
          ...prev,
          gpsLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Position GPS' }
        }))
      },
      () => {}
    )
  }, [])

  const updateReport = useCallback((patch: Partial<ReportState>) => {
    setReportData(prev => ({ ...prev, ...patch }))
  }, [])

  const selectIntervention = useCallback((intervention: Intervention) => {
    setSelectedIntervention(intervention)
    const now = new Date()
    const start = intervention.heureDebut || toTimeInput(now)
    const site = getSite(intervention)
    const clientName = getName(intervention.clientId)
    const interventionDate = toDateInput(intervention.date || now)

    setReportData({
      site,
      clientName,
      clientContact: '',
      clientTitle: '',
      interventionDate,
      startTime: start,
      endTime: start,
      durationMinutes: 0,
      typeIntervention: (intervention.typeIntervention as ReportState['typeIntervention']) || 'maintenance',
      problemDescription: intervention.description || '',
      initialObservations: '',
      tasksPerformed: [],
      recommendations: [],
      photosBefore: [],
      photosAfter: [],
      technicianSignature: null,
      clientSignature: null,
      gpsLocation: null
    })
    setTimerSeconds(0)
    setTimerRunning(false)
    setCurrentStep(0)
    setReportId(null)
    setSubmitError(null)
    setView('wizard')
  }, [])

  const startAdHocFlow = useCallback(() => {
    setView('adhoc')
    setAdhocClientId('')
    setAdhocSite('')
    setAdhocType('maintenance')
    setAdhocDescription('')
    setAdhocPriority('medium')
  }, [])

  const createAdHocIntervention = async () => {
    if (!adhocClientId || !adhocSite || !technician) return
    const selectedClient = clients.find(c => c.id === adhocClientId)
    if (!selectedClient) return

    const projectId = selectedClient.activeContracts?.[0]?.projectId
    const now = new Date()
    const startTime = toTimeInput(now)
    const endTime = timeFromMinutes((now.getHours() * 60 + now.getMinutes() + 60) % (24 * 60))

    setIsLoading(true)
    try {
      const res = await fetchJson('/api/interventions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicienId: technician._id,
          clientId: adhocClientId,
          projectId,
          date: toDateInput(now),
          heureDebut: startTime,
          heureFin: endTime,
          typeIntervention: adhocType,
          site: adhocSite,
          description: adhocDescription,
          activites: '',
          observations: '',
          recommandations: [],
          status: 'in_progress',
          priority: adhocPriority
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Erreur création intervention')
        return
      }
      const data = await res.json()
      if (data.intervention) {
        selectIntervention(data.intervention)
      }
    } catch (err) {
      alert('Erreur réseau lors de la création')
    } finally {
      setIsLoading(false)
    }
  }

  const startTimer = () => {
    if (!timerRunning) {
      const now = new Date()
      setReportData(prev => ({ ...prev, startTime: toTimeInput(now) }))
      setTimerRunning(true)
    }
  }

  const pauseTimer = () => setTimerRunning(false)
  const resumeTimer = () => setTimerRunning(true)

  const finishTimer = () => {
    setTimerRunning(false)
    const now = new Date()
    setReportData(prev => {
      const end = toTimeInput(now)
      const duration = computeDurationMinutes(prev.startTime, end)
      return { ...prev, endTime: end, durationMinutes: duration }
    })
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1)
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  const uploadPhoto = async (file: File, type: 'before' | 'after'): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      if (!res.ok) return null
      const j = await res.json()
      return j.url || null
    } catch {
      return null
    }
  }

  const handlePhotoInput = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    for (const file of files) {
      const url = await uploadPhoto(file, type)
      if (url) {
        setReportData(prev => ({
          ...prev,
          [type === 'before' ? 'photosBefore' : 'photosAfter']: [
            ...prev[type === 'before' ? 'photosBefore' : 'photosAfter'],
            url
          ]
        }))
      }
    }
    e.target.value = ''
  }

  const removePhoto = (url: string, type: 'before' | 'after') => {
    setReportData(prev => ({
      ...prev,
      [type === 'before' ? 'photosBefore' : 'photosAfter']:
        prev[type === 'before' ? 'photosBefore' : 'photosAfter'].filter(u => u !== url)
    }))
  }

  const addTask = (task: string) => {
    const t = task.trim()
    if (!t) return
    setReportData(prev => ({ ...prev, tasksPerformed: [...prev.tasksPerformed, t] }))
  }

  const removeTask = (index: number) => {
    setReportData(prev => ({ ...prev, tasksPerformed: prev.tasksPerformed.filter((_, i) => i !== index) }))
  }

  const addRecommendation = (text: string) => {
    const t = text.trim()
    if (!t) return
    setReportData(prev => ({ ...prev, recommendations: [...prev.recommendations, t] }))
  }

  const removeRecommendation = (index: number) => {
    setReportData(prev => ({ ...prev, recommendations: prev.recommendations.filter((_, i) => i !== index) }))
  }

  // helpers signature pads définis au top-level

  // --- Submission ---
  const saveDraftReport = async (): Promise<string | null> => {
    if (!selectedIntervention) return null
    if (!reportData.startTime || !reportData.endTime) return null

    const payload: any = {
      site: reportData.site,
      clientName: reportData.clientName,
      clientContact: reportData.clientContact,
      interventionDate: reportData.interventionDate,
      startTime: reportData.startTime,
      endTime: reportData.endTime,
      duration: reportData.durationMinutes || computeDurationMinutes(reportData.startTime, reportData.endTime),
      interventionType: reportData.typeIntervention,
      initialObservations: reportData.initialObservations || 'Aucune observation initiale',
      problemDescription: reportData.problemDescription,
      problemSeverity: 'medium',
      tasksPerformed: reportData.tasksPerformed.filter(Boolean),
      results: 'Intervention réalisée via app mobile',
      recommendations: reportData.recommendations,
      issuesDetected: [],
      materialsUsed: [],
      followUpRecommendations: [],
      nextActions: [],
      billing: { needsQuote: false },
      templateId: 'manual',
      templateVersion: '1.0',
      projectId: getId(selectedIntervention.projectId),
      interventionId: selectedIntervention._id,
      photosBefore: reportData.photosBefore,
      photosAfter: reportData.photosAfter,
      technician: technician?.name || user?.name || 'Technicien',
      technicianId: technician?._id,
      technicianSignature: reportData.technicianSignature,
      clientSignature: reportData.clientSignature,
      clientTitle: reportData.clientTitle,
      gpsLocation: reportData.gpsLocation,
      status: 'draft'
    }

    const method = reportId ? 'PUT' : 'POST'
    if (reportId) payload.reportId = reportId

    const res = await fetchJson('/api/maintenance/reports', {
      method,
      headers: { 'Content-Type': 'application/json', 'x-dev-bypass-csrf': 'true' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erreur sauvegarde rapport')
    }
    const data = await res.json()
    const id = String(data?.report?._id || data?.report?.id || reportId)
    if (id) setReportId(id)
    return id
  }

  const submitReport = async () => {
    if (!selectedIntervention) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const id = await saveDraftReport()
      if (!id) throw new Error('Impossible de créer le rapport')

      const submitRes = await fetchJson('/api/maintenance/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass-csrf': 'true' },
        body: JSON.stringify({
          reportId: id,
          finalChecks: {
            hasPhotosBefore: reportData.photosBefore.length > 0,
            hasPhotosAfter: reportData.photosAfter.length > 0,
            hasSignature: !!(reportData.technicianSignature && reportData.clientSignature),
            hasTasks: reportData.tasksPerformed.length > 0
          }
        })
      })
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur soumission rapport')
      }
      const data = await submitRes.json()
      setSubmitSuccess({ reportId: id, reportNumber: data.report?.reportId })
      setView('success')
      onComplete?.(data.report)
    } catch (err: any) {
      setSubmitError(err?.message || 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Rendering ---
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 max-w-md mx-auto flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gray-100 max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Accès non autorisé</h1>
        <p className="text-gray-600 mb-6">Veuillez vous connecter en tant que technicien pour accéder aux interventions.</p>
        <button onClick={() => window.location.href = '/login'} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
          Se connecter
        </button>
      </div>
    )
  }

  if (view === 'success' && submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-100 max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rapport envoyé !</h1>
        <p className="text-gray-600 mb-2">Référence : {submitSuccess.reportNumber || submitSuccess.reportId}</p>
        <p className="text-sm text-gray-500 mb-6">Il est en attente de validation par l'administrateur.</p>
        <button onClick={() => { setView('dashboard'); setSubmitSuccess(null); setSelectedIntervention(null) }} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
          Retour à mes interventions
        </button>
      </div>
    )
  }

  if (view === 'dashboard') {
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return (
      <div className="min-h-screen bg-gray-100 max-w-md mx-auto pb-24">
        <div className="bg-blue-600 text-white p-4">
          <h1 className="text-lg font-bold">IT Vision Tech</h1>
          <p className="text-blue-100 text-sm">{today}</p>
          <p className="text-blue-100 text-xs mt-1">{technician?.name || user?.name}</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <List className="h-5 w-5" /> Mes interventions du jour
            </h2>
          </div>

          {interventions.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-gray-500 mb-4">Aucune intervention planifiée aujourd'hui.</p>
              <button onClick={startAdHocFlow} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" /> Nouvelle intervention
              </button>
            </div>
          ) : (
            interventions.map(i => (
              <div key={i._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-gray-900">{getSite(i)}</div>
                    <div className="text-sm text-gray-600">{getName(i.clientId)}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${i.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {i.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {i.heureDebut || '--:--'} - {i.heureFin || '--:--'}
                  <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{i.typeIntervention}</span>
                </div>
                <button onClick={() => selectIntervention(i)} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold">
                  {i.status === 'in_progress' ? 'Continuer' : 'Démarrer'}
                </button>
              </div>
            ))
          )}

          {interventions.length > 0 && (
            <button onClick={startAdHocFlow} className="w-full border-2 border-dashed border-gray-300 text-gray-600 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-white">
              <Plus className="h-5 w-5" /> Intervention non planifiée
            </button>
          )}
        </div>
      </div>
    )
  }

  if (view === 'adhoc') {
    return (
      <div className="min-h-screen bg-gray-100 max-w-md mx-auto p-4 pb-24">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Nouvelle intervention</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                value={adhocClientId}
                onChange={e => {
                  setAdhocClientId(e.target.value)
                  const c = clients.find(x => x.id === e.target.value)
                  setAdhocSite(c?.address || '')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Choisir un client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <input
                value={adhocSite}
                onChange={e => setAdhocSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Adresse du site"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'intervention</label>
              <select
                value={adhocType}
                onChange={e => setAdhocType(e.target.value as ReportState['typeIntervention'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description / motif</label>
              <textarea
                value={adhocDescription}
                onChange={e => setAdhocDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Motif de l'intervention..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select
                value={adhocPriority}
                onChange={e => setAdhocPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setView('dashboard')} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold">
              Annuler
            </button>
            <button
              onClick={createAdHocIntervention}
              disabled={!adhocClientId || !adhocSite || isLoading}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Démarrer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Wizard
  const step = STEPS[currentStep]
  const StepIcon = step.icon

  const canGoNext = (() => {
    if (currentStep === 0) return !!reportData.startTime && timerSeconds > 0
    if (currentStep === 1) return !!reportData.typeIntervention
    if (currentStep === 5) return !!reportData.technicianSignature && !!reportData.clientSignature && !!reportData.clientName
    return true
  })()

  return (
    <div className="min-h-screen bg-gray-100 max-w-md mx-auto relative pb-24">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setView('dashboard')} className="p-2 bg-blue-500 rounded-lg">
            <Home className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">{step.title}</h1>
            <p className="text-blue-100 text-xs">{getName(selectedIntervention?.clientId)} - {reportData.site}</p>
          </div>
          <div className="text-right min-w-[4rem]">
            <div className="text-2xl font-bold font-mono">{formatTimer(timerSeconds)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => { if (idx <= currentStep) setCurrentStep(idx) }}
                className="flex flex-col items-center"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idx <= currentStep ? 'bg-white text-blue-600' : 'bg-blue-400 text-blue-100'}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {submitError}
        </div>
      )}

      <div className="p-4">
        {/* Step 0: Start */}
        {currentStep === 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" /> Arrivée sur site
            </h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="font-medium">Client :</span> {reportData.clientName}</div>
              <div><span className="font-medium">Site :</span> {reportData.site}</div>
              <div><span className="font-medium">Type :</span> {reportData.typeIntervention}</div>
              <div><span className="font-medium">Date :</span> {new Date(reportData.interventionDate).toLocaleDateString('fr-FR')}</div>
            </div>

            {reportData.gpsLocation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm flex items-center gap-2">
                <Navigation className="h-5 w-5" /> GPS capturé ({reportData.gpsLocation.lat.toFixed(4)}, {reportData.gpsLocation.lng.toFixed(4)})
              </div>
            )}

            <div className="flex gap-3">
              {!timerRunning ? (
                <button onClick={startTimer} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <Play className="h-5 w-5" /> Démarrer
                </button>
              ) : (
                <button onClick={pauseTimer} className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <Pause className="h-5 w-5" /> Pause
                </button>
              )}
              {timerSeconds > 0 && !timerRunning && (
                <button onClick={resumeTimer} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <Play className="h-5 w-5" /> Reprendre
                </button>
              )}
            </div>

            {timerSeconds > 0 && (
              <button onClick={() => { finishTimer(); nextStep() }} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">
                Passer au diagnostic
              </button>
            )}
          </div>
        )}

        {/* Step 1: Diagnostic */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Diagnostic</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'intervention</label>
              <select
                value={reportData.typeIntervention}
                onChange={e => updateReport({ typeIntervention: e.target.value as ReportState['typeIntervention'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observations initiales</label>
              <textarea
                value={reportData.initialObservations}
                onChange={e => updateReport({ initialObservations: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="État initial, symptômes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description du problème</label>
              <textarea
                value={reportData.problemDescription}
                onChange={e => updateReport({ problemDescription: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Détail du problème constaté..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Photos before */}
        {currentStep === 2 && (
          <PhotoStep
            title="Photos AVANT intervention"
            type="before"
            photos={reportData.photosBefore}
            onAdd={handlePhotoInput}
            onRemove={removePhoto}
          />
        )}

        {/* Step 3: Tasks */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Tâches réalisées</h2>

            <div className="space-y-2">
              {reportData.tasksPerformed.map((task, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{task}</span>
                  </div>
                  <button onClick={() => removeTask(idx)} className="text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {['Nettoyage caméras', 'Vérification câblage', 'Test enregistrement', 'Mise à jour firmware', 'Réglage angles', 'Test réseau'].map(task => (
                <button key={task} onClick={() => addTask(task)} className="text-left px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100">
                  + {task}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Tâche personnalisée..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              onKeyDown={e => { if (e.key === 'Enter') { addTask((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = '' } }}
            />
          </div>
        )}

        {/* Step 4: Photos after */}
        {currentStep === 4 && (
          <PhotoStep
            title="Photos APRÈS intervention"
            type="after"
            photos={reportData.photosAfter}
            onAdd={handlePhotoInput}
            onRemove={removePhoto}
          />
        )}

        {/* Step 5: Signature */}
        {currentStep === 5 && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Signatures</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du signataire client</label>
              <input
                value={reportData.clientName}
                onChange={e => updateReport({ clientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Nom et prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre / fonction</label>
              <input
                value={reportData.clientTitle}
                onChange={e => updateReport({ clientTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Directeur, Responsable sécurité..."
              />
            </div>

            <SignaturePad
              label="Signature du technicien"
              canvasRef={techCanvasRef}
              value={reportData.technicianSignature}
              isDrawing={isDrawingTech}
              setIsDrawing={setIsDrawingTech}
              onChange={(val) => updateReport({ technicianSignature: val })}
              onClear={() => clearSignature(techCanvasRef, (val) => updateReport({ technicianSignature: val }))}
            />

            <SignaturePad
              label="Signature du client"
              canvasRef={clientCanvasRef}
              value={reportData.clientSignature}
              isDrawing={isDrawingClient}
              setIsDrawing={setIsDrawingClient}
              onChange={(val) => updateReport({ clientSignature: val })}
              onClear={() => clearSignature(clientCanvasRef, (val) => updateReport({ clientSignature: val }))}
            />
          </div>
        )}

        {/* Step 6: Summary */}
        {currentStep === 6 && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Récapitulatif</h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="font-medium">Site :</span> {reportData.site}</div>
              <div><span className="font-medium">Client :</span> {reportData.clientName}</div>
              <div><span className="font-medium">Type :</span> {reportData.typeIntervention}</div>
              <div><span className="font-medium">Horaires :</span> {reportData.startTime} - {reportData.endTime}</div>
              <div><span className="font-medium">Durée :</span> {reportData.durationMinutes} min</div>
              <div><span className="font-medium">Tâches :</span> {reportData.tasksPerformed.length}</div>
              <div><span className="font-medium">Photos avant/après :</span> {reportData.photosBefore.length} / {reportData.photosAfter.length}</div>
            </div>

            {reportData.photosBefore.length === 0 || reportData.photosAfter.length === 0 || reportData.tasksPerformed.length === 0 ? (
              <div className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg">
                Pensez à ajouter au moins une photo avant, une photo après et une tâche pour un rapport complet.
              </div>
            ) : null}

            <button
              onClick={submitReport}
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Valider et envoyer le rapport
            </button>

            <button
              onClick={async () => { try { await saveDraftReport() } catch (e: any) { setSubmitError(e.message) } }}
              disabled={isSubmitting}
              className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" /> Sauvegarder en brouillon
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Précédent</span>
          </button>

          <button
            onClick={currentStep === STEPS.length - 1 ? () => {} : nextStep}
            disabled={currentStep === STEPS.length - 1 || !canGoNext}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            <span>Suivant</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Sub-components ---

function PhotoStep({ title, type, photos, onAdd, onRemove }: {
  title: string
  type: 'before' | 'after'
  photos: string[]
  onAdd: (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => void
  onRemove: (url: string, type: 'before' | 'after') => void
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>

      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
        <Camera className="h-8 w-8 text-blue-600 mb-2" />
        <span className="text-sm text-blue-700">Prendre / choisir des photos</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={e => onAdd(e, type)}
        />
      </label>

      {photos.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Photos ({photos.length})</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map(url => (
              <div key={url} className="relative">
                <img src={url} alt="photo" className="w-full h-24 object-cover rounded-lg" />
                <button
                  onClick={() => onRemove(url, type)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SignaturePad({ label, canvasRef, value, isDrawing, setIsDrawing, onChange, onClear }: {
  label: string
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  value: string | null
  isDrawing: boolean
  setIsDrawing: (v: boolean) => void
  onChange: (val: string) => void
  onClear: () => void
}) {
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => startDraw(e, setIsDrawing, canvasRef)
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => moveDraw(e, isDrawing, canvasRef)
  const end = (e: React.PointerEvent<HTMLCanvasElement>) => endDraw(e, setIsDrawing, canvasRef, onChange)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <button onClick={onClear} className="text-xs text-red-600 flex items-center gap-1">
          <Trash2 className="h-3 w-3" /> Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={120}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-32 border-2 border-gray-300 rounded-lg bg-white touch-none"
      />
    </div>
  )
}
