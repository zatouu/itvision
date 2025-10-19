'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Mail, 
  Settings, 
  User, 
  FileText, 
  Camera, 
  Shield, 
  Zap, 
  Target, 
  Activity, 
  Star, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus, 
  Filter, 
  Search, 
  Download, 
  Upload, 
  RefreshCw, 
  Bell, 
  MessageCircle, 
  Wrench, 
  PieChart, 
  LineChart, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  ChevronRight,
  ChevronDown,
  Smartphone,
  Wifi,
  Database,
  Server,
  Monitor,
  HardDrive,
  CreditCard,
  Briefcase,
  Archive,
  Award,
  Globe,
  Layers,
  GitBranch,
  Package,
  Receipt,
  LogOut
} from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import AdminAnalytics from './AdminAnalytics'
import dynamic from 'next/dynamic'

const ProjectManagementSystem = dynamic(() => import('@/components/ProjectManagementSystem'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl shadow p-6 text-gray-600">Chargement de la Gestion de Projets…</div>
  )
})

interface Project {
  id: string
  name: string
  client: {
    id: string
    name: string
    company: string
    phone: string
    email: string
  }
  status: 'planning' | 'in_progress' | 'testing' | 'completed' | 'maintenance'
  progress: number
  startDate: string
  endDate: string
  value: number
  type: 'videosurveillance' | 'access_control' | 'alarm' | 'domotique' | 'network'
  site: string
  address: string
  technician: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  equipment: Array<{
    category: string
    items: number
    status: string
  }>
  lastUpdate: string
  nextMaintenance?: string
  issues: number
  satisfaction?: number
}

interface TeamMember {
  id: string
  name: string
  role: string
  phone: string
  email: string
  status: 'available' | 'busy' | 'on_site' | 'off'
  currentProject?: string
  location?: string
  skills: string[]
  performance: {
    projectsCompleted: number
    avgRating: number
    onTimeDelivery: number
  }
}

interface FinancialData {
  revenue: {
    thisMonth: number
    lastMonth: number
    thisYear: number
    trend: 'up' | 'down' | 'stable'
  }
  invoicing: {
    pending: number
    overdue: number
    paid: number
  }
  profitability: {
    margin: number
    costs: number
    profit: number
  }
}

export default function GlobalAdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [projects, setProjects] = useState<Project[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjectDetail, setShowProjectDetail] = useState(false)
  const [newProjectSignal, setNewProjectSignal] = useState(0)

  // Données simulées complètes IT Vision
  useEffect(() => {
    setProjects([
      {
        id: 'PRJ-001',
        name: 'Vidéosurveillance Siège',
        client: {
          id: 'CLI-001',
          name: 'Amadou Ba',
          company: 'IT Solutions SARL',
          phone: '+221 77 123 45 67',
          email: 'amadou.ba@itsolutions.sn'
        },
        status: 'completed',
        progress: 100,
        startDate: '2024-01-15',
        endDate: '2024-01-20',
        value: 2450000,
        type: 'videosurveillance',
        site: 'Siège Parcelles Assainies',
        address: 'Parcelles Assainies, Unité 25, Dakar',
        technician: 'Moussa Diop',
        priority: 'high',
        equipment: [
          { category: 'Caméras IP', items: 16, status: 'Opérationnel' },
          { category: 'NVR', items: 1, status: 'Opérationnel' },
          { category: 'Switch PoE', items: 1, status: 'Opérationnel' }
        ],
        lastUpdate: '2024-02-10T16:30:00Z',
        nextMaintenance: '2024-04-15',
        issues: 0,
        satisfaction: 5
      },
      {
        id: 'PRJ-002',
        name: 'Sécurité Magasin',
        client: {
          id: 'CLI-002',
          name: 'Aïssatou Diop',
          company: 'Commerce Plus',
          phone: '+221 77 234 56 78',
          email: 'aissatou@commerceplus.sn'
        },
        status: 'maintenance',
        progress: 100,
        startDate: '2023-11-10',
        endDate: '2023-11-18',
        value: 1800000,
        type: 'videosurveillance',
        site: 'Magasin Plateau',
        address: 'Avenue Pompidou, Plateau, Dakar',
        technician: 'Ibrahima Sall',
        priority: 'medium',
        equipment: [
          { category: 'Caméras IP', items: 8, status: 'Opérationnel' },
          { category: 'NVR', items: 1, status: 'Maintenance requise' }
        ],
        lastUpdate: '2024-02-12T11:30:00Z',
        nextMaintenance: '2024-03-12',
        issues: 1,
        satisfaction: 4
      },
      {
        id: 'PRJ-003',
        name: 'Contrôle d\'accès résidence',
        client: {
          id: 'CLI-003',
          name: 'Moussa Kébé',
          company: 'Résidence Almadies',
          phone: '+221 77 345 67 89',
          email: 'moussa@almadies.sn'
        },
        status: 'in_progress',
        progress: 75,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        value: 3200000,
        type: 'access_control',
        site: 'Résidence Almadies',
        address: 'Route des Almadies, Dakar',
        technician: 'Cheikh Sy',
        priority: 'medium',
        equipment: [
          { category: 'Lecteurs badges', items: 6, status: 'Installation' },
          { category: 'Centrale', items: 1, status: 'Configuration' }
        ],
        lastUpdate: '2024-02-20T14:15:00Z',
        issues: 0,
        satisfaction: undefined
      },
      {
        id: 'PRJ-004',
        name: 'Sécurité Agence Bancaire',
        client: {
          id: 'CLI-004',
          name: 'Fatou Sarr',
          company: 'Banque Atlantique',
          phone: '+221 77 456 78 90',
          email: 'fatou.sarr@ba.sn'
        },
        status: 'planning',
        progress: 15,
        startDate: '2024-03-01',
        endDate: '2024-03-15',
        value: 4500000,
        type: 'videosurveillance',
        site: 'Agence Point E',
        address: 'Point E, Dakar',
        technician: 'Moussa Diop',
        priority: 'high',
        equipment: [
          { category: 'Caméras IP', items: 12, status: 'Commandé' },
          { category: 'NVR', items: 1, status: 'Commandé' }
        ],
        lastUpdate: '2024-02-25T09:00:00Z',
        issues: 0
      },
      {
        id: 'PRJ-005',
        name: 'Domotique Hôtel',
        client: {
          id: 'CLI-005',
          name: 'Mamadou Fall',
          company: 'Hôtel Terrou-Bi',
          phone: '+221 77 567 89 01',
          email: 'mamadou@terrooubi.sn'
        },
        status: 'testing',
        progress: 90,
        startDate: '2024-01-20',
        endDate: '2024-02-29',
        value: 6800000,
        type: 'domotique',
        site: 'Hôtel Terrou-Bi',
        address: 'Route de la Corniche Ouest, Dakar',
        technician: 'Ibrahima Sall',
        priority: 'high',
        equipment: [
          { category: 'Modules smart', items: 45, status: 'Tests finaux' },
          { category: 'Hub central', items: 1, status: 'Configuration' }
        ],
        lastUpdate: '2024-02-28T16:45:00Z',
        issues: 2
      }
    ])

    setTeam([
      {
        id: 'TECH-001',
        name: 'Moussa Diop',
        role: 'Technicien Senior',
        phone: '+221 77 111 11 11',
        email: 'moussa.diop@itvision.sn',
        status: 'on_site',
        currentProject: 'PRJ-004',
        location: 'Point E, Dakar',
        skills: ['Vidéosurveillance', 'Réseaux', 'Installation'],
        performance: {
          projectsCompleted: 15,
          avgRating: 4.8,
          onTimeDelivery: 95
        }
      },
      {
        id: 'TECH-002',
        name: 'Ibrahima Sall',
        role: 'Chef de Projet',
        phone: '+221 77 222 22 22',
        email: 'ibrahima.sall@itvision.sn',
        status: 'busy',
        currentProject: 'PRJ-005',
        skills: ['Gestion projet', 'Domotique', 'Formation'],
        performance: {
          projectsCompleted: 12,
          avgRating: 4.9,
          onTimeDelivery: 100
        }
      },
      {
        id: 'TECH-003',
        name: 'Cheikh Sy',
        role: 'Technicien',
        phone: '+221 77 333 33 33',
        email: 'cheikh.sy@itvision.sn',
        status: 'on_site',
        currentProject: 'PRJ-003',
        location: 'Almadies, Dakar',
        skills: ['Contrôle d\'accès', 'Alarme', 'Maintenance'],
        performance: {
          projectsCompleted: 8,
          avgRating: 4.6,
          onTimeDelivery: 90
        }
      },
      {
        id: 'TECH-004',
        name: 'Fatou Ndoye',
        role: 'Technicienne',
        phone: '+221 77 444 44 44',
        email: 'fatou.ndoye@itvision.sn',
        status: 'available',
        skills: ['Vidéosurveillance', 'Câblage', 'Support'],
        performance: {
          projectsCompleted: 6,
          avgRating: 4.7,
          onTimeDelivery: 88
        }
      }
    ])

    setFinancialData({
      revenue: {
        thisMonth: 8750000,
        lastMonth: 7200000,
        thisYear: 45600000,
        trend: 'up'
      },
      invoicing: {
        pending: 2400000,
        overdue: 450000,
        paid: 6300000
      },
      profitability: {
        margin: 35,
        costs: 5687500,
        profit: 3062500
      }
    })
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'testing': return 'text-purple-600 bg-purple-100'
      case 'planning': return 'text-yellow-600 bg-yellow-100'
      case 'maintenance': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'testing': return <Eye className="h-4 w-4" />
      case 'planning': return <Calendar className="h-4 w-4" />
      case 'maintenance': return <Wrench className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100'
      case 'busy': return 'text-blue-600 bg-blue-100'
      case 'on_site': return 'text-purple-600 bg-purple-100'
      case 'off': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.site.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getOverviewStats = () => {
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'testing').length
    const completedProjects = projects.filter(p => p.status === 'completed').length
    const totalRevenue = projects.reduce((sum, p) => sum + p.value, 0)
    const avgSatisfaction = projects.filter(p => p.satisfaction).reduce((sum, p) => sum + (p.satisfaction || 0), 0) / projects.filter(p => p.satisfaction).length
    const teamAvailable = team.filter(t => t.status === 'available').length
    const pendingIssues = projects.reduce((sum, p) => sum + p.issues, 0)

    return {
      totalProjects,
      activeProjects, 
      completedProjects,
      totalRevenue,
      avgSatisfaction: avgSatisfaction || 0,
      teamAvailable,
      pendingIssues
    }
  }

  const stats = getOverviewStats()

  const openProjectDetail = (project: Project) => {
    setSelectedProject(project)
    setShowProjectDetail(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'videosurveillance': return <Camera className="h-5 w-5" />
      case 'access_control': return <Shield className="h-5 w-5" />
      case 'alarm': return <Bell className="h-5 w-5" />
      case 'domotique': return <Smartphone className="h-5 w-5" />
      case 'network': return <Wifi className="h-5 w-5" />
      default: return <Settings className="h-5 w-5" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🎯 Dashboard IT Vision
            </h1>
            <p className="text-gray-600">
              Vue d'ensemble complète de votre activité
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            
            <button
              onClick={() => { setActiveTab('projects'); setNewProjectSignal((s) => s + 1) }}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Projet</span>
            </button>
            
            <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            <button
              onClick={async ()=>{ try { await fetch('/api/auth/logout', { credentials: 'include' }) } catch {}; router.replace('/login') }}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'projects', label: 'Projets', icon: Briefcase },
            { id: 'team', label: 'Équipe', icon: Users },
            { id: 'users', label: 'Utilisateurs', icon: Shield, link: '/admin/users' },
            { id: 'financial', label: 'Financier', icon: DollarSign },
            { id: 'products', label: 'Produits & Prix', icon: Package, link: '/admin-prix' },
            { id: 'invoices', label: 'Factures', icon: Receipt, link: '/admin-factures' },
            { id: 'reports', label: 'Rapports', icon: FileText },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => {
            const IconComponent = tab.icon
            
            if ('link' in tab) {
              return (
                <a
                  key={tab.id}
                  href={tab.link}
                  className="flex items-center space-x-2 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </a>
              )
            }
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPIs principaux */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projets Actifs</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.activeProjects}</p>
                  <p className="text-xs text-gray-500 mt-1">sur {stats.totalProjects} total</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">CA ce mois</p>
                  <p className="text-3xl font-bold text-green-600">
                    {financialData ? Math.round(financialData.revenue.thisMonth / 1000000) : 0}M
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">+21.5%</span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Équipe Dispo</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.teamAvailable}</p>
                  <p className="text-xs text-gray-500 mt-1">techniciens libres</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.avgSatisfaction.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">moyenne clients</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Graphiques et métriques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Projets par statut */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📊 Répartition Projets</h3>
              
              <div className="space-y-4">
                {[
                  { status: 'completed', label: 'Terminés', count: projects.filter(p => p.status === 'completed').length, color: 'bg-green-500' },
                  { status: 'in_progress', label: 'En cours', count: projects.filter(p => p.status === 'in_progress').length, color: 'bg-blue-500' },
                  { status: 'testing', label: 'Tests', count: projects.filter(p => p.status === 'testing').length, color: 'bg-purple-500' },
                  { status: 'planning', label: 'Planification', count: projects.filter(p => p.status === 'planning').length, color: 'bg-yellow-500' },
                  { status: 'maintenance', label: 'Maintenance', count: projects.filter(p => p.status === 'maintenance').length, color: 'bg-orange-500' }
                ].map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                      <span className="text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">{item.count}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${(item.count / stats.totalProjects) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alertes et actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">🚨 Alertes & Actions</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">2 problèmes techniques</p>
                    <p className="text-sm text-red-700">Projets PRJ-005 nécessitent attention</p>
                  </div>
                  <button className="text-red-600 hover:bg-red-100 p-2 rounded-lg">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">3 maintenances cette semaine</p>
                    <p className="text-sm text-yellow-700">PRJ-001, PRJ-002 programmées</p>
                  </div>
                  <button className="text-yellow-600 hover:bg-yellow-100 p-2 rounded-lg">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">4 rapports en attente</p>
                    <p className="text-sm text-blue-700">Validation requise</p>
                  </div>
                  <button className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Factures en attente</p>
                    <p className="text-sm text-green-700">{formatCurrency(financialData?.invoicing.pending || 0)}</p>
                  </div>
                  <button className="text-green-600 hover:bg-green-100 p-2 rounded-lg">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Projets récents */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">📋 Projets Récents</h3>
              <button 
                onClick={() => setActiveTab('projects')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Voir tout →
              </button>
            </div>
            
            <div className="space-y-4">
              {projects.slice(0, 3).map((project) => (
                <div key={project.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(project.type)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-600">{project.client.company}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      <span className="ml-1">{project.status.replace('_', ' ')}</span>
                    </span>
                    
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{project.progress}%</div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gestion des Projets - Intégration directe (sans iframe) */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">🏗️ Gestion de Projets IT Vision</h3>
          <ProjectManagementSystem openNewProjectSignal={newProjectSignal} />
        </div>
      )}

      {/* Gestion des Projets Alternative */}
      {activeTab === 'projects_old' && (
        <div className="space-y-6">
          {/* Filtres */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="planning">Planification</option>
                  <option value="in_progress">En cours</option>
                  <option value="testing">Tests</option>
                  <option value="completed">Terminés</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Projet, client, site..."
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Actualiser</span>
                </button>
              </div>

              <div className="flex items-end">
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Nouveau Projet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Liste des projets */}
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Projets ({filteredProjects.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="font-mono text-sm text-gray-500">{project.id}</span>
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)}
                          <span className="ml-1">{project.status.replace('_', ' ')}</span>
                        </span>
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)}`}></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                          <p className="text-sm text-gray-600">{project.client.company}</p>
                          <p className="text-sm text-gray-600">Contact: {project.client.name}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Site: <span className="font-medium">{project.site}</span></p>
                          <p className="text-sm text-gray-600">Technicien: <span className="font-medium">{project.technician}</span></p>
                          <p className="text-sm text-gray-600">Type: <span className="font-medium capitalize">{project.type.replace('_', ' ')}</span></p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Valeur: <span className="font-medium text-green-600">{formatCurrency(project.value)}</span></p>
                          <p className="text-sm text-gray-600">Début: <span className="font-medium">{new Date(project.startDate).toLocaleDateString('fr-FR')}</span></p>
                          <p className="text-sm text-gray-600">Fin: <span className="font-medium">{new Date(project.endDate).toLocaleDateString('fr-FR')}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Progression:</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{project.progress}%</span>
                          </div>
                          
                          {project.issues > 0 && (
                            <div className="flex items-center space-x-1 text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm">{project.issues} problème(s)</span>
                            </div>
                          )}
                          
                          {project.satisfaction && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{project.satisfaction}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => openProjectDetail(project)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Détails</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                        <Edit3 className="h-4 w-4" />
                        <span>Modifier</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        <MessageCircle className="h-4 w-4" />
                        <span>Contact</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gestion de l'équipe */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">👥 Équipe IT Vision</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {team.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900">{member.name}</h4>
                      <p className="text-gray-600">{member.role}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTeamStatusColor(member.status)}`}>
                      {member.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>📞 {member.phone}</p>
                    <p>✉️ {member.email}</p>
                    {member.currentProject && (
                      <p>🔧 Projet actuel: {member.currentProject}</p>
                    )}
                    {member.location && (
                      <p>📍 {member.location}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Compétences:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill) => (
                        <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="font-bold text-green-600">{member.performance.projectsCompleted}</div>
                      <div className="text-gray-500">Projets</div>
                    </div>
                    <div>
                      <div className="font-bold text-yellow-600">{member.performance.avgRating}</div>
                      <div className="text-gray-500">Note</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-600">{member.performance.onTimeDelivery}%</div>
                      <div className="text-gray-500">Ponctualité</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financier */}
      {activeTab === 'financial' && financialData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Chiffre d'Affaires</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ce mois:</span>
                  <span className="font-bold text-green-600">{formatCurrency(financialData.revenue.thisMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mois dernier:</span>
                  <span className="font-medium">{formatCurrency(financialData.revenue.lastMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cette année:</span>
                  <span className="font-bold text-blue-600">{formatCurrency(financialData.revenue.thisYear)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-gray-600">Tendance:</span>
                  <div className="flex items-center space-x-1">
                    <ArrowUp className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">+21.5%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🧾 Facturation</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">En attente:</span>
                  <span className="font-bold text-yellow-600">{formatCurrency(financialData.invoicing.pending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">En retard:</span>
                  <span className="font-bold text-red-600">{formatCurrency(financialData.invoicing.overdue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payées:</span>
                  <span className="font-bold text-green-600">{formatCurrency(financialData.invoicing.paid)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Rentabilité</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Marge:</span>
                  <span className="font-bold text-green-600">{financialData.profitability.margin}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Coûts:</span>
                  <span className="font-medium text-red-600">{formatCurrency(financialData.profitability.costs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit:</span>
                  <span className="font-bold text-green-600">{formatCurrency(financialData.profitability.profit)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rapports - Redirection */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Gestion des Rapports</h3>
          <p className="text-gray-600 mb-6">
            Accédez à la gestion complète des rapports d'intervention et leur validation
          </p>
          <a
            href="/validation-rapports"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span>Ouvrir Validation Rapports</span>
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && <AdminAnalytics />}

      {/* Modal détail projet */}
      {showProjectDetail && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{selectedProject.name}</h3>
              <button
                onClick={() => setShowProjectDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Informations client</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Entreprise:</span> {selectedProject.client.company}</p>
                    <p><span className="text-gray-600">Contact:</span> {selectedProject.client.name}</p>
                    <p><span className="text-gray-600">Téléphone:</span> {selectedProject.client.phone}</p>
                    <p><span className="text-gray-600">Email:</span> {selectedProject.client.email}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Détails projet</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">ID:</span> {selectedProject.id}</p>
                    <p><span className="text-gray-600">Type:</span> {selectedProject.type}</p>
                    <p><span className="text-gray-600">Site:</span> {selectedProject.site}</p>
                    <p><span className="text-gray-600">Technicien:</span> {selectedProject.technician}</p>
                    <p><span className="text-gray-600">Valeur:</span> {formatCurrency(selectedProject.value)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Équipements installés</h4>
                <div className="space-y-2">
                  {selectedProject.equipment.map((eq, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{eq.category}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">{eq.items} unités</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          eq.status === 'Opérationnel' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {eq.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}