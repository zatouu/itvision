import type { Metadata } from 'next'
import ConversationClient from '@/components/messages/ConversationClient'

export const metadata: Metadata = {
  title: 'Conversation',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ConversationPage(props: PageProps) {
  const { conversationId } = await props.params
  return <ConversationClient conversationId={conversationId} />
}
