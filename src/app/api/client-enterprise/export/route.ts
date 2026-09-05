import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import AdminInvoice from '@/lib/models/AdminInvoice'
import AdminQuote from '@/lib/models/AdminQuote'

export const dynamic = 'force-dynamic'

/**
 * GET /api/client-enterprise/export?type=invoices|quotes
 * Retourne les lignes complètes (JSON) pour export comptable côté client.
 */
export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  await connectDB()
  const userId = access.userId
  const companyId = access.profiles.companyClientId
  const filter = companyId
    ? { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }
    : { clientUserId: userId }

  const type = new URL(request.url).searchParams.get('type') || 'invoices'

  if (type === 'quotes') {
    const quotes = await AdminQuote.find(filter)
      .sort({ date: -1 })
      .select('numero title date status subtotal total client')
      .lean()
    return NextResponse.json({ type, rows: quotes })
  }

  const invoices = await AdminInvoice.find(filter)
    .sort({ date: -1 })
    .select('numero date dueDate status subtotal total paidAt paymentMethod client')
    .lean()
  return NextResponse.json({ type: 'invoices', rows: invoices })
}
