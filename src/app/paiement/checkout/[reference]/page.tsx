import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'
import CheckoutInterface from '@/components/payment/CheckoutInterface'
import CheckoutRelatedProducts from '@/components/payment/CheckoutRelatedProducts'
import { readPaymentSettings } from '@/lib/payments/settings'
import Link from 'next/link'

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-violet-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100 max-w-md w-full">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Référence introuvable</h1>
          <p className="text-gray-500 mb-2 text-sm">Cette référence de paiement est introuvable ou expirée.</p>
          <p className="font-mono text-xs bg-gray-100 px-3 py-1.5 rounded-lg inline-block text-gray-700 mb-6">{reference}</p>
          <div className="flex flex-col gap-2">
            <Link href="/panier" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:from-green-600 hover:to-violet-600 transition">
              Retour au panier
            </Link>
            <Link href="/compte/commandes" className="text-sm text-gray-500 hover:text-violet-600 transition">
              Voir mes commandes
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  // charger les réglages
  const settings = readPaymentSettings()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-violet-50">
      {/* Header marketplace */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/produits" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Catalogue
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <Link href="/" className="hidden sm:flex items-center gap-2">
              <span className="font-extrabold text-lg bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text text-transparent">
                IT Vision
              </span>
              <span className="text-xs text-gray-400 font-medium">Marketplace</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/panier" className="text-gray-500 hover:text-green-600 transition font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Panier
            </Link>
            <Link href="/compte" className="text-gray-500 hover:text-violet-600 transition font-medium hidden sm:flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Mon compte
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb + Titre */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-3">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 flex-wrap">
          <Link href="/produits" className="hover:text-green-600 transition">Catalogue</Link>
          <span>›</span>
          <Link href="/panier" className="hover:text-green-600 transition">Panier</Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">Paiement</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finalisation du paiement</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {orderType === 'group' ? 'Achat Groupé' : 'Commande'}{' '}
              <span className="font-mono font-semibold text-violet-600">{groupData.groupId}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm self-start sm:self-auto">
            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Paiement sécurisé
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <CheckoutInterface 
          participant={participantData} 
          group={groupData}
          settings={settings}
        />
        <CheckoutRelatedProducts productIds={
          orderType === 'standard' && (participantData as any)._productIds
            ? (participantData as any)._productIds
            : undefined
        } />
      </div>

      {/* Footer marketplace */}
      <footer className="border-t border-gray-100 bg-white/70 backdrop-blur-sm py-6 mt-4">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400 mb-3">
            IT Vision Plus • Paiements sécurisés • Support : <strong>{settings.providers.manual.waveMerchantPhone}</strong>
          </p>
          <div className="flex items-center justify-center gap-5 text-xs text-gray-400">
            <Link href="/produits" className="hover:text-green-600 transition">Catalogue</Link>
            <Link href="/suivi" className="hover:text-green-600 transition">Suivi commande</Link>
            <Link href="/compte/commandes" className="hover:text-violet-600 transition">Mes commandes</Link>
            <Link href="/contact" className="hover:text-green-600 transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
