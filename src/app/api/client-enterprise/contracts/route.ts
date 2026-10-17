import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyScope, canCompany } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'

export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = access.profiles.companyClientId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const filter: any = companyScope({ userId, companyId })
  if (status) filter.status = status

  const query = MaintenanceContract.find(filter).sort({ createdAt: -1 })
  if (!access.isAdmin && !canCompany(access, 'finance:view')) query.select('-annualPrice')
  const contracts = await query.lean()

  return NextResponse.json({ contracts })
}
