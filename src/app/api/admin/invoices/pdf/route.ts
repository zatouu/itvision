import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/api-auth'
import { generateITVisionInvoicePdf } from '@/lib/pdf'
import { renderInvoicePdf, pdfResponseHeaders } from '@/lib/pdf-documents'
import { connectMongoose } from '@/lib/mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'
import fs from 'fs'
import path from 'path'

// Helper to load image
const loadImage = (relativePath: string) => {
  try {
    const fullPath = path.join(process.cwd(), relativePath)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath).toString('base64')
    }
  } catch (e) {
    console.error(`Failed to load image ${relativePath}`, e)
  }
  return undefined
}

// POST: Générer un PDF de facture
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const invoiceData = await request.json()

    // Facture enregistrée : PDF construit depuis la base (identique à l'email et au portail)
    const savedId = String(invoiceData?.id || invoiceData?._id || '')
    if (/^[a-fA-F0-9]{24}$/.test(savedId)) {
      await connectMongoose()
      const saved = await AdminInvoice.findById(savedId).lean() as any
      if (saved) {
        return new NextResponse(new Uint8Array(renderInvoicePdf(saved)), { headers: pdfResponseHeaders('Facture', saved.numero, false) })
      }
    }

    // Charger logo et cachet
    const logoBase64 = loadImage('public/images/logo-it-vision.png')
    const stampBase64 = loadImage('public/images/cachetitv.png')

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
      taxRate: Number(invoiceData.taxRate ?? 0),
      taxAmount: Number(invoiceData.taxAmount || 0),
      brsAmount: Number(invoiceData.brsAmount || 0),
      total: Number(invoiceData.total || 0),
      notes: invoiceData.notes,
      terms: invoiceData.terms,
      paymentDate: invoiceData.paymentDate,
      paymentMethod: invoiceData.paymentMethod,
      images: {
        logo: logoBase64,
        stamp: stampBase64
      }
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
