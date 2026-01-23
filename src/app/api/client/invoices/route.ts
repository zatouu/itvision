import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'
import User from '@/lib/models/User'
import { getJwtSecretKey } from '@/lib/jwt-secret'

interface DecodedToken {
  userId: string
  role: string
  email: string
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    throw new Error('Non authentifié')
  }

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

    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const user = await User.findById(userId).select({ companyClientId: 1 }).lean() as any
    const companyClientId = user?.companyClientId ? String(user.companyClientId) : null

    const query: any = {
      $or: [
        { clientUserId: userId },
        ...(companyClientId ? [{ clientCompanyId: companyClientId }] : [])
      ]
    }

    const invoices = await AdminInvoice.find(query).sort({ createdAt: -1 }).lean() as any[]

    const normalized = invoices.map((inv) => ({
      id: String(inv._id),
      number: inv.numero,
      date: inv.date ? new Date(inv.date).toISOString().slice(0, 10) : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
      status: inv.status,
      amount: Number(inv.total || 0),
      paidAmount: inv.status === 'paid' ? Number(inv.total || 0) : 0,
      description: inv.notes || 'Facture',
      items: Array.isArray(inv.items)
        ? inv.items.map((it: any) => ({
            description: it.description,
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            total: Number(it.totalPrice ?? it.total ?? 0)
          }))
        : [],
      paymentMethod: inv.paymentMethod,
      paymentDate: inv.paymentDate,
      notes: inv.notes,
      downloadUrl: '/api/client/invoices/pdf?id=' + String(inv._id)
    }))

    return NextResponse.json({ success: true, invoices: normalized })
  } catch (error) {
    console.error('Erreur récupération factures client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
