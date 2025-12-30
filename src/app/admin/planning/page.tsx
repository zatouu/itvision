'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminPageWrapper from '@/components/admin/AdminPageWrapper'
import DynamicSchedulingSystem from '@/components/DynamicSchedulingSystem'
import EnhancedProjectManager from '@/components/EnhancedProjectManager'
import AdminTabs from '@/components/admin/AdminTabs'

function PlanningContent() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const isMarketplaceView = view === 'marketplace'
  const isInstallationsView = view === 'installations'
  const showProjects = !isMarketplaceView && !isInstallationsView
  const defaultViewMode = isMarketplaceView || isInstallationsView ? 'list' : 'calendar'
  const filterMode = isMarketplaceView ? 'marketplace' : isInstallationsView ? 'installations' : 'all'

  return (
    <>
      {showProjects && <EnhancedProjectManager />}
      <div className="mt-8">
        <DynamicSchedulingSystem
          defaultViewMode={defaultViewMode}
          filterMode={filterMode}
          showNewInterventionShortcut
        />
      </div>
    </>
  )
}

export default function AdminPlanningPage() {
  return (
    <AdminPageWrapper>
      <div className="mb-6">
        <AdminTabs context="team" />
      </div>
      <Suspense fallback={<div className="animate-pulse">Chargement...</div>}>
        <PlanningContent />
      </Suspense>
    </AdminPageWrapper>
  )
}
