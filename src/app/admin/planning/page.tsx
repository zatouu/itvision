'use client'

import { useSearchParams } from 'next/navigation'
import DynamicSchedulingSystem from '@/components/DynamicSchedulingSystem'
import EnhancedProjectManager from '@/components/EnhancedProjectManager'
import Breadcrumb from '@/components/Breadcrumb'
import AdminTabs from '@/components/admin/AdminTabs'

export default function AdminPlanningPage() {
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
