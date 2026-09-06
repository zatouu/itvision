'use client'

import { Suspense } from 'react'
import DynamicSchedulingSystem from '@/components/DynamicSchedulingSystem'
import Breadcrumb from '@/components/Breadcrumb'
import AdminTabs from '@/components/admin/AdminTabs'

function AssignationsContent() {
  return (
    <DynamicSchedulingSystem
      defaultViewMode="list"
      filterMode="all"
      showNewInterventionShortcut
    />
  )
}

export default function AdminAssignationsPage() {
  return (
    <div>
      <Breadcrumb backHref="/admin" backLabel="Retour au dashboard" />
      <div className="mt-4 mb-6">
        <AdminTabs context="team" />
      </div>
      <Suspense fallback={<div className="animate-pulse">Chargement...</div>}>
        <AssignationsContent />
      </Suspense>
    </div>
  )
}
