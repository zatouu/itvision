import type { Metadata } from 'next'
import AlertsClient from './AlertsClient'

export const metadata: Metadata = {
  title: 'Alertes achats groupés | DDM+',
  description: 'Soyez prévenu à chaque nouvel achat groupé DDM+ : par WhatsApp ou SMS, sans avoir à ouvrir le site.',
  robots: { index: false },
}

export default function Page() {
  const channelUrl = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || ''
  const safeChannel = /^https:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]+$/.test(channelUrl) ? channelUrl : ''
  return <AlertsClient channelUrl={safeChannel} />
}
