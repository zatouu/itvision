import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AgentJob from '@/lib/models/AgentJob'
import Product from '@/lib/models/Product'
import { enqueueAgentJob, hasActiveJob } from '@/lib/agents/queue'

const ScanSchema = z.object({
  query: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional(),
  maxItems: z.number().int().min(1).max(30).optional(),
  groupBuyEligible: z.boolean().optional(),
})

/**
 * POST /api/admin/sourcing — lance une veille 1688 (agent sourcing_scan).
 * L'agent navigue comme un humain : recherche → extraction des offres →
 * scoring prix (CNY→FCFA + marge + frais + assurance) → brouillons produits
 * → chaque brouillon entre dans la file de modération IA.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = ScanSchema.parse(await req.json())
    await connectMongoose()

    // Throttle : un seul scan actif à la fois (le navigateur est lourd)
    if (await hasActiveJob('sourcing_scan')) {
      return NextResponse.json(
        { success: false, error: 'Un scan 1688 est déjà en cours — attendez la fin avant de relancer.' },
        { status: 409 }
      )
    }

    // refId = query normalisée → dédup naturelle : même recherche, pas de doublon
    const refId = body.query.toLowerCase()
    const job = await enqueueAgentJob('sourcing_scan', refId, {
      query: body.query,
      category: body.category,
      maxItems: body.maxItems,
      groupBuyEligible: body.groupBuyEligible,
    })
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Une veille identique est déjà en file.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, jobId: String(job._id) })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: e.issues[0]?.message || 'Paramètres invalides' }, { status: 400 })
    }
    console.error('POST /api/admin/sourcing error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

/** GET /api/admin/sourcing — historique des scans + catégories catalogue */
export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectMongoose()
    const [jobs, categories] = await Promise.all([
      AgentJob.find({ type: 'sourcing_scan' }).sort({ createdAt: -1 }).limit(20).lean(),
      Product.distinct('category'),
    ])

    return NextResponse.json({
      success: true,
      categories: categories.filter(Boolean).sort(),
      jobs: jobs.map((j: any) => ({
        id: String(j._id),
        query: j.payload?.query || j.refId,
        status: j.status,
        attempts: j.attempts,
        result: j.result,
        error: j.error,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
    })
  } catch (e) {
    console.error('GET /api/admin/sourcing error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
