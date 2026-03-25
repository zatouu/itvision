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
      .select('numero title date status subtotal brsAmount taxAmount other total client projectId createdAt updatedAt products notes bonCommande dateLivraison pointExpedition conditions clientResponse clientRespondedAt clientCounterAmount clientComments sentAt acceptedAt rejectedAt')
      .lean(),
    AdminInvoice.find(userFilter).sort({ date: -1 }).limit(50)
      .select('numero date dueDate status total client quoteId paidAt projectId createdAt')
      .lean()
  ])

  const normalizedQuotes = (quotes as any[]).map((q) => ({
    ...q,
    products: Array.isArray(q.products) ? q.products : [],
    clientComments: Array.isArray(q.clientComments)
      ? [...q.clientComments].sort((a: any, b: any) => {
          const at = new Date(a?.createdAt || 0).getTime()
          const bt = new Date(b?.createdAt || 0).getTime()
          return at - bt
        })
      : []
  }))

  return NextResponse.json({ quotes: normalizedQuotes, invoices })
}
