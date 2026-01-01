'use client'

import { useState, useEffect } from 'react'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_SUBCATEGORIES,
  COMMON_COLORS,
  SUGGESTED_FEATURES,
  SOURCING_PLATFORMS,
  STOCK_STATUS_OPTIONS,
  DELIVERY_OPTIONS,
  MARGIN_PRESETS,
  SERVICE_FEE_OPTIONS
} from '@/lib/product-constants'
import {
  Package,
  Sparkles,
  Truck,
  DollarSign,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Upload,
  Loader2,
  X,
  Plus
} from 'lucide-react'

type Product = {
  _id?: string
  name: string
  category?: string
  subcategory?: string
  description?: string
  tagline?: string
  price?: number
  baseCost?: number
  marginRate?: number
  currency?: string
  image?: string
  gallery?: string[]
  features?: string[]
  requiresQuote?: boolean
  deliveryDays?: number
  stockStatus?: 'in_stock' | 'preorder' | 'coming_soon'
  stockQuantity?: number
  leadTimeDays?: number
  weightKg?: number
  colorOptions?: string[]
  sourcing?: {
    platform?: string
    supplierName?: string
    productUrl?: string
  }
  isPublished?: boolean
  isFeatured?: boolean
  price1688?: number
  exchangeRate?: number
  serviceFeeRate?: number
}

interface ProductFormSimplifiedProps {
  product: Product
  onChange: (product: Product) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}

export default function ProductFormSimplified({
  product,
  onChange,
  onSave,
  onCancel,
  isNew = false
}: ProductFormSimplifiedProps) {
  const [activeSection, setActiveSection] = useState<string>('basic')
  const [customFeature, setCustomFeature] = useState('')
  const [uploading, setUploading] = useState(false)

  // Récupérer les features suggérées selon la catégorie
  const getSuggestedFeatures = () => {
    const categoryFeatures = SUGGESTED_FEATURES[product.category || ''] || []
    const defaultFeatures = SUGGESTED_FEATURES['default'] || []
    return [...new Set([...categoryFeatures, ...defaultFeatures])]
  }

  // Calculer le prix suggéré
  const calculateSuggestedPrice = () => {
    if (product.baseCost && product.marginRate) {
      return Math.round(product.baseCost * (1 + product.marginRate / 100))
    }
    return undefined
  }

  // Toggle une feature
  const toggleFeature = (feature: string) => {
    const current = product.features || []
    if (current.includes(feature)) {
      onChange({ ...product, features: current.filter(f => f !== feature) })
    } else {
      onChange({ ...product, features: [...current, feature] })
    }
  }

  // Toggle une couleur
  const toggleColor = (color: string) => {
    const current = product.colorOptions || []
    if (current.includes(color)) {
      onChange({ ...product, colorOptions: current.filter(c => c !== color) })
    } else {
      onChange({ ...product, colorOptions: [...current, color] })
    }
  }

  // Ajouter une feature personnalisée
  const addCustomFeature = () => {
    if (!customFeature.trim()) return
    const current = product.features || []
    if (!current.includes(customFeature.trim())) {
      onChange({ ...product, features: [...current, customFeature.trim()] })
    }
    setCustomFeature('')
  }

  // Upload image
  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        onChange({ ...product, image: data.url })
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  // Mettre à jour le prix basé sur 1688
  useEffect(() => {
    if (product.price1688 && product.exchangeRate) {
      const baseCost = product.price1688 * product.exchangeRate
      onChange({ ...product, baseCost })
    }
  }, [product.price1688, product.exchangeRate])

  const SectionHeader = ({ id, title, icon: Icon, isOpen }: { id: string; title: string; icon: any; isOpen: boolean }) => (
    <button
      type="button"
      onClick={() => setActiveSection(isOpen ? '' : id)}
      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
        isOpen 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
          : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <span className="font-medium">{title}</span>
      </div>
      {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Section 1: Informations de base */}
      <div>
        <SectionHeader 
          id="basic" 
          title="1. Informations de base" 
          icon={Package} 
          isOpen={activeSection === 'basic'} 
        />
        {activeSection === 'basic' && (
          <div className="mt-3 p-5 bg-white rounded-xl border border-gray-200 space-y-4">
            {/* Nom du produit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={product.name}
                onChange={e => onChange({ ...product, name: e.target.value })}
                placeholder="Ex: Caméra IP PTZ 4K Hikvision"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Catégorie - Sélection visuelle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRODUCT_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onChange({ ...product, category: cat.id, subcategory: undefined })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      product.category === cat.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-emerald-200 text-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sous-catégorie */}
            {product.category && PRODUCT_SUBCATEGORIES[product.category] && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de produit
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_SUBCATEGORIES[product.category].map(sub => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => onChange({ ...product, subcategory: sub })}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        product.subcategory === sub
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-emerald-100'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description courte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description courte (accroche)
              </label>
              <input
                type="text"
                value={product.tagline || ''}
                onChange={e => onChange({ ...product, tagline: e.target.value })}
                placeholder="Ex: Surveillance haute définition avec vision nocturne"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Options rapides */}
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={product.isPublished ?? true}
                  onChange={e => onChange({ ...product, isPublished: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Publier sur le site</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={product.isFeatured ?? false}
                  onChange={e => onChange({ ...product, isFeatured: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Mettre en avant</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Caractéristiques */}
      <div>
        <SectionHeader 
          id="features" 
          title="2. Caractéristiques & Couleurs" 
          icon={Sparkles} 
          isOpen={activeSection === 'features'} 
        />
        {activeSection === 'features' && (
          <div className="mt-3 p-5 bg-white rounded-xl border border-gray-200 space-y-5">
            {/* Points forts - Cases à cocher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points forts du produit (cochez les caractéristiques)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                {getSuggestedFeatures().map(feature => (
                  <label
                    key={feature}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      (product.features || []).includes(feature)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(product.features || []).includes(feature)}
                      onChange={() => toggleFeature(feature)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{feature}</span>
                  </label>
                ))}
              </div>
              
              {/* Ajouter une caractéristique personnalisée */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={customFeature}
                  onChange={e => setCustomFeature(e.target.value)}
                  placeholder="Ajouter une caractéristique personnalisée..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomFeature())}
                />
                <button
                  type="button"
                  onClick={addCustomFeature}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Caractéristiques sélectionnées */}
              {(product.features || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {(product.features || []).map(f => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs"
                    >
                      <Check className="h-3 w-3" />
                      {f}
                      <button
                        type="button"
                        onClick={() => toggleFeature(f)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Couleurs disponibles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleurs disponibles
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_COLORS.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => toggleColor(color.label)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      (product.colorOptions || []).includes(color.label)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-gray-300"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm">{color.label}</span>
                    {(product.colorOptions || []).includes(color.label) && (
                      <Check className="h-4 w-4 text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Prix et sourcing */}
      <div>
        <SectionHeader 
          id="pricing" 
          title="3. Prix & Sourcing" 
          icon={DollarSign} 
          isOpen={activeSection === 'pricing'} 
        />
        {activeSection === 'pricing' && (
          <div className="mt-3 p-5 bg-white rounded-xl border border-gray-200 space-y-5">
            {/* Source d'approvisionnement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source d'approvisionnement
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SOURCING_PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => onChange({ 
                      ...product, 
                      sourcing: { ...product.sourcing, platform: platform.id } 
                    })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      product.sourcing?.platform === platform.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="font-medium text-sm">{platform.label}</div>
                    <div className="text-xs text-gray-500">{platform.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prix 1688 (si sourcing Chine) */}
            {['1688', 'alibaba', 'aliexpress', 'taobao'].includes(product.sourcing?.platform || '') && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                <h4 className="font-medium text-blue-800">💰 Prix import Chine</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-blue-700 mb-1">Prix en Yuan (¥)</label>
                    <input
                      type="number"
                      value={product.price1688 || ''}
                      onChange={e => onChange({ ...product, price1688: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                      placeholder="Ex: 150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-blue-700 mb-1">Taux de change (1¥ = X FCFA)</label>
                    <input
                      type="number"
                      value={product.exchangeRate || 100}
                      onChange={e => onChange({ ...product, exchangeRate: Number(e.target.value) || 100 })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-blue-700 mb-1">Frais de service</label>
                  <div className="flex gap-2">
                    {SERVICE_FEE_OPTIONS.map(opt => (
                      <button
                        key={opt.rate}
                        type="button"
                        onClick={() => onChange({ ...product, serviceFeeRate: opt.rate })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                          product.serviceFeeRate === opt.rate
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {product.baseCost && (
                  <div className="text-sm text-blue-800 font-medium">
                    → Coût de revient calculé: {product.baseCost.toLocaleString('fr-FR')} FCFA
                  </div>
                )}
              </div>
            )}

            {/* Coût et marge */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coût de revient (FCFA)
                </label>
                <input
                  type="number"
                  value={product.baseCost || ''}
                  onChange={e => onChange({ ...product, baseCost: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  placeholder="Ex: 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix de vente (FCFA)
                </label>
                <input
                  type="number"
                  value={product.price || ''}
                  onChange={e => onChange({ ...product, price: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  placeholder="Ex: 75000"
                />
              </div>
            </div>

            {/* Presets de marge */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marge appliquée
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MARGIN_PRESETS.map(preset => (
                  <button
                    key={preset.rate}
                    type="button"
                    onClick={() => {
                      onChange({ ...product, marginRate: preset.rate })
                      if (product.baseCost) {
                        const price = Math.round(product.baseCost * (1 + preset.rate / 100))
                        onChange({ ...product, marginRate: preset.rate, price })
                      }
                    }}
                    className={`p-2 rounded-lg border-2 text-center transition-all ${
                      product.marginRate === preset.rate
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="text-lg font-bold text-emerald-600">{preset.rate}%</div>
                    <div className="text-xs text-gray-500">{preset.label.split('(')[0]}</div>
                  </button>
                ))}
              </div>
              {calculateSuggestedPrice() && (
                <p className="mt-2 text-sm text-emerald-600">
                  → Prix suggéré: <strong>{calculateSuggestedPrice()?.toLocaleString('fr-FR')} FCFA</strong>
                </p>
              )}
            </div>

            {/* Sur devis */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={product.requiresQuote ?? false}
                onChange={e => onChange({ ...product, requiresQuote: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600"
              />
              <span className="text-sm text-gray-700">Vente sur devis uniquement (masquer le prix)</span>
            </label>
          </div>
        )}
      </div>

      {/* Section 4: Disponibilité */}
      <div>
        <SectionHeader 
          id="availability" 
          title="4. Disponibilité & Livraison" 
          icon={Truck} 
          isOpen={activeSection === 'availability'} 
        />
        {activeSection === 'availability' && (
          <div className="mt-3 p-5 bg-white rounded-xl border border-gray-200 space-y-5">
            {/* Statut de stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut de disponibilité
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STOCK_STATUS_OPTIONS.map(status => (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => onChange({ ...product, stockStatus: status.id as any })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      product.stockStatus === status.id
                        ? `border-${status.color}-500 bg-${status.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    } ${product.stockStatus === status.id ? 'ring-2 ring-emerald-200' : ''}`}
                  >
                    <div className="font-medium">{status.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{status.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Délai de livraison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Délai de livraison estimé
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DELIVERY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...product, deliveryDays: opt.days, leadTimeDays: opt.days })}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      product.deliveryDays === opt.days
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="text-xl font-bold text-gray-800">{opt.days}j</div>
                    <div className="text-xs text-gray-500">{opt.label.split('(')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantité en stock */}
            {product.stockStatus === 'in_stock' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité en stock
                </label>
                <input
                  type="number"
                  value={product.stockQuantity || ''}
                  onChange={e => onChange({ ...product, stockQuantity: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg"
                  placeholder="Ex: 10"
                />
              </div>
            )}

            {/* Poids */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poids du produit (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={product.weightKg || ''}
                onChange={e => onChange({ ...product, weightKg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg"
                placeholder="Ex: 0.5"
              />
              <p className="text-xs text-gray-500 mt-1">Important pour calculer les frais de transport</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 5: Image */}
      <div>
        <SectionHeader 
          id="image" 
          title="5. Image du produit" 
          icon={ImageIcon} 
          isOpen={activeSection === 'image'} 
        />
        {activeSection === 'image' && (
          <div className="mt-3 p-5 bg-white rounded-xl border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Prévisualisation */}
              <div className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden flex-shrink-0">
                {product.image ? (
                  <img src={product.image} alt="Produit" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>

              {/* Options d'upload */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'image</label>
                  <input
                    type="text"
                    value={product.image || ''}
                    onChange={e => onChange({ ...product, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="text-center text-sm text-gray-500">ou</div>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Téléchargement...' : 'Télécharger une image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!product.name}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNew ? 'Créer le produit' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
