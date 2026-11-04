import AdminDocumentLibrary from '@/components/admin/documents/AdminDocumentLibrary'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminDocumentsPage() {
  return (
    <div>
      <Breadcrumb backHref="/admin" backLabel="Retour au dashboard" />
      <div className="mt-4">
        <AdminDocumentLibrary />
      </div>
    </div>
  )
}
