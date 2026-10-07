import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireDomainAccess } from '@/lib/domain-access'
import { getAgendaEvents, toIcs } from '@/lib/portal/agenda'

/** Fichier .ics des rendez-vous à venir (tous, ou un seul via ?uid=). */
export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  await connectDB()

  const companyId = access.profiles.companyClientId
  if (!companyId) return NextResponse.json({ error: 'Espace entreprise introuvable' }, { status: 404 })
  const uid = request.nextUrl.searchParams.get('uid')
  const events = (await getAgendaEvents({ userId: access.userId, companyId })).filter(e => !uid || e.uid === uid)
  if (uid && !events.length) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })

  const ics = toIcs(events, request.nextUrl.origin)
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${uid ? 'rendez-vous' : 'agenda-it-vision'}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
