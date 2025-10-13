'use client'

import EnhancedMaintenanceForm from '@/components/EnhancedMaintenanceForm'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function MaintenanceDigitalPage() {
  const handleSave = (data: any) => {
    console.log('Sauvegarde du rapport:', data)
    // Ici vous pourriez sauvegarder en base de données
  }

  const handleSubmit = (data: any) => {
    console.log('Envoi du rapport:', data)
    // Ici vous pourriez envoyer le rapport pour validation
  }

  return (
    <main>
      <Header />
      <div className="pt-16 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              📱 <span className="text-blue-600">Rapports Digitalisés</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Créez des rapports de maintenance complets et professionnels avec notre formulaire intuitif
            </p>
          </div>
          
          <EnhancedMaintenanceForm 
            onSave={handleSave}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
      <Footer />
    </main>
  )
}