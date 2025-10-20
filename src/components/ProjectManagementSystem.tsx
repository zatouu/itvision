'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit3, 
  Eye, 
  Calendar, 
  DollarSign, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Package, 
  Truck, 
  Settings, 
  Star, 
  Building, 
  Phone, 
  Mail, 
  Camera, 
  Shield, 
  Flame, 
  Smartphone, 
  Wifi, 
  Database, 
  Monitor, 
  Wrench, 
  Target, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Send, 
  Save, 
  X, 
  RefreshCw,
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  GitBranch,
  Bell,
  MessageCircle,
  CreditCard,
  ShoppingCart,
  Archive,
  Award,
  Zap,
  Calculator,
  Loader2
} from 'lucide-react'

interface ServiceTemplate {
  id: string
  name: string
  category: string
  description: string
  icon: any
  phases: ProjectPhase[]
  defaultProducts: ProductCategory[]
  estimatedDuration: string
  complexity: 'simple' | 'medium' | 'complex'
  quoteTemplate: QuoteTemplate
}

interface ProjectPhase {
  id: string
  name: string
  description: string
  duration: string
  dependencies: string[]
  deliverables: string[]
  milestones: Milestone[]
  isRequired: boolean
}

interface Milestone {
  id: string
  name: string
  description: string
  type: 'validation' | 'payment' | 'delivery' | 'installation' | 'test' | 'training'
  triggerNext: boolean
  clientVisible: boolean
  autoNotify: boolean
}

interface ProductCategory {
  id: string
  name: string
  description: string
  products: Product[]
  isRequired: boolean
}

interface Product {
  id: string
  name: string
  brand: string
  model: string
  unitPrice: number
  unit: string
  specifications: string[]
  leadTime: string
  supplier: string
}

interface QuoteTemplate {
  sections: QuoteSection[]
  terms: string[]
  validityDays: number
  paymentTerms: string[]
}

interface QuoteSection {
  id: string
  title: string
  description: string
  calculationType: 'fixed' | 'quantity' | 'surface' | 'linear'
  basePrice: number
  includes: string[]
}

interface Project {
  id: string
  name: string
  description: string
  serviceType: string
  client: {
    company: string
    contact: string
    phone: string
    email: string
    address: string
  }
  site: {
    name: string
    address: string
    access: string
    constraints: string[]
  }
  status: 'lead' | 'quoted' | 'negotiation' | 'approved' | 'in_progress' | 'testing' | 'completed' | 'maintenance'
  currentPhase: string
  progress: number
  value: number
  margin: number
  startDate: string
  endDate: string
  assignedTo: string[]
  milestones: ProjectMilestone[]
  quote: ProjectQuote | null
  products: ProjectProduct[]
  timeline: TimelineEvent[]
  risks: Risk[]
  documents: Document[]
  clientAccess: boolean
}

interface ProjectMilestone {
  id: string
  name: string
  description: string
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  completedDate?: string
  dependencies: string[]
  deliverables: string[]
  clientNotified: boolean
}

interface ProjectQuote {
  id: string
  version: number
  sections: QuoteSection[]
  totalHT: number
  totalTTC: number
  margin: number
  validUntil: string
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected'
  sentDate?: string
  viewedDate?: string
  responseDate?: string
}

interface ProjectProduct {
  productId: string
  name: string
  brand: string
  model: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: 'planned' | 'ordered' | 'received' | 'installed'
  supplier: string
  leadTime: string
  orderDate?: string
  receivedDate?: string
}

interface TimelineEvent {
  id: string
  date: string
  type: 'created' | 'quoted' | 'approved' | 'started' | 'milestone' | 'issue' | 'completed'
  title: string
  description: string
  author: string
  clientVisible: boolean
}

interface Risk {
  id: string
  title: string
  description: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation: string
  status: 'identified' | 'monitoring' | 'mitigated' | 'occurred'
}

interface Document {
  id: string
  name: string
  type: 'quote' | 'contract' | 'invoice' | 'technical' | 'photo' | 'manual'
  url: string
  uploadDate: string
  clientVisible: boolean
}

interface ProjectManagementSystemProps {
  openNewProjectSignal?: number
}

export default function ProjectManagementSystem({ openNewProjectSignal }: ProjectManagementSystemProps) {
  const [activeTab, setActiveTab] = useState('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([])
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState<Partial<Project>>({})
  const [selectedService, setSelectedService] = useState<ServiceTemplate | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const LOCAL_KEY = 'itvision.local-projects'

  // Helpers API
  const apiBase = (id: string) => `/api/projects/${encodeURIComponent(id)}`

  async function apiAddMilestone(projectId: string, milestone: any) {
    const res = await fetch(`${apiBase(projectId)}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ milestone })
    })
    if (!res.ok) throw new Error('Ajout jalon échoué')
  }

  async function apiUpdateMilestone(projectId: string, milestoneId: string, updates: any) {
    const res = await fetch(`${apiBase(projectId)}/milestones`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ milestoneId, updates })
    })
    if (!res.ok) throw new Error('MAJ jalon échouée')
  }

  async function apiDeleteMilestone(projectId: string, milestoneId: string) {
    const res = await fetch(`${apiBase(projectId)}/milestones?milestoneId=${encodeURIComponent(milestoneId)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Suppression jalon échouée')
  }

  async function apiAddTimelineEvent(projectId: string, event: any) {
    const res = await fetch(`${apiBase(projectId)}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event })
    })
    if (!res.ok) throw new Error('Ajout événement échoué')
  }

  async function apiDeleteTimelineEvent(projectId: string, eventId: string) {
    const res = await fetch(`${apiBase(projectId)}/timeline?eventId=${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Suppression événement échouée')
  }

  async function apiAddProduct(projectId: string, product: any) {
    const res = await fetch(`${apiBase(projectId)}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ product })
    })
    if (!res.ok) throw new Error('Ajout produit échoué')
  }

  async function apiUpdateProduct(projectId: string, productId: string, updates: any) {
    const res = await fetch(`${apiBase(projectId)}/products`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId, updates })
    })
    if (!res.ok) throw new Error('MAJ produit échouée')
  }

  async function apiDeleteProduct(projectId: string, productId: string) {
    const res = await fetch(`${apiBase(projectId)}/products?productId=${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Suppression produit échouée')
  }

  async function apiAddDocument(projectId: string, document: any) {
    const res = await fetch(`${apiBase(projectId)}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ document })
    })
    if (!res.ok) throw new Error('Ajout document échoué')
  }

  async function apiDeleteDocument(projectId: string, documentId: string) {
    const res = await fetch(`${apiBase(projectId)}/documents?documentId=${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Suppression document échouée')
  }

  async function apiPatchQuote(projectId: string, quote: any) {
    const res = await fetch(`${apiBase(projectId)}/quote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ quote })
    })
    if (!res.ok) throw new Error('Mise à jour devis échouée')
  }

  // Templates de services IT Vision
  useEffect(() => {
    setServiceTemplates([
      {
        id: 'visiophonie',
        name: 'Visiophonie',
        category: 'Sécurité',
        description: 'Installation complète de système de visiophonie pour contrôle d\'accès',
        icon: Monitor,
        estimatedDuration: '3-5 jours',
        complexity: 'medium',
        phases: [
          {
            id: 'phase_1',
            name: 'Étude technique',
            description: 'Visite site et définition architecture',
            duration: '1 jour',
            dependencies: [],
            deliverables: ['Plan d\'installation', 'Liste matériel', 'Devis détaillé'],
            milestones: [
              {
                id: 'site_visit',
                name: 'Visite technique',
                description: 'Évaluation site et besoins',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_2',
            name: 'Devis et validation',
            description: 'Présentation devis et négociation',
            duration: '3-7 jours',
            dependencies: ['phase_1'],
            deliverables: ['Devis final', 'Contrat signé', 'Planning travaux'],
            milestones: [
              {
                id: 'quote_sent',
                name: 'Devis envoyé',
                description: 'Devis transmis au client',
                type: 'validation',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              },
              {
                id: 'quote_approved',
                name: 'Devis approuvé',
                description: 'Validation client et signature',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_3',
            name: 'Commande matériel',
            description: 'Commande et réception équipements',
            duration: '7-14 jours',
            dependencies: ['phase_2'],
            deliverables: ['Matériel réceptionné', 'Contrôle qualité'],
            milestones: [
              {
                id: 'material_ordered',
                name: 'Matériel commandé',
                description: 'Commande passée aux fournisseurs',
                type: 'delivery',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              },
              {
                id: 'material_received',
                name: 'Matériel reçu',
                description: 'Réception et contrôle matériel',
                type: 'delivery',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_4',
            name: 'Installation',
            description: 'Pose et câblage système visiophonie',
            duration: '2-3 jours',
            dependencies: ['phase_3'],
            deliverables: ['Installation complète', 'Tests système', 'Formation'],
            milestones: [
              {
                id: 'installation_start',
                name: 'Début installation',
                description: 'Démarrage travaux sur site',
                type: 'installation',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              },
              {
                id: 'installation_complete',
                name: 'Installation terminée',
                description: 'Système installé et opérationnel',
                type: 'installation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_5',
            name: 'Tests et formation',
            description: 'Tests finaux et formation utilisateurs',
            duration: '0.5 jour',
            dependencies: ['phase_4'],
            deliverables: ['Procès-verbal tests', 'Formation dispensée', 'Documentation'],
            milestones: [
              {
                id: 'final_test',
                name: 'Tests finaux',
                description: 'Validation fonctionnement système',
                type: 'test',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              },
              {
                id: 'project_delivered',
                name: 'Projet livré',
                description: 'Livraison finale et paiement',
                type: 'payment',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          }
        ],
        defaultProducts: [
          {
            id: 'screens',
            name: 'Écrans visiophone',
            description: 'Écrans intérieurs et moniteurs',
            isRequired: true,
            products: [
              {
                id: 'screen_7inch',
                name: 'Écran visiophone 7"',
                brand: 'Hikvision',
                model: 'DS-KH6320-WTE1',
                unitPrice: 85000,
                unit: 'unité',
                specifications: ['Écran 7" tactile', 'WiFi intégré', 'Mémoire 32GB'],
                leadTime: '7 jours',
                supplier: 'Fournisseur A'
              }
            ]
          },
          {
            id: 'outdoor_stations',
            name: 'Platines de rue',
            description: 'Platines extérieures et boutons d\'appel',
            isRequired: true,
            products: [
              {
                id: 'outdoor_single',
                name: 'Platine de rue simple',
                brand: 'Hikvision',
                model: 'DS-KV8113-WME1',
                unitPrice: 125000,
                unit: 'unité',
                specifications: ['Caméra 2MP', 'Vision nocturne', 'Étanche IP65'],
                leadTime: '7 jours',
                supplier: 'Fournisseur A'
              }
            ]
          },
          {
            id: 'cables',
            name: 'Câblage et réseau',
            description: 'Câbles et accessoires réseau',
            isRequired: true,
            products: [
              {
                id: 'cable_cat6',
                name: 'Câble Cat6',
                brand: 'Legrand',
                model: 'Cat6 UTP',
                unitPrice: 1200,
                unit: 'mètre',
                specifications: ['Cat6 certifié', 'Gaine LSOH', '305m bobine'],
                leadTime: '3 jours',
                supplier: 'Fournisseur B'
              }
            ]
          }
        ],
        quoteTemplate: {
          sections: [
            {
              id: 'equipment',
              title: 'Équipements',
              description: 'Matériel visiophonie et accessoires',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Écrans', 'Platines', 'Accessoires']
            },
            {
              id: 'cabling',
              title: 'Câblage',
              description: 'Câblage réseau et alimentation',
              calculationType: 'linear',
              basePrice: 2500,
              includes: ['Câble Cat6', 'Gaines', 'Connectiques']
            },
            {
              id: 'installation',
              title: 'Installation',
              description: 'Main d\'œuvre et mise en service',
              calculationType: 'fixed',
              basePrice: 150000,
              includes: ['Installation', 'Configuration', 'Tests', 'Formation']
            }
          ],
          terms: [
            'Devis valable 30 jours',
            'Acompte de 50% à la commande',
            'Solde à la livraison',
            'Garantie 2 ans pièces et main d\'œuvre'
          ],
          validityDays: 30,
          paymentTerms: ['50% acompte', '50% livraison']
        }
      },
      {
        id: 'videosurveillance',
        name: 'Vidéosurveillance',
        category: 'Sécurité',
        description: 'Système complet de vidéosurveillance IP',
        icon: Camera,
        estimatedDuration: '5-10 jours',
        complexity: 'complex',
        phases: [
          {
            id: 'phase_1',
            name: 'Étude de sécurité',
            description: 'Analyse des besoins et conception système',
            duration: '2 jours',
            dependencies: [],
            deliverables: ['Étude de sécurité', 'Plan d\'implantation', 'Architecture technique'],
            milestones: [
              {
                id: 'security_audit',
                name: 'Audit sécurité',
                description: 'Évaluation des risques et besoins',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_2',
            name: 'Dimensionnement système',
            description: 'Calcul nombre caméras et architecture réseau',
            duration: '1 jour',
            dependencies: ['phase_1'],
            deliverables: ['Plan caméras', 'Architecture réseau', 'Spécifications techniques'],
            milestones: [
              {
                id: 'system_design',
                name: 'Conception système',
                description: 'Validation architecture technique',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          }
          // ... autres phases similaires
        ],
        defaultProducts: [
          {
            id: 'cameras',
            name: 'Caméras IP',
            description: 'Caméras de surveillance haute définition',
            isRequired: true,
            products: [
              {
                id: 'camera_4k',
                name: 'Caméra IP 4K',
                brand: 'Hikvision',
                model: 'DS-2CD2143G2-I',
                unitPrice: 45000,
                unit: 'unité',
                specifications: ['4K UHD', 'Vision nocturne 30m', 'PoE', 'IP67'],
                leadTime: '10 jours',
                supplier: 'Fournisseur A'
              }
            ]
          }
          // ... autres catégories
        ],
        quoteTemplate: {
          sections: [
            {
              id: 'cameras',
              title: 'Caméras et capteurs',
              description: 'Caméras IP et détecteurs',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Caméras', 'Objectifs', 'Supports']
            },
            {
              id: 'recording',
              title: 'Enregistrement',
              description: 'NVR et stockage',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['NVR', 'Disques durs', 'Licences']
            },
            {
              id: 'network',
              title: 'Infrastructure réseau',
              description: 'Switches et câblage',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Switches PoE', 'Câblage', 'Baies']
            },
            {
              id: 'installation',
              title: 'Installation et configuration',
              description: 'Main d\'œuvre spécialisée',
              calculationType: 'fixed',
              basePrice: 250000,
              includes: ['Installation', 'Configuration', 'Tests', 'Formation']
            }
          ],
          terms: [
            'Devis valable 45 jours',
            'Acompte de 40% à la commande',
            'Solde à la recette',
            'Garantie 3 ans équipements, 1 an main d\'œuvre'
          ],
          validityDays: 45,
          paymentTerms: ['40% acompte', '60% livraison']
        }
      },
      {
        id: 'incendie',
        name: 'Sécurité Incendie',
        category: 'Sécurité',
        description: 'Système de détection et extinction incendie',
        icon: Flame,
        estimatedDuration: '7-15 jours',
        complexity: 'complex',
        phases: [
          {
            id: 'phase_1',
            name: 'Étude réglementaire',
            description: 'Analyse conformité et normes incendie',
            duration: '3 jours',
            dependencies: [],
            deliverables: ['Étude réglementaire', 'Plan de sécurité', 'Calculs zones'],
            milestones: [
              {
                id: 'regulatory_study',
                name: 'Étude réglementaire',
                description: 'Conformité normes incendie',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          }
          // ... autres phases
        ],
        defaultProducts: [
          {
            id: 'detectors',
            name: 'Détecteurs incendie',
            description: 'Détecteurs fumée et chaleur',
            isRequired: true,
            products: [
              {
                id: 'smoke_detector',
                name: 'Détecteur optique de fumée',
                brand: 'Hochiki',
                model: 'SLR-E',
                unitPrice: 18000,
                unit: 'unité',
                specifications: ['Détection optique', 'Sortie relais', 'LED status'],
                leadTime: '14 jours',
                supplier: 'Fournisseur C'
              }
            ]
          }
          // ... autres catégories
        ],
        quoteTemplate: {
          sections: [
            {
              id: 'detection',
              title: 'Détection incendie',
              description: 'Détecteurs et capteurs',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Détecteurs', 'Socles', 'Modules']
            },
            {
              id: 'central',
              title: 'Centrale incendie',
              description: 'Centrale et équipements associés',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Centrale', 'Batteries', 'Accessoires']
            },
            {
              id: 'signaling',
              title: 'Signalisation',
              description: 'Alarmes et éclairage sécurité',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Sirènes', 'Flashs', 'BAES']
            }
          ],
          terms: [
            'Devis valable 60 jours',
            'Acompte de 30% à la commande',
            'Paiement échelonné selon avancement',
            'Garantie selon normes fabricant'
          ],
          validityDays: 60,
          paymentTerms: ['30% acompte', '70% échelonné']
        }
      },
      {
        id: 'domotique',
        name: 'Domotique & Bâtiment Intelligent',
        category: 'Automation',
        description: 'Automatisation complète WiFi, Bluetooth, Zigbee',
        icon: Smartphone,
        estimatedDuration: '5-15 jours',
        complexity: 'medium',
        phases: [
          {
            id: 'phase_1',
            name: 'Audit domotique',
            description: 'Analyse besoins automatisation et infrastructure',
            duration: '2 jours',
            dependencies: [],
            deliverables: ['Audit domotique', 'Plan automatisation', 'Choix protocoles'],
            milestones: [
              {
                id: 'home_audit',
                name: 'Audit domotique',
                description: 'Évaluation besoins automatisation',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_2',
            name: 'Conception système',
            description: 'Architecture domotique et sélection équipements',
            duration: '3 jours',
            dependencies: ['phase_1'],
            deliverables: ['Architecture système', 'Liste équipements', 'Plan installation'],
            milestones: [
              {
                id: 'system_design',
                name: 'Conception système',
                description: 'Validation architecture domotique',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_3',
            name: 'Installation équipements',
            description: 'Pose modules et configuration hub central',
            duration: '3-5 jours',
            dependencies: ['phase_2'],
            deliverables: ['Équipements installés', 'Hub configuré', 'Tests préliminaires'],
            milestones: [
              {
                id: 'equipment_installed',
                name: 'Équipements installés',
                description: 'Installation modules et hub',
                type: 'installation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_4',
            name: 'Configuration et programmation',
            description: 'Programmation scénarios et interface mobile',
            duration: '2-3 jours',
            dependencies: ['phase_3'],
            deliverables: ['Scénarios programmés', 'App mobile configurée', 'Tests système'],
            milestones: [
              {
                id: 'system_programmed',
                name: 'Système programmé',
                description: 'Configuration scénarios terminée',
                type: 'test',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_5',
            name: 'Formation et livraison',
            description: 'Formation utilisateur et documentation',
            duration: '1 jour',
            dependencies: ['phase_4'],
            deliverables: ['Formation dispensée', 'Guide utilisateur', 'Support configuré'],
            milestones: [
              {
                id: 'training_completed',
                name: 'Formation terminée',
                description: 'Formation utilisateur et livraison',
                type: 'training',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          }
        ],
        defaultProducts: [
          {
            id: 'hub_central',
            name: 'Hub Central Zigbee',
            description: 'Hub central pour gestion domotique',
            isRequired: true,
            products: [
              {
                id: 'hub_zigbee',
                name: 'Hub Central Zigbee',
                brand: 'Aqara',
                model: 'Hub M2',
                unitPrice: 45000,
                unit: 'unité',
                specifications: ['Zigbee 3.0', 'WiFi', 'Bluetooth', 'Contrôle IR'],
                leadTime: '7 jours',
                supplier: 'Fournisseur Smart'
              }
            ]
          },
          {
            id: 'smart_modules',
            name: 'Modules intelligents',
            description: 'Micro-modules et équipements smart',
            isRequired: true,
            products: [
              {
                id: 'micro_module_switch',
                name: 'Micro-module interrupteur',
                brand: 'Aqara',
                model: 'Relay T1',
                unitPrice: 18000,
                unit: 'unité',
                specifications: ['Zigbee 3.0', 'Sans neutre', '16A max'],
                leadTime: '5 jours',
                supplier: 'Fournisseur Smart'
              },
              {
                id: 'smart_plug',
                name: 'Prise connectée 16A',
                brand: 'Aqara',
                model: 'Smart Plug',
                unitPrice: 12000,
                unit: 'unité',
                specifications: ['Zigbee 3.0', '16A', 'Mesure consommation'],
                leadTime: '5 jours',
                supplier: 'Fournisseur Smart'
              }
            ]
          },
          {
            id: 'sensors',
            name: 'Capteurs intelligents',
            description: 'Détecteurs mouvement, température, etc.',
            isRequired: false,
            products: [
              {
                id: 'motion_sensor',
                name: 'Capteur mouvement PIR',
                brand: 'Aqara',
                model: 'Motion Sensor P1',
                unitPrice: 15000,
                unit: 'unité',
                specifications: ['Zigbee 3.0', 'Détection 7m', 'Batterie 2 ans'],
                leadTime: '5 jours',
                supplier: 'Fournisseur Smart'
              },
              {
                id: 'temp_sensor',
                name: 'Capteur température/humidité',
                brand: 'Aqara',
                model: 'Temperature Sensor',
                unitPrice: 13000,
                unit: 'unité',
                specifications: ['Zigbee 3.0', 'Précision ±0.3°C', 'Écran LCD'],
                leadTime: '5 jours',
                supplier: 'Fournisseur Smart'
              }
            ]
          }
        ],
        quoteTemplate: {
          sections: [
            {
              id: 'hub_system',
              title: 'Hub central et système',
              description: 'Hub central et infrastructure',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Hub central', 'Configuration', 'App mobile']
            },
            {
              id: 'smart_devices',
              title: 'Équipements intelligents',
              description: 'Modules et capteurs smart',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Modules', 'Capteurs', 'Prises connectées']
            },
            {
              id: 'installation_config',
              title: 'Installation et configuration',
              description: 'Pose et programmation système',
              calculationType: 'fixed',
              basePrice: 180000,
              includes: ['Installation', 'Programmation', 'Configuration', 'Tests']
            }
          ],
          terms: [
            'Devis valable 30 jours',
            'Acompte de 50% à la commande',
            'Solde à la livraison',
            'Garantie 2 ans équipements, 1 an configuration'
          ],
          validityDays: 30,
          paymentTerms: ['50% acompte', '50% livraison']
        }
      },
      {
        id: 'network_cabling',
        name: 'Câblage Réseau & TV',
        category: 'Infrastructure',
        description: 'Câblage réseau et télévision pour bâtiments',
        icon: Wifi,
        estimatedDuration: '3-10 jours',
        complexity: 'medium',
        phases: [
          {
            id: 'phase_1',
            name: 'Étude infrastructure',
            description: 'Analyse architecture et besoins câblage',
            duration: '1-2 jours',
            dependencies: [],
            deliverables: ['Plan câblage', 'Nombre points réseau/TV', 'Architecture baie'],
            milestones: [
              {
                id: 'infrastructure_study',
                name: 'Étude infrastructure',
                description: 'Analyse besoins câblage réseau/TV',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_2',
            name: 'Fourniture matériel',
            description: 'Commande câbles, prises et équipements',
            duration: '3-7 jours',
            dependencies: ['phase_1'],
            deliverables: ['Câbles livrés', 'Prises RJ45/TV', 'Baie de brassage'],
            milestones: [
              {
                id: 'materials_delivered',
                name: 'Matériel livré',
                description: 'Réception câbles et équipements',
                type: 'delivery',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_3',
            name: 'Pose câblage',
            description: 'Installation câbles dans gaines et cloisons',
            duration: '2-5 jours',
            dependencies: ['phase_2'],
            deliverables: ['Câblage posé', 'Prises installées', 'Étiquetage'],
            milestones: [
              {
                id: 'cabling_installed',
                name: 'Câblage installé',
                description: 'Pose câbles et prises terminée',
                type: 'installation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_4',
            name: 'Baie de brassage',
            description: 'Installation et brassage baie technique',
            duration: '1-2 jours',
            dependencies: ['phase_3'],
            deliverables: ['Baie installée', 'Brassage réalisé', 'Tests connexions'],
            milestones: [
              {
                id: 'patch_panel_done',
                name: 'Baie de brassage terminée',
                description: 'Installation et brassage complets',
                type: 'installation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_5',
            name: 'Tests et recette',
            description: 'Tests de conformité et documentation',
            duration: '0.5-1 jour',
            dependencies: ['phase_4'],
            deliverables: ['Tests réussis', 'PV de recette', 'Plan de câblage final'],
            milestones: [
              {
                id: 'testing_complete',
                name: 'Tests terminés',
                description: 'Validation conformité câblage',
                type: 'test',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          }
        ],
        defaultProducts: [
          {
            id: 'cables',
            name: 'Câbles réseau et coaxiaux',
            description: 'Câbles Cat6A et coaxiaux',
            isRequired: true,
            products: [
              {
                id: 'cable_cat6a',
                name: 'Câble Cat6A UTP',
                brand: 'Legrand',
                model: 'Cat6A 305m',
                unitPrice: 1800,
                unit: 'mètre',
                specifications: ['Cat6A certifié', '10 Gbps', 'Gaine LSOH'],
                leadTime: '3 jours',
                supplier: 'Fournisseur Réseau'
              },
              {
                id: 'coax_cable',
                name: 'Câble coaxial RG6',
                brand: 'Legrand',
                model: 'RG6 Tri-shield',
                unitPrice: 800,
                unit: 'mètre',
                specifications: ['Triple blindage', 'Impédance 75Ω', 'Gaine extérieure'],
                leadTime: '3 jours',
                supplier: 'Fournisseur Réseau'
              }
            ]
          },
          {
            id: 'outlets',
            name: 'Prises et connecteurs',
            description: 'Prises RJ45 et prises TV',
            isRequired: true,
            products: [
              {
                id: 'rj45_outlet',
                name: 'Prise RJ45 Cat6A',
                brand: 'Legrand',
                model: 'Mosaic RJ45',
                unitPrice: 3500,
                unit: 'unité',
                specifications: ['Cat6A', 'Connexion IDC', 'Blindé'],
                leadTime: '5 jours',
                supplier: 'Fournisseur Réseau'
              },
              {
                id: 'tv_outlet',
                name: 'Prise TV satellite',
                brand: 'Legrand',
                model: 'Mosaic TV-SAT',
                unitPrice: 2800,
                unit: 'unité',
                specifications: ['Passage DC', 'Blindage élevé', 'Connecteur F'],
                leadTime: '5 jours',
                supplier: 'Fournisseur Réseau'
              }
            ]
          },
          {
            id: 'patch_panel',
            name: 'Baie de brassage',
            description: 'Armoire et panneaux de brassage',
            isRequired: true,
            products: [
              {
                id: 'rack_19inch',
                name: 'Baie 19" 12U',
                brand: 'Legrand',
                model: 'LCS3 12U',
                unitPrice: 85000,
                unit: 'unité',
                specifications: ['19 pouces', '12U', 'Avec portes', 'Ventilation'],
                leadTime: '7 jours',
                supplier: 'Fournisseur Réseau'
              },
              {
                id: 'patch_panel_24',
                name: 'Panneau brassage 24 ports',
                brand: 'Legrand',
                model: 'LCS3 24 ports',
                unitPrice: 35000,
                unit: 'unité',
                specifications: ['24 ports RJ45', 'Cat6A', '1U', 'Avec serre-câbles'],
                leadTime: '7 jours',
                supplier: 'Fournisseur Réseau'
              }
            ]
          }
        ],
        quoteTemplate: {
          sections: [
            {
              id: 'cabling_materials',
              title: 'Câbles et matériaux',
              description: 'Câbles réseau, TV et accessoires',
              calculationType: 'linear',
              basePrice: 2500,
              includes: ['Câbles Cat6A', 'Câbles coaxiaux', 'Gaines', 'Fixations']
            },
            {
              id: 'outlets_patch',
              title: 'Prises et brassage',
              description: 'Prises murales et baie de brassage',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['Prises RJ45', 'Prises TV', 'Panneaux brassage', 'Baie']
            },
            {
              id: 'installation_labor',
              title: 'Installation et tests',
              description: 'Main d\'œuvre spécialisée',
              calculationType: 'fixed',
              basePrice: 200000,
              includes: ['Pose câbles', 'Installation prises', 'Brassage', 'Tests', 'Documentation']
            }
          ],
          terms: [
            'Devis valable 30 jours',
            'Acompte de 40% à la commande',
            'Solde à la recette technique',
            'Garantie 25 ans câblage, 5 ans équipements actifs'
          ],
          validityDays: 30,
          paymentTerms: ['40% acompte', '60% livraison']
        }
      },
      {
        id: 'fiber_optic',
        name: 'Câblage Fibre Optique',
        category: 'Infrastructure',
        description: 'Installation fibre avec BPI, PBO et PTO',
        icon: Zap,
        estimatedDuration: '5-15 jours',
        complexity: 'complex',
        phases: [
          {
            id: 'phase_1',
            name: 'Étude fibre optique',
            description: 'Analyse architecture et dimensionnement',
            duration: '2 jours',
            dependencies: [],
            deliverables: ['Étude de faisabilité', 'Plan de câblage FO', 'Calcul affaiblissement'],
            milestones: [
              {
                id: 'fiber_study',
                name: 'Étude fibre terminée',
                description: 'Analyse faisabilité et dimensionnement',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_2',
            name: 'Fourniture équipements FO',
            description: 'Commande fibres, BPI, PBO et équipements',
            duration: '7-10 jours',
            dependencies: ['phase_1'],
            deliverables: ['Fibres optiques', 'BPI installé', 'PBO et PTO', 'Équipements actifs'],
            milestones: [
              {
                id: 'fiber_equipment_delivered',
                name: 'Équipements FO livrés',
                description: 'Réception matériel fibre optique',
                type: 'delivery',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_3',
            name: 'Installation BPI et colonne',
            description: 'Pose BPI et câblage colonne montante',
            duration: '2-3 jours',
            dependencies: ['phase_2'],
            deliverables: ['BPI installé', 'Colonne montante', 'Répartiteurs étages'],
            milestones: [
              {
                id: 'bpi_installed',
                name: 'BPI installé',
                description: 'Point de branchement installé',
                type: 'installation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_4',
            name: 'Tirage fibres et PBO',
            description: 'Tirage fibres et installation PBO/PTO',
            duration: '2-4 jours',
            dependencies: ['phase_3'],
            deliverables: ['Fibres tirées', 'PBO installés', 'PTO posés', 'Étiquetage'],
            milestones: [
              {
                id: 'fiber_pulled',
                name: 'Fibres tirées',
                description: 'Tirage fibres et PBO/PTO installés',
                type: 'installation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_5',
            name: 'Raccordement et tests',
            description: 'Raccordements, soudures et tests optiques',
            duration: '1-2 jours',
            dependencies: ['phase_4'],
            deliverables: ['Soudures réalisées', 'Tests optiques', 'Mesures réflectométrie'],
            milestones: [
              {
                id: 'fiber_spliced',
                name: 'Raccordements terminés',
                description: 'Soudures et tests optiques validés',
                type: 'test',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_6',
            name: 'Recette technique',
            description: 'Tests finaux et préparation opérateur',
            duration: '1 jour',
            dependencies: ['phase_5'],
            deliverables: ['PV de recette', 'Mesures finales', 'Dossier technique opérateur'],
            milestones: [
              {
                id: 'fiber_acceptance',
                name: 'Recette technique',
                description: 'Validation technique pour opérateur',
                type: 'test',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          }
        ],
        defaultProducts: [
          {
            id: 'fiber_cables',
            name: 'Câbles fibre optique',
            description: 'Fibres monomode et multimode',
            isRequired: true,
            products: [
              {
                id: 'fiber_sm_g657',
                name: 'Fibre monomode G.657.A2',
                brand: 'Corning',
                model: 'OptiTap 12F',
                unitPrice: 2800,
                unit: 'mètre',
                specifications: ['12 fibres', 'G.657.A2', 'Gaine LSOH', 'Résistant flexion'],
                leadTime: '10 jours',
                supplier: 'Fournisseur Fibre'
              }
            ]
          },
          {
            id: 'bpi_equipment',
            name: 'BPI et équipements',
            description: 'Point de branchement et répartiteurs',
            isRequired: true,
            products: [
              {
                id: 'bpi_standard',
                name: 'BPI 8 départs',
                brand: 'CommScope',
                model: 'FlexNAP F08',
                unitPrice: 180000,
                unit: 'unité',
                specifications: ['8 départs', 'Étanche IP65', 'Verrouillable', 'Raccords SC/APC'],
                leadTime: '14 jours',
                supplier: 'Fournisseur Fibre'
              },
              {
                id: 'pbo_4ports',
                name: 'PBO 4 ports',
                brand: 'CommScope',
                model: 'FlexNAP F04',
                unitPrice: 45000,
                unit: 'unité',
                specifications: ['4 ports', 'Montage mural', 'Connecteurs SC/APC'],
                leadTime: '14 jours',
                supplier: 'Fournisseur Fibre'
              },
              {
                id: 'pto_simplex',
                name: 'PTO simplex',
                brand: 'CommScope',
                model: 'PTO-SC/APC',
                unitPrice: 8500,
                unit: 'unité',
                specifications: ['SC/APC', 'Encastrable', 'Faible perte insertion'],
                leadTime: '10 jours',
                supplier: 'Fournisseur Fibre'
              }
            ]
          },
          {
            id: 'splicing_accessories',
            name: 'Accessoires soudure',
            description: 'Épissurage et protection',
            isRequired: true,
            products: [
              {
                id: 'splice_tray',
                name: 'Cassette de soudure',
                brand: 'CommScope',
                model: 'Splice Tray 12F',
                unitPrice: 12000,
                unit: 'unité',
                specifications: ['12 soudures', 'Protection épissurage', 'Empilable'],
                leadTime: '7 jours',
                supplier: 'Fournisseur Fibre'
              }
            ]
          }
        ],
        quoteTemplate: {
          sections: [
            {
              id: 'fiber_infrastructure',
              title: 'Infrastructure fibre',
              description: 'BPI, PBO, câbles et accessoires',
              calculationType: 'quantity',
              basePrice: 0,
              includes: ['BPI', 'PBO', 'PTO', 'Fibres optiques', 'Cassettes']
            },
            {
              id: 'fiber_installation',
              title: 'Installation spécialisée',
              description: 'Tirage, soudure et tests optiques',
              calculationType: 'fixed',
              basePrice: 350000,
              includes: ['Tirage fibres', 'Soudures', 'Tests réflectométrie', 'Étiquetage', 'Documentation']
            },
            {
              id: 'fiber_testing',
              title: 'Tests et recette',
              description: 'Mesures optiques et certification',
              calculationType: 'fixed',
              basePrice: 80000,
              includes: ['Tests optiques', 'Mesures OTDR', 'Certificats', 'Dossier technique']
            }
          ],
          terms: [
            'Devis valable 45 jours',
            'Acompte de 30% à la commande',
            'Paiement selon avancement travaux',
            'Garantie 25 ans infrastructure passive, 2 ans équipements actifs'
          ],
          validityDays: 45,
          paymentTerms: ['30% acompte', '40% avancement', '30% recette']
        }
      },
      {
        id: 'digitalisation',
        name: 'Transformation Numérique',
        category: 'Digital',
        description: 'Digitalisation des processus métier',
        icon: Database,
        estimatedDuration: '30-90 jours',
        complexity: 'complex',
        phases: [
          {
            id: 'phase_1',
            name: 'Audit numérique',
            description: 'Analyse de l\'existant et besoins',
            duration: '5 jours',
            dependencies: [],
            deliverables: ['Audit digital', 'Cartographie processus', 'Recommandations'],
            milestones: [
              {
                id: 'digital_audit',
                name: 'Audit numérique',
                description: 'Évaluation maturité digitale',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_2',
            name: 'Conception solution',
            description: 'Architecture et spécifications',
            duration: '10 jours',
            dependencies: ['phase_1'],
            deliverables: ['Architecture technique', 'Spécifications fonctionnelles', 'Planning projet'],
            milestones: [
              {
                id: 'solution_design',
                name: 'Conception solution',
                description: 'Validation architecture',
                type: 'validation',
                triggerNext: true,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          },
          {
            id: 'phase_3',
            name: 'Développement',
            description: 'Développement applications/portails',
            duration: '30-60 jours',
            dependencies: ['phase_2'],
            deliverables: ['Applications', 'Interfaces', 'API'],
            milestones: [
              {
                id: 'dev_milestone_1',
                name: 'Livrable 1',
                description: 'Premier module opérationnel',
                type: 'delivery',
                triggerNext: false,
                clientVisible: true,
                autoNotify: true
              }
            ],
            isRequired: true
          }
          // ... autres phases
        ],
        defaultProducts: [
          {
            id: 'software',
            name: 'Licences logicielles',
            description: 'Licences et abonnements',
            isRequired: true,
            products: [
              {
                id: 'erp_license',
                name: 'Licence ERP',
                brand: 'IT Vision',
                model: 'Custom ERP',
                unitPrice: 500000,
                unit: 'licence',
                specifications: ['Multi-utilisateurs', 'Cloud ready', 'Mobile'],
                leadTime: '0 jours',
                supplier: 'IT Vision'
              }
            ]
          }
        ],
        quoteTemplate: {
          sections: [
            {
              id: 'consulting',
              title: 'Conseil et audit',
              description: 'Analyse et recommandations',
              calculationType: 'fixed',
              basePrice: 200000,
              includes: ['Audit', 'Recommandations', 'Roadmap']
            },
            {
              id: 'development',
              title: 'Développement',
              description: 'Applications sur mesure',
              calculationType: 'fixed',
              basePrice: 1500000,
              includes: ['Développement', 'Tests', 'Documentation']
            },
            {
              id: 'deployment',
              title: 'Déploiement',
              description: 'Mise en production et formation',
              calculationType: 'fixed',
              basePrice: 300000,
              includes: ['Déploiement', 'Formation', 'Support']
            }
          ],
          terms: [
            'Devis valable 90 jours',
            'Paiement selon jalons',
            'Support inclus 6 mois',
            'Évolutions sur devis'
          ],
          validityDays: 90,
          paymentTerms: ['30% démarrage', '40% livrables', '30% livraison']
        }
      }
    ])

    // Charger via API (fallback données exemple si échec)
    ;(async () => {
      try {
        const res = await fetch('/api/projects', { credentials: 'include' })
        if (res.ok) {
          const j = await res.json()
          if (j.success && Array.isArray(j.projects)) {
            const mapped: Project[] = j.projects.map((p: any) => ({
              id: String(p._id),
              name: p.name,
              description: p.description || '',
              serviceType: 'visiophonie',
              client: { company: p.clientId?.name || 'Client', contact: p.clientId?.name || '', phone: p.clientId?.phone || '', email: p.clientId?.email || '', address: p.address },
              site: { name: p.address, address: p.address, access: '', constraints: [] },
              status: 'lead', currentPhase: 'phase_1', progress: 0, value: 0, margin: 0,
              startDate: new Date(p.startDate).toISOString().split('T')[0], endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
              assignedTo: [], milestones: [], quote: null, products: [], timeline: [], risks: [], documents: [], clientAccess: false
            }))
            if (mapped.length > 0) {
              setProjects(mapped)
              if (typeof window !== 'undefined') localStorage.setItem(LOCAL_KEY, JSON.stringify(mapped))
              return
            }
          }
        }
      } catch {}
      // Fallback: localStorage puis exemples
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(LOCAL_KEY)
        if (raw) {
          try { setProjects(JSON.parse(raw)); return } catch {}
        }
      }
      setProjects([
      {
        id: 'PRJ-2024-001',
        name: 'Visiophonie Résidence Almadies',
        description: 'Installation système visiophonie 20 appartements',
        serviceType: 'visiophonie',
        client: {
          company: 'Résidence Almadies',
          contact: 'Moussa Kébé',
          phone: '+221 77 345 67 89',
          email: 'moussa@almadies.sn',
          address: 'Route des Almadies, Dakar'
        },
        site: {
          name: 'Résidence Almadies',
          address: 'Route des Almadies, Dakar',
          access: 'Accès libre 8h-18h',
          constraints: ['Résidents présents', 'Parkings limités']
        },
        status: 'in_progress',
        currentPhase: 'phase_3',
        progress: 65,
        value: 4200000,
        margin: 35,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        assignedTo: ['Cheikh Sy', 'Fatou Ndoye'],
        milestones: [
          {
            id: 'site_visit',
            name: 'Visite technique',
            description: 'Évaluation site et besoins',
            dueDate: '2024-02-05',
            status: 'completed',
            completedDate: '2024-02-03',
            dependencies: [],
            deliverables: ['Plan d\'installation'],
            clientNotified: true
          },
          {
            id: 'quote_approved',
            name: 'Devis approuvé',
            description: 'Validation client et signature',
            dueDate: '2024-02-12',
            status: 'completed',
            completedDate: '2024-02-10',
            dependencies: ['site_visit'],
            deliverables: ['Contrat signé'],
            clientNotified: true
          },
          {
            id: 'material_received',
            name: 'Matériel reçu',
            description: 'Réception et contrôle matériel',
            dueDate: '2024-02-20',
            status: 'in_progress',
            dependencies: ['quote_approved'],
            deliverables: ['Matériel contrôlé'],
            clientNotified: false
          }
        ],
        quote: {
          id: 'QUO-001',
          version: 2,
          sections: [
            {
              id: 'equipment',
              title: 'Équipements visiophonie',
              description: '20 écrans + 2 platines',
              calculationType: 'quantity',
              basePrice: 2800000,
              includes: ['20 écrans 7"', '2 platines de rue', 'Accessoires']
            }
          ],
          totalHT: 3500000,
          totalTTC: 4200000,
          margin: 35,
          validUntil: '2024-03-01',
          status: 'approved',
          sentDate: '2024-02-08',
          viewedDate: '2024-02-09',
          responseDate: '2024-02-10'
        },
        products: [
          {
            productId: 'screen_7inch',
            name: 'Écran visiophone 7"',
            brand: 'Hikvision',
            model: 'DS-KH6320-WTE1',
            quantity: 20,
            unitPrice: 85000,
            totalPrice: 1700000,
            status: 'ordered',
            supplier: 'Fournisseur A',
            leadTime: '7 jours',
            orderDate: '2024-02-12'
          }
        ],
        timeline: [
          {
            id: 'evt_1',
            date: '2024-02-01',
            type: 'created',
            title: 'Projet créé',
            description: 'Initialisation du projet',
            author: 'Admin',
            clientVisible: true
          },
          {
            id: 'evt_2',
            date: '2024-02-03',
            type: 'milestone',
            title: 'Visite technique réalisée',
            description: 'Évaluation complète du site',
            author: 'Cheikh Sy',
            clientVisible: true
          }
        ],
        risks: [
          {
            id: 'risk_1',
            title: 'Délai livraison matériel',
            description: 'Retard possible fournisseur',
            probability: 'medium',
            impact: 'medium',
            mitigation: 'Fournisseur alternatif identifié',
            status: 'monitoring'
          }
        ],
        documents: [
          {
            id: 'doc_1',
            name: 'Devis approuvé v2',
            type: 'quote',
            url: '/documents/quo-001-v2.pdf',
            uploadDate: '2024-02-10',
            clientVisible: true
          }
        ],
        clientAccess: true
      }
      ])
    })()
  }, [])

  // Ouvre la modale de création lorsqu'on reçoit un signal externe
  useEffect(() => {
    if (openNewProjectSignal && openNewProjectSignal > 0) {
      createNewProject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewProjectSignal])

  const createNewProject = () => {
    setNewProject({
      serviceType: '',
      client: {
        company: '',
        contact: '',
        phone: '',
        email: '',
        address: ''
      },
      site: {
        name: '',
        address: '',
        access: '',
        constraints: []
      }
    })
    setShowNewProjectModal(true)
  }

  const handleServiceSelect = (serviceId: string) => {
    const service = serviceTemplates.find(s => s.id === serviceId)
    setSelectedService(service || null)
    setNewProject(prev => ({ ...prev, serviceType: serviceId }))
  }

  const saveProject = async () => {
    if (!selectedService || !newProject.client?.company) return

    const projectId = `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`
    
    const project: Project = {
      id: projectId,
      name: newProject.name || `${selectedService.name} - ${newProject.client.company}`,
      description: newProject.description || `Projet ${selectedService.name}`,
      serviceType: selectedService.id,
      client: newProject.client as any,
      site: newProject.site as any,
      status: 'lead',
      currentPhase: selectedService.phases[0].id,
      progress: 0,
      value: 0,
      margin: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      assignedTo: [],
      milestones: selectedService.phases.flatMap(phase => 
        phase.milestones.map(milestone => ({
          ...milestone,
          dueDate: '',
          status: 'pending' as const,
          dependencies: [],
          deliverables: [],
          clientNotified: false
        }))
      ),
      quote: null,
      products: [],
      timeline: [{
        id: 'create',
        date: new Date().toISOString(),
        type: 'created',
        title: 'Projet créé',
        description: 'Initialisation du projet',
        author: 'Admin',
        clientVisible: true
      }],
      risks: [],
      documents: [],
      clientAccess: false
    }

    // Persistance API si disponible
    try {
      setIsSaving(true)
      const payload = {
        name: project.name,
        description: project.description,
        address: project.site.address,
        clientId: (projects[0] as any)?.clientId || '000000000000000000000000',
        startDate: project.startDate
      }
      await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
    } catch {} finally { setIsSaving(false) }

    setProjects(prev => [...prev, project])
    if (typeof window !== 'undefined') {
      const updated = [...projects, project]
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    }
    setShowNewProjectModal(false)
    setNewProject({})
    setSelectedService(null)
  }

  const openProjectModal = (project: Project) => {
    setSelectedProject(project)
    setShowProjectModal(true)
  }

  const updateSelectedProjectField = (field: keyof Project, value: any) => {
    if (!selectedProject) return
    setSelectedProject({ ...selectedProject, [field]: value })
  }

  const saveSelectedProject = async () => {
    if (!selectedProject) return
    setIsSaving(true)
    try {
      // API PUT si dispo
      await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({
        id: selectedProject.id,
        name: selectedProject.name,
        description: selectedProject.description,
        address: selectedProject.site.address,
        status: 'ACTIVE',
        endDate: selectedProject.endDate || null
      }) })
      // Synchroniser ressources granulaires
      // Milestones (exemple: envoyer les jalons en "upsert" simple via PATCH unitaire)
      for (const m of selectedProject.milestones || []) {
        await apiUpdateMilestone(selectedProject.id, m.id, m)
      }
      // Produits
      for (const p of selectedProject.products || []) {
        await apiUpdateProduct(selectedProject.id, p.productId, p)
      }
      // Documents: pas d'update dédié, seulement POST/DELETE — on laisse tel quel
      // Timeline: idem, création/suppression — pas d'update dédié
      // Devis
      if (selectedProject.quote) {
        await apiPatchQuote(selectedProject.id, selectedProject.quote)
      }
    } catch {} finally { setIsSaving(false) }
    setProjects(prev => prev.map(p => p.id === selectedProject.id ? selectedProject : p))
    if (typeof window !== 'undefined') {
      const updated = projects.map(p => p.id === selectedProject.id ? selectedProject : p)
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    }
    setShowProjectModal(false)
  }

  const advanceToNextPhase = () => {
    if (!selectedProject) return
    const service = serviceTemplates.find(s => s.id === selectedProject.serviceType)
    if (!service) return
    const idx = service.phases.findIndex(p => p.id === selectedProject.currentPhase)
    const next = idx >= 0 && idx < service.phases.length - 1 ? service.phases[idx + 1].id : service.phases[idx]?.id
    const newProgress = Math.min(100, selectedProject.progress + Math.round(100 / service.phases.length))
    const updated = { ...selectedProject, currentPhase: next || selectedProject.currentPhase, progress: newProgress }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    ;(async()=>{
      try {
        await fetch('/api/projects/advance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: updated.id, nextPhase: updated.currentPhase, progress: updated.progress }) })
      } catch {}
    })()
    if (typeof window !== 'undefined') {
      const updatedList = projects.map(p => p.id === updated.id ? updated : p)
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updatedList))
    }
  }

  // Handlers UI pour jalons / produits / documents / timeline
  const addMilestoneUI = async () => {
    if (!selectedProject) return
    setBusyAction('milestone_add')
    const newMilestoneId = `mil_${Date.now()}`
    const newMilestone: any = {
      id: newMilestoneId,
      name: 'Nouveau jalon',
      description: '',
      dueDate: '',
      status: 'pending',
      dependencies: [],
      deliverables: [],
      clientNotified: false
    }
    const updated = { ...selectedProject, milestones: [...(selectedProject.milestones || []), newMilestone] }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiAddMilestone(selectedProject.id, newMilestone)
      setToast({ type: 'success', message: 'Jalon ajouté' })
    } catch (e) {
      setToast({ type: 'error', message: 'Erreur lors de l’ajout du jalon' })
    } finally { setBusyAction(null) }
  }

  const removeMilestoneUI = async (mid: string) => {
    if (!selectedProject) return
    setBusyAction(`milestone_del_${mid}`)
    const updated = { ...selectedProject, milestones: (selectedProject.milestones || []).filter(m => m.id !== mid) }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiDeleteMilestone(selectedProject.id, mid)
      setToast({ type: 'success', message: 'Jalon supprimé' })
    } catch (e) {
      setToast({ type: 'error', message: 'Suppression du jalon échouée' })
    } finally { setBusyAction(null) }
  }

  const addProductUI = async () => {
    if (!selectedProject) return
    setBusyAction('product_add')
    const productId = `prod_${Date.now()}`
    const newProd: any = {
      productId,
      name: 'Produit',
      brand: '',
      model: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      status: 'planned'
    }
    const updated = { ...selectedProject, products: [...(selectedProject.products || []), newProd] }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiAddProduct(selectedProject.id, newProd)
      setToast({ type: 'success', message: 'Produit ajouté' })
    } catch (e) {
      setToast({ type: 'error', message: 'Erreur lors de l’ajout du produit' })
    } finally { setBusyAction(null) }
  }

  const removeProductUI = async (pid: string) => {
    if (!selectedProject) return
    setBusyAction(`product_del_${pid}`)
    const updated = { ...selectedProject, products: (selectedProject.products || []).filter(p => p.productId !== pid) }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiDeleteProduct(selectedProject.id, pid)
      setToast({ type: 'success', message: 'Produit supprimé' })
    } catch (e) {
      setToast({ type: 'error', message: 'Suppression du produit échouée' })
    } finally { setBusyAction(null) }
  }

  const addDocumentUI = async () => {
    if (!selectedProject) return
    setBusyAction('document_add')
    const id = `doc_${Date.now()}`
    const newDoc: any = {
      id,
      name: 'Document',
      type: 'technical',
      url: `/documents/${id}.pdf`,
      uploadDate: new Date().toISOString().split('T')[0],
      clientVisible: true
    }
    const updated = { ...selectedProject, documents: [...(selectedProject.documents || []), newDoc] }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiAddDocument(selectedProject.id, newDoc)
      setToast({ type: 'success', message: 'Document ajouté' })
    } catch (e) {
      setToast({ type: 'error', message: 'Erreur lors de l’ajout du document' })
    } finally { setBusyAction(null) }
  }

  const removeDocumentUI = async (did: string) => {
    if (!selectedProject) return
    setBusyAction(`document_del_${did}`)
    const updated = { ...selectedProject, documents: (selectedProject.documents || []).filter(d => d.id !== did) }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiDeleteDocument(selectedProject.id, did)
      setToast({ type: 'success', message: 'Document supprimé' })
    } catch (e) {
      setToast({ type: 'error', message: 'Suppression du document échouée' })
    } finally { setBusyAction(null) }
  }

  const addTimelineEventUI = async () => {
    if (!selectedProject) return
    setBusyAction('timeline_add')
    const id = `evt_${Date.now()}`
    const newEvt: any = {
      id,
      date: new Date().toISOString(),
      type: 'milestone',
      title: 'Événement',
      description: '',
      author: 'Admin',
      clientVisible: true
    }
    const updated = { ...selectedProject, timeline: [...(selectedProject.timeline || []), newEvt] }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiAddTimelineEvent(selectedProject.id, newEvt)
      setToast({ type: 'success', message: 'Événement ajouté' })
    } catch (e) {
      setToast({ type: 'error', message: 'Erreur lors de l’ajout de l’événement' })
    } finally { setBusyAction(null) }
  }

  const removeTimelineEventUI = async (eid: string) => {
    if (!selectedProject) return
    setBusyAction(`timeline_del_${eid}`)
    const updated = { ...selectedProject, timeline: (selectedProject.timeline || []).filter(e => e.id !== eid) }
    setSelectedProject(updated)
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    try {
      await apiDeleteTimelineEvent(selectedProject.id, eid)
      setToast({ type: 'success', message: 'Événement supprimé' })
    } catch (e) {
      setToast({ type: 'error', message: 'Suppression de l’événement échouée' })
    } finally { setBusyAction(null) }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead': return 'bg-gray-100 text-gray-800'
      case 'quoted': return 'bg-blue-100 text-blue-800'
      case 'negotiation': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-purple-100 text-purple-800'
      case 'testing': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-emerald-100 text-emerald-800'
      case 'maintenance': return 'bg-cyan-100 text-cyan-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'delayed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getServiceIcon = (serviceType: string) => {
    const service = serviceTemplates.find(s => s.id === serviceType)
    if (service) {
      const IconComponent = service.icon
      return <IconComponent className="h-5 w-5" />
    }
    return <Settings className="h-5 w-5" />
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'
        }`}
          onAnimationEnd={() => setTimeout(()=>setToast(null), 1800)}
        >
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🏗️ Gestion de Projets IT Vision
            </h1>
            <p className="text-gray-600">
              Workflow complet de la prospection à la livraison
            </p>
          </div>
          
          <button
            onClick={createNewProject}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Nouveau Projet</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'projects', label: 'Projets', icon: Layers },
            { id: 'templates', label: 'Templates Services', icon: FileText },
            { id: 'workflow', label: 'Moteur Workflow', icon: GitBranch, link: '/workflow-engine' },
            { id: 'quotes', label: 'Générateur Devis', icon: Calculator, link: '/generateur-devis' },
            { id: 'pipeline', label: 'Pipeline Commercial', icon: TrendingUp },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
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

      {/* Liste des projets */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Projets en cours ({projects.length})
            </h3>

            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="font-mono text-sm text-gray-500">{project.id}</span>
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getServiceIcon(project.serviceType)}
                          <span className="ml-1">{project.status.replace('_', ' ')}</span>
                        </span>
                        <span className="text-sm text-gray-500">Phase: {project.currentPhase}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                          <p className="text-sm text-gray-600">{project.client.company}</p>
                          <p className="text-sm text-gray-600">Contact: {project.client.contact}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Site: <span className="font-medium">{project.site.name}</span></p>
                          <p className="text-sm text-gray-600">Équipe: <span className="font-medium">{project.assignedTo.join(', ') || 'Non assignée'}</span></p>
                          <p className="text-sm text-gray-600">Type: <span className="font-medium capitalize">{project.serviceType.replace('_', ' ')}</span></p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Valeur: <span className="font-medium text-green-600">{project.value > 0 ? formatCurrency(project.value) : 'À définir'}</span></p>
                          <p className="text-sm text-gray-600">Début: <span className="font-medium">{new Date(project.startDate).toLocaleDateString('fr-FR')}</span></p>
                          <p className="text-sm text-gray-600">Fin: <span className="font-medium">{project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : 'À planifier'}</span></p>
                        </div>
                      </div>

                      {/* Progression */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Progression:</span>
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{project.progress}%</span>
                          </div>
                          
                          {project.risks.length > 0 && (
                            <div className="flex items-center space-x-1 text-yellow-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm">{project.risks.length} risque(s)</span>
                            </div>
                          )}
                        </div>

                        {/* Prochaine milestone */}
                        {project.milestones.find(m => m.status === 'pending' || m.status === 'in_progress') && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Prochaine étape:</p>
                            <p className="text-sm font-medium text-blue-600">
                              {project.milestones.find(m => m.status === 'pending' || m.status === 'in_progress')?.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => openProjectModal(project)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Détails</span>
                      </button>
                      
                      <button onClick={() => openProjectModal(project)} className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors cursor-pointer">
                        <Edit3 className="h-4 w-4" />
                        <span>Modifier</span>
                      </button>
                      
                      <a
                        href="/generateur-devis"
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Devis</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates de services */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Templates de Services ({serviceTemplates.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {serviceTemplates.map((template) => {
                const IconComponent = template.icon
                return (
                  <div key={template.id} className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.category}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        template.complexity === 'complex' ? 'bg-red-100 text-red-800' :
                        template.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {template.complexity}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-4">{template.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Phases:</span>
                        <p className="font-medium">{template.phases.length}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Durée:</span>
                        <p className="font-medium">{template.estimatedDuration}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Produits:</span>
                        <p className="font-medium">{template.defaultProducts.length} catégories</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Jalons:</span>
                        <p className="font-medium">{template.phases.reduce((acc, phase) => acc + phase.milestones.length, 0)}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <button className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                          <Eye className="h-3 w-3" />
                          <span>Voir détails</span>
                        </button>
                        <button className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm">
                          <Edit3 className="h-3 w-3" />
                          <span>Modifier</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal nouveau projet */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Nouveau Projet</h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Sélection service */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">1. Type de service</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceTemplates.map((template) => {
                    const IconComponent = template.icon
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleServiceSelect(template.id)}
                        className={`text-left p-4 border rounded-xl transition-colors ${
                          selectedService?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                          <span className="font-medium">{template.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedService && (
                <>
                  {/* Informations client */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">2. Informations client</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
                        <input
                          type="text"
                          value={newProject.client?.company || ''}
                          onChange={(e) => setNewProject(prev => ({
                            ...prev,
                            client: { ...prev.client, company: e.target.value } as any
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom de l'entreprise"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                        <input
                          type="text"
                          value={newProject.client?.contact || ''}
                          onChange={(e) => setNewProject(prev => ({
                            ...prev,
                            client: { ...prev.client, contact: e.target.value } as any
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom du contact"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                        <input
                          type="tel"
                          value={newProject.client?.phone || ''}
                          onChange={(e) => setNewProject(prev => ({
                            ...prev,
                            client: { ...prev.client, phone: e.target.value } as any
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="+221 XX XXX XX XX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={newProject.client?.email || ''}
                          onChange={(e) => setNewProject(prev => ({
                            ...prev,
                            client: { ...prev.client, email: e.target.value } as any
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="contact@entreprise.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informations site */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">3. Site d'intervention</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nom du site</label>
                        <input
                          type="text"
                          value={newProject.site?.name || ''}
                          onChange={(e) => setNewProject(prev => ({
                            ...prev,
                            site: { ...prev.site, name: e.target.value } as any
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom du site"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                        <input
                          type="text"
                          value={newProject.site?.address || ''}
                          onChange={(e) => setNewProject(prev => ({
                            ...prev,
                            site: { ...prev.site, address: e.target.value } as any
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Adresse complète"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description du besoin</label>
                      <textarea
                        value={newProject.description || ''}
                        onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Décrivez brièvement le besoin du client..."
                      />
                    </div>
                  </div>

                  {/* Aperçu workflow */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">4. Workflow prévu</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Ce projet suivra le workflow <strong>{selectedService.name}</strong> avec les phases suivantes :
                      </p>
                      <div className="space-y-2">
                        {selectedService.phases.map((phase, index) => (
                          <div key={phase.id} className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{phase.name}</span>
                              <span className="text-sm text-gray-600 ml-2">({phase.duration})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        Durée estimée totale : <strong>{selectedService.estimatedDuration}</strong>
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                
                <button
                  onClick={saveProject}
                  disabled={!selectedService || !newProject.client?.company || isSaving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Créer le projet</span>
                </button>
      {/* Modal détail/modification projet */}
      {showProjectModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Détails du projet</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={()=>setShowProjectModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Nom du projet</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={selectedProject.name} onChange={e=>updateSelectedProjectField('name', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Adresse</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={selectedProject.site.address} onChange={e=>setSelectedProject({ ...selectedProject, site: { ...selectedProject.site, address: e.target.value }})} />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">Description</label>
                <textarea className="w-full border rounded-lg px-3 py-2" rows={3} value={selectedProject.description} onChange={e=>updateSelectedProjectField('description', e.target.value)} />
              </div>
              {/* Sous-ressources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jalons */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Jalons</h4>
                    <button onClick={addMilestoneUI} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={busyAction==='milestone_add'}>
                      {busyAction==='milestone_add' ? <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Patientez</span> : '+ Ajouter'}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {(selectedProject.milestones || []).map(m => (
                      <li key={m.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                        <input
                          className="truncate mr-2 bg-transparent outline-none flex-1"
                          value={m.name}
                          onChange={e=>{
                            const name = e.target.value
                            const updated = { ...selectedProject!, milestones: (selectedProject!.milestones||[]).map(x=>x.id===m.id?{...x, name}:x) }
                            setSelectedProject(updated)
                          }}
                          onBlur={async()=>{
                            try { await apiUpdateMilestone(selectedProject!.id, m.id, m) ; setToast({type:'success',message:'Jalon mis à jour'}) } catch { setToast({type:'error',message:'MAJ jalon échouée'}) }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{m.status}</span>
                          <button onClick={()=>removeMilestoneUI(m.id)} className="text-xs text-red-600 hover:underline disabled:opacity-50" disabled={busyAction===`milestone_del_${m.id}`}>{busyAction===`milestone_del_${m.id}` ? '...' : 'Supprimer'}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Produits */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Produits</h4>
                    <button onClick={addProductUI} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={busyAction==='product_add'}>
                      {busyAction==='product_add' ? <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Patientez</span> : '+ Ajouter'}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {(selectedProject.products || []).map(p => (
                      <li key={p.productId} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1 gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <input className="w-40 bg-transparent outline-none" value={p.name} onChange={e=>{
                            const name=e.target.value; setSelectedProject(sp=>({ ...sp!, products:(sp!.products||[]).map(x=>x.productId===p.productId?{...x,name}:x) }))
                          }} onBlur={async()=>{ try{ await apiUpdateProduct(selectedProject!.id,p.productId,p); setToast({type:'success',message:'Produit mis à jour'}) }catch{ setToast({type:'error',message:'MAJ produit échouée'}) } }} />
                          <input type="number" className="w-16 bg-transparent outline-none" value={p.quantity} onChange={e=>{
                            const quantity = Number(e.target.value||0); setSelectedProject(sp=>({ ...sp!, products:(sp!.products||[]).map(x=>x.productId===p.productId?{...x,quantity,totalPrice:(x.unitPrice||0)*quantity}:x) }))
                          }} onBlur={async()=>{ try{ await apiUpdateProduct(selectedProject!.id,p.productId,p); setToast({type:'success',message:'Quantité mise à jour'}) }catch{ setToast({type:'error',message:'MAJ produit échouée'}) } }} />
                          <input type="number" className="w-20 bg-transparent outline-none" value={p.unitPrice} onChange={e=>{
                            const unitPrice = Number(e.target.value||0); setSelectedProject(sp=>({ ...sp!, products:(sp!.products||[]).map(x=>x.productId===p.productId?{...x,unitPrice,totalPrice:unitPrice*(x.quantity||0)}:x) }))
                          }} onBlur={async()=>{ try{ await apiUpdateProduct(selectedProject!.id,p.productId,p); setToast({type:'success',message:'Prix unitaire mis à jour'}) }catch{ setToast({type:'error',message:'MAJ produit échouée'}) } }} />
                          <span className="text-xs text-gray-500">Total: {p.totalPrice || 0}</span>
                        </div>
                        <button onClick={()=>removeProductUI(p.productId)} className="text-xs text-red-600 hover:underline disabled:opacity-50" disabled={busyAction===`product_del_${p.productId}`}>{busyAction===`product_del_${p.productId}` ? '...' : 'Supprimer'}</button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Documents */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Documents</h4>
                    <button onClick={addDocumentUI} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={busyAction==='document_add'}>
                      {busyAction==='document_add' ? <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Patientez</span> : '+ Ajouter'}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {(selectedProject.documents || []).map(d => (
                      <li key={d.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                        <a href={d.url} target="_blank" className="truncate mr-2 text-blue-600 hover:underline">{d.name}</a>
                        <button onClick={()=>removeDocumentUI(d.id)} className="text-xs text-red-600 hover:underline disabled:opacity-50" disabled={busyAction===`document_del_${d.id}`}>{busyAction===`document_del_${d.id}` ? '...' : 'Supprimer'}</button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Timeline */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Chronologie</h4>
                    <button onClick={addTimelineEventUI} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={busyAction==='timeline_add'}>
                      {busyAction==='timeline_add' ? <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Patientez</span> : '+ Ajouter'}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {(selectedProject.timeline || []).map(e => (
                      <li key={e.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                        <span className="truncate mr-2">{new Date(e.date).toLocaleDateString('fr-FR')} — {e.title}</span>
                        <button onClick={()=>removeTimelineEventUI(e.id)} className="text-xs text-red-600 hover:underline disabled:opacity-50" disabled={busyAction===`timeline_del_${e.id}`}>{busyAction===`timeline_del_${e.id}` ? '...' : 'Supprimer'}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={advanceToNextPhase} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">Étape suivante</button>
                <button onClick={saveSelectedProject} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}