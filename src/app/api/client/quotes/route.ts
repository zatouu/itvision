import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Quote from '@/lib/models/Quote'
import AdminQuote from '@/lib/models/AdminQuote'

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

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Récupérer les devis standards
    const queryStandard: any = { clientId: userId }
    if (status && status !== 'all') {
      queryStandard.status = status
    }
    const standardQuotes = await Quote.find(queryStandard).sort({ createdAt: -1 }).lean()

    // Récupérer les devis admin
    const queryAdmin: any = { 'client.id': userId }
    if (status && status !== 'all') {
      queryAdmin.status = status
    }
    const adminQuotes = await AdminQuote.find(queryAdmin).sort({ createdAt: -1 }).lean()

    // Fusionner et formater les devis
    const allQuotes = [
      ...standardQuotes.map((q: any) => ({
        _id: q._id.toString(),
        numero: q.numero || `Q-${q._id.toString().slice(-6)}`,
        date: q.createdAt,
        status: q.status,
        subtotal: q.subtotal || 0,
        total: q.total || 0,
        products: q.products || [],
        type: 'standard',
        client: {
          name: q.clientName,
          email: q.clientEmail
        }
      })),
      ...adminQuotes.map((q: any) => ({
        _id: q._id.toString(),
        numero: q.numero,
        date: q.date,
        status: q.status,
        subtotal: q.subtotal || 0,
        brsAmount: q.brsAmount || 0,
        total: q.total || 0,
        products: q.products || [],
        type: 'admin',
        client: q.client
      }))
    ]

    // Trier par date
    allQuotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      quotes: allQuotes
    })
  } catch (error) {
    console.error('Erreur récupération devis client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

