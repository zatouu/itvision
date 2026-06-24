'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Package, ShoppingCart, Users, Heart, Store, MapPin, FileText,
  TrendingUp, Coins, Crown, Activity, ChevronRight, Settings, LogOut,
  Mail, BadgeCheck, ArrowRight, Bell, CreditCard, Lock, Sliders, Moon,
  CheckCircle, Truck, Wallet, Check, MessageCircle, Share2, Star,
  Zap, Clock, X, LayoutGrid
} from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

// ─── Types ───
interface DashboardData {
  user: {
    id: string
    firstName: string
    lastName: string
    email?: string
    avatarUrl?: string
    initial: string
    status: 'active' | 'inactive'
    tier: string
    grainsBalance: number
    referralCode: string
    referrals: { count: number; totalEarned: number }
  }
  stats: {
    ordersCount: number
    ordersInProgress: number
    ordersShipped: number
    ordersDelivered: number
    favoritesCount: number
    activeGroupBuys: number
    almostCompleteGroups: number
    totalSavings: number
    totalSavingsTrend: number
    openClaims: number
  }
  cart: { itemsCount: number; total: number; items: any[] }
  activeGroups: Array<{
    _id: string
    productName: string
    image?: string
    progress: number
    daysLeft: number
    currentQty: number
    targetQty: number
    currentUnitPrice: number
  }>
  latestOrder: { id: string; status: string; total: number; createdAt: string } | null
  recentOrders?: Array<{ id: string; status: string; total: number; createdAt: string; itemCount?: number }>
  activities: Array<{
    _id: string
    type: string
    description: string
    amount?: number
    unit?: 'FCFA' | 'grains'
    createdAt: string
  }>
  grains: {
    balance: number
    tier: string
    nextTier: string
    grainsToNextTier: number
    progressToNextTier: number
    availableRewards: Array<{
      id: string
      title: string
      description: string
      icon: string
      cost: number
      type: string
    }>
  }
  recommendations: Array<{
    _id: string
    name: string
    image?: string
    price: number
    currency: string
    groupBuyEnabled?: boolean
  }>
  favoriteProducts: Array<{
    _id: string
    name: string
    image?: string
    price: number
    currency: string
  }>
}

// ─── Animated number (CountUp alternative) ───
function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1500 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)
  const toRef = useRef(value)

  useEffect(() => {
    fromRef.current = display
    toRef.current = value
    startRef.current = null
    let raf: number

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(fromRef.current + (toRef.current - fromRef.current) * ease)
      setDisplay(current)
      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const formatted = display.toLocaleString('fr-FR')
  return <span>{prefix}{formatted}{suffix}</span>
}

// ─── Helpers ───
const fmt = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} FCFA`
const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Il y a ${days} j`
  return `Il y a ${Math.floor(days / 30)} mois`
}

const statusConfig = (status: string) => {
  switch (status) {
    case 'pending': return { color: 'amber', icon: Clock, bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'En attente' }
    case 'confirmed': return { color: 'blue', icon: CheckCircle, bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmée' }
    case 'processing': return { color: 'violet', icon: Activity, bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Traitement' }
    case 'shipped': return { color: 'orange', icon: Truck, bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Expédiée' }
    case 'delivered': return { color: 'emerald', icon: CheckCircle, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Livrée' }
    case 'cancelled': return { color: 'red', icon: X, bg: 'bg-red-50 text-red-700 border-red-200', label: 'Annulée' }
    default: return { color: 'slate', icon: Activity, bg: 'bg-slate-50 text-slate-700 border-slate-200', label: status }
  }
}

const tierIcons: Record<string, string> = { Bronze: '🥉', Argent: '🥈', Or: '🥇', Platine: '💎' }
const tierColor = (t: string) => {
  switch (t) {
    case 'Bronze': return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'Argent': return 'text-slate-600 bg-slate-100 border-slate-200'
    case 'Or': return 'text-amber-600 bg-amber-100 border-amber-300'
    case 'Platine': return 'text-violet-600 bg-violet-100 border-violet-300'
    default: return 'text-slate-600 bg-slate-100'
  }
}

const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  order_delivered: { icon: CheckCircle, color: 'emerald', label: 'Commande livrée' },
  order_shipped: { icon: Truck, color: 'blue', label: 'Commande expédiée' },
  order_placed: { icon: Package, color: 'violet', label: 'Commande passée' },
  group_joined: { icon: Users, color: 'violet', label: 'Groupe rejoint' },
  group_created: { icon: Users, color: 'emerald', label: 'Groupe créé' },
  group_complete: { icon: Users, color: 'amber', label: 'Groupe complet' },
  wallet_credit: { icon: Wallet, color: 'amber', label: 'Wallet crédité' },
  grains_earned: { icon: Coins, color: 'amber', label: 'Grains gagnés' },
  favorite_added: { icon: Heart, color: 'red', label: 'Favori ajouté' },
  reward_redeemed: { icon: Star, color: 'orange', label: 'Récompense échangée' },
  referral_signup: { icon: UserPlus, color: 'emerald', label: 'Parrainage' },
  referral_first_order: { icon: UserPlus, color: 'emerald', label: 'Parrainage' },
  review_posted: { icon: Star, color: 'yellow', label: 'Avis publié' },
}

// Need a component for UserPlus since it's not imported above
function UserPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

// ─── Sub-components ───
function StatCard({ icon: Icon, iconColor, bgColor, label, value, trend, trendUp, subtitle, href }: any) {
  const content = (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-slate-900">{value}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function MainActionCard({ icon: Icon, color, title, value, valueLabel, breakdown, extra, href, ctaLabel, urgent }: any) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    orange: 'bg-orange-100 text-orange-700',
    violet: 'bg-violet-100 text-violet-700',
  }
  const textClasses: Record<string, string> = {
    emerald: 'text-emerald-700',
    orange: 'text-orange-700',
    violet: 'text-violet-700',
  }
  const btnClasses: Record<string, string> = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    orange: 'bg-orange-500 hover:bg-orange-600',
    violet: 'bg-violet-600 hover:bg-violet-700',
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-extrabold text-slate-900">{value}</span>
        <span className="text-sm text-slate-500">{valueLabel}</span>
      </div>
      {breakdown && (
        <div className="flex gap-3 mt-3 text-xs">
          {breakdown.map((b: any) => (
            <div key={b.label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full bg-${b.color}-500`} />
              <span className="text-slate-600">{b.label} <strong>{b.count}</strong></span>
            </div>
          ))}
        </div>
      )}
      {extra && <div className="mt-4">{extra}</div>}
      <div className="mt-auto pt-4">
        <Link href={href} className={`inline-flex w-full items-center justify-center gap-2 ${btnClasses[color]} text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${urgent ? 'animate-pulse' : ''}`}>
          {ctaLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  )
}

function SecondaryActionCard({ icon: Icon, label, subtitle, href, badge }: any) {
  return (
    <Link href={href} className="group bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-900 text-sm">{label}</h4>
          {badge !== null && badge !== undefined && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
    </Link>
  )
}

function ActivityTimelineItem({ activity }: { activity: DashboardData['activities'][0] }) {
  const config = ACTIVITY_CONFIG[activity.type] || { icon: Activity, color: 'slate', label: activity.type }
  const Icon = config.icon
  return (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-full bg-${config.color}-50 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 text-${config.color}-600`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{activity.description}</p>
        <p className="text-xs text-slate-500">{timeAgo(activity.createdAt)}</p>
      </div>
      {activity.amount && (
        <span className={`text-sm font-bold text-${config.color}-600`}>
          {activity.type === 'wallet_credit' ? '+' : ''}{activity.amount.toLocaleString('fr-FR')}
          {activity.unit === 'grains' ? ' 🪙' : ' F'}
        </span>
      )}
    </div>
  )
}

function RewardCard({ reward, canRedeem, onRedeem }: { reward: any; canRedeem: boolean; onRedeem: () => void }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${canRedeem ? 'border-amber-300 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
      <div className="text-2xl">{reward.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900">{reward.title}</p>
        <p className="text-xs text-slate-500">{reward.description}</p>
      </div>
      <button
        onClick={onRedeem}
        disabled={!canRedeem}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${canRedeem ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
      >
        {reward.cost} 🪙
      </button>
    </div>
  )
}

function SettingsQuickButton({ icon: Icon, label, href, onClick }: any) {
  const content = (
    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors flex flex-col items-center text-center gap-1.5 min-h-[68px] justify-center">
      <Icon className="w-5 h-5 text-slate-600" />
      <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
    </div>
  )
  if (onClick) return <button onClick={onClick} className="w-full">{content}</button>
  return <Link href={href} className="w-full">{content}</Link>
}

// ─── Main Dashboard ───
export default function AccountDashboard({ data }: { data: DashboardData }) {
  const { user, stats, cart, activeGroups, latestOrder, activities, grains, recommendations, favoriteProducts } = data
  const { addToast } = useToast()

  useEffect(() => {
    try {
      localStorage.setItem('grains:balance', String(grains.balance))
      window.dispatchEvent(new CustomEvent('grains:updated'))
    } catch {
      // ignore
    }
  }, [grains.balance])
  const [copied, setCopied] = useState(false)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [balance, setBalance] = useState(grains.balance)
  const [rewards, setRewards] = useState(grains.availableRewards)

  const copyCode = () => {
    navigator.clipboard.writeText(user.referralCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast('Code de parrainage copié !', 'success')
    })
  }

  const shareWhatsApp = () => {
    const text = `Rejoins IT Vision+ avec mon code ${user.referralCode} et gagne -10% sur ta première commande !`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareLink = () => {
    const url = `${window.location.origin}/register?ref=${user.referralCode}`
    navigator.clipboard.writeText(url).then(() => addToast('Lien de parrainage copié !', 'success'))
  }

  const redeemReward = async (rewardId: string, cost: number) => {
    if (balance < cost) return
    setRedeeming(rewardId)
    try {
      const res = await fetch('/api/account/grains/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      })
      const data = await res.json()
      if (data.success) {
        setBalance(data.newBalance)
        setRewards(prev => prev.filter(r => r.id !== rewardId))
        addToast('Récompense échangée avec succès !', 'success')
      } else {
        addToast(data.error || 'Erreur lors de l\'échange', 'error')
      }
    } catch {
      addToast('Erreur réseau', 'error')
    } finally {
      setRedeeming(null)
    }
  }

  const tiers = [
    { name: 'Bronze', range: '0-499', icon: '🥉', threshold: 0 },
    { name: 'Argent', range: '500-999', icon: '🥈', threshold: 500 },
    { name: 'Or', range: '1000-1999', icon: '🥇', threshold: 1000 },
    { name: 'Platine', range: '2000+', icon: '💎', threshold: 2000 },
  ]

  const scrollToGrains = () => {
    document.getElementById('grains')?.scrollIntoView({ behavior: 'smooth' })
  }

  const progressToNext = Math.max(0, Math.min(100, grains.progressToNextTier))

  const recentOrders = data.recentOrders || []

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section 2 — Welcome Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-violet-600 text-white p-6 md:p-8 mb-6">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-center">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/15 backdrop-blur border-2 border-white/30 flex items-center justify-center text-3xl font-bold overflow-hidden">
                {user.avatarUrl ? <Image src={user.avatarUrl} alt="" width={96} height={96} className="rounded-2xl object-cover" /> : user.initial}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">Bonjour, {user.firstName} 👋</h1>
                <span className="bg-white/20 backdrop-blur border border-white/30 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" />
                  {user.status === 'active' ? 'Client actif' : 'Inactif'}
                </span>
              </div>
              {user.email && (
                <p className="text-white/80 text-sm flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {user.email}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
                <span className="flex items-center gap-1">📦 <strong>{stats.ordersCount}</strong> commandes</span>
                <span className="flex items-center gap-1">🤝 <strong>{stats.activeGroupBuys}</strong> achats groupés</span>
                <span className="flex items-center gap-1">❤️ <strong>{stats.favoritesCount}</strong> favoris</span>
                <span className="flex items-center gap-1">{tierIcons[user.tier]} Niveau <strong>{user.tier}</strong></span>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3">
              <button onClick={scrollToGrains} className="bg-amber-400 hover:bg-amber-300 text-amber-950 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors">
                🪙 <AnimatedNumber value={balance} /> Grains
              </button>
              <div className="text-xs text-white/80 text-left lg:text-right">
                Prochain palier : <strong>{grains.grainsToNextTier}</strong> grains
                <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-400" style={{ width: `${progressToNext}%` }} />
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/compte/profil" className="bg-white/15 backdrop-blur border border-white/30 px-3 py-1.5 rounded-lg text-xs hover:bg-white/25 flex items-center gap-1 transition-colors">
                  <Settings className="w-3 h-3" /> Paramètres
                </Link>
                <Link href="/api/auth/logout" className="bg-white/15 backdrop-blur border border-white/30 px-3 py-1.5 rounded-lg text-xs hover:bg-white/25 flex items-center gap-1 transition-colors">
                  <LogOut className="w-3 h-3" /> Déconnexion
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 — Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={TrendingUp} iconColor="text-emerald-600" bgColor="bg-emerald-50" label="Économies réalisées" value={`${stats.totalSavings.toLocaleString('fr-FR')} F`} trend={`+${stats.totalSavingsTrend}% ce mois`} trendUp />
          <StatCard icon={Package} iconColor="text-violet-600" bgColor="bg-violet-50" label="Commandes" value={stats.ordersCount} subtitle={`${stats.ordersInProgress} en cours`} />
          <StatCard icon={Coins} iconColor="text-amber-600" bgColor="bg-amber-50" label="Grains fidélité" value={balance.toLocaleString('fr-FR')} subtitle="→ Récompenses" href="#grains" />
          <StatCard icon={Crown} iconColor="text-orange-600" bgColor="bg-orange-50" label="Statut" value={user.tier} subtitle={`+${grains.grainsToNextTier}pts pour ${grains.nextTier}`} />
        </section>

        {/* Section 4 — Main Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MainActionCard
            icon={Package}
            color="emerald"
            title="Mes commandes"
            value={stats.ordersCount}
            valueLabel="commandes"
            breakdown={[
              { label: 'En cours', count: stats.ordersInProgress, color: 'amber' },
              { label: 'Expédiées', count: stats.ordersShipped, color: 'blue' },
              { label: 'Livrées', count: stats.ordersDelivered, color: 'emerald' },
            ]}
            extra={latestOrder && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs">
                <p className="font-semibold text-slate-900">Commande #{latestOrder.id}</p>
                <p className="text-slate-500 capitalize">{latestOrder.status} · {fmt(latestOrder.total)}</p>
              </div>
            )}
            href="/compte/commandes"
            ctaLabel="Voir mes commandes"
          />
          <MainActionCard
            icon={ShoppingCart}
            color="orange"
            title="Mon panier"
            value={cart.itemsCount}
            valueLabel="articles"
            subtitle={`Total : ${fmt(cart.total)}`}
            extra={
              <div className="flex -space-x-2">
                {cart.items.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="w-8 h-8 rounded-lg border-2 border-white bg-slate-200 overflow-hidden relative">
                    {item.image && <Image src={item.image} alt="" fill className="object-cover" />}
                  </div>
                ))}
                {cart.items.length > 3 && (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold">+{cart.items.length - 3}</div>
                )}
              </div>
            }
            href="/panier"
            ctaLabel="Finaliser mon panier"
            urgent={cart.itemsCount > 0}
          />
          <MainActionCard
            icon={Users}
            color="violet"
            title="Mes achats groupés"
            value={stats.activeGroupBuys}
            valueLabel="groupes actifs"
            subtitle={`${stats.almostCompleteGroups} bientôt complet${stats.almostCompleteGroups > 1 ? 's' : ''}`}
            extra={
              <div className="space-y-2">
                {activeGroups.slice(0, 2).map(g => (
                  <div key={g._id} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-slate-500 shrink-0">{g.progress}%</span>
                  </div>
                ))}
              </div>
            }
            href="/compte/achats-groupes"
            ctaLabel="Voir mes groupes"
          />
        </section>

        {/* Section 4b — Dernières commandes */}
        {recentOrders.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Package className="w-5 h-5 text-violet-600" /> Dernières commandes</h2>
              <Link href="/compte/commandes" className="text-sm text-violet-600 hover:underline">Voir tout →</Link>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {recentOrders.map((o, idx) => {
                const cfg = statusConfig(o.status)
                const Icon = cfg.icon
                return (
                  <Link
                    key={o.id}
                    href={`/commandes/${encodeURIComponent(o.id)}`}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0"
                  >
                    <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{o.id}</p>
                      <p className="text-xs text-slate-500">{timeAgo(o.createdAt)} • {o.itemCount || 0} article{(o.itemCount || 0) > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">{fmt(o.total)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg}`}>{cfg.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Section 5 — Secondary Actions */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SecondaryActionCard icon={LayoutGrid} label="Catalogue" subtitle="Découvrir les produits" href="/produits" />
          <SecondaryActionCard icon={Heart} label="Favoris" subtitle={`${stats.favoritesCount} produits`} href="/produits/favoris" />
          <SecondaryActionCard icon={MapPin} label="Suivi commande" subtitle="Tracker en temps réel" href="/retrouver-ma-commande" />
          <SecondaryActionCard icon={FileText} label="Réclamations" subtitle={`${stats.openClaims} ouverte${stats.openClaims > 1 ? 's' : ''}`} href="/compte/reclamer-commande" badge={stats.openClaims > 0 ? stats.openClaims : null} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Section 6 — Activity Timeline */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-violet-600" /> Activité récente</h2>
              <Link href="/compte/activite" className="text-sm text-violet-600 hover:underline">Voir tout →</Link>
            </div>
            <div className="space-y-3">
              {activities.length > 0 ? activities.map(a => <ActivityTimelineItem key={a._id} activity={a} />) : (
                <p className="text-sm text-slate-500 text-center py-6">Aucune activité récente</p>
              )}
            </div>
          </section>

          {/* Section 7 — Recommendations */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">🎯 Recommandé pour vous</h2>
                <p className="text-xs text-slate-500">Basé sur vos achats et favoris</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recommendations.slice(0, 4).map(p => (
                <Link key={p._id} href={`/produits/${p._id}`} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-32 bg-slate-100">
                    {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" /> : <Package className="w-8 h-8 text-slate-300 absolute inset-0 m-auto" />}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">{p.name}</p>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">{fmt(p.price)}</p>
                  </div>
                </Link>
              ))}
              {recommendations.length === 0 && <p className="text-sm text-slate-500 col-span-2 text-center py-6">Aucune recommandation pour le moment</p>}
            </div>
          </section>
        </div>

        {/* Section 8 — Grains DDM+ */}
        <section id="grains" className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg">🪙</div>
                <div>
                  <p className="text-xs text-amber-700 font-medium">Vos Grains DDM+</p>
                  <div className="text-3xl font-extrabold text-amber-700"><AnimatedNumber value={balance} /></div>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{grains.tier} → {grains.nextTier}</span>
                  <span className="text-amber-700 font-bold">{grains.grainsToNextTier} grains restants</span>
                </div>
                <div className="h-3 bg-amber-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${progressToNext}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-amber-400 to-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {tiers.map(tier => (
                  <div key={tier.name} className={`p-2 rounded-xl text-center border-2 transition ${tier.name === grains.tier ? 'border-amber-500 bg-amber-100 scale-105' : balance >= tier.threshold ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white opacity-60'}`}>
                    <div className="text-2xl mb-1">{tier.icon}</div>
                    <p className="text-xs font-bold">{tier.name}</p>
                    <p className="text-[10px] text-slate-500">{tier.range}</p>
                    {balance >= tier.threshold && <Check className="w-3 h-3 text-emerald-600 mx-auto mt-1" />}
                  </div>
                ))}
              </div>
              <Link href="/compte/grains" className="text-xs text-amber-700 hover:underline mt-3 inline-flex items-center gap-1">
                Comment gagner plus ? <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">🎁 Récompenses disponibles</h3>
              <div className="space-y-2">
                {rewards.map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    canRedeem={balance >= reward.cost}
                    onRedeem={() => redeemReward(reward.id, reward.cost)}
                  />
                ))}
                {rewards.length === 0 && <p className="text-sm text-slate-500">Aucune récompense disponible actuellement.</p>}
              </div>
            </div>
          </div>
        </section>

        {/* Section 9 — Referral Banner */}
        <section className="mb-6 bg-gradient-to-r from-violet-600 via-purple-600 to-emerald-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 items-center relative z-10">
            <div>
              <span className="inline-block bg-white/15 backdrop-blur border border-white/30 px-3 py-1 rounded-full text-xs font-medium mb-3">🎁 Programme parrainage</span>
              <h2 className="text-2xl font-bold mb-2">Parrainez et gagnez !</h2>
              <p className="text-white/90 mb-4 text-sm">
                Invitez vos amis, gagnez <strong>500 Grains</strong> par parrain qui passe sa 1ère commande. Vos filleuls reçoivent <strong>-10%</strong> sur leur première commande.
              </p>
              <div className="bg-white/15 backdrop-blur border border-white/30 rounded-xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Votre code parrainage</p>
                  <p className="text-lg font-bold tracking-wider">{user.referralCode}</p>
                </div>
                <button onClick={copyCode} className="bg-white text-violet-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                  {copied ? '✓ Copié !' : 'Copier'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={shareWhatsApp} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors">
                  <MessageCircle className="w-4 h-4" /> Inviter via WhatsApp
                </button>
                <button onClick={shareLink} className="bg-white/15 backdrop-blur border border-white/30 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-white/25 transition-colors">
                  <Share2 className="w-4 h-4" /> Partager le lien
                </button>
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span>👥 <strong>{user.referrals.count}</strong> filleuls</span>
                <span>🪙 <strong>{user.referrals.totalEarned}</strong> grains gagnés</span>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="w-40 h-40 bg-white/10 rounded-full flex items-center justify-center text-6xl">🎁</div>
            </div>
          </div>
        </section>

        {/* Section 10 — Settings Quick Access */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">⚙️ Paramètres rapides</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <SettingsQuickButton icon={Bell} label="Notifications" href="/compte/notifications" />
            <SettingsQuickButton icon={MapPin} label="Adresses" href="/compte/adresses" />
            <SettingsQuickButton icon={CreditCard} label="Paiements" href="/compte/paiements" />
            <SettingsQuickButton icon={Lock} label="Sécurité" href="/compte/securite" />
            <SettingsQuickButton icon={Sliders} label="Préférences" href="/compte/preferences" />
            <SettingsQuickButton icon={Moon} label="Thème" onClick={() => alert('Bientôt disponible')} />
          </div>
        </section>

        {/* Section 11 — Become seller banner */}
        <section className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Devenez vendeur sur DDM+</h2>
              <p className="text-white/90 text-sm">Rejoignez nos vendeurs et exposez vos produits à des milliers de clients.</p>
            </div>
            <Link href="/devenir-vendeur" className="bg-white text-emerald-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shrink-0">
              Commencer
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
