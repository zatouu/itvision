import Breadcrumb from '@/components/Breadcrumb'
import ClientAdminInterface from '@/components/ClientAdminInterface'

export default function AdminClientsPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Breadcrumb backHref="/admin" backLabel="Retour au dashboard" />
      <ClientAdminInterface />
    </div>
  )
}
