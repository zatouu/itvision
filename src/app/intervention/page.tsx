'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InterventionPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Rediriger vers le portail technicien avec la vue intervention
    router.replace('/tech-interface?view=intervention')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirection vers le portail technicien...</p>
      </div>
    </div>
  )
}


