import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EnhancedAdminValidation from '@/components/EnhancedAdminValidation'

export default function ValidationRapportsPage() {
  return (
    <main>
      <Header />
      <div className="page-content">
        <EnhancedAdminValidation />
      </div>
      <Footer />
    </main>
  )
}