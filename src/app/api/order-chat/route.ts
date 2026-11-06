import { NextRequest, NextResponse } from 'next/server'
import {
  listThreadMessages,
  markThreadRead,
  postMessage,
  toOrderMessageDto,
  EmptyMessageError,
} from '@/lib/messaging/thread-messages'
import {
  resolveOrderChatAccess,
  notifyAdminsOfClientMessage,
  notifyClientOfSupportReply,
} from '@/lib/messaging/order-chat'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderReference = searchParams.get('orderReference')
    if (!orderReference) {
      return NextResponse.json({ success: false, error: 'orderReference requis' }, { status: 400 })
    }

    const access = await resolveOrderChatAccess(req, orderReference, searchParams.get('token'))
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const messages = await listThreadMessages('order', orderReference, { limit: 200 })

    // Ouvrir le fil vaut lecture des messages de l'autre partie
    const readerId = access.user?.userId || `guest:${orderReference}`
    void markThreadRead('order', orderReference, readerId, {
      senderRoles: access.isAdmin ? ['client'] : ['admin', 'system'],
    }).catch(() => {})

    return NextResponse.json({ success: true, messages: messages.map(toOrderMessageDto) })
  } catch (err) {
    console.error('[order-chat] Erreur GET:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { orderReference, text } = body
    if (!orderReference || typeof orderReference !== 'string') {
      return NextResponse.json({ success: false, error: 'orderReference et text requis' }, { status: 400 })
    }

    const token = req.nextUrl.searchParams.get('token') || body.token
    const access = await resolveOrderChatAccess(req, orderReference, token)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const message = await postMessage({
      threadType: 'order',
      threadId: orderReference,
      senderId: access.user?.userId,
      senderRole: access.isAdmin ? 'admin' : 'client',
      senderName: access.isAdmin
        ? 'Support IT Vision'
        : access.user
          ? access.user.username || access.user.email || 'Client'
          : 'Invité',
      text,
      attachments: body.attachments,
    })

    if (access.isAdmin) {
      void notifyClientOfSupportReply(access.order, message).catch((err) => console.error('[order-chat] notify client:', err))
    } else {
      notifyAdminsOfClientMessage(message)
    }

    return NextResponse.json({ success: true, message: toOrderMessageDto(message) }, { status: 201 })
  } catch (err) {
    if (err instanceof EmptyMessageError) {
      return NextResponse.json({ success: false, error: 'orderReference et text requis' }, { status: 400 })
    }
    console.error('[order-chat] Erreur POST:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
