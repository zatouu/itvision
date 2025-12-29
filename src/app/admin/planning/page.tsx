'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DynamicSchedulingSystem from '@/components/DynamicSchedulingSystem'
import EnhancedProjectManager from '@/components/EnhancedProjectManager'
import Breadcrumb from '@/components/Breadcrumb'
import AdminTabs from '@/components/admin/AdminTabs'

const PlanningFallback = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
    Chargement du planning en cours...
  </div>
)

const PlanningContent = () => {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const isMarketplaceView = view === 'marketplace'
  const isInstallationsView = view === 'installations'
  const showProjects = !isMarketplaceView && !isInstallationsView
  const defaultViewMode = isMarketplaceView || isInstallationsView ? 'list' : 'calendar'
  const filterMode = isMarketplaceView ? 'marketplace' : isInstallationsView ? 'installations' : 'all'

  return (
    <div>
      <Breadcrumb backHref="/admin" backLabel="Retour au dashboard" />
      <div className="mt-4 mb-6">
        <AdminTabs context="team" />
      </div>
      {showProjects && <EnhancedProjectManager />}
      <div className="mt-8">
        <DynamicSchedulingSystem
          defaultViewMode={defaultViewMode}
          filterMode={filterMode}
          showNewInterventionShortcut
        />
      </div>
    </div>
  )
}

export default function AdminPlanningPage() {
  return (
    <Suspense fallback={<PlanningFallback />}>
      <PlanningContent />
    </Suspense>
  )
}
