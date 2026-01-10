'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  X,
  ZoomIn,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export interface ProductGalleryProps {
  /** Liste des URLs d'images */
  images: string[]
  /** Nom du produit (alt des images) */
  productName: string
  /** Badge de disponibilité */
  availabilityBadge?: {
    status: 'in_stock' | 'preorder' | string
    label: string
  }
  /** Index de l'image sélectionnée (contrôle externe optionnel) */
  selectedIndex?: number
  /** Callback lors du changement d'image */
  onImageChange?: (index: number) => void
  /** Classe CSS additionnelle */
  className?: string
}

export default function ProductGallery({
  images,
  productName,
  availabilityBadge,
  selectedIndex: externalIndex,
  onImageChange,
  className
}: ProductGalleryProps) {
  // Index interne si non contrôlé de l'extérieur
  const [internalIndex, setInternalIndex] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })

  // Déterminer l'index actif (contrôlé ou non)
  const activeIndex = externalIndex ?? internalIndex
  const setActiveIndex = (index: number) => {
    setInternalIndex(index)
    onImageChange?.(index)
  }

  // Galerie par défaut si vide
  const gallery = images.length > 0 ? images : ['/file.svg']

  // Navigation
  const goToPrevious = useCallback(() => {
    setActiveIndex(activeIndex === 0 ? gallery.length - 1 : activeIndex - 1)
  }, [activeIndex, gallery.length])

  const goToNext = useCallback(() => {
    setActiveIndex(activeIndex === gallery.length - 1 ? 0 : activeIndex + 1)
  }, [activeIndex, gallery.length])

  // Gestion des raccourcis clavier pour le modal
  useEffect(() => {
    if (!showModal) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        setIsZoomed(false)
      } else if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, goToPrevious, goToNext])

  // Gestion du zoom sur l'image principale dans le modal
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    setZoomPosition({ x, y })
  }

  // Swipe support pour mobile
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) goToNext()
    if (isRightSwipe) goToPrevious()
  }

  return (
    <>
      <div className={clsx('space-y-4', className)}>
        {/* Image principale */}
        <div
          className="relative aspect-[4/3] max-h-[400px] lg:max-h-[450px] rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 group"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="absolute inset-0 cursor-zoom-in"
            aria-label="Agrandir l'image"
          >
            <Image
              src={gallery[activeIndex] || '/file.svg'}
              alt={`${productName} - Image ${activeIndex + 1}`}
              fill
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 450px"
              priority={activeIndex === 0}
            />

            {/* Indicateur zoom hover */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold text-gray-700 shadow-lg">
              <ZoomIn className="h-4 w-4" />
              <span>Cliquer pour agrandir</span>
            </div>
          </button>

          {/* Badge disponibilité */}
          {availabilityBadge && (
            <div
              className={clsx(
                'absolute top-4 right-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-sm',
                availabilityBadge.status === 'in_stock'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {availabilityBadge.label}
            </div>
          )}

          {/* Navigation flèches (visible au hover sur desktop) */}
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="Image précédente"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="Image suivante"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </>
          )}

          {/* Indicateur de position (dots) pour mobile */}
          {gallery.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden">
              {gallery.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveIndex(idx)
                  }}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-all',
                    activeIndex === idx
                      ? 'bg-emerald-500 w-4'
                      : 'bg-white/70 hover:bg-white'
                  )}
                  aria-label={`Aller à l'image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Miniatures (desktop) */}
        {gallery.length > 1 && (
          <div className="hidden lg:flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
            {gallery.map((src, index) => (
              <button
                key={`thumb-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={clsx(
                  'relative h-20 w-20 flex-shrink-0 rounded-xl border-2 transition-all',
                  activeIndex === index
                    ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-emerald-300'
                )}
                aria-label={`Voir image ${index + 1}`}
              >
                <Image
                  src={src}
                  alt={`${productName} - Miniature ${index + 1}`}
                  fill
                  className="object-cover rounded-lg"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}

        {/* Miniatures horizontales scrollables (mobile) */}
        {gallery.length > 1 && (
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {gallery.map((src, index) => (
              <button
                key={`thumb-mobile-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={clsx(
                  'relative h-16 w-16 flex-shrink-0 rounded-lg border-2 transition-all snap-center',
                  activeIndex === index
                    ? 'border-emerald-500 ring-2 ring-emerald-200'
                    : 'border-gray-200'
                )}
                aria-label={`Voir image ${index + 1}`}
              >
                <Image
                  src={src}
                  alt={`${productName} - Miniature ${index + 1}`}
                  fill
                  className="object-cover rounded-md"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal plein écran avec zoom */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowModal(false)
              setIsZoomed(false)
            }}
          >
            <motion.div
              className="relative w-full max-w-6xl mx-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
                <h3 className="text-white font-medium text-sm truncate pr-4">
                  {productName}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Bouton zoom toggle */}
                  <button
                    type="button"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className={clsx(
                      'p-1.5 rounded-full text-white transition flex-shrink-0',
                      isZoomed ? 'bg-emerald-500' : 'bg-white/10 hover:bg-white/20'
                    )}
                    aria-label={isZoomed ? 'Désactiver le zoom' : 'Activer le zoom'}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setIsZoomed(false)
                    }}
                    className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex-shrink-0"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Image principale avec zoom */}
              <div
                className={clsx(
                  'relative aspect-[4/3] bg-gray-950 overflow-hidden',
                  isZoomed && 'cursor-crosshair'
                )}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setZoomPosition({ x: 50, y: 50 })}
              >
                <Image
                  src={gallery[activeIndex] || '/file.svg'}
                  alt={`${productName} - Image ${activeIndex + 1}`}
                  fill
                  className={clsx(
                    'transition-transform duration-200',
                    isZoomed ? 'scale-200 object-cover' : 'object-contain p-4'
                  )}
                  style={
                    isZoomed
                      ? {
                          transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                        }
                      : undefined
                  }
                  sizes="(max-width: 768px) 100vw, 1200px"
                  priority
                />

                {/* Navigation flèches */}
                {gallery.length > 1 && !isZoomed && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToPrevious()
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
                        goToNext()
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
                      aria-label="Image suivante"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Info zoom */}
                {isZoomed && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 rounded-full text-white text-xs">
                    Déplacez la souris pour explorer • Cliquez sur 🔍 pour désactiver
                  </div>
                )}
              </div>

              {/* Miniatures en bas */}
              {gallery.length > 1 && (
                <div className="px-4 py-3 bg-gray-800/80 border-t border-gray-700">
                  <div className="flex gap-2 overflow-x-auto pb-1 justify-center scrollbar-thin scrollbar-thumb-gray-600">
                    {gallery.map((src, index) => (
                      <button
                        key={`modal-thumb-${index}`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={clsx(
                          'relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                          activeIndex === index
                            ? 'border-emerald-500 ring-2 ring-emerald-400/50 scale-105'
                            : 'border-gray-600 hover:border-gray-400 opacity-60 hover:opacity-100'
                        )}
                        aria-label={`Voir image ${index + 1}`}
                      >
                        <Image
                          src={src}
                          alt={`${productName} - Miniature ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    {activeIndex + 1} / {gallery.length} • Utilisez ← → pour naviguer
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
