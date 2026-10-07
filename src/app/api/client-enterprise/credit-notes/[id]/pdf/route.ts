import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireDomainAccess } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import CreditNote from '@/lib/models/CreditNote'
import { renderCreditNotePdf, pdfResponseHeaders } from '@/lib/pdf-documents'

export const runtime = 'nodejs'

// GET /api/client-enterprise/credit-notes/[id]/pdf[?inline=1] — avoir au format PDF
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  const companyClientId = access.profiles.companyClientId
  if (!companyClientId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectDB()
  const creditNote = await CreditNote.findOne({
    _id: new mongoose.Types.ObjectId(id),
    $or: [
      { clientUserId: new mongoose.Types.ObjectId(access.userId) },
      { clientCompanyId: new mongoose.Types.ObjectId(companyClientId) },
    ],
  }).lean() as any
  if (!creditNote) return NextResponse.json({ error: 'Avoir introuvable' }, { status: 404 })

  try {
    const inline = new URL(request.url).searchParams.get('inline') === '1'
    return new NextResponse(new Uint8Array(renderCreditNotePdf(creditNote)), { headers: pdfResponseHeaders('Avoir', creditNote.numero, inline) })
  } catch (error) {
    console.error('[client-enterprise] PDF avoir:', error)
    return NextResponse.json({ error: 'Génération du PDF impossible' }, { status: 500 })
  }
}
