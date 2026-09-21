import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AgentDecision from '@/lib/models/AgentDecision'
import { resumeProductModeration } from '@/lib/agents/moderation/run'
import { resumeSourcingRequest } from '@/lib/agents/sourcing/request-run'

// Décision humaine → reprend le graphe figé (interrupt) avec Command({resume})
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const { action, note } = await req.json().catch(() => ({}))
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action invalide (approve|reject)' }, { status: 400 })
    }

    await connectMongoose()
    const decision = await AgentDecision.findById(id)
    if (!decision) {
      return NextResponse.json({ success: false, error: 'Décision introuvable' }, { status: 404 })
    }
    if (decision.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Décision déjà traitée' }, { status: 409 })
    }

    // Marque en cours de traitement pour éviter un double-clic
    decision.status = action === 'approve' ? 'approved' : 'rejected'
    decision.decidedBy = auth.user?.email || 'admin'
    decision.adminNote = note
    decision.decidedAt = new Date()
    await decision.save()

    // Reprend le graphe — apply() applique l'action (publier/notifier…)
    const resumers: Record<string, (runId: string, d: any) => Promise<void>> = {
      product_moderation: resumeProductModeration,
      sourcing_request: resumeSourcingRequest,
    }
    const resume = resumers[decision.type]
    if (resume) {
      try {
        await resume(decision.runId, { action, note, decidedBy: decision.decidedBy })
      } catch (e) {
        console.error('[agent-decisions] resume failed:', e)
        // La décision est enregistrée — l'application sera rejouable
      }
    }

    return NextResponse.json({ success: true, decision: { id, status: decision.status } })
  } catch (e) {
    console.error('POST /api/admin/agent-decisions/[id] error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
