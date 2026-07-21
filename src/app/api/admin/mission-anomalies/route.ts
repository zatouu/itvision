import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import ServiceRequest from '@/lib/models/ServiceRequest'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { role } = await requireAuth(request)
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const minScore = Number(searchParams.get('minScore')) || 0
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const status = searchParams.get('status')

    const filter: any = { anomalyScore: { $gte: minScore } }
    if (status) filter.status = status

    const missions = await ServiceRequest.find(filter)
      .select('status category clientId assignedProviderId anomalyFlags anomalyScore createdAt updatedAt')
      .sort({ anomalyScore: -1, updatedAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ items: missions })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/admin/mission-anomalies]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
