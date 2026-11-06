import { NextRequest, NextResponse } from 'next/server'
import { runAdminAgent, isPlainRecord, type AgentPendingAction, type AgentRunResult } from '@/lib/ai/agent'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'
import { verifyAuthServer } from '@/lib/auth-server'
import { AiConfigMissingError, AiServiceUnavailableError } from '@/lib/ai/qwen'
import { adminAgentTools, adminAgentHandlers } from './tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

class PendingActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PendingActionError'
  }
}

async function requireStaff(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return { response: rateLimitResponse }

  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return { response: NextResponse.json({ error: auth.error || 'Non authentifié' }, { status: 401 }) }
  }
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER']
  if (!allowedRoles.includes(String(auth.user.role || '').toUpperCase())) {
    return { response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }
  return { auth }
}

function isPendingAction(value: unknown): value is AgentPendingAction {
  if (!isPlainRecord(value)) return false
  const p = value
  return typeof p.tool === 'string' && isPlainRecord(p.args) && typeof p.reasoning === 'string'
}

async function executePendingAction(
  pending: AgentPendingAction,
  caller: { userId: string; role: string }
): Promise<AgentRunResult> {
  const toolDef = adminAgentTools.find((t) => t.name === pending.tool)
  if (!toolDef) throw new PendingActionError(`Outil inconnu : ${pending.tool}`)
  if (toolDef.readOnly) throw new PendingActionError(`L'outil ${pending.tool} ne nécessite pas de confirmation`)

  const handler = adminAgentHandlers[pending.tool]
  if (!handler) throw new PendingActionError(`L'outil ${pending.tool} n'est pas implémenté`)

  try {
    const observation = await handler(pending.args, true, caller)
    return {
      finalAnswer: `Action "${pending.tool}" exécutée. Résultat : ${JSON.stringify(observation)}.`,
      trace: [
        {
          thought: pending.reasoning,
          tool: pending.tool,
          toolInput: pending.args,
          observation,
        },
      ],
      actions: [],
      pendingAction: undefined,
      source: 'confirmed',
      model: 'direct',
      raw: JSON.stringify(pending),
    }
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'Échec de l\'action'
    throw new PendingActionError(`[${pending.tool}] ${detail}`)
  }
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request)
  if (staff.response) return staff.response
  const auth = staff.auth!
  const user = auth.user!
  const caller = { userId: user.id, role: user.role }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const confirmed = raw.confirmed === true
    const pendingAction = raw.pendingAction
    const message = typeof raw.message === 'string' ? raw.message : undefined

    let result: AgentRunResult

    if (isPendingAction(pendingAction)) {
      if (!confirmed) {
        return NextResponse.json({ error: 'pendingAction nécessite confirmed: true' }, { status: 400 })
      }
      result = await executePendingAction(pendingAction, caller)
    } else {
      if (!message) {
        return NextResponse.json({ error: 'message ou pendingAction requis' }, { status: 400 })
      }
      // Propose-only phase: writes are never executed here, only returned as pendingAction
      result = await runAdminAgent(
        message,
        adminAgentTools,
        adminAgentHandlers,
        caller,
        { confirmed: false }
      )
    }

    return NextResponse.json({
      success: true,
      finalAnswer: result.finalAnswer,
      trace: result.trace,
      pendingAction: result.pendingAction,
      source: result.source,
      model: result.model,
    })
  } catch (err: unknown) {
    console.error('[POST /api/admin/agent] error:', err)
    if (err instanceof PendingActionError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof AiConfigMissingError || err instanceof AiServiceUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    const message = err instanceof Error ? err.message : 'Agent indisponible'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request)
  if (staff.response) return staff.response

  return NextResponse.json({
    tools: adminAgentTools.map((t) => ({
      name: t.name,
      description: t.description,
      readOnly: t.readOnly,
      parameters: t.parameters,
    })),
  })
}
