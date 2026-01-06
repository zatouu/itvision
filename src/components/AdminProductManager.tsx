'use client'

import React, { useEffect, useState, lazy, Suspense } from 'react'
import { Plus, Pencil, Trash2, Loader2, Search, Package, Truck, Settings, MapPin, Layers, Sparkles, Image as ImageIcon, Download, Upload, X, Calculator, TrendingUp, DollarSign, BarChart3 } from 'lucide-react'

// Éditeur de texte riche chargé dynamiquement
const RichTextEditor = lazy(() => import('./RichTextEditor'))
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import type { ShippingMethodId } from '@/lib/logistics'

type ShippingOverride = {
  methodId: string
  ratePerKg?: number
  ratePerM3?: number
  flatFee?: number
}

// Type pour les variantes de produit (style 1688)
type ProductVariant = {
  id: string
  name: string
  sku?: string
  image?: string
  price1688?: number
  priceFCFA?: number
  stock: number
  isDefault?: boolean
}

type ProductVariantGroup = {
  name: string
  variants: ProductVariant[]
}

type Product = {
  _id?: string
  name: string
  category?: string
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
  stockStatus?: 'in_stock' | 'preorder'
  stockQuantity?: number
  leadTimeDays?: number
  // Poids
  netWeightKg?: number // Poids net du produit
  weightKg?: number // Poids brut (legacy)
  grossWeightKg?: number // Poids brut avec emballage
  packagingWeightKg?: number // Poids de l'emballage
  // Dimensions
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  // Options (legacy)
  colorOptions?: string[]
  variantOptions?: string[]
  // Variantes avec prix et images (style 1688)
  variantGroups?: ProductVariantGroup[]
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

type ProductTab = 'info' | 'details' | 'media' | 'pricing' | 'variants' | 'import'

const ensureOverrides = (overrides?: ShippingOverride[]): ShippingOverride[] => {
  if (!Array.isArray(overrides)) return []
  return overrides.filter(o => o && typeof o.methodId === 'string')
}

// Composant de simulation de pricing source (import)
function PricingSimulator({ product }: { product: Product }) {
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>('air_express')
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [monthlyVolume, setMonthlyVolume] = useState(0)
  const [simulation, setSimulation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runSimulation = async () => {
    if (!product.price1688 && !product.baseCost) {
      alert('Veuillez renseigner le prix source ou le coût de base')
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
          Simulateur de Coût & Marge
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
    price: undefined, // Prix public direct (optionnel si baseCost ou price1688 défini)
    baseCost: undefined, // Coût d'achat fournisseur
    marginRate: 30, // Marge par défaut 30%
    currency: 'FCFA',
    image: '',
    gallery: [],
    features: [],
    requiresQuote: false, // Par défaut: afficher un prix (non sur devis)
    stockStatus: 'preorder',
    stockQuantity: 0,
    leadTimeDays: 15,
    deliveryDays: 15,
    // Poids
    netWeightKg: undefined,
    weightKg: undefined,
    grossWeightKg: undefined,
    packagingWeightKg: undefined,
    // Dimensions
    lengthCm: undefined,
    widthCm: undefined,
    heightCm: undefined,
    volumeM3: undefined,
    // Options (legacy)
    colorOptions: [],
    variantOptions: [],
    // Variantes avec prix et images
    variantGroups: [],
    availabilityNote: 'Import direct Chine avec livraison express (3j), aérien (15j) ou maritime (60j)',
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

  const tabs: { id: ProductTab; label: string; description: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Fiche produit', description: 'Nom, description, points clés', icon: Sparkles },
    { id: 'details', label: 'Détails & logistique', description: 'Poids, dimensions, disponibilité', icon: Layers },
    { id: 'media', label: 'Médias', description: 'Visuels et galerie', icon: ImageIcon },
    { id: 'variants', label: 'Variantes', description: 'Couleurs, options avec prix', icon: Settings },
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
      setSaveError(null)
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

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    if (!editing) return
    setSaveError(null)
    setSaving(true)
    
    try {
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
      
      const data = await res.json()
      
      if (!res.ok) {
        const errorMsg = data?.error || 'Erreur lors de la sauvegarde'
        setSaveError(errorMsg)
        return
      }
      
      setEditing(null)
      setAutoPrice(false)
      await refresh()
    } catch (error: any) {
      setSaveError(error?.message || 'Erreur réseau lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
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
    formData.append('type', 'products') // Type spécifique pour les produits
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include' // Important pour l'authentification
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      console.error('Erreur upload:', res.status, errorData)
      throw new Error(errorData.error || `Erreur ${res.status}`)
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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Description détaillée
              </label>
              <Suspense fallback={
                <div className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm h-[160px] flex items-center justify-center bg-gray-50">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              }>
                <RichTextEditor
                  value={editing.description || ''}
                  onChange={(html) => setEditing({ ...editing, description: html })}
                  placeholder="Décrivez le produit : caractéristiques, avantages, utilisations..."
                />
              </Suspense>
              <p className="mt-1 text-xs text-gray-400">
                Utilisez la barre d&apos;outils pour mettre en forme : gras, italique, listes, titres...
              </p>
            </div>
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
                <option value="aliexpress">Plateforme A</option>
                <option value="1688">Plateforme B</option>
                <option value="alibaba">Plateforme C</option>
                <option value="taobao">Plateforme D</option>
                <option value="factory">Fournisseur direct</option>
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
          <p className="text-xs text-gray-500 mt-1">Le poids brut est utilisé pour calculer les frais de transport</p>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-4">
            <label className="space-y-1">
              <span>Poids net (kg)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Sans emballage"
                value={editing.netWeightKg ?? ''}
                onChange={e => setEditing({ ...editing, netWeightKg: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1">
              <span>Poids brut (kg) *</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium"
                type="number"
                min="0"
                step="0.01"
                placeholder="Avec emballage"
                value={editing.grossWeightKg ?? editing.weightKg ?? ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : undefined
                  setEditing({ ...editing, grossWeightKg: val, weightKg: val })
                }}
              />
            </label>
            <label className="space-y-1">
              <span>Poids emballage (kg)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Auto-calculé"
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
                placeholder="Auto si dimensions"
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
          {/* Indicateur de validation du prix */}
          {!editing.requiresQuote && !editing.price && !editing.baseCost && !editing.price1688 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-medium">Prix requis</div>
                <div className="text-xs">Renseignez un prix (prix public, coût de base ou prix source) ou cochez "Sur devis" ci-dessous.</div>
              </div>
            </div>
          )}
          
          {/* Indicateur de prix valide */}
          {!editing.requiresQuote && (editing.price || editing.baseCost || editing.price1688) && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Prix affiché:</strong> {
                  editing.price 
                    ? formatCurrency(editing.price, editing.currency)
                    : editing.baseCost && editing.marginRate
                      ? formatCurrency(Math.round(editing.baseCost * (1 + (editing.marginRate || 25) / 100)), editing.currency)
                      : editing.price1688 && editing.exchangeRate
                        ? `Calculé depuis prix source: ${formatCurrency(Math.round(editing.price1688 * (editing.exchangeRate || 100) * (1 + (editing.marginRate || 25) / 100)), editing.currency)}`
                        : 'Sera calculé automatiquement'
                }
              </span>
            </div>
          )}
          
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!!editing.requiresQuote} 
                onChange={e => setEditing({ ...editing, requiresQuote: e.target.checked })} 
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="font-medium text-gray-900">Sur devis uniquement</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  À utiliser uniquement pour les produits spéciaux nécessitant une étude personnalisée (installations complexes, projets sur mesure).
                  La plupart des produits doivent avoir un prix affiché.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section Prix Source */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
            <DollarSign className="h-4 w-4" />
            Prix Source (Import)
          </div>
          <p className="text-xs text-gray-600 mt-1">Informations confidentielles - non visibles par le client</p>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
            <label className="space-y-1">
              <span>Prix source (¥ Yuan)</span>
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
              <p className="text-xs text-gray-500">Prix d'achat fournisseur en Yuan</p>
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
                  // Recalculer baseCost si prix source existe
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

  // Génère un ID unique pour les variantes
  const generateVariantId = () => `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // Ajoute un groupe de variantes
  const addVariantGroup = () => {
    if (!editing) return
    const newGroup: ProductVariantGroup = {
      name: 'Nouveau groupe',
      variants: [{
        id: generateVariantId(),
        name: 'Variante 1',
        stock: 0,
        isDefault: true
      }]
    }
    setEditing({
      ...editing,
      variantGroups: [...(editing.variantGroups || []), newGroup]
    })
  }

  // Supprime un groupe de variantes
  const removeVariantGroup = (groupIndex: number) => {
    if (!editing) return
    const groups = [...(editing.variantGroups || [])]
    groups.splice(groupIndex, 1)
    setEditing({ ...editing, variantGroups: groups })
  }

  // Met à jour le nom d'un groupe
  const updateVariantGroupName = (groupIndex: number, name: string) => {
    if (!editing) return
    const groups = [...(editing.variantGroups || [])]
    groups[groupIndex] = { ...groups[groupIndex], name }
    setEditing({ ...editing, variantGroups: groups })
  }

  // Ajoute une variante à un groupe
  const addVariant = (groupIndex: number) => {
    if (!editing) return
    const groups = [...(editing.variantGroups || [])]
    groups[groupIndex].variants.push({
      id: generateVariantId(),
      name: `Variante ${groups[groupIndex].variants.length + 1}`,
      stock: 0
    })
    setEditing({ ...editing, variantGroups: groups })
  }

  // Supprime une variante
  const removeVariant = (groupIndex: number, variantIndex: number) => {
    if (!editing) return
    const groups = [...(editing.variantGroups || [])]
    groups[groupIndex].variants.splice(variantIndex, 1)
    setEditing({ ...editing, variantGroups: groups })
  }

  // Met à jour une variante
  const updateVariant = (groupIndex: number, variantIndex: number, updates: Partial<ProductVariant>) => {
    if (!editing) return
    const groups = [...(editing.variantGroups || [])]
    groups[groupIndex].variants[variantIndex] = {
      ...groups[groupIndex].variants[variantIndex],
      ...updates
    }
    setEditing({ ...editing, variantGroups: groups })
  }

  const renderVariantsTab = () => {
    if (!editing) return null
    const exchangeRate = editing.exchangeRate || 100
    
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              <Settings className="h-4 w-4" />
              Variantes du produit (style 1688)
            </div>
            <button
              type="button"
              onClick={addVariantGroup}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Ajouter un groupe
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mb-4">
            Créez des variantes avec leurs prix et images spécifiques (ex: Couleur, Taille, Norme...). 
            Le prix en Yuan sera automatiquement converti en FCFA.
          </p>

          {(!editing.variantGroups || editing.variantGroups.length === 0) ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Aucune variante configurée</p>
              <p className="text-xs text-gray-400 mt-1">Cliquez sur "Ajouter un groupe" pour créer des variantes</p>
            </div>
          ) : (
            <div className="space-y-6">
              {editing.variantGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <input
                      type="text"
                      className="text-lg font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none px-1"
                      value={group.name}
                      onChange={e => updateVariantGroupName(groupIndex, e.target.value)}
                      placeholder="Nom du groupe (ex: Couleur)"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addVariant(groupIndex)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        + Variante
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVariantGroup(groupIndex)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Supprimer groupe
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {group.variants.map((variant, variantIndex) => (
                      <div key={variant.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                        {/* Image variante */}
                        <div className="w-16 h-16 flex-shrink-0">
                          {variant.image ? (
                            <img src={variant.image} alt={variant.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        
                        {/* Infos variante */}
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">Nom *</label>
                            <input
                              type="text"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                              value={variant.name}
                              onChange={e => updateVariant(groupIndex, variantIndex, { name: e.target.value })}
                              placeholder="Ex: Blanc US"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Prix (¥)</label>
                            <input
                              type="number"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                              value={variant.price1688 ?? ''}
                              onChange={e => {
                                const price1688 = e.target.value ? Number(e.target.value) : undefined
                                const priceFCFA = price1688 ? Math.round(price1688 * exchangeRate) : undefined
                                updateVariant(groupIndex, variantIndex, { price1688, priceFCFA })
                              }}
                              placeholder="57"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Prix FCFA</label>
                            <input
                              type="number"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-gray-50"
                              value={variant.priceFCFA ?? (variant.price1688 ? Math.round(variant.price1688 * exchangeRate) : '')}
                              readOnly
                              placeholder="Auto"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Stock</label>
                            <input
                              type="number"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                              value={variant.stock}
                              onChange={e => updateVariant(groupIndex, variantIndex, { stock: Number(e.target.value) || 0 })}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Image URL</label>
                            <input
                              type="text"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                              value={variant.image || ''}
                              onChange={e => updateVariant(groupIndex, variantIndex, { image: e.target.value })}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="radio"
                              name={`default-${groupIndex}`}
                              checked={variant.isDefault}
                              onChange={() => {
                                // Désélectionner toutes les autres variantes du groupe
                                const groups = [...(editing.variantGroups || [])]
                                groups[groupIndex].variants = groups[groupIndex].variants.map((v, i) => ({
                                  ...v,
                                  isDefault: i === variantIndex
                                }))
                                setEditing({ ...editing, variantGroups: groups })
                              }}
                            />
                            Défaut
                          </label>
                          <button
                            type="button"
                            onClick={() => removeVariant(groupIndex, variantIndex)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Résumé des variantes */}
        {editing.variantGroups && editing.variantGroups.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm font-semibold text-blue-800 mb-2">Résumé des variantes</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Groupes :</span>{' '}
                <strong>{editing.variantGroups.length}</strong>
              </div>
              <div>
                <span className="text-blue-600">Total variantes :</span>{' '}
                <strong>{editing.variantGroups.reduce((sum, g) => sum + g.variants.length, 0)}</strong>
              </div>
              <div>
                <span className="text-blue-600">Stock total :</span>{' '}
                <strong>{editing.variantGroups.reduce((sum, g) => sum + g.variants.reduce((s, v) => s + v.stock, 0), 0)}</strong>
              </div>
              <div>
                <span className="text-blue-600">Prix min/max :</span>{' '}
                <strong>
                  {(() => {
                    const prices = editing.variantGroups.flatMap(g => g.variants.map(v => v.price1688).filter(p => p !== undefined)) as number[]
                    if (prices.length === 0) return '-'
                    const min = Math.min(...prices)
                    const max = Math.max(...prices)
                    return min === max ? `¥${min}` : `¥${min} - ¥${max}`
                  })()}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return renderInfoTab()
      case 'details':
        return renderDetailsTab()
      case 'media':
        return renderMediaTab()
      case 'variants':
        return renderVariantsTab()
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

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-gray-900">{items.length}</div>
          <div className="text-xs text-gray-500">Produits total</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-emerald-600">
            {items.filter(p => p.price || p.baseCost || p.price1688).length}
          </div>
          <div className="text-xs text-gray-500">Avec prix</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-orange-600">
            {items.filter(p => p.requiresQuote).length}
          </div>
          <div className="text-xs text-gray-500">Sur devis</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-red-600">
            {items.filter(p => !p.requiresQuote && !p.price && !p.baseCost && !p.price1688).length}
          </div>
          <div className="text-xs text-gray-500">Prix manquants</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher par nom" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Catégorie" className="w-48 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={refresh} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">Filtrer</button>
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
                    <div className="flex items-start gap-2">
                      {product.image && (
                        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 line-clamp-1">{product.name}</div>
                        {product.tagline && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.tagline}</div>}
                        <div className="flex items-center gap-1 mt-1">
                          {product.isPublished !== false ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Publié</span>
                          ) : (
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Brouillon</span>
                          )}
                          {product.isFeatured && (
                            <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">⭐ Mis en avant</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">
                    <div className="text-sm">{product.category || '-'}</div>
                    <div className="text-xs text-gray-400 mt-1">{product.requiresQuote ? 'Sur devis' : 'Tarif direct'}</div>
                  </td>
                  <td className="p-3 text-gray-900">
                    {product.requiresQuote ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-medium">
                        Sur devis
                      </div>
                    ) : !product.price && !product.baseCost && !product.price1688 ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">
                        ⚠️ Prix manquant
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-emerald-600">{computedDisplayPrice(product)}</div>
                    )}
                    {typeof product.baseCost === 'number' && (
                      <div className="text-xs text-gray-500">Coût: {formatCurrency(product.baseCost, product.currency)}</div>
                    )}
                    {typeof product.price1688 === 'number' && (
                      <div className="text-xs text-blue-600">Source: ¥{product.price1688}</div>
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
            className="mx-auto w-full max-w-6xl rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  {editing._id ? 'Modifier le produit' : 'Créer un produit'}
                  {!editing._id && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
                      Workflow import & logistique
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500">Complétez chaque onglet pour finaliser la fiche produit.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-transparent p-1.5 text-gray-400 transition hover:border-gray-200 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-6 px-6 py-6 md:flex-row">
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
                {/* Message d'erreur de sauvegarde */}
                {saveError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                    <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium">Erreur de sauvegarde</div>
                      <div>{saveError}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    onClick={() => { setEditing(null); setSaveError(null) }}
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={onSave}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
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

