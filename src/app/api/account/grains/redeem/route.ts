import { NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import GrainsTransaction from '@/lib/models/GrainsTransaction'
import Reward from '@/lib/models/Reward'

export async function POST(req: Request) {
  try {
    const auth = await verifyAuthServer()
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    await connectDB()
    const userId = new mongoose.Types.ObjectId(auth.user.id)
    const { rewardId } = await req.json()

    if (!rewardId) {
      return NextResponse.json({ success: false, error: 'Récompense requise' }, { status: 400 })
    }

    const reward = await Reward.findById(rewardId).lean() as any
    if (!reward || !reward.active) {
      return NextResponse.json({ success: false, error: 'Récompense introuvable' }, { status: 404 })
    }

    // Check balance
    const balanceResult = await GrainsTransaction.aggregate([
      { $match: { userId, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] } },
      { $group: { _id: null, balance: { $sum: '$amount' } } },
    ])
    const balance = balanceResult[0]?.balance || 0

    if (balance < reward.cost) {
      return NextResponse.json({ success: false, error: 'Solde insuffisant' }, { status: 400 })
    }

    // Spend grains
    await GrainsTransaction.create({
      userId,
      amount: -reward.cost,
      type: 'spent',
      source: 'redemption',
      sourceId: reward._id,
      description: `Échange : ${reward.title}`,
    })

    const newBalance = balance - reward.cost

    return NextResponse.json({ success: true, newBalance, reward: { title: reward.title } })
  } catch (err) {
    console.error('Redeem error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
