'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  Package, 
  Truck, 
  Settings, 
  Eye, 
  Send, 
  Wrench, 
  Target, 
  Star, 
  Bell, 
  MessageCircle, 
  CreditCard, 
  Building, 
  Phone, 
  Mail, 
  MapPin,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  Layers,
  GitBranch,
  Zap,
  Award,
  Archive
} from 'lucide-react'

interface WorkflowStep {
  id: string
  name: string
  description: string
  type: 'validation' | 'payment' | 'delivery' | 'installation' | 'test' | 'training' | 'approval' | 'notification'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'delayed'
  assignedTo?: string
  dueDate: string
  dependencies: string[]
  deliverables: string[]
  documents: Document[]
  notifications: NotificationRule[]
  autoTriggers: AutoTrigger[]
  conditions: StepCondition[]
  estimatedDuration: number // en heures
  actualDuration?: number
  completedDate?: string
  completedBy?: string
  notes?: string
  clientVisible: boolean
  blockingForNext: boolean
}

interface AutoTrigger {
  id: string
  triggerType: 'time_based' | 'condition_based' | 'external_event'
  condition: string
  action: 'notify' | 'advance_step' | 'create_task' | 'send_email' | 'update_status'
  delay?: number // délai en heures
  target?: string
  isActive: boolean
}

interface NotificationRule {
  id: string
  triggerEvent: 'step_start' | 'step_complete' | 'step_overdue' | 'step_blocked'
  recipients: string[]
  channel: 'email' | 'sms' | 'whatsapp' | 'portal' | 'all'
  template: string
  delay?: number
  isActive: boolean
}

interface StepCondition {
  id: string
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'exists'
  value: string
  required: boolean
}

interface Document {
  id: string
  name: string
  type: string
  required: boolean
  template?: string
  uploadedAt?: string
  uploadedBy?: string
  approved: boolean
}

interface ProjectWorkflow {
  id: string
  projectId: string
  serviceType: string
  currentStep: string
  progress: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  steps: WorkflowStep[]
  startDate: string
  estimatedEndDate: string
  actualEndDate?: string
  delays: Delay[]
  escalations: Escalation[]
  analytics: WorkflowAnalytics
}

interface Delay {
  id: string
  stepId: string
  reason: string
  duration: number // en heures
  impact: 'low' | 'medium' | 'high'
  mitigation?: string
  resolvedAt?: string
}

interface Escalation {
  id: string
  stepId: string
  level: number
  escalatedTo: string
  reason: string
  escalatedAt: string
  resolvedAt?: string
  resolution?: string
}

interface WorkflowAnalytics {
  totalSteps: number
  completedSteps: number
  delayedSteps: number
  averageStepDuration: number
  onTimeDelivery: number
  clientSatisfaction?: number
  teamEfficiency: number
}

interface WorkflowTemplate {
  id: string
  name: string
  serviceType: string
  description: string
  estimatedDuration: number
  complexity: 'simple' | 'medium' | 'complex'
  steps: WorkflowStep[]
  successMetrics: string[]
  commonRisks: string[]
}

export default function WorkflowEngine() {
  const [workflows, setWorkflows] = useState<ProjectWorkflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<ProjectWorkflow | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  const [showStepDetail, setShowStepDetail] = useState(false)
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null)

  // Templates de workflow par service
  useEffect(() => {
    setTemplates([
      {
        id: 'visiophonie_workflow',
        name: 'Workflow Visiophonie',
        serviceType: 'visiophonie',
        description: 'Processus complet d\'installation visiophonie',
        estimatedDuration: 120, // 120 heures = 15 jours ouvrés
        complexity: 'medium',
        successMetrics: ['Délai respecté', 'Aucun défaut', 'Formation dispensée', 'Client satisfait'],
        commonRisks: ['Retard livraison', 'Complexité câblage', 'Indisponibilité client'],
        steps: [
          {
            id: 'initial_contact',
            name: 'Contact initial',
            description: 'Premier contact avec le client et qualification du besoin',
            type: 'validation',
            status: 'pending',
            dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            dependencies: [],
            deliverables: ['Fiche de qualification', 'RDV planifié'],
            documents: [
              { id: 'qual_form', name: 'Fiche qualification', type: 'form', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'contact_notif',
                triggerEvent: 'step_start',
                recipients: ['commercial@itvision.sn'],
                channel: 'email',
                template: 'nouveau_prospect',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'auto_followup',
                triggerType: 'time_based',
                condition: 'no_response_24h',
                action: 'send_email',
                delay: 24,
                target: 'client',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'client_interested',
                field: 'qualification_score',
                operator: 'greater_than',
                value: '7',
                required: true
              }
            ],
            estimatedDuration: 2,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'site_visit',
            name: 'Visite technique',
            description: 'Évaluation technique du site et définition des besoins',
            type: 'validation',
            status: 'pending',
            dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['initial_contact'],
            deliverables: ['Rapport de visite', 'Plan d\'installation', 'Liste matériel'],
            documents: [
              { id: 'site_report', name: 'Rapport de visite', type: 'technical', required: true, approved: false },
              { id: 'install_plan', name: 'Plan d\'installation', type: 'technical', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'visit_scheduled',
                triggerEvent: 'step_start',
                recipients: ['technique@itvision.sn', 'client'],
                channel: 'all',
                template: 'visite_programmee',
                isActive: true
              },
              {
                id: 'visit_completed',
                triggerEvent: 'step_complete',
                recipients: ['commercial@itvision.sn'],
                channel: 'email',
                template: 'visite_terminee',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'prepare_quote',
                triggerType: 'condition_based',
                condition: 'site_approved',
                action: 'advance_step',
                target: 'quote_preparation',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'site_accessible',
                field: 'site_access',
                operator: 'equals',
                value: 'ok',
                required: true
              },
              {
                id: 'technical_feasible',
                field: 'technical_feasibility',
                operator: 'equals',
                value: 'yes',
                required: true
              }
            ],
            estimatedDuration: 4,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'quote_preparation',
            name: 'Préparation devis',
            description: 'Élaboration du devis détaillé',
            type: 'validation',
            status: 'pending',
            dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['site_visit'],
            deliverables: ['Devis détaillé', 'Spécifications techniques', 'Planning prévisionnel'],
            documents: [
              { id: 'detailed_quote', name: 'Devis détaillé', type: 'quote', required: true, approved: false },
              { id: 'tech_specs', name: 'Spécifications techniques', type: 'technical', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'quote_ready',
                triggerEvent: 'step_complete',
                recipients: ['commercial@itvision.sn'],
                channel: 'email',
                template: 'devis_pret',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'send_quote_auto',
                triggerType: 'condition_based',
                condition: 'quote_approved_internal',
                action: 'advance_step',
                target: 'quote_sending',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'margin_acceptable',
                field: 'profit_margin',
                operator: 'greater_than',
                value: '25',
                required: true
              }
            ],
            estimatedDuration: 8,
            clientVisible: false,
            blockingForNext: true
          },
          {
            id: 'quote_sending',
            name: 'Envoi devis',
            description: 'Transmission du devis au client',
            type: 'notification',
            status: 'pending',
            dueDate: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['quote_preparation'],
            deliverables: ['Devis envoyé', 'Accusé de réception'],
            documents: [
              { id: 'sent_quote', name: 'Devis envoyé', type: 'quote', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'quote_sent_client',
                triggerEvent: 'step_start',
                recipients: ['client'],
                channel: 'all',
                template: 'devis_envoye',
                isActive: true
              },
              {
                id: 'followup_reminder',
                triggerEvent: 'step_start',
                recipients: ['commercial@itvision.sn'],
                channel: 'email',
                template: 'relance_devis',
                delay: 72,
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'auto_followup_quote',
                triggerType: 'time_based',
                condition: 'no_response_3_days',
                action: 'notify',
                delay: 72,
                target: 'commercial',
                isActive: true
              }
            ],
            conditions: [],
            estimatedDuration: 1,
            clientVisible: true,
            blockingForNext: false
          },
          {
            id: 'quote_negotiation',
            name: 'Négociation',
            description: 'Négociation et ajustements du devis',
            type: 'validation',
            status: 'pending',
            dueDate: new Date(Date.now() + 13 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['quote_sending'],
            deliverables: ['Accord commercial', 'Devis final'],
            documents: [
              { id: 'final_quote', name: 'Devis final', type: 'quote', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'negotiation_update',
                triggerEvent: 'step_complete',
                recipients: ['direction@itvision.sn'],
                channel: 'email',
                template: 'accord_commercial',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'prepare_contract',
                triggerType: 'condition_based',
                condition: 'quote_accepted',
                action: 'advance_step',
                target: 'contract_signature',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'client_agreement',
                field: 'client_approval',
                operator: 'equals',
                value: 'yes',
                required: true
              }
            ],
            estimatedDuration: 6,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'contract_signature',
            name: 'Signature contrat',
            description: 'Signature du contrat et acompte',
            type: 'approval',
            status: 'pending',
            dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['quote_negotiation'],
            deliverables: ['Contrat signé', 'Acompte reçu'],
            documents: [
              { id: 'signed_contract', name: 'Contrat signé', type: 'contract', required: true, approved: false },
              { id: 'payment_proof', name: 'Preuve paiement acompte', type: 'payment', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'contract_signed',
                triggerEvent: 'step_complete',
                recipients: ['equipe@itvision.sn'],
                channel: 'all',
                template: 'projet_demarre',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'start_procurement',
                triggerType: 'condition_based',
                condition: 'payment_received',
                action: 'advance_step',
                target: 'material_ordering',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'contract_valid',
                field: 'contract_status',
                operator: 'equals',
                value: 'signed',
                required: true
              },
              {
                id: 'payment_received',
                field: 'advance_payment',
                operator: 'equals',
                value: 'received',
                required: true
              }
            ],
            estimatedDuration: 2,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'material_ordering',
            name: 'Commande matériel',
            description: 'Commande des équipements nécessaires',
            type: 'delivery',
            status: 'pending',
            dueDate: new Date(Date.now() + 16 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['contract_signature'],
            deliverables: ['Commandes passées', 'Confirmations fournisseurs'],
            documents: [
              { id: 'orders_placed', name: 'Bons de commande', type: 'procurement', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'materials_ordered',
                triggerEvent: 'step_complete',
                recipients: ['client', 'projet@itvision.sn'],
                channel: 'email',
                template: 'materiel_commande',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'track_delivery',
                triggerType: 'time_based',
                condition: 'daily_check',
                action: 'notify',
                delay: 24,
                target: 'procurement',
                isActive: true
              }
            ],
            conditions: [],
            estimatedDuration: 4,
            clientVisible: true,
            blockingForNext: false
          },
          {
            id: 'material_reception',
            name: 'Réception matériel',
            description: 'Réception et contrôle des équipements',
            type: 'delivery',
            status: 'pending',
            dueDate: new Date(Date.now() + 23 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['material_ordering'],
            deliverables: ['Matériel réceptionné', 'Contrôle qualité'],
            documents: [
              { id: 'delivery_receipt', name: 'Bon de livraison', type: 'delivery', required: true, approved: false },
              { id: 'quality_check', name: 'Contrôle qualité', type: 'technical', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'materials_received',
                triggerEvent: 'step_complete',
                recipients: ['client', 'technique@itvision.sn'],
                channel: 'all',
                template: 'materiel_recu',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'schedule_installation',
                triggerType: 'condition_based',
                condition: 'all_materials_ok',
                action: 'advance_step',
                target: 'installation_planning',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'quality_ok',
                field: 'quality_status',
                operator: 'equals',
                value: 'approved',
                required: true
              }
            ],
            estimatedDuration: 4,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'installation_planning',
            name: 'Planification installation',
            description: 'Planification détaillée de l\'installation',
            type: 'validation',
            status: 'pending',
            dueDate: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['material_reception'],
            deliverables: ['Planning détaillé', 'Équipe assignée', 'RDV client'],
            documents: [
              { id: 'install_schedule', name: 'Planning installation', type: 'planning', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'installation_scheduled',
                triggerEvent: 'step_complete',
                recipients: ['client', 'equipe_technique@itvision.sn'],
                channel: 'all',
                template: 'installation_programmee',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'prepare_installation',
                triggerType: 'time_based',
                condition: 'day_before_install',
                action: 'notify',
                delay: 24,
                target: 'technical_team',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'team_available',
                field: 'team_status',
                operator: 'equals',
                value: 'available',
                required: true
              },
              {
                id: 'client_available',
                field: 'client_availability',
                operator: 'equals',
                value: 'confirmed',
                required: true
              }
            ],
            estimatedDuration: 3,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'installation_execution',
            name: 'Installation',
            description: 'Installation des équipements visiophonie',
            type: 'installation',
            status: 'pending',
            dueDate: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['installation_planning'],
            deliverables: ['Installation terminée', 'Tests préliminaires'],
            documents: [
              { id: 'install_report', name: 'Rapport d\'installation', type: 'technical', required: true, approved: false },
              { id: 'prelim_tests', name: 'Tests préliminaires', type: 'test', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'installation_started',
                triggerEvent: 'step_start',
                recipients: ['client', 'supervision@itvision.sn'],
                channel: 'all',
                template: 'installation_commencee',
                isActive: true
              },
              {
                id: 'installation_progress',
                triggerEvent: 'step_start',
                recipients: ['client'],
                channel: 'portal',
                template: 'avancement_installation',
                delay: 4,
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'daily_progress',
                triggerType: 'time_based',
                condition: 'daily_update',
                action: 'notify',
                delay: 24,
                target: 'client_portal',
                isActive: true
              }
            ],
            conditions: [],
            estimatedDuration: 16,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'system_testing',
            name: 'Tests système',
            description: 'Tests complets et validation système',
            type: 'test',
            status: 'pending',
            dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['installation_execution'],
            deliverables: ['Tests complets', 'Procès-verbal de recette'],
            documents: [
              { id: 'full_tests', name: 'Tests complets', type: 'test', required: true, approved: false },
              { id: 'acceptance_report', name: 'PV de recette', type: 'validation', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'tests_completed',
                triggerEvent: 'step_complete',
                recipients: ['client', 'direction@itvision.sn'],
                channel: 'all',
                template: 'tests_termines',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'schedule_training',
                triggerType: 'condition_based',
                condition: 'tests_passed',
                action: 'advance_step',
                target: 'user_training',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'all_tests_passed',
                field: 'test_results',
                operator: 'equals',
                value: 'passed',
                required: true
              }
            ],
            estimatedDuration: 8,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'user_training',
            name: 'Formation utilisateurs',
            description: 'Formation des utilisateurs finaux',
            type: 'training',
            status: 'pending',
            dueDate: new Date(Date.now() + 32 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['system_testing'],
            deliverables: ['Formation dispensée', 'Documentation remise'],
            documents: [
              { id: 'training_cert', name: 'Certificat de formation', type: 'training', required: true, approved: false },
              { id: 'user_manual', name: 'Manuel utilisateur', type: 'documentation', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'training_completed',
                triggerEvent: 'step_complete',
                recipients: ['client'],
                channel: 'all',
                template: 'formation_terminee',
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'project_completion',
                triggerType: 'condition_based',
                condition: 'training_validated',
                action: 'advance_step',
                target: 'project_closure',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'users_trained',
                field: 'training_status',
                operator: 'equals',
                value: 'completed',
                required: true
              }
            ],
            estimatedDuration: 4,
            clientVisible: true,
            blockingForNext: true
          },
          {
            id: 'project_closure',
            name: 'Clôture projet',
            description: 'Livraison finale et paiement',
            type: 'payment',
            status: 'pending',
            dueDate: new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString(),
            dependencies: ['user_training'],
            deliverables: ['Livraison finale', 'Facture finale', 'Garantie'],
            documents: [
              { id: 'final_invoice', name: 'Facture finale', type: 'payment', required: true, approved: false },
              { id: 'warranty_cert', name: 'Certificat garantie', type: 'warranty', required: true, approved: false },
              { id: 'project_closure', name: 'PV clôture projet', type: 'validation', required: true, approved: false }
            ],
            notifications: [
              {
                id: 'project_delivered',
                triggerEvent: 'step_complete',
                recipients: ['client', 'direction@itvision.sn'],
                channel: 'all',
                template: 'projet_livre',
                isActive: true
              },
              {
                id: 'satisfaction_survey',
                triggerEvent: 'step_complete',
                recipients: ['client'],
                channel: 'email',
                template: 'enquete_satisfaction',
                delay: 24,
                isActive: true
              }
            ],
            autoTriggers: [
              {
                id: 'schedule_maintenance',
                triggerType: 'time_based',
                condition: 'maintenance_due',
                action: 'create_task',
                delay: 8760, // 1 an
                target: 'maintenance_system',
                isActive: true
              }
            ],
            conditions: [
              {
                id: 'final_payment',
                field: 'payment_status',
                operator: 'equals',
                value: 'completed',
                required: true
              },
              {
                id: 'client_satisfaction',
                field: 'satisfaction_score',
                operator: 'greater_than',
                value: '8',
                required: false
              }
            ],
            estimatedDuration: 2,
            clientVisible: true,
            blockingForNext: false
          }
        ]
      }
    ])

    // Workflows actifs exemple
    setWorkflows([
      {
        id: 'WF-2024-001',
        projectId: 'PRJ-2024-001',
        serviceType: 'visiophonie',
        currentStep: 'material_reception',
        progress: 65,
        status: 'active',
        startDate: '2024-02-01T08:00:00Z',
        estimatedEndDate: '2024-02-28T17:00:00Z',
        steps: [
          // Copie des steps du template avec statuts mis à jour
        ],
        delays: [
          {
            id: 'delay_1',
            stepId: 'material_ordering',
            reason: 'Rupture stock fournisseur',
            duration: 48,
            impact: 'medium',
            mitigation: 'Fournisseur alternatif contacté'
          }
        ],
        escalations: [],
        analytics: {
          totalSteps: 12,
          completedSteps: 8,
          delayedSteps: 1,
          averageStepDuration: 6.5,
          onTimeDelivery: 85,
          teamEfficiency: 92
        }
      }
    ])
  }, [])

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'delayed': return 'text-red-600 bg-red-100'
      case 'blocked': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'validation': return <CheckCircle className="h-4 w-4" />
      case 'payment': return <DollarSign className="h-4 w-4" />
      case 'delivery': return <Truck className="h-4 w-4" />
      case 'installation': return <Wrench className="h-4 w-4" />
      case 'test': return <Eye className="h-4 w-4" />
      case 'training': return <Users className="h-4 w-4" />
      case 'approval': return <FileText className="h-4 w-4" />
      case 'notification': return <Bell className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const calculateProgress = (workflow: ProjectWorkflow) => {
    const completedSteps = workflow.steps.filter(step => step.status === 'completed').length
    return Math.round((completedSteps / workflow.steps.length) * 100)
  }

  const getNextSteps = (workflow: ProjectWorkflow) => {
    return workflow.steps.filter(step => 
      step.status === 'pending' && 
      step.dependencies.every(dep => 
        workflow.steps.find(s => s.id === dep)?.status === 'completed'
      )
    )
  }

  const executeStep = (workflowId: string, stepId: string) => {
    setWorkflows(prev => prev.map(workflow => {
      if (workflow.id === workflowId) {
        return {
          ...workflow,
          steps: workflow.steps.map(step => {
            if (step.id === stepId) {
              return {
                ...step,
                status: 'in_progress' as const,
                completedBy: 'Admin'
              }
            }
            return step
          })
        }
      }
      return workflow
    }))

    // Simuler notifications et triggers automatiques
    console.log(`Étape ${stepId} démarrée pour le workflow ${workflowId}`)
  }

  const completeStep = (workflowId: string, stepId: string) => {
    setWorkflows(prev => prev.map(workflow => {
      if (workflow.id === workflowId) {
        const updatedSteps = workflow.steps.map(step => {
          if (step.id === stepId) {
            return {
              ...step,
              status: 'completed' as const,
              completedDate: new Date().toISOString(),
              completedBy: 'Admin'
            }
          }
          return step
        })

        // Calculer nouveau currentStep
        const nextSteps = getNextSteps({ ...workflow, steps: updatedSteps })
        const newCurrentStep = nextSteps.length > 0 ? nextSteps[0].id : stepId

        return {
          ...workflow,
          steps: updatedSteps,
          currentStep: newCurrentStep,
          progress: calculateProgress({ ...workflow, steps: updatedSteps })
        }
      }
      return workflow
    }))

    console.log(`Étape ${stepId} terminée pour le workflow ${workflowId}`)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ⚡ Moteur de Workflow IT Vision
            </h1>
            <p className="text-gray-600">
              Automatisation intelligente des processus projet
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              <Play className="h-4 w-4" />
              <span>Démarrer Workflow</span>
            </button>
            
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Settings className="h-4 w-4" />
              <span>Configurer</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'active', label: 'Workflows Actifs', icon: Activity },
            { id: 'templates', label: 'Templates', icon: Layers },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'automation', label: 'Automatisations', icon: Zap }
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

      {/* Workflows actifs */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Workflow {workflow.projectId}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Service: <strong className="capitalize">{workflow.serviceType}</strong></span>
                    <span>Progression: <strong>{workflow.progress}%</strong></span>
                    <span>Étape actuelle: <strong>{workflow.currentStep.replace('_', ' ')}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                    workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    workflow.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {workflow.status}
                  </span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progression globale</span>
                  <span className="text-sm text-gray-600">{workflow.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${workflow.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Timeline des étapes */}
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div className="space-y-4">
                  {workflow.steps.slice(0, 8).map((step, index) => (
                    <div key={step.id} className="relative flex items-start space-x-4">
                      <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                        step.status === 'completed' ? 'bg-green-500 border-green-500' :
                        step.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                        step.status === 'delayed' ? 'bg-red-500 border-red-500' :
                        step.status === 'blocked' ? 'bg-yellow-500 border-yellow-500' :
                        'bg-white border-gray-300'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="h-6 w-6 text-white" />
                        ) : step.status === 'in_progress' ? (
                          <Clock className="h-6 w-6 text-white" />
                        ) : step.status === 'delayed' ? (
                          <AlertTriangle className="h-6 w-6 text-white" />
                        ) : (
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{step.name}</h4>
                            <p className="text-sm text-gray-600">{step.description}</p>
                            
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>Type: {step.type}</span>
                              <span>Durée estimée: {step.estimatedDuration}h</span>
                              {step.assignedTo && <span>Assigné: {step.assignedTo}</span>}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStepStatusColor(step.status)}`}>
                              {getStepIcon(step.type)}
                              <span className="ml-1">{step.status.replace('_', ' ')}</span>
                            </span>

                            {step.status === 'pending' && step.dependencies.every(dep => 
                              workflow.steps.find(s => s.id === dep)?.status === 'completed'
                            ) && (
                              <button
                                onClick={() => executeStep(workflow.id, step.id)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs"
                              >
                                Démarrer
                              </button>
                            )}

                            {step.status === 'in_progress' && (
                              <button
                                onClick={() => completeStep(workflow.id, step.id)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs"
                              >
                                Terminer
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedStep(step)
                                setShowStepDetail(true)
                              }}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
                            >
                              Détails
                            </button>
                          </div>
                        </div>

                        {/* Deliverables */}
                        {step.deliverables.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Livrables:</p>
                            <div className="flex flex-wrap gap-1">
                              {step.deliverables.map((deliverable, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                  {deliverable}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dependencies */}
                        {step.dependencies.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Dépendances:</p>
                            <div className="flex flex-wrap gap-1">
                              {step.dependencies.map((dep, idx) => {
                                const depStep = workflow.steps.find(s => s.id === dep)
                                return (
                                  <span key={idx} className={`inline-flex items-center px-2 py-1 text-xs rounded ${
                                    depStep?.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                                  }`}>
                                    {depStep?.name || dep}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics workflow */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{workflow.analytics.completedSteps}/{workflow.analytics.totalSteps}</div>
                    <div className="text-sm text-gray-600">Étapes terminées</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{workflow.analytics.onTimeDelivery}%</div>
                    <div className="text-sm text-gray-600">Dans les temps</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{workflow.analytics.averageStepDuration}h</div>
                    <div className="text-sm text-gray-600">Durée moyenne</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{workflow.analytics.teamEfficiency}%</div>
                    <div className="text-sm text-gray-600">Efficacité équipe</div>
                  </div>
                </div>
              </div>

              {/* Alertes et retards */}
              {workflow.delays.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">⚠️ Alertes et retards</h4>
                  <div className="space-y-2">
                    {workflow.delays.map((delay) => (
                      <div key={delay.id} className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-900">{delay.reason}</p>
                          <p className="text-sm text-yellow-700">
                            Retard: {delay.duration}h - Impact: {delay.impact}
                            {delay.mitigation && ` - Mitigation: ${delay.mitigation}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Templates de Workflow ({templates.length})
            </h3>

            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900">{template.name}</h4>
                      <p className="text-gray-600">{template.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      template.complexity === 'complex' ? 'bg-red-100 text-red-800' :
                      template.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {template.complexity}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Service:</span>
                      <p className="font-medium capitalize">{template.serviceType}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Étapes:</span>
                      <p className="font-medium">{template.steps.length}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Durée estimée:</span>
                      <p className="font-medium">{template.estimatedDuration}h</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Automatisations:</span>
                      <p className="font-medium">
                        {template.steps.reduce((acc, step) => acc + step.autoTriggers.length, 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Métriques de succès:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.successMetrics.map((metric, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                        <Eye className="h-3 w-3" />
                        <span>Voir workflow</span>
                      </button>
                      <button className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm">
                        <Play className="h-3 w-3" />
                        <span>Utiliser template</span>
                      </button>
                      <button className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                        <Edit3 className="h-3 w-3" />
                        <span>Modifier</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal détail étape */}
      {showStepDetail && selectedStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{selectedStep.name}</h3>
              <button
                onClick={() => setShowStepDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedStep.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Informations générales</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Type:</span> {selectedStep.type}</p>
                    <p><span className="text-gray-600">Statut:</span> {selectedStep.status}</p>
                    <p><span className="text-gray-600">Durée estimée:</span> {selectedStep.estimatedDuration}h</p>
                    <p><span className="text-gray-600">Échéance:</span> {new Date(selectedStep.dueDate).toLocaleDateString('fr-FR')}</p>
                    {selectedStep.assignedTo && (
                      <p><span className="text-gray-600">Assigné à:</span> {selectedStep.assignedTo}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Notifications</h4>
                  <div className="space-y-2">
                    {selectedStep.notifications.map((notif) => (
                      <div key={notif.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-blue-900">{notif.triggerEvent.replace('_', ' ')}</p>
                        <p className="text-sm text-blue-700">
                          Canal: {notif.channel} | Destinataires: {notif.recipients.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Automatisations</h4>
                <div className="space-y-2">
                  {selectedStep.autoTriggers.map((trigger) => (
                    <div key={trigger.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium text-green-900">{trigger.triggerType.replace('_', ' ')}</p>
                      <p className="text-sm text-green-700">
                        Condition: {trigger.condition} → Action: {trigger.action}
                        {trigger.delay && ` (délai: ${trigger.delay}h)`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStep.deliverables.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Livrables</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedStep.deliverables.map((deliverable, idx) => (
                      <div key={idx} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">{deliverable}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}