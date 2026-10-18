import { NextRequest, NextResponse } from 'next/server'
import {
  extractTextFromPDF,
  extractInvoiceFromExcel,
  parseInvoiceFromText,
  type ExtractedInvoice
} from '@/lib/invoice-extractor'
import { ADMIN_ROLES, authErrorResponse, requireApiUser } from '@/lib/api-auth'
import { aiStructureDocument, IMPORT_MAX_BYTES, SCANNED_PDF_ERROR } from '@/lib/document-ai-extract'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    await requireApiUser(request, [...ADMIN_ROLES, 'ACCOUNTANT'])
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
    let extracted: ExtractedInvoice

    if (filename.endsWith('.pdf') || file.type === 'application/pdf') {
      const text = await extractTextFromPDF(buffer)
      if (text.replace(/\s/g, '').length < 20) {
        return NextResponse.json({ error: SCANNED_PDF_ERROR }, { status: 422 })
      }
      extracted = parseInvoiceFromText(text)
      if (extracted.items.length === 0) {
        const ai = await aiStructureDocument(text, 'invoice')
        if (ai) {
          extracted = {
            ...extracted,
            numero: extracted.numero || ai.numero,
            date: extracted.date || ai.date,
            dueDate: extracted.dueDate || ai.dueDate,
            client: { ...ai.client, ...Object.fromEntries(Object.entries(extracted.client || {}).filter(([, v]) => v)) },
            items: ai.lines.map(l => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: Math.round(l.quantity * l.unitPrice),
              category: l.isLabor ? 'services' : undefined,
            })),
            subtotal: undefined,
            taxAmount: ai.taxAmount ?? extracted.taxAmount,
            total: undefined,
            notes: extracted.notes || ai.notes,
          }
        }
      }
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      extracted = extractInvoiceFromExcel(buffer)
    } else {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez PDF, Excel (.xlsx) ou CSV.' },
        { status: 400 }
      )
    }

    // Normalisation
    if (!extracted.subtotal && extracted.items.length > 0) {
      extracted.subtotal = extracted.items.reduce((s, p) => s + p.totalPrice, 0)
    }
    if (!extracted.taxRate) extracted.taxRate = 18
    if (!extracted.taxAmount && extracted.subtotal) {
      extracted.taxAmount = extracted.subtotal * (extracted.taxRate / 100)
    }
    if (!extracted.total && extracted.subtotal !== undefined) {
      extracted.total = extracted.subtotal + (extracted.taxAmount || 0)
    }
    if (!extracted.dueDate && extracted.date) {
      const d = new Date(extracted.date)
      d.setDate(d.getDate() + 30)
      extracted.dueDate = d.toISOString().split('T')[0]
    }

    return NextResponse.json({ success: true, data: extracted })
  } catch (err: any) {
    console.error('Erreur extraction facture:', err)
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de l\'extraction du fichier' },
      { status: 500 }
    )
  }
}
