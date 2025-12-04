'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LayoutGrid, List, Calendar as CalendarIcon, TrendingUp, Plus, Search, Filter,
  RefreshCw, Download, MoreVertical, Eye, Edit3, Trash2, Users, Clock,
  DollarSign, CheckCircle2, AlertCircle, XCircle, Pause, Play, Target,
  Briefcase, FileText, Package, Activity, Award, BarChart3, PieChart,
  ArrowUp, ArrowDown, Minus, MapPin, Phone, Mail, Building2, Wrench,
  ChevronRight, Star, TrendingDown, Zap, Settings, X, AlertTriangle
} from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'

interface Project {
  _id: string
  name: string
  description?: string
  address: string
  clientId: string
  status: 'lead' | 'quoted' | 'negotiation' | 'approved' | 'in_progress' | 'testing' | 'completed' | 'maintenance' | 'on_hold'
  startDate: string
  endDate?: string
  currentPhase?: string
  progress: number
  serviceType?: string
  clientSnapshot?: {
    company: string
    contact: string
    phone: string
    email: string
  }
  value?: number
  margin?: number
  assignedTo?: string[]
  milestones?: Array<{
    id: string
    name: string
    status: 'pending' | 'in_progress' | 'completed' | 'delayed'
    dueDate?: string
  }>
  metrics?: {
    tasksTotal?: number
    tasksCompleted?: number
    budgetPlanned?: number
    budgetUsed?: number
    satisfactionScore?: number
  }
  createdAt: string
  updatedAt: string
}

interface KPI {
  label: string
  value: string | number
  change: number
  trend: 'up' | 'down' | 'stable'
  icon: any
  color: string
}

interface ClientOption {
  id: string
  name: string
  email?: string
  phone?: string
}

interface NewProjectForm {
  name: string
  clientId: string
  address: string
  startDate: string
  endDate: string
  status: string
  serviceType: string
  currentPhase: string
  value: string
  progress: string
  description: string
  clientCompany: string
  clientContact: string
  clientPhone: string
  clientEmail: string
}

const buildDefaultProjectForm = (): NewProjectForm => ({
  name: '',
  clientId: '',
  address: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  status: 'lead',
  serviceType: '',
  currentPhase: '',
  value: '',
  progress: '0',
  description: '',
  clientCompany: '',
  clientContact: '',
  clientPhone: '',
  clientEmail: ''
})

type ViewMode = 'kanban' | 'list' | 'calendar' | 'analytics'

export default function ModernProjectManagement() {
  const router = useRouter()
  const toast = useToastContext()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [newProjectData, setNewProjectData] = useState<NewProjectForm>(() => buildDefaultProjectForm())
  const [createModalError, setCreateModalError] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjectDetail, setShowProjectDetail] = useState(false)
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects?status=all&limit=100')
      const data = await res.json()
      
      if (data.projects) {
        setProjects(data.projects)
        setError('')
      } else {
        setError('Erreur lors du chargement')
      }
    } catch (e) {
      setError('Erreur de connexion')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    setClientsLoading(true)
    try {
      const res = await fetch('/api/admin/users?role=CLIENT&limit=200', { credentials: 'include' })
      if (!res.ok) throw new Error('Erreur lors du chargement des clients')
      const data = await res.json()
      const formatted = Array.isArray(data?.users)
        ? data.users.map((user: any) => ({
            id: user._id || user.id,
            name: user.name || user.username || 'Client',
            email: user.email,
            phone: user.phone
          }))
        : []
      setClients(formatted.filter(client => client.id))
    } catch (clientError) {
      console.error('Chargement des clients impossible', clientError)
      toast.error('Chargement clients impossible', { description: 'Impossible de récupérer la liste des clients. Essayez de rafraîchir.' })
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const redirectToProjectEditor = (projectId?: string) => {
    const baseUrl = projectId ? `/admin/planning?editProject=${projectId}` : '/admin/planning'
    router.push(baseUrl)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const openCreateModal = () => {
    setNewProjectData(buildDefaultProjectForm())
    setCreateModalError('')
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateModalError('')
  }

  const handleNewProjectFieldChange = (field: keyof NewProjectForm, value: string) => {
    setNewProjectData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateProject = async () => {
    if (!newProjectData.name.trim() || !newProjectData.address.trim() || !newProjectData.clientId || !newProjectData.startDate) {
      setCreateModalError('Merci de remplir tous les champs obligatoires.')
      return
    }

    setCreatingProject(true)
    setCreateModalError('')

    try {
      const projectName = newProjectData.name.trim()
      const payload: Record<string, any> = {
        name: newProjectData.name.trim(),
        address: newProjectData.address.trim(),
        clientId: newProjectData.clientId,
        startDate: newProjectData.startDate,
        status: newProjectData.status || 'lead',
        serviceType: newProjectData.serviceType || undefined,
        currentPhase: newProjectData.currentPhase || undefined,
        description: newProjectData.description || '',
        progress: newProjectData.progress ? Number(newProjectData.progress) : 0,
        value: newProjectData.value ? Number(newProjectData.value) : 0
      }

      if (newProjectData.endDate) {
        payload.endDate = newProjectData.endDate
      }

      const snapshot = {
        company: newProjectData.clientCompany,
        contact: newProjectData.clientContact,
        phone: newProjectData.clientPhone,
        email: newProjectData.clientEmail
      }

      if (Object.values(snapshot).some(Boolean)) {
        payload.clientSnapshot = snapshot
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Création impossible')
      }

      await fetchProjects()
      setNewProjectData(buildDefaultProjectForm())
      closeCreateModal()
      toast.success('Projet créé', { description: projectName || 'Le projet a été ajouté.' })
    } catch (creationError: any) {
      setCreateModalError(creationError?.message || 'Erreur lors de la création')
      toast.error('Création impossible', { description: creationError?.message || 'Vérifiez les informations et réessayez.' })
    } finally {
      setCreatingProject(false)
    }
  }

  const requestProjectDeletion = (project: Project) => {
    setProjectPendingDeletion(project)
  }

  const cancelProjectDeletion = () => {
    setProjectPendingDeletion(null)
    setIsDeleting(false)
  }

  const deleteSelectedProject = async () => {
    if (!projectPendingDeletion?._id) return
    setIsDeleting(true)
    const targetName = projectPendingDeletion.name
    try {
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: projectPendingDeletion._id })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Suppression impossible')
      }
      toast.success('Projet supprimé', { description: `${targetName} a été retiré.` })
      await fetchProjects()
      cancelProjectDeletion()
    } catch (error) {
      toast.error('Suppression échouée', { description: error instanceof Error ? error.message : 'Réessayez plus tard.' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Calcul des KPIs
  const kpis: KPI[] = useMemo(() => {
    const total = projects.length
    const active = projects.filter(p => p.status === 'in_progress').length
    const completed = projects.filter(p => p.status === 'completed').length
    const onHold = projects.filter(p => p.status === 'on_hold').length
    
    const totalValue = projects.reduce((sum, p) => sum + (p.value || 0), 0)
    const avgProgress = total > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / total) : 0
    
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const recentProjects = projects.filter(p => new Date(p.createdAt) > lastMonth)
    
    return [
      {
        label: 'Projets Actifs',
        value: active,
        change: recentProjects.length,
        trend: recentProjects.length > 0 ? 'up' : 'stable',
        icon: Briefcase,
        color: 'blue'
      },
      {
        label: 'Taux de Complétion',
        value: `${avgProgress}%`,
        change: avgProgress >= 50 ? 5 : -3,
        trend: avgProgress >= 50 ? 'up' : 'down',
        icon: Target,
        color: 'green'
      },
      {
        label: 'Valeur Totale',
        value: `${(totalValue / 1000000).toFixed(1)}M`,
        change: 12,
        trend: 'up',
        icon: DollarSign,
        color: 'purple'
      },
      {
        label: 'Projets Complétés',
        value: completed,
        change: Math.round((completed / total) * 100) || 0,
        trend: completed > 0 ? 'up' : 'stable',
        icon: CheckCircle2,
        color: 'emerald'
      }
    ]
  }, [projects])

  // Filtrage des projets
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = searchTerm === '' || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientSnapshot?.company?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [projects, searchTerm, statusFilter])

  // Regroupement par statut pour Kanban
  const projectsByStatus = useMemo(() => {
    const statuses = ['lead', 'quoted', 'approved', 'in_progress', 'testing', 'completed'] as const
    return statuses.map(status => ({
      status,
      label: getStatusLabel(status),
      color: getStatusColor(status),
      projects: filteredProjects.filter(p => p.status === status)
    }))
  }, [filteredProjects])

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      lead: 'Prospects',
      quoted: 'Devis envoyés',
      negotiation: 'Négociation',
      approved: 'Approuvés',
      in_progress: 'En cours',
      testing: 'Tests',
      completed: 'Terminés',
      maintenance: 'Maintenance',
      on_hold: 'En pause'
    }
    return labels[status] || status
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      lead: 'gray',
      quoted: 'blue',
      negotiation: 'yellow',
      approved: 'purple',
      in_progress: 'orange',
      testing: 'cyan',
      completed: 'green',
      maintenance: 'indigo',
      on_hold: 'red'
    }
    return colors[status] || 'gray'
  }

  function getStatusIcon(status: string) {
    const icons: Record<string, any> = {
      lead: Target,
      quoted: FileText,
      negotiation: Users,
      approved: CheckCircle2,
      in_progress: Activity,
      testing: Zap,
      completed: Award,
      maintenance: Wrench,
      on_hold: Pause
    }
    const Icon = icons[status] || Activity
    return <Icon className="h-4 w-4" />
  }

  const exportProjects = () => {
    const csv = [
      ['Nom', 'Client', 'Statut', 'Progrès', 'Valeur', 'Date début', 'Phase', 'Adresse'].join(','),
      ...filteredProjects.map(p => [
        p.name,
        p.clientSnapshot?.company || '',
        getStatusLabel(p.status),
        `${p.progress}%`,
        (p.value || 0).toLocaleString('fr-FR'),
        new Date(p.startDate).toLocaleDateString('fr-FR'),
        p.currentPhase || '',
        p.address
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `projets_it_vision_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-4">
      {/* En-tête avec gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white p-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-700" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-full px-4 py-1.5 mb-3">
                <Briefcase className="h-4 w-4" />
                <span className="text-xs font-medium">Gestion de Projets</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">Projets IT Vision</h1>
              <p className="text-white/90">Suivi complet et automatisé de bout en bout</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl hover:bg-white/90 transition-all font-semibold shadow-lg hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Nouveau projet
              </button>
              
              <button 
                onClick={exportProjects}
                disabled={projects.length === 0}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-4 py-3 rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          const gradients: Record<string, string> = {
            blue: 'from-blue-50 to-blue-100 border-blue-200',
            green: 'from-green-50 to-green-100 border-green-200',
            purple: 'from-purple-50 to-purple-100 border-purple-200',
            emerald: 'from-emerald-50 to-emerald-100 border-emerald-200'
          }
          const iconBg: Record<string, string> = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            emerald: 'bg-emerald-500'
          }
          const textColor: Record<string, string> = {
            blue: 'text-blue-900',
            green: 'text-green-900',
            purple: 'text-purple-900',
            emerald: 'text-emerald-900'
          }
          
          return (
            <div 
              key={idx} 
              className={`bg-gradient-to-br ${gradients[kpi.color]} border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`text-sm font-medium ${textColor[kpi.color]}`}>{kpi.label}</div>
                <div className={`p-2.5 ${iconBg[kpi.color]} rounded-xl`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className={`text-3xl font-bold ${textColor[kpi.color]}`}>{kpi.value}</div>
              <div className="flex items-center gap-1 mt-2 text-xs">
                {kpi.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-600" />}
                {kpi.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-600" />}
                {kpi.trend === 'stable' && <Minus className="h-3 w-3 text-gray-600" />}
                <span className={kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change}%
                </span>
                <span className="text-gray-500 ml-1">vs dernier mois</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Barre d'outils */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Recherche */}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            />
          </div>
          
          {/* Filtres */}
          <div className="flex gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            >
              <option value="all">Tous les statuts</option>
              <option value="lead">Prospects</option>
              <option value="quoted">Devis envoyés</option>
              <option value="approved">Approuvés</option>
              <option value="in_progress">En cours</option>
              <option value="testing">Tests</option>
              <option value="completed">Terminés</option>
            </select>

            {/* Mode de vue */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'analytics' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
            
            <button 
              onClick={fetchProjects} 
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-3 rounded-xl hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Contenu selon le mode de vue */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun projet trouvé</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Aucun projet ne correspond à vos critères'
              : 'Commencez par créer votre premier projet'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Créer un projet
          </button>
        </div>
      ) : (
        <>
          {/* Vue Kanban */}
          {viewMode === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {projectsByStatus.map(column => (
                <div key={column.status} className="flex-shrink-0 w-80">
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(column.status)}
                        <h3 className="font-semibold text-gray-900">{column.label}</h3>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full font-medium">
                          {column.projects.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {column.projects.map(project => (
                        <div
                          key={project._id}
                          onClick={() => {
                            setSelectedProject(project)
                            setShowProjectDetail(true)
                          }}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">
                              {project.name}
                            </h4>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(event) => {
                                event.stopPropagation()
                                redirectToProjectEditor(project._id)
                              }}
                              aria-label="Modifier ce projet"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </button>
                          </div>
                          
                          {project.clientSnapshot?.company && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{project.clientSnapshot.company}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700">{project.progress}%</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(project.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </div>
                            {project.value && (
                              <div className="flex items-center gap-1 font-medium text-gray-700">
                                <DollarSign className="h-3 w-3" />
                                {(project.value / 1000).toFixed(0)}K
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vue Liste */}
          {viewMode === 'list' && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progrès
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valeur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date début
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjects.map(project => (
                    <tr 
                      key={project._id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedProject(project)
                        setShowProjectDetail(true)
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${getStatusColor(project.status)}-500 to-${getStatusColor(project.status)}-600 flex items-center justify-center text-white font-bold text-sm mr-3`}>
                            {project.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            {project.currentPhase && (
                              <div className="text-xs text-gray-500">{project.currentPhase}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{project.clientSnapshot?.company || '-'}</div>
                        <div className="text-xs text-gray-500">{project.clientSnapshot?.contact || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(project.status)}-100 text-${getStatusColor(project.status)}-700`}>
                          {getStatusIcon(project.status)}
                          {getStatusLabel(project.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.value ? `${(project.value / 1000).toFixed(0)}K FCFA` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.startDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedProject(project)
                            setShowProjectDetail(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            redirectToProjectEditor(project._id)
                          }}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                          aria-label="Modifier le projet"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            requestProjectDeletion(project)
                          }}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Supprimer le projet"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vue Analytics */}
          {viewMode === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Répartition par statut */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition par Statut
                </h3>
                <div className="space-y-3">
                  {projectsByStatus.map(column => {
                    const percentage = filteredProjects.length > 0 
                      ? Math.round((column.projects.length / filteredProjects.length) * 100) 
                      : 0
                    
                    return (
                      <div key={column.status}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{column.label}</span>
                          <span className="text-sm text-gray-600">{column.projects.length} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`bg-${column.color}-600 h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Projets par mois */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Globale
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div>
                      <div className="text-sm text-blue-700 font-medium">Projets en cours</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {projects.filter(p => p.status === 'in_progress').length}
                      </div>
                    </div>
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                    <div>
                      <div className="text-sm text-green-700 font-medium">Taux de succès</div>
                      <div className="text-2xl font-bold text-green-900">
                        {projects.length > 0 
                          ? Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100) 
                          : 0}%
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                    <div>
                      <div className="text-sm text-purple-700 font-medium">Valeur totale</div>
                      <div className="text-2xl font-bold text-purple-900">
                        {(projects.reduce((sum, p) => sum + (p.value || 0), 0) / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Créer un nouveau projet</h3>
                <p className="text-sm text-gray-500">Définissez les informations essentielles avant lancement</p>
              </div>
              <button onClick={closeCreateModal} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" aria-label="Fermer la fenêtre de création">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {createModalError && (
              <div className="mx-6 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createModalError}
              </div>
            )}

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom du projet *</label>
                  <input
                    type="text"
                    value={newProjectData.name}
                    onChange={e => handleNewProjectFieldChange('name', e.target.value)}
                    placeholder="Installation fibre client VIP"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Client *</label>
                    <button
                      type="button"
                      onClick={() => fetchClients()}
                      className="text-xs inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      disabled={clientsLoading}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${clientsLoading ? 'animate-spin' : ''}`} />
                      Rafraîchir
                    </button>
                  </div>
                  <select
                    value={newProjectData.clientId}
                    onChange={e => handleNewProjectFieldChange('clientId', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.email ? `(${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <p className="mt-1 text-xs text-orange-600">Aucun client chargé pour le moment.</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Adresse *</label>
                  <input
                    type="text"
                    value={newProjectData.address}
                    onChange={e => handleNewProjectFieldChange('address', e.target.value)}
                    placeholder="Adresse complète du site"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date de début *</label>
                  <input
                    type="date"
                    value={newProjectData.startDate}
                    onChange={e => handleNewProjectFieldChange('startDate', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date de fin</label>
                  <input
                    type="date"
                    value={newProjectData.endDate}
                    onChange={e => handleNewProjectFieldChange('endDate', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Statut</label>
                  <select
                    value={newProjectData.status}
                    onChange={e => handleNewProjectFieldChange('status', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    <option value="lead">Prospect</option>
                    <option value="quoted">Devis envoyé</option>
                    <option value="approved">Approuvé</option>
                    <option value="in_progress">En cours</option>
                    <option value="testing">Tests</option>
                    <option value="completed">Terminé</option>
                    <option value="on_hold">En pause</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Type / Service</label>
                  <input
                    type="text"
                    value={newProjectData.serviceType}
                    onChange={e => handleNewProjectFieldChange('serviceType', e.target.value)}
                    placeholder="Fibre, vidéosurveillance..."
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phase actuelle</label>
                  <input
                    type="text"
                    value={newProjectData.currentPhase}
                    onChange={e => handleNewProjectFieldChange('currentPhase', e.target.value)}
                    placeholder="Installation, recette..."
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Valeur (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProjectData.value}
                    onChange={e => handleNewProjectFieldChange('value', e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Progression (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProjectData.progress}
                    onChange={e => handleNewProjectFieldChange('progress', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newProjectData.description}
                  onChange={e => handleNewProjectFieldChange('description', e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Contexte, objectifs, contraintes..."
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Détails client (optionnel)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Société</label>
                    <input
                      type="text"
                      value={newProjectData.clientCompany}
                      onChange={e => handleNewProjectFieldChange('clientCompany', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Personne de contact</label>
                    <input
                      type="text"
                      value={newProjectData.clientContact}
                      onChange={e => handleNewProjectFieldChange('clientContact', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Téléphone</label>
                    <input
                      type="tel"
                      value={newProjectData.clientPhone}
                      onChange={e => handleNewProjectFieldChange('clientPhone', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Email</label>
                    <input
                      type="email"
                      value={newProjectData.clientEmail}
                      onChange={e => handleNewProjectFieldChange('clientEmail', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50 rounded-b-3xl">
              <button
                onClick={closeCreateModal}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateProject}
                disabled={creatingProject}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {creatingProject && <RefreshCw className="h-4 w-4 animate-spin" />}
                {creatingProject ? 'Création...' : 'Créer le projet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {projectPendingDeletion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Supprimer le projet ?</p>
                  <p className="text-sm text-gray-500">Cette action est irréversible.</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Confirmez la suppression de <span className="font-semibold text-gray-900">{projectPendingDeletion.name}</span>. 
                Toutes les données associées seront définitivement retirées de la plateforme.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={cancelProjectDeletion}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={deleteSelectedProject}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold shadow hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails projet */}
      {showProjectDetail && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
              <button
                onClick={() => setShowProjectDetail(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm text-blue-700 font-medium mb-1">Client</div>
                  <div className="font-semibold text-blue-900">{selectedProject.clientSnapshot?.company || '-'}</div>
                  <div className="text-sm text-blue-600">{selectedProject.clientSnapshot?.contact || ''}</div>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-sm text-green-700 font-medium mb-1">Statut</div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-${getStatusColor(selectedProject.status)}-100 text-${getStatusColor(selectedProject.status)}-700`}>
                    {getStatusIcon(selectedProject.status)}
                    {getStatusLabel(selectedProject.status)}
                  </span>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-sm text-purple-700 font-medium mb-1">Progrès</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-purple-200 rounded-full h-3">
                      <div 
                        className="bg-purple-600 h-3 rounded-full"
                        style={{ width: `${selectedProject.progress}%` }}
                      />
                    </div>
                    <span className="text-purple-900 font-bold">{selectedProject.progress}%</span>
                  </div>
                </div>
                
                <div className="bg-orange-50 rounded-xl p-4">
                  <div className="text-sm text-orange-700 font-medium mb-1">Valeur</div>
                  <div className="font-semibold text-orange-900">
                    {selectedProject.value ? `${selectedProject.value.toLocaleString('fr-FR')} FCFA` : '-'}
                  </div>
                </div>
              </div>

              {/* Dates et localisation */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Date de début</div>
                  <div className="text-gray-900 font-medium">
                    {new Date(selectedProject.startDate).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
                
                {selectedProject.endDate && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Date de fin prévue</div>
                    <div className="text-gray-900 font-medium">
                      {new Date(selectedProject.endDate).toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedProject.address && (
                <div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adresse du site
                  </div>
                  <div className="text-gray-900">{selectedProject.address}</div>
                </div>
              )}

              {selectedProject.description && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Description</div>
                  <div className="text-gray-900 bg-gray-50 rounded-xl p-4">
                    {selectedProject.description}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowProjectDetail(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  Fermer
                </button>
                <button
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:scale-105"
                  onClick={() => {
                    setShowProjectDetail(false)
                    if (selectedProject?._id) {
                      redirectToProjectEditor(selectedProject._id)
                    } else {
                      redirectToProjectEditor()
                    }
                  }}
                >
                  Modifier le projet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





