'use client'

import { useState, useEffect } from 'react'
import { Calculator, Camera, Shield, Home, Wifi, Plus, Minus, Zap, TrendingUp, Search } from 'lucide-react'

interface QuoteItem {
  id: string
  category: string
  name: string
  basePrice: number
  quantity: number
  features: string[]
  icon: any
}

export default function SmartQuoteCalculator() {
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([])
  const [surface, setSurface] = useState(100)
  const [complexity, setComplexity] = useState('standard')
  const [installation, setInstallation] = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  const [selectedService, setSelectedService] = useState<string>('Vidéosurveillance')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const productCategories = [
    {
      name: "Vidéosurveillance",
      icon: Camera,
      items: [
        {
          id: 'cam-ip-4k',
          name: 'Caméra IP 4K',
          basePrice: 180000,
          features: ['4K Ultra HD', 'Vision nocturne', 'IA intégrée'],
          unit: 'unité'
        },
        {
          id: 'nvr-32ch',
          name: 'NVR 32 canaux',
          basePrice: 850000,
          features: ['32 canaux', '4K output', 'RAID support'],
          unit: 'unité'
        },
        {
          id: 'ecran-moniteur',
          name: 'Écran surveillance 24"',
          basePrice: 320000,
          features: ['24 pouces', 'Full HD', 'Multi-entrées'],
          unit: 'unité'
        }
      ]
    },
    {
      name: "Contrôle d'accès",
      icon: Shield,
      items: [
        {
          id: 'terminal-facial',
          name: 'Terminal reconnaissance faciale',
          basePrice: 450000,
          features: ['Reconnaissance faciale', 'RFID', 'Écran tactile'],
          unit: 'unité'
        },
        {
          id: 'serrure-mag',
          name: 'Serrure magnétique',
          basePrice: 85000,
          features: ['Force 280kg', 'Feedback', 'LED status'],
          unit: 'unité'
        }
      ]
    },
    {
      name: "Domotique",
      icon: Home,
      items: [
        {
          id: 'hub-zigbee',
          name: 'Hub Zigbee central',
          basePrice: 45000,
          features: ['Zigbee 3.0', 'WiFi', 'App mobile'],
          unit: 'unité'
        },
        {
          id: 'interrupteur-smart',
          name: 'Interrupteur connecté',
          basePrice: 25000,
          features: ['3 gangs', 'WiFi', 'Contrôle vocal'],
          unit: 'unité'
        }
      ]
    },
    {
      name: "Réseau",
      icon: Wifi,
      items: [
        {
          id: 'switch-poe',
          name: 'Switch PoE 18 ports',
          basePrice: 380000,
          features: ['18 ports PoE+', '250W budget', 'Web management'],
          unit: 'unité'
        },
        {
          id: 'cable-cat6',
          name: 'Câblage Cat6A',
          basePrice: 3500,
          features: ['Cat6A', 'Blindé', 'Installation'],
          unit: 'mètre'
        }
      ]
    }
  ]

  const addItem = (categoryName: string, item: any) => {
    const newItem: QuoteItem = {
      id: `${item.id}-${Date.now()}`,
      category: categoryName,
      name: item.name,
      basePrice: item.basePrice,
      quantity: 1,
      features: item.features,
      icon: productCategories.find(cat => cat.name === categoryName)?.icon || Camera
    }
    setSelectedItems([...selectedItems, newItem])
  }

  const updateQuantity = (id: string, change: number) => {
    setSelectedItems(selectedItems.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    ))
  }

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id))
  }

  const calculateSubtotal = () => {
    return selectedItems.reduce((total, item) => total + (item.basePrice * item.quantity), 0)
  }

  const getComplexityMultiplier = () => {
    switch (complexity) {
      case 'simple': return 0.8
      case 'standard': return 1.0
      case 'complex': return 1.3
      case 'enterprise': return 1.6
      default: return 1.0
    }
  }

  const getInstallationCost = () => {
    if (!installation) return 0
    const baseInstallation = calculateSubtotal() * 0.15 // 15% du matériel
    const surfaceBonus = surface > 200 ? (surface - 200) * 1000 : 0
    return baseInstallation + surfaceBonus
  }

  const getMaintenanceCost = () => {
    if (!maintenance) return 0
    return calculateSubtotal() * 0.08 // 8% du matériel par an
  }

  const getTotalEstimate = () => {
    const subtotal = calculateSubtotal()
    const complexityAdjustment = subtotal * (getComplexityMultiplier() - 1)
    const installationCost = getInstallationCost()
    const maintenanceCost = getMaintenanceCost()
    
    return subtotal + complexityAdjustment + installationCost + maintenanceCost
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(price)) + ' FCFA'
  }

  const generateWhatsAppQuote = () => {
    const itemsList = selectedItems.map(item => 
      `• ${item.name} x${item.quantity} = ${formatPrice(item.basePrice * item.quantity)}`
    ).join('%0A')
    
    const total = getTotalEstimate()
    
    const message = `💰 ESTIMATION AUTOMATIQUE DE DEVIS%0A%0A🏢 PARAMÈTRES PROJET:%0A- Surface: ${surface}m²%0A- Complexité: ${complexity}%0A- Installation: ${installation ? 'Incluse' : 'Non incluse'}%0A- Maintenance: ${maintenance ? 'Incluse (1 an)' : 'Non incluse'}%0A%0A📋 ÉQUIPEMENTS SÉLECTIONNÉS:%0A${itemsList}%0A%0A💵 ESTIMATION TOTALE:%0A${formatPrice(total)}%0A%0A⚠️ Cette estimation est indicative. Demande de devis détaillé pour confirmation exacte.%0A%0AMerci de me faire parvenir un devis personnalisé.`
    
    return `https://wa.me/221774133440?text=${message}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-6">
        <div className="flex items-center space-x-3">
          <Calculator className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">🧮 Calculateur de Devis</h2>
            <p className="text-emerald-100">Estimez votre projet en temps réel - Calcul automatique et précis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Sélection produits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sélection de service (compact, innovatif) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Choisissez un service</h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {productCategories.map((cat) => {
                const Icon = cat.icon
                const isActive = selectedService === cat.name
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedService(cat.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                    aria-pressed={isActive}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                    {cat.name}
                  </button>
                )
              })}
            </div>

            {/* Barre de recherche équipements */}
            <div className="mt-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un équipement, une marque, un modèle..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Sélectionnez vos équipements</h3>

            {(() => {
              const active = productCategories.find(c => c.name === selectedService)
              if (!active) return null
              const IconComponent = active.icon
              const filteredItems = active.items.filter((it: any) => {
                if (!searchTerm.trim()) return true
                const q = searchTerm.toLowerCase()
                return (
                  it.name.toLowerCase().includes(q) ||
                  (it.features || []).join(' ').toLowerCase().includes(q)
                )
              })
              return (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <IconComponent className="h-5 w-5 mr-2 text-blue-600" />
                    {active.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredItems.map((item: any) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-sm text-gray-900">{item.name}</h5>
                          <button
                            onClick={() => addItem(active.name, item)}
                            className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {item.features.join(' • ')}
                        </div>
                        <div className="text-sm font-semibold text-emerald-600">
                          {formatPrice(item.basePrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredItems.length === 0 && (
                    <div className="text-center text-gray-500 py-8">Aucun équipement ne correspond à votre recherche</div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Paramètres projet */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Paramètres du projet</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surface à couvrir (m²)
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={surface}
                  onChange={(e) => setSurface(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">{surface} m²</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complexité d'installation
                </label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="simple">Simple (-20%)</option>
                  <option value="standard">Standard</option>
                  <option value="complex">Complexe (+30%)</option>
                  <option value="enterprise">Entreprise (+60%)</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={installation}
                  onChange={(e) => setInstallation(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Inclure installation</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={maintenance}
                  onChange={(e) => setMaintenance(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Maintenance 1 an</span>
              </label>
            </div>
          </div>
        </div>

        {/* Résumé et calcul */}
        <div className="space-y-6">
          {/* Items sélectionnés */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Votre sélection</h3>
            
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Sélectionnez des équipements pour voir votre devis</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((item) => {
                  const IconComponent = item.icon
                  return (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start space-x-2">
                          <IconComponent className="h-4 w-4 mt-1 text-blue-600" />
                          <div>
                            <h5 className="font-medium text-sm text-gray-900">{item.name}</h5>
                            <p className="text-xs text-gray-500">{item.category}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="bg-gray-200 text-gray-700 p-1 rounded hover:bg-gray-300"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="bg-gray-200 text-gray-700 p-1 rounded hover:bg-gray-300"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-sm font-semibold text-emerald-600">
                          {formatPrice(item.basePrice * item.quantity)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Calcul final */}
          {selectedItems.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-4 border border-emerald-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-emerald-600" />
                Estimation totale
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Équipements :</span>
                  <span>{formatPrice(calculateSubtotal())}</span>
                </div>
                
                {getComplexityMultiplier() !== 1 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Ajustement complexité :</span>
                    <span>{formatPrice(calculateSubtotal() * (getComplexityMultiplier() - 1))}</span>
                  </div>
                )}
                
                {installation && (
                  <div className="flex justify-between text-purple-600">
                    <span>Installation :</span>
                    <span>{formatPrice(getInstallationCost())}</span>
                  </div>
                )}
                
                {maintenance && (
                  <div className="flex justify-between text-orange-600">
                    <span>Maintenance 1 an :</span>
                    <span>{formatPrice(getMaintenanceCost())}</span>
                  </div>
                )}
                
                <hr className="my-2" />
                
                <div className="flex justify-between font-semibold text-lg text-emerald-700">
                  <span>Total estimé :</span>
                  <span>{formatPrice(getTotalEstimate())}</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <Zap className="h-4 w-4 inline mr-1" />
                Estimation automatique basée sur nos tarifs standards. Devis définitif après étude détaillée.
              </div>
              
              <a
                href={generateWhatsAppQuote()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
              >
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                Demander devis détaillé
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}