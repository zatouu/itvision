import ConversationClient from '@/components/messages/ConversationClient'

interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ConversationPage(props: PageProps) {
  const { conversationId } = await props.params
  return <ConversationClient conversationId={conversationId} />
}
