'use client'

import PriceManagementSystem from '../../../components/PriceManagementSystem'
import Breadcrumb from '@/components/Breadcrumb'
import AdminTabs from '@/components/admin/AdminTabs'

export default function PricesAdminPage() {
  return (
    <div className="bg-white rounded-lg p-6">
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4">
        <AdminTabs context="services" />
      </div>
      <PriceManagementSystem />
    </div>
  )
}