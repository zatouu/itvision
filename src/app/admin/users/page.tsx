import { Suspense } from 'react'
import UserManagementInterface from '@/components/UserManagementInterface'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminUsersPage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen">
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <Suspense fallback={<div className="px-6 py-8 text-sm text-gray-600">Chargement…</div>}>
        <UserManagementInterface />
      </Suspense>
    </div>
  )
}