import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> // Next.js 15
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
          <CheckCircle size={40} />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Paiement Réussi !</h1>
        <p className="text-slate-600 mb-8">
          Votre transaction a été traitée avec succès. Vous recevrez un email de confirmation sous peu.
        </p>
        
        <Link 
          href="/"
          className="block w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
