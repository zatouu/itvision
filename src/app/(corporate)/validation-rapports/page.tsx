import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EnhancedAdminValidation from '@/components/EnhancedAdminValidation'
import Breadcrumb from '@/components/Breadcrumb'

export default function ValidationRapportsPage() {
  return (
    <main>
      <Header />
      <div className="page-content">
        <Breadcrumb 
          backHref="/" 
          backLabel="Retour à l'accueil"
        />
        <EnhancedAdminValidation />
      </div>
      <Footer />
    </main>
  )
}