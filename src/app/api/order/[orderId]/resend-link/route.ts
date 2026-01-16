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

/**
 * POST /api/order/[orderId]/resend-link
 * Body: { email: string, phone?: string }
 * - If email(+optional phone) matches order, rotates token and emails a fresh tracking link.
 * - Returns generic success to prevent enumeration.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const rateLimitResponse = applyRateLimit(request, apiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { orderId } = await params
    const body = await request.json().catch(() => ({}))
    const email = normalizeEmail(body?.email)
    const phone = normalizePhone(body?.phone)

    // Always respond generically; validate minimal input to avoid abuse
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        {
          success: true,
          message: "Si les informations sont correctes, vous recevrez un email avec le lien de suivi."
        },
        { status: 200 }
      )
    }

    await connectDB()

    const order = (await Order.findOne({ orderId }).lean()) as any
    if (!order || !order.clientEmail) {
      return NextResponse.json(
        {
          success: true,
          message: "Si les informations sont correctes, vous recevrez un email avec le lien de suivi."
        },
        { status: 200 }
      )
    }

    const orderEmail = normalizeEmail(order.clientEmail)
    if (orderEmail !== email) {
      return NextResponse.json(
        {
          success: true,
          message: "Si les informations sont correctes, vous recevrez un email avec le lien de suivi."
        },
        { status: 200 }
      )
    }

    // Optional extra check: if phone provided, must match last digits
    if (phone) {
      const orderPhone = normalizePhone(order.clientPhone)
      if (!orderPhone || !orderPhone.endsWith(phone.slice(-6))) {
        return NextResponse.json(
          {
            success: true,
            message: "Si les informations sont correctes, vous recevrez un email avec le lien de suivi."
          },
          { status: 200 }
        )
      }
    }

    // Rotate token
    const newToken = crypto.randomBytes(32).toString('base64url')
    const newHash = hashTrackingToken(newToken)
    await Order.updateOne(
      { orderId },
      { $set: { trackingAccessTokenHash: newHash, trackingAccessTokenCreatedAt: new Date() } }
    )

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const trackingUrl = `${baseUrl}/commandes/${encodeURIComponent(orderId)}?token=${encodeURIComponent(newToken)}`

    const subject = `Votre lien de suivi - ${orderId}`
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 8px">Lien de suivi</h2>
        <p style="margin:0 0 12px">Voici votre nouveau lien de suivi (le précédent n'est plus valide) :</p>
        <p style="margin:0 0 16px"><a href="${trackingUrl}">${trackingUrl}</a></p>
        <p style="margin:0;color:#555">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `.trim()

    await emailService.sendEmail({ to: email, subject, html })

    return NextResponse.json(
      {
        success: true,
        message: "Si les informations sont correctes, vous recevrez un email avec le lien de suivi."
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur resend link:', error)
    // Do not leak errors to caller
    return NextResponse.json(
      {
        success: true,
        message: "Si les informations sont correctes, vous recevrez un email avec le lien de suivi."
      },
      { status: 200 }
    )
  }
}
