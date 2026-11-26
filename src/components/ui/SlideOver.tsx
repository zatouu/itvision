'use client'

import { useEffect, useState } from 'react'
import { X, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** Bouton élargir/réduire dans l'en-tête (bureau uniquement) */
  expandable?: boolean
  defaultWide?: boolean
  zIndex?: number
  closeOnOverlayClick?: boolean
}

/**
 * Panneau latéral coulissant depuis la droite, pour les fiches de détail :
 * la liste reste visible en arrière-plan et on enchaîne les relectures.
 * Pleine largeur sur mobile, élargissable sur bureau.
 */
export default function SlideOver({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  expandable = true,
  defaultWide = false,
  zIndex = 60,
  closeOnOverlayClick = true,
}: SlideOverProps) {
  const [wide, setWide] = useState(defaultWide)

  useEffect(() => {
    if (isOpen) setWide(defaultWide)
  }, [isOpen, defaultWide])

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Bloquer le scroll du body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0" style={{ zIndex }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            className={`absolute inset-y-0 right-0 bg-white shadow-2xl flex flex-col w-full transition-[max-width] duration-300 ${wide ? 'sm:max-w-5xl' : 'sm:max-w-xl'}`}
          >
            <div className="p-4 sm:p-6 border-b flex items-center justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{title}</h3>
                {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {expandable && (
                  <button
                    onClick={() => setWide(w => !w)}
                    className="hidden sm:grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label={wide ? 'Réduire le panneau' : 'Élargir le panneau'}
                    title={wide ? 'Réduire' : 'Élargir'}
                  >
                    {wide ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {children}
            </div>

            {footer && (
              <div className="p-4 sm:p-6 border-t bg-gray-50 shrink-0">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
