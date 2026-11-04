import { NextRequest, NextResponse } from 'next/server'
import { decideApproval } from '@/lib/workflow/approvals'
import { verifyAuthServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/approvals/[token] { decision: 'approve' | 'reject' }
 * Décision du pilote. Le jeton (48 hex, usage unique, expirant) est l'autorisation :
 * il ne permet que CETTE décision. Si un admin est connecté, il est tracé comme décideur.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await request.json().catch(() => ({})) as any
  const decision = body?.decision === 'reject' ? 'reject' : body?.decision === 'approve' ? 'approve' : null
  if (!decision) return NextResponse.json({ error: 'Décision invalide' }, { status: 400 })

  const auth = await verifyAuthServer(request).catch(() => null)
  const admin = auth?.isAuthenticated && ['ADMIN', 'SUPER_ADMIN'].includes(String(auth.user?.role || '').toUpperCase())
  const result = await decideApproval(token, decision, admin ? 'admin' : 'email', admin ? (auth!.user!.email || 'admin') : 'pilote (lien mail)')
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ success: true, status: result.status, message: result.message })
}
