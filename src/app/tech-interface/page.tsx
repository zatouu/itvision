'use client'
import TechnicianPortal from '@/components/TechnicianPortal'
import Breadcrumb from '@/components/Breadcrumb'

export default function TechInterfacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/" 
          backLabel="Retour à l'accueil"
        />
      </div>
      <TechnicianPortal />
    </div>
  )
}