import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ScreenPaymentCheckout from '@/components/market/batch1/screens/ScreenPaymentCheckout'
import { readPaymentSettings } from '@/lib/payments/settings'

export const metadata: Metadata = {
  title: 'Paiement — DDM+',
  description: 'Finalisez votre paiement en toute sécurité.',
}

interface PageProps {
  params: Promise<{ reference: string }>
}

interface ParticipantData {
  name: string
  phone: string
  amount: number
  reference: string
  status: string
  items?: { name: string; qty: number; price: number }[]
}

interface GroupData {
  productName: string
  groupId: string
}

export default async function CheckoutPage({ params }: PageProps) {
  const { reference } = await params

  let participantData: ParticipantData | null = null
  let groupData: GroupData | null = null
  let orderType: 'group' | 'standard' | null = null

  // Try group order first
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/group-orders/${reference}/participant`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.participant) {
        participantData = data.participant
        groupData = data.group
        orderType = 'group'
      }
    }
  } catch {}

  // Fallback to standard order
  if (!participantData) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/order/${reference}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.order) {
          const standardOrder = data.order
          participantData = {
            name: standardOrder.clientName,
            phone: standardOrder.clientPhone,
            amount: standardOrder.total,
            reference: standardOrder.orderId,
            status: standardOrder.paymentStatus || standardOrder.status,
            items: standardOrder.items,
          }
          const itemsCount = standardOrder.items.length
          const itemsSummary = standardOrder.items.slice(0, 2).map((i: any) => i.name).join(', ')
          const productName = itemsCount > 2 ? `${itemsSummary} + ${itemsCount - 2} autres` : itemsSummary
          groupData = { productName: `Commande: ${productName}`, groupId: standardOrder.orderId }
          orderType = 'standard'
        }
      }
    } catch {}
  }

  if (!participantData || !groupData) {
    redirect('/payment/cancel?ref=' + encodeURIComponent(reference))
  }

  const settings = readPaymentSettings()

  return (
    <ScreenPaymentCheckout
      reference={participantData.reference}
      amount={participantData.amount}
      items={(participantData.items || []).map((it) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
      }))}
      settings={settings}
      phone={participantData.phone}
    />
  );
}
