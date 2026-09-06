import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import User from '@/lib/models/User'
import { loadUserWithProfiles } from '@/lib/user-profiles'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import ProductValidated from '@/lib/models/Product.validated'
import GrainsTransaction, { getGrainsBalance } from '@/lib/models/GrainsTransaction'
import Activity from '@/lib/models/Activity'
import Reward from '@/lib/models/Reward'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'
import AccountDashboard from '@/components/account/AccountDashboard'

const DEFAULT_REWARDS = [
  { title: '-5% sur votre prochaine commande', description: 'Remise immédiate à la caisse', icon: '🎟️', cost: 100, type: 'discount', value: { percent: 5 }, active: true, validForDays: 30 },
  { title: '-10% sur votre prochaine commande', description: 'Remise immédiate à la caisse', icon: '🎟️', cost: 300, type: 'discount', value: { percent: 10 }, active: true, validForDays: 30 },
  { title: 'Livraison gratuite', description: 'Frais de port offerts sur votre prochaine commande', icon: '🚚', cost: 500, type: 'free_shipping', value: {}, active: true, validForDays: 30 },
  { title: 'Bonus achat groupé -15%', description: 'Réduction supplémentaire sur un achat groupé', icon: '🤝', cost: 1000, type: 'group_buy_bonus', value: { percent: 15 }, active: true, validForDays: 60 },
  { title: 'Cadeau surprise', description: 'Un produit gratuit sélectionné par nos équipes', icon: '🎁', cost: 2000, type: 'gift', value: {}, active: true, validForDays: 90 },
]

function getTierFromBalance(balance: number): 'Bronze' | 'Argent' | 'Or' | 'Platine' {
  if (balance >= 2000) return 'Platine'
  if (balance >= 1000) return 'Or'
  if (balance >= 500) return 'Argent'
  return 'Bronze'
}

function tierThreshold(tier: string): number {
  switch (tier) {
    case 'Bronze': return 0
    case 'Argent': return 500
    case 'Or': return 1000
    case 'Platine': return 2000
    default: return 0
  }
}

function nextTierName(tier: string): string {
  switch (tier) {
    case 'Bronze': return 'Argent'
    case 'Argent': return 'Or'
    case 'Or': return 'Platine'
    case 'Platine': return 'Platine'
    default: return 'Argent'
  }
}

function initials(name?: string): string {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default async function ComptePage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user) {
    redirect('/login?redirect=/compte')
  }

  if (auth.user.role === 'CLIENT' && auth.user.companyClientId) {
    redirect('/portail-entreprise')
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)

  const profileData = await loadUserWithProfiles(userId)
  if (!profileData) {
    redirect('/login?redirect=/compte')
  }
  const { user, marketplaceProfile } = profileData

  const existingRewards = await Reward.countDocuments({ active: true })
  if (existingRewards === 0) {
    await Reward.insertMany(DEFAULT_REWARDS)
  }

  const [orders, groups, favoriteIds, openGroups, activities, grainsBalance, rewards] = await Promise.all([
    Order.find({ clientId: userId }).sort({ createdAt: -1 }).lean() as Promise<any[]>,
    GroupOrder.find({
      $or: [{ 'participants.userId': userId }, { 'createdBy.userId': userId }],
    }).sort({ updatedAt: -1 }).lean() as Promise<any[]>,
    User.findById(userId).select('favoriteProductIds').lean().then((doc: any) => doc?.favoriteProductIds || []) as Promise<string[]>,
    GroupOrder.find({ status: 'open', deadline: { $gte: new Date() } })
      .sort({ currentQty: -1 })
      .limit(3)
      .select('groupId product.name product.image product.basePrice currentUnitPrice currentQty targetQty deadline')
      .lean() as Promise<any[]>,
    Activity.find({ userId }).sort({ createdAt: -1 }).limit(5).lean() as Promise<any[]>,
    getGrainsBalance(userId),
    Reward.find({ active: true }).sort({ cost: 1 }).lean() as Promise<any[]>,
  ])

  const tier = marketplaceProfile?.marketplaceTier || marketplaceProfile?.loyaltyTier || user.tier || getTierFromBalance(grainsBalance)
  const nextT = nextTierName(tier)
  const currentThreshold = tierThreshold(tier)
  const nextThreshold = tierThreshold(nextT)
  const grainsToNextTier = Math.max(0, nextThreshold - grainsBalance)
  const progressToNextTier = nextT === tier
    ? 100
    : Math.min(100, Math.round(((grainsBalance - currentThreshold) / (nextThreshold - currentThreshold)) * 100))

  const totalOrders = orders.length
  const inProgress = orders.filter(o => ['pending', 'processing'].includes(String(o.status || '').toLowerCase())).length
  const shipped = orders.filter(o => String(o.status || '').toLowerCase() === 'shipped').length
  const delivered = orders.filter(o => String(o.status || '').toLowerCase() === 'delivered').length
  const totalSavings = orders.reduce((sum, o) => sum + (o.discountTotal || o.savings || 0), 0)
  const activeGroupBuys = groups.filter(g => g.status === 'open').length
  const almostComplete = openGroups.filter(g => g.targetQty > 0 && (g.currentQty / g.targetQty) >= 0.75).length

  const latestOrder = orders[0] || null

  const favoritePreviewIds = favoriteIds.slice(-4).reverse().filter(Boolean)
  const favoriteObjectIds = favoritePreviewIds
    .filter(id => mongoose.isValidObjectId(id))
    .map(id => new mongoose.Types.ObjectId(id))

  const favoriteProducts = favoriteObjectIds.length
    ? await ProductValidated.find({ _id: { $in: favoriteObjectIds } }).select('name image price currency').lean()
    : []

  const categoryIds = new Set<string>()
  favoriteProducts.forEach((p: any) => { if (p.category) categoryIds.add(String(p.category)) })
  orders.slice(0, 5).forEach((o: any) => {
    o.items?.forEach((i: any) => { if (i.category) categoryIds.add(String(i.category)) })
  })

  const recommendations = categoryIds.size > 0
    ? await ProductValidated.find({
        category: { $in: Array.from(categoryIds).slice(0, 5) },
        published: { $ne: false },
      })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(8)
        .select('name image price currency groupBuyEnabled groupBuyBestPrice')
        .lean()
    : await ProductValidated.find({ published: { $ne: false } })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(8)
        .select('name image price currency groupBuyEnabled groupBuyBestPrice')
        .lean()

  const activeGroups = openGroups.map((g: any) => {
    const progress = g.targetQty > 0 ? Math.min(100, Math.round((g.currentQty / g.targetQty) * 100)) : 0
    const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    return {
      _id: g.groupId,
      productName: g.product?.name || 'Produit',
      image: g.product?.image,
      progress,
      daysLeft,
      currentQty: g.currentQty,
      targetQty: g.targetQty,
      currentUnitPrice: g.currentUnitPrice,
    }
  })

  const dashboardData = {
    user: {
      id: String(user._id),
      firstName: user.name?.split(' ')[0] || user.username || 'Utilisateur',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      avatarUrl: user.avatarUrl,
      initial: initials(user.name || user.username),
      status: (user.isActive ? 'active' : 'inactive') as 'active' | 'inactive',
      tier,
      grainsBalance,
      referralCode: marketplaceProfile?.referralCode || user.referralCode || 'ADMIN2024',
      referrals: {
        count: marketplaceProfile?.referralCount || user.referralCount || user.referrals?.length || 0,
        totalEarned: marketplaceProfile?.referralBalance || user.referralBalance || 0,
      },
    },
    stats: {
      ordersCount: totalOrders,
      ordersInProgress: inProgress,
      ordersShipped: shipped,
      ordersDelivered: delivered,
      favoritesCount: favoriteIds.length,
      activeGroupBuys,
      almostCompleteGroups: almostComplete,
      totalSavings,
      totalSavingsTrend: 12,
      openClaims: 0,
    },
    cart: {
      itemsCount: 0,
      total: 0,
      items: [] as any[],
    },
    activeGroups,
    latestOrder: latestOrder ? {
      id: latestOrder.orderId,
      status: latestOrder.status,
      total: latestOrder.total,
      createdAt: latestOrder.createdAt,
    } : null,
    recentOrders: orders.slice(0, 5).map((o: any) => ({
      id: o.orderId,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      itemCount: o.items?.length || 0,
    })),
    activities: activities.map((a: any) => ({
      _id: String(a._id),
      type: a.type,
      description: a.description,
      amount: a.amount,
      unit: a.unit,
      createdAt: a.createdAt,
    })),
    grains: {
      balance: grainsBalance,
      tier,
      nextTier: nextT,
      grainsToNextTier,
      progressToNextTier,
      availableRewards: rewards.map((r: any) => ({
        id: String(r._id),
        title: r.title,
        description: r.description,
        icon: r.icon,
        cost: r.cost,
        type: r.type,
      })),
    },
    recommendations: recommendations.map((p: any) => ({
      _id: String(p._id),
      name: p.name,
      image: p.image,
      price: p.price || p.groupBuyBestPrice || 0,
      currency: p.currency || 'FCFA',
      groupBuyEnabled: p.groupBuyEnabled,
    })),
    favoriteProducts: favoriteProducts.map((p: any) => ({
      _id: String(p._id),
      name: p.name,
      image: p.image,
      price: p.price || 0,
      currency: p.currency || 'FCFA',
    })),
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <MarketHeader />
      <AccountDashboard data={dashboardData} />
      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
