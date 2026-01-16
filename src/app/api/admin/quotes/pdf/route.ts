import { NextRequest, NextResponse } from 'next/server'
import { generateITVisionQuotePdf } from '@/lib/pdf'
import { requireAdminApi } from '@/lib/api-auth'

// POST: Générer un PDF de devis
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const quoteData = await request.json()
    
    // Générer le PDF
    const pdfBuffer = generateITVisionQuotePdf({
      numero: quoteData.numero,
      date: quoteData.date,
      client: {
        name: quoteData.client.name,
        address: quoteData.client.address || '',
        phone: quoteData.client.phone || '',
        email: quoteData.client.email || '',
        rcn: quoteData.client.rcn,
        ninea: quoteData.client.ninea
      },
      products: quoteData.products.map((p: any) => ({
        description: p.description,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        taxable: p.taxable,
        total: p.total
      })),
      subtotal: quoteData.subtotal,
      brsAmount: quoteData.brsAmount,
      taxAmount: quoteData.taxAmount,
      other: quoteData.other || 0,
      total: quoteData.total,
      notes: quoteData.notes,
      bonCommande: quoteData.bonCommande,
      dateLivraison: quoteData.dateLivraison
    })

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Devis-${quoteData.numero}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur génération PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}

