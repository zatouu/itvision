import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PushToken from '@/lib/models/PushToken'
import { requireAuth } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { token, platform } = body as any

    // Validation token Expo format: ExponentPushToken[...] ou ExpoPushToken[...]
    if (!token || typeof token !== 'string' || (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken['))) {
      return NextResponse.json({ error: 'Token push invalide' }, { status: 400 })
    }

    const safePlatform = ['ios', 'android', 'web'].includes(platform) ? platform : 'android'

    await connectMongoose()

    // Upsert : si le token existe déjà pour ce user, on met à jour
    await PushToken.findOneAndUpdate(
      { token },
      { userId, token, platform: safePlatform },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/notifications/push-token]', e)
    return NextResponse.json({ error: 'Erreur enregistrement token' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 })
    }

    await connectMongoose()
    await PushToken.deleteOne({ userId, token })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[DELETE /api/notifications/push-token]', e)
    return NextResponse.json({ error: 'Erreur suppression token' }, { status: 500 })
  }
}
