"use client"

import { ReactNode, useEffect } from 'react'
import ToastProvider from '@/components/ToastProvider'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Garantit un fond cohérent pour l'admin
    document.body.classList.add('bg-gray-50')
    return () => document.body.classList.remove('bg-gray-50')
  }, [])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
