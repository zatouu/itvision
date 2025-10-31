'use client'

import DynamicSchedulingSystem from '@/components/DynamicSchedulingSystem'
import EnhancedProjectManager from '@/components/EnhancedProjectManager'
import Breadcrumb from '@/components/Breadcrumb'
import AdminTabs from '@/components/admin/AdminTabs'

export default function AdminPlanningPage() {
  return (
    <div>
      <Breadcrumb 
        backHref="/admin" 
        backLabel="Retour au dashboard"
      />
      <div className="mt-4 mb-6">
        <AdminTabs context="team" />
      </div>
      <EnhancedProjectManager />
      <div className="mt-8">
        <DynamicSchedulingSystem />
      </div>
    </div>
  )
}
