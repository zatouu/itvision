import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'
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

  await connectDB()

  let participantData = null
  let groupData = null
  let orderType = 'group' // 'group' or 'standard'

  // 1. Essayer de trouver une commande groupée (référence paiement participant)
  const groupOrder = await GroupOrder.findOne({ 
    "participants.paymentReference": reference 
  })

  if (groupOrder) {
    const participant = groupOrder.participants.find(
      (p: any) => p.paymentReference === reference
    )

    if (participant) {
        const amount = participant.totalAmount || (participant.qty * (participant.unitPrice || groupOrder.currentUnitPrice || groupOrder.product.basePrice))
        
        participantData = {
            name: participant.name,
            phone: participant.phone,
            amount: amount,
            reference: reference, // reference paiement
            status: participant.paymentStatus || 'pending'
        }

        groupData = {
            productName: groupOrder.product.name,
            groupId: groupOrder.groupId
        }
    }
  }

  // 2. Si pas trouvé, essayer de trouver une commande standard (OrderId)
  if (!participantData) {
    const standardOrder = await Order.findOne({ orderId: reference })
    
    if (standardOrder) {
        orderType = 'standard'
        participantData = {
            name: standardOrder.clientName,
            phone: standardOrder.clientPhone,
            amount: standardOrder.total,
            reference: standardOrder.orderId,
            status: standardOrder.paymentStatus === 'completed' ? 'paid' : 'pending',
            // Nouveaux champs pour décomposition prix
            fees: standardOrder.fees,
            shipping: standardOrder.shipping,
            subtotal: standardOrder.subtotal,
            subtotalBeforeDiscounts: standardOrder.subtotalBeforeDiscounts
        }

        const itemsCount = standardOrder.items.length
        const itemsSummary = standardOrder.items.slice(0, 2).map((i: any) => i.name).join(', ')
        const productName = itemsCount > 2 ? `${itemsSummary} + ${itemsCount - 2} autres` : itemsSummary

        groupData = {
            productName: `Commande: ${productName}`,
            groupId: standardOrder.orderId
        }
    }
  }

  if (!participantData || !groupData) {
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
  
  // charger les réglages
  const settings = readPaymentSettings()

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900">Finalisation du paiement</h2>
        <p className="mt-2 text-sm text-slate-600">
          {orderType === 'group' ? (
              <>Achat Groupé <span className="font-semibold text-indigo-600">#{groupData.groupId}</span></>
          ) : (
              <>Commande <span className="font-semibold text-indigo-600">{groupData.groupId}</span></>
          )}
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
