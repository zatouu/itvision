'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function PolitiqueConfidentialitePage() {
  return (
    <main>
      <Header />
      <section className="page-content pt-28 pb-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">Politique de confidentialité</h1>
          <div className="prose max-w-none">
            <p>Notre politique de confidentialité sera détaillée et adaptée à vos besoins (RGPD). Contenu à compléter.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
