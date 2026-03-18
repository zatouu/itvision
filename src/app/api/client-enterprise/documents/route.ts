import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'

export async function GET(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const companyId = new mongoose.Types.ObjectId(auth.user.companyClientId)
  const userFilter = { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }

  const [quotes, invoices] = await Promise.all([
    AdminQuote.find(userFilter).sort({ date: -1 }).limit(50)
      .select('numero title date status total client projectId createdAt')
      .lean(),
    AdminInvoice.find(userFilter).sort({ date: -1 }).limit(50)
      .select('numero date dueDate status total client quoteId paidAt projectId createdAt')
      .lean()
  ])

  return NextResponse.json({ quotes, invoices })
}
