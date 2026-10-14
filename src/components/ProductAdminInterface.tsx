'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  Edit3, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  DollarSign, 
  Tag, 
  Settings, 
  Upload, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Star, 
  Award, 
  Zap, 
  Database, 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Phone, 
  Mail, 
  Globe, 
  Layers, 
  GitBranch, 
  Activity,
  Camera,
  Shield,
  Wifi,
  Flame,
  Monitor,
  Cable,
  Smartphone,
  Home,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react'

interface Product {
  id: string
  name: string
  model: string
  brand: string
  category: string
  subcategory: string
  description: string
  specifications: string[]
  unitPrice: number
  costPrice: number
  margin: number
  currency: string
  unit: string
  supplier: string
  supplierRef: string
  leadTime: string
  minQuantity: number
  stockLevel: number
  status: 'active' | 'inactive' | 'discontinued'
  popular: boolean
  rating: number
  image: string
  createdAt: string
  updatedAt: string
  lastModifiedBy: string
  tags: string[]
  notes: string
}

interface Category {
  id: string
  name: string
  description: string
  icon: string
  parentCategory?: string
  margin: number
  isActive: boolean
}

interface PriceHistory {
  id: string
  productId: string
  oldPrice: number
  newPrice: number
  reason: string
  modifiedBy: string
  modifiedAt: string
}

interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
  paymentTerms: string
  deliveryTime: string
  rating: number
  isActive: boolean
}

export default function ProductAdminInterface() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  
  const [activeTab, setActiveTab] = useState('products')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false)
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Données initiales des produits IT Vision
  useEffect(() => {
    setCategories([
      {
        id: 'videosurveillance',
        name: 'Vidéosurveillance',
        description: 'Caméras et systèmes de surveillance',
        icon: '📷',
        margin: 30,
        isActive: true
      },
      {
        id: 'controle-acces',
        name: 'Contrôle d\'Accès',
        description: 'Systèmes de contrôle d\'accès',
        icon: '🔐',
        margin: 35,
        isActive: true
      },
      {
        id: 'domotique',
        name: 'Domotique',
        description: 'Équipements domotiques intelligents',
        icon: '🏠',
        margin: 40,
        isActive: true
      },
      {
        id: 'network-cabling',
        name: 'Câblage Réseau',
        description: 'Infrastructure réseau et TV',
        icon: '🌐',
        margin: 35,
        isActive: true
      },
      {
        id: 'fiber-optic',
        name: 'Fibre Optique',
        description: 'Équipements fibre optique FTTH',
        icon: '⚡',
        margin: 25,
        isActive: true
      },
      {
        id: 'digitalisation',
        name: 'Digitalisation',
        description: 'Solutions logicielles',
        icon: '💻',
        margin: 50,
        isActive: true
      }
    ])

    setSuppliers([
      {
        id: 'fournisseur-a',
        name: 'Fournisseur Sécurité A',
        contact: 'Ahmed Diallo',
        email: 'ahmed@fournisseur-a.com',
        phone: '+221 77 123 45 67',
        address: 'Zone Industrielle, Dakar',
        paymentTerms: '30 jours fin de mois',
        deliveryTime: '7-10 jours',
        rating: 4.5,
        isActive: true
      },
      {
        id: 'fournisseur-smart',
        name: 'Fournisseur Smart',
        contact: 'Fatou Ndiaye',
        email: 'fatou@smart.sn',
        phone: '+221 77 234 56 78',
        address: 'Plateau, Dakar',
        paymentTerms: '15 jours net',
        deliveryTime: '5-7 jours',
        rating: 4.8,
        isActive: true
      },
      {
        id: 'fournisseur-reseau',
        name: 'Fournisseur Réseau',
        contact: 'Moussa Ba',
        email: 'moussa@reseau.sn',
        phone: '+221 77 345 67 89',
        address: 'Liberté 6, Dakar',
        paymentTerms: '45 jours fin de mois',
        deliveryTime: '3-5 jours',
        rating: 4.3,
        isActive: true
      },
      {
        id: 'fournisseur-fibre',
        name: 'Fournisseur Fibre',
        contact: 'Aïssatou Fall',
        email: 'aissatou@fibre.sn',
        phone: '+221 77 456 78 90',
        address: 'Almadies, Dakar',
        paymentTerms: '60 jours fin de mois',
        deliveryTime: '10-14 jours',
        rating: 4.7,
        isActive: true
      }
    ])

    setProducts([
      // Vidéosurveillance
      {
        id: 'cam-hikvision-4k',
        name: 'Caméra IP 4K AcuSense',
        model: 'DS-2CD2143G2-I',
        brand: 'Hikvision',
        category: 'videosurveillance',
        subcategory: 'cameras-ip',
        description: 'Caméra dôme IP 4K avec intelligence artificielle AcuSense',
        specifications: ['4K Ultra HD 8MP', 'IA AcuSense intégrée', 'Vision nocturne ColorVu', 'Audio bidirectionnel', 'Détection humain/véhicule'],
        unitPrice: 45000,
        costPrice: 32000,
        margin: 40.6,
        currency: 'FCFA',
        unit: 'unité',
        supplier: 'fournisseur-a',
        supplierRef: 'HIK-DS2CD2143G2I',
        leadTime: '7-10 jours',
        minQuantity: 1,
        stockLevel: 25,
        status: 'active',
        popular: true,
        rating: 4.9,
        image: '📷',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-02-20T14:30:00Z',
        lastModifiedBy: 'Admin',
        tags: ['4K', 'IA', 'ColorVu', 'Audio'],
        notes: 'Produit phare, très demandé'
      },
      {
        id: 'nvr-hikvision-16ch',
        name: 'NVR 16 canaux 4K',
        model: 'DS-7616NI-I2/16P',
        brand: 'Hikvision',
        category: 'videosurveillance',
        subcategory: 'nvr',
        description: 'Enregistreur réseau 16 canaux avec PoE intégré',
        specifications: ['16 canaux PoE', '4K H.265+', '2x SATA', 'HDMI 4K', '160W PoE'],
        unitPrice: 180000,
        costPrice: 135000,
        margin: 33.3,
        currency: 'FCFA',
        unit: 'unité',
        supplier: 'fournisseur-a',
        supplierRef: 'HIK-DS7616NII216P',
        leadTime: '7-10 jours',
        minQuantity: 1,
        stockLevel: 8,
        status: 'active',
        popular: false,
        rating: 4.7,
        image: '📹',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-02-15T09:15:00Z',
        lastModifiedBy: 'Admin',
        tags: ['NVR', '16CH', 'PoE', '4K'],
        notes: 'Compatible avec toutes caméras IP'
      },
      // Domotique
      {
        id: 'hub-aqara-m2',
        name: 'Hub Central Zigbee',
        model: 'Hub M2',
        brand: 'Aqara',
        category: 'domotique',
        subcategory: 'hub',
        description: 'Hub central pour gestion domotique multi-protocoles',
        specifications: ['Zigbee 3.0', 'WiFi', 'Bluetooth', 'Contrôle IR', 'Support 256 appareils'],
        unitPrice: 45000,
        costPrice: 28000,
        margin: 60.7,
        currency: 'FCFA',
        unit: 'unité',
        supplier: 'fournisseur-smart',
        supplierRef: 'AQ-HUBM2',
        leadTime: '5-7 jours',
        minQuantity: 1,
        stockLevel: 15,
        status: 'active',
        popular: true,
        rating: 4.8,
        image: '🏠',
        createdAt: '2024-01-20T11:30:00Z',
        updatedAt: '2024-02-25T16:45:00Z',
        lastModifiedBy: 'Admin',
        tags: ['Zigbee', 'WiFi', 'Bluetooth', 'IR'],
        notes: 'Hub polyvalent, très populaire'
      },
      {
        id: 'micro-module-relay',
        name: 'Micro-module interrupteur',
        model: 'Relay T1',
        brand: 'Aqara',
        category: 'domotique',
        subcategory: 'modules',
        description: 'Module intelligent sans neutre pour retrofit',
        specifications: ['Zigbee 3.0', 'Sans neutre', '16A max', 'Installation derrière interrupteur'],
        unitPrice: 18000,
        costPrice: 11000,
        margin: 63.6,
        currency: 'FCFA',
        unit: 'unité',
        supplier: 'fournisseur-smart',
        supplierRef: 'AQ-RELAYT1',
        leadTime: '5-7 jours',
        minQuantity: 5,
        stockLevel: 50,
        status: 'active',
        popular: true,
        rating: 4.9,
        image: '🔧',
        createdAt: '2024-01-20T11:30:00Z',
        updatedAt: '2024-02-28T10:20:00Z',
        lastModifiedBy: 'Admin',
        tags: ['Retrofit', 'Sans neutre', 'Zigbee'],
        notes: 'Idéal pour anciennes installations'
      },
      // Câblage Réseau
      {
        id: 'cable-cat6a-legrand',
        name: 'Câble Cat6A UTP 305m',
        model: 'Cat6A 305m',
        brand: 'Legrand',
        category: 'network-cabling',
        subcategory: 'cables',
        description: 'Câble réseau haute performance certifié',
        specifications: ['Cat6A certifié', '10 Gbps', 'Gaine LSOH', 'Bobine 305m'],
        unitPrice: 1800,
        costPrice: 1200,
        margin: 50,
        currency: 'FCFA',
        unit: 'mètre',
        supplier: 'fournisseur-reseau',
        supplierRef: 'LEG-CAT6A305',
        leadTime: '3-5 jours',
        minQuantity: 50,
        stockLevel: 2000,
        status: 'active',
        popular: true,
        rating: 4.8,
        image: '📡',
        createdAt: '2024-01-25T14:00:00Z',
        updatedAt: '2024-03-01T08:30:00Z',
        lastModifiedBy: 'Admin',
        tags: ['Cat6A', '10Gbps', 'LSOH'],
        notes: 'Câble premium, très demandé'
      },
      {
        id: 'prise-rj45-legrand',
        name: 'Prise RJ45 Cat6A',
        model: 'Mosaic RJ45',
        brand: 'Legrand',
        category: 'network-cabling',
        subcategory: 'prises',
        description: 'Prise réseau murale blindée professionnelle',
        specifications: ['Cat6A', 'Connexion IDC', 'Blindé', 'Montage Mosaic'],
        unitPrice: 3500,
        costPrice: 2200,
        margin: 59.1,
        currency: 'FCFA',
        unit: 'unité',
        supplier: 'fournisseur-reseau',
        supplierRef: 'LEG-MOSAICRJ45',
        leadTime: '3-5 jours',
        minQuantity: 10,
        stockLevel: 100,
        status: 'active',
        popular: false,
        rating: 4.9,
        image: '🔌',
        createdAt: '2024-01-25T14:00:00Z',
        updatedAt: '2024-02-20T11:15:00Z',
        lastModifiedBy: 'Admin',
        tags: ['RJ45', 'Cat6A', 'Blindé'],
        notes: 'Qualité professionnelle'
      },
      // Fibre Optique
      {
        id: 'bpi-commscope-f08',
        name: 'BPI 8 départs',
        model: 'FlexNAP F08',
        brand: 'CommScope',
        category: 'fiber-optic',
        subcategory: 'bpi',
        description: 'Point de branchement immeuble étanche',
        specifications: ['8 départs', 'Étanche IP65', 'Verrouillable', 'Raccords SC/APC', 'Norme opérateurs'],
        unitPrice: 180000,
        costPrice: 135000,
        margin: 33.3,
        currency: 'FCFA',
        unit: 'unité',
        supplier: 'fournisseur-fibre',
        supplierRef: 'CS-FLEXNAPF08',
        leadTime: '10-14 jours',
        minQuantity: 1,
        stockLevel: 5,
        status: 'active',
        popular: true,
        rating: 4.9,
        image: '🔗',
        createdAt: '2024-02-01T09:00:00Z',
        updatedAt: '2024-02-28T15:20:00Z',
        lastModifiedBy: 'Admin',
        tags: ['BPI', 'FTTH', 'IP65', 'SC/APC'],
        notes: 'Équipement clé projet Antalya'
      },
      {
        id: 'pbo-commscope-f04',
        name: 'PBO 4 ports',
        model: 'FlexNAP F04',
        brand: 'CommScope',
        category: 'fiber-optic',
        subcategory: 'pbo',
        description: 'Point de branchement optique étage',
        specifications: ['4 ports', 'Montage mural', 'Connecteurs SC/APC', 'Cassettes incluses'],
        unitPrice: 45000,
        costPrice: 32000,
        margin: 40.6,
        currency: 'FCFA',
        unit: 'unité',
        supplier: 'fournisseur-fibre',
        supplierRef: 'CS-FLEXNAPF04',
        leadTime: '10-14 jours',
        minQuantity: 2,
        stockLevel: 20,
        status: 'active',
        popular: false,
        rating: 4.8,
        image: '📡',
        createdAt: '2024-02-01T09:00:00Z',
        updatedAt: '2024-02-25T12:45:00Z',
        lastModifiedBy: 'Admin',
        tags: ['PBO', 'Étage', 'SC/APC'],
        notes: 'Répartiteur par étage'
      },
      {
        id: 'fibre-corning-g657',
        name: 'Fibre monomode G.657.A2',
        model: 'OptiTap 12F',
        brand: 'Corning',
        category: 'fiber-optic',
        subcategory: 'fibres',
        description: 'Câble fibre optique résistant flexion',
        specifications: ['12 fibres', 'G.657.A2', 'Gaine LSOH', 'Résistant flexion', 'Marquage métrage'],
        unitPrice: 2800,
        costPrice: 2000,
        margin: 40,
        currency: 'FCFA',
        unit: 'mètre',
        supplier: 'fournisseur-fibre',
        supplierRef: 'CORN-G657A212F',
        leadTime: '10-14 jours',
        minQuantity: 100,
        stockLevel: 1000,
        status: 'active',
        popular: true,
        rating: 4.9,
        image: '⚡',
        createdAt: '2024-02-01T09:00:00Z',
        updatedAt: '2024-02-28T14:10:00Z',
        lastModifiedBy: 'Admin',
        tags: ['G.657.A2', '12F', 'Flexion', 'Corning'],
        notes: 'Fibre premium Corning'
      }
    ])

    setPriceHistory([
      {
        id: 'hist-001',
        productId: 'bpi-commscope-f08',
        oldPrice: 200000,
        newPrice: 180000,
        reason: 'Négociation fournisseur - volume',
        modifiedBy: 'Admin',
        modifiedAt: '2024-02-28T15:20:00Z'
      },
      {
        id: 'hist-002',
        productId: 'cable-cat6a-legrand',
        oldPrice: 2000,
        newPrice: 1800,
        reason: 'Promotion fournisseur Q1',
        modifiedBy: 'Admin',
        modifiedAt: '2024-03-01T08:30:00Z'
      }
    ])
  }, [])

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const saveProduct = (product: Product) => {
    const now = new Date().toISOString()
    
    if (editingProduct) {
      // Mise à jour produit existant
      const oldProduct = products.find(p => p.id === product.id)
      if (oldProduct && oldProduct.unitPrice !== product.unitPrice) {
        // Ajouter historique prix si changement
        const newHistory: PriceHistory = {
          id: `hist-${Date.now()}`,
          productId: product.id,
          oldPrice: oldProduct.unitPrice,
          newPrice: product.unitPrice,
          reason: 'Modification manuelle admin',
          modifiedBy: 'Admin',
          modifiedAt: now
        }
        setPriceHistory(prev => [newHistory, ...prev])
      }

      setProducts(prev => prev.map(p => 
        p.id === product.id 
          ? { ...product, updatedAt: now, lastModifiedBy: 'Admin' }
          : p
      ))
    } else {
      // Nouveau produit
      const newProduct: Product = {
        ...product,
        id: `prod-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
        lastModifiedBy: 'Admin'
      }
      setProducts(prev => [...prev, newProduct])
    }

    setEditingProduct(null)
    setShowNewProductModal(false)
  }

  const deleteProduct = (productId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      setProducts(prev => prev.filter(p => p.id !== productId))
    }
  }

  const bulkUpdateMargin = (margin: number) => {
    setProducts(prev => prev.map(product => {
      if (selectedProducts.includes(product.id)) {
        const newUnitPrice = Math.round(product.costPrice * (1 + margin / 100))
        return {
          ...product,
          margin,
          unitPrice: newUnitPrice,
          updatedAt: new Date().toISOString(),
          lastModifiedBy: 'Admin'
        }
      }
      return product
    }))
    setSelectedProducts([])
    setBulkEditMode(false)
  }

  const exportProducts = () => {
    const csvData = products.map(product => ({
      ID: product.id,
      Nom: product.name,
      Modèle: product.model,
      Marque: product.brand,
      Catégorie: product.category,
      'Prix Unitaire': product.unitPrice,
      'Prix Coût': product.costPrice,
      'Marge %': product.margin.toFixed(1),
      Stock: product.stockLevel,
      Statut: product.status,
      'Dernière MAJ': new Date(product.updatedAt).toLocaleDateString('fr-FR')
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `produits-itvision-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-600 bg-green-100'
    if (margin >= 30) return 'text-blue-600 bg-blue-100'
    if (margin >= 20) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStockColor = (stock: number, minQty: number) => {
    if (stock === 0) return 'text-red-600 bg-red-100'
    if (stock <= minQty) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🛍️ Administration Produits & Prix
            </h1>
            <p className="text-gray-600">
              Gestion en temps réel de votre catalogue IT Vision
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNewProductModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Produit</span>
            </button>
            
            <button
              onClick={exportProducts}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'products', label: 'Produits', icon: Package },
            { id: 'categories', label: 'Catégories', icon: Tag },
            { id: 'suppliers', label: 'Fournisseurs', icon: Building },
            { id: 'price-history', label: 'Historique Prix', icon: TrendingUp },
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

      {/* Gestion des produits */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Filtres et actions */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom, modèle, marque..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setBulkEditMode(!bulkEditMode)}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    bulkEditMode 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bulkEditMode ? 'Annuler Sélection' : 'Édition Multiple'}
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            {bulkEditMode && selectedProducts.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-orange-800">
                    {selectedProducts.length} produit(s) sélectionné(s)
                  </span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-orange-800">Nouvelle marge:</label>
                      <input
                        type="number"
                        className="w-20 px-2 py-1 border border-orange-300 rounded text-center"
                        placeholder="30"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const margin = parseFloat((e.target as HTMLInputElement).value)
                            if (margin > 0) bulkUpdateMargin(margin)
                          }
                        }}
                      />
                      <span className="text-orange-800">%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Liste des produits */}
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Produits ({filteredProducts.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {bulkEditMode && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === filteredProducts.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(filteredProducts.map(p => p.id))
                            } else {
                              setSelectedProducts([])
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marge</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {bulkEditMode && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts(prev => [...prev, product.id])
                              } else {
                                setSelectedProducts(prev => prev.filter(id => id !== product.id))
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{product.image}</span>
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-600">{product.brand} {product.model}</div>
                            <div className="text-xs text-gray-500">{product.category}</div>
                          </div>
                          {product.popular && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{formatCurrency(product.unitPrice)}</div>
                          <div className="text-sm text-gray-600">Coût: {formatCurrency(product.costPrice)}</div>
                          <div className="text-xs text-gray-500">par {product.unit}</div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMarginColor(product.margin)}`}>
                          {product.margin.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStockColor(product.stockLevel, product.minQuantity)}`}>
                          {product.stockLevel}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' :
                          product.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition produit */}
      {(editingProduct || showNewProductModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Modifier Produit' : 'Nouveau Produit'}
              </h3>
              <button
                onClick={() => {
                  setEditingProduct(null)
                  setShowNewProductModal(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <ProductEditForm 
              product={editingProduct}
              categories={categories}
              suppliers={suppliers}
              onSave={saveProduct}
              onCancel={() => {
                setEditingProduct(null)
                setShowNewProductModal(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Modal détail produit */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <ProductDetailView product={selectedProduct} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant formulaire d'édition
function ProductEditForm({ 
  product, 
  categories, 
  suppliers, 
  onSave, 
  onCancel 
}: {
  product: Product | null
  categories: Category[]
  suppliers: Supplier[]
  onSave: (product: Product) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Product>(
    product || {
      id: '',
      name: '',
      model: '',
      brand: '',
      category: '',
      subcategory: '',
      description: '',
      specifications: [],
      unitPrice: 0,
      costPrice: 0,
      margin: 0,
      currency: 'FCFA',
      unit: 'unité',
      supplier: '',
      supplierRef: '',
      leadTime: '',
      minQuantity: 1,
      stockLevel: 0,
      status: 'active',
      popular: false,
      rating: 4.5,
      image: '📦',
      createdAt: '',
      updatedAt: '',
      lastModifiedBy: '',
      tags: [],
      notes: ''
    }
  )

  const updateMargin = () => {
    if (formData.costPrice > 0 && formData.unitPrice > 0) {
      const margin = ((formData.unitPrice - formData.costPrice) / formData.unitPrice) * 100
      setFormData(prev => ({ ...prev, margin }))
    }
  }

  const updatePriceFromMargin = () => {
    if (formData.costPrice > 0 && formData.margin > 0) {
      const unitPrice = Math.round(formData.costPrice / (1 - formData.margin / 100))
      setFormData(prev => ({ ...prev, unitPrice }))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modèle</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marque</label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionner une catégorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prix de coût</label>
          <input
            type="number"
            value={formData.costPrice}
            onChange={(e) => {
              const costPrice = parseFloat(e.target.value) || 0
              setFormData(prev => ({ ...prev, costPrice }))
            }}
            onBlur={updateMargin}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prix de vente</label>
          <input
            type="number"
            value={formData.unitPrice}
            onChange={(e) => {
              const unitPrice = parseFloat(e.target.value) || 0
              setFormData(prev => ({ ...prev, unitPrice }))
            }}
            onBlur={updateMargin}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marge (%)</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.margin.toFixed(1)}
              onChange={(e) => {
                const margin = parseFloat(e.target.value) || 0
                setFormData(prev => ({ ...prev, margin }))
              }}
              onBlur={updatePriceFromMargin}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              step="0.1"
            />
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              formData.margin >= 50 ? 'bg-green-100 text-green-800' :
              formData.margin >= 30 ? 'bg-blue-100 text-blue-800' :
              formData.margin >= 20 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {formData.margin >= 50 ? 'Excellente' :
               formData.margin >= 30 ? 'Bonne' :
               formData.margin >= 20 ? 'Correcte' : 'Faible'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Stock actuel</label>
          <input
            type="number"
            value={formData.stockLevel}
            onChange={(e) => setFormData(prev => ({ ...prev, stockLevel: parseInt(e.target.value) || 0 }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex space-x-4 pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Annuler
        </button>
        
        <button
          onClick={() => onSave(formData)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Enregistrer</span>
        </button>
      </div>
    </div>
  )
}

// Composant vue détail produit
function ProductDetailView({ product }: { product: Product }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <span className="text-4xl">{product.image}</span>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
          <p className="text-gray-600">{product.brand} {product.model}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Informations produit</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-600">Catégorie:</span> {product.category}</p>
            <p><span className="text-gray-600">Fournisseur:</span> {product.supplier}</p>
            <p><span className="text-gray-600">Référence:</span> {product.supplierRef}</p>
            <p><span className="text-gray-600">Délai livraison:</span> {product.leadTime}</p>
            <p><span className="text-gray-600">Unité:</span> {product.unit}</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Prix et marge</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-600">Prix de vente:</span> <span className="font-medium text-green-600">{formatCurrency(product.unitPrice)}</span></p>
            <p><span className="text-gray-600">Prix de coût:</span> {formatCurrency(product.costPrice)}</p>
            <p><span className="text-gray-600">Marge:</span> <span className="font-medium text-blue-600">{product.margin.toFixed(1)}%</span></p>
            <p><span className="text-gray-600">Stock:</span> {product.stockLevel}</p>
            <p><span className="text-gray-600">Note:</span> ⭐ {product.rating}/5</p>
          </div>
        </div>
      </div>

      {product.specifications.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Spécifications</h4>
          <ul className="space-y-1">
            {product.specifications.map((spec, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {spec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {product.notes && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
          <p className="text-sm text-gray-700">{product.notes}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Créé le {new Date(product.createdAt).toLocaleDateString('fr-FR')} | 
          Modifié le {new Date(product.updatedAt).toLocaleDateString('fr-FR')} par {product.lastModifiedBy}
        </p>
      </div>
    </div>
  )
}