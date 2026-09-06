import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyScope } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'

export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = access.profiles.companyClientId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 15
  const filter: any = companyScope({ userId, companyId })
  if (status) filter.status = status

  const [interventions, total] = await Promise.all([
    Intervention.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('interventionNumber title typeIntervention priority status date service site technicienId activites observations signatures photosAvant photosApres maintenanceContractId isCoveredByContract')
      .lean(),
    Intervention.countDocuments(filter)
  ])

  return NextResponse.json({ interventions, total, page, pages: Math.ceil(total / limit) })
}
