import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/jwt'
import { sendPushToUser } from '@/lib/push'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const body = await request.json().catch(() => ({}))

    const title = String(body.title || 'Test notification')
    const bodyText = String(body.body || 'Ceci est un test de notification push.')
    const appType = body.appType === 'provider' ? 'provider' : 'consumer'

    const result = await sendPushToUser(userId, {
      title,
      body: bodyText,
      appType,
      data: { type: 'test' },
      channelId: 'services',
      sound: 'default',
    })

    return NextResponse.json({
      success: result.success,
      result,
      message: result.success ? 'Notification envoyée' : (result.error || 'Échec envoi notification'),
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/notifications/test-push]', e)
    return NextResponse.json({ error: 'Erreur envoi notification' }, { status: 500 })
  }
}
