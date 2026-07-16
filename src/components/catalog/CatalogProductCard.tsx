'use client'

import Link from 'next/link'
import { Heart, Truck } from 'lucide-react'
import { motion } from 'framer-motion'

export interface CatalogProduct {
  id: string
  name: string
  image: string
  price: number
  originalPrice?: number
  currency: string
  rating?: number
  soldCount?: number
  stockLeft?: number
  badges?: string[]
  origin?: string
  deliveryDays?: number
  isGroupBuy?: boolean
  groupProgress?: number
  groupTarget?: number
  daysLeft?: number
  isFlash?: boolean
  isNew?: boolean
  discount?: number
  colorVariants?: string[]
}

interface Props {
  product: CatalogProduct
  index: number
  isFavorite: boolean
  onToggleFavorite: (e: React.MouseEvent, id: string) => void
  onAddToCart: (product: CatalogProduct) => void
  onQuickView?: (product: CatalogProduct) => void
}

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString('fr-FR')} ${currency}`
}

export default function CatalogProductCard({
  product,
  index,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onQuickView,
}: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 10) * 0.03 }}
      whileHover={{ y: -4 }}
      className="group relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] hover:border-orange-200 transition-all duration-200"
    >
      {/* Image carrée */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {/* Clickable image overlay */}
        <Link
          href={`/produits/${product.id}`}
          className="absolute inset-0 z-0"
          aria-label={`Voir ${product.name}`}
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>

        {/* Diagonal discount badge */}
        {product.discount && product.discount > 0 && (
          <span className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg z-10 pointer-events-none">
            -{product.discount}%
          </span>
        )}

        {/* Badges floating top-right stack */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 pointer-events-none">
          {product.isFlash && (
            <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
              ⚡ Flash
            </span>
          )}
          {product.isGroupBuy && (
            <span className="bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              👥 Groupe
            </span>
          )}
          {product.isNew && (
            <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              ✨ Nouveau
            </span>
          )}
          {product.origin === 'Stock Dakar' && (
            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              Stock Dakar
            </span>
          )}
          {product.origin === 'Import Chine' && (
            <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              Import Chine
            </span>
          )}
        </div>

        {/* Heart favorite top-left (below discount) - always visible on mobile */}
        <button
          type="button"
          onClick={(e) => onToggleFavorite(e, product.id)}
          className="absolute top-2 left-2 mt-5 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-full hover:bg-white dark:hover:bg-slate-900 shadow-sm transition-colors z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Ajouter aux favoris"
        >
          <Heart
            className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
          />
        </button>

        {/* Quick actions - always visible on mobile / hover on desktop */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
          <div className="flex gap-1">
            {onQuickView ? (
              <button
                onClick={(e) => { e.stopPropagation(); onQuickView(product) }}
                className="flex-1 bg-white text-slate-900 text-xs font-medium py-1.5 rounded text-center pointer-events-auto"
              >
                Vue rapide
              </button>
            ) : (
              <Link
                href={`/produits/${product.id}`}
                className="flex-1 bg-white text-slate-900 text-xs font-medium py-1.5 rounded text-center pointer-events-auto"
              >
                Voir
              </Link>
            )}
            <button
              onClick={() => onAddToCart(product)}
              className="flex-1 bg-orange-500 text-white text-xs font-medium py-1.5 rounded hover:bg-orange-600 pointer-events-auto"
            >
              + Panier
            </button>
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="p-2.5 space-y-1">
        <h3 className="text-[11px] font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug min-h-[2rem]">
          {product.name}
        </h3>

        {/* Rating + sold */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          {product.rating !== undefined && product.rating > 0 && (
            <>
              <span className="text-amber-400">★</span>
              <span>{product.rating.toFixed(1)}</span>
            </>
          )}
          {product.soldCount !== undefined && product.soldCount > 0 && (
            <span className="text-slate-400 dark:text-slate-500">· {product.soldCount}+ vendus</span>
          )}
        </div>

        {/* Price row - Alibaba/Temu style : big red price */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-red-600">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through">
              {formatPrice(product.originalPrice, product.currency)}
            </span>
          )}
          {product.discount && product.discount > 0 && (
            <span className="text-[10px] bg-red-50 dark:bg-red-950/30 text-red-600 px-1 rounded">
              -{product.discount}%
            </span>
          )}
        </div>

        {/* Color swatches mini */}
        {product.colorVariants && product.colorVariants.length > 0 && (
          <div className="flex gap-1 pt-0.5">
            {product.colorVariants.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: c }}
              />
            ))}
            {product.colorVariants.length > 4 && (
              <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-3">+{product.colorVariants.length - 4}</span>
            )}
          </div>
        )}

        {/* Bottom tag : delivery OR group buy progress */}
        {product.isGroupBuy ? (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10px] text-violet-700 dark:text-violet-400">
              <span>{product.groupProgress}/{product.groupTarget} participants</span>
              <span>{product.daysLeft}j restants</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
                style={{
                  width: `${Math.min(100, ((product.groupProgress || 0) / (product.groupTarget || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
            <Truck className="w-3 h-3" />
            <span>Livraison {product.deliveryDays ?? 3}j</span>
            {product.origin === 'Stock Dakar' && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">· En stock</span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  )
}
