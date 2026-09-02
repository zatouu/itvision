import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/jwt'
import { aiAssist, type AssistType } from '@/lib/ai/assist'
import { checkAiAvailability } from '@/lib/ai/qwen'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'

const VALID_TYPES: AssistType[] = ['enhance_request', 'clarify_request', 'analyze_request', 'mission_help', 'daily_tips']

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { userId } = await requireAuth(request)
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { type, category, description, attributes, answers, question, missionStatus, profile, nearbyCount, earnings, rating } = body as any

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    const result = await aiAssist({
      type: type as AssistType,
      category,
      description,
      attributes,
      answers: Array.isArray(answers) ? answers : undefined,
      question,
      missionStatus,
      profile,
      nearbyCount,
      earnings,
      rating,
    })

    return NextResponse.json({ text: result.text, questions: result.questions, source: result.source, model: result.model })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/ai/assist]', e)
    return NextResponse.json({ error: e.message || 'AI service unavailable' }, { status: 503 })
  }
}

export async function GET() {
  const status = await checkAiAvailability()
  return NextResponse.json(status)
}
