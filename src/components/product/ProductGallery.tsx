'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Globe, Heart, Share2, ZoomIn, Play } from 'lucide-react'
import { isVideoUrl } from './types'

interface ProductGalleryProps {
  productName: string
  gallery: string[]
  isImported?: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
  onShare?: () => void
}

export default function ProductGallery({ productName, gallery, isImported, isFavorite, onToggleFavorite, onShare }: ProductGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [showLightbox, setShowLightbox] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setZoomPosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  const activeMedia = gallery[activeImageIndex] || ''
  const isVideo = isVideoUrl(activeMedia)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Main Image */}
      <div className="relative bg-gray-50">
        {isVideo ? (
          <div className="relative aspect-square bg-black">
            <video src={activeMedia} controls autoPlay className="w-full h-full object-contain" />
          </div>
        ) : (
          <div
            ref={imageRef}
            className="relative aspect-square cursor-zoom-in group"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setShowLightbox(true)}
          >
            <Image
              src={activeMedia || '/file.svg'}
              alt={productName}
              fill
              className={clsx(
                "object-contain p-4 transition-transform duration-300",
                isZoomed && "scale-[2]"
              )}
              style={isZoomed ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {/* Top-left badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {isImported && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Import Chine
                </span>
              )}
            </div>
            {/* Top-right actions */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button
                onClick={e => { e.stopPropagation(); onToggleFavorite() }}
                className="p-2 bg-white/90 backdrop-blur rounded-full shadow hover:bg-white transition"
              >
                <Heart className={isFavorite ? "w-5 h-5 fill-red-500 text-red-500" : "w-5 h-5 text-gray-700"} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onShare?.() }}
                className="p-2 bg-white/90 backdrop-blur rounded-full shadow hover:bg-white transition"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowLightbox(true) }}
                className="p-2 bg-white/90 backdrop-blur rounded-full shadow hover:bg-white transition"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            {/* Bottom counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {activeImageIndex + 1} / {gallery.length}
            </div>
            {/* Nav arrows */}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setActiveImageIndex(i => i > 0 ? i - 1 : gallery.length - 1) }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setActiveImageIndex(i => i < gallery.length - 1 ? i + 1 : 0) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition"
                >
                  <ArrowRight className="w-4 h-4 text-gray-700" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Horizontal thumbnails */}
      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3 pb-2">
          {gallery.map((media, idx) => {
            const video = isVideoUrl(media)
            return (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={clsx(
                  "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition",
                  activeImageIndex === idx
                    ? "border-emerald-500 ring-2 ring-emerald-100"
                    : "border-gray-200 hover:border-emerald-300"
                )}
              >
                {video ? (
                  <>
                    <video src={media} muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </>
                ) : (
                  <Image src={media} alt="" fill className="object-cover" sizes="64px" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowLightbox(false)}>
          <button className="absolute top-4 right-4 text-white p-2 bg-white/20 rounded-full hover:bg-white/30" onClick={() => setShowLightbox(false)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {isVideoUrl(gallery[activeImageIndex] || '') ? (
            <video src={gallery[activeImageIndex]} controls autoPlay className="max-w-full max-h-[90vh]" onClick={e => e.stopPropagation()} />
          ) : (
            <Image
              src={gallery[activeImageIndex] || '/file.svg'}
              alt={productName}
              width={1200}
              height={1200}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={e => e.stopPropagation()}
            />
          )}
          {gallery.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setActiveImageIndex(i => i > 0 ? i - 1 : gallery.length - 1) }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={e => { e.stopPropagation(); setActiveImageIndex(i => i < gallery.length - 1 ? i + 1 : 0) }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white">
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
