"use client"

import { ReactNode, useEffect } from 'react'
import ToastProvider from '@/components/ToastProvider'

export default function AdminLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Garantit un fond cohérent pour l'admin
    document.body.classList.add('bg-gray-50')
    return () => document.body.classList.remove('bg-gray-50')
  }, [])

  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
}


