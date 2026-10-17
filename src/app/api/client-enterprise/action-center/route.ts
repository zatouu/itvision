import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyCapabilities } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import { getPortalActionCounts, navBadgesFromCounts } from '@/lib/portal/action-center'

// GET /api/client-enterprise/action-center — éléments en attente d'action du client (compteurs de navigation)
export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  const companyId = access.profiles.companyClientId
  if (!companyId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })

  await connectDB()
  const capabilities = companyCapabilities(access)
  const counts = await getPortalActionCounts({
    userId: access.userId,
    companyId,
    can: (c) => capabilities.has(c),
  })

  return NextResponse.json(
    { counts, navBadges: navBadgesFromCounts(counts) },
    { headers: { 'Cache-Control': 'private, max-age=30' } }
  )
}
