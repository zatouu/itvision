import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> // Next.js 15
}) {
  const { ref } = await searchParams
  
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
          <XCircle size={40} />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Paiement Annulé</h1>
        <p className="text-slate-600 mb-8">
          Vous avez annulé le processus de paiement. Aucun montant n'a été débité.
        </p>
        
        <div className="space-y-3">
            {ref && (
                <Link 
                href={`/paiement/checkout/${ref}`}
                className="block w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                Réessayer le paiement
                </Link>
            )}
            
            <Link 
            href="/"
            className="block w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
            Retour à l'accueil
            </Link>
        </div>
      </div>
    </div>
  )
}
