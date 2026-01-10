'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, FolderKanban, FileText, Wrench, Receipt, 
  MessageCircle, Settings, User, Bell, Search, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2,
  AlertCircle, Calendar, MapPin, Phone, Mail, Building2,
  Download, Eye, ExternalLink, Plus, Filter, X, Star,
  Activity, BarChart3, Package, Shield, Zap, Award,
  FileCheck, FileX, FileClock, Target, Briefcase, Users,
  Send, Paperclip, Edit2, Save, Lock, Loader2, Wifi, WifiOff
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import ProjectDetailModal from './ProjectDetailModal'
import TicketChatModal from './TicketChatModal'
import { generateQuotePDF } from '@/lib/pdf-client'
import { ProgressBarChart, InvestmentLineChart, DonutChart } from './SimpleCharts'
import { 
  initSocket, 
  disconnectSocket, 
  joinProject,
  leaveProject,
  onProjectUpdate, 
  onTicketUpdate, 
  onNewMessage,
  onNotification,
  isConnected 
} from '@/lib/socket-client'

interface Project {
  _id: string
  name: string
  description?: string
  status: string
  progress: number
  startDate: string
  endDate?: string
  budget?: number
  address: string
  currentPhase?: string
  serviceType?: string
  milestones?: any[]
  documents?: any[]
}

interface Quote {
  _id: string
  numero: string
  date: string
  status: string
  subtotal: number
  total: number
  products: any[]
  type?: string
  client?: any
  brsAmount?: number
}

interface Intervention {
  _id: string
  interventionNumber: string
  date: string
  heureDebut?: string
  heureFin?: string
  duree?: string
  site: string
  status: string
  activites?: any[]
  observations?: string
  recommandations?: any[]
  photosAvant?: string[]
  photosApres?: string[]
  quoteGenerated?: boolean
  technicien?: any
  project?: any
}

interface Document {
  _id: string
  name: string
  type: string
  url?: string
  size?: number
  uploadDate?: string
  date?: string
  status?: string
  amount?: number
  projectId?: string
  projectName?: string
  category: string
}

interface Ticket {
  _id: string
  ticketNumber: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  messages?: any[]
  createdAt: string
  updatedAt: string
}

interface DashboardData {
  kpis: {
    activeProjects: number
    completedProjects: number
    totalInvestment: number
    avgProgress: number
    pendingQuotes: number
  }
  activeProjects: Project[]
  activities: any[]
}

interface Profile {
  _id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  role?: string
  preferences?: any
}

type TabType = 'dashboard' | 'projects' | 'quotes' | 'interventions' | 'maintenance' | 'group-buys' | 'documents' | 'support' | 'profile'

export default function ModernClientPortal() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [maintenanceContracts, setMaintenanceContracts] = useState<any[]>([])
  const [maintenanceVisits, setMaintenanceVisits] = useState<any[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [groupBuys, setGroupBuys] = useState<any[]>([])
  const [groupBuysLoading, setGroupBuysLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [projectFilter, setProjectFilter] = useState('all')
  const [quoteFilter, setQuoteFilter] = useState('all')
  const [documentFilter, setDocumentFilter] = useState('all')
  const [ticketFilter, setTicketFilter] = useState('all')
  const [groupBuyFilter, setGroupBuyFilter] = useState('all')

  // États pour les formulaires
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium'
  })
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    company: '',
    address: ''
  })
  const [saving, setSaving] = useState(false)
  const [visitsLoading, setVisitsLoading] = useState(false)

  // Modal états
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isTicketChatOpen, setIsTicketChatOpen] = useState(false)
  
  // Modals de demande
  const [isProjectRequestOpen, setIsProjectRequestOpen] = useState(false)
  const [isInterventionRequestOpen, setIsInterventionRequestOpen] = useState(false)
  const [isQuoteRequestOpen, setIsQuoteRequestOpen] = useState(false)
  
  // Formulaires de demande
  const [projectRequest, setProjectRequest] = useState({
    name: '',
    serviceType: 'surveillance',
    description: '',
    estimatedBudget: '',
    address: '',
    preferredStartDate: '',
    urgency: 'normal'
  })
  
  const [interventionRequest, setInterventionRequest] = useState({
    type: 'scheduled',
    title: '',
    description: '',
    site: '',
    preferredDate: '',
    projectId: ''
  })
  
  const [quoteRequest, setQuoteRequest] = useState({
    title: '',
    description: '',
    category: 'equipment',
    estimatedBudget: '',
    deadline: '',
    items: [] as Array<{name: string, quantity: number, specifications: string}>
  })
  
  // Socket.io
  const [socketConnected, setSocketConnected] = useState(false)
  const [liveUpdates, setLiveUpdates] = useState(0)
  const socketInitialized = useRef(false)

  useEffect(() => {
    fetchProfile()
    if (activeTab === 'dashboard') {
      fetchDashboard()
    }
  }, [])

  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboard()
        break
      case 'projects':
        fetchProjects()
        break
      case 'quotes':
        fetchQuotes()
        break
      case 'interventions':
        fetchInterventions()
        break
      case 'maintenance':
        fetchMaintenanceContracts()
        fetchMaintenanceVisits()
        break
      case 'group-buys':
        fetchGroupBuys()
        break
      case 'documents':
        fetchDocuments()
        break
      case 'support':
        fetchTickets()
        break
      case 'profile':
        fetchProfile()
        break
    }
  }, [activeTab])

  // 🔌 Initialiser Socket.io
  useEffect(() => {
    if (socketInitialized.current) return
    socketInitialized.current = true

    const token = localStorage.getItem('auth-token')
    if (!token) {
      console.warn('⚠️ Pas de token, Socket.io non initialisé')
      return
    }

    try {
      const socket = initSocket(token)
      
      socket.on('connect', () => {
        console.log('✅ Socket.io connecté:', socket.id)
        setSocketConnected(true)
        toast.success('Connexion temps réel établie', { 
          icon: '🔌',
          duration: 2000
        })
      })

      socket.on('disconnect', () => {
        console.log('❌ Socket.io déconnecté')
        setSocketConnected(false)
        toast.error('Connexion temps réel perdue', {
          icon: '🔌',
          duration: 2000
        })
      })

      socket.on('reconnect', () => {
        console.log('🔄 Socket.io reconnecté')
        setSocketConnected(true)
        toast.success('Reconnexion réussie', {
          icon: '🔄',
          duration: 2000
        })
        // Recharger les données
        if (activeTab === 'dashboard') fetchDashboard()
      })

      // 📡 Écouter les mises à jour de projet
      const cleanupProjectUpdate = onProjectUpdate((data) => {
        console.log('📡 Projet mis à jour:', data)
        setLiveUpdates(prev => prev + 1)
        
        toast.success(`Projet mis à jour - ${data.progress}%`, {
          icon: '📁',
          duration: 4000
        })

        // Rafraîchir les données si on est sur le bon onglet
        if (activeTab === 'dashboard') {
          fetchDashboard()
        } else if (activeTab === 'projects') {
          fetchProjects()
        }
      })

      // 🎫 Écouter les mises à jour de ticket
      const cleanupTicketUpdate = onTicketUpdate((data) => {
        console.log('🎫 Ticket mis à jour:', data)
        setLiveUpdates(prev => prev + 1)
        
        toast.success(`Ticket ${data.status}`, {
          icon: '🎫',
          duration: 3000
        })

        if (activeTab === 'support') {
          fetchTickets()
        }
      })

      // 💬 Écouter les nouveaux messages
      const cleanupNewMessage = onNewMessage((data) => {
        console.log('💬 Nouveau message:', data)
        setLiveUpdates(prev => prev + 1)
        
        toast.success(`Nouveau message de ${data.authorEmail}`, {
          icon: '💬',
          duration: 4000
        })

        if (activeTab === 'support') {
          fetchTickets()
        }
      })

      // 🔔 Écouter les notifications
      const cleanupNotification = onNotification((data) => {
        console.log('🔔 Notification:', data)
        setLiveUpdates(prev => prev + 1)
        
        const toastTypes = {
          success: toast.success,
          error: toast.error,
          warning: toast,
          info: toast
        }
        
        toastTypes[data.type](`${data.title}: ${data.message}`, {
          icon: data.type === 'success' ? '✅' : data.type === 'error' ? '❌' : data.type === 'warning' ? '⚠️' : 'ℹ️',
          duration: 5000
        })
      })

      return () => {
        cleanupProjectUpdate()
        cleanupTicketUpdate()
        cleanupNewMessage()
        cleanupNotification()
        disconnectSocket()
      }
    } catch (error) {
      console.error('❌ Erreur initialisation Socket.io:', error)
      toast.error('Erreur connexion temps réel')
    }
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/client/profile')
      const data = await res.json()
      if (data.success) {
        setProfile(data.profile)
        setProfileForm({
          name: data.profile.name || '',
          phone: data.profile.phone || '',
          company: data.profile.company || '',
          address: data.profile.address || ''
        })
      }
    } catch (err) {
      console.error('Erreur profil:', err)
    }
  }

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/client/dashboard')
      const data = await res.json()
      if (data.success) {
        setDashboardData(data.data)
      } else {
        setError(data.error || 'Erreur de chargement')
      }
    } catch (err) {
      console.error('Erreur dashboard:', err)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const url = projectFilter === 'all' 
        ? '/api/client/projects'
        : `/api/client/projects?status=${projectFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setProjects(data.projects)
      }
    } catch (err) {
      console.error('Erreur projets:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const url = quoteFilter === 'all'
        ? '/api/client/quotes'
        : `/api/client/quotes?status=${quoteFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setQuotes(data.quotes)
      }
    } catch (err) {
      console.error('Erreur devis:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchInterventions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client/interventions')
      const data = await res.json()
      if (data.success) {
        setInterventions(data.interventions)
      }
    } catch (err) {
      console.error('Erreur interventions:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaintenanceContracts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client/maintenance')
      const data = await res.json()
      if (data.success) {
        setMaintenanceContracts(data.contracts)
      }
    } catch (err) {
      console.error('Erreur contrats maintenance:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaintenanceVisits = async () => {
    setVisitsLoading(true)
    try {
      const res = await fetch('/api/client/visits')
      const data = await res.json()
      if (data.success) {
        setMaintenanceVisits(Array.isArray(data.visits) ? data.visits : [])
      }
    } catch (err) {
      console.error('Erreur visites maintenance:', err)
    } finally {
      setVisitsLoading(false)
    }
  }

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const url = documentFilter === 'all'
        ? '/api/client/documents'
        : `/api/client/documents?type=${documentFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setDocuments(data.documents)
      }
    } catch (err) {
      console.error('Erreur documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const url = ticketFilter === 'all'
        ? '/api/client/tickets'
        : `/api/client/tickets?status=${ticketFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setTickets(data.tickets)
      }
    } catch (err) {
      console.error('Erreur tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupBuys = async () => {
    setGroupBuysLoading(true)
    try {
      const token = localStorage.getItem('auth-token')
      const res = await fetch('/api/client/group-buys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.success) {
        setGroupBuys(data.groupBuys || [])
      }
    } catch (err) {
      console.error('Erreur achats groupés:', err)
    } finally {
      setGroupBuysLoading(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/client/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Ticket créé avec succès')
        setNewTicket({ title: '', description: '', category: 'general', priority: 'medium' })
        fetchTickets()
      } else {
        toast.error(data.error || 'Erreur création ticket')
      }
    } catch (err) {
      console.error('Erreur création ticket:', err)
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/client/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Profil mis à jour')
        setProfile(data.profile)
        setEditingProfile(false)
      } else {
        toast.error(data.error || 'Erreur mise à jour')
      }
    } catch (err) {
      console.error('Erreur mise à jour profil:', err)
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleProjectRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/client/requests/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectRequest)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Demande de projet envoyée ! Un administrateur vous contactera bientôt.')
        setIsProjectRequestOpen(false)
        setProjectRequest({
          name: '',
          serviceType: 'surveillance',
          description: '',
          estimatedBudget: '',
          address: '',
          preferredStartDate: '',
          urgency: 'normal'
        })
        fetchProjects()
      } else {
        toast.error(data.error || 'Erreur envoi demande')
      }
    } catch (err) {
      console.error('Erreur demande projet:', err)
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleInterventionRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/client/requests/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interventionRequest)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Demande d\'intervention envoyée ! Un technicien vous contactera bientôt.')
        setIsInterventionRequestOpen(false)
        setInterventionRequest({
          type: 'scheduled',
          title: '',
          description: '',
          site: '',
          preferredDate: '',
          projectId: ''
        })
        fetchTickets()
      } else {
        toast.error(data.error || 'Erreur envoi demande')
      }
    } catch (err) {
      console.error('Erreur demande intervention:', err)
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/client/requests/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteRequest)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Demande de devis envoyée ! Notre équipe commerciale vous contactera bientôt.')
        setIsQuoteRequestOpen(false)
        setQuoteRequest({
          title: '',
          description: '',
          category: 'equipment',
          estimatedBudget: '',
          deadline: '',
          items: []
        })
        fetchTickets()
      } else {
        toast.error(data.error || 'Erreur envoi demande')
      }
    } catch (err) {
      console.error('Erreur demande devis:', err)
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'planning':
        return 'bg-yellow-100 text-yellow-700'
      case 'on_hold':
        return 'bg-gray-100 text-gray-700'
      case 'pending':
        return 'bg-orange-100 text-orange-700'
      case 'approved':
        return 'bg-emerald-100 text-emerald-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700'
      case 'high':
        return 'bg-orange-100 text-orange-700'
      case 'medium':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getVisitSourceLabel = (source?: string) => {
    switch (source) {
      case 'contract':
        return 'Contrat'
      case 'installation':
        return 'Installation'
      case 'marketplace':
        return 'Marketplace'
      default:
        return 'Intervention'
    }
  }

  const getVisitSourceBadge = (source?: string) => {
    switch (source) {
      case 'contract':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
      case 'installation':
        return 'bg-blue-50 text-blue-700 border border-blue-100'
      case 'marketplace':
        return 'bg-purple-50 text-purple-700 border border-purple-100'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  const getVisitStatusLabel = (status?: string) => {
    switch (status) {
      case 'open':
        return 'Ouverte'
      case 'assigned':
        return 'Assignée'
      case 'closed':
        return 'Clôturée'
      case 'scheduled':
        return 'Planifiée'
      default:
        return 'À confirmer'
    }
  }

  const getVisitStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-50 text-orange-700 border border-orange-100'
      case 'assigned':
        return 'bg-blue-50 text-blue-700 border border-blue-100'
      case 'closed':
        return 'bg-green-50 text-green-700 border border-green-100'
      case 'scheduled':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(amount) + ' FCFA'
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as TabType, label: 'Mes Projets', icon: FolderKanban },
    { id: 'quotes' as TabType, label: 'Devis', icon: Receipt },
    { id: 'interventions' as TabType, label: 'Interventions', icon: Wrench },
    { id: 'maintenance' as TabType, label: 'Maintenance', icon: Shield },
    { id: 'group-buys' as TabType, label: 'Achats Groupés', icon: Users },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'support' as TabType, label: 'Support', icon: MessageCircle },
    { id: 'profile' as TabType, label: 'Profil', icon: User }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                ITV
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">IT Vision</div>
                <div className="text-xs text-gray-500">Portail Client</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Badge connexion temps réel */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                {socketConnected ? (
                  <>
                    <div className="relative">
                      <Wifi className="h-4 w-4 text-emerald-500" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 hidden sm:inline">LIVE</span>
                    {liveUpdates > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                        {liveUpdates}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 hidden sm:inline">Hors ligne</span>
                  </>
                )}
              </div>

              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                <Bell className="h-5 w-5" />
                {dashboardData && dashboardData.kpis.pendingQuotes > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded-lg px-3 py-2 transition"
                onClick={() => setActiveTab('profile')}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                  {profile?.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-gray-900">{profile?.name || 'Client'}</div>
                  <div className="text-xs text-gray-500">{profile?.company || 'Entreprise'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-[1400px] mx-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700 mb-6">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && dashboardData && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
                      <p className="text-gray-600">Vue d'ensemble de vos projets et activités</p>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <FolderKanban className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{dashboardData.kpis.activeProjects}</div>
                        <div className="text-sm opacity-90">Projets Actifs</div>
                      </div>

                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <Target className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{dashboardData.kpis.avgProgress}%</div>
                        <div className="text-sm opacity-90">Progression Moyenne</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <DollarSign className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{(dashboardData.kpis.totalInvestment / 1000000).toFixed(1)}M</div>
                        <div className="text-sm opacity-90">Investissement Total</div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <CheckCircle2 className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{dashboardData.kpis.completedProjects}</div>
                        <div className="text-sm opacity-90">Projets Livrés</div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <Receipt className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{dashboardData.kpis.pendingQuotes}</div>
                        <div className="text-sm opacity-90">Devis en Attente</div>
                      </div>
                    </div>

                    {/* Actions Rapides */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setIsProjectRequestOpen(true)}
                        className="bg-white border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-xl p-6 text-left transition-all hover:shadow-lg group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 group-hover:scale-110 transition">
                            <Plus className="h-6 w-6" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Nouveau Projet</h3>
                        <p className="text-sm text-gray-600">Demandez un nouveau projet ou service</p>
                      </button>

                      <button
                        onClick={() => setIsInterventionRequestOpen(true)}
                        className="bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-xl p-6 text-left transition-all hover:shadow-lg group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-200 group-hover:scale-110 transition">
                            <Wrench className="h-6 w-6" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Demander une Intervention</h3>
                        <p className="text-sm text-gray-600">Support technique ou maintenance</p>
                      </button>

                      <button
                        onClick={() => setIsQuoteRequestOpen(true)}
                        className="bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 rounded-xl p-6 text-left transition-all hover:shadow-lg group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-200 group-hover:scale-110 transition">
                            <Receipt className="h-6 w-6" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Demander un Devis</h3>
                        <p className="text-sm text-gray-600">Obtenez une estimation personnalisée</p>
                      </button>
                    </div>

                    {/* Projets Actifs */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Projets en Cours</h2>
                      <div className="space-y-4">
                        {dashboardData.activeProjects.map(project => (
                          <div 
                            key={project._id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                            onClick={() => {
                              setSelectedProjectId(project._id)
                              setIsProjectModalOpen(true)
                            }}
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{project.name}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {project.address}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(project.startDate)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-emerald-600">{project.progress}%</div>
                                <div className="text-xs text-gray-500">{project.currentPhase}</div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Activités */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Activité Récente</h2>
                      <div className="space-y-4">
                        {dashboardData.activities.map((activity, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                activity.type === 'project' ? 'bg-blue-100 text-blue-600' :
                                activity.type === 'intervention' ? 'bg-green-100 text-green-600' :
                                activity.type === 'document' ? 'bg-purple-100 text-purple-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {activity.icon === 'folder' && <FolderKanban className="h-5 w-5" />}
                                {activity.icon === 'wrench' && <Wrench className="h-5 w-5" />}
                                {activity.icon === 'file' && <FileText className="h-5 w-5" />}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                              <p className="text-sm text-gray-600">{activity.description}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(activity.date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Projets</h1>
                        <p className="text-gray-600">Suivez l'avancement de vos projets</p>
                      </div>
                      <select 
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">Tous</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminés</option>
                        <option value="planning">Planifiés</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {projects.map(project => (
                        <div 
                          key={project._id}
                          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition cursor-pointer"
                          onClick={() => {
                            setSelectedProjectId(project._id)
                            setIsProjectModalOpen(true)
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                              {project.status}
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              {project.address}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              {formatDate(project.startDate)}
                            </div>
                            {project.budget && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(project.budget)}
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">Progression</span>
                              <span className="font-semibold text-emerald-600">{project.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quotes Tab */}
                {activeTab === 'quotes' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Devis</h1>
                        <p className="text-gray-600">Consultez vos devis et estimations</p>
                      </div>
                      <select 
                        value={quoteFilter}
                        onChange={(e) => setQuoteFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">Tous</option>
                        <option value="pending">En attente</option>
                        <option value="approved">Approuvés</option>
                        <option value="rejected">Refusés</option>
                      </select>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Numéro</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Statut</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Montant</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {quotes.map(quote => (
                            <tr key={quote._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm">{quote.numero}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(quote.date)}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                                  {quote.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-gray-900">
                                {formatCurrency(quote.total)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => generateQuotePDF(quote)}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Interventions Tab */}
                {activeTab === 'interventions' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">Interventions</h1>
                      <p className="text-gray-600">Historique des interventions techniques</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {interventions.map(intervention => (
                        <div key={intervention._id} className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">#{intervention.interventionNumber}</h3>
                              <p className="text-sm text-gray-600">{intervention.site}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(intervention.status)}`}>
                              {intervention.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Date</span>
                              <div className="font-semibold text-gray-900">{formatDate(intervention.date)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Durée</span>
                              <div className="font-semibold text-gray-900">{intervention.duree || '-'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Technicien</span>
                              <div className="font-semibold text-gray-900">{intervention.technicien?.name || '-'}</div>
                            </div>
                          </div>

                          {intervention.observations && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <div className="text-sm font-semibold text-gray-900 mb-2">Observations</div>
                              <p className="text-sm text-gray-600">{intervention.observations}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maintenance Tab */}
                {activeTab === 'maintenance' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contrats de Maintenance</h1>
                      <p className="text-gray-600">Gérez vos contrats et découvrez vos visites planifiées</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">Visites programmées</p>
                          <p className="text-sm text-gray-500">Synthèse des visites contractuelles, marketplaces et installations</p>
                        </div>
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                          {visitsLoading ? 'Chargement...' : `${maintenanceVisits.length} visite(s)`}
                        </span>
                      </div>
                      {visitsLoading ? (
                        <div className="flex items-center justify-center py-10 text-gray-500">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Chargement des visites...
                        </div>
                      ) : maintenanceVisits.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">Aucune visite programmée sur les 3 prochains mois.</p>
                          <p className="text-xs text-gray-500">Nous vous notifierons dès qu’une intervention sera planifiée.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {maintenanceVisits.slice(0, 8).map((visit) => (
                            <div key={visit.id} className="py-4 flex items-start gap-4">
                              <div className="w-36">
                                <p className="text-sm font-semibold text-gray-900">{formatDate(visit.date)}</p>
                                <p className="text-xs text-gray-500">{visit.site || 'Site à confirmer'}</p>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {visit.contractName || visit.clientName || 'Visite prévue'}
                                  </span>
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${getVisitSourceBadge(visit.source)}`}>
                                    {getVisitSourceLabel(visit.source)}
                                  </span>
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${getVisitStatusBadge(visit.status)}`}>
                                    {getVisitStatusLabel(visit.status)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {visit.isContractual ? 'Visite couverte par votre contrat' : 'Mission marketplace / installation'}
                                </p>
                                {visit.marketplace?.reason && (
                                  <p className="text-xs text-purple-600">
                                    Motif marketplace : {visit.marketplace.reason}
                                  </p>
                                )}
                                {Array.isArray(visit.preferredTechnicians) && visit.preferredTechnicians.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    Techniciens attitrés : {visit.preferredTechnicians.map((tech: any) => tech.name).join(', ')}
                                  </p>
                                )}
                              </div>
                              {visit.marketplace?.bidsCount ? (
                                <div className="text-right text-xs text-gray-500">
                                  <p>{visit.marketplace.bidsCount} offre(s)</p>
                                  {visit.marketplace.bestBidAmount ? (
                                    <p className="font-semibold text-gray-900">
                                      {new Intl.NumberFormat('fr-FR').format(visit.marketplace.bestBidAmount)} FCFA
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {maintenanceContracts.length === 0 ? (
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun contrat actif</h3>
                        <p className="text-gray-600 mb-6">Protégez vos installations avec un contrat de maintenance</p>
                        <button
                          onClick={() => setIsQuoteRequestOpen(true)}
                          className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition"
                        >
                          Demander un Devis Maintenance
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {maintenanceContracts.map(contract => (
                          <div key={contract._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition">
                            {/* Header */}
                            <div className={`p-6 ${
                              contract.status === 'active' ? 'bg-gradient-to-r from-emerald-50 to-green-50' :
                              contract.isExpired ? 'bg-red-50' :
                              contract.isNearExpiration ? 'bg-orange-50' :
                              'bg-gray-50'
                            }`}>
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-bold text-gray-900">{contract.name}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(contract.status)}`}>
                                      {contract.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">#{contract.contractNumber}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-emerald-600">
                                    {formatCurrency(contract.annualPrice)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {contract.paymentFrequency === 'monthly' ? 'par mois' : 
                                     contract.paymentFrequency === 'quarterly' ? 'par trimestre' : 
                                     'par an'}
                                  </div>
                                </div>
                              </div>

                              {/* Alert expiration */}
                              {contract.isNearExpiration && !contract.isExpired && (
                                <div className="flex items-center gap-2 p-3 bg-orange-100 border border-orange-200 rounded-lg text-orange-800 text-sm">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  <span>Expire dans <strong>{contract.daysUntilExpiration} jours</strong> - Pensez à renouveler</span>
                                </div>
                              )}
                              {contract.isExpired && (
                                <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-200 rounded-lg text-red-800 text-sm">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  <span><strong>Contrat expiré</strong> - Contactez-nous pour renouveler</span>
                                </div>
                              )}
                            </div>

                            {/* Body */}
                            <div className="p-6">
                              {/* Stats */}
                              <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                  <div className="text-2xl font-bold text-gray-900">
                                    {contract.interventionsRemaining}
                                  </div>
                                  <div className="text-xs text-gray-600">Interventions restantes</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                  <div className="text-2xl font-bold text-gray-900">
                                    {Math.round(contract.usageRate)}%
                                  </div>
                                  <div className="text-xs text-gray-600">Taux d'utilisation</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                  <div className="text-2xl font-bold text-gray-900">
                                    {contract.coverage.responseTime}
                                  </div>
                                  <div className="text-xs text-gray-600">Délai d'intervention</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                  <div className="text-sm font-bold text-gray-900">
                                    {contract.coverage.supportHours}
                                  </div>
                                  <div className="text-xs text-gray-600">Heures de support</div>
                                </div>
                              </div>

                              {/* Période */}
                              <div className="flex items-center justify-between mb-6">
                                <div>
                                  <div className="text-sm text-gray-600">Début</div>
                                  <div className="font-semibold text-gray-900">{formatDate(contract.startDate)}</div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                <div>
                                  <div className="text-sm text-gray-600">Fin</div>
                                  <div className="font-semibold text-gray-900">{formatDate(contract.endDate)}</div>
                                </div>
                              </div>

                              {/* Services inclus */}
                              {contract.services && contract.services.length > 0 && (
                                <div className="mb-6">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Services Inclus</h4>
                                  <div className="space-y-2">
                                    {contract.services.map((service: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                          <div>
                                            <div className="font-medium text-gray-900">{service.name}</div>
                                            <div className="text-xs text-gray-600">{service.frequency}</div>
                                          </div>
                                        </div>
                                        {service.nextScheduled && (
                                          <div className="text-xs text-gray-600">
                                            Prochain : {formatDate(service.nextScheduled)}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Équipements couverts */}
                              {contract.equipment && contract.equipment.length > 0 && (
                                <div className="mb-6">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Équipements Couverts</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    {contract.equipment.map((eq: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <Package className="h-4 w-4 text-gray-600" />
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">{eq.type}</div>
                                          <div className="text-xs text-gray-600">{eq.quantity} unité(s) - {eq.location}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Interventions récentes */}
                              {contract.recentInterventions && contract.recentInterventions.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Interventions Récentes</h4>
                                  <div className="space-y-2">
                                    {contract.recentInterventions.slice(0, 3).map((int: any) => (
                                      <div key={int._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <Wrench className="h-4 w-4 text-blue-600" />
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">{int.typeIntervention}</div>
                                            <div className="text-xs text-gray-600">{formatDate(int.date)}</div>
                                          </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(int.status)}`}>
                                          {int.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
                        <p className="text-gray-600">Tous vos documents en un seul endroit</p>
                      </div>
                      <select 
                        value={documentFilter}
                        onChange={(e) => setDocumentFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">Tous</option>
                        <option value="quote">Devis</option>
                        <option value="project">Projets</option>
                        <option value="invoice">Factures</option>
                        <option value="contract">Contrats</option>
                      </select>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nom</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {documents.map(doc => (
                            <tr key={doc._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                  <span className="font-medium text-gray-900">{doc.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                                  {doc.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(doc.date || doc.uploadDate || '')}
                              </td>
                              <td className="px-6 py-4">
                                <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                                  <Download className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Support Tab */}
                {activeTab === 'support' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Client</h1>
                        <p className="text-gray-600">Créez un ticket ou consultez vos demandes</p>
                      </div>
                      <select 
                        value={ticketFilter}
                        onChange={(e) => setTicketFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">Tous</option>
                        <option value="open">Ouverts</option>
                        <option value="in_progress">En cours</option>
                        <option value="resolved">Résolus</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Nouveau Ticket */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Nouveau Ticket</h2>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Titre</label>
                            <input
                              type="text"
                              value={newTicket.title}
                              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea
                              value={newTicket.description}
                              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                              rows={4}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie</label>
                              <select
                                value={newTicket.category}
                                onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="general">Général</option>
                                <option value="technical">Technique</option>
                                <option value="billing">Facturation</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Priorité</label>
                              <select
                                value={newTicket.priority}
                                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="low">Basse</option>
                                <option value="medium">Moyenne</option>
                                <option value="high">Haute</option>
                                <option value="urgent">Urgente</option>
                              </select>
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                          >
                            {saving ? 'Envoi...' : 'Créer le Ticket'}
                          </button>
                        </form>
                      </div>

                      {/* Liste Tickets */}
                      <div className="space-y-4">
                        {tickets.map(ticket => (
                          <div 
                            key={ticket._id}
                            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition cursor-pointer"
                            onClick={() => {
                              setSelectedTicket(ticket)
                              setIsTicketChatOpen(true)
                            }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="text-xs font-mono text-gray-500">#{ticket.ticketNumber}</span>
                                <h3 className="text-lg font-bold text-gray-900">{ticket.title}</h3>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className={`px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                              <span>{formatDate(ticket.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Achats Groupés Tab */}
                {activeTab === 'group-buys' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Achats Groupés</h1>
                        <p className="text-gray-600">Suivez vos participations et propositions</p>
                      </div>
                      <select 
                        value={groupBuyFilter}
                        onChange={(e) => setGroupBuyFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">Tous</option>
                        <option value="pending">En attente</option>
                        <option value="active">Actifs</option>
                        <option value="completed">Terminés</option>
                      </select>
                    </div>

                    {groupBuysLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                      </div>
                    ) : groupBuys.length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun achat groupé</h3>
                        <p className="text-gray-500 mb-6">
                          Vous n&apos;avez pas encore participé à un achat groupé.
                        </p>
                        <a 
                          href="/achats-groupes" 
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                        >
                          <Users className="w-5 h-5" />
                          Découvrir les achats groupés
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupBuys
                          .filter(gb => {
                            if (groupBuyFilter === 'all') return true
                            if (groupBuyFilter === 'pending') return gb.status === 'pending_approval'
                            if (groupBuyFilter === 'active') return ['open', 'filled', 'ordering'].includes(gb.status)
                            if (groupBuyFilter === 'completed') return ['ordered', 'shipped', 'delivered'].includes(gb.status)
                            return true
                          })
                          .map((gb) => (
                          <div key={gb.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-gray-900">{gb.productName}</h3>
                                  {gb.isProposer && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                      Ma proposition
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {gb.currentQuantity}/{gb.targetQuantity} unités
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Package className="w-4 h-4" />
                                    Ma quantité: {gb.myQuantity}
                                  </span>
                                  {gb.deadline && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      Expire: {formatDate(gb.deadline)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                gb.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                                gb.status === 'open' ? 'bg-green-100 text-green-700' :
                                gb.status === 'filled' ? 'bg-blue-100 text-blue-700' :
                                gb.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                gb.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {gb.status === 'pending_approval' ? 'En attente' :
                                 gb.status === 'open' ? 'Ouvert' :
                                 gb.status === 'filled' ? 'Objectif atteint' :
                                 gb.status === 'ordering' ? 'Commande en cours' :
                                 gb.status === 'ordered' ? 'Commandé' :
                                 gb.status === 'shipped' ? 'Expédié' :
                                 gb.status === 'delivered' ? 'Livré' :
                                 gb.status === 'rejected' ? 'Refusé' :
                                 gb.status}
                              </span>
                            </div>

                            {/* Barre de progression */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progression</span>
                                <span>{gb.progress}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    gb.progress >= 100 ? 'bg-emerald-500' :
                                    gb.progress >= 70 ? 'bg-blue-500' :
                                    'bg-purple-500'
                                  }`}
                                  style={{ width: `${Math.min(100, gb.progress)}%` }}
                                />
                              </div>
                            </div>

                            {/* Économies potentielles */}
                            {gb.savings && (
                              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                <div>
                                  <span className="text-sm font-medium text-emerald-700">
                                    Économie: {formatCurrency(gb.savings.savings)} ({gb.savings.savingsPercent}%)
                                  </span>
                                  <span className="text-xs text-emerald-600 ml-2">
                                    ({formatCurrency(gb.savings.tierPrice)}/unité au lieu de {formatCurrency(gb.unitPrice)})
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Message de proposition (si applicable) */}
                            {gb.proposal?.message && (
                              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                                <p className="text-sm text-gray-600 italic">&quot;{gb.proposal.message}&quot;</p>
                              </div>
                            )}

                            {/* Message de rejet (si applicable) */}
                            {gb.status === 'rejected' && gb.proposal?.rejectionReason && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <p className="text-sm text-red-700">
                                  <strong>Raison du refus:</strong> {gb.proposal.rejectionReason}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                              <span className="text-sm text-gray-500">
                                Prix unitaire: <strong>{formatCurrency(gb.unitPrice)}</strong>
                              </span>
                              <a 
                                href={`/achats-groupes/${gb.id}`}
                                className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
                              >
                                Voir les détails
                                <ChevronRight className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && profile && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
                      <p className="text-gray-600">Gérez vos informations personnelles</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-2xl">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl">
                          {profile.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                          <p className="text-gray-600">{profile.email}</p>
                        </div>
                      </div>

                      {!editingProfile ? (
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                            <p className="text-gray-900">{profile.phone || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Entreprise</label>
                            <p className="text-gray-900">{profile.company || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Adresse</label>
                            <p className="text-gray-900">{profile.address || '-'}</p>
                          </div>
                          <button
                            onClick={() => setEditingProfile(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition"
                          >
                            <Edit2 className="h-4 w-4" />
                            Modifier le Profil
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                            <input
                              type="text"
                              value={profileForm.name}
                              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                            <input
                              type="tel"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Entreprise</label>
                            <input
                              type="text"
                              value={profileForm.company}
                              onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Adresse</label>
                            <textarea
                              value={profileForm.address}
                              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-4">
                            <button
                              type="submit"
                              disabled={saving}
                              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" />
                              {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProfile(false)}
                              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProjectDetailModal
        projectId={selectedProjectId || ''}
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false)
          setSelectedProjectId(null)
        }}
      />

      <TicketChatModal
        ticket={selectedTicket as any}
        isOpen={isTicketChatOpen}
        onClose={() => {
          setIsTicketChatOpen(false)
          setSelectedTicket(null)
        }}
        onRefresh={fetchTickets}
      />

      {/* Modal Demande de Projet */}
      {isProjectRequestOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsProjectRequestOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <button
                onClick={() => setIsProjectRequestOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle Demande de Projet</h2>
              
              <form onSubmit={handleProjectRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du Projet *</label>
                  <input
                    type="text"
                    value={projectRequest.name}
                    onChange={(e) => setProjectRequest({ ...projectRequest, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: Installation vidéosurveillance"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type de Service *</label>
                    <select
                      value={projectRequest.serviceType}
                      onChange={(e) => setProjectRequest({ ...projectRequest, serviceType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="surveillance">Vidéosurveillance</option>
                      <option value="access_control">Contrôle d'accès</option>
                      <option value="network">Infrastructure réseau</option>
                      <option value="intercom">Interphonie</option>
                      <option value="alarm">Alarme anti-intrusion</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Urgence</label>
                    <select
                      value={projectRequest.urgency}
                      onChange={(e) => setProjectRequest({ ...projectRequest, urgency: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">Haute</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={projectRequest.description}
                    onChange={(e) => setProjectRequest({ ...projectRequest, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={4}
                    placeholder="Décrivez votre besoin en détail..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Adresse / Site *</label>
                  <input
                    type="text"
                    value={projectRequest.address}
                    onChange={(e) => setProjectRequest({ ...projectRequest, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Adresse complète du site"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Estimé (FCFA)</label>
                    <input
                      type="number"
                      value={projectRequest.estimatedBudget}
                      onChange={(e) => setProjectRequest({ ...projectRequest, estimatedBudget: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Optionnel"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date de Début Souhaitée</label>
                    <input
                      type="date"
                      value={projectRequest.preferredStartDate}
                      onChange={(e) => setProjectRequest({ ...projectRequest, preferredStartDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    {saving ? 'Envoi...' : 'Envoyer la Demande'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProjectRequestOpen(false)}
                    className="px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Demande d'Intervention */}
      {isInterventionRequestOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsInterventionRequestOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <button
                onClick={() => setIsInterventionRequestOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Demande d'Intervention</h2>
              
              <form onSubmit={handleInterventionRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type d'Intervention *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setInterventionRequest({ ...interventionRequest, type: 'scheduled' })}
                      className={`p-4 border-2 rounded-lg transition ${
                        interventionRequest.type === 'scheduled'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="font-semibold">Planifiée</div>
                      <div className="text-xs text-gray-600">Maintenance ou installation</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterventionRequest({ ...interventionRequest, type: 'urgent' })}
                      className={`p-4 border-2 rounded-lg transition ${
                        interventionRequest.type === 'urgent'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                      <div className="font-semibold">Urgente</div>
                      <div className="text-xs text-gray-600">Panne ou problème critique</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Titre *</label>
                  <input
                    type="text"
                    value={interventionRequest.title}
                    onChange={(e) => setInterventionRequest({ ...interventionRequest, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Caméra défectueuse entrée principale"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description du Problème *</label>
                  <textarea
                    value={interventionRequest.description}
                    onChange={(e) => setInterventionRequest({ ...interventionRequest, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Décrivez le problème ou le besoin..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Site / Localisation *</label>
                  <input
                    type="text"
                    value={interventionRequest.site}
                    onChange={(e) => setInterventionRequest({ ...interventionRequest, site: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adresse complète"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date Souhaitée</label>
                  <input
                    type="date"
                    value={interventionRequest.preferredDate}
                    onChange={(e) => setInterventionRequest({ ...interventionRequest, preferredDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    {saving ? 'Envoi...' : 'Envoyer la Demande'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInterventionRequestOpen(false)}
                    className="px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Demande de Devis */}
      {isQuoteRequestOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsQuoteRequestOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <button
                onClick={() => setIsQuoteRequestOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Demande de Devis</h2>
              
              <form onSubmit={handleQuoteRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Titre *</label>
                  <input
                    type="text"
                    value={quoteRequest.title}
                    onChange={(e) => setQuoteRequest({ ...quoteRequest, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Devis pour 10 caméras IP"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie *</label>
                  <select
                    value={quoteRequest.category}
                    onChange={(e) => setQuoteRequest({ ...quoteRequest, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="equipment">Équipement</option>
                    <option value="service">Service</option>
                    <option value="maintenance">Contrat de maintenance</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={quoteRequest.description}
                    onChange={(e) => setQuoteRequest({ ...quoteRequest, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                    placeholder="Décrivez votre besoin en détail..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Estimé (FCFA)</label>
                    <input
                      type="number"
                      value={quoteRequest.estimatedBudget}
                      onChange={(e) => setQuoteRequest({ ...quoteRequest, estimatedBudget: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Optionnel"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Délai Souhaité</label>
                    <input
                      type="text"
                      value={quoteRequest.deadline}
                      onChange={(e) => setQuoteRequest({ ...quoteRequest, deadline: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: Dans 2 semaines"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    {saving ? 'Envoi...' : 'Envoyer la Demande'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuoteRequestOpen(false)}
                    className="px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
