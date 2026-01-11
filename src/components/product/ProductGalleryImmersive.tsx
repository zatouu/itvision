'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  X,
  ZoomIn,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Camera,
  ImageIcon,
  Upload,
  Search,
  Loader2,
  CheckCircle
} from 'lucide-react'

export interface MediaItem {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  label?: string // ex: "Photo produit", "Installation", "Schéma technique"
}

export interface ProductGalleryImmersiveProps {
  /** Liste des médias (images et vidéos) */
  media: MediaItem[]
  /** Nom du produit (alt des images) */
  productName: string
  /** Badge de disponibilité */
  availabilityBadge?: {
    status: 'in_stock' | 'preorder' | string
    label: string
  }
  /** Index sélectionné (contrôle externe) */
  selectedIndex?: number
  /** Callback changement d'index */
  onIndexChange?: (index: number) => void
  /** Callback pour recherche par image */
  onImageSearch?: (file: File) => Promise<void>
  /** Afficher bouton recherche par image */
  showImageSearch?: boolean
  /** Classe CSS */
  className?: string
}

export default function ProductGalleryImmersive({
  media,
  productName,
  availabilityBadge,
  selectedIndex: externalIndex,
  onIndexChange,
  onImageSearch,
  showImageSearch = true,
  className
}: ProductGalleryImmersiveProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [imageSearching, setImageSearching] = useState(false)
  const [imageSearchResult, setImageSearchResult] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const modalVideoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeIndex = externalIndex ?? internalIndex
  const setActiveIndex = (index: number) => {
    setInternalIndex(index)
    onIndexChange?.(index)
    // Reset video state when changing media
    setIsVideoPlaying(false)
  }

  // Fallback si media vide
  const gallery: MediaItem[] = media.length > 0 ? media : [{ type: 'image', url: '/file.svg' }]
  const currentMedia = gallery[activeIndex]

  // Navigation
  const goToPrevious = useCallback(() => {
    setActiveIndex(activeIndex === 0 ? gallery.length - 1 : activeIndex - 1)
  }, [activeIndex, gallery.length])

  const goToNext = useCallback(() => {
    setActiveIndex(activeIndex === gallery.length - 1 ? 0 : activeIndex + 1)
  }, [activeIndex, gallery.length])

  // Keyboard navigation
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
      } else if (e.key === ' ') {
        e.preventDefault()
        if (currentMedia.type === 'video') {
          setIsVideoPlaying(!isVideoPlaying)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, goToPrevious, goToNext, currentMedia.type, isVideoPlaying])

  // Sync video play state
  useEffect(() => {
    const video = showModal ? modalVideoRef.current : videoRef.current
    if (!video) return
    if (isVideoPlaying) {
      video.play().catch(() => setIsVideoPlaying(false))
    } else {
      video.pause()
    }
  }, [isVideoPlaying, showModal])

  // Zoom handling
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || currentMedia.type === 'video') return
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    setZoomPosition({ x, y })
  }

  // Swipe support
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
    if (distance > minSwipeDistance) goToNext()
    if (distance < -minSwipeDistance) goToPrevious()
  }

  // Image search handler
  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageSearch) return

    setImageSearching(true)
    setImageSearchResult(null)

    try {
      await onImageSearch(file)
      setImageSearchResult('success')
    } catch (error) {
      setImageSearchResult('error')
    } finally {
      setImageSearching(false)
      setTimeout(() => setImageSearchResult(null), 3000)
    }
  }

  // Render media content
  const renderMedia = (isModal = false) => {
    const media = currentMedia
    
    if (media.type === 'video') {
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={isModal ? modalVideoRef : videoRef}
            src={media.url}
            className={clsx(
              'max-w-full max-h-full object-contain',
              isModal ? 'w-full h-full' : ''
            )}
            loop
            muted={isMuted}
            playsInline
            poster={media.thumbnail}
            onClick={() => setIsVideoPlaying(!isVideoPlaying)}
          />
          
          {/* Video controls overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence>
              {!isVideoPlaying && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="pointer-events-auto w-16 h-16 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-xl hover:bg-white transition"
                  onClick={() => setIsVideoPlaying(true)}
                >
                  <Play className="w-7 h-7 text-emerald-600 ml-1" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Video controls bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-center justify-between">
            <button
              onClick={() => setIsVideoPlaying(!isVideoPlaying)}
              className="text-white hover:text-emerald-400 transition"
            >
              {isVideoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:text-emerald-400 transition"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )
    }

    // Image rendering
    return (
      <div
        className={clsx(
          'relative w-full h-full overflow-hidden',
          isModal && isZoomed ? 'cursor-crosshair' : 'cursor-zoom-in'
        )}
        onMouseMove={isModal ? handleMouseMove : undefined}
        onClick={isModal ? () => setIsZoomed(!isZoomed) : () => setShowModal(true)}
      >
        <Image
          src={media.url || '/file.svg'}
          alt={`${productName} - Image ${activeIndex + 1}`}
          fill
          className={clsx(
            'object-contain transition-transform duration-300',
            !isModal && 'group-hover:scale-105',
            isModal && isZoomed && 'scale-[2.5]'
          )}
          style={isModal && isZoomed ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined}
          sizes={isModal ? '100vw' : '(max-width: 768px) 100vw, 600px'}
          priority={activeIndex === 0}
        />
      </div>
    )
  }

  return (
    <>
      <div className={clsx('space-y-4', className)}>
        {/* Image principale */}
        <div
          className="relative aspect-square max-h-[500px] lg:max-h-[550px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 group shadow-sm"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {renderMedia()}

          {/* Badge disponibilité */}
          {availabilityBadge && (
            <div
              className={clsx(
                'absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur',
                availabilityBadge.status === 'in_stock'
                  ? 'bg-emerald-500/90 text-white'
                  : availabilityBadge.status === 'preorder'
                    ? 'bg-amber-500/90 text-white'
                    : 'bg-gray-600/90 text-white'
              )}
            >
              {availabilityBadge.label}
            </div>
          )}

          {/* Label du média */}
          {currentMedia.label && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur text-white text-xs font-medium rounded-full">
              {currentMedia.label}
            </div>
          )}

          {/* Indicateur zoom/play */}
          {currentMedia.type === 'image' && (
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold text-gray-700 shadow-lg">
              <ZoomIn className="h-4 w-4" />
              <span>Cliquer pour agrandir</span>
            </div>
          )}

          {/* Navigation arrows */}
          {gallery.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrevious() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition hover:bg-white hover:scale-110"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition hover:bg-white hover:scale-110"
              >
                <ArrowRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          {/* Counter */}
          {gallery.length > 1 && (
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-sm px-3 py-1.5 rounded-full font-medium">
              {activeIndex + 1} / {gallery.length}
            </div>
          )}

          {/* Bouton recherche par image */}
          {showImageSearch && onImageSearch && (
            <div className="absolute top-4 right-4 z-10">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSearch}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageSearching}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow-lg transition',
                  imageSearchResult === 'success'
                    ? 'bg-emerald-500 text-white'
                    : imageSearchResult === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-white/95 backdrop-blur text-gray-700 hover:bg-white'
                )}
              >
                {imageSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : imageSearchResult === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {imageSearching ? 'Recherche...' : 'Rechercher par image'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
          {gallery.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={clsx(
                'relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200',
                idx === activeIndex
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105'
                  : 'border-gray-200 hover:border-gray-400'
              )}
            >
              {item.type === 'video' ? (
                <>
                  <Image
                    src={item.thumbnail || item.url}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <Image
                  src={item.url || '/file.svg'}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )}
              
              {/* Label indicator */}
              {item.label && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 truncate px-1">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Modal plein écran */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
            onClick={() => { setShowModal(false); setIsZoomed(false) }}
          >
            {/* Close button */}
            <button
              onClick={() => { setShowModal(false); setIsZoomed(false) }}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white transition"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main image container */}
            <div
              className="relative w-full h-full max-w-6xl max-h-[90vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {renderMedia(true)}
            </div>

            {/* Navigation */}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goToPrevious() }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white transition"
                >
                  <ArrowLeft className="w-7 h-7" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goToNext() }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white transition"
                >
                  <ArrowRight className="w-7 h-7" />
                </button>
              </>
            )}

            {/* Bottom thumbnails */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur p-2 rounded-2xl max-w-[90vw] overflow-x-auto">
              {gallery.map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(idx) }}
                  className={clsx(
                    'relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition',
                    idx === activeIndex ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  {item.type === 'video' ? (
                    <>
                      <Image
                        src={item.thumbnail || item.url}
                        alt={`Thumb ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <Image
                      src={item.url || '/file.svg'}
                      alt={`Thumb ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Zoom indicator */}
            {currentMedia.type === 'image' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur text-white text-sm px-4 py-2 rounded-full">
                {isZoomed ? 'Cliquer pour dézoomer' : 'Cliquer pour zoomer'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
