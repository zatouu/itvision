'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function MentionsLegalesPage() {
  return (
    <main>
      <Header />
      <section className="page-content pt-28 pb-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">Mentions légales</h1>
          <div className="prose max-w-none">
            <p>Ce site est édité par IT Vision Plus. Les informations légales et coordonnées seront complétées selon vos directives.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
