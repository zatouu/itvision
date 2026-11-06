"use client"

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface DialogErrorProps {
  open: boolean
  message: string
  onClose: () => void
  title?: string
  details?: string
}

export default function DialogError({ open, message, onClose, title = 'Erreur', details }: DialogErrorProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 focus:outline-none"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center text-center">
          <svg className="h-10 w-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-700 mb-2">{message}</p>
          {details && (
            <pre className="bg-gray-100 rounded p-2 text-xs text-left w-full overflow-auto max-h-40 mb-2">{details}</pre>
          )}
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
