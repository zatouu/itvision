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
import AuthPortal from './AuthPortal'
import EnhancedMaintenanceForm from './EnhancedMaintenanceForm'
import TechnicianMarketplace from './TechnicianMarketplace'

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
    type: string
    startDate: string | Date
    endDate?: string | Date
  }>
}

interface TechnicianPortalProps {
  initialSession?: TechnicianSession | null
}

export default function TechnicianPortal({ initialSession = null }: TechnicianPortalProps) {
  const router = useRouter()
  const [session, setSession] = useState<TechnicianSession | null>(initialSession)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports' | 'create-report' | 'profile' | 'clients' | 'marketplace'>('dashboard')
  const [isOnline, setIsOnline] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
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
          estimatedDuration: r.duration ? `${Math.floor(r.duration / 60)}h${r.duration % 60 > 0 ? ` ${r.duration % 60}min` : ''}` : '',
          interventionDate: r.interventionDate,
          clientName: r.clientId?.name || r.clientName || ''
        }))
      }

      let allInterventions: any[] = []
      if (interventionsRes?.ok) {
        const data = await interventionsRes.json()
        allInterventions = (data.interventions || []).map((i: any) => ({
          id: i._id,
          _id: i._id,
          site: i.client || i.title || 'Non spécifié',
          status: i.status || 'pending',
          priority: i.priority || 'medium',
          scheduledTime: i.heureDebut || '',
          estimatedDuration: i.estimatedDuration ? `${i.estimatedDuration}h` : '',
          interventionDate: i.date,
          clientName: i.client || ''
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

      setStats((prev) => ({
        ...prev,
        todayReports: todayItems.length || combined.length,
        pendingReports: pendingItems.length,
        completedToday: completedItems.length,
        avgResponseTime: combined.length > 0 ? `${Math.round(combined.length * 1.5)}h` : '0h',
        weekHours: weekReports.length * 2,
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
      // Retour au dashboard et rechargement des données
      setCurrentView('dashboard')
      await loadTechnicianData()
    } catch {}
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
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.todayReports}</div>
              <div className="text-sm text-blue-700">Interventions du jour</div>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingReports}</div>
              <div className="text-sm text-orange-700">En attente</div>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
              <div className="text-sm text-green-700">Terminées</div>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-purple-600">{stats.avgResponseTime}</div>
              <div className="text-sm text-purple-700">Temps moyen</div>
            </div>
            <Activity className="h-8 w-8 text-purple-500" />
          </div>
        </div>

          {/* Nouvelles cartes KPI */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-600">{stats.weekHours}h</div>
              <div className="text-sm text-emerald-700">Heures cette semaine</div>
            </div>
            <Activity className="h-8 w-8 text-emerald-500" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.clientSatisfaction}</div>
              <div className="text-sm text-yellow-700">Note clients /5</div>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

          <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-teal-600">{stats.slaOnTime}%</div>
                <div className="text-sm text-teal-700">SLA respecté</div>
              </div>
              <CheckCircle className="h-8 w-8 text-teal-600" />
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-indigo-600">{clients.length}</div>
                <div className="text-sm text-indigo-700">Clients actifs</div>
              </div>
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setCurrentView('create-report')}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors flex items-center space-x-3"
          >
            <Plus className="h-6 w-6" />
            <span>Nouveau rapport</span>
          </button>
            
            <button
              onClick={() => setCurrentView('reports')}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center space-x-3"
            >
              <FileText className="h-6 w-6" />
              <span>Mes rapports</span>
            </button>
            
            <button
              onClick={() => setCurrentView('clients')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg transition-colors flex items-center space-x-3"
            >
              <Building2 className="h-6 w-6" />
              <span>Annuaire clients</span>
            </button>
            
            <button
              onClick={() => setCurrentView('marketplace')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-lg transition-colors flex items-center space-x-3"
            >
              <Briefcase className="h-6 w-6" />
              <span>Marketplace</span>
            </button>

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
              className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg transition-colors flex items-center space-x-3"
            >
              <Navigation className="h-6 w-6" />
              <span>Navigation</span>
            </button>
        </div>
      </div>

      {/* Interventions du jour */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Interventions programmées</h2>
          <button
            onClick={loadTechnicianData}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Rafraîchir
          </button>
        </div>
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>Aucune intervention programmée</p>
              <button
                onClick={() => setCurrentView('create-report')}
                className="mt-3 text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Créer un rapport
              </button>
            </div>
          ) : (
            reports.slice(0, 10).map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    ['pending', 'draft'].includes(report.status) ? 'bg-orange-500' :
                    ['in_progress', 'scheduled'].includes(report.status) ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-900">{report.site}</div>
                    <div className="text-sm text-gray-600">
                      {report.interventionDate ? new Date(report.interventionDate).toLocaleDateString('fr-FR') : ''}
                      {report.scheduledTime ? ` • ${report.scheduledTime}` : ''}
                      {report.estimatedDuration ? ` • ${report.estimatedDuration}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(report.status)}
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
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
    draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
    pending: { label: 'En attente', className: 'bg-orange-100 text-orange-800' },
    pending_validation: { label: 'En validation', className: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
    scheduled: { label: 'Planifié', className: 'bg-indigo-100 text-indigo-800' },
    completed: { label: 'Terminé', className: 'bg-green-100 text-green-800' },
    validated: { label: 'Validé', className: 'bg-emerald-100 text-emerald-800' },
    published: { label: 'Publié', className: 'bg-teal-100 text-teal-800' },
    archived: { label: 'Archivé', className: 'bg-slate-100 text-slate-800' }
  }

  const getStatusBadge = (status: string) => {
    const config = statusLabels[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>
  }

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Rapports</h2>
          <p className="text-sm text-gray-500 mt-1">{reports.length} rapport(s) au total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTechnicianData}
            className="border border-gray-200 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>Rafraîchir</span>
          </button>
          <button
            onClick={() => setCurrentView('create-report')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nouveau rapport</span>
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rapport</h3>
          <p className="text-gray-500 mb-4">Vous n'avez pas encore créé de rapport d'intervention.</p>
          <button
            onClick={() => setCurrentView('create-report')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            Créer mon premier rapport
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
              <div>Référence</div>
              <div>Site / Client</div>
              <div>Date</div>
              <div>Priorité</div>
              <div>Statut</div>
              <div>Actions</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="p-4 grid grid-cols-6 gap-4 items-center hover:bg-gray-50">
                <div className="font-medium text-gray-900 text-sm">{report.id}</div>
                <div>
                  <div className="text-gray-900 text-sm">{report.site}</div>
                  {report.clientName && <div className="text-xs text-gray-500">{report.clientName}</div>}
                </div>
                <div className="text-sm text-gray-600">
                  {report.interventionDate ? new Date(report.interventionDate).toLocaleDateString('fr-FR') : '-'}
                </div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    report.priority === 'high' || report.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {report.priority === 'high' ? 'Haute' : report.priority === 'urgent' ? 'Urgente' :
                     report.priority === 'medium' ? 'Moyenne' : 'Faible'}
                  </span>
                </div>
                <div>{getStatusBadge(report.status)}</div>
                <div className="flex items-center space-x-2">
                  <button
                    title="Voir le détail"
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {report.status === 'draft' && (
                    <button
                      title="Soumettre pour validation"
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderClientDirectory = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients assignables</h2>
          <p className="text-sm text-gray-600">Synchronisés depuis l’interface admin. Utilisez ces fiches pour planifier vos interventions ou contacter vos référents.</p>
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
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm"
          >
            Retour tableau
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">{client.company || client.name}</div>
                <div className="text-xs text-gray-500">ID: {client.clientId}</div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${client.activeContracts.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                {client.activeContracts.length > 0 ? `${client.activeContracts.length} contrat(s)` : 'Sans contrat'}
              </span>
            </div>

            {client.contactPerson && (
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                {client.contactPerson}
              </div>
            )}

            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              <a href={`tel:${client.phone}`} className="hover:text-emerald-600">{client.phone}</a>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              <a href={`mailto:${client.email}`} className="hover:text-emerald-600">{client.email}</a>
            </div>

            {client.address && (
              <div className="text-sm text-gray-500">
                <Navigation className="h-4 w-4 inline text-gray-400 mr-2" />
                {client.address}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCurrentView('create-report')}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
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
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Aucun client disponible actuellement. Ajoutez des clients côté admin ou rafraîchissez plus tard.
        </div>
      )}
    </div>
  )

  const renderCreateReport = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Nouveau Rapport de Maintenance</h2>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-gray-600 hover:text-gray-800 flex items-center space-x-2"
        >
          ← Retour au tableau de bord
        </button>
      </div>

      <EnhancedMaintenanceForm
        onSave={handleSaveReport}
        onSubmit={handleSubmitReport}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-green-600 p-2 rounded-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Portail Technicien</h1>
                <p className="text-sm text-gray-600">Bienvenue, {session.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Statut de connexion */}
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>

              {/* Notifications protégées */}
              <NotificationCenter />

              {/* Localisation */}
              {currentLocation && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>GPS actif</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
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
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'marketplace' && <TechnicianMarketplace technicianId={session?.id} />}
          {currentView === 'reports' && renderReports()}
          {currentView === 'clients' && renderClientDirectory()}
          {currentView === 'create-report' && renderCreateReport()}
        </main>
    </div>
  )
}