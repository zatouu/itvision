import InputTestComponent from '@/components/InputTestComponent'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function TestInputsPage() {
  return (
    <main>
      <Header />
      <div className="min-h-screen bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Test de Visibilité des Champs de Saisie
            </h1>
            <p className="text-gray-600">
              Cette page permet de tester que tous les champs de saisie sont visibles et fonctionnels.
            </p>
          </div>
          
          <InputTestComponent />
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="font-medium text-blue-900 mb-2">Instructions de test :</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Vérifiez que le texte saisi est visible dans chaque champ</li>
              <li>• Testez les placeholders (texte gris clair)</li>
              <li>• Vérifiez les effets de focus (bordure bleue)</li>
              <li>• Assurez-vous que les mots de passe sont masqués mais visibles lors de la saisie</li>
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}