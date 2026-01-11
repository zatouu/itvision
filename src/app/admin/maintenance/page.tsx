import Breadcrumb from '@/components/Breadcrumb'
import MaintenanceCenter from '@/components/admin/MaintenanceCenter'

export default function AdminMaintenancePage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4">
        <MaintenanceCenter />
      </div>
    </div>
  )
}

