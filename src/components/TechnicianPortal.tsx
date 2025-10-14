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
  WifiOff
} from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import AuthPortal from './AuthPortal'
import EnhancedMaintenanceForm from './EnhancedMaintenanceForm'

interface TechnicianSession {
  id: string
  name: string
  role: string
  loginTime: Date
  isAuthenticated: boolean
}

interface TechnicianPortalProps {
  initialSession?: TechnicianSession | null
}

export default function TechnicianPortal({ initialSession = null }: TechnicianPortalProps) {
  const router = useRouter()
  const [session, setSession] = useState<TechnicianSession | null>(initialSession)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports' | 'create-report' | 'profile'>('dashboard')
  const [isOnline, setIsOnline] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [stats, setStats] = useState({
    todayReports: 0,
    pendingReports: 0,
    completedToday: 0,
    avgResponseTime: '2h 30min',
    weekHours: 0,
    clientSatisfaction: 0,
    slaOnTime: 0
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
          else router.replace('/client-portal')
          return
        }
        if (cancelled) return
        const newSession: TechnicianSession = {
          id: data.user.id,
          name: data.user.email || 'Technicien',
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
    // Simulation de chargement des données
    try {
      setReports([
        {
          id: 'RPT-001',
          site: 'Résidence Almadies',
          status: 'pending',
          priority: 'high',
          scheduledTime: '09:00',
          estimatedDuration: '2h'
        },
        {
          id: 'RPT-002',
          site: 'Immeuble Plateau',
          status: 'in_progress',
          priority: 'medium',
          scheduledTime: '14:00',
          estimatedDuration: '1h 30min'
        }
      ])

      setStats({
        todayReports: 3,
        pendingReports: 2,
        completedToday: 1,
        avgResponseTime: '2h 15min',
        weekHours: 18,
        clientSatisfaction: 4.7,
        slaOnTime: 92
      })
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
  }

  const handleSaveReport = (data: any) => {
    console.log('Sauvegarde rapport:', data)
    // Ici vous pourriez sauvegarder en local ou synchroniser
  }

  const handleSubmitReport = (data: any) => {
    console.log('Envoi rapport:', data)
    setCurrentView('dashboard')
    // Actualiser les stats
    setStats(prev => ({
      ...prev,
      completedToday: prev.completedToday + 1,
      pendingReports: Math.max(0, prev.pendingReports - 1)
    }))
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          
          <button className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg transition-colors flex items-center space-x-3">
            <MapPin className="h-6 w-6" />
            <span>Navigation</span>
          </button>
        </div>
      </div>

      {/* Interventions du jour */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Interventions programmées</h2>
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  report.status === 'pending' ? 'bg-orange-500' :
                  report.status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
                <div>
                  <div className="font-medium text-gray-900">{report.site}</div>
                  <div className="text-sm text-gray-600">
                    {report.scheduledTime} • {report.estimatedDuration}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.priority === 'high' ? 'bg-red-100 text-red-800' :
                  report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {report.priority === 'high' ? 'Urgent' : 
                   report.priority === 'medium' ? 'Normal' : 'Faible'}
                </span>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Mes Rapports</h2>
        <button
          onClick={() => setCurrentView('create-report')}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nouveau rapport</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700">
            <div>Rapport</div>
            <div>Site</div>
            <div>Statut</div>
            <div>Actions</div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {reports.map((report) => (
            <div key={report.id} className="p-4 grid grid-cols-4 gap-4 items-center">
              <div className="font-medium text-gray-900">{report.id}</div>
              <div className="text-gray-600">{report.site}</div>
              <div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                  report.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {report.status === 'pending' ? 'En attente' :
                   report.status === 'in_progress' ? 'En cours' : 'Terminé'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="p-1 text-green-600 hover:bg-green-100 rounded">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
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
              { id: 'reports', label: 'Rapports', icon: FileText },
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
        {currentView === 'reports' && renderReports()}
        {currentView === 'create-report' && renderCreateReport()}
      </main>
    </div>
  )
}