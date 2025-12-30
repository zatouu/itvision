"use client"

import { ReactNode, useEffect } from 'react'
import ToastProvider from '@/components/ToastProvider'

export default function AdminLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Garantit un fond cohérent pour l'admin
    document.body.classList.add('bg-gray-50')
    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.classList.remove('bg-gray-50')
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <ToastProvider>
      <div className="h-screen overflow-hidden bg-gray-50">
        {children}
      </div>
    </ToastProvider>
  )
}


