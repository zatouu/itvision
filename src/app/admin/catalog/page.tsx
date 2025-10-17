'use client'

import ServiceProductCatalog from '../../../components/ServiceProductCatalog'
import Breadcrumb from '@/components/Breadcrumb'

export default function CatalogAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/admin" 
          backLabel="Retour au dashboard"
        />
      </div>
      <ServiceProductCatalog />
    </div>
  )
}