'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Search, Package, Truck, Settings, MapPin, Layers, Sparkles, Image as ImageIcon, Download, Upload, X, Calculator, TrendingUp, DollarSign, BarChart3, Zap } from 'lucide-react'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import type { ShippingMethodId } from '@/lib/logistics'
import ProductFormSimplified from '@/components/admin/ProductFormSimplified'
import { PRODUCT_CATEGORIES } from '@/lib/product-constants'

type ShippingOverride = {
  methodId: string
  ratePerKg?: number
  ratePerM3?: number
  flatFee?: number
}

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
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  packagingWeightKg?: number
  colorOptions?: string[]
  variantOptions?: string[]
  availabilityNote?: string
  sourcing?: {
    platform?: string
    supplierName?: string
    supplierContact?: string
    productUrl?: string
    notes?: string
  }
  shippingOverrides?: ShippingOverride[]
  isPublished?: boolean
  isFeatured?: boolean
  // Informations 1688
  price1688?: number // Prix en Yuan (¥)
  price1688Currency?: string // Devise 1688 (par défaut 'CNY')
  exchangeRate?: number // Taux de change (par défaut 1 ¥ = 100 FCFA)
  serviceFeeRate?: number // Frais de service (5%, 10%, 15%)
  insuranceRate?: number // Frais d'assurance (en %)
}

async function fetchProducts(q = '', category = '') {
  const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return (await res.json()).items as Product[]
}

const formatCurrency = (amount?: number, currency = 'FCFA') => {
  if (typeof amount !== 'number') return '-'
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

type ProductTab = 'info' | 'details' | 'media' | 'pricing' | 'import'

const ensureOverrides = (overrides?: ShippingOverride[]): ShippingOverride[] => {
  if (!Array.isArray(overrides)) return []
  return overrides.filter(o => o && typeof o.methodId === 'string')
}

// Composant de simulation de pricing 1688
function PricingSimulator({ product }: { product: Product }) {
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>('air_express')
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [monthlyVolume, setMonthlyVolume] = useState(0)
  const [simulation, setSimulation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runSimulation = async () => {
    if (!product.price1688 && !product.baseCost) {
      alert('Veuillez renseigner le prix 1688 ou le coût de base')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          price1688: product.price1688,
          baseCost: product.baseCost,
          exchangeRate: product.exchangeRate || 100,
          shippingMethod,
          weightKg: product.weightKg,
          volumeM3: product.volumeM3,
          serviceFeeRate: product.serviceFeeRate || 10,
          insuranceRate: product.insuranceRate || 0,
          orderQuantity,
          monthlyVolume: monthlyVolume || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la simulation')
      }

      const data = await response.json()
      setSimulation(data.simulation)
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la simulation')
    } finally {
      setLoading(false)
    }
  }

  if (!product.price1688 && !product.baseCost) {
    return null
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
          <Calculator className="h-4 w-4" />
          Simulateur de Pricing 1688
        </div>
        <button
          onClick={runSimulation}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Calcul...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Calculer
            </>
          )}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-3">
        <label className="space-y-1">
          <span>Méthode de transport</span>
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={shippingMethod}
            onChange={e => setShippingMethod(e.target.value as ShippingMethodId)}
          >
            <option value="air_express">Express (3 jours)</option>
            <option value="air_15">Fret aérien (6-10 jours)</option>
            <option value="sea_freight">Maritime (50-60 jours)</option>
          </select>
        </label>
        <label className="space-y-1">
          <span>Quantité commande</span>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            type="number"
            min="1"
            value={orderQuantity}
            onChange={e => setOrderQuantity(Number(e.target.value) || 1)}
          />
        </label>
        <label className="space-y-1">
          <span>Volume mensuel moyen (optionnel)</span>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            type="number"
            min="0"
            value={monthlyVolume}
            onChange={e => setMonthlyVolume(Number(e.target.value) || 0)}
          />
        </label>
      </div>

      {simulation && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Détail des coûts</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Coût produit:</span>
                <div className="font-semibold text-gray-800">{formatCurrency(simulation.breakdown.productCostFCFA)}</div>
              </div>
              <div>
                <span className="text-gray-500">Transport réel:</span>
                <div className="font-semibold text-gray-800">{formatCurrency(simulation.breakdown.shippingCostReal)}</div>
              </div>
              <div>
                <span className="text-gray-500">Frais service:</span>
                <div className="font-semibold text-gray-800">{formatCurrency(simulation.breakdown.serviceFee)}</div>
              </div>
              <div>
                <span className="text-gray-500">Frais assurance:</span>
                <div className="font-semibold text-gray-800">{formatCurrency(simulation.breakdown.insuranceFee)}</div>
              </div>
              <div className="col-span-2 border-t border-gray-200 pt-2">
                <span className="text-gray-500">Coût total réel:</span>
                <div className="text-lg font-bold text-red-600">{formatCurrency(simulation.breakdown.totalRealCost)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Prix client</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Transport déclaré:</span>
                <div className="font-semibold text-gray-800">{formatCurrency(simulation.breakdown.shippingCostClient)}</div>
              </div>
              <div>
                <span className="text-gray-500">Marge transport:</span>
                <div className="font-semibold text-green-600">+{formatCurrency(simulation.breakdown.shippingMargin)}</div>
              </div>
              <div className="col-span-2 border-t border-gray-200 pt-2">
                <span className="text-gray-500">Prix total facturé:</span>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(simulation.breakdown.totalClientPrice)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <TrendingUp className="h-4 w-4" />
              Marges & Projections
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Marge nette:</span>
                <div className={`text-lg font-bold ${simulation.breakdown.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(simulation.breakdown.netMargin)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">% de marge:</span>
                <div className={`text-lg font-bold ${simulation.breakdown.marginPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {simulation.breakdown.marginPercentage.toFixed(2)}%
                </div>
              </div>
              {simulation.breakdown.cumulativeMargin !== undefined && (
                <div>
                  <span className="text-gray-500">Marge cumulée ({orderQuantity} unités):</span>
                  <div className="font-semibold text-purple-600">{formatCurrency(simulation.breakdown.cumulativeMargin)}</div>
                </div>
              )}
              {simulation.breakdown.estimatedMonthlyProfit !== undefined && (
                <div>
                  <span className="text-gray-500">Bénéfice mensuel estimé:</span>
                  <div className="font-semibold text-purple-600">{formatCurrency(simulation.breakdown.estimatedMonthlyProfit)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminProductManager() {
  const empty: Product = {
    name: '',
    category: '',
    description: '',
    tagline: '',
    price: undefined,
    baseCost: undefined,
    marginRate: 25,
    currency: 'FCFA',
    image: '',
    gallery: [],
    features: [],
    requiresQuote: false,
    stockStatus: 'preorder',
    stockQuantity: 0,
    leadTimeDays: 15,
    deliveryDays: 15,
    weightKg: undefined,
    lengthCm: undefined,
    widthCm: undefined,
    heightCm: undefined,
    volumeM3: undefined,
    packagingWeightKg: undefined,
    colorOptions: [],
    variantOptions: [],
    availabilityNote: 'Commande import Chine (freight 3j / 15j / 60j)',
    sourcing: {},
    shippingOverrides: [],
    isPublished: true,
    isFeatured: false,
    // Informations 1688
    price1688: undefined,
    price1688Currency: 'CNY',
    exchangeRate: 100, // 1 ¥ = 100 FCFA
    serviceFeeRate: 10,
    insuranceRate: 0
  }

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [autoPrice, setAutoPrice] = useState(false)
  const [activeTab, setActiveTab] = useState<ProductTab>('info')
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [newGalleryInput, setNewGalleryInput] = useState('')
  const [useSimplifiedForm, setUseSimplifiedForm] = useState(true) // Nouveau: mode simplifié par défaut

  const tabs: { id: ProductTab; label: string; description: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Fiche produit', description: 'Nom, description, points clés', icon: Sparkles },
    { id: 'details', label: 'Détails & logistique', description: 'Dimensions, disponibilité, transport', icon: Layers },
    { id: 'media', label: 'Médias', description: 'Visuels et galerie', icon: ImageIcon },
    { id: 'pricing', label: 'Tarifs & livraison', description: 'Prix public, marges, transport', icon: Package },
    { id: 'import', label: 'Import express', description: 'Recherche AliExpress et import', icon: Download }
  ]

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await fetchProducts(query, category)
      setItems(result.map(item => ({
        ...item,
        gallery: item.gallery || [],
        features: item.features || [],
        colorOptions: item.colorOptions || [],
        variantOptions: item.variantOptions || [],
        shippingOverrides: ensureOverrides(item.shippingOverrides)
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!editing) {
      setActiveTab('info')
      setAutoPrice(false)
      setUploadingMain(false)
      setUploadingGallery(false)
      setNewGalleryInput('')
    }
  }, [editing])

  useEffect(() => {
    if (!autoPrice || !editing) return
    if (typeof editing.baseCost !== 'number') return
    const margin = typeof editing.marginRate === 'number' ? editing.marginRate : (empty.marginRate || 0)
    const computed = Math.round(editing.baseCost * (1 + margin / 100))
    if (editing.price === computed) return
    setEditing(prev => {
      if (!prev || !autoPrice) return prev
      if (typeof prev.baseCost !== 'number') return prev
      const marginPrev = typeof prev.marginRate === 'number' ? prev.marginRate : (empty.marginRate || 0)
      const recomputed = Math.round(prev.baseCost * (1 + marginPrev / 100))
      if (prev.price === recomputed) return prev
      return { ...prev, price: recomputed }
    })
  }, [autoPrice, editing?.baseCost, editing?.marginRate])

  const onSave = async () => {
    if (!editing) return
    const method = editing._id ? 'PATCH' : 'POST'
    const payload: Record<string, unknown> = {
      ...editing,
      gallery: (editing.gallery || []).filter(Boolean),
      features: (editing.features || []).filter(Boolean),
      colorOptions: (editing.colorOptions || []).map(option => option.trim()).filter(Boolean),
      variantOptions: (editing.variantOptions || []).map(option => option.trim()).filter(Boolean),
      shippingOverrides: ensureOverrides(editing.shippingOverrides).map(override => ({
        ...override,
        ratePerKg: override.ratePerKg ?? undefined,
        ratePerM3: override.ratePerM3 ?? undefined,
        flatFee: override.flatFee ?? undefined
      }))
    }
    if (editing._id) payload.id = editing._id

    const res = await fetch('/api/products', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) return alert('Erreur lors de la sauvegarde')
    setEditing(null)
    setAutoPrice(false)
    await refresh()
  }

  const onDelete = async (id?: string) => {
    if (!id) return
    if (!confirm('Supprimer ce produit ?')) return
    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
    if (!res.ok) return alert('Suppression échouée')
    await refresh()
  }

  const computedDisplayPrice = (product: Product) => {
    if (typeof product.price === 'number') return formatCurrency(product.price, product.currency)
    if (typeof product.baseCost === 'number') {
      const margin = typeof product.marginRate === 'number' ? product.marginRate : 25
      const sale = Math.round(product.baseCost * (1 + margin / 100))
      return formatCurrency(sale, product.currency)
    }
    return '-'
  }

  const suggestedSalePrice = (product: Product): number | undefined => {
    if (typeof product.baseCost !== 'number') return undefined
    const margin = typeof product.marginRate === 'number' ? product.marginRate : (empty.marginRate || 0)
    return Math.round(product.baseCost * (1 + margin / 100))
  }

  const suggestedPrice = editing ? suggestedSalePrice(editing) : undefined

  const handleImportedProduct = async (product: Product) => {
    setAutoPrice(false)
    setActiveTab('info')
    setEditing({
      ...empty,
      ...product,
      gallery: product.gallery || [],
      features: product.features || [],
      colorOptions: product.colorOptions || [],
      variantOptions: product.variantOptions || [],
      shippingOverrides: ensureOverrides(product.shippingOverrides),
      sourcing: product.sourcing || {}
    })
    await refresh()
  }

  const uploadMediaFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    if (!res.ok) {
      const message = await res.text().catch(() => '')
      throw new Error(message || 'Téléversement impossible')
    }
    const data = await res.json()
    const url = data?.url
    if (typeof url !== 'string') {
      throw new Error('Réponse inattendue du serveur')
    }
    return url
  }

  const handleMainImageUpload = async (file: File) => {
    if (!file) return
    try {
      setUploadingMain(true)
      const url = await uploadMediaFile(file)
      setEditing(prev => (prev
        ? {
            ...prev,
            image: url,
            gallery: prev.gallery && prev.gallery.length > 0 ? prev.gallery : [url]
          }
        : prev))
    } catch (error) {
      console.error('Upload image principale', error)
      alert('Téléversement de l’image impossible. Ajoutez une URL ou réessayez.')
    } finally {
      setUploadingMain(false)
    }
  }

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      setUploadingGallery(true)
      const uploads: string[] = []
      for (const file of Array.from(files)) {
        try {
          const url = await uploadMediaFile(file)
          uploads.push(url)
        } catch (error) {
          console.error('Upload galerie', error)
        }
      }
      if (uploads.length > 0) {
        setEditing(prev => (prev ? { ...prev, gallery: [...(prev.gallery || []), ...uploads] } : prev))
      }
    } catch (error) {
      console.error('Galerie import', error)
      alert('Impossible d’ajouter certains fichiers au moment du téléversement.')
    } finally {
      setUploadingGallery(false)
    }
  }

  const renderInfoTab = () => {
    if (!editing) return null
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <Sparkles className="h-4 w-4" />
            Fiche produit
          </div>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Nom du produit"
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Accroche / bénéfice principal"
              value={editing.tagline || ''}
              onChange={e => setEditing({ ...editing, tagline: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Catégorie (ex: Vidéosurveillance)"
              value={editing.category || ''}
              onChange={e => setEditing({ ...editing, category: e.target.value })}
            />
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="Description détaillée / argumentaire commercial"
              value={editing.description || ''}
              onChange={e => setEditing({ ...editing, description: e.target.value })}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={!!editing.isPublished} onChange={e => setEditing({ ...editing, isPublished: e.target.checked })} />
              Visible sur la boutique
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={!!editing.isFeatured} onChange={e => setEditing({ ...editing, isFeatured: e.target.checked })} />
              Mettre en avant
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <Layers className="h-4 w-4" />
            Points clés & options
          </div>
          <div className="mt-4 space-y-4 text-sm text-gray-700">
            <label className="space-y-1">
              <span>Points forts (1 par ligne)</span>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                rows={4}
                value={(editing.features || []).join('\n')}
                onChange={e => setEditing({
                  ...editing,
                  features: e.target.value.split(/\r?\n/).map(line => line.trim())
                })}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span>Options couleur (1 par ligne)</span>
                <textarea
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                  value={(editing.colorOptions || []).join('\n')}
                  onChange={e => setEditing({
                    ...editing,
                    colorOptions: e.target.value.split(/\r?\n/).map(line => line.trim())
                  })}
                />
              </label>
              <label className="space-y-1">
                <span>Variantes / conditionnements (1 par ligne)</span>
                <textarea
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                  value={(editing.variantOptions || []).join('\n')}
                  onChange={e => setEditing({
                    ...editing,
                    variantOptions: e.target.value.split(/\r?\n/).map(line => line.trim())
                  })}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <MapPin className="h-4 w-4" />
            Sourcing Chine & fournisseur
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
            <label className="space-y-1">
              <span>Plateforme</span>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={editing.sourcing?.platform || ''}
                onChange={e => setEditing({
                  ...editing,
                  sourcing: { ...editing.sourcing, platform: e.target.value || undefined }
                })}
              >
                <option value="">--</option>
                <option value="aliexpress">AliExpress</option>
                <option value="1688">1688</option>
                <option value="alibaba">Alibaba</option>
                <option value="taobao">Taobao</option>
                <option value="factory">Usine partenaire</option>
              </select>
            </label>
            <label className="space-y-1">
              <span>Fournisseur / contact</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={editing.sourcing?.supplierName || ''}
                onChange={e => setEditing({
                  ...editing,
                  sourcing: { ...editing.sourcing, supplierName: e.target.value || undefined }
                })}
              />
            </label>
            <label className="space-y-1">
              <span>Coordonnées (WeChat / téléphone)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={editing.sourcing?.supplierContact || ''}
                onChange={e => setEditing({
                  ...editing,
                  sourcing: { ...editing.sourcing, supplierContact: e.target.value || undefined }
                })}
              />
            </label>
            <label className="space-y-1">
              <span>Lien produit</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={editing.sourcing?.productUrl || ''}
                onChange={e => setEditing({
                  ...editing,
                  sourcing: { ...editing.sourcing, productUrl: e.target.value || undefined }
                })}
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span>Notes internes</span>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                rows={3}
                value={editing.sourcing?.notes || ''}
                onChange={e => setEditing({
                  ...editing,
                  sourcing: { ...editing.sourcing, notes: e.target.value || undefined }
                })}
              />
            </label>
          </div>
        </div>
      </div>
    )
  }

  const renderDetailsTab = () => {
    if (!editing) return null
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <Layers className="h-4 w-4" />
            Disponibilité & opérations
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
            <label className="space-y-1">
              <span>Statut de disponibilité</span>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={editing.stockStatus || 'preorder'}
                onChange={e => setEditing({ ...editing, stockStatus: e.target.value as Product['stockStatus'] })}
              >
                <option value="in_stock">Disponible à Dakar</option>
                <option value="preorder">Commande Chine</option>
              </select>
            </label>
            <label className="space-y-1">
              <span>Stock disponible (unités)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                value={editing.stockQuantity ?? ''}
                onChange={e => setEditing({ ...editing, stockQuantity: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Délai moyen côté Chine (jours)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                value={editing.leadTimeDays ?? ''}
                onChange={e => setEditing({ ...editing, leadTimeDays: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Promesse client (jours)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                value={editing.deliveryDays ?? ''}
                onChange={e => setEditing({ ...editing, deliveryDays: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <Truck className="h-4 w-4" />
            Poids & dimensions
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-3">
            <label className="space-y-1">
              <span>Poids net (kg)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                value={editing.weightKg ?? ''}
                onChange={e => setEditing({ ...editing, weightKg: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Poids avec emballage (kg)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                value={editing.packagingWeightKg ?? ''}
                onChange={e => setEditing({ ...editing, packagingWeightKg: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Volume (m³)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.001"
                value={editing.volumeM3 ?? ''}
                onChange={e => setEditing({ ...editing, volumeM3: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Longueur (cm)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.1"
                value={editing.lengthCm ?? ''}
                onChange={e => setEditing({ ...editing, lengthCm: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Largeur (cm)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.1"
                value={editing.widthCm ?? ''}
                onChange={e => setEditing({ ...editing, widthCm: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Hauteur (cm)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.1"
                value={editing.heightCm ?? ''}
                onChange={e => setEditing({ ...editing, heightCm: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <MapPin className="h-4 w-4" />
            Message logistique & disponibilité
          </div>
          <textarea
            className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Ex: Import Chine (freight 3j / 15j / 60j). Stock à Dakar sous 48h."
            value={editing.availabilityNote || ''}
            onChange={e => setEditing({ ...editing, availabilityNote: e.target.value })}
          />
        </div>
      </div>
    )
  }

  const renderMediaTab = () => {
    if (!editing) return null
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <ImageIcon className="h-4 w-4" />
            Image principale
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row">
            <div className="w-full overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50 lg:w-56">
              {editing.image ? (
                <img src={editing.image} alt={editing.name || 'Visuel produit'} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center text-xs text-gray-400">Prévisualisation</div>
              )}
            </div>
            <div className="flex-1 space-y-3 text-sm text-gray-700">
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="https://..."
                value={editing.image || ''}
                onChange={e => setEditing({ ...editing, image: e.target.value })}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50">
                  <Upload className="h-4 w-4" />
                  <span>Téléverser depuis l’ordinateur</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleMainImageUpload(file)
                    }}
                    disabled={uploadingMain}
                  />
                </label>
                {uploadingMain && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <ImageIcon className="h-4 w-4" />
            Galerie & médias secondaires
          </div>
          <div className="mt-4 space-y-4 text-sm text-gray-700">
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="Une URL par ligne"
              value={(editing.gallery || []).join('\n')}
              onChange={e => setEditing({
                ...editing,
                gallery: e.target.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
              })}
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Ajouter une URL (https://...)"
                value={newGalleryInput}
                onChange={e => setNewGalleryInput(e.target.value)}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                onClick={() => {
                  if (!newGalleryInput.trim()) return
                  setEditing(prev => (prev ? { ...prev, gallery: [...(prev.gallery || []), newGalleryInput.trim()] } : prev))
                  setNewGalleryInput('')
                }}
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50">
              <Upload className="h-4 w-4" />
              <span>Importer des images (JPG / PNG)</span>
              <input type="file" className="hidden" multiple accept="image/*" onChange={e => handleGalleryUpload(e.target.files)} disabled={uploadingGallery} />
            </label>
            {uploadingGallery && (
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Téléversement en cours...
              </p>
            )}
            {(editing.gallery?.length ?? 0) > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {editing.gallery?.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border border-gray-200">
                    <img src={url} alt={`Galerie ${index + 1}`} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-2 top-2 hidden rounded-full bg-black/60 p-1 text-white transition group-hover:flex"
                      onClick={() => setEditing(prev => (prev
                        ? { ...prev, gallery: (prev.gallery || []).filter((_, idx) => idx !== index) }
                        : prev))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderPricingTab = () => {
    if (!editing) return null
    const shippingOverrides = ensureOverrides(editing.shippingOverrides)
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <Package className="h-4 w-4" />
            Tarification & marges
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
            <label className="space-y-1">
              <span>Prix public (FCFA)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                value={editing.price ?? ''}
                onChange={e => {
                  setAutoPrice(false)
                  setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : undefined })
                }}
              />
            </label>
            <label className="space-y-1">
              <span>Coût fournisseur (FCFA)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                value={editing.baseCost ?? ''}
                onChange={e => setEditing({ ...editing, baseCost: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Marge cible (%)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                value={editing.marginRate ?? ''}
                onChange={e => setEditing({ ...editing, marginRate: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Devise</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={editing.currency || 'FCFA'}
                onChange={e => setEditing({ ...editing, currency: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoPrice}
                onChange={e => {
                  const checked = e.target.checked
                  setAutoPrice(checked)
                  if (checked && editing) {
                    const computed = suggestedSalePrice(editing)
                    if (typeof computed === 'number') {
                      setEditing(prev => (prev ? { ...prev, price: computed } : prev))
                    }
                  }
                }}
              />
              Calcul automatique du prix public (coût + marge)
            </label>
            {autoPrice && typeof suggestedPrice === 'number' && (
              <span className="text-sm font-semibold text-emerald-600">
                Suggestion: {formatCurrency(suggestedPrice, editing.currency)}
              </span>
            )}
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!editing.requiresQuote} onChange={e => setEditing({ ...editing, requiresQuote: e.target.checked })} />
            Sur devis uniquement (désactive l'achat direct)
          </label>
        </div>

        {/* Section 1688 */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
            <DollarSign className="h-4 w-4" />
            Informations 1688 (Import Chine)
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
            <label className="space-y-1">
              <span>Prix 1688 (¥ Yuan)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                step="0.01"
                value={editing.price1688 ?? ''}
                onChange={e => {
                  const value = e.target.value ? Number(e.target.value) : undefined
                  setEditing({ ...editing, price1688: value })
                  // Calcul automatique du baseCost si exchangeRate est défini
                  if (value && editing.exchangeRate) {
                    const calculatedBaseCost = value * editing.exchangeRate
                    setEditing(prev => ({ ...prev, baseCost: calculatedBaseCost }))
                  }
                }}
              />
              <p className="text-xs text-gray-500">Prix d'achat sur 1688 en Yuan</p>
            </label>
            <label className="space-y-1">
              <span>Taux de change (1 ¥ = X FCFA)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                value={editing.exchangeRate ?? 100}
                onChange={e => {
                  const value = e.target.value ? Number(e.target.value) : 100
                  setEditing({ ...editing, exchangeRate: value })
                  // Recalculer baseCost si price1688 existe
                  if (editing.price1688 && value) {
                    const calculatedBaseCost = editing.price1688 * value
                    setEditing(prev => ({ ...prev, baseCost: calculatedBaseCost }))
                  }
                }}
              />
              <p className="text-xs text-gray-500">Par défaut: 1 ¥ = 100 FCFA</p>
            </label>
            <label className="space-y-1">
              <span>Frais de service (%)</span>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={editing.serviceFeeRate ?? 10}
                onChange={e => setEditing({ ...editing, serviceFeeRate: Number(e.target.value) })}
              >
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={15}>15%</option>
              </select>
            </label>
            <label className="space-y-1">
              <span>Frais d'assurance (%)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                step="0.1"
                min="0"
                value={editing.insuranceRate ?? 0}
                onChange={e => setEditing({ ...editing, insuranceRate: e.target.value ? Number(e.target.value) : 0 })}
              />
              <p className="text-xs text-gray-500">Pourcentage sur coût total</p>
            </label>
          </div>
          {editing.price1688 && editing.exchangeRate && (
            <div className="mt-4 rounded-lg bg-white p-3 text-xs text-gray-600">
              <strong>Coût produit calculé:</strong> {formatCurrency((editing.price1688 || 0) * (editing.exchangeRate || 100), 'FCFA')}
            </div>
          )}
        </div>

        {/* Simulateur de pricing */}
        <PricingSimulator product={editing} />

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <Settings className="h-4 w-4" />
            Paramètres transport & disponibilité
          </div>
          <p className="mt-2 text-xs text-gray-500">Ajustez les tarifs personnalisés par mode transport pour ce produit.</p>
          <div className="mt-4 space-y-4">
            {Object.values(BASE_SHIPPING_RATES).map(method => {
              const override = shippingOverrides.find(o => o.methodId === method.id)
              return (
                <div key={method.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-inner">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{method.label}</div>
                      <div className="text-xs text-gray-500">{method.description}</div>
                    </div>
                    <div className="text-[11px] uppercase text-gray-400">
                      Base: {method.billing === 'per_kg' ? `${method.rate.toLocaleString()} FCFA/kg` : `${method.rate.toLocaleString()} FCFA/m³`}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3">
                    {method.billing === 'per_kg' && (
                      <label className="space-y-1">
                        <span>Tarif personnalisé (FCFA/kg)</span>
                        <input
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          type="number"
                          value={override?.ratePerKg ?? ''}
                          onChange={e => {
                            const value = e.target.value ? Number(e.target.value) : undefined
                            setEditing(prev => {
                              if (!prev) return prev
                              const overrides = ensureOverrides(prev.shippingOverrides)
                              const index = overrides.findIndex(o => o.methodId === method.id)
                              if (index >= 0) overrides[index] = { ...overrides[index], ratePerKg: value }
                              else overrides.push({ methodId: method.id, ratePerKg: value })
                              return { ...prev, shippingOverrides: overrides }
                            })
                          }}
                        />
                      </label>
                    )}
                    {method.billing === 'per_cubic_meter' && (
                      <label className="space-y-1">
                        <span>Tarif personnalisé (FCFA/m³)</span>
                        <input
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          type="number"
                          value={override?.ratePerM3 ?? ''}
                          onChange={e => {
                            const value = e.target.value ? Number(e.target.value) : undefined
                            setEditing(prev => {
                              if (!prev) return prev
                              const overrides = ensureOverrides(prev.shippingOverrides)
                              const index = overrides.findIndex(o => o.methodId === method.id)
                              if (index >= 0) overrides[index] = { ...overrides[index], ratePerM3: value }
                              else overrides.push({ methodId: method.id, ratePerM3: value })
                              return { ...prev, shippingOverrides: overrides }
                            })
                          }}
                        />
                      </label>
                    )}
                    <label className="space-y-1">
                      <span>Supplément fixe (FCFA)</span>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        type="number"
                        value={override?.flatFee ?? ''}
                        onChange={e => {
                          const value = e.target.value ? Number(e.target.value) : undefined
                          setEditing(prev => {
                            if (!prev) return prev
                            const overrides = ensureOverrides(prev.shippingOverrides)
                            const index = overrides.findIndex(o => o.methodId === method.id)
                            if (index >= 0) overrides[index] = { ...overrides[index], flatFee: value }
                            else overrides.push({ methodId: method.id, flatFee: value })
                            return { ...prev, shippingOverrides: overrides }
                          })
                        }}
                      />
                    </label>
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        onClick={() => setEditing(prev => {
                          if (!prev) return prev
                          return {
                            ...prev,
                            shippingOverrides: ensureOverrides(prev.shippingOverrides).filter(o => o.methodId !== method.id)
                          }
                        })}
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderImportTab = () => (
    <ImportTab onImported={handleImportedProduct} formatCurrency={formatCurrency} />
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return renderInfoTab()
      case 'details':
        return renderDetailsTab()
      case 'media':
        return renderMediaTab()
      case 'pricing':
        return renderPricingTab()
      case 'import':
        return renderImportTab()
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Produits</h1>
          <p className="text-sm text-gray-500">Pilotez votre sourcing Chine & vos tarifs transport depuis une seule interface.</p>
        </div>
        <button onClick={() => { setAutoPrice(true); setActiveTab('info'); setEditing({ ...empty }) }} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm">
          <Plus className="h-4 w-4" /> Nouveau produit
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher par nom" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
        <select 
          value={category} 
          onChange={e => setCategory(e.target.value)} 
          className="w-48 border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Toutes catégories</option>
          {PRODUCT_CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
          ))}
        </select>
        <button onClick={refresh} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition">
          Filtrer
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Produit</th>
              <th className="text-left p-3">Catégorie</th>
              <th className="text-left p-3">Tarif</th>
              <th className="text-left p-3">Disponibilité</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500"><Loader2 className="h-4 w-4 inline animate-spin" /> Chargement...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Aucun produit</td></tr>
            ) : (
              items.map(product => (
                <tr key={product._id} className="border-t">
                  <td className="p-3">
                    <div className="font-semibold text-gray-900">{product.name}</div>
                    {product.tagline && <div className="text-xs text-gray-500 mt-0.5">{product.tagline}</div>}
                  </td>
                  <td className="p-3 text-gray-600">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span>{PRODUCT_CATEGORIES.find(c => c.id === product.category)?.icon || '📦'}</span>
                      <span>{PRODUCT_CATEGORIES.find(c => c.id === product.category)?.label || product.category || '-'}</span>
                    </div>
                    {product.subcategory && <div className="text-xs text-gray-400 mt-0.5">{product.subcategory}</div>}
                    <div className="text-xs text-gray-400 mt-1">{product.requiresQuote ? 'Sur devis' : 'Tarif direct'}</div>
                  </td>
                  <td className="p-3 text-gray-900">
                    <div className="text-sm font-semibold text-emerald-600">{computedDisplayPrice(product)}</div>
                    {typeof product.baseCost === 'number' && (
                      <div className="text-xs text-gray-500">Coût: {formatCurrency(product.baseCost, product.currency)}</div>
                    )}
                    {typeof product.marginRate === 'number' && (
                      <div className="text-xs text-gray-400">Marge: {product.marginRate}%</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${product.stockStatus === 'in_stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      <Package className="h-3.5 w-3.5" /> {product.stockStatus === 'in_stock' ? 'Stock Dakar' : 'Commande Chine'}
                    </div>
                    {typeof product.leadTimeDays === 'number' && (
                      <div className="text-xs text-gray-500 mt-1">{product.leadTimeDays} jours estimés</div>
                    )}
                    {product.weightKg && <div className="text-xs text-gray-400 mt-1">{product.weightKg} kg</div>}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border mr-2"
                      onClick={() => {
                        setAutoPrice(false)
                        setActiveTab('info')
                        setEditing({
                          ...empty,
                          ...product,
                          gallery: product.gallery || [],
                          features: product.features || [],
                          colorOptions: product.colorOptions || [],
                          variantOptions: product.variantOptions || [],
                          shippingOverrides: ensureOverrides(product.shippingOverrides),
                          sourcing: product.sourcing || {}
                        })
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Éditer
                    </button>
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded border text-red-600" onClick={() => onDelete(product._id)}><Trash2 className="h-4 w-4" /> Supprimer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 px-4 py-8 overflow-y-auto"
          onClick={() => setEditing(null)}
        >
          <div
            className="mx-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  {editing._id ? 'Modifier le produit' : 'Créer un produit'}
                  {!editing._id && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
                      Ajout rapide
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500">
                  {useSimplifiedForm 
                    ? 'Remplissez les sections pour ajouter votre produit rapidement.' 
                    : 'Mode avancé avec tous les détails techniques.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle mode simplifié / avancé */}
                <button
                  type="button"
                  onClick={() => setUseSimplifiedForm(!useSimplifiedForm)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    useSimplifiedForm 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  {useSimplifiedForm ? 'Mode simplifié' : 'Mode avancé'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-transparent p-1.5 text-gray-400 transition hover:border-gray-200 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Contenu du formulaire */}
            <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
              {useSimplifiedForm ? (
                <ProductFormSimplified
                  product={editing}
                  onChange={setEditing}
                  onSave={onSave}
                  onCancel={() => setEditing(null)}
                  isNew={!editing._id}
                />
              ) : (
                /* Mode avancé - Ancien formulaire avec onglets */
                <div className="flex flex-col gap-6 md:flex-row">
                  <nav className="flex flex-wrap gap-3 md:w-64 md:flex-col">
                    {tabs.map(tab => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 md:flex-none inline-flex items-start gap-3 rounded-xl border px-3 py-2 text-left transition ${
                            isActive
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                              : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/60'
                          }`}
                        >
                          <Icon className={`mt-0.5 h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                          <div>
                            <div className="text-sm font-semibold">{tab.label}</div>
                            <div className="text-xs text-gray-500">{tab.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </nav>
                  <div className="flex-1 space-y-6">
                    {renderTabContent()}
                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        onClick={() => setEditing(null)}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        onClick={onSave}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type ImportPreview = {
  productId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  baseCost?: number
  price?: number
  currency: string
  weightKg?: number
  features: string[]
  category: string
  tagline: string
  availabilityNote: string
  shopName?: string
  orders?: number
  totalRated?: number
}

type ImportTabProps = {
  onImported: (product: Product) => Promise<void> | void
  formatCurrency: (amount?: number, currency?: string) => string
}

function ImportTab({ onImported, formatCurrency }: ImportTabProps) {
  const [keyword, setKeyword] = useState('')
  const [limit, setLimit] = useState(6)
  const [results, setResults] = useState<ImportPreview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!keyword.trim()) {
      setError('Saisissez un mot-clé pour lancer la recherche.')
      return
    }
    setLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const params = new URLSearchParams({ keyword: keyword.trim(), limit: String(limit) })
      const res = await fetch(`/api/products/import?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Recherche impossible')
      }
      const data = await res.json()
      setResults(Array.isArray(data.items) ? data.items : [])
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la recherche AliExpress.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (item: ImportPreview) => {
    setImportingId(item.productId || item.productUrl)
    setError(null)
    setFeedback(null)
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Import impossible')
      }
      const data = await res.json()
      const product = data?.product
      if (product) {
        setFeedback(data?.action === 'updated' ? 'Produit mis à jour depuis AliExpress.' : 'Produit importé avec succès.')
        await onImported(product)
      } else {
        setFeedback('Import terminé. Vérifiez la liste des produits.')
      }
    } catch (err: any) {
      setError(err?.message || 'Impossible d’importer ce produit pour le moment.')
    } finally {
      setImportingId(null)
    }
  }

  const hasResults = results.length > 0

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">Importer depuis AliExpress</h4>
        <p className="text-sm text-gray-500">
          Recherchez un mot-clé (ex: « hikvision », « caméra PTZ ») pour alimenter le catalogue automatiquement.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          placeholder="Mot-clé AliExpress"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-28"
          type="number"
          min={1}
          max={12}
          value={limit}
          onChange={e => setLimit(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Chercher
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</div>
      )}

      {loading && !hasResults ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Recherche des meilleures offres AliExpress…
        </div>
      ) : null}

      {hasResults ? (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map(item => {
            const cardId = item.productId || item.productUrl
            const isImporting = importingId === cardId
            return (
              <div key={cardId} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="h-20 w-20 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] text-gray-400">Visuel indisponible</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.shopName || 'Fournisseur AliExpress'}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {typeof item.baseCost === 'number' && (
                        <span>Coût: {formatCurrency(item.baseCost, item.currency)}</span>
                      )}
                      {typeof item.price === 'number' && (
                        <span className="font-semibold text-emerald-600">
                          Prix conseillé: {formatCurrency(item.price, item.currency)}
                        </span>
                      )}
                      {item.weightKg && <span>{item.weightKg} kg</span>}
                      {item.orders && <span>{item.orders.toLocaleString()} commandes</span>}
                    </div>
                  </div>
                </div>
                {item.features.length > 0 && (
                  <ul className="grid list-disc gap-1 pl-5 text-xs text-gray-500">
                    {item.features.slice(0, 4).map((feature, idx) => (
                      <li key={`${cardId}-feature-${idx}`}>{feature}</li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => handleImport(item)}
                  disabled={isImporting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isImporting ? 'Import en cours…' : 'Importer ce produit'}
                </button>
                <a
                  href={item.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Voir la fiche AliExpress ↗
                </a>
              </div>
            )
          })}
        </div>
      ) : !loading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          Lancez une recherche pour pré-remplir automatiquement la fiche produit.
        </div>
      ) : null}
    </div>
  )
}

