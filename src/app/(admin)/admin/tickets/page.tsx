'use client'

import Breadcrumb from '@/components/Breadcrumb'
import AdminTicketBoard from '@/components/AdminTicketBoard'

export default function AdminTicketsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb backHref="/admin" backLabel="Retour au dashboard" />
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <AdminTicketBoard />
      </div>
    </div>
  )
}

