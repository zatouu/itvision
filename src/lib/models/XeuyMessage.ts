import { createThreadMessageModel } from '@/lib/messaging/thread-message-schema'

// Messages Xeuy Bi (chat de mission, litiges) — collection xeuy_messages
const XeuyMessage = createThreadMessageModel('XeuyMessage', 'xeuy')
export default XeuyMessage
