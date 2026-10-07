import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import CreditNote from '@/lib/models/CreditNote'
import { renderCreditNotePdf, pdfResponseHeaders } from '@/lib/pdf-documents'

export const runtime = 'nodejs'

// GET /api/admin/credit-notes/[id]/pdf[?inline=1]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectMongoose()
  const creditNote = await CreditNote.findById(id).lean() as any
  if (!creditNote) return NextResponse.json({ error: 'Avoir introuvable' }, { status: 404 })

  try {
    const inline = new URL(request.url).searchParams.get('inline') === '1'
    return new NextResponse(new Uint8Array(renderCreditNotePdf(creditNote)), { headers: pdfResponseHeaders('Avoir', creditNote.numero, inline) })
  } catch (error) {
    console.error('[admin] PDF avoir:', error)
    return NextResponse.json({ error: 'Génération du PDF impossible' }, { status: 500 })
  }
}
