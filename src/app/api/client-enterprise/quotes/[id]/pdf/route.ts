import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireDomainAccess, requireCompanyCapability, canCompany } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import AdminQuote from '@/lib/models/AdminQuote'
import { CLIENT_VISIBLE_QUOTE } from '@/lib/client-documents'
import { renderQuotePdf, pdfResponseHeaders } from '@/lib/pdf-documents'

export const runtime = 'nodejs'

// GET /api/client-enterprise/quotes/[id]/pdf[?inline=1] — devis au format PDF
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  const denied = requireCompanyCapability(access, canCompany(access, 'quotes:respond') ? 'quotes:respond' : 'finance:view')
  if (denied) return denied
  const companyClientId = access.profiles.companyClientId
  if (!companyClientId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectDB()
  const quote = await AdminQuote.findOne({
    _id: new mongoose.Types.ObjectId(id),
    $or: [
      { clientUserId: new mongoose.Types.ObjectId(access.userId) },
      { clientCompanyId: new mongoose.Types.ObjectId(companyClientId) },
    ],
    ...CLIENT_VISIBLE_QUOTE,
  }).lean() as any
  if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

  try {
    const inline = new URL(request.url).searchParams.get('inline') === '1'
    return new NextResponse(new Uint8Array(renderQuotePdf(quote)), { headers: pdfResponseHeaders('Devis', quote.numero, inline) })
  } catch (error) {
    console.error('[client-enterprise] PDF devis:', error)
    return NextResponse.json({ error: 'Génération du PDF impossible' }, { status: 500 })
  }
}
