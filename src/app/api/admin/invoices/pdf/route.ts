import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/api-auth'
import { generateITVisionInvoicePdf } from '@/lib/pdf'

// POST: Générer un PDF de facture
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const invoiceData = await request.json()

    const pdfBuffer = generateITVisionInvoicePdf({
      numero: invoiceData.number || invoiceData.numero,
      date: invoiceData.date,
      dueDate: invoiceData.dueDate,
      client: {
        name: invoiceData.client?.name || '',
        company: invoiceData.client?.company || '',
        address: invoiceData.client?.address || '',
        phone: invoiceData.client?.phone || '',
        email: invoiceData.client?.email || '',
        taxId: invoiceData.client?.taxId
      },
      items: Array.isArray(invoiceData.items) ? invoiceData.items.map((it: any) => ({
        description: it.description,
        quantity: Number(it.quantity || 0),
        unitPrice: Number(it.unitPrice || 0),
        totalPrice: Number(it.totalPrice || 0)
      })) : [],
      subtotal: Number(invoiceData.subtotal || 0),
      taxRate: Number(invoiceData.taxRate ?? 18),
      taxAmount: Number(invoiceData.taxAmount || 0),
      total: Number(invoiceData.total || 0),
      notes: invoiceData.notes,
      terms: invoiceData.terms,
      paymentDate: invoiceData.paymentDate,
      paymentMethod: invoiceData.paymentMethod
    })

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Facture-${invoiceData.number || invoiceData.numero}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur génération PDF facture:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }
}
