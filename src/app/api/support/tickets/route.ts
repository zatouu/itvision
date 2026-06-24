import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import SupportTicket from '@/lib/models/SupportTicket'
import { requireAuth } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    let userId: string | undefined
    try {
      const auth = await requireAuth(req)
      userId = String(auth.userId)
    } catch {
      userId = undefined
    }

    const body = await req.json().catch(() => ({}))
    const { orderId, subject, message, phone, email } = body as any

    if (!subject || !message || typeof subject !== 'string' || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Sujet et message requis' }, { status: 400 })
    }

    const ticket = await SupportTicket.create({
      userId,
      orderId: orderId ? String(orderId) : undefined,
      subject: subject.slice(0, 200),
      message: message.slice(0, 2000),
      phone: phone ? String(phone).slice(0, 50) : undefined,
      email: email ? String(email).slice(0, 200) : undefined,
    })

    return NextResponse.json({ success: true, ticketId: String(ticket._id) }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/support/tickets]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
