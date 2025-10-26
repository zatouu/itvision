'use client'

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  id?: string
  type?: ToastType
  title?: string
  description?: string
  durationMs?: number
}

export interface Toast extends Omit<ToastOptions, 'id' | 'durationMs' | 'type'> {
  id: string
  type: ToastType
  durationMs: number
}

interface ToastContextValue {
  show: (options: ToastOptions) => string
  dismiss: (id: string) => void
  success: (message: string, options?: Omit<ToastOptions, 'type' | 'description' | 'title'> & { description?: string; title?: string }) => string
  error: (message: string, options?: Omit<ToastOptions, 'type' | 'description' | 'title'> & { description?: string; title?: string }) => string
  info: (message: string, options?: Omit<ToastOptions, 'type' | 'description' | 'title'> & { description?: string; title?: string }) => string
  warning: (message: string, options?: Omit<ToastOptions, 'type' | 'description' | 'title'> & { description?: string; title?: string }) => string
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}

function iconFor(type: ToastType) {
  switch (type) {
    case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case 'error': return <XCircle className="h-5 w-5 text-red-600" />
    case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    default: return <Info className="h-5 w-5 text-blue-600" />
  }
}

function classFor(type: ToastType) {
  switch (type) {
    case 'success': return 'border-green-200 bg-green-50'
    case 'error': return 'border-red-200 bg-red-50'
    case 'warning': return 'border-yellow-200 bg-yellow-50'
    default: return 'border-blue-200 bg-blue-50'
  }
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Record<string, number>>({})

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const existing = timersRef.current[id]
    if (existing) {
      window.clearTimeout(existing)
      delete timersRef.current[id]
    }
  }, [])

  const show = useCallback((options: ToastOptions) => {
    const id = options.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const type: ToastType = options.type || 'info'
    const durationMs = typeof options.durationMs === 'number' ? options.durationMs : (type === 'error' ? 6000 : 4000)

    const toast: Toast = {
      id,
      type,
      title: options.title,
      description: options.description,
      durationMs
    }

    setToasts((prev) => [...prev, toast])

    timersRef.current[id] = window.setTimeout(() => dismiss(id), durationMs)

    return id
  }, [dismiss])

  const success = useCallback((message: string, options?: Omit<ToastOptions, 'type'>) => show({ ...options, type: 'success', description: options?.description, title: options?.title ?? message }), [show])
  const error = useCallback((message: string, options?: Omit<ToastOptions, 'type'>) => show({ ...options, type: 'error', description: options?.description, title: options?.title ?? message }), [show])
  const info = useCallback((message: string, options?: Omit<ToastOptions, 'type'>) => show({ ...options, type: 'info', description: options?.description, title: options?.title ?? message }), [show])
  const warning = useCallback((message: string, options?: Omit<ToastOptions, 'type'>) => show({ ...options, type: 'warning', description: options?.description, title: options?.title ?? message }), [show])

  const value = useMemo<ToastContextValue>(() => ({ show, dismiss, success, error, info, warning }), [show, dismiss, success, error, info, warning])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Viewport */}
      <div className="fixed top-4 right-4 z-[60] space-y-3 w-[360px] max-w-[90vw]" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`border rounded-xl p-3 shadow-lg backdrop-blur bg-white/90 ${classFor(t.type)}`}
          >
            <div className="flex items-start">
              <div className="mt-0.5 mr-3">{iconFor(t.type)}</div>
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-sm font-semibold text-gray-900">{t.title}</div>}
                {t.description && <div className="text-sm text-gray-700 mt-0.5">{t.description}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Fermer la notification"
                className="ml-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

