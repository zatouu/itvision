'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
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
  X,
  ZoomIn,
  Heart,
  Package,
  TruckIcon,
  Info,
  Megaphone
} from 'lucide-react'
import type { ShippingOptionPricing } from '@/lib/logistics'
import { trackEvent } from '@/utils/analytics'
import ProductPricing1688 from '@/components/ProductPricing1688'

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

interface ProductDimensions {
  lengthCm: number
  widthCm: number
  heightCm: number
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
  sourcing: {
    platform?: string | null
    supplierName?: string | null
    supplierContact?: string | null
    productUrl?: string | null
    notes?: string | null
  } | null
  pricing1688?: {
    price1688: number
    price1688Currency: string
    exchangeRate: number
    serviceFeeRate?: number | null
    insuranceRate?: number | null
  } | null
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
  availabilityStatus?: 'in_stock' | 'preorder' | string
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
  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image || '/file.svg']
  
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
  const [quantity, setQuantity] = useState(1)
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

  const unitPrice = !product.requiresQuote
    ? (shippingEnabled && activeShipping ? activeShipping.total : product.pricing.salePrice)
    : null

  const totalPrice = useMemo(() => {
    if (!unitPrice) return null
    return unitPrice * Math.max(1, quantity)
  }, [unitPrice, quantity])

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

  const addToCart = (redirect = false) => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const id = `${product.id}${shippingKey}`
      const currency = activeShipping?.currency || product.pricing.currency
      const existsIndex = items.findIndex((item: any) => item.id === id)

      if (existsIndex >= 0) {
        items[existsIndex].qty += Math.max(1, quantity)
        items[existsIndex].price = unitPrice
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
          price: unitPrice,
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
    if (product.logistics.weightKg) {
      entries.push({ label: 'Poids net', value: `${product.logistics.weightKg.toFixed(2)} kg` })
    }
    if (product.logistics.packagingWeightKg) {
      entries.push({ label: 'Poids emballage', value: `${product.logistics.packagingWeightKg.toFixed(2)} kg` })
    }
    if (product.logistics.volumeM3) {
      entries.push({ label: 'Volume', value: `${product.logistics.volumeM3.toFixed(3)} m³` })
    }
    if (product.logistics.dimensions) {
      const { lengthCm, widthCm, heightCm } = product.logistics.dimensions
      entries.push({ label: 'Dimensions colis', value: `${lengthCm} × ${widthCm} × ${heightCm} cm` })
    }
    if (product.sourcing?.platform) {
      entries.push({ label: 'Plateforme sourcing', value: product.sourcing.platform })
    }
    if (product.sourcing?.supplierName) {
      entries.push({ label: 'Fournisseur', value: product.sourcing.supplierName })
    }
    return entries
  }, [product.logistics, product.availability.leadTimeDays, product.sourcing])

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
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 group">
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
                  className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
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

          {/* Informations produit */}
          <div className="space-y-6">
            {/* Titre et tagline */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full mb-3">
                <ShieldCheck className="h-4 w-4" />
                Sourcing sécurisé IT Vision
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3">{product.name}</h1>
              {product.tagline && (
                <p className="text-lg text-gray-600 font-medium">{product.tagline}</p>
              )}
            </div>

            {/* Prix */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
              <div className="text-sm text-emerald-700 font-semibold mb-2">Prix catalogue</div>
              <div className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                {totalPriceLabel || unitPriceLabel || 'Sur devis'}
              </div>
              {!showQuote && quantity > 1 && (
                <div className="text-sm text-gray-600">{quantity} unité(s) × {unitPriceLabel}</div>
              )}
              {deliveryDays && (
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Délai estimé : {deliveryDays} jours</span>
                </div>
              )}
            </div>

            {/* Options de livraison */}
            {shippingEnabled && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-900">Modes de transport</div>
                <div className="flex flex-wrap gap-2">
                  {product.pricing.shippingOptions.map((option) => {
                    const Icon = shippingIcon(option.id)
                    const active = option.id === selectedShippingId
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedShippingId(option.id)}
                        className={clsx(
                          'flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                          active
                            ? 'border-emerald-500 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </button>
                    )
                  })}
                </div>
                {activeShipping && (
                  <div className="rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{activeShipping.label}</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(activeShipping.cost, activeShipping.currency)}</span>
                    </div>
                    <div className="text-xs text-gray-500">Délai : {activeShipping.durationDays} jours</div>
                  </div>
                )}
              </div>
            )}

            {/* Prix d'origine */}
            {product.pricing1688 && (
              <ProductPricing1688
                productId={product.id}
                pricing1688={product.pricing1688}
                weightKg={product.logistics.weightKg}
                volumeM3={product.logistics.volumeM3}
                baseCost={product.pricing.baseCost}
              />
            )}

            {/* Options produit */}
            <div className="space-y-4">
              {product.colorOptions.filter(Boolean).length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-2">Couleurs disponibles</div>
                  <div className="flex flex-wrap gap-2">
                    {product.colorOptions.filter(Boolean).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={clsx(
                          'rounded-full px-4 py-2 text-sm font-medium border-2 transition-all',
                          selectedColor === color
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
                        )}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.variantOptions.filter(Boolean).length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-2">Variantes</div>
                  <div className="flex flex-wrap gap-2">
                    {product.variantOptions.filter(Boolean).map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={clsx(
                          'rounded-xl px-4 py-2 text-sm font-medium border-2 transition-all',
                          selectedVariant === variant
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
                        )}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantité */}
              <div className="flex items-center gap-4">
                <label htmlFor="quantity" className="text-sm font-semibold text-gray-900">Quantité</label>
                <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="px-3 py-2 hover:bg-gray-100 transition-colors"
                  >
                    −
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(Number(e.target.value))}
                    className="w-16 text-center border-0 focus:ring-0 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="px-3 py-2 hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              {!showQuote && (
                <>
                  <button
                    type="button"
                    onClick={() => addToCart(true)}
                    disabled={adding}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-4 text-base font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {adding ? 'Ajout...' : 'Acheter maintenant'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCart(false)}
                    disabled={adding}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-white text-emerald-600 px-6 py-3 text-base font-semibold hover:bg-emerald-50 transition-all disabled:opacity-50"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {adding ? 'Ajout...' : 'Ajouter au panier'}
                  </button>
                </>
              )}
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('quote_request', { productId: product.id, quantity })}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-500 bg-green-50 text-green-700 px-6 py-3 text-base font-semibold hover:bg-green-100 transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
                Demander un devis WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setShowNegotiation(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white text-gray-700 px-6 py-3 text-base font-semibold hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                Négocier le tarif
              </button>
            </div>

            <section className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Installation & marketplace techniciens</p>
                  <p className="text-xs text-gray-500">
                    Confiez l’installation à notre réseau : la mission part sur le marketplace, les techniciens
                    proposent leur prix et leur dispo.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <input
                    type="checkbox"
                    checked={wantsInstallation}
                    onChange={(e) => setWantsInstallation(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Activer
                </label>
              </div>
              {wantsInstallation && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Contact sur site</label>
                      <input
                        value={installationForm.contactName}
                        onChange={(e) => updateInstallationForm('contactName', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Nom complet"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Téléphone</label>
                      <input
                        value={installationForm.contactPhone}
                        onChange={(e) => updateInstallationForm('contactPhone', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="+221..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Email</label>
                      <input
                        type="email"
                        value={installationForm.contactEmail}
                        onChange={(e) => updateInstallationForm('contactEmail', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        placeholder="client@exemple.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Adresse / site</label>
                      <input
                        value={installationForm.address}
                        onChange={(e) => updateInstallationForm('address', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        placeholder="Quartier, ville..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Date souhaitée</label>
                      <input
                        type="date"
                        value={installationForm.preferredDate}
                        onChange={(e) => updateInstallationForm('preferredDate', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={installationForm.includeMaterials}
                        onChange={(e) => updateInstallationForm('includeMaterials', e.target.checked)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Inclure consommables & petits accessoires</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Notes / contraintes</label>
                    <textarea
                      value={installationForm.notes}
                      onChange={(e) => updateInstallationForm('notes', e.target.value)}
                      rows={3}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      placeholder="Ex: accès badge, créneaux horaires, quantité à installer..."
                    />
                  </div>
                  {installationError && (
                    <p className="text-sm text-red-600">{installationError}</p>
                  )}
                  {installationStatus === 'success' && (
                    <p className="text-sm text-emerald-600">
                      Demande publiée ! Référence marketplace {installationSuccessId?.slice(-6) || ''}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleInstallationRequest}
                    disabled={installationStatus === 'loading'}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 via-emerald-500 to-emerald-600 hover:via-emerald-600 text-white px-6 py-3 text-base font-semibold shadow-lg transition disabled:opacity-60"
                  >
                    <Megaphone className="h-5 w-5" />
                    {installationStatus === 'loading'
                      ? 'Publication en cours...'
                      : 'Publier la mission installation'}
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Les techniciens certifiés répondent depuis leur application. Vous validez l’offre idéale depuis
                    votre portail client.
                  </p>
                </>
              )}
            </section>

            {/* Actions secondaires */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={toggleFavorite}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition',
                  isFavorite
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400'
                )}
              >
                <Heart className={clsx('h-4 w-4', isFavorite && 'fill-red-500')} />
                {isFavorite ? 'Favori' : 'Favoris'}
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:text-emerald-600 transition"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </button>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleShare()}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:text-emerald-600 transition"
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </button>
                <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 bg-white border-2 border-gray-200 rounded-xl p-2 shadow-xl min-w-[180px]">
                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                  >
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShare('copy')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                  >
                    Copier le lien
                  </button>
                </div>
              </div>
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
                  className="prose max-w-none"
                >
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description || 'Description détaillée disponible sur demande auprès de nos équipes sourcing.'}
                  </p>
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
                      product.sourcing?.notes ? `Notes acheteur : ${product.sourcing.notes}` : 'Support import dédié Chine & Sénégal'
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

      {/* Modal zoom image */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              className="relative max-w-7xl max-h-[90vh] w-full h-full p-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={gallery[activeImageIndex] || '/file.svg'}
                  alt={product.name}
                  fill
                  className="object-contain p-8"
                  sizes="90vw"
                  priority
                />
              </div>
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white">
                    {activeImageIndex + 1} / {gallery.length}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
