'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, Sparkles, Clock, X, ArrowRight } from 'lucide-react'
import clsx from 'clsx'

interface ProductGalleryProps {
  gallery: string[]
  productName: string
  availabilityClass: string
  availabilityLabel: string
}

export default function ProductGallery({
  gallery,
  productName,
  availabilityClass,
  availabilityLabel
}: ProductGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showImageModal, setShowImageModal] = useState(false)

  // Navigation clavier pour le modal image
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

  return (
    <>
      {/* Galerie principale */}
      <div className="grid gap-4 lg:grid-cols-[110px_minmax(0,1fr)]">
        {/* Miniatures */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide">
          {gallery.map((src, index) => (
            <motion.button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveImageIndex(index)}
              className={clsx(
                'relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer',
                activeImageIndex === index
                  ? 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/30'
                  : 'border-slate-800 hover:border-emerald-400/50 hover:scale-105'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Image ${index + 1}`}
            >
              <Image 
                src={src} 
                alt={`${productName} ${index + 1}`} 
                fill 
                className="object-cover"
                loading="lazy"
                sizes="80px"
              />
              {activeImageIndex === index && (
                <motion.div
                  className="absolute inset-0 bg-emerald-500/20"
                  layoutId="activeImage"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Image principale avec effet glassmorphism */}
        <motion.div
          key={activeImageIndex}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative aspect-[5/4] w-full rounded-3xl border border-slate-800/50 bg-slate-950/40 backdrop-blur-sm overflow-hidden group"
        >
          {/* Effet glassmorphism léger */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-transparent to-slate-900/30 pointer-events-none" />
          
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="absolute inset-0 cursor-zoom-in"
            aria-label="Agrandir l'image"
          >
            <Image
              src={gallery[activeImageIndex] || '/file.svg'}
              alt={productName}
              fill
              className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
              {...(activeImageIndex === 0 ? { priority: true } : { loading: 'lazy' })}
            />
            
            {/* Badge qualité avec glow */}
            <motion.div
              className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 backdrop-blur-sm px-4 py-2 text-xs font-bold text-white border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              Qualité Professionnelle
            </motion.div>
            
            {/* Badge disponibilité */}
            <motion.div
              className={clsx('absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-sm', availabilityClass)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Clock className="h-4 w-4" />
              {availabilityLabel}
            </motion.div>
            
            {/* Effet hover zoom */}
            <motion.div
              className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm text-slate-100 shadow-lg"
              initial={false}
              whileHover={{ scale: 1.05 }}
            >
              <ZoomIn className="h-5 w-5 text-emerald-400" />
              <span className="font-medium">Cliquer pour agrandir</span>
            </motion.div>
          </button>

          {/* Indicateur d'images */}
          {gallery.length > 1 && (
            <div className="absolute bottom-4 left-4 flex gap-1.5">
              {gallery.map((_, idx) => (
                <motion.div
                  key={idx}
                  className={clsx(
                    'h-1.5 rounded-full transition-all',
                    idx === activeImageIndex
                      ? 'w-8 bg-emerald-400'
                      : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImageIndex(idx)
                  }}
                  whileHover={{ scale: 1.2 }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal zoom image */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl"
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
                className="absolute top-4 right-4 z-10 p-3 rounded-full bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:rotate-90 transition-all duration-300 shadow-lg"
                aria-label="Fermer"
              >
                <X className="h-6 w-6" />
              </button>
              
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={gallery[activeImageIndex] || '/file.svg'}
                  alt={productName}
                  fill
                  className="object-contain p-8"
                  sizes="90vw"
                  priority
                />
              </div>
              
              {/* Navigation images */}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-slate-800/90 text-slate-200 hover:bg-emerald-500 hover:scale-110 transition-all duration-300 shadow-xl"
                    aria-label="Image précédente"
                  >
                    <ArrowRight className="h-6 w-6 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-slate-800/90 text-slate-200 hover:bg-emerald-500 hover:scale-110 transition-all duration-300 shadow-xl"
                    aria-label="Image suivante"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </button>
                  
                  {/* Miniatures en bas */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 overflow-x-auto max-w-full px-4 scrollbar-hide">
                    {gallery.map((src, idx) => (
                      <motion.button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveImageIndex(idx)
                        }}
                        className={clsx(
                          'relative h-20 w-20 flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all',
                          activeImageIndex === idx
                            ? 'border-emerald-400 ring-2 ring-emerald-500/50 scale-110'
                            : 'border-slate-700 hover:border-slate-600 hover:scale-105'
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Image src={src} alt={`${productName} ${idx + 1}`} fill className="object-cover" sizes="80px" />
                      </motion.button>
                    ))}
                  </div>
                  
                  {/* Indicateur */}
                  <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-800/90 text-sm text-slate-200 font-medium backdrop-blur-sm">
                    {activeImageIndex + 1} / {gallery.length}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
