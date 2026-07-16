'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Users, Package, Clock, ArrowRight, Search,
  Zap, CheckCircle, Briefcase, Calculator, Flame,
  Sparkles, Truck, ChevronDown, Filter,
} from 'lucide-react'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'

/* ─── Types ─── */
interface GroupOrder {
  _id?: string
  groupId: string
  status: string
  product: { productId: string; name: string; image?: string; basePrice: number; currency: string; category?: string }
  minQty: number
  targetQty: number
  currentQty: number
  currentUnitPrice: number
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  participants: Array<{ name: string; qty: number; joinedAt?: string }>
  deadline: string
  shippingMethod?: string
  shippingCostPerUnit?: number
  description?: string
  createdAt?: string
  createdBy?: { name?: string }
  progress?: number
  daysLeft?: number
  isAlmostFull?: boolean
  isNew?: boolean
  isPopular?: boolean
  participantCount?: number
  savingsPercent?: number
}

interface ApiGroupOrder {
  _id?: string
  groupId: string
  status: string
  product: { productId: string; name: string; image?: string; basePrice: number; currency: string; category?: string }
  minQty: number
  targetQty: number
  currentQty: number
  currentUnitPrice: number
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  participants: Array<{ name: string; qty: number; joinedAt?: string }>
  deadline: string
  shippingMethod?: string
  shippingCostPerUnit?: number
  description?: string
  createdAt?: string
  createdBy?: { name?: string }
}

function fmt(v: number, currency = 'FCFA') {
  return `${v.toLocaleString('fr-FR')} ${currency}`
}

function enrichGroup(g: ApiGroupOrder): GroupOrder {
  const progress = g.targetQty > 0 ? Math.min(100, Math.round((g.currentQty / g.targetQty) * 100)) : 0
  const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const participantCount = g.participants?.length || 0
  const isAlmostFull = progress >= 80 && progress < 100
  const isNew = g.createdAt ? (Date.now() - new Date(g.createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000 : false
  const isPopular = participantCount >= 5 || progress >= 60
  const savingsPercent = g.product.basePrice > 0 ? Math.round(((g.product.basePrice - g.currentUnitPrice) / g.product.basePrice) * 100) : 0
  return { ...g, progress, daysLeft, participantCount, isAlmostFull, isNew, isPopular, savingsPercent }
}

const SORT_OPTIONS = [
  { label: 'Bientôt complet', key: 'almost_full' },
  { label: 'Plus grande économie', key: 'savings' },
  { label: 'Date limite proche', key: 'deadline' },
  { label: 'Plus de participants', key: 'participants' },
]

const SHIPPING_LABELS: Record<string, { label: string; duration: string }> = {
  maritime_60j: { label: 'Maritime', duration: '45-60 j' },
  air_15j: { label: 'Aérien', duration: '10-15 j' },
  express_3j: { label: 'Express', duration: '3-5 j' },
}

export default function GroupOrdersPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tous')
  const [categories, setCategories] = useState<{ label: string; slug: string }[]>([])
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0])
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [stats, setStats] = useState<{ totalOpen: number; totalFilled: number; totalParticipants: number }>({ totalOpen: 0, totalFilled: 0, totalParticipants: 0 })
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  // Simulateur basé sur un groupe réel
  const [calcGroupId, setCalcGroupId] = useState<string | null>(null)
  const [calcQty, setCalcQty] = useState(50)

  useEffect(() => {
    let cancelled = false
    fetch('/api/catalog/categories')
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.success && Array.isArray(data.items)) {
          const items = data.items
            .filter((c: any) => c.labelFr || c.name)
            .map((c: any) => ({ label: c.labelFr || c.name, slug: c.slug || c.name }))
          setCategories([{ label: 'Tous', slug: 'Tous' }, ...items])
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchGroups() {
      try {
        setLoading(true)
        const res = await fetch('/api/group-orders?limit=50')
        const data = await res.json()
        if (!cancelled) {
          if (data.success && Array.isArray(data.groups)) {
            const enriched = data.groups.map(enrichGroup)
            setGroups(enriched)
            if (!calcGroupId && enriched.length) setCalcGroupId(enriched[0].groupId)
            setStats(data.stats || { totalOpen: 0, totalFilled: 0, totalParticipants: 0 })
            setApiError(false)
          } else {
            throw new Error('API error')
          }
        }
      } catch {
        if (!cancelled) {
          setApiError(true)
          setGroups([])
          setStats({ totalOpen: 0, totalFilled: 0, totalParticipants: 0 })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchGroups()
    return () => { cancelled = true }
  }, [calcGroupId])

  const filtered = useMemo(() => {
    let res = [...groups]
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      res = res.filter(g => g.product.name.toLowerCase().includes(q) || g.groupId.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'Tous') {
      const cat = categoryFilter.toLowerCase()
      res = res.filter(g => (g.product.category || '').toLowerCase().includes(cat) || cat.includes((g.product.category || '').toLowerCase()))
    }
    return res
  }, [groups, searchTerm, categoryFilter])

  const sorted = useMemo(() => {
    const res = [...filtered]
    switch (sortBy.key) {
      case 'almost_full':
        res.sort((a, b) => (b.progress || 0) - (a.progress || 0))
        break
      case 'savings':
        res.sort((a, b) => (b.savingsPercent || 0) - (a.savingsPercent || 0))
        break
      case 'deadline':
        res.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        break
      case 'participants':
        res.sort((a, b) => (b.participantCount || 0) - (a.participantCount || 0))
        break
    }
    return res
  }, [filtered, sortBy])

  const selectedGroup = useMemo(() => groups.find(g => g.groupId === calcGroupId), [groups, calcGroupId])

  const calcResult = useMemo(() => {
    if (!selectedGroup) return null
    const ship = selectedGroup.shippingCostPerUnit || 0
    const base = selectedGroup.product.basePrice
    const groupUnit = selectedGroup.currentUnitPrice
    const totalUnit = groupUnit + ship
    const savingsPerUnit = Math.max(0, base - totalUnit)
    const totalSavings = savingsPerUnit * calcQty
    const discountPct = base > 0 ? Math.round((savingsPerUnit / base) * 100) : 0
    const marginPct = totalUnit > 0 ? Math.round(((base - totalUnit) / totalUnit) * 100) : 0
    return { base, groupUnit, ship, totalUnit, savingsPerUnit, totalSavings, discountPct, marginPct, currency: selectedGroup.product.currency }
  }, [selectedGroup, calcQty])

  function badgeFn(g: GroupOrder) {
    if (g.isAlmostFull || (g.progress && g.progress >= 90)) return { text: `Plus que ${g.targetQty - g.currentQty} places !`, bg: 'bg-rose-500', icon: Zap }
    if (g.isPopular) return { text: 'Populaire', bg: 'bg-orange-500', icon: Flame }
    if (g.isNew) return { text: 'Nouveau', bg: 'bg-emerald-500', icon: Sparkles }
    return { text: 'Ouvert', bg: 'bg-blue-500', icon: Clock }
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const totalSavingsFcfa = groups.reduce((sum, g) => {
    const savingPerUnit = Math.max(0, g.product.basePrice - g.currentUnitPrice - (g.shippingCostPerUnit || 0))
    return sum + savingPerUnit * g.currentQty
  }, 0)
  const savingsLabel = totalSavingsFcfa >= 1_000_000_000
    ? `${(totalSavingsFcfa / 1_000_000).toFixed(1)}M`
    : `${Math.round(totalSavingsFcfa / 1000)}k`

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 md:pb-0">
      <MarketHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-white text-xs font-semibold mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Import groupé · Moins cher ensemble
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              Importez à plusieurs, payez moins cher
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-base md:text-lg text-white/80 mb-8 max-w-xl">
              Rejoignez un groupe existant ou créez le vôtre. Plus on est nombreux, plus le prix unitaire baisse.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-wrap gap-3">
              <button onClick={() => document.getElementById('groups')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition shadow-lg shadow-emerald-900/30">
                Voir les groupes
              </button>
              <button onClick={() => router.push('/achats-groupes/nouveau')} className="px-6 py-3 border-2 border-white/30 hover:bg-white/10 text-white rounded-xl font-semibold transition">
                Créer un groupe →
              </button>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-6 mt-10 text-white/90 text-sm font-medium">
              <span className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /><strong className="text-white text-base">{stats.totalOpen}</strong> groupes ouverts</span>
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /><strong className="text-white text-base">{stats.totalParticipants}</strong> participants</span>
              <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-violet-400" /><strong className="text-white text-base">~{savingsLabel}</strong> FCFA économisés</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="sticky top-16 md:top-20 z-30 bg-white dark:bg-slate-900 py-4 shadow-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un produit ou un groupe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-xl pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setShowSortDropdown(v => !v)} className="flex items-center gap-2 h-12 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Filter className="w-4 h-4" /> {sortBy.label} <ChevronDown className="w-4 h-4" />
                </button>
                {showSortDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt); setShowSortDropdown(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${sortBy.key === opt.key ? 'bg-emerald-50 dark:bg-emerald-900/30 font-semibold text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mt-3 snap-x">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setCategoryFilter(cat.label)}
                className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-xs font-medium transition ${categoryFilter === cat.label ? 'bg-slate-900 text-white dark:bg-emerald-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN: GRID + SIMULATOR */}
      <section id="groups" className="py-8 px-4 max-w-7xl mx-auto">
        {apiError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-6 text-center mb-6">
            <p className="text-red-700 dark:text-red-300 font-medium">Impossible de charger les groupes pour le moment.</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-sm text-red-700 dark:text-red-300 underline">Réessayer</button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: groups grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                Groupes actifs
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{sorted.length} résultat{sorted.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 h-80 animate-pulse" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">Aucun groupe ne correspond à votre recherche.</p>
                <button onClick={() => router.push('/achats-groupes/nouveau')} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold">
                  Créer un groupe
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {sorted.map((g, i) => {
                  const b = badgeFn(g)
                  const prog = g.progress || 0
                  const days = g.daysLeft || 0
                  const solo = g.product.basePrice
                  const gp = g.currentUnitPrice
                  const sav = g.savingsPercent || 0
                  return (
                    <motion.div
                      key={g.groupId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col"
                    >
                      <div className="relative h-44 bg-slate-100 dark:bg-slate-700">
                        {g.product.image ? <Image src={g.product.image} alt={g.product.name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">{g.product.name}</div>}
                        <span className={`absolute top-3 left-3 px-3 py-1.5 ${b.bg} text-white text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow`}><b.icon className="w-3.5 h-3.5" />{b.text}</span>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-900 dark:text-slate-200 mb-1 line-clamp-1">{g.product.name}</h3>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{g.currentQty}/{g.targetQty} unités</span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{days > 0 ? `${days}j restantes` : 'Terminé'}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }} transition={{ duration: 0.6 }} className={`h-full rounded-full ${prog >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-violet-500'}`} />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex -space-x-2">
                            {(g.participants || []).slice(0, 4).map((p, idx) => (
                              <div key={idx} className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800" title={p.name}>{initials(p.name)}</div>
                            ))}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{(g.participantCount || 0) > 4 ? `+${(g.participantCount || 0) - 4} acheteurs` : `${g.participantCount || 0} participant${(g.participantCount || 0) > 1 ? 's' : ''}`}</span>
                        </div>
                        <div className="mt-auto">
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-sm text-slate-400 line-through">{fmt(solo, g.product.currency)}</span>
                            <span className="text-lg font-bold text-emerald-600">{fmt(gp, g.product.currency)}</span>
                            {sav > 0 && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded px-1.5 py-0.5">-{sav}%</span>}
                          </div>
                          <button onClick={() => router.push(`/achats-groupes/${g.groupId}`)} className={`w-full py-2.5 rounded-xl font-semibold text-white transition ${g.isAlmostFull ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-emerald-500 hover:bg-emerald-600'} shadow-md`}>
                            {g.isAlmostFull ? 'Rejoindre maintenant' : 'Rejoindre le groupe'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT: simulator */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-violet-600" />
                Simulateur d&apos;économie
              </h2>

              {selectedGroup && calcResult ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Groupe sélectionné</label>
                    <select
                      value={calcGroupId || ''}
                      onChange={(e) => { setCalcGroupId(e.target.value); setCalcQty(50) }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200"
                    >
                      {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.product.name} · {g.currentQty}/{g.targetQty}</option>)}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span>Quantité</span>
                      <span className="text-violet-600">{calcQty}</span>
                    </div>
                    <input type="range" min={selectedGroup.minQty || 1} max={selectedGroup.targetQty * 2} value={calcQty} onChange={(e) => setCalcQty(Number(e.target.value))} className="w-full accent-violet-600 h-1.5" />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <span className="text-slate-500 dark:text-slate-400">Prix unitaire solo</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(calcResult.base, calcResult.currency)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <span className="text-slate-500 dark:text-slate-400">Prix groupé</span>
                      <span className="font-bold text-emerald-600">{fmt(calcResult.groupUnit, calcResult.currency)}</span>
                    </div>
                    {calcResult.ship > 0 && (
                      <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <span className="text-slate-500 dark:text-slate-400">Transport ({SHIPPING_LABELS[selectedGroup.shippingMethod || 'maritime_60j']?.label || 'Maritime'})</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">+{fmt(calcResult.ship, calcResult.currency)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white">Total par unité</span>
                        <span className="text-lg font-extrabold text-emerald-600">{fmt(calcResult.totalUnit, calcResult.currency)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600 font-semibold">Économie: {fmt(calcResult.totalSavings, calcResult.currency)} (-{calcResult.discountPct}%)</span>
                        {calcResult.marginPct > 0 && <span className="text-violet-600 font-semibold">Marge: +{calcResult.marginPct}%</span>}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => router.push(`/achats-groupes/${selectedGroup.groupId}`)} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition">
                    Rejoindre ce groupe
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Calculator className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Aucun groupe disponible pour le simulateur.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-10 px-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center">Comment ça marche ?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: '1', icon: Search, title: 'Trouvez un groupe' },
              { num: '2', icon: Users, title: 'Réservez votre quantité' },
              { num: '3', icon: Truck, title: 'Import groupé' },
              { num: '4', icon: CheckCircle, title: 'Livraison Sénégal' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <div className="w-10 h-10 bg-slate-900 dark:bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold mb-3">{step.num}</div>
                <step.icon className="w-5 h-5 text-violet-600 mb-2" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{step.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 px-4 bg-gradient-to-r from-violet-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Vous ne trouvez pas votre produit ?</h2>
          <p className="text-white/90 mb-6">Créez un groupe et invitez d&apos;autres acheteurs pour réduire le prix.</p>
          <button onClick={() => router.push('/achats-groupes/nouveau')} className="px-8 py-3.5 bg-white text-violet-700 rounded-xl font-bold hover:bg-slate-100 transition shadow-lg">
            Créer un groupe →
          </button>
        </div>
      </section>

      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
