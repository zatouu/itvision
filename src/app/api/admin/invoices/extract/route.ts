import { NextRequest, NextResponse } from 'next/server'
import {
  extractTextFromPDF,
  extractInvoiceFromExcel,
  parseInvoiceFromText,
  type ExtractedInvoice
} from '@/lib/invoice-extractor'
import { requireAuth } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  let user
  try {
    user = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name.toLowerCase()
    let extracted: ExtractedInvoice

    if (filename.endsWith('.pdf')) {
      const text = await extractTextFromPDF(buffer)
      extracted = parseInvoiceFromText(text)
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
