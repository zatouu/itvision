import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/jwt'

async function requireManagerRole(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

function extractRunId(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  // Accept raw runId or full URL like https://api.apify.com/v2/actor-runs/<runId>?...
  try {
    const url = new URL(value)
    const match = url.pathname.match(/\/actor-runs\/([^/]+)/)
    return match?.[1] || null
  } catch {
    return value
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireManagerRole(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const runInput = searchParams.get('runId') || ''
  const runId = extractRunId(runInput)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 12)))

  if (!runId) {
    return NextResponse.json({ success: false, error: 'runId est requis' }, { status: 400 })
  }

  try {
    const { importFromApifyRun } = await import('@/lib/import-sources')
    const result = await importFromApifyRun(runId, limit, { source: 'apify' })

    return NextResponse.json({ success: true, items: result.items, total: result.total, hasMore: result.hasMore })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Apify'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
