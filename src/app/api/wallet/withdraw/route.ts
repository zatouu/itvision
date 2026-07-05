import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { getOrCreateWallet } from '@/lib/wallet'
import WithdrawalRequest from '@/lib/models/WithdrawalRequest'

const OPERATORS = ['wave', 'orange_money', 'free_money'] as const

export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, serviceWriteRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const body = await request.json()
    const amount = Number(body.amount)
    const method = String(body.method || '')
    const phone = String(body.phone || '').trim()

    if (!Number.isFinite(amount) || amount < 1000) {
      return NextResponse.json({ error: 'Montant minimum de retrait : 1 000 FCFA' }, { status: 400 })
    }
    if (!OPERATORS.includes(method as any)) {
      return NextResponse.json({ error: 'Opérateur invalide' }, { status: 400 })
    }
    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
    }

    const wallet = await getOrCreateWallet(String(userId))
    const balance = wallet.balance || 0
    if (balance < amount) {
      return NextResponse.json({ error: 'Solde insuffisant', balance }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const existing = await WithdrawalRequest.findOne({ userId, status: 'pending' }).lean()
    if (existing) {
      return NextResponse.json({ error: 'Une demande de retrait est déjà en cours' }, { status: 409 })
    }

    const req = await WithdrawalRequest.create({
      userId,
      amount,
      method,
      phone,
      status: 'pending',
    })

    return NextResponse.json({
      success: true,
      id: String(req._id),
      amount,
      method,
      status: 'pending',
      balance,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/wallet/withdraw]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
