import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MilestoneKnowledge from '@/lib/models/MilestoneKnowledge'
import { requireAdminApi } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET: récupérer les templates de connaissance par phase et serviceType
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const phaseTemplate = searchParams.get('phaseTemplate')
    const serviceType = searchParams.get('serviceType')

    const filter: any = {}
    if (phaseTemplate) filter.phaseTemplate = phaseTemplate
    if (serviceType) filter.serviceType = serviceType

    const items = await MilestoneKnowledge.find(filter).sort({ updatedAt: -1 }).lean()
    return NextResponse.json({ items })
  } catch (e) {
    console.error('Erreur GET milestone-knowledge:', e)
    return NextResponse.json({ error: 'Erreur récupération' }, { status: 500 })
  }
}

// POST: créer ou mettre à jour un template
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectMongoose()
    const body = await request.json()
    const { id, phaseTemplate, serviceType, title, description, expectedTasks, expectedDeliverables, guides } = body

    if (!phaseTemplate || !serviceType || !title) {
      return NextResponse.json({ error: 'phaseTemplate, serviceType et title requis' }, { status: 400 })
    }

    if (id) {
      const updated = await MilestoneKnowledge.findByIdAndUpdate(
        id,
        { phaseTemplate, serviceType, title, description, expectedTasks, expectedDeliverables, guides },
        { new: true }
      )
      return NextResponse.json({ success: true, item: updated })
    }

    const created = await MilestoneKnowledge.create({
      phaseTemplate, serviceType, title, description, expectedTasks, expectedDeliverables, guides
    })
    return NextResponse.json({ success: true, item: created })
  } catch (e) {
    console.error('Erreur POST milestone-knowledge:', e)
    return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 })
  }
}

// PATCH: ajouter une community learning
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectMongoose()
    const body = await request.json()
    const { id, learning } = body
    if (!id || !learning) return NextResponse.json({ error: 'Champs requis' }, { status: 400 })

    const updated = await MilestoneKnowledge.findByIdAndUpdate(
      id,
      { $push: { communityLearnings: learning } },
      { new: true }
    )
    return NextResponse.json({ success: true, item: updated })
  } catch (e) {
    console.error('Erreur PATCH milestone-knowledge:', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
