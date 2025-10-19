import IntelligentQuoteGenerator from '@/components/IntelligentQuoteGenerator'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Breadcrumb from '@/components/Breadcrumb'

export default function GenerateurDevisPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <div className="pt-16">
        <Breadcrumb backHref="/gestion-projets" backLabel="Retour aux Projets" />
      </div>
      <div className="page-content">
        <IntelligentQuoteGenerator />
      </div>
      <Footer />
    </main>
  )
}