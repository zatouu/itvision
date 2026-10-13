import { createThreadMessageModel } from '@/lib/messaging/thread-message-schema'

// Messagerie directe transversale (Conversation) — collection shared_messages
const SharedMessage = createThreadMessageModel('SharedMessage', 'shared')
export default SharedMessage
