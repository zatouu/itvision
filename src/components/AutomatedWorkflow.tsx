'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Clock, 
  Send, 
  User, 
  FileText, 
  Mail, 
  MessageCircle, 
  Bell, 
  Settings,
  Workflow,
  ArrowRight,
  Play,
  Pause,
  AlertTriangle,
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Activity,
  BarChart3,
  Target,
  Zap,
  Shield,
  Star,
  Timer,
  Archive,
  RefreshCw,
  TrendingUp,
  Users as UsersIcon,
  Building,
  Smartphone
} from 'lucide-react'

interface WorkflowStep {
  id: string
  title: string
  description: string
  type: 'manual' | 'automatic' | 'approval'
  assignee?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  duration?: number
  dependencies?: string[]
  automationRules?: any[]
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  triggerEvent: string
  steps: WorkflowStep[]
  notifications: any[]
  approvals: any[]
}

export default function AutomatedWorkflow() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [workflows, setWorkflows] = useState<any[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les workflows depuis l'API
  const loadWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.workflows)) {
          // Mapper les données MongoDB vers le format du composant
          const apiWorkflows = data.workflows.map((w: any) => ({
            id: w._id || w.id,
            templateId: w.serviceType,
            projectId: w.projectId,
            clientName: w.clientName || 'Client',
            startedAt: w.startDate || w.createdAt,
            status: w.status,
            currentStep: w.currentStep,
            progress: w.progress || 0,
            estimatedCompletion: w.estimatedEndDate,
            completedAt: w.actualEndDate,
            steps: w.steps || []
          }))
          setWorkflows(apiWorkflows)
        }
      }
    } catch (err) {
      console.error('Erreur chargement workflows:', err)
    }
  }

  // Charger les données au montage
  useEffect(() => {
    loadWorkflows().finally(() => setLoading(false))
  }, [])

  // Templates par défaut pour IT Vision
  useEffect(() => {
    setTemplates([
      {
        id: 'maintenance-report',
        name: 'Rapport de Maintenance',
        description: 'Workflow automatisé pour les rapports de maintenance mensuelle',
        triggerEvent: 'intervention_completed',
        steps: [
          {
            id: 'data-collection',
            title: 'Collecte des données',
            description: 'Récupération automatique des données d\'intervention',
            type: 'automatic',
            status: 'completed',
            duration: 30,
            automationRules: [
              'Extraire photos avant/après',
              'Compiler tâches réalisées',
              'Calculer durée intervention',
              'Géolocaliser intervention'
            ]
          },
          {
            id: 'quality-check',
            title: 'Contrôle qualité',
            description: 'Vérification automatique de la complétude du rapport',
            type: 'automatic',
            status: 'completed',
            duration: 15,
            dependencies: ['data-collection'],
            automationRules: [
              'Vérifier présence photos',
              'Vérifier signatures',
              'Valider données obligatoires',
              'Contrôler format'
            ]
          },
          {
            id: 'supervisor-review',
            title: 'Validation superviseur',
            description: 'Approbation par le responsable technique',
            type: 'approval',
            assignee: 'Ibrahima Sall',
            status: 'in_progress',
            duration: 120,
            dependencies: ['quality-check']
          },
          {
            id: 'pdf-generation',
            title: 'Génération PDF',
            description: 'Création automatique du rapport PDF',
            type: 'automatic',
            status: 'pending',
            duration: 60,
            dependencies: ['supervisor-review'],
            automationRules: [
              'Template PDF professionnel',
              'Intégration logo et branding',
              'Optimisation taille fichier',
              'Signature électronique'
            ]
          },
          {
            id: 'client-notification',
            title: 'Notification client',
            description: 'Envoi automatique au client via email et portail',
            type: 'automatic',
            status: 'pending',
            duration: 30,
            dependencies: ['pdf-generation'],
            automationRules: [
              'Email personnalisé',
              'Mise à jour portail client',
              'Notification WhatsApp',
              'Tracking ouverture'
            ]
          },
          {
            id: 'archiving',
            title: 'Archivage',
            description: 'Stockage sécurisé et indexation',
            type: 'automatic',
            status: 'pending',
            duration: 15,
            dependencies: ['client-notification'],
            automationRules: [
              'Stockage cloud sécurisé',
              'Indexation par projet',
              'Backup automatique',
              'Métadonnées'
            ]
          }
        ],
        notifications: [
          {
            trigger: 'step_completed',
            recipients: ['supervisor', 'technician'],
            channels: ['email', 'app']
          },
          {
            trigger: 'approval_required',
            recipients: ['supervisor'],
            channels: ['email', 'sms', 'app']
          },
          {
            trigger: 'workflow_completed',
            recipients: ['client', 'admin'],
            channels: ['email', 'portail']
          }
        ],
        approvals: [
          {
            stepId: 'supervisor-review',
            approver: 'supervisor',
            criteria: ['completeness', 'quality', 'compliance'],
            timeout: 24 * 60 // 24 heures
          }
        ]
      },
      {
        id: 'incident-response',
        name: 'Réponse Incident',
        description: 'Workflow d\'urgence pour les interventions critiques',
        triggerEvent: 'critical_alert',
        steps: [
          {
            id: 'alert-validation',
            title: 'Validation alerte',
            description: 'Confirmation automatique de l\'incident',
            type: 'automatic',
            status: 'completed',
            duration: 5
          },
          {
            id: 'team-dispatch',
            title: 'Envoi équipe',
            description: 'Assignation automatique du technicien disponible',
            type: 'automatic',
            status: 'completed',
            duration: 10,
            dependencies: ['alert-validation']
          },
          {
            id: 'client-notification',
            title: 'Notification client',
            description: 'Information immédiate du client',
            type: 'automatic',
            status: 'in_progress',
            duration: 5,
            dependencies: ['team-dispatch']
          },
          {
            id: 'intervention',
            title: 'Intervention sur site',
            description: 'Résolution de l\'incident',
            type: 'manual',
            assignee: 'Technicien assigné',
            status: 'pending',
            dependencies: ['client-notification']
          },
          {
            id: 'resolution-report',
            title: 'Rapport de résolution',
            description: 'Documentation de la résolution',
            type: 'manual',
            status: 'pending',
            dependencies: ['intervention']
          }
        ],
        notifications: [
          {
            trigger: 'incident_detected',
            recipients: ['admin', 'supervisor', 'technician'],
            channels: ['sms', 'app', 'call']
          }
        ],
        approvals: []
      },
      {
        id: 'monthly-reporting',
        name: 'Rapport Mensuel',
        description: 'Génération automatique des rapports mensuels',
        triggerEvent: 'month_end',
        steps: [
          {
            id: 'data-aggregation',
            title: 'Agrégation données',
            description: 'Compilation de toutes les interventions du mois',
            type: 'automatic',
            status: 'pending',
            duration: 60
          },
          {
            id: 'analytics-generation',
            title: 'Génération analytics',
            description: 'Calcul des métriques et KPIs',
            type: 'automatic',
            status: 'pending',
            duration: 30,
            dependencies: ['data-aggregation']
          },
          {
            id: 'report-compilation',
            title: 'Compilation rapport',
            description: 'Assemblage du rapport exécutif',
            type: 'automatic',
            status: 'pending',
            duration: 45,
            dependencies: ['analytics-generation']
          },
          {
            id: 'distribution',
            title: 'Distribution',
            description: 'Envoi aux clients et stakeholders',
            type: 'automatic',
            status: 'pending',
            duration: 15,
            dependencies: ['report-compilation']
          }
        ],
        notifications: [],
        approvals: []
      }
    ])
    // Les workflows sont maintenant chargés depuis l'API via loadWorkflows()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStepIcon = (type: string, status: string) => {
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-600" />
    if (status === 'in_progress') return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
    if (status === 'failed') return <AlertTriangle className="h-5 w-5 text-red-600" />
    
    switch (type) {
      case 'automatic': return <Zap className="h-5 w-5 text-purple-600" />
      case 'approval': return <User className="h-5 w-5 text-orange-600" />
      case 'manual': return <Settings className="h-5 w-5 text-gray-600" />
      default: return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const triggerWorkflow = async (templateId: string, context: any = {}) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    // Préparer les étapes pour MongoDB
    const steps = template.steps.map(step => ({
      id: step.id,
      name: step.title,
      type: step.type === 'approval' ? 'approval' : step.type === 'manual' ? 'notification' : 'validation',
      status: 'pending',
      dependencies: step.dependencies || [],
      deliverables: step.automationRules || []
    }))

    try {
      // Sauvegarder en base de données via l'API
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: context.projectId || `PRJ-${Date.now()}`,
          serviceType: templateId,
          steps,
          clientName: context.clientName || 'Client'
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.workflow) {
          const newWorkflow = {
            id: data.workflow._id,
            templateId,
            projectId: data.workflow.projectId,
            clientName: context.clientName || 'Client Test',
            startedAt: new Date().toISOString(),
            status: 'in_progress',
            currentStep: template.steps[0].id,
            progress: 0,
            estimatedCompletion: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            context
          }
          setWorkflows(prev => [newWorkflow, ...prev])
        }
      } else {
        // Fallback: workflow local si l'API échoue
        const newWorkflow = {
          id: `WF-${Date.now()}`,
          templateId,
          projectId: context.projectId || 'PRJ-XXX',
          clientName: context.clientName || 'Client Test',
          startedAt: new Date().toISOString(),
          status: 'in_progress',
          currentStep: template.steps[0].id,
          progress: 0,
          estimatedCompletion: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          context
        }
        setWorkflows(prev => [newWorkflow, ...prev])
      }
    } catch (err) {
      console.error('Erreur création workflow:', err)
      // Fallback local
      const newWorkflow = {
        id: `WF-${Date.now()}`,
        templateId,
        projectId: context.projectId || 'PRJ-XXX',
        clientName: context.clientName || 'Client Test',
        startedAt: new Date().toISOString(),
        status: 'in_progress',
        currentStep: template.steps[0].id,
        progress: 0,
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        context
      }
      setWorkflows(prev => [newWorkflow, ...prev])
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔄 Workflows Automatisés
        </h1>
        <p className="text-gray-600">
          Gestion intelligente des processus de maintenance et rapports
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
            { id: 'active', label: 'Workflows Actifs', icon: Activity },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => {
            const IconComponent = tab.icon
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

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Métriques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Workflows Actifs</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {workflows.filter(w => w.status === 'in_progress').length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Terminés Aujourd'hui</p>
                  <p className="text-3xl font-bold text-green-600">
                    {workflows.filter(w => w.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Temps Moyen</p>
                  <p className="text-3xl font-bold text-purple-600">2.5h</p>
                </div>
                <Timer className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Automatisation</p>
                  <p className="text-3xl font-bold text-yellow-600">85%</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">🚀 Actions Rapides</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => triggerWorkflow('maintenance-report', {
                  projectId: 'PRJ-001',
                  clientName: 'IT Solutions SARL',
                  technicianId: 'TECH-001'
                })}
                className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors group"
              >
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-blue-900">Rapport Maintenance</h3>
                  <p className="text-sm text-blue-700">Déclencher workflow automatique</p>
                </div>
                <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => triggerWorkflow('incident-response', {
                  severity: 'high',
                  location: 'Site Client'
                })}
                className="flex items-center space-x-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors group"
              >
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-red-900">Incident Critique</h3>
                  <p className="text-sm text-red-700">Déclencher réponse d'urgence</p>
                </div>
                <ArrowRight className="h-5 w-5 text-red-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => triggerWorkflow('monthly-reporting')}
                className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-colors group"
              >
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-green-900">Rapport Mensuel</h3>
                  <p className="text-sm text-green-700">Génération automatique</p>
                </div>
                <ArrowRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Workflows récents */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">📋 Workflows Récents</h2>
            
            <div className="space-y-4">
              {workflows.slice(0, 3).map((workflow) => {
                const template = templates.find(t => t.id === workflow.templateId)
                return (
                  <div key={workflow.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        workflow.status === 'completed' ? 'bg-green-100' :
                        workflow.status === 'in_progress' ? 'bg-blue-100' :
                        'bg-gray-100'
                      }`}>
                        <Workflow className={`h-6 w-6 ${
                          workflow.status === 'completed' ? 'text-green-600' :
                          workflow.status === 'in_progress' ? 'text-blue-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">{template?.name}</h3>
                        <p className="text-sm text-gray-600">{workflow.clientName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(workflow.status)}`}>
                            {workflow.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(workflow.startedAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{workflow.progress}%</div>
                      <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${workflow.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Templates de Workflow</h2>
            <button
              onClick={() => setIsCreatingTemplate(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-gray-600 text-sm">{template.description}</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-100 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Étapes:</span>
                    <span className="font-medium">{template.steps.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Automatiques:</span>
                    <span className="font-medium text-green-600">
                      {template.steps.filter(s => s.type === 'automatic').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Approbations:</span>
                    <span className="font-medium text-orange-600">
                      {template.steps.filter(s => s.type === 'approval').length}
                    </span>
                  </div>
                </div>

                {/* Timeline des étapes */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 text-sm">Flux de processus</h4>
                  <div className="space-y-2">
                    {template.steps.slice(0, 3).map((step, index) => (
                      <div key={step.id} className="flex items-center space-x-3">
                        {getStepIcon(step.type, 'pending')}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{step.title}</div>
                          <div className="text-xs text-gray-500">{step.type} • {formatDuration(step.duration || 0)}</div>
                        </div>
                      </div>
                    ))}
                    {template.steps.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{template.steps.length - 3} étapes supplémentaires
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => triggerWorkflow(template.id)}
                  className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Démarrer Workflow</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflows actifs */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Workflows Actifs</h2>
          
          {workflows.filter(w => w.status === 'in_progress').length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun workflow actif</h3>
              <p className="text-gray-600">Démarrez un nouveau workflow depuis les templates</p>
            </div>
          ) : (
            <div className="space-y-6">
              {workflows.filter(w => w.status === 'in_progress').map((workflow) => {
                const template = templates.find(t => t.id === workflow.templateId)
                const currentStepIndex = template?.steps.findIndex(s => s.id === workflow.currentStep) || 0
                
                return (
                  <div key={workflow.id} className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{template?.name}</h3>
                        <p className="text-gray-600">{workflow.clientName} • {workflow.projectId}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{workflow.progress}%</div>
                        <div className="text-sm text-gray-500">
                          ETA: {new Date(workflow.estimatedCompletion).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    {/* Progress timeline */}
                    <div className="space-y-4">
                      {template?.steps.map((step, index) => {
                        const isActive = step.id === workflow.currentStep
                        const isCompleted = index < currentStepIndex
                        const isPending = index > currentStepIndex
                        
                        return (
                          <div key={step.id} className={`flex items-center space-x-4 p-4 rounded-lg ${
                            isActive ? 'bg-blue-50 border border-blue-200' :
                            isCompleted ? 'bg-green-50' :
                            'bg-gray-50'
                          }`}>
                            <div className="flex-shrink-0">
                              {getStepIcon(step.type, isCompleted ? 'completed' : isActive ? 'in_progress' : 'pending')}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{step.title}</h4>
                                <div className="flex items-center space-x-2">
                                  {step.assignee && (
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                      {step.assignee}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {formatDuration(step.duration || 0)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">{step.description}</p>
                              
                              {step.automationRules && step.automationRules.length > 0 && (
                                <div className="mt-2 text-xs text-purple-600">
                                  🤖 {step.automationRules.length} règles d'automatisation
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Performance</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gain de temps */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Gain de Temps</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rapport manuel (avant):</span>
                  <span className="font-semibold text-red-600">45 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Workflow automatisé:</span>
                  <span className="font-semibold text-green-600">5 min</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">Gain par rapport:</span>
                    <span className="text-2xl font-bold text-blue-600">89%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROI */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">💰 ROI Mensuel</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Temps économisé:</span>
                  <span className="font-semibold">40h/mois</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Coût horaire technicien:</span>
                  <span className="font-semibold">8,000 FCFA</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">Économies mensuelles:</span>
                    <span className="text-2xl font-bold text-green-600">320,000 FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Métriques de performance */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">📊 Métriques de Performance</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
                <div className="text-sm text-gray-600">Automatisation</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">99.2%</div>
                <div className="text-sm text-gray-600">Taux de succès</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">2.1h</div>
                <div className="text-sm text-gray-600">Temps moyen</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">4.8/5</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}