'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Edit3, 
  Save, 
  RefreshCw, 
  TrendingUp, 
  Package, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertTriangle, 
  Eye, 
  History,
  Calculator
} from 'lucide-react'

interface Product {
  id: string
  name: string
  model: string
  brand: string
  category: string
  unitPrice: number
  costPrice: number
  margin: number
  currency: string
  status: string
  lastUpdated: string
}

export default function QuickPriceEditor() {
  const [products, setProducts] = useState<Product[]>([])
  const [editingPrices, setEditingPrices] = useState<{[key: string]: {price: number, cost: number}}>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showMarginWarning, setShowMarginWarning] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // Charger les produits depuis le localStorage ou données par défaut
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = () => {
    const storedProducts = localStorage.getItem('itvision-products')
    if (storedProducts) {
      const parsed = JSON.parse(storedProducts)
      setProducts(parsed)
    } else {
      // Données d'exemple si aucune sauvegarde
      const defaultProducts: Product[] = [
        {
          id: 'bpi-commscope-f08',
          name: 'BPI 8 départs',
          model: 'FlexNAP F08',
          brand: 'CommScope',
          category: 'fiber-optic',
          unitPrice: 180000,
          costPrice: 135000,
          margin: 33.3,
          currency: 'FCFA',
          status: 'active',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'pbo-commscope-f04',
          name: 'PBO 4 ports',
          model: 'FlexNAP F04', 
          brand: 'CommScope',
          category: 'fiber-optic',
          unitPrice: 45000,
          costPrice: 32000,
          margin: 40.6,
          currency: 'FCFA',
          status: 'active',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'cable-cat6a-legrand',
          name: 'Câble Cat6A UTP 305m',
          model: 'Cat6A 305m',
          brand: 'Legrand',
          category: 'network-cabling',
          unitPrice: 1800,
          costPrice: 1200,
          margin: 50,
          currency: 'FCFA',
          status: 'active',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'hub-aqara-m2',
          name: 'Hub Central Zigbee',
          model: 'Hub M2',
          brand: 'Aqara',
          category: 'domotique',
          unitPrice: 45000,
          costPrice: 28000,
          margin: 60.7,
          currency: 'FCFA',
          status: 'active',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'cam-hikvision-4k',
          name: 'Caméra IP 4K AcuSense',
          model: 'DS-2CD2143G2-I',
          brand: 'Hikvision',
          category: 'videosurveillance',
          unitPrice: 45000,
          costPrice: 32000,
          margin: 40.6,
          currency: 'FCFA',
          status: 'active',
          lastUpdated: new Date().toISOString()
        }
      ]
      setProducts(defaultProducts)
      localStorage.setItem('itvision-products', JSON.stringify(defaultProducts))
    }
  }

  const startEditingPrice = (productId: string, currentPrice: number, currentCost: number) => {
    setEditingPrices(prev => ({
      ...prev,
      [productId]: { price: currentPrice, cost: currentCost }
    }))
  }

  const updateEditingPrice = (productId: string, field: 'price' | 'cost', value: number) => {
    setEditingPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }))

    // Calculer la marge en temps réel
    const editing = editingPrices[productId]
    if (editing) {
      const price = field === 'price' ? value : editing.price
      const cost = field === 'cost' ? value : editing.cost
      const margin = ((price - cost) / price) * 100

      if (margin < 15) {
        setShowMarginWarning(productId)
      } else {
        setShowMarginWarning(null)
      }
    }
  }

  const savePrice = (productId: string) => {
    const editing = editingPrices[productId]
    if (!editing) return

    const margin = ((editing.price - editing.cost) / editing.price) * 100

    if (margin < 10) {
      if (!confirm(`Attention: Marge très faible (${margin.toFixed(1)}%). Confirmer ?`)) {
        return
      }
    }

    // Mettre à jour le produit
    setProducts(prev => {
      const updated = prev.map(product => 
        product.id === productId
          ? {
              ...product,
              unitPrice: editing.price,
              costPrice: editing.cost,
              margin,
              lastUpdated: new Date().toISOString()
            }
          : product
      )
      
      // Sauvegarder dans localStorage
      localStorage.setItem('itvision-products', JSON.stringify(updated))
      return updated
    })

    // Nettoyer l'édition
    setEditingPrices(prev => {
      const { [productId]: removed, ...rest } = prev
      return rest
    })

    setLastSaved(productId)
    setTimeout(() => setLastSaved(null), 2000)

    // Déclencher une mise à jour des pages publiques
    window.dispatchEvent(new CustomEvent('products-updated'))
  }

  const cancelEdit = (productId: string) => {
    setEditingPrices(prev => {
      const { [productId]: removed, ...rest } = prev
      return rest
    })
    setShowMarginWarning(null)
  }

  const bulkUpdateMargin = (margin: number) => {
    if (!confirm(`Appliquer une marge de ${margin}% à tous les produits visibles ?`)) {
      return
    }

    setProducts(prev => {
      const updated = prev.map(product => {
        if (filteredProducts.find(fp => fp.id === product.id)) {
          const newPrice = Math.round(product.costPrice / (1 - margin / 100))
          return {
            ...product,
            unitPrice: newPrice,
            margin,
            lastUpdated: new Date().toISOString()
          }
        }
        return product
      })
      
      localStorage.setItem('itvision-products', JSON.stringify(updated))
      return updated
    })

    window.dispatchEvent(new CustomEvent('products-updated'))
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.model.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
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

  const getCategoryName = (categoryId: string) => {
    const categories: {[key: string]: string} = {
      'videosurveillance': 'Vidéosurveillance',
      'domotique': 'Domotique',
      'network-cabling': 'Câblage Réseau',
      'fiber-optic': 'Fibre Optique',
      'controle-acces': 'Contrôle d\'Accès'
    }
    return categories[categoryId] || categoryId
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              💰 Édition Rapide des Prix
            </h1>
            <p className="text-gray-600">
              Modifiez vos prix en temps réel - Synchronisation automatique avec le site
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => bulkUpdateMargin(30)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Marge 30% Tous
            </button>
            
            <button
              onClick={loadProducts}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom, marque, modèle..."
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
                <option value="all">Toutes catégories</option>
                <option value="videosurveillance">Vidéosurveillance</option>
                <option value="domotique">Domotique</option>
                <option value="network-cabling">Câblage Réseau</option>
                <option value="fiber-optic">Fibre Optique</option>
                <option value="controle-acces">Contrôle d'Accès</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-800">
                  <strong>{filteredProducts.length}</strong> produits
                </div>
                <div className="text-xs text-green-600">
                  Modifications auto-sauvegardées
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marges globales */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Actions Rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[15, 20, 25, 30, 35, 40, 45, 50, 60, 70].map(margin => (
            <button
              key={margin}
              onClick={() => bulkUpdateMargin(margin)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                margin >= 50 ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' :
                margin >= 30 ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' :
                margin >= 20 ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' :
                'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Marge {margin}%
            </button>
          ))}
        </div>
      </div>

      {/* Liste des produits */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            💼 Produits IT Vision ({filteredProducts.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Coût</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Vente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marge</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const editing = editingPrices[product.id]
                const currentMargin = editing 
                  ? ((editing.price - editing.cost) / editing.price) * 100
                  : product.margin

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.brand} {product.model}</div>
                        <div className="text-xs text-gray-500">{getCategoryName(product.category)}</div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {editing ? (
                        <input
                          type="number"
                          value={editing.cost}
                          onChange={(e) => updateEditingPrice(product.id, 'cost', parseInt(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(product.costPrice)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {editing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editing.price}
                            onChange={(e) => updateEditingPrice(product.id, 'price', parseInt(e.target.value) || 0)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                          />
                          {showMarginWarning === product.id && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-green-600 font-bold">
                            {formatCurrency(product.unitPrice)}
                          </span>
                          {lastSaved === product.id && (
                            <div className="flex items-center space-x-1 text-green-600 text-xs mt-1">
                              <Check className="h-3 w-3" />
                              <span>Sauvegardé</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMarginColor(currentMargin)}`}>
                        {currentMargin.toFixed(1)}%
                      </span>
                      {editing && showMarginWarning === product.id && (
                        <div className="text-red-600 text-xs mt-1">Marge faible!</div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {editing ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => savePrice(product.id)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Sauvegarder"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => cancelEdit(product.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Annuler"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingPrice(product.id, product.unitPrice, product.costPrice)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Modifier prix"
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

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Mode d'emploi</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Cliquez sur l'icône ✏️</strong> pour modifier un prix spécifique</li>
          <li>• <strong>Utilisez les boutons "Marge X%"</strong> pour appliquer une marge à tous les produits visibles</li>
          <li>• <strong>Les modifications sont automatiquement sauvegardées</strong> et apparaissent instantanément sur le site</li>
          <li>• <strong>Filtrez par catégorie</strong> pour modifier une gamme spécifique</li>
          <li>• <strong>Marges recommandées:</strong> 🔴 &lt;20% (Faible) | 🟡 20-30% (Correcte) | 🔵 30-50% (Bonne) | 🟢 &gt;50% (Excellente)</li>
        </ul>
      </div>
    </div>
  )
}