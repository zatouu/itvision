import { notFound } from 'next/navigation'
import dbConnect from '@/lib/mongodb'
import { GroupOrder } from '@/lib/models/GroupOrder'
import CheckoutInterface from '@/components/payment/CheckoutInterface'
import { readPaymentSettings } from '@/lib/payments/settings'

interface PageProps {
  params: Promise<{
    reference: string
  }>
}

export const metadata = {
  title: 'Caisse | IT Vision Plus',
  description: 'Finalisez votre paiement sécurisé'
}

export default async function CheckoutPage({ params }: PageProps) {
  const { reference } = await params
  if (!reference) return notFound()

  await dbConnect()

  // Chercher la commande correspondante à la référence de paiement
  // La référence est unique par participant
  const groupOrder = await GroupOrder.findOne({ 
    "participants.paymentReference": reference 
  })

  if (!groupOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-300 mb-4">404</h1>
            <p className="text-slate-600 mb-6">Référence de paiement introuvable ou expirée.</p>
            <p className="font-mono bg-slate-200 px-3 py-1 rounded inline-block">{reference}</p>
        </div>
      </div>
    )
  }

  // Extraire le participant spécifique
  // Note: On utilise 'any' ici car TypeScript peut avoir du mal avec les sous-documents Mongoose 
  // sans types génériques complexes, mais la structure est validée par la query.
  const participant = groupOrder.participants.find(
    (p: any) => p.paymentReference === reference
  )

  if (!participant) return notFound() // Ne devrait pas arriver avec la query ci-dessus

  // Calculer le montant si pas explicite (fallback)
  // Normalement totalAmount est set, sinon qty * price
  const amount = participant.totalAmount || (participant.qty * (participant.unitPrice || groupOrder.currentUnitPrice || groupOrder.product.basePrice))
  
  // charger les réglages
  const settings = readPaymentSettings()

  // Préparer les données pour le client
  // Sérialisation nécessaire pour passer du Server au Client Component
  const participantData = {
    name: participant.name,
    phone: participant.phone,
    amount: amount,
    reference: reference,
    status: participant.paymentStatus || 'pending'
  }

  const groupData = {
    productName: groupOrder.product.name,
    groupId: groupOrder.groupId
  }

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900">Finalisation du paiement</h2>
        <p className="mt-2 text-sm text-slate-600">
          Achat Groupé <span className="font-semibold text-indigo-600">#{groupOrder.groupId}</span>
        </p>
      </div>
      
      <CheckoutInterface 
        participant={participantData} 
        group={groupData}
        settings={settings}
      />

      <div className="max-w-4xl mx-auto mt-8 text-center text-xs text-slate-400">
        <p>IT Vision Plus • Paiements sécurisés • Support: {settings.providers.manual.waveMerchantPhone}</p>
      </div>
    </div>
  )
}
