import ImprovedClientManagement from '@/components/admin/ImprovedClientManagement'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminClientsPage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4">
        <ImprovedClientManagement />
      </div>
    </div>
  )
}
