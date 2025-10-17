import UserManagementInterface from '@/components/UserManagementInterface'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminUsersPage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen">
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <UserManagementInterface />
    </div>
  )
}