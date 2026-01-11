'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  X,
  ZoomIn,
  Star,
  Loader2,
  CheckCircle,
  Plane,
  Ship,
  Truck
} from 'lucide-react'
import { trackEvent } from '@/utils/analytics'
import ProductPricingPanel from './ProductPricingPanel'
import ProductGroupBuyCard from '../ProductGroupBuyCard'
import GroupBuyProposalModal from '../GroupBuyProposalModal'
import ProductSidebar from '../ProductSidebar'
import { 
  ProductGalleryImmersive, 
  ProductTabsImmersive,
  type MediaItem,
  type MediaReview,
  type NewReviewData,
  type SpecGroup,
  type UsageScenario
} from './index'
import type { ProductDetailData, SimilarProductSummary } from '../ProductDetailExperience'

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

const shippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  if (methodId.includes('truck')) return Truck
  return Plane
}

interface ProductLayoutAlibabaProps {
  product: ProductDetailData
  similar: SimilarProductSummary[]
}

export default function ProductLayoutAlibaba({ product, similar }: ProductLayoutAlibabaProps) {
  // Refs pour sticky behavior
  const leftColumnRef = useRef<HTMLDivElement>(null)
  const rightColumnRef = useRef<HTMLDivElement>(null)
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const baseGallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image || '/file.svg']
  
  const getDefaultShippingOption = () => {
    if (product.pricing.shippingOptions.length === 0) return null
    const option15j = product.pricing.shippingOptions.find(opt => opt.durationDays === 15)
    if (option15j) return option15j.id
    return product.pricing.shippingOptions[0]?.id ?? null
  }
  
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(getDefaultShippingOption())
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    product.variantGroups?.forEach(group => {
      const defaultVar = group.variants.find(v => v.isDefault) || group.variants[0]
      if (defaultVar) initial[group.name] = defaultVar.id
    })
    return initial
  })
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
  const [reviews, setReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState(4.7)
  const [wantsInstallation, setWantsInstallation] = useState(true)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [mediaReviews, setMediaReviews] = useState<MediaReview[]>([])
  const [imageSearching, setImageSearching] = useState(false)
  
  // Build gallery with selected variant image first
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
  
  // Convert gallery to MediaItem[]
  const galleryMedia = useMemo<MediaItem[]>(() => {
    return gallery.map((url, idx) => {
      const isVideo = /\.(mp4|webm|mov|avi)$/i.test(url)
      return {
        type: isVideo ? 'video' : 'image',
        url,
        thumbnail: isVideo ? undefined : url,
        label: idx === 0 ? 'Photo principale' : `Photo ${idx + 1}`
      }
    })
  }, [gallery])
  
  // Build spec groups
  const specGroups = useMemo<SpecGroup[]>(() => {
    const groups: SpecGroup[] = []
    
    const physicalSpecs: { label: string; value: string }[] = []
    if (product.logistics.weightKg) {
      physicalSpecs.push({ label: 'Poids net', value: `${product.logistics.weightKg} kg` })
    }
    if (product.logistics.packagingWeightKg) {
      physicalSpecs.push({ label: 'Poids avec emballage', value: `${product.logistics.packagingWeightKg} kg` })
    }
    if (product.logistics.volumeM3) {
      physicalSpecs.push({ label: 'Volume', value: `${product.logistics.volumeM3} m³` })
    }
    if (product.logistics.dimensions) {
      physicalSpecs.push({ 
        label: 'Dimensions', 
        value: `${product.logistics.dimensions.lengthCm} × ${product.logistics.dimensions.widthCm} × ${product.logistics.dimensions.heightCm} cm` 
      })
    }
    if (physicalSpecs.length > 0) {
      groups.push({ name: 'Dimensions & Poids', specs: physicalSpecs })
    }
    
    if (product.colorOptions.length > 0 || product.variantOptions.length > 0) {
      const optionSpecs: { label: string; value: string }[] = []
      if (product.colorOptions.filter(Boolean).length > 0) {
        optionSpecs.push({ label: 'Couleurs disponibles', value: product.colorOptions.filter(Boolean).join(', ') })
      }
      if (product.variantOptions.filter(Boolean).length > 0) {
        optionSpecs.push({ label: 'Variantes', value: product.variantOptions.filter(Boolean).join(', ') })
      }
      if (optionSpecs.length > 0) {
        groups.push({ name: 'Options', specs: optionSpecs })
      }
    }
    
    return groups
  }, [product.logistics, product.colorOptions, product.variantOptions])
  
  // Usage scenarios
  const usageScenarios = useMemo<UsageScenario[]>(() => {
    return [
      {
        id: 'home',
        title: 'Usage domestique',
        description: 'Parfait pour les particuliers.',
        icon: 'home',
        image: product.image || '/file.svg',
        features: ['Installation facile', 'Design adapté', 'Utilisation intuitive']
      },
      {
        id: 'business',
        title: 'Usage professionnel',
        description: 'Solution pour entreprises.',
        icon: 'business',
        image: product.image || '/file.svg',
        features: ['Performance fiable', 'Support technique', 'Garantie étendue']
      }
    ]
  }, [product.image])
  
  // Convert reviews
  const immersiveReviews = useMemo<MediaReview[]>(() => {
    if (mediaReviews.length > 0) return mediaReviews
    return reviews.map(r => ({
      id: r.id || String(Math.random()),
      userId: r.userId || 'anonymous',
      userName: r.userName || 'Client IT Vision',
      rating: r.rating || 5,
      comment: r.comment || r.text || '',
      helpful: r.helpful || 0,
      createdAt: r.createdAt || new Date().toISOString(),
      verified: true
    }))
  }, [reviews, mediaReviews])
  
  // Calculate prices
  const effectivePrice = product.pricing.totalWithFees ?? product.pricing.salePrice
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  
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
    // Load mock reviews
    const mockReviews = [
      {
        id: '1',
        userName: 'Jean D.',
        rating: 5,
        title: 'Excellent produit',
        comment: 'Produit de très bonne qualité, livraison rapide et installation professionnelle.',
        verified: true,
        helpful: 12,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        userName: 'Marie L.',
        rating: 4,
        title: 'Très satisfait',
        comment: 'Bon rapport qualité/prix. Le support client est réactif.',
        verified: true,
        helpful: 8,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    setReviews(mockReviews)
    const avg = mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length
    setAverageRating(avg)
  }, [])
  
  useEffect(() => {
    if (!shareFeedback) return
    const timeout = setTimeout(() => setShareFeedback(null), 2500)
    return () => clearTimeout(timeout)
  }, [shareFeedback])
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
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
  
  const addToCart = (redirect = false) => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const activeShipping = product.pricing.shippingOptions.find(o => o.id === selectedShippingId)
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const id = `${product.id}${shippingKey}`
      const currency = activeShipping?.currency || product.pricing.currency

      const existsIndex = items.findIndex((item: any) => item.id === id)
      const basePrice = effectivePrice ?? 0

      if (existsIndex >= 0) {
        items[existsIndex].qty += Math.max(1, quantity)
        items[existsIndex].price = basePrice
        items[existsIndex].currency = currency
        items[existsIndex].wantsInstallation = items[existsIndex].wantsInstallation || wantsInstallation
      } else {
        items.push({
          id,
          name: product.name,
          qty: Math.max(1, quantity),
          price: basePrice,
          currency,
          requiresQuote: !!product.requiresQuote,
          image: product.image || (product.gallery?.[0]) || null,
          wantsInstallation,
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
  
  const handleShare = async (platform?: string) => {
    try {
      if (typeof window === 'undefined') return
      const url = window.location.href
      
      if (platform === 'copy' || !platform) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url)
          setShareFeedback('Lien copié !')
        }
      }
    } catch (error) {
      console.error('share error', error)
      setShareFeedback('Erreur lors du partage')
    }
  }
  
  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(16, 185, 129)
      doc.text(product.name, 14, 20)
      doc.save(`${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
    } catch (error) {
      console.error('PDF export error:', error)
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
    } catch {
      setNegotiationStatus('idle')
    }
  }
  
  const handleImageSearch = async (file: File) => {
    setImageSearching(true)
    try {
      trackEvent('image_search_initiated', { productId: product.id, fileName: file.name })
      alert(`Recherche par image: ${file.name}\nCette fonctionnalité sera bientôt disponible !`)
    } finally {
      setImageSearching(false)
    }
  }
  
  const handleSubmitReview = async (data: NewReviewData) => {
    trackEvent('review_submitted', { productId: product.id, rating: data.rating })
    const newReview: MediaReview = {
      id: `review-${Date.now()}`,
      userId: 'current-user',
      userName: 'Vous',
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      helpful: 0,
      createdAt: new Date().toISOString(),
      verified: false
    }
    setMediaReviews(prev => [newReview, ...prev])
  }
  
  const handleMarkHelpful = async (reviewId: string, helpful: boolean) => {
    trackEvent('review_helpful', { reviewId, helpful })
  }
  
  const handleVariantSelect = (groupName: string, variantId: string) => {
    setSelectedVariants(prev => ({ ...prev, [groupName]: variantId }))
  }
  
  const handleVariantQuantityChange = (variantId: string, delta: number) => {
    setVariantQuantities(prev => ({
      ...prev,
      [variantId]: Math.max(0, (prev[variantId] || 0) + delta)
    }))
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Breadcrumb */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LAYOUT ALIBABA: Left scrollable, Right sticky                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* COLONNE GAUCHE - Scrollable (Galerie + Contenu détaillé)       */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div ref={leftColumnRef} className="flex-1 lg:max-w-[calc(100%-420px)] space-y-6">
            
            {/* Titre produit (visible sur mobile) */}
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {product.tagline && (
                <p className="text-sm text-gray-600 mt-1">{product.tagline}</p>
              )}
            </div>
            
            {/* Galerie d'images */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-6">
              <ProductGalleryImmersive
                media={galleryMedia}
                productName={product.name}
                availabilityBadge={{
                  status: product.availability.status,
                  label: product.availability.label
                }}
                selectedIndex={activeImageIndex}
                onIndexChange={setActiveImageIndex}
                onImageSearch={handleImageSearch}
                showImageSearch={true}
                className="mx-auto"
              />
            </div>
            
            {/* ════════════════════════════════════════════════════════════ */}
            {/* ONGLETS CONTENU (Description, Specs, Avis, etc.)            */}
            {/* ════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200">
              <ProductTabsImmersive
                productId={product.id}
                description={product.description}
                features={product.features.filter(Boolean).length > 0 
                  ? product.features.filter(Boolean) 
                  : ['Qualité professionnelle import Chine', 'Installation & support IT Vision Dakar', 'Tarification optimisée selon le mode de transport']
                }
                specGroups={specGroups}
                scenarios={usageScenarios}
                richImages={gallery.slice(0, 5)}
                reviews={immersiveReviews}
                averageRating={averageRating}
                totalReviews={immersiveReviews.length}
                onLoadMoreReviews={async () => {}}
                onSubmitReview={handleSubmitReview}
                onMarkHelpful={handleMarkHelpful}
                canReview={true}
                hasReviewed={false}
                stickyTabs={true}
                defaultTab="description"
              />
            </div>
            
            {/* Produits similaires */}
            {similar.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Produits similaires</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {similar.slice(0, 6).map((item) => {
                    const Icon = shippingIcon(item.shippingOptions[0]?.id)
                    const itemPrice = !item.requiresQuote
                      ? formatCurrency(item.priceAmount ?? item.shippingOptions[0]?.total ?? null, item.currency || 'FCFA')
                      : null
                    return (
                      <Link
                        key={item.id}
                        href={`/produits/${item.id}`}
                        className="group bg-gray-50 rounded-xl border border-gray-100 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all"
                      >
                        <div className="relative aspect-square bg-white">
                          <Image
                            src={item.image || '/file.svg'}
                            alt={item.name}
                            fill
                            className="object-contain p-3 group-hover:scale-105 transition-transform"
                            sizes="(max-width: 640px) 50vw, 200px"
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{item.name}</h3>
                          <div className="text-base font-bold text-emerald-600">{itemPrice || 'Sur devis'}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* COLONNE DROITE - Sticky (Prix, Actions, Sidebar)               */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div 
            ref={rightColumnRef}
            className="lg:w-[400px] lg:flex-shrink-0"
          >
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Titre produit (desktop) */}
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
                {product.tagline && (
                  <p className="text-sm text-gray-600 mt-1">{product.tagline}</p>
                )}
                {/* Rating summary */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={clsx(
                          'w-4 h-4',
                          star <= Math.round(averageRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {averageRating.toFixed(1)} ({immersiveReviews.length} avis)
                  </span>
                </div>
              </div>
              
              {/* Panel de prix sticky */}
              <ProductPricingPanel
                productId={product.id}
                productName={product.name}
                productImage={product.image}
                currency={product.pricing.currency}
                pricing={{
                  baseCost: product.pricing.baseCost,
                  salePrice: product.pricing.salePrice,
                  fees: product.pricing.fees,
                  totalWithFees: product.pricing.totalWithFees,
                  shippingOptions: product.pricing.shippingOptions.map(o => ({
                    id: o.id,
                    label: o.label,
                    durationDays: o.durationDays,
                    cost: o.cost,
                    currency: o.currency
                  }))
                }}
                availability={{
                  status: product.availability.status,
                  label: product.availability.label,
                  stockQuantity: product.availability.stockQuantity
                }}
                isImported={product.isImported}
                requiresQuote={product.requiresQuote}
                variantGroups={product.variantGroups}
                colorOptions={product.colorOptions}
                variantOptions={product.variantOptions}
                priceTiers={product.priceTiers}
                groupBuyEnabled={product.groupBuyEnabled}
                onAddToCart={addToCart}
                onToggleFavorite={toggleFavorite}
                onShare={handleShare}
                onExportPDF={handleExportPDF}
                onNegotiate={() => setShowNegotiation(true)}
                onProposeGroupBuy={() => setShowProposalModal(true)}
                isFavorite={isFavorite}
                adding={adding}
                wantsInstallation={wantsInstallation}
                onWantsInstallationChange={setWantsInstallation}
                selectedShippingId={selectedShippingId}
                onShippingChange={setSelectedShippingId}
                quantity={quantity}
                onQuantityChange={(v) => setQuantity(Math.max(1, v))}
                selectedVariants={selectedVariants}
                onVariantSelect={handleVariantSelect}
                variantQuantities={variantQuantities}
                onVariantQuantityChange={handleVariantQuantityChange}
              />
              
              {/* Carte achat groupé */}
              {product.groupBuyEnabled && (
                <ProductGroupBuyCard 
                  productId={product.id}
                  onPropose={() => setShowProposalModal(true)}
                />
              )}
              
              {/* Mini sidebar promotions */}
              <div className="hidden xl:block">
                <ProductSidebar currentProductId={product.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
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
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Négocier avec un conseiller</h3>
                  <p className="text-sm text-gray-600 mt-1">Partagez vos conditions (quantités, délais, transport).</p>
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
                  {negotiationStatus === 'sent' ? 'Envoyé !' : 'Envoyer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal galerie images */}
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
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
                <h3 className="text-white font-medium text-sm truncate pr-4">{product.name}</h3>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative aspect-[4/3] bg-gray-950">
                <Image
                  src={gallery[activeImageIndex] || '/file.svg'}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 900px"
                  priority
                />
                
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

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
                            : 'border-gray-600 opacity-60 hover:opacity-100'
                        )}
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

      {/* Modal proposition achat groupé */}
      <GroupBuyProposalModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        product={{
          id: product.id,
          name: product.name,
          basePrice: product.pricing.salePrice || 0,
          currency: product.pricing.currency || 'FCFA',
          image: product.image || '/images/placeholder.png',
          groupBuyMinQty: product.groupBuyMinQty || 10,
          groupBuyTargetQty: product.groupBuyTargetQty || 50,
          priceTiers: product.priceTiers
        }}
      />
      
      {/* Toast feedback */}
      <AnimatePresence>
        {shareFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          >
            {shareFeedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
