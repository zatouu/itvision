'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, X, ArrowRight, ShoppingCart } from 'lucide-react'
import type { ShippingOptionPricing } from '@/lib/logistics'
import { trackEvent } from '@/utils/analytics'
import PromoBanner from './product-detail/PromoBanner'
import ProductGallery from './product-detail/ProductGallery'
import ProductInfo from './product-detail/ProductInfo'
import ProductOptions from './product-detail/ProductOptions'
import PriceActions from './product-detail/PriceActions'
import ProductTabs from './product-detail/ProductTabs'
import RelatedProducts from './product-detail/RelatedProducts'
import Image from 'next/image'
import clsx from 'clsx'

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

interface RecentProduct {
  id: string
  name: string
  image?: string | null
  priceLabel: string | null
  href: string
}

const availabilityBadge = (status?: string) => {
  if (status === 'in_stock') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
  if (status === 'preorder') return 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
  return 'bg-slate-500/10 text-slate-200 border border-slate-500/20'
}

export default function ProductDetailExperience({ product, similar }: ProductDetailExperienceProps) {
  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image || '/file.svg']
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(product.pricing.shippingOptions[0]?.id ?? null)
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colorOptions.filter(Boolean)[0] ?? null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(product.variantOptions.filter(Boolean)[0] ?? null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [showNegotiation, setShowNegotiation] = useState(false)
  const [negotiationMessage, setNegotiationMessage] = useState('Bonjour, je souhaite discuter du tarif et des délais pour ce produit.')
  const [negotiationStatus, setNegotiationStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [recent, setRecent] = useState<RecentProduct[]>([])
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)

  const shippingEnabled = product.pricing.shippingOptions.length > 0 && product.availability.status !== 'in_stock'

  useEffect(() => {
    if (!shippingEnabled) {
      setSelectedShippingId(null)
      return
    }
    if (!selectedShippingId || !product.pricing.shippingOptions.find((option) => option.id === selectedShippingId)) {
      setSelectedShippingId(product.pricing.shippingOptions[0]?.id ?? null)
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
  const baseCostLabel = formatCurrency(product.pricing.baseCost, product.pricing.currency)
  const marginLabel = typeof product.pricing.marginRate === 'number' ? `${product.pricing.marginRate}%` : null

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

  const handleExportPDF = async () => {
    try {
      // Import dynamique de jsPDF pour éviter les erreurs SSR
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      
      // Titre
      doc.setFontSize(20)
      doc.setTextColor(16, 185, 129) // Emerald
      doc.text(product.name, 14, 20)
      
      // Tagline
      if (product.tagline) {
        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text(product.tagline, 14, 30)
      }
      
      // Description
      if (product.description) {
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        const splitDescription = doc.splitTextToSize(product.description, 180)
        doc.text(splitDescription, 14, 45)
      }
      
      // Prix
      let yPos = 65
      doc.setFontSize(14)
      doc.setTextColor(16, 185, 129)
      doc.text(`Prix: ${product.pricing.priceLabel || 'Sur devis'}`, 14, yPos)
      
      // Disponibilité
      yPos += 10
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Disponibilité: ${product.availability.label || 'Sur commande'}`, 14, yPos)
      
      // Caractéristiques
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
        yPos += product.features.slice(0, 10).length * 6
      }
      
      // Informations logistiques
      if (product.logistics) {
        yPos += 15
        doc.setFontSize(12)
        doc.setTextColor(16, 185, 129)
        doc.text('Informations logistiques:', 14, yPos)
        
        yPos += 8
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        
        const logisticsData: string[][] = []
        if (product.logistics.weightKg) {
          logisticsData.push(['Poids', `${product.logistics.weightKg} kg`])
        }
        if (product.logistics.dimensions) {
          logisticsData.push([
            'Dimensions',
            `${product.logistics.dimensions.lengthCm} × ${product.logistics.dimensions.widthCm} × ${product.logistics.dimensions.heightCm} cm`
          ])
        }
        if (product.logistics.volumeM3) {
          logisticsData.push(['Volume', `${product.logistics.volumeM3} m³`])
        }
        
        if (logisticsData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Propriété', 'Valeur']],
            body: logisticsData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            margin: { left: 14, right: 14 }
          })
        }
      }
      
      // Pied de page
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
      
      // Sauvegarder
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
          // Fallback pour navigateurs sans clipboard API
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

  const handleQuantityChange = (value: number) => {
    if (!Number.isFinite(value)) return
    setQuantity(Math.max(1, Math.round(value)))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const recentRaw = window.localStorage.getItem('catalog:recent')
    let items: RecentProduct[] = []
    if (recentRaw) {
      try {
        items = JSON.parse(recentRaw)
      } catch (error) {
        console.error('parse recent products failed', error)
      }
    }

    const currentEntry: RecentProduct = {
      id: product.id,
      name: product.name,
      image: product.image ?? product.gallery?.[0] ?? '/file.svg',
      priceLabel: unitPriceLabel,
      href: `/produits/${product.id}`
    }

    const filtered = items.filter((item) => item.id !== product.id)
    const updated = [currentEntry, ...filtered].slice(0, 8)
    window.localStorage.setItem('catalog:recent', JSON.stringify(updated))
    setRecent(updated.filter((item) => item.id !== product.id))
  }, [product.id, product.name, product.image, product.gallery, unitPriceLabel])

  useEffect(() => {
    if (!shareFeedback) return
    const timeout = setTimeout(() => setShareFeedback(null), 2500)
    return () => clearTimeout(timeout)
  }, [shareFeedback])

  // Vérifier si le produit est en favoris
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      setIsFavorite(favorites.includes(product.id))
    } catch {
      setIsFavorite(false)
    }
  }, [product.id])

  // Écouter les mises à jour de la wishlist
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

  const showQuote = product.requiresQuote || unitPrice === null
  const deliveryDays = activeShipping?.durationDays ?? product.availability.leadTimeDays ?? null

  const availabilityClass = availabilityBadge(product.availability.status)

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0c1021] via-slate-950 to-[#0c1021] text-slate-200">
      {/* Effet d'arrière-plan radial amélioré */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        {/* Bandeau promo animé */}
        <PromoBanner />
        {/* Breadcrumb modernisé avec glassmorphism */}
        <motion.nav
          className="text-sm text-slate-400 flex items-center gap-2 flex-wrap bg-slate-900/30 backdrop-blur-sm border border-slate-800/50 rounded-2xl px-4 py-3"
          aria-label="Fil d'Ariane"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/" className="hover:text-emerald-400 transition-colors font-medium">🏠 Accueil</Link>
          <span className="text-slate-600">›</span>
          <Link href="/produits" className="hover:text-emerald-400 transition-colors font-medium">Produits</Link>
          {product.category && (
            <>
              <span className="text-slate-600">›</span>
              <span className="text-slate-300 font-medium">{product.category}</span>
            </>
          )}
          <span className="text-slate-600">›</span>
          <span className="text-emerald-300/90 line-clamp-1 font-semibold">{product.name}</span>
        </motion.nav>

        <div className="flex flex-col xl:flex-row gap-8">
          <aside className="hidden xl:block w-64 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-4">
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Derniers consultés</h3>
              {recent.length === 0 && <p className="text-xs text-slate-500">Les produits consultés récemment s’afficheront ici.</p>}
              <div className="space-y-3">
                {recent.map((item) => (
                  <Link key={item.id} href={item.href} className="flex gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-2.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition">
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-800">
                      <Image
                        src={item.image || '/file.svg'}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-100 line-clamp-2">{item.name}</p>
                      <p className="text-[11px] text-emerald-300">{item.priceLabel || 'Sur devis'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-8">
            {/* Section principale produit avec glassmorphism */}
            <motion.section
              className="rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-emerald-500/10 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] p-6 sm:p-8">
                {/* Section gauche : Galerie + Infos */}
                <div className="space-y-8">
                  {/* Galerie produit modernisée */}
                  <ProductGallery
                    gallery={gallery}
                    productName={product.name}
                    availabilityClass={availabilityClass}
                    availabilityLabel={product.availability.label}
                  />

                  {/* Informations produit */}
                  <ProductInfo
                    name={product.name}
                    tagline={product.tagline}
                    baseCostLabel={baseCostLabel}
                    marginLabel={marginLabel}
                    deliveryDays={deliveryDays}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onExportPDF={handleExportPDF}
                    onShare={handleShare}
                    shareFeedback={shareFeedback}
                  />

                  {/* Options produit (couleurs, variantes, quantité) */}
                  <ProductOptions
                    colorOptions={product.colorOptions}
                    variantOptions={product.variantOptions}
                    selectedColor={selectedColor}
                    selectedVariant={selectedVariant}
                    quantity={quantity}
                    unitPriceLabel={unitPriceLabel}
                    totalPriceLabel={totalPriceLabel}
                    onColorChange={setSelectedColor}
                    onVariantChange={setSelectedVariant}
                    onQuantityChange={handleQuantityChange}
                  />
                </div>

                {/* Section droite : Prix et actions */}
                <PriceActions
                  totalPriceLabel={totalPriceLabel}
                  unitPriceLabel={unitPriceLabel}
                  quantity={quantity}
                  showQuote={showQuote}
                  availabilityClass={availabilityClass}
                  availabilityNote={product.availability.note || product.pricing.availabilitySubLabel || 'Suivi logistique assuré par IT Vision'}
                  shippingEnabled={shippingEnabled}
                  shippingOptions={product.pricing.shippingOptions}
                  selectedShippingId={selectedShippingId}
                  activeShipping={activeShipping}
                  adding={adding}
                  onShippingChange={setSelectedShippingId}
                  onAddToCart={addToCart}
                  onNegotiate={() => setShowNegotiation(true)}
                  onWhatsApp={() => {
                    trackEvent('quote_request', { productId: product.id, quantity })
                    window.open(whatsappUrl(), '_blank')
                  }}
                  formatCurrency={formatCurrency}
                />
            </motion.section>

            {/* Section onglets produit (description, caractéristiques, etc.) */}
            <ProductTabs
              description={product.description || 'Description détaillée disponible sur demande auprès de nos équipes sourcing.'}
              features={product.features}
              logistics={product.logistics}
              sourcing={product.sourcing}
              leadTimeDays={product.availability.leadTimeDays}
              selectedColor={selectedColor}
              selectedVariant={selectedVariant}
              quantity={quantity}
            />
          </main>

          {/* Aside droite : Produits similaires et complémentaires */}
          <aside className="w-full xl:w-72">
            <RelatedProducts
              similar={similar}
              productUrl={product.sourcing?.productUrl}
              formatCurrency={formatCurrency}
            />
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {!showQuote && unitPriceLabel && (
          <motion.div
            className="fixed inset-x-4 bottom-4 z-40 md:hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 backdrop-blur px-4 py-3 flex items-center justify-between gap-4 shadow-lg shadow-emerald-500/20">
              <div>
                <div className="text-xs text-emerald-100/80">Total</div>
                <div className="text-base font-semibold text-emerald-50">{totalPriceLabel || unitPriceLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => addToCart(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                <ShoppingCart className="h-4 w-4" /> Acheter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNegotiation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Négocier avec un conseiller</h3>
                  <p className="text-xs text-slate-500 mt-1">Partagez vos conditions (quantités, délais, transport préféré). Nos équipes vous recontactent sous 24h.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNegotiation(false)
                    setNegotiationStatus('idle')
                  }}
                  className="text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                rows={4}
                className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">Produit : {product.name}</span>
                <button
                  type="button"
                  onClick={handleNegotiationSubmit}
                  disabled={negotiationStatus === 'sending'}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  {negotiationStatus === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {negotiationStatus === 'sent' ? 'Message envoyé !' : 'Envoyer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
