import { NextRequest, NextResponse } from 'next/server'
import { runAdminAgent } from '@/lib/ai/agent'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'
import { requireAdminApi } from '@/lib/api-auth'
import { adminAgentTools, adminAgentHandlers } from './tools'

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { message, confirmed } = body as { message?: string; confirmed?: boolean }
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message est requis' }, { status: 400 })
    }

    const result = await runAdminAgent(
      message,
      adminAgentTools,
      adminAgentHandlers,
      { userId: auth.user.id, role: auth.user.role },
      { confirmed: confirmed === true }
    )

    return NextResponse.json({
      success: true,
      finalAnswer: result.finalAnswer,
      trace: result.trace,
      pendingAction: result.pendingAction,
      source: result.source,
      model: result.model,
    })
  } catch (err: any) {
    console.error('[POST /api/admin/agent] error:', err)
    return NextResponse.json(
      { error: err?.message || 'Agent indisponible' },
      { status: err?.message?.includes('QWEN_CLOUD_API_KEY') ? 503 : 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    tools: adminAgentTools.map((t) => ({
      name: t.name,
      description: t.description,
      readOnly: t.readOnly,
      parameters: t.parameters,
    })),
  })
}
