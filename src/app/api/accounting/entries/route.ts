import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AccountingEntry from '@/lib/models/AccountingEntry'
import { jwtVerify } from 'jose'

async function verifyToken(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  return {
    userId: payload.userId as string,
    role: String(payload.role || '').toUpperCase()
  }
}

/**
 * GET /api/accounting/entries
 * Récupère les entrées comptables avec filtres
 */
export async function GET(request: NextRequest) {
  try {
    const { role } = await verifyToken(request)
    if (!['ADMIN', 'ACCOUNTANT'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    
    const entryType = searchParams.get('entryType')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    const filter: any = {}
    if (entryType) filter.entryType = entryType
    if (category) filter.category = category
    if (status) filter.status = status
    if (productId) filter.productId = productId
    if (startDate || endDate) {
      filter.transactionDate = {}
      if (startDate) filter.transactionDate.$gte = new Date(startDate)
      if (endDate) filter.transactionDate.$lte = new Date(endDate)
    }

    const [entries, total] = await Promise.all([
      AccountingEntry.find(filter)
        .sort({ transactionDate: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      AccountingEntry.countDocuments(filter)
    ])

    return NextResponse.json({
      success: true,
      entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erreur récupération entrées comptables:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/accounting/entries
 * Crée une nouvelle entrée comptable
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    if (!['ADMIN', 'ACCOUNTANT'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()
    const body = await request.json()
    const {
      entryType,
      productId,
      productName,
      orderId,
      clientId,
      clientName,
      amount,
      currency = 'FCFA',
      pricing1688,
      category,
      subCategory,
      transactionDate,
      notes,
      metadata,
      status = 'confirmed'
    } = body

    if (!entryType || !amount || !category) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const entry = await AccountingEntry.create({
      entryType,
      productId,
      productName,
      orderId,
      clientId,
      clientName,
      amount,
      currency,
      pricing1688,
      category,
      subCategory,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      notes,
      metadata,
      status,
      confirmedBy: userId,
      confirmedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      entry
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur création entrée comptable:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

