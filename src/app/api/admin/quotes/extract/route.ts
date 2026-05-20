import { NextRequest, NextResponse } from 'next/server'
import {
  extractTextFromPDF,
  extractFromExcel,
  parseQuoteFromText,
  type ExtractedQuote
} from '@/lib/quote-extractor'
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
    let extracted: ExtractedQuote

    if (filename.endsWith('.pdf')) {
      const text = await extractTextFromPDF(buffer)
      extracted = parseQuoteFromText(text)
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
