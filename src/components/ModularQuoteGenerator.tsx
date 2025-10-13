'use client'

import { useState, useEffect } from 'react'
import { 
  Calculator, 
  FileText, 
  Plus, 
  Minus, 
  Edit3,
  Save,
  Send,
  Eye,
  Download,
  Settings,
  Camera,
  X,
  Home,
  Shield,
  Wifi,
  Zap,
  Package,
  AlertTriangle,
  Check,
  TrendingUp
} from 'lucide-react'
import { 
  ServiceType, 
  ProductType, 
  ProductVariant, 
  PriceOverride,
  DEFAULT_SERVICE_TYPES,
  VIDEOSURVEILLANCE_PRODUCTS,
  DOMOTIQUE_TYPES
} from '../types/pricing'

interface QuoteItem {
  id: string
  productTypeId: string
  variantId: string
  name: string
  description: string
  specifications: string[]
  quantity: number
  unitPrice: number
  totalPrice: number
  hasPrice: boolean
}

interface QuoteSection {
  id: string
  serviceTypeId: string
  name: string
  items: QuoteItem[]
  subtotal: number
}

interface Quote {
  id: string
  sections: QuoteSection[]
  totals: {
    subtotalHT: number
    taxAmount: number
    totalTTC: number
  }
  client: {
    company: string
    contact: string
    email: string
    phone: string
  }
  metadata: {
    createdAt: string
    validUntil: string
  }
}

export default function ModularQuoteGenerator() {
  const [serviceTypes] = useState<ServiceType[]>(DEFAULT_SERVICE_TYPES)
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([])
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null)
  const [selectedService, setSelectedService] = useState<string>('')
  const [showPriceWarnings, setShowPriceWarnings] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    // Charger les types de produits
    const allProductTypes = [
      ...VIDEOSURVEILLANCE_PRODUCTS,
      ...DOMOTIQUE_TYPES
    ]
    setProductTypes(allProductTypes)

    // Charger les prix depuis localStorage
    const storedPrices = localStorage.getItem('itvision-price-overrides')
    if (storedPrices) {
      setPriceOverrides(JSON.parse(storedPrices))
    }

    // Écouter les mises à jour de prix
    const handlePriceUpdate = () => {
      const updatedPrices = localStorage.getItem('itvision-price-overrides')
      if (updatedPrices) {
        setPriceOverrides(JSON.parse(updatedPrices))
      }
    }

    window.addEventListener('prices-updated', handlePriceUpdate)
    return () => window.removeEventListener('prices-updated', handlePriceUpdate)
  }

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case 'videosurveillance': return Camera
      case 'domotique': return Home
      case 'controle_acces': return Shield
      case 'network_cabling': return Wifi
      case 'fiber_optic': return Zap
      default: return Package
    }
  }

  const getCurrentPrice = (productTypeId: string, variantId: string): PriceOverride | null => {
    return priceOverrides.find(
      po => po.productTypeId === productTypeId && 
            po.variantId === variantId && 
            po.isActive
    ) || null
  }

  const createNewQuote = (serviceTypeId: string) => {
    const newQuote: Quote = {
      id: `QUO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      sections: [{
        id: serviceTypeId,
        serviceTypeId,
        name: serviceTypes.find(s => s.id === serviceTypeId)?.name || 'Service',
        items: [],
        subtotal: 0
      }],
      totals: {
        subtotalHT: 0,
        taxAmount: 0,
        totalTTC: 0
      },
      client: {
        company: 'Nouveau Client',
        contact: 'Contact',
        email: 'client@email.com',
        phone: '+221 XX XXX XX XX'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }

    setCurrentQuote(newQuote)
    setSelectedService(serviceTypeId)
  }

  const addProductToQuote = (productType: ProductType, variant: ProductVariant) => {
    if (!currentQuote) return

    const currentPrice = getCurrentPrice(productType.id, variant.id)
    
    const newItem: QuoteItem = {
      id: `${productType.id}-${variant.id}-${Date.now()}`,
      productTypeId: productType.id,
      variantId: variant.id,
      name: variant.name,
      description: variant.description,
      specifications: variant.specifications,
      quantity: 1,
      unitPrice: currentPrice?.unitPrice || 0,
      totalPrice: currentPrice?.unitPrice || 0,
      hasPrice: currentPrice !== null
    }

    const updatedQuote = {
      ...currentQuote,
      sections: currentQuote.sections.map(section => {
        if (section.serviceTypeId === productType.serviceTypeId) {
          return {
            ...section,
            items: [...section.items, newItem]
          }
        }
        return section
      })
    }

    setCurrentQuote(updatedQuote)
    calculateTotals(updatedQuote)
    
    // Ajouter avertissement si pas de prix
    if (!currentPrice) {
      setShowPriceWarnings(prev => [...prev, newItem.id])
    }
  }

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (!currentQuote) return

    const updatedQuote = {
      ...currentQuote,
      sections: currentQuote.sections.map(section => ({
        ...section,
        items: section.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity: Math.max(0, newQuantity),
              totalPrice: Math.max(0, newQuantity) * item.unitPrice
            }
          }
          return item
        })
      }))
    }

    setCurrentQuote(updatedQuote)
    calculateTotals(updatedQuote)
  }

  const removeItem = (itemId: string) => {
    if (!currentQuote) return

    const updatedQuote = {
      ...currentQuote,
      sections: currentQuote.sections.map(section => ({
        ...section,
        items: section.items.filter(item => item.id !== itemId)
      }))
    }

    setCurrentQuote(updatedQuote)
    calculateTotals(updatedQuote)
    setShowPriceWarnings(prev => prev.filter(id => id !== itemId))
  }

  const calculateTotals = (quote: Quote) => {
    let subtotalHT = 0

    quote.sections.forEach(section => {
      section.subtotal = section.items.reduce((sum, item) => sum + item.totalPrice, 0)
      subtotalHT += section.subtotal
    })

    const taxAmount = subtotalHT * 0.18 // TVA 18%
    const totalTTC = subtotalHT + taxAmount

    const updatedQuote = {
      ...quote,
      totals: {
        subtotalHT,
        taxAmount,
        totalTTC
      }
    }

    setCurrentQuote(updatedQuote)
  }

  const getItemsWithoutPrice = () => {
    if (!currentQuote) return []
    
    return currentQuote.sections.flatMap(section => 
      section.items.filter(item => !item.hasPrice)
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const filteredProductTypes = productTypes.filter(pt => 
    selectedService === '' || pt.serviceTypeId === selectedService
  )

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🧮 Générateur de Devis Modulaire
            </h1>
            <p className="text-gray-600">
              Système de devis avec gestion des prix par type de service
            </p>
          </div>
          
          {currentQuote && (
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Eye className="h-4 w-4" />
                <span>Aperçu</span>
              </button>
              
              <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                <Send className="h-4 w-4" />
                <span>Envoyer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Zone principale */}
        <div className="lg:col-span-2 space-y-6">
          {!currentQuote ? (
            /* Sélection de service */
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Créer un nouveau devis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviceTypes.map((service) => {
                  const IconComponent = getServiceIcon(service.id)
                  return (
                    <button
                      key={service.id}
                      onClick={() => createNewQuote(service.id)}
                      className="text-left p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-600">{service.description}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Marge défaut:</span>
                          <p className="font-medium">{service.defaultMargin}%</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Marge min:</span>
                          <p className="font-medium">{service.minimumMargin}%</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
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
                    <p className="text-gray-600">Service: {serviceTypes.find(s => s.id === selectedService)?.name}</p>
                  </div>
                  <button
                    onClick={() => setCurrentQuote(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ← Nouveau devis
                  </button>
                </div>

                {/* Avertissement prix manquants */}
                {getItemsWithoutPrice().length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">
                        {getItemsWithoutPrice().length} article(s) sans prix configuré
                      </span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      Configurez les prix dans le système de gestion des prix avant de finaliser le devis
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Client</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={currentQuote.client.company}
                        onChange={(e) => setCurrentQuote(prev => prev ? {
                          ...prev,
                          client: { ...prev.client, company: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Nom de l'entreprise"
                      />
                      <input
                        type="text"
                        value={currentQuote.client.contact}
                        onChange={(e) => setCurrentQuote(prev => prev ? {
                          ...prev,
                          client: { ...prev.client, contact: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Nom du contact"
                      />
                      <input
                        type="email"
                        value={currentQuote.client.email}
                        onChange={(e) => setCurrentQuote(prev => prev ? {
                          ...prev,
                          client: { ...prev.client, email: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Email"
                      />
                      <input
                        type="tel"
                        value={currentQuote.client.phone}
                        onChange={(e) => setCurrentQuote(prev => prev ? {
                          ...prev,
                          client: { ...prev.client, phone: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Téléphone"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Informations</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Créé le: {new Date(currentQuote.metadata.createdAt).toLocaleDateString('fr-FR')}</p>
                      <p>Valable jusqu'au: {new Date(currentQuote.metadata.validUntil).toLocaleDateString('fr-FR')}</p>
                      <p>Articles: {currentQuote.sections.reduce((acc, s) => acc + s.items.length, 0)}</p>
                      <p>Prix configurés: {currentQuote.sections.reduce((acc, s) => acc + s.items.filter(i => i.hasPrice).length, 0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ajout de produits */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Ajouter des équipements</h3>
                
                {filteredProductTypes.map((productType) => (
                  <div key={productType.id} className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-3">{productType.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {productType.variants?.map((variant) => {
                        const currentPrice = getCurrentPrice(productType.id, variant.id)
                        const hasPrice = currentPrice !== null
                        
                        return (
                          <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-medium text-gray-900 flex items-center">
                                  {variant.name}
                                  {variant.isDefault && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      Recommandé
                                    </span>
                                  )}
                                </h5>
                                <p className="text-sm text-gray-600">{variant.description}</p>
                              </div>
                              
                              <button
                                onClick={() => addProductToQuote(productType, variant)}
                                disabled={!hasPrice}
                                className={`p-2 rounded transition-colors ${
                                  hasPrice 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                title={hasPrice ? 'Ajouter au devis' : 'Prix non configuré'}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-1">
                                {variant.specifications.slice(0, 3).map((spec, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className={`text-sm font-medium ${hasPrice ? 'text-green-600' : 'text-red-500'}`}>
                                {hasPrice ? formatCurrency(currentPrice.unitPrice) : 'Prix non défini'}
                              </div>
                              {hasPrice && (
                                <div className="text-xs text-gray-500">
                                  Marge: {currentPrice.margin.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Articles du devis */}
              {currentQuote.sections.map((section) => (
                section.items.length > 0 && (
                  <div key={section.id} className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Articles sélectionnés - {section.name}
                    </h3>
                    
                    <div className="space-y-4">
                      {section.items.map((item) => (
                        <div key={item.id} className={`border rounded-lg p-4 ${!item.hasPrice ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                            <div className="md:col-span-2">
                              <h5 className="font-medium text-gray-900 flex items-center">
                                {item.name}
                                {!item.hasPrice && (
                                  <AlertTriangle className="h-4 w-4 ml-2 text-red-500" />
                                )}
                              </h5>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                                className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                              />
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="text-center">
                              <p className={`font-medium ${item.hasPrice ? 'text-gray-900' : 'text-red-500'}`}>
                                {item.hasPrice ? formatCurrency(item.unitPrice) : 'Prix manquant'}
                              </p>
                              <p className="text-xs text-gray-500">par unité</p>
                            </div>
                            
                            <div className="text-center">
                              <p className={`font-bold ${item.hasPrice ? 'text-green-600' : 'text-red-500'}`}>
                                {item.hasPrice ? formatCurrency(item.totalPrice) : 'N/A'}
                              </p>
                            </div>
                            
                            <div className="flex justify-center">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Spécifications */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex flex-wrap gap-1">
                              {item.specifications.map((spec, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {currentQuote && (
            <>
              {/* Totaux */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Totaux</h3>
                
                <div className="space-y-3">
                  {currentQuote.sections.map((section) => (
                    section.items.length > 0 && (
                      <div key={section.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{section.name}:</span>
                        <span className="font-medium">{formatCurrency(section.subtotal)}</span>
                      </div>
                    )
                  ))}
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sous-total HT:</span>
                      <span className="font-medium">{formatCurrency(currentQuote.totals.subtotalHT)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">TVA (18%):</span>
                      <span className="font-medium">{formatCurrency(currentQuote.totals.taxAmount)}</span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-bold text-lg">Total TTC:</span>
                      <span className="font-bold text-lg text-green-600">
                        {formatCurrency(currentQuote.totals.totalTTC)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statut et actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
                
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${
                    getItemsWithoutPrice().length === 0 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {getItemsWithoutPrice().length === 0 ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-green-800 text-sm font-medium">Devis prêt</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-red-800 text-sm font-medium">
                            {getItemsWithoutPrice().length} prix manquant(s)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    disabled={getItemsWithoutPrice().length > 0}
                    className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      getItemsWithoutPrice().length === 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className="h-4 w-4" />
                    <span>Sauvegarder devis</span>
                  </button>
                  
                  <button 
                    disabled={getItemsWithoutPrice().length > 0}
                    className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      getItemsWithoutPrice().length === 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Exporter PDF</span>
                  </button>
                </div>
              </div>

              {/* Lien vers gestion prix */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Gestion des Prix</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Configurez les prix des équipements dans le système de gestion des prix
                </p>
                <a
                  href="/admin/prices"
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Settings className="h-4 w-4" />
                  <span>Gérer les prix</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}