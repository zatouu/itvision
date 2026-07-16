import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { sendWebPushToUser, sendWebPushToOrder, WebPushMessage } from '@/lib/push-web'
import { z } from 'zod'

const sendSchema = z.object({
  userId: z.string().optional(),
  orderId: z.string().optional(),
  message: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    icon: z.string().optional(),
    badge: z.string().optional(),
    url: z.string().optional(),
    tag: z.string().optional(),
    requireInteraction: z.boolean().optional(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(['ADMIN', 'SUPER_ADMIN'], req)
    if (!auth || !auth.isAuthenticated) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }

    const { userId, orderId, message } = parsed.data
    const pushMessage: WebPushMessage = {
      title: message.title,
      body: message.body,
      icon: message.icon,
      badge: message.badge,
      url: message.url,
      tag: message.tag,
      requireInteraction: message.requireInteraction,
    }

    if (userId) {
      const result = await sendWebPushToUser(userId, pushMessage)
      return NextResponse.json({ success: result.success, result })
    }

    if (orderId) {
      const result = await sendWebPushToOrder(orderId, pushMessage)
      return NextResponse.json({ success: result.success, result })
    }

    return NextResponse.json({ error: 'userId ou orderId requis' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/notifications/send error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
