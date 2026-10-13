import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireDomainAccess, requireCompanyCapability } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { CLIENT_VISIBLE_INVOICE } from '@/lib/client-documents'
import { renderInvoicePdf, pdfResponseHeaders } from '@/lib/pdf-documents'

export const runtime = 'nodejs'

// GET /api/client-enterprise/invoices/[id]/pdf[?inline=1] — facture au format PDF
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  const denied = requireCompanyCapability(access, 'finance:view')
  if (denied) return denied
  const companyClientId = access.profiles.companyClientId
  if (!companyClientId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectDB()
  const invoice = await AdminInvoice.findOne({
    _id: new mongoose.Types.ObjectId(id),
    $or: [
      { clientUserId: new mongoose.Types.ObjectId(access.userId) },
      { clientCompanyId: new mongoose.Types.ObjectId(companyClientId) },
    ],
    ...CLIENT_VISIBLE_INVOICE,
  }).lean() as any
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  try {
    const inline = new URL(request.url).searchParams.get('inline') === '1'
    return new NextResponse(new Uint8Array(renderInvoicePdf(invoice)), { headers: pdfResponseHeaders('Facture', invoice.numero, inline) })
  } catch (error) {
    console.error('[client-enterprise] PDF facture:', error)
    return NextResponse.json({ error: 'Génération du PDF impossible' }, { status: 500 })
  }
}
