import GlobalAdminDashboard from '@/components/GlobalAdminDashboard'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminReportsPage() {
  return (
    <div className="pt-16 bg-stone-50 min-h-screen"> {/* Compensation pour le header fixe */}
      <Breadcrumb 
        backHref="/" 
        backLabel="Retour à l'accueil"
      />
      <GlobalAdminDashboard />
    </div>
  )
}