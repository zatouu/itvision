import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'
import User from '@/lib/models/User'
import { getJwtSecretKey } from '@/lib/jwt-secret'
import { generateITVisionInvoicePdf } from '@/lib/pdf'

interface DecodedToken {
  userId: string
  role: string
  email: string
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')

  const secret = getJwtSecretKey()
  const { payload } = await jwtVerify(token, secret)

  if (!payload.userId || !payload.role || !payload.email) {
    throw new Error('Token invalide')
  }

  return {
    userId: payload.userId as string,
    role: payload.role as string,
    email: payload.email as string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    if (role !== 'CLIENT') return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = String(searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    await connectMongoose()

    const user = await User.findById(userId).select({ companyClientId: 1 }).lean() as any
    const companyClientId = user?.companyClientId ? String(user.companyClientId) : null

    const invoice = await AdminInvoice.findById(id).lean() as any
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const allowed =
      String(invoice.clientUserId || '') === userId ||
      (companyClientId && String(invoice.clientCompanyId || '') === companyClientId)

    if (!allowed) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const pdfBuffer = generateITVisionInvoicePdf({
      numero: String(invoice.numero || ''),
      date: invoice.date ? new Date(invoice.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : undefined,
      client: {
        name: String(invoice.client?.name || ''),
        company: invoice.client?.company ? String(invoice.client.company) : undefined,
        address: String(invoice.client?.address || ''),
        phone: String(invoice.client?.phone || ''),
        email: String(invoice.client?.email || ''),
        taxId: invoice.client?.taxId ? String(invoice.client.taxId) : undefined
      },
      items: Array.isArray(invoice.items)
        ? invoice.items.map((it: any) => ({
            description: String(it.description || ''),
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            totalPrice: Number(it.totalPrice ?? 0)
          }))
        : [],
      subtotal: Number(invoice.subtotal || 0),
      taxRate: Number(invoice.taxRate ?? 18),
      taxAmount: Number(invoice.taxAmount || 0),
      total: Number(invoice.total || 0),
      notes: invoice.notes ? String(invoice.notes) : undefined,
      terms: invoice.terms ? String(invoice.terms) : undefined,
      paymentMethod: invoice.paymentMethod ? String(invoice.paymentMethod) : undefined,
      paymentDate: invoice.paymentDate ? String(invoice.paymentDate) : undefined
    })

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Facture-${invoice.numero}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur PDF facture client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
