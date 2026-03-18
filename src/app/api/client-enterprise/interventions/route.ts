import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'

export async function GET(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 15
  const filter: any = { clientId: userId }
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
