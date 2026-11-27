import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { GroupShareEvent } from '@/lib/models/GroupShareEvent'
import { GroupOrder } from '@/lib/models/GroupOrder'

export const runtime = 'nodejs'

// Canaux reconnus — tout le reste est conservé tel quel s'il est alphanumérique court
// (liens futurs : nouvelles campagnes sans déploiement).
const cleanVia = (raw: unknown): string => {
  if (typeof raw !== 'string') return 'direct'
  const v = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40)
  return v || 'direct'
}

/**
 * POST /api/group-orders/[groupId]/track { event: 'view'|'reshare', via }
 * Mesure anonyme du funnel viral — pas de rate-limit strict (volume espéré élevé,
 * contenu sans valeur), mais validation stricte des entrées.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params
    const body = await req.json().catch(() => ({}))
    const event = body?.event === 'reshare' ? 'reshare' : 'view'
    const via = cleanVia(body?.via)

    await connectMongoose()
    // Le groupe doit exister — sinon la mesure est du bruit de scan/bot
    const exists = await GroupOrder.exists({ groupId })
    if (!exists) return NextResponse.json({ success: false }, { status: 404 })

    await GroupShareEvent.create({ groupId, event, via })
    return NextResponse.json({ success: true })
  } catch {
    // Le tracking ne doit jamais casser l'expérience : échec silencieux côté client
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
