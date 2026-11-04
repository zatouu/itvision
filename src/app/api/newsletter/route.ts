/**
 * POST /api/newsletter — inscription newsletter (footer marketplace)
 *   body: { email }
 *   → { success, already } — idempotent, un seul abonnement par email.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NewsletterSubscriber from '@/lib/models/NewsletterSubscriber'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ success: false, error: 'Adresse email invalide' }, { status: 400 })
    }

    await connectDB()

    const res = await NewsletterSubscriber.updateOne(
      { email },
      { $setOnInsert: { email }, $set: { unsubscribedAt: null } },
      { upsert: true }
    )

    return NextResponse.json({ success: true, already: !res.upsertedCount })
  } catch (error) {
    console.error('POST /api/newsletter error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
