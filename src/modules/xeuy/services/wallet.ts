/**
 * Xeuy Bi — Wallet service découplé.
 * Lit le Wallet + les champs referral directement sur User.
 * Ne dépend PAS de MarketplaceProfile.
 */

import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import WalletModel from '@/lib/models/Wallet'
import WalletTransaction from '@/lib/models/WalletTransaction'
import { getOrCreateWallet, getAppConfig, isPointsModeActive, creditPoints } from '@/lib/wallet'
import type { XeuyWallet } from '../types'

export async function getXeuyWallet(userId: string): Promise<XeuyWallet> {
  await connectMongoose()

  const [wallet, user] = await Promise.all([
    getOrCreateWallet(userId),
    User.findById(userId).lean() as Promise<any>,
  ])

  if (!user) throw new Error('Utilisateur introuvable')

  return {
    points: wallet.points || 0,
    reservedPoints: wallet.reservedPoints || 0,
    cashBalance: wallet.balance || 0,
    escrow: wallet.escrow || 0,
    lifetimePointsEarned: wallet.lifetimePointsEarned || 0,
    lifetimePointsSpent: wallet.lifetimePointsSpent || 0,
    referralCode: user.referralCode || '',
    referralBalance: user.referralBalance || 0,
    referralCount: user.referralCount || 0,
  }
}

export async function getXeuyWalletHistory(userId: string) {
  await connectMongoose()
  const history = await WalletTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return history.map((t: any) => ({
    id: String(t._id),
    kind: t.kind,
    points: t.points,
    balanceAfter: t.balanceAfter,
    description: t.description || null,
    createdAt: t.createdAt,
  }))
}

export async function getXeuyWalletConfig() {
  const cfg = await getAppConfig()
  const pointsActive = await isPointsModeActive()
  return {
    mode: cfg.monetization.mode,
    pointsActive,
    pointsPerWonMission: cfg.monetization.pointsPerWonMission,
    fcfaPerPoint: cfg.monetization.fcfaPerPoint,
    freeUntil: cfg.monetization.freeUntil || null,
    escrowEnabled: cfg.escrow.enabled,
    escrowMandatory: cfg.escrow.mandatory,
    escrowCostPoints: cfg.escrow.enabled ? cfg.monetization.escrowCostPoints : 0,
    credits: {
      unlockEnabled: cfg.credits?.unlockEnabled ?? false,
      packs: cfg.credits?.packs || [],
      refundWindowMinutes: cfg.credits?.refundWindowMinutes ?? 10,
    },
  }
}

export async function creditXeuyWelcomePoints(userId: string): Promise<void> {
  try {
    const cfg = await getAppConfig()
    if (cfg.monetization.welcomePoints > 0) {
      await creditPoints(userId, cfg.monetization.welcomePoints, 'welcome', {
        description: 'Crédit de bienvenue',
      })
    }
  } catch (err) {
    console.error('[xeuy/wallet] Erreur crédit bienvenue', err)
  }
}
