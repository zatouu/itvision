import { createThreadMessageModel } from '@/lib/messaging/thread-message-schema'

// Messages DDM+ (support commande, achats groupés) — collection market_messages
const MarketMessage = createThreadMessageModel('MarketMessage', 'market')
export default MarketMessage
