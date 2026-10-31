import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { getAppConfig } from '@/lib/wallet'

export const dynamic = 'force-dynamic'

/**
 * GET /api/services/app-config — interrupteurs produit lus par l'app Xeuy (pilotés depuis /admin/platform/config).
 * onlinePayments=false : lancement en espèces, l'app masque Wave/OM, séquestre, recharges et retraits.
 */
export async function GET(request: NextRequest) {
  try {
    await requireApiUser(request)
    const cfg = await getAppConfig()
    return NextResponse.json({
      onlinePayments: cfg.integrations?.onlinePayments?.enabled === true,
      ddmBridge: cfg.integrations?.ddmBridge?.enabled === true,
      creditsUnlock: cfg.credits?.unlockEnabled === true,
      escrow: cfg.escrow?.enabled === true,
    })
  } catch (e) {
    const authRes = authErrorResponse(e)
    if (authRes) return authRes
    console.error('[GET /api/services/app-config]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
