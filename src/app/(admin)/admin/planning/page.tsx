'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DynamicSchedulingSystem from '@/components/DynamicSchedulingSystem'
import EnhancedProjectManager from '@/components/EnhancedProjectManager'
import Breadcrumb from '@/components/Breadcrumb'
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
    <div>
      <Breadcrumb backHref="/admin" backLabel="Retour au dashboard" />
      <div className="mt-4 mb-6">
        <AdminTabs context="team" />
      </div>
      <Suspense fallback={<div className="animate-pulse">Chargement...</div>}>
        <PlanningContent />
      </Suspense>
    </div>
  )
}
