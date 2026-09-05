'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Lock, 
  LogOut,
  Wrench,
  FileText,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Smartphone,
  Battery,
  Signal,
  Plus,
  Eye,
  Send,
  Download,
  Star,
  Activity,
  Target,
  Navigation,
  Wifi,
  WifiOff,
  Building2,
  Phone,
  Mail,
  Briefcase
} from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import EnhancedMaintenanceForm from './EnhancedMaintenanceForm'
import TechnicianMarketplace from './TechnicianMarketplace'
import SoftMessage from '@/components/ui/SoftMessage'
import ModernModal, { ModalActions, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/ModernModal'

interface TechnicianSession {
  id: string
  name: string
  role: string
  loginTime: Date
  isAuthenticated: boolean
}

interface ClientSummary {
  id: string
  clientId: string
  name: string
  company?: string
  contactPerson?: string
  email: string
  phone: string
  address?: string
  activeContracts: Array<{
    contractId: string
    projectId?: string
    type: string
    startDate: string | Date
    endDate?: string | Date
  }>
}

interface TechnicianPortalProps {
  initialSession?: TechnicianSession | null
}

type UiNotice = {
  variant: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
}

export default function TechnicianPortal({ initialSession = null }: TechnicianPortalProps) {
  const router = useRouter()
  const [session, setSession] = useState<TechnicianSession | null>(initialSession)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports' | 'create-report' | 'view-report' | 'edit-report' | 'profile' | 'clients' | 'marketplace'>('dashboard')
  const [isOnline, setIsOnline] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [prefillClient, setPrefillClient] = useState<ClientSummary | null>(null)
  const [reportSearch, setReportSearch] = useState('')
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all')
  const [submittingReportId, setSubmittingReportId] = useState<string | null>(null)
  const [draftToSubmit, setDraftToSubmit] = useState<any | null>(null)
  const [uiNotice, setUiNotice] = useState<UiNotice | null>(null)
  const [stats, setStats] = useState({
    todayReports: 0,
    pendingReports: 0,
    completedToday: 0,
    avgResponseTime: '2h 30min',
    weekHours: 0,
    clientSatisfaction: 0,
    slaOnTime: 0,
    activeClients: 0
  })

  // Surveillance de la connectivité
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // Géolocalisation
  useEffect(() => {
    if (navigator.geolocation && session) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => console.log('Géolocalisation non disponible:', error)
      )
    }
  }, [session])

  // Chargement des données du technicien
  useEffect(() => {
    if (session) {
      loadTechnicianData()
      loadClientDirectory()
    }
  }, [session])

  // Charger la moyenne d'évaluations client (via /api/feedback)
  useEffect(() => {
    (async () => {
      try {
        if (!session?.name) return
        const res = await fetch(`/api/feedback?technicianId=${encodeURIComponent(session.name)}&mode=stats`, { credentials: 'include' })
        if (res.ok) {
          const j = await res.json()
          setStats((prev) => ({ ...prev, clientSatisfaction: Number((j.avgRating || 0).toFixed(1)) }))
        }
      } catch {}
    })()
  }, [session?.name])

  // Auto-auth via cookie (évite double login)
  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/login', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const role = String(data.user?.role || '').toUpperCase()
        if (role !== 'TECHNICIAN') {
          // Rediriger vers l'interface correspondant au rôle
          if (role === 'ADMIN') router.replace('/admin-reports')
          else router.replace('/compte')
          return
        }
        if (cancelled) return
        const newSession: TechnicianSession = {
          id: data.user.id,
          name: data.user.name || data.user.username || data.user.email || 'Technicien',
          role: 'Technicien',
          loginTime: new Date(),
          isAuthenticated: true
        }
        setSession(newSession)
      } catch {}
      finally {
        if (!cancelled) setIsCheckingAuth(false)
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [router])

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { credentials: 'include' }) } catch {}
    setSession(null)
    setCurrentView('dashboard')
    router.replace('/login')
  }

  const loadTechnicianData = async () => {
    try {
      // Charger les vrais rapports depuis l'API
      const [reportsRes, interventionsRes] = await Promise.all([
        fetch('/api/maintenance/reports?limit=50', { credentials: 'include' }).catch(() => null),
        fetch('/api/interventions?limit=50', { credentials: 'include' }).catch(() => null)
      ])

      let allReports: any[] = []
      if (reportsRes?.ok) {
        const data = await reportsRes.json()
        allReports = (data.reports || []).map((r: any) => ({
          id: r.reportId || r._id,
          _id: r._id,
          site: r.site || 'Non spécifié',
          status: r.status || 'draft',
          priority: r.priority || 'medium',
          scheduledTime: r.startTime || '',
          durationMinutes: typeof r.duration === 'number' ? r.duration : 0,
          estimatedDuration: r.duration ? `${Math.floor(r.duration / 60)}h${r.duration % 60 > 0 ? ` ${r.duration % 60}min` : ''}` : '',
          interventionDate: r.interventionDate,
          clientName: r.clientId?.name || r.clientName || '',
          initialObservations: r.initialObservations || '',
          problemDescription: r.problemDescription || '',
          results: r.results || '',
          tasksPerformed: r.tasksPerformed || [],
          recommendations: r.recommendations || [],
          startTime: r.startTime || '',
          endTime: r.endTime || '',
          raw: r
        }))
      }

      let allInterventions: any[] = []
      if (interventionsRes?.ok) {
        const data = await interventionsRes.json()
        allInterventions = (data.interventions || []).map((i: any) => ({
          id: i._id,
          _id: i._id,
          kind: 'intervention',
          site: i.site || i.client || i.title || 'Non spécifié',
          status: i.status || 'pending',
          priority: i.priority || 'medium',
          scheduledTime: i.heureDebut || '',
          estimatedDuration: i.duree
            ? `${Math.floor(i.duree / 60)}h${i.duree % 60 > 0 ? ` ${i.duree % 60}min` : ''}`
            : (i.estimatedDuration ? `${i.estimatedDuration}h` : ''),
          interventionDate: i.date,
          clientName: i.client || i.clientId?.name || '',
          projectId: i.projectId?._id || i.projectId,
          interventionId: i._id,
          raw: i
        }))
      }

      const combined = [...allReports, ...allInterventions]
      setReports(combined)

      // Calculer les vraies stats
      const today = new Date().toISOString().split('T')[0]
      const todayItems = combined.filter(r => {
        const d = r.interventionDate ? new Date(r.interventionDate).toISOString().split('T')[0] : ''
        return d === today
      })
      const pendingItems = combined.filter(r => ['pending', 'draft', 'pending_validation'].includes(r.status))
      const completedItems = combined.filter(r => ['completed', 'validated', 'published'].includes(r.status))

      // Calcul heures de la semaine
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekReports = allReports.filter(r => {
        const d = r.interventionDate ? new Date(r.interventionDate) : null
        return d && d >= weekStart
      })

      // Calcul temps moyen réel (basé sur la durée des rapports)
      const durations = allReports
        .map(r => typeof r.durationMinutes === 'number' ? r.durationMinutes : 0)
        .filter(d => d > 0)
      const avgMin = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
      const avgTimeStr = avgMin > 0
        ? `${Math.floor(avgMin / 60)}h${avgMin % 60 > 0 ? ` ${avgMin % 60}min` : ''}`
        : '–'

      // Calcul heures semaine réelles
      const weekMinutes = weekReports.reduce((sum, r) => sum + (typeof r.durationMinutes === 'number' ? r.durationMinutes : 0), 0)

      setStats((prev) => ({
        ...prev,
        todayReports: todayItems.length,
        pendingReports: pendingItems.length,
        completedToday: completedItems.length,
        avgResponseTime: avgTimeStr,
        weekHours: Math.round(weekMinutes / 60),
        slaOnTime: combined.length > 0 ? Math.round((completedItems.length / combined.length) * 100) : 0
      }))
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
  }

  const loadClientDirectory = async () => {
    try {
      const response = await fetch('/api/tech/clients?limit=12', { credentials: 'include' })
      if (!response.ok) return
      const data = await response.json()
      const safeClients: ClientSummary[] = Array.isArray(data.clients) ? data.clients : []
      setClients(safeClients)
      setStats((prev) => ({
        ...prev,
        activeClients: safeClients.filter((client) => Array.isArray(client.activeContracts) && client.activeContracts.length > 0).length || safeClients.length
      }))
    } catch (error) {
      console.error('Erreur chargement clients:', error)
    }
  }

  const handleSaveReport = async (data: any) => {
    try {
      // Recharger les données pour refléter le nouveau brouillon
      await loadTechnicianData()
    } catch {}
  }

  const handleSubmitReport = async (data: any) => {
    try {
      setCurrentView('dashboard')
      await loadTechnicianData()
    } catch {}
  }

  const handleViewReport = (report: any) => {
    setSelectedReport(report)
    setCurrentView('view-report')
  }

  const handleEditDraft = (report: any) => {
    setSelectedReport(report)
    setCurrentView('edit-report')
  }

  const submitDraft = async (report: any) => {
    if (!report?._id) return

    setSubmittingReportId(report._id)
    setUiNotice(null)
    try {
      const res = await fetch('/api/maintenance/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass-csrf': 'true' },
        credentials: 'include',
        body: JSON.stringify({ reportId: report._id })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setUiNotice({
          variant: 'error',
          title: 'Soumission impossible',
          message: j?.error || 'Erreur lors de la soumission'
        })
        return
      }
      setUiNotice({
        variant: 'success',
        title: 'Rapport envoyé',
        message: 'Le brouillon a été soumis pour validation.'
      })
      await loadTechnicianData()
    } catch (err) {
      setUiNotice({
        variant: 'error',
        title: 'Erreur réseau',
        message: 'Veuillez vérifier votre connexion et réessayer.'
      })
    } finally {
      setSubmittingReportId(null)
    }
  }

  const handleSubmitDraft = (report: any) => {
    if (!report?._id) return
    setDraftToSubmit(report)
  }

  const confirmSubmitDraft = async () => {
    if (!draftToSubmit) return
    const report = draftToSubmit
    setDraftToSubmit(null)
    await submitDraft(report)
  }

  const handlePlanFromClient = (client: ClientSummary) => {
    setPrefillClient(client)
    setCurrentView('create-report')
  }

  // Redirection hors rendu pour éviter l'avertissement React
  useEffect(() => {
    if (!isCheckingAuth && !session) {
      router.replace('/login')
    }
  }, [isCheckingAuth, session, router])

  // Attendre la vérification / redirection
  if (isCheckingAuth || !session) return null

  const renderDashboard = () => (
    <div className="space-y-6">
        {/* Statistiques du jour */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            { v: stats.todayReports, l: 'Interventions du jour', icon: Calendar, chip: 'bg-sky-50 text-sky-600' },
            { v: stats.pendingReports, l: 'En attente', icon: Clock, chip: 'bg-amber-50 text-amber-600' },
            { v: stats.completedToday, l: 'Terminées', icon: CheckCircle, chip: 'bg-emerald-50 text-emerald-600' },
            { v: stats.avgResponseTime, l: 'Temps moyen', icon: Activity, chip: 'bg-violet-50 text-violet-600' },
            { v: `${stats.weekHours}h`, l: 'Heures semaine', icon: Activity, chip: 'bg-teal-50 text-teal-600' },
            { v: stats.clientSatisfaction, l: 'Note clients /5', icon: Star, chip: 'bg-amber-50 text-amber-500' },
            { v: `${stats.slaOnTime}%`, l: 'SLA respecté', icon: Target, chip: 'bg-emerald-50 text-emerald-600' },
            { v: clients.length, l: 'Clients actifs', icon: Building2, chip: 'bg-indigo-50 text-indigo-600' },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.l} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${k.chip}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold text-stone-900 tabular-nums">{k.v}</div>
                <div className="text-[11px] font-medium text-stone-400 leading-tight mt-0.5">{k.l}</div>
              </div>
            )
          })}
        </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <a href="/tech-interface/terrain"
              className="group flex flex-col items-start gap-2.5 rounded-xl border-2 border-emerald-800 bg-emerald-800 text-white p-4 transition-all hover:bg-emerald-900 hover:shadow-md">
              <Target className="h-5 w-5 text-emerald-300" />
              <span className="text-sm font-semibold leading-tight">Vue terrain</span>
            </a>
            {[
              { label: 'Nouveau rapport', icon: Plus, view: 'create-report', chip: 'bg-emerald-50 text-emerald-700' },
              { label: 'Mes rapports', icon: FileText, view: 'reports', chip: 'bg-sky-50 text-sky-600' },
              { label: 'Annuaire clients', icon: Building2, view: 'clients', chip: 'bg-indigo-50 text-indigo-600' },
              { label: 'Marketplace', icon: Briefcase, view: 'marketplace', chip: 'bg-teal-50 text-teal-600' },
            ].map(a => {
              const Icon = a.icon
              return (
                <button key={a.view} onClick={() => setCurrentView(a.view as any)}
                  className="group flex flex-col items-start gap-2.5 rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-stone-300 hover:shadow-md">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.chip}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-stone-800 leading-tight">{a.label}</span>
                </button>
              )
            })}

            <button
              onClick={() => {
                if (currentLocation) {
                  window.open(`https://www.google.com/maps/@${currentLocation.lat},${currentLocation.lng},15z`, '_blank')
                } else {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => window.open(`https://www.google.com/maps/@${pos.coords.latitude},${pos.coords.longitude},15z`, '_blank'),
                    () => window.open('https://www.google.com/maps', '_blank')
                  )
                }
              }}
              className="group flex flex-col items-start gap-2.5 rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-stone-300 hover:shadow-md"
            >
              <span className="w-9 h-9 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center">
                <Navigation className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-stone-800 leading-tight">Navigation</span>
            </button>
        </div>
      </div>

      {/* Interventions du jour */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Interventions programmées</h2>
          <button
            onClick={loadTechnicianData}
            className="text-sm text-sky-600 hover:text-blue-800"
          >
            Rafraîchir
          </button>
        </div>
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <Calendar className="h-10 w-10 mx-auto mb-2 text-stone-300" />
              <p>Aucune intervention programmée</p>
              <button
                onClick={() => setCurrentView('create-report')}
                className="mt-3 text-sm text-emerald-700 hover:text-emerald-900 font-medium"
              >
                Créer un rapport
              </button>
            </div>
          ) : (
            reports.slice(0, 10).map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    ['pending', 'draft'].includes(report.status) ? 'bg-amber-500' :
                    ['in_progress', 'scheduled'].includes(report.status) ? 'bg-sky-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-stone-900">{report.site}</div>
                    <div className="text-sm text-stone-600">
                      {report.interventionDate ? new Date(report.interventionDate).toLocaleDateString('fr-FR') : ''}
                      {report.scheduledTime ? ` • ${report.scheduledTime}` : ''}
                      {report.estimatedDuration ? ` • ${report.estimatedDuration}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(report.status)}
                  <button
                    onClick={() => handleViewReport(report)}
                    className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const statusLabels: Record<string, { label: string; className: string }> = {
    draft: { label: 'Brouillon', className: 'bg-stone-100 text-stone-800' },
    pending: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
    pending_validation: { label: 'En validation', className: 'bg-amber-100 text-amber-800' },
    in_progress: { label: 'En cours', className: 'bg-sky-100 text-sky-800' },
    scheduled: { label: 'Planifié', className: 'bg-indigo-100 text-indigo-800' },
    completed: { label: 'Terminé', className: 'bg-emerald-100 text-emerald-800' },
    validated: { label: 'Validé', className: 'bg-emerald-100 text-emerald-800' },
    published: { label: 'Publié', className: 'bg-teal-100 text-teal-800' },
    archived: { label: 'Archivé', className: 'bg-slate-100 text-slate-800' }
  }

  const getStatusBadge = (status: string) => {
    const config = statusLabels[status] || { label: status, className: 'bg-stone-100 text-stone-800' }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>
  }

  const filteredReports = reports.filter(r => {
    const matchesSearch = !reportSearch ||
      (r.site || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
      (r.clientName || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
      (r.id || '').toLowerCase().includes(reportSearch.toLowerCase())
    const matchesStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter
    return matchesSearch && matchesStatus
  })

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Mes Rapports</h2>
          <p className="text-sm text-stone-500 mt-1">{filteredReports.length} sur {reports.length} rapport(s)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTechnicianData}
            className="border border-stone-200 text-stone-600 hover:bg-stone-100 px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
          <button
            onClick={() => setCurrentView('create-report')}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher par site, client ou référence..."
          value={reportSearch}
          onChange={(e) => setReportSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-emerald-600"
        />
        <select
          value={reportStatusFilter}
          onChange={(e) => setReportStatusFilter(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="pending">En attente</option>
          <option value="pending_validation">En validation</option>
          <option value="completed">Terminés</option>
          <option value="validated">Validés</option>
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-12 text-center">
          <FileText className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">
            {reports.length === 0 ? 'Aucun rapport' : 'Aucun résultat'}
          </h3>
          <p className="text-stone-500 mb-4">
            {reports.length === 0
              ? "Vous n'avez pas encore créé de rapport d'intervention."
              : 'Essayez de modifier vos filtres de recherche.'}
          </p>
          {reports.length === 0 && (
            <button
              onClick={() => setCurrentView('create-report')}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-6 py-2 rounded-lg"
            >
              Créer mon premier rapport
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vue tableau (desktop) */}
          <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-stone-50">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-stone-700">
                <div>Référence</div>
                <div>Site / Client</div>
                <div>Date</div>
                <div>Priorité</div>
                <div>Statut</div>
                <div>Actions</div>
              </div>
            </div>
            <div className="divide-y divide-stone-200">
              {filteredReports.map((report) => (
                <div key={report.id} className="p-4 grid grid-cols-6 gap-4 items-center hover:bg-stone-50">
                  <div className="font-medium text-stone-900 text-sm truncate">{report.id}</div>
                  <div className="min-w-0">
                    <div className="text-stone-900 text-sm truncate">{report.site}</div>
                    {report.clientName && <div className="text-xs text-stone-500 truncate">{report.clientName}</div>}
                  </div>
                  <div className="text-sm text-stone-600">
                    {report.interventionDate ? new Date(report.interventionDate).toLocaleDateString('fr-FR') : '-'}
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      report.priority === 'high' || report.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      report.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {report.priority === 'high' ? 'Haute' : report.priority === 'urgent' ? 'Urgente' :
                       report.priority === 'medium' ? 'Moyenne' : 'Faible'}
                    </span>
                  </div>
                  <div>{getStatusBadge(report.status)}</div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleViewReport(report)}
                      title="Voir le détail"
                      className="p-1.5 text-sky-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {report.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleEditDraft(report)}
                          title="Modifier le brouillon"
                          className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSubmitDraft(report)}
                          disabled={submittingReportId === report._id}
                          title="Soumettre pour validation"
                          className="p-1.5 text-emerald-700 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vue cartes (mobile) */}
          <div className="md:hidden space-y-3">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-stone-900">{report.site}</div>
                    {report.clientName && <div className="text-sm text-stone-500">{report.clientName}</div>}
                  </div>
                  {getStatusBadge(report.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-stone-600">
                  <span>{report.interventionDate ? new Date(report.interventionDate).toLocaleDateString('fr-FR') : '-'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    report.priority === 'high' || report.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    report.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {report.priority === 'high' ? 'Haute' : report.priority === 'urgent' ? 'Urgente' :
                     report.priority === 'medium' ? 'Moyenne' : 'Faible'}
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="flex-1 py-2 text-sm rounded-lg border border-stone-200 text-sky-600 hover:bg-blue-50"
                  >
                    Voir
                  </button>
                  {report.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleEditDraft(report)}
                        className="flex-1 py-2 text-sm rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleSubmitDraft(report)}
                        disabled={submittingReportId === report._id}
                        className="flex-1 py-2 text-sm rounded-lg bg-emerald-800 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Soumettre
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  const renderClientDirectory = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Clients assignables</h2>
          <p className="text-sm text-stone-600">Synchronisés depuis l’interface admin. Utilisez ces fiches pour planifier vos interventions ou contacter vos référents.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadClientDirectory}
            className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm"
          >
            Rafraîchir
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 text-sm"
          >
            Retour tableau
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-stone-900">{client.company || client.name}</div>
                <div className="text-xs text-stone-500">ID: {client.clientId}</div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${client.activeContracts.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600'}`}>
                {client.activeContracts.length > 0 ? `${client.activeContracts.length} contrat(s)` : 'Sans contrat'}
              </span>
            </div>

            {client.contactPerson && (
              <div className="flex items-center text-sm text-stone-600">
                <User className="h-4 w-4 mr-2 text-stone-400" />
                {client.contactPerson}
              </div>
            )}

            <div className="flex items-center text-sm text-stone-600">
              <Phone className="h-4 w-4 mr-2 text-stone-400" />
              <a href={`tel:${client.phone}`} className="hover:text-emerald-600">{client.phone}</a>
            </div>
            <div className="flex items-center text-sm text-stone-600">
              <Mail className="h-4 w-4 mr-2 text-stone-400" />
              <a href={`mailto:${client.email}`} className="hover:text-emerald-600">{client.email}</a>
            </div>

            {client.address && (
              <div className="text-sm text-stone-500">
                <Navigation className="h-4 w-4 inline text-stone-400 mr-2" />
                {client.address}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handlePlanFromClient(client)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Planifier
              </button>
              <a
                href={`tel:${client.phone}`}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-center"
              >
                Contacter
              </a>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8 text-center text-stone-500">
          Aucun client disponible actuellement. Ajoutez des clients côté admin ou rafraîchissez plus tard.
        </div>
      )}
    </div>
  )

  const renderReportDetail = () => {
    if (!selectedReport) return null
    const r = selectedReport
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">{r.kind === 'intervention' ? 'Détail de l\'intervention' : 'Détail du rapport'}</h2>
            <p className="text-sm text-stone-500 mt-1">{r.id}</p>
          </div>
          <div className="flex gap-2">
            {r.status === 'draft' && (
              <>
                <button
                  onClick={() => handleEditDraft(r)}
                  className="px-4 py-2 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleSubmitDraft(r)}
                  disabled={submittingReportId === r._id}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white hover:bg-green-700 text-sm disabled:opacity-50"
                >
                  Soumettre
                </button>
              </>
            )}
            <button
              onClick={() => { setSelectedReport(null); setCurrentView('reports') }}
              className="text-stone-600 hover:text-stone-800 flex items-center space-x-1 text-sm"
            >
              <span>← Retour</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-200">
          {/* En-tête */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">{r.site}</h3>
              {r.clientName && <p className="text-sm text-stone-500">{r.clientName}</p>}
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(r.status)}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                r.priority === 'high' || r.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                r.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {r.priority === 'high' ? 'Haute' : r.priority === 'urgent' ? 'Urgente' :
                 r.priority === 'medium' ? 'Moyenne' : 'Faible'}
              </span>
            </div>
          </div>

          {/* Infos intervention */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs font-medium text-stone-500 uppercase mb-1">Date</div>
              <div className="text-sm text-stone-900">
                {r.interventionDate ? new Date(r.interventionDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '–'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-stone-500 uppercase mb-1">Horaires</div>
              <div className="text-sm text-stone-900">{r.startTime || '–'} → {r.endTime || '–'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-stone-500 uppercase mb-1">Durée</div>
              <div className="text-sm text-stone-900">{r.estimatedDuration || '–'}</div>
            </div>
          </div>

          {/* Observations */}
          {r.initialObservations && (
            <div className="p-6">
              <div className="text-xs font-medium text-stone-500 uppercase mb-2">Observations initiales</div>
              <p className="text-sm text-stone-800 whitespace-pre-wrap">{r.initialObservations}</p>
            </div>
          )}

          {/* Description problème */}
          {r.problemDescription && (
            <div className="p-6">
              <div className="text-xs font-medium text-stone-500 uppercase mb-2">Description du problème</div>
              <p className="text-sm text-stone-800 whitespace-pre-wrap">{r.problemDescription}</p>
            </div>
          )}

          {/* Tâches réalisées */}
          {r.tasksPerformed && r.tasksPerformed.length > 0 && r.tasksPerformed.some((t: string) => t.trim()) && (
            <div className="p-6">
              <div className="text-xs font-medium text-stone-500 uppercase mb-2">Tâches réalisées</div>
              <ul className="space-y-1">
                {r.tasksPerformed.filter((t: string) => t.trim()).map((task: string, i: number) => (
                  <li key={i} className="flex items-center text-sm text-stone-800">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Résultats */}
          {r.results && (
            <div className="p-6">
              <div className="text-xs font-medium text-stone-500 uppercase mb-2">Résultats</div>
              <p className="text-sm text-stone-800 whitespace-pre-wrap">{r.results}</p>
            </div>
          )}

          {/* Recommandations */}
          {r.recommendations && r.recommendations.length > 0 && r.recommendations.some((rec: string) => rec.trim()) && (
            <div className="p-6">
              <div className="text-xs font-medium text-stone-500 uppercase mb-2">Recommandations</div>
              <ul className="space-y-1">
                {r.recommendations.filter((rec: string) => rec.trim()).map((rec: string, i: number) => (
                  <li key={i} className="flex items-start text-sm text-stone-800">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderEditReport = () => {
    if (!selectedReport) return null
    const raw = selectedReport.raw || selectedReport
    const clientId = raw.clientId?._id || raw.clientId
    const projectId = raw.projectId?._id || raw.projectId
    const existing: any = {
      site: raw.site || '',
      clientName: raw.clientName || raw.clientId?.name || '',
      clientContact: raw.clientContact || '',
      clientId,
      projectId,
      interventionDate: raw.interventionDate ? new Date(raw.interventionDate).toISOString().split('T')[0] : '',
      startTime: raw.startTime || '',
      endTime: raw.endTime || '',
      duration: raw.duration ? String(raw.duration) : '',
      technician: raw.technician || '',
      technicianId: raw.technicianId || '',
      initialObservations: raw.initialObservations || '',
      problemDescription: raw.problemDescription || '',
      problemSeverity: raw.problemSeverity || 'medium',
      tasksPerformed: raw.tasksPerformed?.length ? raw.tasksPerformed : [''],
      results: raw.results || '',
      recommendations: raw.recommendations?.length ? raw.recommendations : [''],
      status: raw.status || 'draft',
      reportId: raw.reportId || raw._id || ''
    }
    const interventionId = raw.interventionId?._id || raw.interventionId || (raw.typeIntervention ? raw._id : undefined)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900">Modifier le brouillon</h2>
          <button
            onClick={() => { setSelectedReport(null); setCurrentView('reports') }}
            className="text-stone-600 hover:text-stone-800 flex items-center space-x-1 text-sm"
          >
            <span>← Retour</span>
          </button>
        </div>

        <EnhancedMaintenanceForm
          projectId={projectId}
          clientId={clientId}
          interventionId={interventionId}
          existingReportId={raw._id}
          existingReport={existing}
          onSave={handleSaveReport}
          onSubmit={handleSubmitReport}
        />
      </div>
    )
  }

  const renderCreateReport = () => {
    const prefill: any = {}
    const projectId = prefillClient?.activeContracts?.[0]?.projectId
    const clientId = prefillClient?.id
    if (prefillClient) {
      prefill.site = prefillClient.address || prefillClient.company || prefillClient.name || ''
      prefill.clientName = prefillClient.company || prefillClient.name || ''
      prefill.clientContact = prefillClient.contactPerson || ''
      prefill.clientId = clientId
      prefill.projectId = projectId
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900">Nouveau Rapport de Maintenance</h2>
          <button
            onClick={() => { setPrefillClient(null); setCurrentView('dashboard') }}
            className="text-stone-600 hover:text-stone-800 flex items-center space-x-2"
          >
            ← Retour au tableau de bord
          </button>
        </div>

        <EnhancedMaintenanceForm
          projectId={projectId}
          clientId={clientId}
          existingReport={Object.keys(prefill).length > 0 ? prefill : undefined}
          onSave={handleSaveReport}
          onSubmit={handleSubmitReport}
          clients={clients}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* En-tête premium */}
      <header className="bg-emerald-950 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">Portail Technicien</h1>
                <p className="text-xs text-emerald-300/80">Bienvenue, {session.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Vue terrain */}
              <a href="/tech-interface/terrain"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/15 px-3.5 py-1.5 text-xs font-semibold transition-colors">
                <Target className="h-3.5 w-3.5 text-emerald-300" /> Terrain
              </a>

              {/* Statut de connexion */}
              <div className="flex items-center space-x-1.5">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <span className={`hidden sm:inline text-xs font-medium ${isOnline ? 'text-emerald-300' : 'text-red-300'}`}>
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>

              {/* Notifications protégées */}
              <NotificationCenter />

              {/* Localisation */}
              {currentLocation && (
                <div className="hidden md:flex items-center space-x-1.5 text-xs text-emerald-200/80">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>GPS actif</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 text-emerald-100/80 hover:text-white px-2.5 py-2 rounded-lg hover:bg-white/10 text-xs font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
              {[
                { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
                { id: 'marketplace', label: 'Marketplace', icon: Briefcase },
                { id: 'reports', label: 'Rapports', icon: FileText },
                { id: 'clients', label: 'Clients', icon: Building2 },
                { id: 'create-report', label: 'Nouveau rapport', icon: Plus }
              ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    currentView === item.id
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!isOnline && (
            <SoftMessage
              variant="warning"
              title="Mode hors ligne"
              message="Certaines actions (soumission, synchronisation) peuvent échouer tant que la connexion n'est pas rétablie."
              className="mb-5"
            />
          )}

          {uiNotice && (
            <SoftMessage
              variant={uiNotice.variant}
              title={uiNotice.title}
              message={uiNotice.message}
              className="mb-5"
              onClose={() => setUiNotice(null)}
            />
          )}

          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'marketplace' && <TechnicianMarketplace technicianId={session?.id} />}
          {currentView === 'reports' && renderReports()}
          {currentView === 'clients' && renderClientDirectory()}
          {currentView === 'create-report' && renderCreateReport()}
          {currentView === 'view-report' && renderReportDetail()}
          {currentView === 'edit-report' && renderEditReport()}
        </main>

      <ModernModal
        isOpen={!!draftToSubmit}
        onClose={() => setDraftToSubmit(null)}
        title="Confirmer la soumission"
        subtitle="Le brouillon sera envoyé pour validation"
        icon={<AlertTriangle className="h-5 w-5 text-white" />}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Voulez-vous soumettre ce brouillon maintenant ? Vous pourrez encore le consulter ensuite depuis vos rapports.
          </p>
          <ModalActions>
            <ModalSecondaryButton
              onClick={() => setDraftToSubmit(null)}
              disabled={!!submittingReportId}
            >
              Annuler
            </ModalSecondaryButton>
            <ModalPrimaryButton
              onClick={confirmSubmitDraft}
              loading={!!submittingReportId}
              icon={<Send className="h-4 w-4" />}
            >
              Soumettre
            </ModalPrimaryButton>
          </ModalActions>
        </div>
      </ModernModal>
    </div>
  )
}
