'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Calendar, 
  FileText, 
  Users, 
  Shield, 
  Settings, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MessageCircle,
  Phone,
  MapPin,
  Zap,
  Bell,
  LogOut,
  ChevronRight,
  TrendingUp,
  Target,
  DollarSign,
  Activity,
  Layers,
  GitBranch,
  FileCheck,
  Camera,
  Wrench,
  Star,
  Filter,
  Search,
  Plus,
  Edit3,
  Send,
  Archive,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  Paperclip,
  Calendar as CalendarIcon,
  PieChart,
  Package,
  Wifi,
  Home
} from 'lucide-react'
import dynamic from 'next/dynamic'
import NotificationCenter from './NotificationCenter'
import Image from 'next/image'
const ClientReportsView = dynamic(() => import('./ClientReportsView'), { ssr: false, loading: () => <div className="text-gray-500">Chargement des rapports…</div> })
const ClientInvoicesView = dynamic(() => import('./ClientInvoicesView'), { ssr: false, loading: () => <div className="text-gray-500">Chargement des factures…</div> })
const TicketsPanel = dynamic(() => import('./TicketsPanel'), { ssr: false, loading: () => <div className="text-gray-500">Chargement des demandes…</div> })
const WorkflowMiniPanel = dynamic(() => import('./WorkflowMiniPanel'), { ssr: false, loading: () => <div className="text-gray-500">Chargement du workflow…</div> })

interface EnhancedProjectPortalProps {
  projectId: string
  accessCode: string
  onLogout: () => void
}

export default function EnhancedProjectPortal({ projectId, accessCode, onLogout }: EnhancedProjectPortalProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [projectData, setProjectData] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [feedbackRating, setFeedbackRating] = useState<number>(0)
  const [feedbackComment, setFeedbackComment] = useState<string>('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false)
  const [feedbackAvg, setFeedbackAvg] = useState<{avg:number,count:number}|null>(null)
  
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/login', { credentials: 'include' })
        if (r.ok) {
          const j = await r.json()
          const role = String(j.user?.role || '').toUpperCase()
          setUserRole(role)
          if (role === 'CLIENT') setActiveTab('timeline')
        }
      } catch {}
    })()
  }, [])

  // Charger moyenne satisfaction pour le technicien du projet
  useEffect(() => {
    (async () => {
      try {
        const techName = projectData?.project?.technician
        if (!techName) return
        // Dans cet exemple, on utilise le nom comme identifiant logique
        const res = await fetch(`/api/feedback?technicianId=${encodeURIComponent(techName)}&mode=stats`, { credentials: 'include' })
        if (res.ok) {
          const j = await res.json()
          setFeedbackAvg({ avg: j.avgRating || 0, count: j.count || 0 })
        }
      } catch {}
    })()
  }, [projectData?.project?.technician])

  function getNavTabs() {
    const common = [
      { id: 'timeline', label: 'Timeline', icon: GitBranch },
    ] as const
    if (userRole === 'CLIENT') {
      return [
        ...common,
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'communications', label: 'Communications', icon: MessageCircle },
        { id: 'invoices', label: 'Mes Factures', icon: FileCheck },
      ]
    }
    return [
      ...common,
      { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
      { id: 'tasks', label: 'Tâches & Planning', icon: Calendar },
      { id: 'communications', label: 'Communications', icon: MessageCircle },
      { id: 'documents', label: 'Documents', icon: FileText },
      { id: 'photos', label: 'Photos', icon: Camera },
      { id: 'plans', label: 'Plans', icon: Layers },
      { id: 'financial', label: 'Financier', icon: DollarSign },
      { id: 'invoices', label: 'Mes Factures', icon: FileCheck },
      { id: 'team', label: 'Équipe', icon: Users },
      { id: 'equipment', label: 'Équipements', icon: Package },
      { id: 'reports', label: 'Mes Rapports', icon: FileText },
    ]
  }

  function buildTimeline(p: any) {
    const events: Array<{ title: string; description: string; date: string; icon: any; iconColor: string; color: string; tags?: string[] }> = []
    // Devis
    events.push({
      title: 'Devis envoyé',
      description: 'Devis initial transmis au client',
      date: new Date(p.metrics?.timeEstimated ? p.project.startDate : p.project.startDate).toLocaleDateString('fr-FR'),
      icon: FileText,
      iconColor: 'text-blue-600',
      color: 'bg-blue-500',
      tags: ['Devis', 'PDF']
    })
    events.push({
      title: 'Devis signé',
      description: 'E‑signature complétée par le client',
      date: new Date(p.project.startDate).toLocaleDateString('fr-FR'),
      icon: CheckCircle,
      iconColor: 'text-green-600',
      color: 'bg-green-500',
      tags: ['E‑signature']
    })
    // Installation
    events.push({
      title: 'Installation démarrée',
      description: p.project.description,
      date: new Date(p.project.startDate).toLocaleDateString('fr-FR'),
      icon: Wrench,
      iconColor: 'text-emerald-600',
      color: 'bg-emerald-500',
      tags: ['Équipements', String(p.metrics?.tasksTotal || '')]
    })
    // Validation technique
    events.push({
      title: 'Validation technique',
      description: 'Tests finaux et conformité',
      date: new Date(p.project.endDate || p.project.startDate).toLocaleDateString('fr-FR'),
      icon: FileCheck,
      iconColor: 'text-purple-600',
      color: 'bg-purple-500',
      tags: ['Rapport', 'Photos']
    })
    // Mise en production / Livraison
    events.push({
      title: 'Livraison & formation',
      description: 'Mise en service et formation utilisateurs',
      date: new Date(p.project.endDate || p.project.startDate).toLocaleDateString('fr-FR'),
      icon: Target,
      iconColor: 'text-orange-600',
      color: 'bg-orange-500',
      tags: ['PV de réception']
    })
    // Maintenance planifiée
    if (p.project.nextMaintenance) {
      events.push({
        title: 'Maintenance planifiée',
        description: 'Prochaine visite de maintenance',
        date: new Date(p.project.nextMaintenance).toLocaleDateString('fr-FR'),
        icon: CalendarIcon,
        iconColor: 'text-teal-600',
        color: 'bg-teal-500',
        tags: ['Préventif']
      })
    }
    return events
  }

  // Données projet enrichies avec gestion de projet avancée
  const projectsDatabase: Record<string, any> = {
    'PRJ-001': {
      client: {
        name: "Amadou Ba",
        company: "IT Solutions SARL",
        email: "amadou.ba@itsolutions.sn",
        phone: "+221 77 123 45 67",
        address: "Parcelles Assainies, Unité 25, Dakar",
        contact_person: "Amadou Ba",
        role: "Directeur IT"
      },
      project: {
        title: "Installation vidéosurveillance siège",
        description: "Système complet de vidéosurveillance 16 caméras 4K avec NVR et monitoring",
        status: "completed",
        progress: 100,
        startDate: "2024-01-15",
        endDate: "2024-01-20",
        value: "2,450,000 FCFA",
        technician: "Moussa Diop",
        projectManager: "Ibrahima Sall",
        warranty: "2 ans",
        type: "Vidéosurveillance",
        priority: "high",
        satisfaction: 4.8,
        nextMaintenance: "2024-04-15"
      },
      metrics: {
        tasksCompleted: 28,
        tasksTotal: 28,
        budgetUsed: 2450000,
        budgetTotal: 2450000,
        timeSpent: 120, // heures
        timeEstimated: 120,
        qualityScore: 95,
        clientSatisfaction: 4.8
      },
      tasks: [
        {
          id: 1,
          title: "Étude technique et devis",
          description: "Analyse des besoins et proposition technique",
          assignee: "Moussa Diop",
          status: "completed",
          priority: "high",
          startDate: "2024-01-10",
          endDate: "2024-01-12",
          completedDate: "2024-01-12",
          progress: 100,
          category: "planning",
          dependencies: [],
          attachments: ["etude_technique.pdf", "devis_detaille.pdf"]
        },
        {
          id: 2,
          title: "Commande équipements",
          description: "Commande caméras Hikvision et NVR",
          assignee: "Ibrahima Sall",
          status: "completed",
          priority: "high",
          startDate: "2024-01-12",
          endDate: "2024-01-14",
          completedDate: "2024-01-14",
          progress: 100,
          category: "procurement",
          dependencies: [1],
          attachments: ["bon_commande.pdf"]
        },
        {
          id: 3,
          title: "Installation caméras extérieures",
          description: "Pose et câblage 16 caméras périmètre",
          assignee: "Équipe Technique",
          status: "completed",
          priority: "high",
          startDate: "2024-01-16",
          endDate: "2024-01-17",
          completedDate: "2024-01-17",
          progress: 100,
          category: "installation",
          dependencies: [2],
          attachments: ["photos_installation.zip"]
        },
        {
          id: 4,
          title: "Configuration NVR et tests",
          description: "Paramétrage système et tests enregistrement",
          assignee: "Moussa Diop",
          status: "completed",
          priority: "medium",
          startDate: "2024-01-17",
          endDate: "2024-01-18",
          completedDate: "2024-01-18",
          progress: 100,
          category: "configuration",
          dependencies: [3],
          attachments: ["config_nvr.pdf"]
        },
        {
          id: 5,
          title: "Formation équipe sécurité",
          description: "Formation utilisateurs et remise documentation",
          assignee: "Moussa Diop",
          status: "completed",
          priority: "medium",
          startDate: "2024-01-19",
          endDate: "2024-01-20",
          completedDate: "2024-01-20",
          progress: 100,
          category: "training",
          dependencies: [4],
          attachments: ["manuel_utilisateur.pdf", "certificat_formation.pdf"]
        }
      ],
      communications: [
        {
          id: 1,
          from: "Moussa Diop",
          to: "Amadou Ba",
          message: "Installation terminée avec succès. Système opérationnel 24h/24.",
          timestamp: "2024-01-20 16:30",
          type: "project_update",
          attachments: ["rapport_final.pdf"],
          read: true
        },
        {
          id: 2,
          from: "Amadou Ba",
          to: "Moussa Diop",
          message: "Excellent travail ! Équipe très professionnelle.",
          timestamp: "2024-01-20 17:45",
          type: "feedback",
          attachments: [],
          read: true
        }
      ],
      financial: {
        totalAmount: 2450000,
        paidAmount: 2450000,
        pendingAmount: 0,
        invoices: [
          {
            id: "INV-001",
            amount: 1225000,
            description: "Acompte 50% - Équipements",
            status: "paid",
            dueDate: "2024-01-15",
            paidDate: "2024-01-14"
          },
          {
            id: "INV-002",
            amount: 1225000,
            description: "Solde final - Installation",
            status: "paid",
            dueDate: "2024-01-25",
            paidDate: "2024-01-22"
          }
        ]
      },
      risks: [
        {
          id: 1,
          title: "Câblage externe",
          description: "Protection câbles contre intempéries",
          impact: "medium",
          probability: "low",
          status: "mitigated",
          mitigation: "Gaines étanches IP67 installées"
        }
      ]
    },
    'PRJ-002': {
      client: {
        name: "Aïssatou Diop",
        company: "Commerce Plus",
        email: "aissatou.diop@commerceplus.sn",
        phone: "+221 77 234 56 78",
        address: "Plateau, Avenue Roume, Dakar",
        contact_person: "Aïssatou Diop",
        role: "Directrice Générale"
      },
      project: {
        title: "Maintenance préventive Q1 2024",
        description: "Programme de maintenance trimestrielle incluant vérification complète des équipements",
        status: "in_progress",
        progress: 75,
        startDate: "2024-01-01",
        endDate: "2024-03-31",
        value: "850,000 FCFA",
        technician: "Moussa Diop",
        projectManager: "Ibrahima Sall",
        warranty: "Inclus dans contrat",
        type: "Maintenance",
        priority: "medium",
        satisfaction: 4.5,
        nextMaintenance: "2024-04-01"
      },
      metrics: {
        tasksCompleted: 18,
        tasksTotal: 24,
        budgetUsed: 637500,
        budgetTotal: 850000,
        timeSpent: 45,
        timeEstimated: 60,
        qualityScore: 92,
        clientSatisfaction: 4.5
      },
      tasks: [
        {
          id: 1,
          title: "Inspection système vidéosurveillance",
          description: "Vérification complète des caméras et NVR",
          assignee: "Moussa Diop",
          status: "completed",
          priority: "high",
          startDate: "2024-01-15",
          endDate: "2024-01-16",
          completedDate: "2024-01-16",
          progress: 100,
          category: "inspection",
          dependencies: [],
          attachments: ["rapport_inspection.pdf"]
        },
        {
          id: 2,
          title: "Mise à jour firmware caméras",
          description: "Mise à jour de sécurité firmware",
          assignee: "Équipe Technique",
          status: "completed",
          priority: "medium",
          startDate: "2024-01-17",
          endDate: "2024-01-18",
          completedDate: "2024-01-18",
          progress: 100,
          category: "update",
          dependencies: [1],
          attachments: []
        },
        {
          id: 3,
          title: "Nettoyage optiques caméras",
          description: "Nettoyage et réglage des caméras extérieures",
          assignee: "Équipe Technique",
          status: "in_progress",
          priority: "medium",
          startDate: "2024-02-01",
          endDate: "2024-02-05",
          progress: 60,
          category: "maintenance",
          dependencies: [],
          attachments: []
        }
      ],
      communications: [
        {
          id: 1,
          from: "Moussa Diop",
          to: "Aïssatou Diop",
          message: "Inspection terminée. Quelques ajustements nécessaires sur 3 caméras.",
          timestamp: "2024-01-16 14:30",
          type: "project_update",
          attachments: ["rapport_inspection.pdf"],
          read: true
        }
      ],
      financial: {
        totalAmount: 850000,
        paidAmount: 425000,
        pendingAmount: 425000,
        invoices: [
          {
            id: "INV-003",
            amount: 425000,
            description: "Acompte 50% - Maintenance Q1",
            status: "paid",
            dueDate: "2024-01-10",
            paidDate: "2024-01-08"
          },
          {
            id: "INV-004",
            amount: 425000,
            description: "Solde - Maintenance Q1",
            status: "pending",
            dueDate: "2024-03-31",
            paidDate: null
          }
        ]
      },
      risks: []
    },
    'PRJ-003': {
      client: {
        name: "Moussa Kébé",
        company: "Résidence Almadies",
        email: "moussa.kebe@almadies.sn",
        phone: "+221 77 345 67 89",
        address: "Almadies, Zone 10, Dakar",
        contact_person: "Moussa Kébé",
        role: "Directeur Résidence"
      },
      project: {
        title: "Extension contrôle d'accès",
        description: "Installation de 4 nouveaux terminaux biométriques et badges RFID",
        status: "in_progress",
        progress: 45,
        startDate: "2024-02-01",
        endDate: "2024-02-28",
        value: "1,850,000 FCFA",
        technician: "Ousmane Sarr",
        projectManager: "Ibrahima Sall",
        warranty: "3 ans",
        type: "Contrôle d'Accès",
        priority: "high",
        satisfaction: 4.7,
        nextMaintenance: "2024-05-01"
      },
      metrics: {
        tasksCompleted: 7,
        tasksTotal: 15,
        budgetUsed: 832500,
        budgetTotal: 1850000,
        timeSpent: 35,
        timeEstimated: 80,
        qualityScore: 94,
        clientSatisfaction: 4.7
      },
      tasks: [
        {
          id: 1,
          title: "Étude d'intégration système existant",
          description: "Analyse de compatibilité avec le système actuel",
          assignee: "Ousmane Sarr",
          status: "completed",
          priority: "high",
          startDate: "2024-02-01",
          endDate: "2024-02-03",
          completedDate: "2024-02-03",
          progress: 100,
          category: "planning",
          dependencies: [],
          attachments: ["etude_integration.pdf"]
        },
        {
          id: 2,
          title: "Installation terminaux biométriques",
          description: "Pose de 4 terminaux biométriques aux entrées",
          assignee: "Équipe Technique",
          status: "in_progress",
          priority: "high",
          startDate: "2024-02-10",
          endDate: "2024-02-15",
          progress: 70,
          category: "installation",
          dependencies: [1],
          attachments: []
        },
        {
          id: 3,
          title: "Configuration badges RFID",
          description: "Programmation et distribution des badges résidents",
          assignee: "Ousmane Sarr",
          status: "pending",
          priority: "medium",
          startDate: "2024-02-16",
          endDate: "2024-02-20",
          progress: 0,
          category: "configuration",
          dependencies: [2],
          attachments: []
        }
      ],
      communications: [
        {
          id: 1,
          from: "Ousmane Sarr",
          to: "Moussa Kébé",
          message: "Installation des terminaux en cours. Livraison prévue dans les délais.",
          timestamp: "2024-02-12 10:15",
          type: "project_update",
          attachments: [],
          read: true
        }
      ],
      financial: {
        totalAmount: 1850000,
        paidAmount: 925000,
        pendingAmount: 925000,
        invoices: [
          {
            id: "INV-005",
            amount: 925000,
            description: "Acompte 50% - Contrôle d'accès",
            status: "paid",
            dueDate: "2024-02-05",
            paidDate: "2024-02-03"
          },
          {
            id: "INV-006",
            amount: 925000,
            description: "Solde - Contrôle d'accès",
            status: "pending",
            dueDate: "2024-02-28",
            paidDate: null
          }
        ]
      },
      risks: [
        {
          id: 1,
          title: "Compatibilité système",
          description: "Intégration avec l'ancien système",
          impact: "medium",
          probability: "low",
          status: "monitored",
          mitigation: "Tests d'intégration en cours"
        }
      ]
    }
  }

  useEffect(() => {
    const data = projectsDatabase[projectId as keyof typeof projectsDatabase]
    if (data) {
      setProjectData(data)
      // Simulation notifications temps réel
      setNotifications([
        {
          id: 1,
          title: "Maintenance programmée",
          message: "Visite de maintenance prévue le 15 avril 2024",
          type: "info",
          timestamp: "Il y a 2 heures",
          read: false
        }
      ])
    }
  }, [projectId])

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre projet...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100' 
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'blocked': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'pending': return <AlertTriangle className="h-4 w-4" />
      case 'blocked': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredTasks = projectData.tasks.filter((task: any) => {
    if (taskFilter === 'all') return true
    return task.status === taskFilter
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header amélioré avec notifications */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <span className="text-xl font-bold text-gray-900">IT Vision</span>
                  <span className="text-xs text-gray-500 block">Portail Client</span>
                </div>
              </div>
              <div className="hidden md:block h-6 w-px bg-gray-300"></div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900">{projectData.project.title}</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Projet {projectId}</span>
                  <span>•</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(projectData.project.status)}`}>
                    {projectData.project.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications (protégées par session) */}
              <NotificationCenter />
              
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{projectData.client.name}</p>
                <p className="text-xs text-gray-500">{projectData.client.company}</p>
              </div>
              
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors p-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:block">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation améliorée */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-gray-200">
            {getNavTabs().map((tab) => {
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
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenu selon l'onglet */}
        <div className="space-y-6">
          {/* Timeline Unifiée */}
          {activeTab === 'timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Timeline Projet</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-6">
                    {buildTimeline(projectData).map((evt, idx) => (
                      <div key={idx} className="relative pl-10">
                        <div className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full ${evt.color} ring-4 ring-white`} />
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <evt.icon className={`h-4 w-4 ${evt.iconColor}`} />
                              <h4 className="font-semibold text-gray-900">{evt.title}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{evt.description}</p>
                            {Array.isArray(evt.tags) && evt.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {evt.tags.map((t: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 whitespace-nowrap">{evt.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Documents & Plans</h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Devis signé</p>
                        <p className="text-xs text-gray-500">PDF • 245 KB</p>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Plan d'implantation</p>
                        <p className="text-xs text-gray-500">DWG • 1.8 MB</p>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-medium text-gray-900">Schéma de câblage</p>
                        <p className="text-xs text-gray-500">PDF • 890 KB</p>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-gray-400 group-hover:text-emerald-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Photos */}
          {activeTab === 'photos' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Galerie Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['/file.svg','/window.svg','/globe.svg','/file.svg','/window.svg','/globe.svg','/file.svg','/window.svg'].map((src, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border">
                    <Image src={src} alt="photo" width={320} height={128} className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plans */}
          {activeTab === 'plans' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Plans & Schémas</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                    <Layers className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Plan d'implantation (A1)</p>
                      <p className="text-xs text-gray-500">DWG • 1.8 MB</p>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </button>
                <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                    <Layers className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-gray-900">Schéma de câblage</p>
                      <p className="text-xs text-gray-500">PDF • 890 KB</p>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-gray-400 group-hover:text-emerald-600" />
                </button>
              </div>
            </div>
          )}

          

          {/* Dashboard Avancé */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Métriques clés */}
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Progression</p>
                      <p className="text-3xl font-bold text-green-600">{projectData.project.progress}%</p>
                    </div>
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${projectData.project.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tâches</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {projectData.metrics.tasksCompleted}/{projectData.metrics.tasksTotal}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Toutes terminées</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Budget</p>
                      <p className="text-3xl font-bold text-purple-600">100%</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Conforme budget</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Qualité</p>
                      <p className="text-3xl font-bold text-yellow-600">{projectData.metrics.qualityScore}%</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Score excellence</p>
                </div>
              </div>

              {/* Graphiques de performance */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Avancement du Projet</h3>
                
                {/* Simulation graphique temporel */}
                <div className="space-y-4">
                  {projectData.tasks.map((task: any, index: number) => (
                    <div key={task.id} className="flex items-center space-x-4">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{task.title}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(task.startDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions rapides améliorées + Workflow mini */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Actions & Communications</h3>
                
                <div className="space-y-3">
                  <a
                    href={`https://wa.me/221774133440?text=Bonjour, je suis ${projectData.client.name} (Projet ${projectId}). J'ai une question concernant mon projet.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group border border-green-200"
                  >
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <span className="font-medium text-green-800 block">Contact WhatsApp</span>
                        <span className="text-xs text-green-600">Support 24/7</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </a>
                  
                  <a href="/contact?tool=booking" className="flex items-center justify-between w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-6 w-6 text-blue-600" />
                      <div>
                        <span className="font-medium text-blue-800 block">Programmer RDV</span>
                        <span className="text-xs text-blue-600">Maintenance • Évolution</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </a>
                  
                  <button className="flex items-center justify-between w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group border border-purple-200">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="h-6 w-6 text-purple-600" />
                      <div>
                        <span className="font-medium text-purple-800 block">Demander Évolution</span>
                        <span className="text-xs text-purple-600">Extension • Amélioration</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Satisfaction client */}
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Votre Satisfaction</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-bold text-yellow-600">{(feedbackAvg?.avg || projectData.project.satisfaction).toFixed(1)}/5</span>
                      {feedbackAvg && (
                        <span className="text-xs text-gray-500 ml-2">({feedbackAvg.count})</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Merci pour votre retour positif !</p>
                </div>

                {/* Formulaire d'évaluation client */}
                {userRole === 'CLIENT' && (
                  <div className="mt-6 p-4 bg-white rounded-xl border">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-current mr-2" />
                      Évaluer notre intervention
                    </h4>
                    <div className="flex items-center mb-3">
                      {[1,2,3,4,5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFeedbackRating(n)}
                          className={`mr-1 ${feedbackRating >= n ? 'text-yellow-500' : 'text-gray-300'}`}
                          aria-label={`Note ${n}`}
                        >
                          <Star className={`h-6 w-6 ${feedbackRating >= n ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">{feedbackRating || 0}/5</span>
                    </div>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Votre commentaire (optionnel)"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        disabled={feedbackSubmitting || feedbackRating === 0}
                        onClick={async () => {
                          try {
                            setFeedbackSubmitting(true)
                            const res = await fetch('/api/feedback', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                projectId,
                                technicianId: projectData.project.technician,
                                rating: feedbackRating,
                                comment: feedbackComment
                              })
                            })
                            if (res.ok) {
                              setFeedbackComment('')
                              setFeedbackRating(0)
                              // Rafraîchir moyenne
                              try {
                                const s = await fetch(`/api/feedback?technicianId=${encodeURIComponent(projectData.project.technician)}&mode=stats`)
                                if (s.ok) {
                                  const j = await s.json()
                                  setFeedbackAvg({ avg: j.avgRating || 0, count: j.count || 0 })
                                }
                              } catch {}
                            }
                          } finally {
                            setFeedbackSubmitting(false)
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        {feedbackSubmitting ? 'Envoi...' : 'Envoyer mon évaluation'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Workflow Projet</h3>
                <WorkflowMiniPanel projectId={projectId} />
              </div>
            </div>
          )}

          {/* Gestion de Tâches Avancée */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Filtres et contrôles */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Gestion des Tâches</h2>
                  <div className="flex items-center space-x-4">
                    <select 
                      value={taskFilter}
                      onChange={(e) => setTaskFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Toutes les tâches</option>
                      <option value="completed">Terminées</option>
                      <option value="in_progress">En cours</option>
                      <option value="pending">En attente</option>
                    </select>
                  </div>
                </div>

                {/* Timeline des tâches */}
                <div className="space-y-4">
                  {filteredTasks.map((task: any, index: number) => (
                    <div key={task.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            task.status === 'completed' ? 'bg-green-500' :
                            task.status === 'in_progress' ? 'bg-blue-500' :
                            task.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                            <p className="text-gray-600 mb-3">{task.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Responsable:</span>
                                <p className="font-medium">{task.assignee}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Priorité:</span>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Début:</span>
                                <p className="font-medium">{new Date(task.startDate).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Fin:</span>
                                <p className="font-medium">{new Date(task.endDate).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Progression</span>
                          <span className="text-sm font-medium">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Fichiers attachés */}
                      {task.attachments && task.attachments.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {task.attachments.length} fichier(s) attaché(s)
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Communications améliorées (inclut Mes Demandes) */}
          {activeTab === 'communications' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Communications Projet</h2>
              
              {/* Zone de nouvelle communication */}
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Nouveau message</h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Send className="h-4 w-4" />
                    <span>Envoyer</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Historique communications */}
                <div className="lg:col-span-2">
                  <div className="space-y-4">
                    {projectData.communications.map((comm: any) => (
                      <div key={comm.id} className="flex space-x-4 p-4 hover:bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {comm.from.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{comm.from}</span>
                            <span className="text-sm text-gray-500">{comm.timestamp}</span>
                          </div>
                          <p className="text-gray-700 mb-2">{comm.message}</p>
                          {comm.attachments.length > 0 && (
                            <div className="flex items-center space-x-2 text-sm text-blue-600">
                              <Paperclip className="h-4 w-4" />
                              <span>{comm.attachments.length} fichier(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mes Demandes (tickets) */}
                <div className="bg-white rounded-2xl border p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes Demandes</h3>
                  <TicketsPanel projectId={projectId} />
                  <div className="mt-4 text-xs text-gray-600">
                    SLA: alertes 2h avant échéance et à dépassement.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Financière */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Résumé financier */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé Financier</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant total:</span>
                      <span className="font-semibold text-green-600">
                        {projectData.financial.totalAmount.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payé:</span>
                      <span className="font-semibold text-green-600">
                        {projectData.financial.paidAmount.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Solde:</span>
                      <span className="font-semibold text-gray-900">
                        {projectData.financial.pendingAmount.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Graphique camembert simulation */}
                <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Coûts</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-sm">Équipements (60%)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-sm">Installation (30%)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-sm">Configuration (10%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Factures */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Factures</h3>
                <div className="space-y-3">
                  {projectData.financial.invoices.map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{invoice.description}</p>
                        <p className="text-sm text-gray-500">{invoice.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {invoice.amount.toLocaleString()} FCFA
                        </p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status === 'paid' ? 'Payée' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section Mes Factures */}
          {activeTab === 'invoices' && (
            <ClientInvoicesView 
              clientId={projectData.client.company === 'IT Solutions SARL' ? 'CLI-001' : 
                        projectData.client.company === 'Commerce Plus' ? 'CLI-002' : 'CLI-001'}
            />
          )}

          {/* Section Mes Rapports */}
          {activeTab === 'reports' && (
            <ClientReportsView 
              clientId={projectData.client.company === 'IT Solutions SARL' ? 'CLI-001' : 
                        projectData.client.company === 'Commerce Plus' ? 'CLI-002' : 'CLI-001'}
              clientName={projectData.client.name}
              clientCompany={projectData.client.company}
            />
          )}

          {/* Section Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Documents du Projet</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contrats et devis */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      Contrats & Devis
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">Devis initial</p>
                            <p className="text-xs text-gray-500">PDF • 245 KB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">Contrat signé</p>
                            <p className="text-xs text-gray-500">PDF • 312 KB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    </div>
                  </div>

                  {/* Documents techniques */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-purple-600" />
                      Documentation Technique
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-900">Manuel d'utilisation</p>
                            <p className="text-xs text-gray-500">PDF • 1.2 MB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="font-medium text-gray-900">Schémas d'installation</p>
                            <p className="text-xs text-gray-500">PDF • 890 KB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium text-gray-900">Certificat de garantie</p>
                            <p className="text-xs text-gray-500">PDF • 156 KB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    </div>
                  </div>

                  {/* Photos et médias */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Camera className="h-5 w-5 mr-2 text-indigo-600" />
                      Photos & Médias
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <Camera className="h-5 w-5 text-indigo-600" />
                          <div>
                            <p className="font-medium text-gray-900">Photos avant installation</p>
                            <p className="text-xs text-gray-500">ZIP • 4.5 MB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <Camera className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">Photos après installation</p>
                            <p className="text-xs text-gray-500">ZIP • 5.2 MB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    </div>
                  </div>

                  {/* Rapports */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <FileCheck className="h-5 w-5 mr-2 text-teal-600" />
                      Rapports & Certificats
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <FileCheck className="h-5 w-5 text-teal-600" />
                          <div>
                            <p className="font-medium text-gray-900">Rapport de conformité</p>
                            <p className="text-xs text-gray-500">PDF • 678 KB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <Star className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="font-medium text-gray-900">Certificat de formation</p>
                            <p className="text-xs text-gray-500">PDF • 234 KB</p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Équipe */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Équipe Projet</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Chef de projet */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xl">IS</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{projectData.project.projectManager}</h3>
                        <p className="text-sm text-gray-600">Chef de Projet</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>+221 77 123 45 67</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        <span>ibrahima.sall@itvision.sn</span>
                      </div>
                    </div>
                    <button className="mt-4 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contacter
                    </button>
                  </div>

                  {/* Technicien principal */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xl">MD</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{projectData.project.technician}</h3>
                        <p className="text-sm text-gray-600">Technicien Principal</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>+221 77 413 34 40</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        <span>moussa.diop@itvision.sn</span>
                      </div>
                    </div>
                    <button className="mt-4 w-full bg-green-50 hover:bg-green-100 text-green-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contacter
                    </button>
                  </div>

                  {/* Support technique */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Support IT Vision</h3>
                        <p className="text-sm text-gray-600">Assistance 24/7</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>+221 77 413 34 40</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        <span>support@itvision.sn</span>
                      </div>
                    </div>
                    <button className="mt-4 w-full bg-orange-50 hover:bg-orange-100 text-orange-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Appeler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Équipements Installés */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Équipements Installés</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Package className="h-5 w-5" />
                    <span>Inventaire complet</span>
                  </div>
                </div>
                
                {/* Résumé par catégorie */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Vidéosurveillance</span>
                      <Camera className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">18</p>
                    <p className="text-xs text-blue-700 mt-1">Hikvision - 16 caméras + 1 NVR</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900">Domotique</span>
                      <Home className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">12</p>
                    <p className="text-xs text-green-700 mt-1">Zigbee - Hub + capteurs</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-900">Contrôle d'Accès</span>
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">4</p>
                    <p className="text-xs text-purple-700 mt-1">Dahua - Terminaux biométriques</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-900">Réseau</span>
                      <Wifi className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-600">8</p>
                    <p className="text-xs text-orange-700 mt-1">Switches + câblage</p>
                  </div>
                </div>

                {/* État des caméras */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">État des Caméras</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 16 }, (_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Camera className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-900">CAM {i + 1}</span>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Graphiques de performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                      Activité Réseau (24h)
                    </h3>
                    <div className="space-y-2">
                      {['00h-06h', '06h-12h', '12h-18h', '18h-24h'].map((period, index) => {
                        const usage = [45, 75, 90, 65][index]
                        return (
                          <div key={period}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600">{period}</span>
                              <span className="text-sm font-medium text-gray-900">{usage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${usage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                      Utilisation Stockage
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Enregistrements</span>
                        <span className="text-sm font-medium text-gray-900">2.8 TB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Archives</span>
                        <span className="text-sm font-medium text-gray-900">0.4 TB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Disponible</span>
                        <span className="text-sm font-medium text-green-600">1.8 TB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                        <div className="bg-purple-600 h-3 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alertes et événements */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-yellow-600" />
                    Événements Récents
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Système opérationnel</p>
                        <p className="text-xs text-green-700">Toutes les caméras fonctionnent normalement</p>
                        <p className="text-xs text-green-600 mt-1">Il y a 2 minutes</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Maintenance préventive</p>
                        <p className="text-xs text-blue-700">Prochaine visite programmée: 15 avril 2024</p>
                        <p className="text-xs text-blue-600 mt-1">Dans 30 jours</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}