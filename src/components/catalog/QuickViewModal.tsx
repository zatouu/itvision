'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Truck, ShoppingCart, ExternalLink, Minus, Plus, Package, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export interface QuickViewProduct {
  id: string
  name: string
  description?: string
  image?: string
  gallery?: string[]
  priceAmount?: number
  b2bPrice?: number
  currency?: string
  rating?: number
  availabilityStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  availabilityLabel?: string
  deliveryDays?: number
  features?: string[]
  shippingOptions?: Array<{
    id: string
    label: string
    cost: number
    durationDays: number
  }>
  condition?: 'new' | 'used' | 'refurbished'
  origin?: string
}

interface Props {
  product: QuickViewProduct
  onClose: () => void
  onAddToCart: (product: QuickViewProduct, qty: number) => void
}

function formatPrice(price: number, currency = 'FCFA') {
  return `${price.toLocaleString('fr-FR')} ${currency}`
}

export default function QuickViewModal({ product, onClose, onAddToCart }: Props) {
  const [qty, setQty] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const images = useMemo(() => {
    const list = product.gallery?.length ? product.gallery : [product.image || '/placeholder.svg']
    return list.filter(Boolean) as string[]
  }, [product.gallery, product.image])

  const base = product.priceAmount ?? product.b2bPrice ?? 0
  const original = (product.b2bPrice && product.b2bPrice > base) ? product.b2bPrice : undefined
  const discount = original ? Math.round(((original - base) / original) * 100) : 0
  const inStock = product.availabilityStatus === 'in_stock'

  const activeImage = images[selectedImage] || '/placeholder.svg'

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Vue rapide - ${product.name}`}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 z-10"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Images */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <Image
                    src={activeImage}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 ${selectedImage === i ? 'border-orange-500' : 'border-transparent'}`}
                      >
                        <Image src={img} alt="" fill className="object-cover" sizes="56px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-6 flex flex-col">
                <div className="mb-1">
                  {product.condition === 'new' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">Neuf</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{product.name}</h2>

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {product.rating !== undefined && product.rating > 0 && (
                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                      <Star className="w-4 h-4 fill-amber-400" /> {product.rating.toFixed(1)}
                    </span>
                  )}
                  {product.origin && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{product.origin}</span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-red-600">{formatPrice(base, product.currency)}</span>
                  {original && original > base && (
                    <span className="text-sm text-slate-400 line-through">{formatPrice(original, product.currency)}</span>
                  )}
                  {discount > 0 && (
                    <span className="text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-600 px-1.5 py-0.5 rounded">-{discount}%</span>
                  )}
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4 mb-4">
                  {product.description || 'Pas de description disponible.'}
                </p>

                {product.features && product.features.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {product.features.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span>Livraison estimée {product.deliveryDays ?? 3}j</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${inStock ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                    {product.availabilityLabel || (inStock ? 'En stock' : 'Sur commande')}
                  </span>
                </div>

                {product.shippingOptions && product.shippingOptions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Options de livraison</p>
                    <div className="flex flex-wrap gap-2">
                      {product.shippingOptions.slice(0, 3).map((s) => (
                        <span key={s.id} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                          {s.label} — {s.cost.toLocaleString('fr-FR')} FCFA
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                      <button
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-lg"
                        aria-label="Diminuer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 min-w-[2rem] text-center">{qty}</span>
                      <button
                        onClick={() => setQty(q => q + 1)}
                        className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-lg"
                        aria-label="Augmenter"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onAddToCart(product, qty)}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition"
                    >
                      <ShoppingCart className="w-4 h-4" /> Ajouter au panier
                    </button>
                    <Link
                      href={`/produits/${product.id}`}
                      className="flex items-center justify-center gap-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium rounded-xl transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
