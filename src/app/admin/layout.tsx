"use client"

import { ReactNode, useEffect } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

export default function AdminLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Garantit un fond cohérent pour l'admin
    document.body.classList.add('bg-gray-50')
    return () => document.body.classList.remove('bg-gray-50')
  }, [])

  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <div className="pl-64">
        <AdminHeader />
        <main className="pt-20 px-6 pb-10 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}


