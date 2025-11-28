import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { jwtVerify } from 'jose'
import { generateMaintenanceVisits } from '@/lib/maintenance/schedule'

async function verifyAdmin(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
    throw new Error('Accès réservé aux administrateurs')
  }
  return { userId: payload.userId as string }
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)
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
    console.error('Erreur génération visites maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    const status = message.toLowerCase().includes('accès') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

