import { NextRequest, NextResponse } from 'next/server'
import {
  extractTextFromPDF,
  extractFromExcel,
  parseQuoteFromText,
  type ExtractedQuote
} from '@/lib/quote-extractor'
import { ADMIN_ROLES, authErrorResponse, requireApiUser } from '@/lib/api-auth'
import { aiStructureDocument, IMPORT_MAX_BYTES, SCANNED_PDF_ERROR } from '@/lib/document-ai-extract'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    await requireApiUser(request, ADMIN_ROLES)
  } catch (error) {
    return authErrorResponse(error) || NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }
    if (file.size > IMPORT_MAX_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (15 Mo max)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name.toLowerCase()
    let extracted: ExtractedQuote

    if (filename.endsWith('.pdf') || file.type === 'application/pdf') {
      const text = await extractTextFromPDF(buffer)
      if (text.replace(/\s/g, '').length < 20) {
        return NextResponse.json({ error: SCANNED_PDF_ERROR }, { status: 422 })
      }
      extracted = parseQuoteFromText(text)
      if (extracted.products.length === 0) {
        const ai = await aiStructureDocument(text, 'quote')
        if (ai) {
          extracted = {
            ...extracted,
            numero: extracted.numero || ai.numero,
            date: extracted.date || ai.date,
            title: extracted.title || ai.title,
            client: { ...ai.client, ...Object.fromEntries(Object.entries(extracted.client || {}).filter(([, v]) => v)) },
            products: ai.lines.map(l => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: Math.round(l.quantity * l.unitPrice),
              isLabor: l.isLabor,
            })),
            subtotal: undefined,
            total: undefined,
            notes: extracted.notes || ai.notes,
          }
        }
      }
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      extracted = extractFromExcel(buffer)
    } else {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez PDF, Excel (.xlsx) ou CSV.' },
        { status: 400 }
      )
    }

    // Normalisation : s'assurer que les totaux sont cohérents
    if (!extracted.subtotal && extracted.products.length > 0) {
      extracted.subtotal = extracted.products.reduce((s, p) => s + p.total, 0)
    }
    if (!extracted.brsAmount && extracted.subtotal) {
      const laborTotal = extracted.products.filter(p => p.isLabor).reduce((s, p) => s + p.total, 0)
      extracted.brsAmount = laborTotal * 0.05
    }
    if (!extracted.total && extracted.subtotal !== undefined) {
      extracted.total = extracted.subtotal - (extracted.brsAmount || 0) + (extracted.taxAmount || 0) + (extracted.other || 0)
    }

    return NextResponse.json({ success: true, data: extracted })
  } catch (err: any) {
    console.error('Erreur extraction devis:', err)
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de l\'extraction du fichier' },
      { status: 500 }
    )
  }
}
