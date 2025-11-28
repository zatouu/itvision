import Breadcrumb from '@/components/Breadcrumb'
import MaintenanceCenter from '@/components/admin/MaintenanceCenter'

export default function AdminMaintenancePage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
        items={[
          { label: 'Accueil', href: '/' },
          { label: 'Administration', href: '/admin' },
          { label: 'Centre Maintenance' }
        ]}
      />
      <div className="mt-4">
        <MaintenanceCenter />
      </div>
    </div>
  )
}

