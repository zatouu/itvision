export const dynamic = 'force-dynamic'

import { getEnterpriseSession, sessionCan } from '@/lib/enterprise-auth'
import SourcingSection from '@/components/portal/SourcingSection'

export default async function SourcingPage() {
  const session = await getEnterpriseSession('/portail-entreprise/sourcing')

  return <SourcingSection canRequest={sessionCan(session, 'sourcing:request')} />
}
