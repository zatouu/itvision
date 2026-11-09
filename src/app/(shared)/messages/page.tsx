import type { Metadata } from 'next'
import MessagesClient from '@/components/messages/MessagesClient'

export const metadata: Metadata = {
  title: 'Messages',
  robots: { index: false, follow: false },
}

export default function MessagesPage() {
  return <MessagesClient />
}
