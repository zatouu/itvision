import ModernProjectManagement from '@/components/admin/ModernProjectManagement'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminProjectsPage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4">
        <ModernProjectManagement />
      </div>
    </div>
  )
}





