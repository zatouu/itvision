import Breadcrumb from '@/components/Breadcrumb'
import EnhancedAdminValidation from '@/components/EnhancedAdminValidation'

export default function AdminRapportsPage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4">
        <EnhancedAdminValidation />
      </div>
    </div>
  )
}
