import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, canCompany } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { CLIENT_VISIBLE_QUOTE, CLIENT_VISIBLE_INVOICE } from '@/lib/client-documents'

export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  const companyClientId = access.profiles.companyClientId
  if (!companyClientId) {
    return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = new mongoose.Types.ObjectId(companyClientId)
  const userFilter = { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }
  // finance:view = devis + factures ; quotes:respond seul = devis uniquement
  const canFinance = access.isAdmin || canCompany(access, 'finance:view')
  const canQuotes = canFinance || canCompany(access, 'quotes:respond')

  const [quotes, invoices] = await Promise.all([
    !canQuotes ? [] : AdminQuote.find({ ...userFilter, ...CLIENT_VISIBLE_QUOTE }).sort({ date: -1 }).limit(200)
      .select('numero title date status subtotal brsAmount taxAmount other total client projectId createdAt updatedAt products notes bonCommande dateLivraison pointExpedition conditions clientResponse clientRespondedAt clientCounterAmount clientComments sentAt acceptedAt rejectedAt')
      .lean(),
    !canFinance ? [] : AdminInvoice.find({ ...userFilter, ...CLIENT_VISIBLE_INVOICE }).sort({ date: -1 }).limit(200)
        .select('numero date dueDate status subtotal brsAmount taxRate taxAmount total amountPaid creditedAmount client quoteId paidAt projectId createdAt')
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

  return NextResponse.json({ quotes: normalizedQuotes, invoices, restricted: !canFinance })
}
