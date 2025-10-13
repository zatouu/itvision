'use client'

import { useState } from 'react'
import { 
  Camera,
  Home,
  Shield,
  Wifi,
  Zap,
  Package,
  Eye,
  Settings,
  Info,
  Star,
  Award
} from 'lucide-react'
import { 
  ServiceType, 
  ProductType, 
  ProductVariant,
  DEFAULT_SERVICE_TYPES,
  VIDEOSURVEILLANCE_PRODUCTS,
  DOMOTIQUE_TYPES
} from '../types/pricing'

export default function ServiceProductCatalog() {
  const [selectedService, setSelectedService] = useState<string>('videosurveillance')
  const [selectedProductType, setSelectedProductType] = useState<string>('')

  const serviceTypes = DEFAULT_SERVICE_TYPES
  const allProductTypes = [...VIDEOSURVEILLANCE_PRODUCTS, ...DOMOTIQUE_TYPES]

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

  const filteredProductTypes = allProductTypes.filter(pt => 
    pt.serviceTypeId === selectedService
  )

  const selectedProductTypeData = selectedProductType 
    ? allProductTypes.find(pt => pt.id === selectedProductType)
    : null

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📋 Catalogue Produits par Service
        </h1>
        <p className="text-gray-600">
          Explorez les types de produits disponibles par service - Configuration des prix séparée
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sélection service */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-4 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Services</h3>
            <div className="space-y-2">
              {serviceTypes.map((service) => {
                const IconComponent = getServiceIcon(service.id)
                return (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service.id)
                      setSelectedProductType('')
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedService === service.id
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="h-5 w-5" />
                      <div>
                        <div className="font-medium text-sm">{service.name}</div>
                        <div className="text-xs text-gray-500">
                          Marge: {service.defaultMargin}%
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Types de produits */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Types de Produits
              <span className="ml-2 text-sm text-gray-500">({filteredProductTypes.length})</span>
            </h3>
            <div className="space-y-2">
              {filteredProductTypes.map((productType) => (
                <button
                  key={productType.id}
                  onClick={() => setSelectedProductType(productType.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedProductType === productType.id
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-sm">{productType.name}</div>
                  <div className="text-xs text-gray-500">
                    {productType.variants?.length || 0} variants
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {productType.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Variants */}
        <div className="lg:col-span-2">
          {selectedProductTypeData ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedProductTypeData.name}</h3>
                <p className="text-gray-600">{selectedProductTypeData.description}</p>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <span>Catégorie: {selectedProductTypeData.category}</span>
                  <span>Service: {serviceTypes.find(s => s.id === selectedProductTypeData.serviceTypeId)?.name}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">
                  Variants disponibles ({selectedProductTypeData.variants?.length || 0})
                </h4>
                
                {selectedProductTypeData.variants?.map((variant) => (
                  <div key={variant.id} className={`border rounded-lg p-4 ${variant.isDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900 flex items-center">
                          {variant.name}
                          {variant.isDefault && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              <Star className="h-3 w-3 mr-1" />
                              Recommandé
                            </span>
                          )}
                        </h5>
                        <p className="text-sm text-gray-600">{variant.description}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-500">Prix à configurer</div>
                        <div className="text-xs text-gray-500">Utilisez la gestion des prix</div>
                      </div>
                    </div>
                    
                    <div>
                      <h6 className="text-sm font-medium text-gray-700 mb-2">Spécifications techniques:</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {variant.specifications.map((spec, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{spec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Informations complémentaires */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-800">Configuration des prix requise</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Les prix de ces produits doivent être configurés dans le système de gestion des prix 
                      avant de pouvoir être utilisés dans les devis.
                    </p>
                    <div className="mt-3">
                      <a
                        href="/admin/prices"
                        className="inline-flex items-center space-x-2 bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Configurer les prix</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sélectionnez un type de produit
                </h3>
                <p className="text-gray-600">
                  Choisissez un type de produit dans la liste de gauche pour voir ses variants
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide d'utilisation */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📖 Guide d'utilisation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-blue-600">1</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Explorez les services</h4>
            <p className="text-sm text-gray-600">
              Chaque service (vidéosurveillance, domotique, etc.) a ses propres types de produits
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-green-600">2</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Découvrez les variants</h4>
            <p className="text-sm text-gray-600">
              Chaque type de produit a plusieurs variants (ex: NVR 4, 8, 16 canaux)
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-purple-600">3</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Configurez les prix</h4>
            <p className="text-sm text-gray-600">
              Utilisez le système de gestion des prix pour définir coûts et marges
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}