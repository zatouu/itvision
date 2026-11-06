import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PushSubscription from '@/lib/models/PushSubscription'
import { verifyAuthToken } from '@/lib/jwt'
import { z } from 'zod'

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  orderId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }

    await connectMongoose()

    const { subscription, orderId } = parsed.data
    const { endpoint, keys } = subscription

    let userId: string | undefined
    try {
      const token = req.cookies.get('auth-token')?.value
      if (token) {
        const decoded = await verifyAuthToken(token)
        userId = decoded.userId
      }
    } catch {}

    const doc = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
        orderId,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({ success: true, subscription: { id: String(doc._id), endpoint } }, { status: 201 })
  } catch (error) {
    console.error('POST /api/notifications/subscribe error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
