import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AgentDecision from '@/lib/models/AgentDecision'

// File de décisions IA en attente — vue « Copilote » admin
export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectMongoose()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    const filter = status === 'all' ? {} : { status }
    const decisions = await AgentDecision.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    const pendingCount = await AgentDecision.countDocuments({ status: 'pending' })

    return NextResponse.json({
      success: true,
      pendingCount,
      decisions: decisions.map((d: any) => ({
        id: String(d._id),
        type: d.type,
        refId: d.refId,
        runId: d.runId,
        status: d.status,
        proposal: d.proposal,
        decidedBy: d.decidedBy,
        decidedAt: d.decidedAt,
        adminNote: d.adminNote,
        createdAt: d.createdAt,
      })),
    })
  } catch (e) {
    console.error('GET /api/admin/agent-decisions error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
