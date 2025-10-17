'use client'

import DynamicSchedulingSystem from '@/components/DynamicSchedulingSystem'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminPlanningPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/admin" 
          backLabel="Retour au dashboard"
        />
      </div>
      <DynamicSchedulingSystem />
    </div>
  )
}
