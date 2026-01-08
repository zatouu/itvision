'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  FileDown,
  Loader2,
  MessageCircle,
  Plane,
  Share2,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Wrench,
  X,
  ZoomIn,
  Heart,
  Package,
  TruckIcon,
  Info,
  Megaphone,
  Users,
  TrendingDown
} from 'lucide-react'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import type { ShippingOptionPricing } from '@/lib/logistics'
import { trackEvent } from '@/utils/analytics'
// Note: Les informations de prix source ne sont pas exposées au client

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

interface ProductDimensions {
  lengthCm: number
  widthCm: number
  heightCm: number
}

// Type pour les variantes de produit
export interface ProductVariant {
  id: string
  name: string
  sku?: string
  image?: string
  price1688?: number
  priceFCFA?: number
  stock: number
  isDefault?: boolean
}

export interface ProductVariantGroup {
  name: string
  variants: ProductVariant[]
}

// Type pour les poids
export interface ProductWeights {
  netWeightKg: number | null // Poids net
  grossWeightKg: number | null // Poids brut avec emballage
  packagingWeightKg: number | null // Poids emballage seul
}

export interface ProductDetailData {
  id: string
  name: string
  tagline?: string | null
  description?: string | null
  category?: string | null
  image?: string | null
  gallery: string[]
  features: string[]
  colorOptions: string[]
  variantOptions: string[]
  // Variantes avec prix et images (style 1688)
  variantGroups?: ProductVariantGroup[]
  requiresQuote: boolean
  currency?: string | null
  pricing: {
    baseCost: number | null
    marginRate: number
    salePrice: number | null
    currency: string
    shippingOptions: ShippingOptionPricing[]
    availabilityLabel: string
    availabilitySubLabel?: string
    fees?: {
      serviceFeeRate: number
      serviceFeeAmount: number
      insuranceRate: number
      insuranceAmount: number
    }
    totalWithFees?: number | null
  }
  availability: {
    status: 'in_stock' | 'preorder' | string
    label: string
    note?: string | null
    stockQuantity: number
    leadTimeDays: number | null
  }
  logistics: {
    weightKg: number | null
    packagingWeightKg: number | null
    volumeM3: number | null
    dimensions: ProductDimensions | null
  }
  // Poids détaillés
  weights?: ProductWeights
  isImported?: boolean // Indicateur si produit importé (sans exposer les détails source)
  // Configuration achat groupé
  groupBuyEnabled?: boolean
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  priceTiers?: Array<{
    minQty: number
    maxQty?: number
    price: number
    discount?: number
  }>
}

export interface SimilarProductSummary {
  id: string
  name: string
  tagline?: string | null
  category?: string | null
  image?: string | null
  priceAmount?: number | null
  currency?: string | null
  requiresQuote: boolean
  availabilityStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  availabilityLabel?: string
  shippingOptions: ShippingOptionPricing[]
  deliveryDays?: number | null
}

interface ProductDetailExperienceProps {
  product: ProductDetailData
  similar: SimilarProductSummary[]
}

type InfoTab = 'description' | 'features' | 'logistics' | 'support' | 'reviews'

const shippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  if (methodId.includes('truck')) return Truck
  return Plane
}

export default function ProductDetailExperience({ product, similar }: ProductDetailExperienceProps) {
  // Galerie : images produit + images variantes
  const baseGallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image || '/file.svg']
  
  // Fonction pour trouver l'option de 15 jours par défaut
  const getDefaultShippingOption = () => {
    if (product.pricing.shippingOptions.length === 0) return null
    // Chercher l'option de 15 jours en priorité
    const option15j = product.pricing.shippingOptions.find(opt => opt.durationDays === 15)
    if (option15j) return option15j.id
    // Sinon, prendre la première option disponible
    return product.pricing.shippingOptions[0]?.id ?? null
  }
  
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(getDefaultShippingOption())
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colorOptions.filter(Boolean)[0] ?? null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(product.variantOptions.filter(Boolean)[0] ?? null)
  // Variantes avec prix (style 1688) - Map: groupName -> variantId
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    product.variantGroups?.forEach(group => {
      const defaultVar = group.variants.find(v => v.isDefault) || group.variants[0]
      if (defaultVar) initial[group.name] = defaultVar.id
    })
    return initial
  })

  // Construire la galerie avec l'image de la variante sélectionnée au début
  const gallery = useMemo(() => {
    const variantImage = 
      product.variantGroups
        ?.flatMap(g => g.variants)
        .find(v => Object.values(selectedVariants).includes(v.id))?.image
    
    if (variantImage && !baseGallery.includes(variantImage)) {
      return [variantImage, ...baseGallery]
    }
    return baseGallery
  }, [selectedVariants, product.variantGroups, baseGallery])
  const [quantity, setQuantity] = useState(1)
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    product.variantGroups?.forEach(group => group.variants.forEach(v => { map[v.id] = 0 }))
    return map
  })
  const [adding, setAdding] = useState(false)
  const [showNegotiation, setShowNegotiation] = useState(false)
  const [negotiationMessage, setNegotiationMessage] = useState('Bonjour, je souhaite discuter du tarif et des délais pour ce produit.')
  const [negotiationStatus, setNegotiationStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<InfoTab>('description')
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [averageRating, setAverageRating] = useState(4.7)
  const [wantsInstallation, setWantsInstallation] = useState(true)
  const [installationForm, setInstallationForm] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    preferredDate: '',
    includeMaterials: true,
    notes: ''
  })
  const [installationStatus, setInstallationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [installationError, setInstallationError] = useState<string | null>(null)
  const [installationSuccessId, setInstallationSuccessId] = useState<string | null>(null)

  const shippingEnabled = product.pricing.shippingOptions.length > 0 && product.availability.status !== 'in_stock'

  // Calcul du prix et de l'image basés sur les variantes sélectionnées
  const selectedVariantDetails = useMemo(() => {
    if (!product.variantGroups || product.variantGroups.length === 0) {
      return { 
        totalVariantPrice: null, 
        variantImage: null,
        totalStock: product.availability.stockQuantity,
        selectedItems: []
      }
    }

    const selectedItems: { groupName: string; variant: ProductVariant }[] = []
    let totalVariantPrice = 0
    let hasPrice = false
    let variantImage: string | null = null
    let totalStock = 0

    for (const group of product.variantGroups) {
      const selectedId = selectedVariants[group.name]
      const selectedVar = group.variants.find(v => v.id === selectedId)
      
      if (selectedVar) {
        selectedItems.push({ groupName: group.name, variant: selectedVar })
        
        // Utiliser l'image de la variante si disponible
        if (selectedVar.image && !variantImage) {
          variantImage = selectedVar.image
        }
        
        // Additionner les prix des variantes (en FCFA)
        if (selectedVar.priceFCFA !== undefined && selectedVar.priceFCFA > 0) {
          totalVariantPrice += selectedVar.priceFCFA
          hasPrice = true
        }
        
        // Utiliser le stock de la variante
        totalStock = Math.min(totalStock === 0 ? selectedVar.stock : totalStock, selectedVar.stock)
      }
    }

    return {
      totalVariantPrice: hasPrice ? totalVariantPrice : null,
      variantImage,
      totalStock,
      selectedItems
    }
  }, [product.variantGroups, selectedVariants, product.availability.stockQuantity])

  // Prix effectif : prix variante ou prix standard.
  // Pour les produits importés, préférer le `totalWithFees` (coût fournisseur + frais)
  // afin d'afficher un prix client clair (hors transport) — sinon utiliser `salePrice`.
  const effectivePrice = selectedVariantDetails.totalVariantPrice ?? (product.pricing.totalWithFees ?? product.pricing.salePrice)

  useEffect(() => {
    if (!shippingEnabled) {
      setSelectedShippingId(null)
      return
    }
    // Si l'option sélectionnée n'existe plus, ou si aucune option n'est sélectionnée
    if (!selectedShippingId || !product.pricing.shippingOptions.find((option) => option.id === selectedShippingId)) {
      // Prioriser l'option de 15 jours, sinon prendre la première disponible
      const defaultOption = getDefaultShippingOption()
      setSelectedShippingId(defaultOption)
    }
  }, [shippingEnabled, selectedShippingId, product.pricing.shippingOptions])

  const activeShipping = shippingEnabled && selectedShippingId
    ? product.pricing.shippingOptions.find((option) => option.id === selectedShippingId) || null
    : null

  // Prix unitaire (exclut le transport) : le prix affiché sur la page produit doit être le prix produit (sourcing + frais).
  const basePrice = effectivePrice ?? product.pricing.salePrice
  const unitPrice = !product.requiresQuote ? basePrice : null

  // Calcul du nombre total d'unités sélectionnées via les variantes
  const totalVariantQuantity = useMemo(() => {
    return Object.values(variantQuantities || {}).reduce((sum, q) => sum + q, 0)
  }, [variantQuantities])

  const variantSubtotal = useMemo(() => {
    const entries = Object.entries(variantQuantities || {}).filter(([, q]) => q > 0)
    if (entries.length === 0) return 0
    let sum = 0
    for (const [variantId, qty] of entries) {
      const variant = product.variantGroups?.flatMap(g => g.variants).find(v => v.id === variantId)
      const price = (variant && typeof variant.priceFCFA === 'number' && variant.priceFCFA > 0)
        ? variant.priceFCFA
        : (basePrice ?? 0)
      sum += price * qty
    }
    return sum
  }, [variantQuantities, product.variantGroups, basePrice])

  // Si des variantes sont sélectionnées, utiliser leur sous-total, sinon utiliser quantity
  const hasVariantSelection = totalVariantQuantity > 0
  const displayedSubtotal = hasVariantSelection ? variantSubtotal : (unitPrice ? unitPrice * Math.max(1, quantity) : 0)
  const displayedQuantity = hasVariantSelection ? totalVariantQuantity : quantity

  const totalPrice = useMemo(() => {
    if (!unitPrice) return null
    // Si variantes sélectionnées, utiliser le sous-total des variantes
    if (hasVariantSelection) return variantSubtotal
    return unitPrice * Math.max(1, quantity)
  }, [unitPrice, quantity, hasVariantSelection, variantSubtotal])

  const unitPriceLabel = unitPrice ? formatCurrency(unitPrice, product.pricing.currency) : null
  const totalPriceLabel = totalPrice ? formatCurrency(totalPrice, product.pricing.currency) : null
  const showQuote = product.requiresQuote || unitPrice === null
  const deliveryDays = activeShipping?.durationDays ?? product.availability.leadTimeDays ?? null

  const whatsappUrl = () => {
    const channel = shippingEnabled
      ? activeShipping?.label || 'À définir'
      : 'Retrait / livraison locale Dakar'
    const message = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${product.name}.
Mode de transport souhaité: ${channel}.
Quantité: ${quantity}.
Merci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${message}`
  }

  const incrementVariant = (variantId: string) => {
    setVariantQuantities(prev => ({ ...prev, [variantId]: (prev[variantId] || 0) + 1 }))
  }

  const decrementVariant = (variantId: string) => {
    setVariantQuantities(prev => ({ ...prev, [variantId]: Math.max(0, (prev[variantId] || 0) - 1) }))
  }

  const addToCart = (redirect = false) => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const id = `${product.id}${shippingKey}`
      const currency = activeShipping?.currency || product.pricing.currency
      // Si l'utilisateur a renseigné des quantités par variante, ajouter chaque variante séparément
      const variantEntries = Object.entries(variantQuantities || {}).filter(([, q]) => q > 0)
      if (variantEntries.length > 0) {
        for (const [variantId, qty] of variantEntries) {
          const variant = product.variantGroups?.flatMap(g => g.variants).find(v => v.id === variantId)
          if (!variant) continue
          const vId = `${product.id}-${variantId}${shippingKey}`
          const exists = items.find((it: any) => it.id === vId)
          const priceForVariant = (typeof variant.priceFCFA === 'number' && variant.priceFCFA > 0)
            ? variant.priceFCFA
            : basePrice ?? 0
          // Calculer le prix avec frais inclus (ce qui s'affiche au panier)
          const priceWithFeesVariant = product.pricing.fees
            ? priceForVariant + (product.pricing.fees.serviceFeeAmount || 0) + (product.pricing.fees.insuranceAmount || 0)
            : priceForVariant

          if (exists) {
            exists.qty += qty
            exists.price = priceWithFeesVariant
            exists.currency = currency
            // ajouter poids/volume si disponible (product level, pas variant level)
            exists.unitWeightKg = product.weights?.netWeightKg ?? product.logistics.weightKg ?? undefined
            exists.unitVolumeM3 = product.logistics.volumeM3 ?? undefined
          } else {
            const newItem: any = {
              id: vId,
              name: `${product.name} — ${variant.name}`,
              qty,
              price: priceWithFeesVariant,
              currency,
              requiresQuote: !!product.requiresQuote,
              variantId
            }
            if (activeShipping) newItem.shipping = {
              id: activeShipping.id,
              label: activeShipping.label,
              durationDays: activeShipping.durationDays,
              cost: activeShipping.cost,
              currency: activeShipping.currency
            }
            if (product.pricing.fees) {
              newItem.serviceFeeRate = product.pricing.fees.serviceFeeRate
              newItem.serviceFeeAmount = product.pricing.fees.serviceFeeAmount
              newItem.insuranceRate = product.pricing.fees.insuranceRate
              newItem.insuranceAmount = product.pricing.fees.insuranceAmount
            }
            // ajouter poids/volume unitaire (product level, pas variant level)
            newItem.unitWeightKg = product.weights?.netWeightKg ?? product.logistics.weightKg ?? undefined
            newItem.unitVolumeM3 = product.logistics.volumeM3 ?? undefined
            items.push(newItem)
          }
        }
      } else {
        const existsIndex = items.findIndex((item: any) => item.id === id)
        // Calculer le prix avec frais inclus (ce qui s'affiche au panier)
        const priceWithFees = product.pricing.fees
          ? (basePrice ?? 0) + (product.pricing.fees.serviceFeeAmount || 0) + (product.pricing.fees.insuranceAmount || 0)
          : (basePrice ?? 0)

        if (existsIndex >= 0) {
          items[existsIndex].qty += Math.max(1, quantity)
          // Stocker le prix avec frais déjà inclus (sourcing + service + assurance, hors transport)
          items[existsIndex].price = priceWithFees
          items[existsIndex].currency = currency
          if (activeShipping) {
            items[existsIndex].shipping = {
              id: activeShipping.id,
              label: activeShipping.label,
              durationDays: activeShipping.durationDays,
              cost: activeShipping.cost,
              currency: activeShipping.currency
            }
          }
        } else {
          items.push({
            id,
            name: product.name,
            qty: Math.max(1, quantity),
            // Prix avec frais déjà inclus (sourcing + service + assurance, hors transport)
            price: priceWithFees,
            currency,
            requiresQuote: !!product.requiresQuote,
            shipping: activeShipping ? {
              id: activeShipping.id,
              label: activeShipping.label,
              durationDays: activeShipping.durationDays,
              cost: activeShipping.cost,
              currency: activeShipping.currency
            } : undefined
          })
          // Ajouter méta frais/assurance pour que le panier/checkout puisse calculer le total final
          const lastIndex = items.length - 1
          if (product.pricing.fees) {
            items[lastIndex].serviceFeeRate = product.pricing.fees.serviceFeeRate
            items[lastIndex].serviceFeeAmount = product.pricing.fees.serviceFeeAmount
            items[lastIndex].insuranceRate = product.pricing.fees.insuranceRate
            items[lastIndex].insuranceAmount = product.pricing.fees.insuranceAmount
          }
          // ajouter poids/volume unitaire
          items[lastIndex].unitWeightKg = product.weights?.netWeightKg ?? product.logistics.weightKg ?? undefined
          items[lastIndex].unitVolumeM3 = product.logistics.volumeM3 ?? undefined
        }
      }

      window.localStorage.setItem('cart:items', JSON.stringify(items))
      trackEvent('add_to_cart', { productId: product.id, quantity })
      window.dispatchEvent(new CustomEvent('cart:updated'))
      if (redirect) {
        setTimeout(() => {
          window.location.href = '/panier'
        }, 200)
      }
    } finally {
      setAdding(false)
    }
  }

  const updateInstallationForm = (field: keyof typeof installationForm, value: string | boolean) => {
    setInstallationForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(16, 185, 129)
      doc.text(product.name, 14, 20)
      if (product.tagline) {
        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text(product.tagline, 14, 30)
      }
      if (product.description) {
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        const splitDescription = doc.splitTextToSize(product.description, 180)
        doc.text(splitDescription, 14, 45)
      }
      let yPos = 65
      doc.setFontSize(14)
      doc.setTextColor(16, 185, 129)
      doc.text(`Prix: ${unitPriceLabel || 'Sur devis'}`, 14, yPos)
      yPos += 10
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Disponibilité: ${product.availability.label || 'Sur commande'}`, 14, yPos)
      if (product.features && product.features.length > 0) {
        yPos += 15
        doc.setFontSize(12)
        doc.setTextColor(16, 185, 129)
        doc.text('Caractéristiques principales:', 14, yPos)
        yPos += 8
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        product.features.slice(0, 10).forEach((feature, index) => {
          doc.text(`• ${feature}`, 20, yPos + (index * 6))
        })
      }
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `IT Vision - ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        )
      }
      doc.save(`${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Impossible d\'exporter le PDF. Veuillez réessayer.')
    }
  }

  const handleShare = async (platform?: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'copy') => {
    try {
      if (typeof window === 'undefined') return
      const url = window.location.href
      const title = product.name
      const text = product.tagline ?? product.description ?? product.name

      if (platform === 'whatsapp') {
        const message = encodeURIComponent(`${title}\n${text}\n${url}`)
        window.open(`https://wa.me/?text=${message}`, '_blank')
        setShareFeedback('Ouverture WhatsApp...')
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
        setShareFeedback('Ouverture Facebook...')
      } else if (platform === 'twitter') {
        const tweet = encodeURIComponent(`${title} - ${url}`)
        window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank')
        setShareFeedback('Ouverture Twitter...')
      } else if (platform === 'linkedin') {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
        setShareFeedback('Ouverture LinkedIn...')
      } else if (platform === 'copy' || !platform) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url)
          setShareFeedback('Lien copié dans le presse-papiers.')
        } else {
          const textArea = document.createElement('textarea')
          textArea.value = url
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          setShareFeedback('Lien copié.')
        }
      } else if (navigator.share) {
        await navigator.share({ title, text, url })
        setShareFeedback('Lien partagé avec succès !')
      }
    } catch (error) {
      console.error('share product', error)
      setShareFeedback('Impossible de partager ce produit.')
    }
  }

  const handleNegotiationSubmit = async () => {
    setNegotiationStatus('sending')
    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      setNegotiationStatus('sent')
      trackEvent('negotiation_request', { productId: product.id })
      setTimeout(() => {
        setShowNegotiation(false)
        setNegotiationStatus('idle')
      }, 1200)
    } catch (error) {
      console.error('negotiation error', error)
      setNegotiationStatus('idle')
    }
  }

  const handleInstallationRequest = async () => {
    if (!wantsInstallation) return
    if (!installationForm.contactName || !installationForm.contactPhone) {
      setInstallationError('Merci de renseigner un nom et un numéro de téléphone.')
      setInstallationStatus('error')
      setTimeout(() => setInstallationStatus('idle'), 2000)
      return
    }
    setInstallationStatus('loading')
    setInstallationError(null)
    try {
      const payload = {
        productId: product.id,
        productName: product.name,
        quantity,
        includeMaterials: installationForm.includeMaterials,
        preferredDate: installationForm.preferredDate || null,
        notes: [installationForm.notes, selectedColor ? `Couleur: ${selectedColor}` : '', selectedVariant ? `Variante: ${selectedVariant}` : '']
          .filter(Boolean)
          .join(' | '),
        clientName: installationForm.contactName,
        clientEmail: installationForm.contactEmail,
        clientPhone: installationForm.contactPhone,
        address: installationForm.address
      }
      const res = await fetch('/api/products/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Publication marketplace impossible')
      }
      setInstallationSuccessId(data.activityId)
      setInstallationStatus('success')
      trackEvent('product_install_request', { productId: product.id, quantity })
      setTimeout(() => setInstallationStatus('idle'), 2500)
    } catch (error) {
      setInstallationStatus('error')
      setInstallationError(
        error instanceof Error ? error.message : 'Impossible de publier la demande pour le moment.'
      )
      setTimeout(() => setInstallationStatus('idle'), 2500)
    }
  }

  const handleQuantityChange = (value: number) => {
    if (!Number.isFinite(value)) return
    setQuantity(Math.max(1, Math.round(value)))
  }

  useEffect(() => {
    if (!shareFeedback) return
    const timeout = setTimeout(() => setShareFeedback(null), 2500)
    return () => clearTimeout(timeout)
  }, [shareFeedback])

  useEffect(() => {
    if (!showImageModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowImageModal(false)
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImageModal, gallery.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      setIsFavorite(favorites.includes(product.id))
    } catch {
      setIsFavorite(false)
    }
  }, [product.id])

  // Enregistrer le produit consulté pour recent:viewed (localStorage)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const key = 'recent:viewed'
      const variantId = Object.values(selectedVariants || {})[0] ?? null
      const entry = { id: product.id, variantId, url: typeof window !== 'undefined' ? window.location.href : '', title: product.name, ts: Date.now() }
      const raw = localStorage.getItem(key)
      let arr = raw ? JSON.parse(raw) : []
      arr = arr.filter((e: any) => !(e.id === entry.id && e.variantId === entry.variantId))
      arr.unshift(entry)
      arr = arr.slice(0, 20)
      localStorage.setItem(key, JSON.stringify(arr))
      window.dispatchEvent(new CustomEvent('recent:updated'))
    } catch (e) {
      console.error('recent view store error', e)
    }
    // Re-enregistrer quand le produit ou la sélection de variantes change
  }, [product.id, JSON.stringify(selectedVariants)])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleWishlistUpdate = () => {
      try {
        const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
        setIsFavorite(favorites.includes(product.id))
      } catch {
        setIsFavorite(false)
      }
    }
    window.addEventListener('wishlist:updated', handleWishlistUpdate)
    return () => window.removeEventListener('wishlist:updated', handleWishlistUpdate)
  }, [product.id])

  const toggleFavorite = () => {
    if (typeof window === 'undefined') return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      if (isFavorite) {
        const updated = favorites.filter((id: string) => id !== product.id)
        localStorage.setItem('wishlist:items', JSON.stringify(updated))
        setIsFavorite(false)
        trackEvent('remove_from_wishlist', { productId: product.id })
      } else {
        favorites.push(product.id)
        localStorage.setItem('wishlist:items', JSON.stringify(favorites))
        setIsFavorite(true)
        trackEvent('add_to_wishlist', { productId: product.id })
      }
      window.dispatchEvent(new CustomEvent('wishlist:updated'))
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const logisticsEntries = useMemo(() => {
    const entries: { label: string; value: string | null }[] = []
    
    if (product.availability.leadTimeDays) {
      entries.push({ label: 'Délai moyen Chine', value: `${product.availability.leadTimeDays} jours` })
    }
    
    // Poids détaillés (priorité aux données structurées)
    const weights = product.weights
    if (weights?.netWeightKg) {
      entries.push({ label: 'Poids net (produit)', value: `${weights.netWeightKg.toFixed(2)} kg` })
    }
    if (weights?.grossWeightKg) {
      entries.push({ label: 'Poids brut (avec emballage)', value: `${weights.grossWeightKg.toFixed(2)} kg` })
    } else if (product.logistics.weightKg && !weights?.netWeightKg) {
      // Fallback legacy
      entries.push({ label: 'Poids', value: `${product.logistics.weightKg.toFixed(2)} kg` })
    }
    if (weights?.packagingWeightKg || product.logistics.packagingWeightKg) {
      const pkgWeight = weights?.packagingWeightKg ?? product.logistics.packagingWeightKg
      entries.push({ label: 'Poids emballage', value: `${pkgWeight?.toFixed(2)} kg` })
    }
    
    // Volume
    if (product.logistics.volumeM3) {
      entries.push({ label: 'Volume', value: `${product.logistics.volumeM3.toFixed(3)} m³` })
    }
    
    // Dimensions
    if (product.logistics.dimensions) {
      const { lengthCm, widthCm, heightCm } = product.logistics.dimensions
      entries.push({ label: 'Dimensions colis', value: `${lengthCm} × ${widthCm} × ${heightCm} cm` })
    }
    
    // Note: Les informations de sourcing ne sont pas exposées au client
    return entries
  }, [product.logistics, product.weights, product.availability.leadTimeDays])

  useEffect(() => {
    if (activeTab === 'reviews') {
      setReviewsLoading(true)
      setTimeout(() => {
        const mockReviews = [
          {
            id: '1',
            userName: 'Jean D.',
            rating: 5,
            title: 'Excellent produit',
            comment: 'Produit de très bonne qualité, livraison rapide et installation professionnelle. Je recommande !',
            verified: true,
            helpful: 12,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            userName: 'Marie L.',
            rating: 4,
            title: 'Très satisfait',
            comment: 'Bon rapport qualité/prix. Le support client est réactif et professionnel.',
            verified: true,
            helpful: 8,
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
        setReviews(mockReviews)
        const avg = mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length
        setAverageRating(avg)
        setReviewsLoading(false)
      }, 500)
    }
  }, [activeTab])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header avec breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Accueil</Link>
            <span>/</span>
            <Link href="/produits" className="hover:text-emerald-600 transition-colors">Produits</Link>
            {product.category && (
              <>
                <span>/</span>
                <span className="text-gray-900 font-medium">{product.category}</span>
              </>
            )}
            <span>/</span>
            <span className="text-gray-900 font-semibold line-clamp-1">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Galerie d'images */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] max-h-[400px] lg:max-h-[450px] rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 group mx-auto">
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="absolute inset-0 cursor-zoom-in"
                aria-label="Agrandir l'image"
              >
                <Image
                  src={gallery[activeImageIndex] || '/file.svg'}
                  alt={product.name}
                  fill
                  className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 450px"
                  priority
                />
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold text-gray-700 shadow-lg">
                  <ZoomIn className="h-4 w-4" />
                  <span>Cliquer pour agrandir</span>
                </div>
              </button>
              {/* Badge disponibilité */}
              <div className={clsx(
                'absolute top-4 right-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-sm',
                product.availability.status === 'in_stock'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'
              )}>
                <Clock className="h-3.5 w-3.5" />
                {product.availability.label}
              </div>
            </div>
            {/* Miniatures */}
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {gallery.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={clsx(
                      'relative h-20 w-20 flex-shrink-0 rounded-xl border-2 transition-all',
                      activeImageIndex === index
                        ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-lg scale-105'
                        : 'border-gray-200 hover:border-emerald-300'
                    )}
                    aria-label={`Image ${index + 1}`}
                  >
                    <Image
                      src={src}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations produit - Compact */}
          <div className="space-y-4">
            {/* Titre */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <ShieldCheck className="h-3 w-3" />
                  IT Vision
                </span>
                {product.isImported && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Import Chine
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>
              {product.tagline && (
                <p className="text-sm text-gray-600 mt-1">{product.tagline}</p>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* BLOC PRIX INDIVIDUEL - Achat standard sans groupe             */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="mt-6 relative">
              {/* Badge "Prix Individuel" */}
              <div className="absolute -top-3 left-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
                💳 PRIX INDIVIDUEL
              </div>
              
              <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Structure de prix - Achat standard
                </h3>
                <div className="text-sm text-gray-700 space-y-2">
                  {/* Prix source (attractif - celui vu sur l'accueil) */}
                  {product.pricing.baseCost !== null && (
                    <div className="flex justify-between items-center bg-blue-50 -mx-4 px-4 py-2 border-b border-blue-100">
                      <span className="text-blue-700 font-medium">💰 Prix source</span>
                      <div className="text-right">
                        <span className="font-bold text-blue-600 text-lg">{formatCurrency(product.pricing.baseCost, product.pricing.currency)}</span>
                        <div className="text-[10px] text-blue-500">Prix affiché sur le catalogue</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Détail des frais additionnels */}
                  {product.pricing.fees && (
                    <>
                      {/* Marge (si salePrice différent de baseCost) */}
                      {product.pricing.baseCost !== null && product.pricing.salePrice !== null && product.pricing.salePrice > product.pricing.baseCost && (
                        <div className="flex justify-between text-gray-600">
                          <span>Marge commerciale ({product.pricing.marginRate || 25}%)</span>
                          <span className="font-medium">+{formatCurrency(product.pricing.salePrice - product.pricing.baseCost, product.pricing.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>Frais de service ({product.pricing.fees.serviceFeeRate}%)</span>
                        <span className="font-medium">+{formatCurrency(product.pricing.fees.serviceFeeAmount, product.pricing.currency)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Assurance ({product.pricing.fees.insuranceRate}%)</span>
                        <span className="font-medium">+{formatCurrency(product.pricing.fees.insuranceAmount, product.pricing.currency)}</span>
                      </div>
                      <div className="border-t-2 border-emerald-300 pt-3 mt-3 flex justify-between text-gray-800 font-bold">
                        <span>Prix unitaire TTC</span>
                        <span className="text-emerald-600 text-xl">{formatCurrency(
                          product.pricing.totalWithFees ?? Math.round(
                            (product.pricing.salePrice ?? 0) +
                            (product.pricing.fees.serviceFeeAmount ?? 0) +
                            (product.pricing.fees.insuranceAmount ?? 0)
                          ),
                          product.pricing.currency
                        )}</span>
                      </div>
                    </>
                  )}
                  {/* Si pas de fees, afficher simplement le salePrice */}
                  {!product.pricing.fees && product.pricing.salePrice && (
                    <div className="border-t border-emerald-200 pt-2 flex justify-between text-gray-800 font-bold">
                      <span>Prix unitaire</span>
                      <span className="text-emerald-600 text-lg">{formatCurrency(product.pricing.salePrice, product.pricing.currency)}</span>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    ⚠️ Transport non inclus — sélectionnez le mode ci-dessus. Le coût exact sera calculé selon le poids total.
                  </div>
                </div>
              </div>

              {/* Badge livraison possible */}
              {product.pricing.shippingOptions && product.pricing.shippingOptions.length > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Livraison possible :</span>{' '}
                  {product.pricing.shippingOptions.map((o, idx) => (
                    <span key={o.id} className="inline-block ml-1">
                      {o.label} ({o.durationDays}j){idx < product.pricing.shippingOptions.length - 1 ? ' /' : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Aperçu détaillé des variantes avec contrôle de quantité par variante (style compact) */}
              {product.variantGroups && product.variantGroups.length > 0 && (
                <div className="mt-3 bg-white border border-gray-200 rounded-lg p-2">
                  {product.variantGroups.map((group) => (
                    <div key={`vg-${group.name}`} className="mb-2">
                      <div className="text-sm font-semibold text-gray-700 mb-2">{group.name}</div>
                      <div className="space-y-1">
                        {group.variants.map((v) => (
                          <div key={v.id} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center py-2">
                            <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                              {v.image ? (
                                <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-xs text-gray-400">No image</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{v.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                <span className="font-semibold text-emerald-600">{v.priceFCFA ? formatCurrency(v.priceFCFA, 'FCFA') : (v.price1688 ? `${v.price1688} ¥` : '')}</span>
                                {v.stock !== undefined && <span className="text-gray-400">• {v.stock} en stock</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => decrementVariant(v.id)}
                                aria-label={`Retirer ${v.name}`}
                                className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-700 bg-white hover:bg-gray-50"
                              >
                                −
                              </button>
                              <div className="w-8 text-center text-sm">{variantQuantities[v.id] || 0}</div>
                              <button
                                type="button"
                                onClick={() => incrementVariant(v.id)}
                                aria-label={`Ajouter ${v.name}`}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Options de transport (taux affichés, pas de total) */}
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Options de transport (exemples de tarifs)</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  {Object.values(BASE_SHIPPING_RATES).map((rate) => (
                    <div key={rate.id} className="flex justify-between">
                      <div>
                        <div className="font-medium">{rate.label}</div>
                        <div className="text-xs text-gray-500">{rate.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {rate.billing === 'per_kg' ? `${rate.rate.toLocaleString('fr-FR')} ${product.pricing.currency}/kg` : `${rate.rate.toLocaleString('fr-FR')} ${product.pricing.currency}/m³`}
                        </div>
                        {rate.minimumCharge && <div className="text-xs text-gray-500">min {rate.minimumCharge.toLocaleString('fr-FR')} {product.pricing.currency}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">Le coût exact est calculé au récapitulatif selon le poids/volume total de votre commande.</div>
              </div>
            </div>

            {/* Prix + Transport compact */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Prix */}
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">
                    {totalPriceLabel || unitPriceLabel || 'Sur devis'}
                  </div>
                  {!showQuote && displayedQuantity > 1 && (
                    <div className="text-xs text-gray-500">
                      {hasVariantSelection 
                        ? `${displayedQuantity} article${displayedQuantity > 1 ? 's' : ''} sélectionné${displayedQuantity > 1 ? 's' : ''}`
                        : `${quantity} × ${unitPriceLabel}`
                      }
                    </div>
                  )}
                  {deliveryDays && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>Livraison ~{deliveryDays}j</span>
                    </div>
                  )}
                </div>
                
                {/* Boutons transport - Style tabs compact */}
                {shippingEnabled && product.pricing.shippingOptions.length > 0 && (
                  <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    {product.pricing.shippingOptions.map((option) => {
                      const active = option.id === selectedShippingId
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedShippingId(option.id)}
                          className={clsx(
                            'px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap',
                            active
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Détail prix (compact, toggle possible) */}
              {product.pricing.fees && product.pricing.salePrice && !showQuote && (
                <div className="mt-3 pt-3 border-t border-emerald-200/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="text-gray-600">
                    <span className="block text-gray-400">Produit</span>
                    {formatCurrency(product.pricing.salePrice, product.pricing.currency)}
                  </div>
                  <div className="text-gray-600">
                    <span className="block text-gray-400">Service {product.pricing.fees.serviceFeeRate}%</span>
                    +{formatCurrency(product.pricing.fees.serviceFeeAmount, product.pricing.currency)}
                  </div>
                  <div className="text-gray-600">
                    <span className="block text-gray-400">Assurance {product.pricing.fees.insuranceRate}%</span>
                    +{formatCurrency(product.pricing.fees.insuranceAmount, product.pricing.currency)}
                  </div>
                  {activeShipping && (
                    <div className="text-gray-600">
                      <span className="block text-gray-400">Transport</span>
                      +{formatCurrency(activeShipping.cost, activeShipping.currency)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conseil achats en gros */}
            {product.isImported && !showQuote && (
              <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-700">Conseil :</span>
                  <span className="text-amber-600"> Commandez en gros pour réduire les frais de transport au kilo ! Plus de quantité = meilleur prix unitaire.</span>
                </div>
              </div>
            )}

            {/* Options produit compact */}
            <div className="space-y-3">
              {/* Variantes avec prix (compact) */}
              {product.variantGroups && product.variantGroups.length > 0 && (
                <div className="space-y-2">
                  {product.variantGroups.map((group) => (
                    <div key={group.name} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600 w-16">{group.name}:</span>
                      <div className="flex flex-wrap gap-1">
                        {group.variants.map((variant) => {
                          const isSelected = selectedVariants[group.name] === variant.id
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => {
                                setSelectedVariants(prev => ({ ...prev, [group.name]: variant.id }))
                                if (variant.image) {
                                  const imgIndex = gallery.findIndex(img => img === variant.image)
                                  if (imgIndex >= 0) setActiveImageIndex(imgIndex)
                                }
                              }}
                              className={clsx(
                                'flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all',
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300',
                                variant.stock === 0 && 'opacity-50 line-through'
                              )}
                            >
                              {variant.image && (
                                <img src={variant.image} alt="" className="w-4 h-4 rounded object-cover" />
                              )}
                              <span>{variant.name}</span>
                              {variant.priceFCFA && variant.priceFCFA > 0 && (
                                <span className="text-[10px] text-gray-400">
                                  {formatCurrency(variant.priceFCFA, 'FCFA')}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Options legacy compactes */}
              {product.colorOptions.filter(Boolean).length > 0 && (!product.variantGroups || product.variantGroups.length === 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 w-16">Couleur:</span>
                  <div className="flex flex-wrap gap-1">
                    {product.colorOptions.filter(Boolean).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={clsx(
                          'px-2 py-1 text-xs rounded-md border transition-all',
                          selectedColor === color
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                        )}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.variantOptions.filter(Boolean).length > 0 && (!product.variantGroups || product.variantGroups.length === 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 w-16">Option:</span>
                  <div className="flex flex-wrap gap-1">
                    {product.variantOptions.filter(Boolean).map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={clsx(
                          'px-2 py-1 text-xs rounded-md border transition-all',
                          selectedVariant === variant
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                        )}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantité + Actions sur la même ligne */}
              {/* Masquer le sélecteur de quantité global si des variantes sont sélectionnées */}
              {!hasVariantSelection && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                    >
                      −
                    </button>
                    <input
                      id="quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(Number(e.target.value))}
                      className="w-12 text-center border-x border-gray-200 py-1 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">unité(s)</span>
                </div>
              )}
              {hasVariantSelection && (
                <div className="flex items-center gap-2 pt-2 text-sm text-emerald-600">
                  <span className="font-medium">{displayedQuantity} article{displayedQuantity > 1 ? 's' : ''}</span>
                  <span className="text-gray-400">sélectionné{displayedQuantity > 1 ? 's' : ''} ci-dessus</span>
                </div>
              )}
            </div>

            {/* Actions compactes */}
            <div className="w-full mb-2">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm flex items-center justify-between">
                <div className="text-gray-600">Sous-total produit</div>
                <div className="font-semibold text-lg text-emerald-600">{formatCurrency(displayedSubtotal, product.pricing.currency)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
              {!showQuote && (
                <>
                  <button
                    type="button"
                    onClick={() => addToCart(true)}
                    disabled={adding}
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 text-sm font-bold transition-all shadow-md disabled:opacity-50"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {adding ? 'Ajout...' : 'Acheter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCart(false)}
                    disabled={adding}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500 text-emerald-600 px-3 py-2.5 text-sm font-medium hover:bg-emerald-50 transition-all disabled:opacity-50"
                    title="Ajouter au panier"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden sm:inline">Panier</span>
                  </button>
                </>
              )}
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('quote_request', { productId: product.id, quantity })}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-500 text-white px-3 py-2.5 text-sm font-medium hover:bg-green-600 transition-all"
                title="Devis WhatsApp"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
                <span className="hidden sm:inline">Devis</span>
              </a>
              <button
                type="button"
                onClick={() => setShowNegotiation(true)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 text-gray-600 px-3 py-2.5 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 transition-all"
                title="Négocier"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Négocier</span>
              </button>
              <button
                type="button"
                onClick={toggleFavorite}
                className={clsx(
                  'inline-flex items-center justify-center rounded-lg border px-2.5 py-2.5 transition-all',
                  isFavorite ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-300 text-gray-400 hover:text-red-500'
                )}
                title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart className={clsx('h-4 w-4', isFavorite && 'fill-current')} />
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* BLOC ACHAT GROUPÉ - Séparé visuellement du prix individuel    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {product.groupBuyEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 relative"
              >
                {/* Badge "Achat Groupé" */}
                <div className="absolute -top-3 left-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
                  🎯 ACHAT GROUPÉ
                </div>
                
                <div className="p-5 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-300 rounded-2xl shadow-lg">
                  {/* Header avec économie */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-purple-800 text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Rejoignez le groupe !
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Achetez ensemble, économisez plus
                      </p>
                    </div>
                    {product.priceTiers && product.priceTiers.length > 0 && product.pricing.salePrice && (
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Jusqu&apos;à</span>
                        <div className="text-lg font-bold text-emerald-600">
                          -{Math.round(((product.pricing.salePrice - product.priceTiers[product.priceTiers.length - 1].price) / product.pricing.salePrice) * 100)}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Barre de progression avec participants */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">Progression du groupe</span>
                      <span className="font-bold text-purple-700">
                        {product.groupBuyMinQty || 10} participants minimum
                      </span>
                    </div>
                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '35%' }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                        7/{product.groupBuyMinQty || 10} acheteurs
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>🟢 3 places restantes</span>
                      <span>Objectif: {product.groupBuyTargetQty || 50} unités</span>
                    </div>
                  </div>

                  {/* Timer countdown */}
                  <div className="flex items-center gap-2 p-2 bg-white/70 rounded-lg border border-amber-200 mb-4">
                    <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    <div className="flex-1">
                      <span className="text-xs text-gray-600">Expire dans</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-amber-700">
                        <span className="bg-amber-100 px-1.5 py-0.5 rounded">03</span>
                        <span>:</span>
                        <span className="bg-amber-100 px-1.5 py-0.5 rounded">14</span>
                        <span>:</span>
                        <span className="bg-amber-100 px-1.5 py-0.5 rounded">27</span>
                        <span className="text-xs text-gray-500 ml-1">jours</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <div>⏰ Clôture automatique</div>
                      <div>le {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>

                  {/* Paliers de prix */}
                  {product.priceTiers && product.priceTiers.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-600 mb-2">📊 Paliers de prix</div>
                      <div className="grid grid-cols-3 gap-2">
                        {product.priceTiers.slice(0, 3).map((tier, i) => {
                          const isBest = i === product.priceTiers!.length - 1
                          return (
                            <div 
                              key={i} 
                              className={clsx(
                                'relative p-2 rounded-lg border text-center transition-all',
                                isBest 
                                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200' 
                                  : 'bg-white border-gray-200'
                              )}
                            >
                              {isBest && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  MEILLEUR
                                </span>
                              )}
                              <div className="text-lg font-bold text-gray-800">
                                {tier.minQty}+
                              </div>
                              <div className={clsx('text-sm font-semibold', isBest ? 'text-emerald-600' : 'text-purple-600')}>
                                {formatCurrency(tier.price, product.pricing.currency)}
                              </div>
                              <div className="text-[10px] text-gray-400">par unité</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* CTAs */}
                  <div className="flex gap-2">
                    <Link
                      href={`/achats-groupes?productId=${product.id}&action=join`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 text-sm font-bold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                      <Users className="w-4 h-4" />
                      Rejoindre le groupe
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleShare('copy')}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border-2 border-purple-300 text-purple-600 px-3 py-3 text-sm font-medium hover:bg-purple-50 transition-all"
                      title="Partager pour inviter"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-center text-[10px] text-gray-500 mt-3">
                    💡 Partagez le lien pour atteindre l&apos;objectif plus vite et débloquer le meilleur prix !
                  </p>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* BLOC INSTALLATION - Service optionnel technicien             */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 relative"
            >
              {/* Badge optionnel */}
              <div className="absolute -top-3 left-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
                🔧 INSTALLATION OPTIONNELLE
              </div>
              
              <div className="border-2 border-orange-200 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
                {/* Header toggle */}
                <button
                  type="button"
                  onClick={() => setWantsInstallation(!wantsInstallation)}
                  className="w-full flex items-center justify-between p-4 hover:bg-orange-100/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                      wantsInstallation ? 'bg-orange-500 text-white' : 'bg-white border-2 border-orange-300 text-orange-500'
                    )}>
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">Besoin d&apos;une installation ?</h3>
                      <p className="text-xs text-gray-500">Techniciens certifiés • Garantie intervention</p>
                    </div>
                  </div>
                  <div className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    wantsInstallation ? 'bg-orange-500' : 'bg-gray-300'
                  )}>
                    <div className={clsx(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform',
                      wantsInstallation ? 'translate-x-6' : 'translate-x-0.5'
                    )} />
                  </div>
                </button>

                {/* Contenu formulaire */}
                <AnimatePresence>
                  {wantsInstallation && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4 border-t border-orange-200">
                        {/* Avantages */}
                        <div className="grid grid-cols-3 gap-2 pt-4">
                          <div className="text-center p-2 bg-white rounded-lg border border-orange-100">
                            <span className="text-lg">👨‍🔧</span>
                            <p className="text-[10px] text-gray-600 mt-1">Techniciens<br/>vérifiés</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg border border-orange-100">
                            <span className="text-lg">🛡️</span>
                            <p className="text-[10px] text-gray-600 mt-1">Garantie<br/>intervention</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg border border-orange-100">
                            <span className="text-lg">⚡</span>
                            <p className="text-[10px] text-gray-600 mt-1">Réponse<br/>sous 24h</p>
                          </div>
                        </div>

                        {/* Formulaire amélioré */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Votre nom *</label>
                              <input 
                                value={installationForm.contactName} 
                                onChange={(e) => updateInstallationForm('contactName', e.target.value)} 
                                className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" 
                                placeholder="Ex: Jean Dupont" 
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone *</label>
                              <input 
                                value={installationForm.contactPhone} 
                                onChange={(e) => updateInstallationForm('contactPhone', e.target.value)} 
                                className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" 
                                placeholder="Ex: 77 123 45 67" 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Adresse d&apos;installation *</label>
                            <input 
                              value={installationForm.address} 
                              onChange={(e) => updateInstallationForm('address', e.target.value)} 
                              className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" 
                              placeholder="Ex: Quartier, Rue, Ville" 
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Date souhaitée</label>
                            <input 
                              type="date" 
                              value={installationForm.preferredDate} 
                              onChange={(e) => updateInstallationForm('preferredDate', e.target.value)} 
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" 
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Instructions supplémentaires</label>
                            <textarea 
                              className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none" 
                              rows={2}
                              placeholder="Ex: Accès par escalier, disponible le matin uniquement..."
                            />
                          </div>
                        </div>

                        {/* Messages de statut */}
                        {installationError && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {installationError}
                          </div>
                        )}
                        {installationStatus === 'success' && (
                          <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            ✓ Demande publiée ! Un technicien vous contactera sous 24h.
                          </div>
                        )}

                        {/* Bouton d'action */}
                        <button 
                          onClick={handleInstallationRequest} 
                          disabled={installationStatus === 'loading'} 
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3 font-bold hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl"
                        >
                          {installationStatus === 'loading' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Publication en cours...
                            </>
                          ) : (
                            <>
                              <Megaphone className="w-4 h-4" />
                              Publier ma demande aux techniciens
                            </>
                          )}
                        </button>

                        <p className="text-center text-[10px] text-gray-500">
                          📢 Votre demande sera visible par tous les techniciens certifiés de votre zone
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Actions secondaires compactes */}
            <div className="flex items-center gap-2 text-xs pt-2">
              <button onClick={handleExportPDF} className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50" title="Télécharger PDF">
                <FileDown className="h-3 w-3" /> PDF
              </button>
              <button onClick={() => handleShare('copy')} className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50" title="Copier le lien">
                <Share2 className="h-3 w-3" /> Lien
              </button>
            </div>
          </div>
        </div>

        {/* Onglets d'information */}
        <div className="mt-12">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
            {(['description', 'features', 'logistics', 'support', 'reviews'] as InfoTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-6 py-3 text-sm font-semibold border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                {tab === 'description' && 'Description'}
                {tab === 'features' && 'Caractéristiques'}
                {tab === 'logistics' && 'Logistique'}
                {tab === 'support' && 'Garantie & SAV'}
                {tab === 'reviews' && 'Avis clients'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="prose prose-emerald max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-800"
                >
                  {product.description ? (
                    <div dangerouslySetInnerHTML={{ __html: product.description }} />
                  ) : (
                    <p className="text-gray-500 italic">
                      Description détaillée disponible sur demande auprès de nos équipes sourcing.
                    </p>
                  )}
                </motion.div>
              )}

              {activeTab === 'features' && (
                <motion.div
                  key="features"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ul className="space-y-3">
                    {(product.features.filter(Boolean).length > 0
                      ? product.features.filter(Boolean)
                      : ['Qualité professionnelle import Chine', 'Installation & support IT Vision Dakar', 'Tarification optimisée selon le mode de transport']
                    ).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {activeTab === 'logistics' && (
                <motion.div
                  key="logistics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {logisticsEntries.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spécifications techniques</h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {logisticsEntries.map((entry, index) => (
                          <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{entry.label}</div>
                            <div className="text-base font-semibold text-gray-900">{entry.value || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {logisticsEntries.length === 0 && (
                    <p className="text-gray-600 text-center py-8">Informations logistiques détaillées disponibles sur demande.</p>
                  )}
                </motion.div>
              )}

              {activeTab === 'support' && (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ul className="space-y-3">
                    {[
                      'Garantie constructeur 12 mois (extensions possibles)',
                      'Assistance IT Vision 7j/7 sur Dakar & Sénégal',
                      'Maintenance préventive et curative disponible',
                      'Support import dédié & livraison sécurisée'
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {reviewsLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-600">Aucun avis pour le moment.</p>
                      <p className="text-sm text-gray-500 mt-2">Soyez le premier à laisser un avis !</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-emerald-600">{averageRating.toFixed(1)}</div>
                          <div className="flex items-center justify-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={clsx(
                                  'h-5 w-5',
                                  star <= Math.round(averageRating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                )}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-gray-500 mt-2">{reviews.length} avis</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div key={review.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white">
                                  {review.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{review.userName}</span>
                                    {review.verified && (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                        Vérifié
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={clsx(
                                          'h-3 w-3',
                                          star <= review.rating
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {review.title && (
                              <h4 className="text-base font-semibold text-gray-900 mb-2">{review.title}</h4>
                            )}
                            <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Produits similaires */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Produits similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similar.map((item) => {
                const Icon = shippingIcon(item.shippingOptions[0]?.id)
                const itemPrice = !item.requiresQuote
                  ? formatCurrency(item.priceAmount ?? item.shippingOptions[0]?.total ?? null, item.currency || 'FCFA')
                  : null
                return (
                  <Link
                    key={item.id}
                    href={`/produits/${item.id}`}
                    className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all group"
                  >
                    <div className="relative aspect-square bg-gray-100">
                      <Image
                        src={item.image || '/file.svg'}
                        alt={item.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{item.name}</h3>
                      <div className="text-lg font-bold text-emerald-600 mb-2">{itemPrice || 'Sur devis'}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Icon className="h-3 w-3" />
                        <span>{item.availabilityLabel || (item.availabilityStatus === 'in_stock' ? 'Stock Dakar' : 'Commande Chine')}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal négociation */}
      <AnimatePresence>
        {showNegotiation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowNegotiation(false)
              setNegotiationStatus('idle')
            }}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Négocier avec un conseiller</h3>
                  <p className="text-sm text-gray-600 mt-1">Partagez vos conditions (quantités, délais, transport préféré).</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNegotiation(false)
                    setNegotiationStatus('idle')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <textarea
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                rows={4}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none resize-none"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">Produit : {product.name}</span>
                <button
                  type="button"
                  onClick={handleNegotiationSubmit}
                  disabled={negotiationStatus === 'sending'}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {negotiationStatus === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {negotiationStatus === 'sent' ? 'Message envoyé !' : 'Envoyer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal galerie d'images */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              className="relative w-full max-w-5xl mx-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec titre et bouton fermer */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
                <h3 className="text-white font-medium text-sm truncate pr-4">{product.name}</h3>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex-shrink-0"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Image principale */}
              <div className="relative aspect-[4/3] bg-gray-950">
                <Image
                  src={gallery[activeImageIndex] || '/file.svg'}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 900px"
                  priority
                />
                
                {/* Boutons navigation gauche/droite */}
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
                      aria-label="Image précédente"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
                      aria-label="Image suivante"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Mini galerie de miniatures */}
              {gallery.length > 1 && (
                <div className="px-4 py-3 bg-gray-800/80 border-t border-gray-700">
                  <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                    {gallery.map((src, index) => (
                      <button
                        key={`modal-thumb-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={clsx(
                          'relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                          activeImageIndex === index
                            ? 'border-emerald-500 ring-2 ring-emerald-400/50 scale-105'
                            : 'border-gray-600 hover:border-gray-400 opacity-60 hover:opacity-100'
                        )}
                        aria-label={`Voir image ${index + 1}`}
                      >
                        <Image
                          src={src}
                          alt={`${product.name} ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    {activeImageIndex + 1} / {gallery.length}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
