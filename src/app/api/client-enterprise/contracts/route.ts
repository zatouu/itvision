import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'

export async function GET(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const filter: any = { clientId: userId }
  if (status) filter.status = status

  const contracts = await MaintenanceContract.find(filter)
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ contracts })
}
