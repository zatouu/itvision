import TechnicianManagement from '@/components/admin/TechnicianManagement'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminTechniciansPage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4">
        <TechnicianManagement />
      </div>
    </div>
  )
}





