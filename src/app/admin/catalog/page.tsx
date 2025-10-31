'use client'

import ServiceProductCatalog from '../../../components/ServiceProductCatalog'
import Breadcrumb from '@/components/Breadcrumb'
import AdminTabs from '@/components/admin/AdminTabs'

export default function CatalogAdminPage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4">
        <AdminTabs context="services" />
      </div>
      <ServiceProductCatalog />
    </div>
  )
}