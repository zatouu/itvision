'use client'

import { useState, useEffect, createContext, useContext } from 'react'

// Context pour la gestion globale des produits
interface ProductContextType {
  products: any[]
  categories: any[]
  updateProduct: (id: string, updates: any) => void
  getProductsByCategory: (categoryId: string) => any[]
  getProductPrice: (productId: string) => number | null
  refreshProducts: () => void
}

const ProductContext = createContext<ProductContextType | null>(null)

// Hook pour utiliser le contexte produits
export const useProducts = () => {
  const context = useContext(ProductContext)
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider')
  }
  return context
}

// Provider pour la gestion des produits
export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Simulation d'une base de données locale (localStorage)
  useEffect(() => {
    loadProductsFromStorage()
    loadCategoriesFromStorage()
  }, [])

  const loadProductsFromStorage = () => {
    const storedProducts = localStorage.getItem('itvision-products')
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts))
    } else {
      // Produits par défaut si aucun stockage
      const defaultProducts = getDefaultProducts()
      setProducts(defaultProducts)
      localStorage.setItem('itvision-products', JSON.stringify(defaultProducts))
    }
  }

  const loadCategoriesFromStorage = () => {
    const storedCategories = localStorage.getItem('itvision-categories')
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories))
    } else {
      const defaultCategories = getDefaultCategories()
      setCategories(defaultCategories)
      localStorage.setItem('itvision-categories', JSON.stringify(defaultCategories))
    }
  }

  const updateProduct = (id: string, updates: any) => {
    setProducts(prev => {
      const updated = prev.map(product =>
        product.id === id
          ? { ...product, ...updates, updatedAt: new Date().toISOString() }
          : product
      )
      localStorage.setItem('itvision-products', JSON.stringify(updated))
      return updated
    })
  }

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.category === categoryId)
  }

  const getProductPrice = (productId: string) => {
    const product = products.find(p => p.id === productId)
    return product?.unitPrice || null
  }

  const refreshProducts = () => {
    loadProductsFromStorage()
    loadCategoriesFromStorage()
  }

  return (
    <ProductContext.Provider value={{
      products,
      categories,
      updateProduct,
      getProductsByCategory,
      getProductPrice,
      refreshProducts
    }}>
      {children}
    </ProductContext.Provider>
  )
}

// Produits par défaut pour l'initialisation
function getDefaultProducts() {
  return [
    // Vidéosurveillance
    {
      id: 'cam-hikvision-4k',
      name: 'Caméra IP 4K AcuSense',
      model: 'DS-2CD2143G2-I',
      brand: 'Hikvision',
      category: 'cameras',
      price: 'Devis WhatsApp',
      unitPrice: 45000,
      costPrice: 32000,
      margin: 40.6,
      features: ['4K Ultra HD 8MP', 'IA AcuSense intégrée', 'Vision nocturne ColorVu', 'Audio bidirectionnel', 'Détection humain/véhicule'],
      rating: 4.9,
      popular: true,
      image: '📷',
      supplier: 'Fournisseur A',
      leadTime: '7-10 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'nvr-hikvision-16ch',
      name: 'NVR 16 canaux 4K',
      model: 'DS-7616NI-I2/16P',
      brand: 'Hikvision',
      category: 'cameras',
      price: 'Devis WhatsApp',
      unitPrice: 180000,
      costPrice: 135000,
      margin: 33.3,
      features: ['16 canaux PoE', '4K H.265+', '2x SATA', 'HDMI 4K', '160W PoE'],
      rating: 4.7,
      popular: false,
      image: '📹',
      supplier: 'Fournisseur A',
      leadTime: '7-10 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },

    // Domotique
    {
      id: 'hub-aqara-m2',
      name: 'Hub Central Zigbee',
      model: 'Passerelle Multi-Protocoles',
      brand: 'Aqara',
      category: 'domotique',
      price: 'Devis WhatsApp',
      unitPrice: 45000,
      costPrice: 28000,
      margin: 60.7,
      features: ['Zigbee 3.0 + WiFi + Bluetooth', 'App mobile unifiée', 'Compatible Alexa/Google', '256 appareils max', 'Contrôle vocal'],
      rating: 4.8,
      popular: true,
      image: '🏠',
      supplier: 'Fournisseur Smart',
      leadTime: '5-7 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'micro-module-relay',
      name: 'Micro-Module Retrofit',
      model: 'Smart Switch Encastrable',
      brand: 'Aqara',
      category: 'domotique',
      price: 'Devis WhatsApp',
      unitPrice: 18000,
      costPrice: 11000,
      margin: 63.6,
      features: ['Installation derrière interrupteur existant', 'Aucun changement visible', 'Contrôle à distance', 'Programmation horaire', 'Retour d\'état'],
      rating: 4.9,
      popular: true,
      image: '🔧',
      supplier: 'Fournisseur Smart',
      leadTime: '5-7 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },

    // Câblage Réseau
    {
      id: 'cable-cat6a-legrand',
      name: 'Câble Cat6A UTP 305m',
      model: 'Legrand LCS3 Certified',
      brand: 'Legrand',
      category: 'network-cabling',
      price: 'Devis WhatsApp',
      unitPrice: 1800,
      costPrice: 1200,
      margin: 50,
      features: ['Certifié 10 Gbps', 'Gaine LSOH anti-feu', 'Blindage optimisé', 'Bobine professionnelle', '25 ans garantie'],
      rating: 4.8,
      popular: true,
      image: '📡',
      supplier: 'Fournisseur Réseau',
      leadTime: '3-5 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prise-rj45-legrand',
      name: 'Prise RJ45 Cat6A Blindée',
      model: 'Legrand Mosaic Professional',
      brand: 'Legrand',
      category: 'network-cabling',
      price: 'Devis WhatsApp',
      unitPrice: 3500,
      costPrice: 2200,
      margin: 59.1,
      features: ['Connexion IDC sans outil', 'Blindage 360°', 'Test automatique', 'Détrompeur intégré', 'Finition premium'],
      rating: 4.9,
      popular: false,
      image: '🔌',
      supplier: 'Fournisseur Réseau',
      leadTime: '3-5 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },

    // Fibre Optique
    {
      id: 'bpi-commscope-f08',
      name: 'BPI 8 Départs Extérieur',
      model: 'CommScope FlexNAP F08',
      brand: 'CommScope',
      category: 'fiber-optic',
      price: 'Devis WhatsApp',
      unitPrice: 180000,
      costPrice: 135000,
      margin: 33.3,
      features: ['8 sorties fibres SC/APC', 'Étanche IP65', 'Verrouillage sécurisé', 'Montage poteau/mural', 'Norme opérateurs'],
      rating: 4.9,
      popular: true,
      image: '🔗',
      supplier: 'Fournisseur Fibre',
      leadTime: '10-14 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pbo-commscope-f04',
      name: 'PBO 4 Ports Étage',
      model: 'Point Branchement Optique',
      brand: 'CommScope',
      category: 'fiber-optic',
      price: 'Devis WhatsApp',
      unitPrice: 45000,
      costPrice: 32000,
      margin: 40.6,
      features: ['4 connecteurs SC/APC', 'Montage mural discret', 'Cassettes de protection', 'Traçabilité fibres', 'Accès sécurisé'],
      rating: 4.8,
      popular: false,
      image: '📡',
      supplier: 'Fournisseur Fibre',
      leadTime: '10-14 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'fibre-corning-g657',
      name: 'Fibre G.657.A2 12F',
      model: 'Corning OptiTap Monomode',
      brand: 'Corning',
      category: 'fiber-optic',
      price: 'Devis WhatsApp',
      unitPrice: 2800,
      costPrice: 2000,
      margin: 40,
      features: ['12 fibres G.657.A2', 'Résistante flexion', 'Gaine LSOH', 'Marquage métrage', 'Qualité Corning'],
      rating: 4.9,
      popular: true,
      image: '⚡',
      supplier: 'Fournisseur Fibre',
      leadTime: '10-14 jours',
      status: 'active',
      updatedAt: new Date().toISOString()
    }
  ]
}

function getDefaultCategories() {
  return [
    {
      id: 'cameras',
      title: 'Caméras Surveillance Pro',
      description: 'Hikvision, Dahua, Uniview - Dernière génération 4K avec IA',
      icon: '📷'
    },
    {
      id: 'controle-acces',
      title: 'Contrôle d\'Accès Multi-Marques',
      description: 'Terminaux reconnaissance faciale et biométrique',
      icon: '🔐'
    },
    {
      id: 'domotique',
      title: 'Domotique & Bâtiment Intelligent',
      description: 'RETROFIT ou NEUF • WiFi • Bluetooth • Zigbee',
      icon: '🏠'
    },
    {
      id: 'network-cabling',
      title: 'Câblage Réseau & TV Bâtiment',
      description: 'Infrastructure complète Cat6A/Cat7 + TV satellite',
      icon: '🌐'
    },
    {
      id: 'fiber-optic',
      title: 'Fibre Optique FTTH Professionnelle',
      description: 'BPI • PBO • PTO pour opérateurs',
      icon: '⚡'
    },
    {
      id: 'digitalisation',
      title: 'Solutions Digitales',
      description: 'Digitalisation complète : développement, data science, DevOps',
      icon: '💻'
    }
  ]
}

// Composant pour afficher les produits de manière dynamique
export function DynamicProductList({ categoryId }: { categoryId: string }) {
  const { getProductsByCategory, getProductPrice } = useProducts()
  const products = getProductsByCategory(categoryId)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const handleWhatsAppRequest = (product: any) => {
    const message = `Bonjour IT Vision,

Je souhaite recevoir un devis pour :
📦 ${product.name}
🔧 Modèle: ${product.brand} ${product.model}
📊 Spécifications principales: ${product.features.slice(0, 2).join(', ')}

Pouvez-vous me faire parvenir votre meilleur prix ?

Merci`

    const whatsappUrl = `https://wa.me/221774133440?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">{product.image}</span>
            {product.popular && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                POPULAIRE
              </span>
            )}
          </div>

          <h3 className="font-bold text-gray-900 mb-2">{product.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{product.brand} {product.model}</p>

          <div className="space-y-1 mb-4">
            {product.features.slice(0, 3).map((feature: string, index: number) => (
              <div key={index} className="flex items-start text-sm text-gray-700">
                <span className="text-blue-500 mr-2 mt-1">•</span>
                {feature}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-sm ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                  ★
                </span>
              ))}
              <span className="text-sm text-gray-600">({product.rating})</span>
            </div>

            <div className="text-right">
              {product.unitPrice > 0 ? (
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(product.unitPrice)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Marge: {product.margin.toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div className="text-lg font-bold text-blue-600">
                  {product.price}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleWhatsAppRequest(product)}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>📱</span>
            <span>Devis WhatsApp</span>
          </button>
        </div>
      ))}
    </div>
  )
}

// Hook pour mettre à jour un produit depuis l'admin
export function useProductAdmin() {
  const { updateProduct, refreshProducts } = useProducts()

  const updateProductPrice = (productId: string, newPrice: number, newCostPrice?: number) => {
    const updates: any = { unitPrice: newPrice }

    if (newCostPrice) {
      updates.costPrice = newCostPrice
      updates.margin = ((newPrice - newCostPrice) / newPrice) * 100
    }

    updateProduct(productId, updates)
  }

  const updateProductStatus = (productId: string, status: 'active' | 'inactive' | 'discontinued') => {
    updateProduct(productId, { status })
  }

  const updateProductInfo = (productId: string, updates: any) => {
    updateProduct(productId, updates)
  }

  return {
    updateProductPrice,
    updateProductStatus,
    updateProductInfo,
    refreshProducts
  }
}