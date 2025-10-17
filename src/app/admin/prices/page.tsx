'use client'

import PriceManagementSystem from '../../../components/PriceManagementSystem'
import Breadcrumb from '@/components/Breadcrumb'

export default function PricesAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/admin" 
          backLabel="Retour au dashboard"
        />
      </div>
      <PriceManagementSystem />
    </div>
  )
}