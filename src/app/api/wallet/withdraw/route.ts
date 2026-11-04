import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { getOrCreateWallet } from '@/lib/wallet'
import WithdrawalRequest from '@/lib/models/WithdrawalRequest'
import Wallet from '@/lib/models/Wallet'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'

const OPERATORS = ['wave', 'orange_money', 'free_money'] as const

export async function POST(request: NextRequest) {
  const rl = await applyRateLimit(request, serviceWriteRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const body = await request.json()
    const amount = Number(body.amount)
    const method = String(body.method || '')

    if (!Number.isFinite(amount) || amount < 1000) {
      return NextResponse.json({ error: 'Montant minimum de retrait : 1 000 FCFA' }, { status: 400 })
    }
    if (!OPERATORS.includes(method as any)) {
      return NextResponse.json({ error: 'Opérateur invalide' }, { status: 400 })
    }

    // KYC obligatoire avant retrait (compliance payouts)
    const [user, providerProfile] = await Promise.all([
      User.findById(userId).select('kycVerified phone').lean() as any,
      ProviderProfile.findOne({ userId }).select('kycVerified').lean() as any,
    ])
    if (!user?.kycVerified && !providerProfile?.kycVerified) {
      return NextResponse.json(
        { error: 'Vérification d\'identité (KYC) requise avant tout retrait' },
        { status: 403 }
      )
    }

    // Le payout part TOUJOURS vers le numéro du compte (vérifié par OTP) —
    // jamais vers un numéro libre saisi côté client (risque de vidage de wallet
    // en cas de compromission de session).
    const phone = String(user?.phone || '').trim()
    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: 'Aucun numéro vérifié associé au compte' }, { status: 400 })
    }

    // Réservation atomique : débite le solde SEULEMENT s'il couvre le montant.
    // Évite la double-dépense entre la création et le traitement admin.
    const wallet = await Wallet.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      {
        $inc: { balance: -amount },
        $push: { txns: { type: 'escrow_hold', amount, ref: 'withdrawal-pending', meta: { description: `Retrait ${method} réservé` }, createdAt: new Date() } },
      },
      { new: true }
    )
    if (!wallet) {
      const current = await getOrCreateWallet(String(userId))
      return NextResponse.json({ error: 'Solde insuffisant', balance: current.balance || 0 }, { status: 400 })
    }

    // Restitue la réservation si la création échoue ou si une demande existe déjà
    const refundReservation = (reason: string) =>
      Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: { balance: amount },
          $push: { txns: { type: 'refund', amount, ref: 'withdrawal-rollback', meta: { description: reason }, createdAt: new Date() } },
        }
      ).catch((e) => console.error('[withdraw] rollback réservation échoué', e))

    // Vérifier qu'il n'y a pas déjà une demande en cours (l'index unique partiel
    // sur status='pending' fait foi en cas de course)
    const existing = await WithdrawalRequest.findOne({ userId, status: 'pending' }).lean()
    if (existing) {
      await refundReservation('Annulation réservation retrait (demande déjà en cours)')
      return NextResponse.json({ error: 'Une demande de retrait est déjà en cours' }, { status: 409 })
    }

    let req
    try {
      req = await WithdrawalRequest.create({
        userId,
        amount,
        method,
        phone,
        status: 'pending',
      })
    } catch (createErr: any) {
      // Index unique violé (course) ou autre → restituer la réservation
      await refundReservation('Annulation réservation retrait (échec création)')
      if (createErr?.code === 11000) {
        return NextResponse.json({ error: 'Une demande de retrait est déjà en cours' }, { status: 409 })
      }
      throw createErr
    }

    return NextResponse.json({
      success: true,
      id: String(req._id),
      amount,
      method,
      status: 'pending',
      balance: wallet.balance, // solde après réservation
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/wallet/withdraw]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
