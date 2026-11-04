import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { generateMaintenanceVisits } from '@/lib/maintenance/schedule'
import { requireApiUser, authErrorResponse, ADMIN_ROLES } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    await requireApiUser(request, ADMIN_ROLES)
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const from = fromParam ? new Date(fromParam) : new Date()
    const to = toParam ? new Date(toParam) : undefined

    const contracts = await MaintenanceContract.find({ status: 'active' })
      .populate('clientId', 'name company')
      .populate('preferredTechnicians', 'name email phone')
      .lean()

    const visits = contracts.flatMap((contract) =>
      generateMaintenanceVisits(contract as any, { from, to })
    )

    return NextResponse.json({
      success: true,
      visits
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur génération visites maintenance:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

