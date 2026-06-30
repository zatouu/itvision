import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PushToken from '@/lib/models/PushToken'
import { requireAuth } from '@/lib/jwt'
import { isValidPushToken } from '@/lib/push'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    await connectMongoose()
    const tokens = await PushToken.find({ userId }).select('token platform appType createdAt updatedAt').lean()
    return NextResponse.json({
      tokens: tokens.map((t: any) => ({
        token: String(t.token).slice(0, 30) + '...',
        platform: t.platform,
        appType: t.appType,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/notifications/push-token]', e)
    return NextResponse.json({ error: 'Erreur liste tokens' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { token, platform, appType } = body as any

    // Accepte les tokens Expo et les tokens natifs FCM/apns (bare builds)
    if (!isValidPushToken(token)) {
      return NextResponse.json({ error: 'Token push invalide' }, { status: 400 })
    }

    const safePlatform = ['ios', 'android', 'web'].includes(platform) ? platform : 'android'
    const safeAppType = ['consumer', 'provider'].includes(appType) ? appType : 'consumer'

    await connectMongoose()

    // Upsert : si le token existe déjà pour ce user, on met à jour
    await PushToken.findOneAndUpdate(
      { token },
      { userId, token, platform: safePlatform, appType: safeAppType },
      { upsert: true, new: true }
    )

    console.log(`[Push] Token enregistré pour user ${userId} (${safePlatform}/${safeAppType}): ${token.slice(0, 30)}...`)
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
