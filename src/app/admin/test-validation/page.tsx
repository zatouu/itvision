'use client'

import ValidationCycleTest from '@/components/ValidationCycleTest'
import Breadcrumb from '@/components/Breadcrumb'

export default function TestValidationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/admin" 
          backLabel="Retour au dashboard"
        />
      </div>
      <ValidationCycleTest />
    </div>
  )
}
