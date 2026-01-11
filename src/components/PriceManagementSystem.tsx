'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Edit3, 
  Save, 
  RefreshCw, 
  Package, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertTriangle, 
  Plus,
  Settings,
  Eye,
  Calculator,
  TrendingUp,
  Camera,
  Home,
  Shield,
  Wifi,
  Zap
} from 'lucide-react'
import AdminPricingDefaults from './AdminPricingDefaults'
import { 
  ServiceType, 
  ProductType, 
  ProductVariant, 
  PriceOverride,
  DEFAULT_SERVICE_TYPES,
  VIDEOSURVEILLANCE_PRODUCTS,
  DOMOTIQUE_TYPES
} from '../types/pricing'

interface PriceEdit {
  productTypeId: string
  variantId: string
  unitPrice: number
  costPrice: number
  margin: number
}

export default function PriceManagementSystem() {
  const [serviceTypes] = useState<ServiceType[]>(DEFAULT_SERVICE_TYPES)
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([])
  const [editingPrices, setEditingPrices] = useState<{[key: string]: PriceEdit}>({})
  const [selectedService, setSelectedService] = useState<string>('videosurveillance')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMarginWarning, setShowMarginWarning] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(() => {
    loadPricingData()
  }, [])

  const loadPricingData = () => {
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

  const startEditingPrice = (productTypeId: string, variantId: string) => {
    const currentPrice = getCurrentPrice(productTypeId, variantId)
    const editKey = `${productTypeId}-${variantId}`
    
    setEditingPrices(prev => ({
      ...prev,
      [editKey]: {
        productTypeId,
        variantId,
        unitPrice: currentPrice?.unitPrice || 0,
        costPrice: currentPrice?.costPrice || 0,
        margin: currentPrice?.margin || 30
      }
    }))
  }

  const updateEditingPrice = (editKey: string, field: 'unitPrice' | 'costPrice' | 'margin', value: number) => {
    setEditingPrices(prev => {
      const current = prev[editKey]
      if (!current) return prev

      let updated = { ...current, [field]: value }

      // Recalculer automatiquement selon le champ modifié
      if (field === 'unitPrice' || field === 'costPrice') {
        // Recalculer la marge
        if (updated.unitPrice > 0) {
          updated.margin = ((updated.unitPrice - updated.costPrice) / updated.unitPrice) * 100
        }
      } else if (field === 'margin') {
        // Recalculer le prix de vente
        if (updated.costPrice > 0) {
          updated.unitPrice = Math.round(updated.costPrice / (1 - value / 100))
        }
      }

      // Vérifier les marges faibles
      if (updated.margin < 15) {
        setShowMarginWarning(editKey)
      } else {
        setShowMarginWarning(null)
      }

      return { ...prev, [editKey]: updated }
    })
  }

  const savePrice = (editKey: string) => {
    const editing = editingPrices[editKey]
    if (!editing) return

    if (editing.margin < 10) {
      if (!confirm(`Attention: Marge très faible (${editing.margin.toFixed(1)}%). Confirmer ?`)) {
        return
      }
    }

    const newOverride: PriceOverride = {
      id: `price-${editing.productTypeId}-${editing.variantId}-${Date.now()}`,
      productTypeId: editing.productTypeId,
      variantId: editing.variantId,
      unitPrice: editing.unitPrice,
      costPrice: editing.costPrice,
      margin: editing.margin,
      currency: 'FCFA',
      validFrom: new Date().toISOString(),
      isActive: true,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Admin'
    }

    // Désactiver l'ancien prix s'il existe
    setPriceOverrides(prev => {
      const updated = prev.map(po => 
        po.productTypeId === editing.productTypeId && 
        po.variantId === editing.variantId
          ? { ...po, isActive: false }
          : po
      )
      
      const final = [...updated, newOverride]
      localStorage.setItem('itvision-price-overrides', JSON.stringify(final))
      return final
    })

    // Nettoyer l'édition
    setEditingPrices(prev => {
      const { [editKey]: removed, ...rest } = prev
      return rest
    })

    setLastSaved(editKey)
    setTimeout(() => setLastSaved(null), 2000)
    setShowMarginWarning(null)

    // Déclencher mise à jour
    window.dispatchEvent(new CustomEvent('prices-updated'))
  }

  const cancelEdit = (editKey: string) => {
    setEditingPrices(prev => {
      const { [editKey]: removed, ...rest } = prev
      return rest
    })
    setShowMarginWarning(null)
  }

  const bulkUpdateMargin = (margin: number, productTypeId?: string) => {
    const targetProducts = productTypeId 
      ? productTypes.filter(pt => pt.id === productTypeId)
      : filteredProductTypes

    if (!confirm(`Appliquer une marge de ${margin}% à ${targetProducts.length} types de produits ?`)) {
      return
    }

    const newOverrides: PriceOverride[] = []
    
    targetProducts.forEach(productType => {
      productType.variants?.forEach(variant => {
        const currentPrice = getCurrentPrice(productType.id, variant.id)
        const costPrice = currentPrice?.costPrice || 0
        
        if (costPrice > 0) {
          const unitPrice = Math.round(costPrice / (1 - margin / 100))
          
          newOverrides.push({
            id: `bulk-${productType.id}-${variant.id}-${Date.now()}`,
            productTypeId: productType.id,
            variantId: variant.id,
            unitPrice,
            costPrice,
            margin,
            currency: 'FCFA',
            validFrom: new Date().toISOString(),
            isActive: true,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'Admin'
          })
        }
      })
    })

    // Désactiver les anciens prix et ajouter les nouveaux
    setPriceOverrides(prev => {
      const deactivated = prev.map(po => {
        const shouldDeactivate = newOverrides.some(no => 
          no.productTypeId === po.productTypeId && no.variantId === po.variantId
        )
        return shouldDeactivate ? { ...po, isActive: false } : po
      })
      
      const final = [...deactivated, ...newOverrides]
      localStorage.setItem('itvision-price-overrides', JSON.stringify(final))
      return final
    })

    window.dispatchEvent(new CustomEvent('prices-updated'))
  }

  const filteredProductTypes = productTypes.filter(productType => {
    const matchesService = productType.serviceTypeId === selectedService
    const matchesSearch = searchTerm === '' || 
      productType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (productType.variants?.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase())))
    
    return matchesService && matchesSearch
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-600 bg-green-100'
    if (margin >= 30) return 'text-blue-600 bg-blue-100'
    if (margin >= 20) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <AdminPricingDefaults />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              💰 Gestion des Prix par Service
            </h1>
            <p className="text-gray-600">
              Configurez les prix par type de produit et service - Sans prix par défaut
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={loadPricingData}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Sélection de service */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Sélectionner un Service</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {serviceTypes.map((service) => {
              const IconComponent = getServiceIcon(service.id)
              return (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedService === service.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <IconComponent className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">{service.name}</div>
                  <div className="text-xs text-gray-500">Marge: {service.defaultMargin}%</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de produit, variant..."
                />
              </div>
            </div>

            <div className="flex items-end space-x-2">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-800">
                  <strong>{filteredProductTypes.length}</strong> types de produits
                </div>
                <div className="text-xs text-green-600">
                  Service: {serviceTypes.find(s => s.id === selectedService)?.name}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Actions Rapides - Marges</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[20, 25, 30, 35, 40, 50].map(margin => (
            <button
              key={margin}
              onClick={() => bulkUpdateMargin(margin)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                margin >= 40 ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' :
                margin >= 30 ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' :
                margin >= 25 ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' :
                'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Marge {margin}%
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Applique la marge sélectionnée à tous les produits du service actuel qui ont un prix de coût défini
        </p>
      </div>

      {/* Liste des produits par type */}
      <div className="space-y-6">
        {filteredProductTypes.map((productType) => (
          <div key={productType.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{productType.name}</h3>
                  <p className="text-sm text-gray-600">{productType.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {productType.variants?.length || 0} variants
                  </div>
                  <button
                    onClick={() => bulkUpdateMargin(30, productType.id)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    Marge 30% type
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spécifications</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Coût</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Vente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marge</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productType.variants?.map((variant) => {
                    const editKey = `${productType.id}-${variant.id}`
                    const editing = editingPrices[editKey]
                    const currentPrice = getCurrentPrice(productType.id, variant.id)
                    const hasPrice = currentPrice !== null

                    return (
                      <tr key={variant.id} className={`hover:bg-gray-50 ${variant.isDefault ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-gray-900 flex items-center">
                              {variant.name}
                              {variant.isDefault && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Défaut
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{variant.description}</div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {variant.specifications.slice(0, 3).map((spec, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {spec}
                              </span>
                            ))}
                            {variant.specifications.length > 3 && (
                              <span className="text-xs text-gray-500">+{variant.specifications.length - 3}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {editing ? (
                            <input
                              type="number"
                              value={editing.costPrice}
                              onChange={(e) => updateEditingPrice(editKey, 'costPrice', parseInt(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                              placeholder="Prix coût"
                            />
                          ) : (
                            <span className={`${hasPrice ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                              {hasPrice ? formatCurrency(currentPrice.costPrice) : 'Non défini'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {editing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={editing.unitPrice}
                                onChange={(e) => updateEditingPrice(editKey, 'unitPrice', parseInt(e.target.value) || 0)}
                                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                placeholder="Prix vente"
                              />
                              {showMarginWarning === editKey && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className={`${hasPrice ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                                {hasPrice ? formatCurrency(currentPrice.unitPrice) : 'Non défini'}
                              </span>
                              {lastSaved === editKey && (
                                <div className="flex items-center space-x-1 text-green-600 text-xs mt-1">
                                  <Check className="h-3 w-3" />
                                  <span>Sauvegardé</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {editing ? (
                            <div>
                              <input
                                type="number"
                                value={Math.round(editing.margin)}
                                onChange={(e) => updateEditingPrice(editKey, 'margin', parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                placeholder="%"
                              />
                              {showMarginWarning === editKey && (
                                <div className="text-red-600 text-xs mt-1">Marge faible!</div>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              hasPrice ? getMarginColor(currentPrice.margin) : 'text-gray-400 bg-gray-100'
                            }`}>
                              {hasPrice ? `${currentPrice.margin.toFixed(1)}%` : 'N/A'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {editing ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => savePrice(editKey)}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="Sauvegarder"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => cancelEdit(editKey)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Annuler"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditingPrice(productType.id, variant.id)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title={hasPrice ? "Modifier prix" : "Définir prix"}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Aucun prix par défaut:</strong> Tous les prix doivent être configurés manuellement</li>
          <li>• <strong>Prix par variant:</strong> Chaque variant de produit a son propre prix</li>
          <li>• <strong>Calcul automatique:</strong> Modifiez coût/vente/marge, les autres valeurs se calculent automatiquement</li>
          <li>• <strong>Marges recommandées:</strong> 🔴 &lt;20% (Faible) | 🟡 20-30% (Correcte) | 🔵 30-50% (Bonne) | 🟢 &gt;50% (Excellente)</li>
          <li>• <strong>Sauvegarde automatique:</strong> Les prix sont sauvegardés localement et synchronisés</li>
        </ul>
      </div>
    </div>
  )
}