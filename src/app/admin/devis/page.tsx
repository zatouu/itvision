'use client'

import AdminQuoteGenerator from '@/components/admin/AdminQuoteGenerator'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminDevisPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/admin" 
          backLabel="Retour au dashboard"
        />
      </div>
      <AdminQuoteGenerator />
    </div>
  )
}




