'use client'

import { useState, useEffect } from 'react'
import { 
  Calculator, 
  DollarSign, 
  FileText, 
  Package, 
  Settings, 
  Eye, 
  Send, 
  Download, 
  Save, 
  Edit3, 
  Plus, 
  Minus, 
  Copy, 
  Check, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Layers, 
  Building, 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Camera,
  Shield,
  Flame,
  Smartphone,
  Wifi,
  Monitor,
  Wrench,
  Truck,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Info,
  Star,
  Award,
  Zap,
  Search
} from 'lucide-react'

interface QuoteSection {
  id: string
  title: string
  description: string
  type: 'equipment' | 'labor' | 'materials' | 'services' | 'other'
  items: QuoteItem[]
  subtotal: number
  margin: number
  isRequired: boolean
  isExpanded: boolean
}

interface QuoteItem {
  id: string
  name: string
  description: string
  brand?: string
  model?: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  margin: number
  supplier?: string
  leadTime?: string
  specifications?: string[]
  category: string
  isOptional: boolean
  discount: number
}

interface QuoteTemplate {
  id: string
  name: string
  serviceType: string
  description: string
  sections: QuoteSection[]
  terms: string[]
  validityDays: number
  paymentTerms: string[]
  defaultMargin: number
  minimumMargin: number
  currency: string
}

interface ProjectQuote {
  id: string
  projectId: string
  clientId: string
  version: number
  status: 'draft' | 'review' | 'sent' | 'viewed' | 'negotiation' | 'approved' | 'rejected'
  sections: QuoteSection[]
  totals: {
    subtotalHT: number
    discountAmount: number
    totalHT: number
    taxAmount: number
    totalTTC: number
    margin: number
    marginAmount: number
  }
  metadata: {
    createdAt: string
    createdBy: string
    lastModified: string
    sentAt?: string
    viewedAt?: string
    validUntil: string
    currency: string
  }
  client: {
    company: string
    contact: string
    email: string
    phone: string
    address: string
  }
  terms: string[]
  paymentTerms: string[]
  notes?: string
  alternatives?: QuoteAlternative[]
  analytics?: QuoteAnalytics
}

interface QuoteAlternative {
  id: string
  name: string
  description: string
  totalHT: number
  margin: number
  pros: string[]
  cons: string[]
}

interface QuoteAnalytics {
  competitiveIndex: number
  marketPosition: 'low' | 'competitive' | 'premium'
  winProbability: number
  suggestedActions: string[]
}

interface PricingRule {
  id: string
  name: string
  condition: string
  action: 'apply_discount' | 'increase_margin' | 'suggest_alternative' | 'require_approval'
  value: number
  description: string
  isActive: boolean
}

export default function IntelligentQuoteGenerator() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [currentQuote, setCurrentQuote] = useState<ProjectQuote | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null)
  const [activeTab, setActiveTab] = useState('builder')
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [catalogService, setCatalogService] = useState<string>('videosurveillance')
  const [catalogSearch, setCatalogSearch] = useState<string>('')

  // Templates de devis par service
  useEffect(() => {
    setTemplates([
      {
        id: 'visiophonie_template',
        name: 'Template Visiophonie',
        serviceType: 'visiophonie',
        description: 'Devis type pour installation visiophonie',
        defaultMargin: 35,
        minimumMargin: 25,
        currency: 'FCFA',
        validityDays: 30,
        paymentTerms: ['50% acompte à la commande', '50% solde à la livraison'],
        terms: [
          'Devis valable 30 jours',
          'Garantie 2 ans pièces et main d\'œuvre',
          'Installation comprise dans le prix',
          'Formation utilisateurs incluse',
          'Maintenance disponible sur contrat séparé'
        ],
        sections: [
          {
            id: 'equipment',
            title: 'Équipements Visiophonie',
            description: 'Matériel principal du système',
            type: 'equipment',
            subtotal: 0,
            margin: 35,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'screen_7inch',
                name: 'Écran visiophone 7" tactile',
                description: 'Écran couleur tactile avec WiFi intégré',
                brand: 'Hikvision',
                model: 'DS-KH6320-WTE1',
                quantity: 1,
                unit: 'unité',
                unitPrice: 65000,
                totalPrice: 65000,
                margin: 35,
                supplier: 'Fournisseur A',
                leadTime: '7 jours',
                specifications: ['Écran 7" tactile', 'WiFi intégré', 'Mémoire 32GB', 'Sortie audio'],
                category: 'Écrans',
                isOptional: false,
                discount: 0
              },
              {
                id: 'outdoor_station',
                name: 'Platine de rue IP',
                description: 'Platine extérieure avec caméra HD',
                brand: 'Hikvision',
                model: 'DS-KV8113-WME1',
                quantity: 1,
                unit: 'unité',
                unitPrice: 95000,
                totalPrice: 95000,
                margin: 30,
                supplier: 'Fournisseur A',
                leadTime: '7 jours',
                specifications: ['Caméra 2MP', 'Vision nocturne', 'Étanche IP65', 'Bouton appel'],
                category: 'Platines',
                isOptional: false,
                discount: 0
              }
            ]
          },
          {
            id: 'cabling',
            title: 'Câblage et Infrastructure',
            description: 'Câbles et accessoires réseau',
            type: 'materials',
            subtotal: 0,
            margin: 40,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'cable_cat6',
                name: 'Câble Cat6 UTP',
                description: 'Câble réseau certifié Cat6',
                brand: 'Legrand',
                model: 'Cat6 UTP 305m',
                quantity: 50,
                unit: 'mètre',
                unitPrice: 1200,
                totalPrice: 60000,
                margin: 40,
                supplier: 'Fournisseur B',
                leadTime: '3 jours',
                specifications: ['Cat6 certifié', 'Gaine LSOH', 'Cuivre pur'],
                category: 'Câblage',
                isOptional: false,
                discount: 0
              },
              {
                id: 'conduit',
                name: 'Gaine de protection',
                description: 'Gaine pour protection câbles',
                quantity: 30,
                unit: 'mètre',
                unitPrice: 800,
                totalPrice: 24000,
                margin: 45,
                category: 'Accessoires',
                isOptional: true,
                discount: 0
              }
            ]
          },
          {
            id: 'installation',
            title: 'Installation et Configuration',
            description: 'Main d\'œuvre spécialisée',
            type: 'labor',
            subtotal: 0,
            margin: 0,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'installation_labor',
                name: 'Installation complète',
                description: 'Pose, câblage et configuration système',
                quantity: 1,
                unit: 'forfait',
                unitPrice: 120000,
                totalPrice: 120000,
                margin: 0,
                category: 'Main d\'œuvre',
                isOptional: false,
                discount: 0
              },
              {
                id: 'configuration',
                name: 'Configuration et tests',
                description: 'Paramétrage et tests système',
                quantity: 1,
                unit: 'forfait',
                unitPrice: 50000,
                totalPrice: 50000,
                margin: 0,
                category: 'Configuration',
                isOptional: false,
                discount: 0
              },
              {
                id: 'training',
                name: 'Formation utilisateurs',
                description: 'Formation sur site',
                quantity: 2,
                unit: 'heure',
                unitPrice: 15000,
                totalPrice: 30000,
                margin: 0,
                category: 'Formation',
                isOptional: true,
                discount: 0
              }
            ]
          }
        ]
      },
      {
        id: 'videosurveillance_template',
        name: 'Template Vidéosurveillance',
        serviceType: 'videosurveillance',
        description: 'Devis type pour système vidéosurveillance',
        defaultMargin: 30,
        minimumMargin: 20,
        currency: 'FCFA',
        validityDays: 45,
        paymentTerms: ['40% acompte à la commande', '60% solde à la recette'],
        terms: [
          'Devis valable 45 jours',
          'Garantie 3 ans équipements, 1 an main d\'œuvre',
          'Installation et configuration incluses',
          'Formation et documentation comprises',
          'Support technique 6 mois offert'
        ],
        sections: [
          {
            id: 'cameras',
            title: 'Caméras de Surveillance',
            description: 'Caméras IP haute définition',
            type: 'equipment',
            subtotal: 0,
            margin: 30,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'camera_4k_dome',
                name: 'Caméra dôme 4K',
                description: 'Caméra dôme intérieure 4K',
                brand: 'Hikvision',
                model: 'DS-2CD2143G2-I',
                quantity: 4,
                unit: 'unité',
                unitPrice: 35000,
                totalPrice: 140000,
                margin: 30,
                supplier: 'Fournisseur A',
                leadTime: '10 jours',
                specifications: ['4K UHD', 'Vision nocturne 30m', 'PoE', 'IP67'],
                category: 'Caméras intérieures',
                isOptional: false,
                discount: 0
              },
              {
                id: 'camera_4k_bullet',
                name: 'Caméra tube 4K',
                description: 'Caméra extérieure 4K',
                brand: 'Hikvision',
                model: 'DS-2CD2T43G2-2I',
                quantity: 6,
                unit: 'unité',
                unitPrice: 42000,
                totalPrice: 252000,
                margin: 28,
                supplier: 'Fournisseur A',
                leadTime: '10 jours',
                specifications: ['4K UHD', 'Vision nocturne 40m', 'PoE+', 'IP67'],
                category: 'Caméras extérieures',
                isOptional: false,
                discount: 0
              }
            ]
          },
          {
            id: 'recording',
            title: 'Enregistrement et Stockage',
            description: 'NVR et disques de stockage',
            type: 'equipment',
            subtotal: 0,
            margin: 25,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'nvr_16ch',
                name: 'NVR 16 canaux 4K',
                description: 'Enregistreur réseau 16 canaux',
                brand: 'Hikvision',
                model: 'DS-7616NI-I2/16P',
                quantity: 1,
                unit: 'unité',
                unitPrice: 180000,
                totalPrice: 180000,
                margin: 25,
                supplier: 'Fournisseur A',
                leadTime: '7 jours',
                specifications: ['16 canaux PoE', '4K H.265+', '2x SATA', 'HDMI 4K'],
                category: 'Enregistreurs',
                isOptional: false,
                discount: 0
              },
              {
                id: 'hdd_8tb',
                name: 'Disque dur 8TB',
                description: 'Disque spécialisé surveillance',
                brand: 'Western Digital',
                model: 'WD Purple 8TB',
                quantity: 2,
                unit: 'unité',
                unitPrice: 95000,
                totalPrice: 190000,
                margin: 20,
                supplier: 'Fournisseur C',
                leadTime: '5 jours',
                specifications: ['8TB', 'Optimisé surveillance', '3 ans garantie'],
                category: 'Stockage',
                isOptional: false,
                discount: 0
              }
            ]
          }
        ]
      },
      {
        id: 'domotique_template',
        name: 'Template Domotique',
        serviceType: 'domotique',
        description: 'Devis type pour installation domotique',
        defaultMargin: 40,
        minimumMargin: 30,
        currency: 'FCFA',
        validityDays: 30,
        paymentTerms: ['50% acompte à la commande', '50% solde à la livraison'],
        terms: [
          'Devis valable 30 jours',
          'Garantie 2 ans équipements, 1 an configuration',
          'Installation et programmation incluses',
          'Formation utilisateur comprise',
          'Support technique 3 mois offert'
        ],
        sections: [
          {
            id: 'hub_system',
            title: 'Hub Central et Infrastructure',
            description: 'Hub central Zigbee et équipements de base',
            type: 'equipment',
            subtotal: 0,
            margin: 40,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'hub_zigbee',
                name: 'Hub Central Zigbee',
                description: 'Hub central pour gestion domotique',
                brand: 'Aqara',
                model: 'Hub M2',
                quantity: 1,
                unit: 'unité',
                unitPrice: 45000,
                totalPrice: 45000,
                margin: 40,
                supplier: 'Fournisseur Smart',
                leadTime: '7 jours',
                specifications: ['Zigbee 3.0', 'WiFi', 'Bluetooth', 'Contrôle IR'],
                category: 'Hub central',
                isOptional: false,
                discount: 0
              }
            ]
          },
          {
            id: 'smart_devices',
            title: 'Équipements Intelligents',
            description: 'Modules et capteurs smart',
            type: 'equipment',
            subtotal: 0,
            margin: 35,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'micro_module_switch',
                name: 'Micro-module interrupteur',
                description: 'Module intelligent sans neutre',
                brand: 'Aqara',
                model: 'Relay T1',
                quantity: 1,
                unit: 'unité',
                unitPrice: 18000,
                totalPrice: 18000,
                margin: 35,
                supplier: 'Fournisseur Smart',
                leadTime: '5 jours',
                specifications: ['Zigbee 3.0', 'Sans neutre', '16A max'],
                category: 'Modules',
                isOptional: false,
                discount: 0
              },
              {
                id: 'smart_plug',
                name: 'Prise connectée 16A',
                description: 'Prise intelligente avec mesure',
                brand: 'Aqara',
                model: 'Smart Plug',
                quantity: 1,
                unit: 'unité',
                unitPrice: 12000,
                totalPrice: 12000,
                margin: 35,
                supplier: 'Fournisseur Smart',
                leadTime: '5 jours',
                specifications: ['Zigbee 3.0', '16A', 'Mesure consommation'],
                category: 'Prises',
                isOptional: true,
                discount: 0
              }
            ]
          }
        ]
      },
      {
        id: 'network_cabling_template',
        name: 'Template Câblage Réseau',
        serviceType: 'network_cabling',
        description: 'Devis type pour câblage réseau et TV',
        defaultMargin: 35,
        minimumMargin: 25,
        currency: 'FCFA',
        validityDays: 30,
        paymentTerms: ['40% acompte à la commande', '60% solde à la recette'],
        terms: [
          'Devis valable 30 jours',
          'Garantie 25 ans câblage, 5 ans équipements actifs',
          'Installation et tests inclus',
          'Certification performance comprise',
          'Documentation technique fournie'
        ],
        sections: [
          {
            id: 'cabling_materials',
            title: 'Câbles et Matériaux',
            description: 'Câbles réseau, TV et accessoires',
            type: 'materials',
            subtotal: 0,
            margin: 40,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'cable_cat6a',
                name: 'Câble Cat6A UTP',
                description: 'Câble réseau haute performance',
                brand: 'Legrand',
                model: 'Cat6A 305m',
                quantity: 1,
                unit: 'mètre',
                unitPrice: 1800,
                totalPrice: 1800,
                margin: 40,
                supplier: 'Fournisseur Réseau',
                leadTime: '3 jours',
                specifications: ['Cat6A certifié', '10 Gbps', 'Gaine LSOH'],
                category: 'Câblage',
                isOptional: false,
                discount: 0
              },
              {
                id: 'coax_cable',
                name: 'Câble coaxial RG6',
                description: 'Câble TV satellite triple blindage',
                brand: 'Legrand',
                model: 'RG6 Tri-shield',
                quantity: 1,
                unit: 'mètre',
                unitPrice: 800,
                totalPrice: 800,
                margin: 40,
                supplier: 'Fournisseur Réseau',
                leadTime: '3 jours',
                specifications: ['Triple blindage', 'Impédance 75Ω', 'Gaine extérieure'],
                category: 'Câblage TV',
                isOptional: true,
                discount: 0
              }
            ]
          },
          {
            id: 'outlets_patch',
            title: 'Prises et Brassage',
            description: 'Prises murales et baie de brassage',
            type: 'equipment',
            subtotal: 0,
            margin: 30,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'rj45_outlet',
                name: 'Prise RJ45 Cat6A',
                description: 'Prise réseau murale blindée',
                brand: 'Legrand',
                model: 'Mosaic RJ45',
                quantity: 1,
                unit: 'unité',
                unitPrice: 3500,
                totalPrice: 3500,
                margin: 30,
                supplier: 'Fournisseur Réseau',
                leadTime: '5 jours',
                specifications: ['Cat6A', 'Connexion IDC', 'Blindé'],
                category: 'Prises réseau',
                isOptional: false,
                discount: 0
              },
              {
                id: 'patch_panel_24',
                name: 'Panneau brassage 24 ports',
                description: 'Panneau de brassage professionnel',
                brand: 'Legrand',
                model: 'LCS3 24 ports',
                quantity: 1,
                unit: 'unité',
                unitPrice: 35000,
                totalPrice: 35000,
                margin: 25,
                supplier: 'Fournisseur Réseau',
                leadTime: '7 jours',
                specifications: ['24 ports RJ45', 'Cat6A', '1U', 'Avec serre-câbles'],
                category: 'Brassage',
                isOptional: false,
                discount: 0
              }
            ]
          }
        ]
      },
      {
        id: 'fiber_optic_template',
        name: 'Template Fibre Optique',
        serviceType: 'fiber_optic',
        description: 'Devis type pour câblage fibre optique',
        defaultMargin: 30,
        minimumMargin: 20,
        currency: 'FCFA',
        validityDays: 45,
        paymentTerms: ['30% acompte', '40% avancement', '30% recette'],
        terms: [
          'Devis valable 45 jours',
          'Garantie 25 ans infrastructure passive, 2 ans équipements actifs',
          'Installation spécialisée incluse',
          'Tests optiques et certification compris',
          'Dossier technique opérateur fourni'
        ],
        sections: [
          {
            id: 'fiber_infrastructure',
            title: 'Infrastructure Fibre',
            description: 'BPI, PBO, câbles et accessoires',
            type: 'equipment',
            subtotal: 0,
            margin: 25,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'bpi_standard',
                name: 'BPI 8 départs',
                description: 'Point de branchement immeuble',
                brand: 'CommScope',
                model: 'FlexNAP F08',
                quantity: 1,
                unit: 'unité',
                unitPrice: 180000,
                totalPrice: 180000,
                margin: 25,
                supplier: 'Fournisseur Fibre',
                leadTime: '14 jours',
                specifications: ['8 départs', 'Étanche IP65', 'Verrouillable', 'Raccords SC/APC'],
                category: 'BPI',
                isOptional: false,
                discount: 0
              },
              {
                id: 'fiber_sm_g657',
                name: 'Fibre monomode G.657.A2',
                description: 'Câble fibre optique résistant flexion',
                brand: 'Corning',
                model: 'OptiTap 12F',
                quantity: 1,
                unit: 'mètre',
                unitPrice: 2800,
                totalPrice: 2800,
                margin: 30,
                supplier: 'Fournisseur Fibre',
                leadTime: '10 jours',
                specifications: ['12 fibres', 'G.657.A2', 'Gaine LSOH', 'Résistant flexion'],
                category: 'Fibres',
                isOptional: false,
                discount: 0
              },
              {
                id: 'pbo_4ports',
                name: 'PBO 4 ports',
                description: 'Point de branchement optique étage',
                brand: 'CommScope',
                model: 'FlexNAP F04',
                quantity: 1,
                unit: 'unité',
                unitPrice: 45000,
                totalPrice: 45000,
                margin: 25,
                supplier: 'Fournisseur Fibre',
                leadTime: '14 jours',
                specifications: ['4 ports', 'Montage mural', 'Connecteurs SC/APC'],
                category: 'PBO',
                isOptional: false,
                discount: 0
              }
            ]
          },
          {
            id: 'fiber_installation',
            title: 'Installation Spécialisée',
            description: 'Tirage, soudure et tests optiques',
            type: 'labor',
            subtotal: 0,
            margin: 0,
            isRequired: true,
            isExpanded: true,
            items: [
              {
                id: 'fiber_pulling',
                name: 'Tirage fibres optiques',
                description: 'Tirage spécialisé fibres avec protection',
                quantity: 1,
                unit: 'forfait',
                unitPrice: 200000,
                totalPrice: 200000,
                margin: 0,
                category: 'Tirage',
                isOptional: false,
                discount: 0
              },
              {
                id: 'fiber_splicing',
                name: 'Soudures et raccordements',
                description: 'Épissurage professionnel avec tests',
                quantity: 1,
                unit: 'forfait',
                unitPrice: 150000,
                totalPrice: 150000,
                margin: 0,
                category: 'Soudure',
                isOptional: false,
                discount: 0
              }
            ]
          }
        ]
      }
    ])

    // Règles de tarification intelligente
    setPricingRules([
      {
        id: 'volume_discount',
        name: 'Remise quantité caméras',
        condition: 'cameras_quantity >= 10',
        action: 'apply_discount',
        value: 5,
        description: 'Remise 5% si plus de 10 caméras',
        isActive: true
      },
      {
        id: 'premium_margin',
        name: 'Marge premium urgent',
        condition: 'delivery_urgent == true',
        action: 'increase_margin',
        value: 10,
        description: 'Augmentation marge 10% si livraison urgente',
        isActive: true
      },
      {
        id: 'competitor_price',
        name: 'Prix concurrentiel',
        condition: 'total_price > market_average * 1.2',
        action: 'suggest_alternative',
        value: 0,
        description: 'Suggérer alternative si prix 20% au-dessus marché',
        isActive: true
      }
    ])
  }, [])

  const createQuoteFromTemplate = (templateId: string, projectData: any) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(template)
    setCatalogService(template.serviceType)

    const newQuote: ProjectQuote = {
      id: `QUO-${new Date().getFullYear()}-${String(Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (2**32) * 1000)).padStart(3, '0')}`,
      projectId: projectData.projectId || 'PRJ-NEW',
      clientId: projectData.clientId || 'CLI-NEW',
      version: 1,
      status: 'draft',
      sections: template.sections.map(section => ({
        ...section,
        subtotal: section.items.reduce((sum, item) => sum + item.totalPrice, 0)
      })),
      totals: {
        subtotalHT: 0,
        discountAmount: 0,
        totalHT: 0,
        taxAmount: 0,
        totalTTC: 0,
        margin: 0,
        marginAmount: 0
      },
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
        lastModified: new Date().toISOString(),
        validUntil: new Date(Date.now() + template.validityDays * 24 * 60 * 60 * 1000).toISOString(),
        currency: template.currency
      },
      client: projectData.client || {
        company: 'Client Exemple',
        contact: 'Contact Exemple',
        email: 'client@exemple.com',
        phone: '+221 XX XXX XX XX',
        address: 'Adresse client'
      },
      terms: template.terms,
      paymentTerms: template.paymentTerms
    }

    setCurrentQuote(newQuote)
    calculateTotals(newQuote)
  }

  const serviceTypes = Array.from(new Set(templates.map(t => t.serviceType)))

  const getCatalogItemsForService = (service: string): QuoteItem[] => {
    const t = templates.find(tmp => tmp.serviceType === service)
    if (!t) return []
    const items = t.sections
      .filter(s => s.type === 'equipment' || s.type === 'materials')
      .flatMap(s => s.items)
    if (!catalogSearch.trim()) return items
    const q = catalogSearch.toLowerCase()
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.brand || '').toLowerCase().includes(q) ||
      (i.model || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    )
  }

  const addItemFromCatalog = (item: QuoteItem) => {
    if (!currentQuote) {
      // Créer un devis à la volée sur le service courant si aucun devis en cours
      const tmp = templates.find(t => t.serviceType === catalogService)
      if (!tmp) return
      createQuoteFromTemplate(tmp.id, { projectId: 'PRJ-NEW' })
      // Le setState étant async, reprogrammer l'ajout dans le prochain tick
      setTimeout(() => addItemFromCatalog(item), 0)
      return
    }

    const targetSectionIndex = currentQuote.sections.findIndex(s => s.type === 'equipment')
    const targetIndex = targetSectionIndex >= 0 ? targetSectionIndex : 0
    const cloned: QuoteItem = {
      ...item,
      id: `${item.id}_${Date.now()}`,
      quantity: 1,
      totalPrice: item.unitPrice
    }
    const updated = {
      ...currentQuote,
      sections: currentQuote.sections.map((s, idx) => idx === targetIndex ? {
        ...s,
        isExpanded: true,
        items: [...s.items, cloned]
      } : s)
    }
    calculateTotals(updated)
  }

  const calculateTotals = (quote: ProjectQuote) => {
    let subtotalHT = 0
    let marginAmount = 0

    quote.sections.forEach(section => {
      section.subtotal = section.items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
        return sum + itemTotal
      }, 0)
      subtotalHT += section.subtotal
    })

    // Calcul marge globale
    quote.sections.forEach(section => {
      section.items.forEach(item => {
        if (item.margin > 0) {
          const costPrice = item.unitPrice / (1 + item.margin / 100)
          const itemMargin = (item.unitPrice - costPrice) * item.quantity * (1 - item.discount / 100)
          marginAmount += itemMargin
        }
      })
    })

    const discountAmount = 0 // À implémenter selon règles
    const totalHT = subtotalHT - discountAmount
    const taxAmount = totalHT * 0.18 // TVA 18%
    const totalTTC = totalHT + taxAmount
    const margin = subtotalHT > 0 ? (marginAmount / subtotalHT) * 100 : 0

    const updatedQuote = {
      ...quote,
      totals: {
        subtotalHT,
        discountAmount,
        totalHT,
        taxAmount,
        totalTTC,
        margin,
        marginAmount
      }
    }

    setCurrentQuote(updatedQuote)
  }

  const updateItemQuantity = (sectionId: string, itemId: string, newQuantity: number) => {
    if (!currentQuote) return

    const updatedQuote = {
      ...currentQuote,
      sections: currentQuote.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: section.items.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  quantity: newQuantity,
                  totalPrice: newQuantity * item.unitPrice
                }
              }
              return item
            })
          }
        }
        return section
      })
    }

    calculateTotals(updatedQuote)
  }

  const addCustomItem = (sectionId: string) => {
    if (!currentQuote) return

    const newItem: QuoteItem = {
      id: `custom_${Date.now()}`,
      name: 'Article personnalisé',
      description: 'Description à compléter',
      quantity: 1,
      unit: 'unité',
      unitPrice: 0,
      totalPrice: 0,
      margin: 30,
      category: 'Personnalisé',
      isOptional: true,
      discount: 0
    }

    const updatedQuote = {
      ...currentQuote,
      sections: currentQuote.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: [...section.items, newItem]
          }
        }
        return section
      })
    }

    calculateTotals(updatedQuote)
  }

  const generateAlternatives = () => {
    if (!currentQuote) return

    const alternatives: QuoteAlternative[] = [
      {
        id: 'basic',
        name: 'Solution Économique',
        description: 'Version allégée avec fonctionnalités essentielles',
        totalHT: currentQuote.totals.totalHT * 0.7,
        margin: 25,
        pros: ['Prix attractif', 'Délai court', 'Fonctionnalités de base'],
        cons: ['Moins d\'options', 'Évolutivité limitée']
      },
      {
        id: 'premium',
        name: 'Solution Premium',
        description: 'Version complète avec options avancées',
        totalHT: currentQuote.totals.totalHT * 1.3,
        margin: 40,
        pros: ['Fonctionnalités avancées', 'Garantie étendue', 'Support premium'],
        cons: ['Prix plus élevé', 'Complexité installation']
      }
    ]

    setCurrentQuote(prev => prev ? { ...prev, alternatives } : null)
  }

  const analyzeQuote = () => {
    if (!currentQuote) return

    // Simulation analyse concurrentielle
    const analytics: QuoteAnalytics = {
      competitiveIndex: 85,
      marketPosition: 'competitive',
      winProbability: 75,
      suggestedActions: [
        'Prix dans la moyenne du marché',
        'Mettre en avant la qualité service',
        'Proposer formation gratuite',
        'Garantie étendue comme différenciateur'
      ]
    }

    setCurrentQuote(prev => prev ? { ...prev, analytics } : null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'review': return 'bg-blue-100 text-blue-800'
      case 'sent': return 'bg-green-100 text-green-800'
      case 'viewed': return 'bg-purple-100 text-purple-800'
      case 'negotiation': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-emerald-100 text-emerald-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🧮 Générateur de Devis Intelligent
            </h1>
            <p className="text-gray-600">
              Création automatisée de devis avec tarification intelligente
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentQuote && (
              <>
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>Aperçu</span>
                </button>
                
                <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  <Send className="h-4 w-4" />
                  <span>Envoyer</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'builder', label: 'Constructeur', icon: Calculator },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'rules', label: 'Règles Tarifaires', icon: Settings },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
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

      {/* Constructeur de devis */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sélection template ou création */}
          <div className="lg:col-span-2 space-y-6">
            {!currentQuote ? (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Créer un nouveau devis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => createQuoteFromTemplate(template.id, {
                        projectId: 'PRJ-NEW',
                        client: {
                          company: 'Nouveau Client',
                          contact: 'Contact',
                          email: 'client@email.com',
                          phone: '+221 XX XXX XX XX',
                          address: 'Adresse'
                        }
                      })}
                      className="text-left p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          {template.serviceType === 'visiophonie' && <Monitor className="h-6 w-6 text-blue-600" />}
                          {template.serviceType === 'videosurveillance' && <Camera className="h-6 w-6 text-blue-600" />}
                          {template.serviceType === 'incendie' && <Flame className="h-6 w-6 text-blue-600" />}
                          {template.serviceType === 'digitalisation' && <Smartphone className="h-6 w-6 text-blue-600" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{template.serviceType}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{template.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Sections:</span>
                          <p className="font-medium">{template.sections.length}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Marge:</span>
                          <p className="font-medium">{template.defaultMargin}%</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Éditeur de devis */
              <div className="space-y-6">
                {/* En-tête devis */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Devis {currentQuote.id}</h3>
                      <p className="text-gray-600">Version {currentQuote.version}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentQuote.status)}`}>
                      {currentQuote.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Client</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>{currentQuote.client.company}</strong></p>
                        <p>{currentQuote.client.contact}</p>
                        <p>{currentQuote.client.email}</p>
                        <p>{currentQuote.client.phone}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Informations</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Créé le: {new Date(currentQuote.metadata.createdAt).toLocaleDateString('fr-FR')}</p>
                        <p>Valable jusqu'au: {new Date(currentQuote.metadata.validUntil).toLocaleDateString('fr-FR')}</p>
                        <p>Projet: {currentQuote.projectId}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sections du devis */}
                {currentQuote.sections.map((section) => (
                  <div key={section.id} className="bg-white rounded-2xl shadow-lg">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              const updatedQuote = {
                                ...currentQuote,
                                sections: currentQuote.sections.map(s => 
                                  s.id === section.id ? { ...s, isExpanded: !s.isExpanded } : s
                                )
                              }
                              setCurrentQuote(updatedQuote)
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {section.isExpanded ? 
                              <ChevronDown className="h-5 w-5" /> : 
                              <ChevronRight className="h-5 w-5" />
                            }
                          </button>
                          
                          <div>
                            <h4 className="font-semibold text-gray-900">{section.title}</h4>
                            <p className="text-sm text-gray-600">{section.description}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(section.subtotal)}</p>
                          <p className="text-sm text-gray-600">Marge: {section.margin}%</p>
                        </div>
                      </div>
                    </div>

                    {section.isExpanded && (
                      <div className="p-6">
                        <div className="space-y-4">
                          {section.items.map((item) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
                                <div className="md:col-span-2">
                                  <h5 className="font-medium text-gray-900">{item.name}</h5>
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                  {item.brand && (
                                    <p className="text-xs text-gray-500">{item.brand} {item.model}</p>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => updateItemQuantity(section.id, item.id, Math.max(0, item.quantity - 1))}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(section.id, item.id, parseInt(e.target.value) || 0)}
                                    className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                                  />
                                  <button
                                    onClick={() => updateItemQuantity(section.id, item.id, item.quantity + 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                
                                <div className="text-center">
                                  <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                                  <p className="text-xs text-gray-500">par {item.unit}</p>
                                </div>
                                
                                <div className="text-center">
                                  <p className="font-bold">{formatCurrency(item.totalPrice)}</p>
                                  {item.margin > 0 && (
                                    <p className="text-xs text-green-600">Marge: {item.margin}%</p>
                                  )}
                                </div>
                                
                                <div className="flex justify-center space-x-2">
                                  {item.isOptional && (
                                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                      Optionnel
                                    </span>
                                  )}
                                  
                                  <button className="text-gray-400 hover:text-gray-600">
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {item.specifications && item.specifications.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">Spécifications:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.specifications.map((spec, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                        {spec}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => addCustomItem(section.id)}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Ajouter un article</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Bouton flottant pour catalogue d'équipements */}
                <div className="sticky bottom-4 right-4 flex justify-end mt-6">
                  <button
                    onClick={() => setIsCatalogOpen(true)}
                    className="group flex items-center space-x-3 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.01]"
                  >
                    <Package className="h-5 w-5" />
                    <span>Ajouter des équipements</span>
                    <Zap className="h-4 w-4 opacity-80 group-hover:animate-pulse" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Totaux et actions */}
          {currentQuote && (
            <div className="space-y-6">
              {/* Totaux */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Totaux</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sous-total HT:</span>
                    <span className="font-medium">{formatCurrency(currentQuote.totals.subtotalHT)}</span>
                  </div>
                  
                  {currentQuote.totals.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remise:</span>
                      <span>-{formatCurrency(currentQuote.totals.discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total HT:</span>
                    <span className="font-medium">{formatCurrency(currentQuote.totals.totalHT)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">TVA (18%):</span>
                    <span className="font-medium">{formatCurrency(currentQuote.totals.taxAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="font-bold text-lg">Total TTC:</span>
                    <span className="font-bold text-lg text-green-600">{formatCurrency(currentQuote.totals.totalTTC)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Marge globale:</span>
                    <span className="font-medium text-blue-600">{currentQuote.totals.margin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={generateAlternatives}
                    className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Générer alternatives</span>
                  </button>
                  
                  <button
                    onClick={analyzeQuote}
                    className="w-full flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Analyser concurrence</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                    <Save className="h-4 w-4" />
                    <span>Sauvegarder</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">
                    <Download className="h-4 w-4" />
                    <span>Exporter PDF</span>
                  </button>
                </div>
              </div>

              {/* Analytics si disponibles */}
              {currentQuote.analytics && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Analyse Concurrentielle</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Compétitivité:</span>
                        <span className="font-medium">{currentQuote.analytics.competitiveIndex}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${currentQuote.analytics.competitiveIndex}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Position marché:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        currentQuote.analytics.marketPosition === 'competitive' ? 'bg-green-100 text-green-800' :
                        currentQuote.analytics.marketPosition === 'premium' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {currentQuote.analytics.marketPosition}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Probabilité gain:</span>
                      <span className="ml-2 font-medium text-green-600">{currentQuote.analytics.winProbability}%</span>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Recommandations:</p>
                      <ul className="space-y-1">
                        {currentQuote.analytics.suggestedActions.map((action, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start space-x-1">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Alternatives si générées */}
              {currentQuote.alternatives && currentQuote.alternatives.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Alternatives</h3>
                  
                  <div className="space-y-4">
                    {currentQuote.alternatives.map((alt) => (
                      <div key={alt.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{alt.name}</h4>
                          <span className="font-bold text-green-600">{formatCurrency(alt.totalHT)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{alt.description}</p>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-medium text-green-700 mb-1">Avantages:</p>
                            <ul className="space-y-1">
                              {alt.pros.map((pro, idx) => (
                                <li key={idx} className="text-green-600">• {pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-red-700 mb-1">Inconvénients:</p>
                            <ul className="space-y-1">
                              {alt.cons.map((con, idx) => (
                                <li key={idx} className="text-red-600">• {con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Templates de Devis ({templates.length})
          </h3>

          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900">{template.name}</h4>
                    <p className="text-gray-600">{template.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Marge: {template.defaultMargin}%</p>
                    <p className="text-sm text-gray-600">Validité: {template.validityDays} jours</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Service:</span>
                    <p className="font-medium capitalize">{template.serviceType}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Sections:</span>
                    <p className="font-medium">{template.sections.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Articles:</span>
                    <p className="font-medium">
                      {template.sections.reduce((acc, section) => acc + section.items.length, 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                      <Eye className="h-3 w-3" />
                      <span>Voir détails</span>
                    </button>
                    <button
                      onClick={() => createQuoteFromTemplate(template.id, { projectId: 'PRJ-NEW' })}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Utiliser</span>
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
      )}

      {/* Drawer Catalogue d'Équipements (innovatif) */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsCatalogOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl border-l border-gray-200 animate-[slideIn_.2s_ease-out]">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Catalogue d'Équipements</h3>
                </div>
                <button
                  onClick={() => setIsCatalogOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>

              {/* Services chips */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                {serviceTypes.map((service) => (
                  <button
                    key={service}
                    onClick={() => setCatalogService(service)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      catalogService === service
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="capitalize">{service.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="mt-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Rechercher équipement, marque, modèle..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="h-[calc(100%-140px)] overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {getCatalogItemsForService(catalogService).map((it) => (
                  <div key={`${it.id}`} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="pr-4">
                        <h4 className="font-medium text-gray-900">{it.name}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{it.description}</p>
                        {(it.brand || it.model) && (
                          <p className="text-xs text-gray-500 mt-1">{it.brand} {it.model}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-700">
                          {new Intl.NumberFormat('fr-FR').format(it.unitPrice)} FCFA
                        </div>
                        <div className="text-xs text-gray-500">par {it.unit || 'unité'}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {it.category && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">{it.category}</span>
                        )}
                        {it.margin > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">Marge {it.margin}%</span>
                        )}
                      </div>
                      <button
                        onClick={() => addItemFromCatalog(it)}
                        className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {getCatalogItemsForService(catalogService).length === 0 && (
                <div className="text-center text-gray-500 py-12">Aucun équipement pour cette recherche</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}