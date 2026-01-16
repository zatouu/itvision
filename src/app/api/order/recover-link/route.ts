import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { emailService } from '@/lib/email-service'
import { applyRateLimit, apiRateLimiter } from '@/lib/rate-limiter'

function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase()
}

function normalizePhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const GENERIC_RESPONSE = {
  success: true,
  message: "Si les informations sont correctes, vous recevrez un email avec vos liens de suivi."
}

/**
 * POST /api/order/recover-link
 * Body: { email: string, phone?: string }
 * - Sends tracking link(s) for recent orders matching the email.
 * - Rotates token(s) (old links become invalid).
 * - Always returns a generic success message to prevent enumeration.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, apiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json().catch(() => ({}))
    const email = normalizeEmail(body?.email)
    const phone = normalizePhone(body?.phone)

    if (!email || !email.includes('@')) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    await connectDB()

    const orders = (await Order.find({
      clientEmail: { $regex: `^${escapeRegex(email)}$`, $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()) as any[]

    if (!orders || orders.length === 0) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    const matchingOrders = phone
      ? orders.filter(o => {
          const orderPhone = normalizePhone(o?.clientPhone)
          return Boolean(orderPhone) && orderPhone.endsWith(phone.slice(-6))
        })
      : orders

    if (!matchingOrders || matchingOrders.length === 0) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

    const links: Array<{ orderId: string; url: string }> = []

    for (const order of matchingOrders) {
      const orderId = String(order?.orderId || '')
      if (!orderId) continue

      const newToken = crypto.randomBytes(32).toString('base64url')
      const newHash = hashTrackingToken(newToken)

      await Order.updateOne(
        { orderId },
        { $set: { trackingAccessTokenHash: newHash, trackingAccessTokenCreatedAt: new Date() } }
      )

      const trackingUrl = `${baseUrl}/commandes/${encodeURIComponent(orderId)}?token=${encodeURIComponent(newToken)}`
      links.push({ orderId, url: trackingUrl })
    }

    if (links.length === 0) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    const subject = `Vos liens de suivi de commande`
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 8px">Retrouver ma commande</h2>
        <p style="margin:0 0 12px">Voici vos liens de suivi (les anciens liens ne sont plus valides) :</p>
        <ul style="margin:0 0 16px;padding-left:18px">
          ${links
            .map(l => `<li style="margin:6px 0"><strong>${l.orderId}</strong> : <a href="${l.url}">${l.url}</a></li>`)
            .join('')}
        </ul>
        <p style="margin:0;color:#555">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `.trim()

    await emailService.sendEmail({ to: email, subject, html })

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  } catch (error) {
    console.error('Erreur recover link:', error)
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  }
}
