'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Users, Package, Clock, ArrowRight, Search,
  Zap, CheckCircle,
  X, Briefcase, Calculator, Flame,
  Sparkles, Truck, ChevronDown,
  Shield, Factory
} from 'lucide-react'

/* ─── Types ─── */
interface GroupOrder {
  _id?: string; groupId: string; status: string
  product: { productId: string; name: string; image?: string; basePrice: number; currency: string; category?: string }
  minQty: number; targetQty: number; currentQty: number; currentUnitPrice: number
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  participants: Array<{ name: string; qty: number; joinedAt?: string }>
  deadline: string; shippingMethod?: string; description?: string; createdAt?: string; createdBy?: { name?: string }
  progress?: number; daysLeft?: number; isAlmostFull?: boolean; isNew?: boolean; isPopular?: boolean
  soloPrice?: number; groupPrice?: number; savingsPercent?: number; participantCount?: number
  recentParticipants?: Array<{ name: string; joinedAt?: string }>
}

/* ─── Helpers ─── */
const fmt = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`

interface ApiGroupOrder {
  _id?: string; groupId: string; status: string
  product: { productId: string; name: string; image?: string; basePrice: number; currency: string; category?: string }
  minQty: number; targetQty: number; currentQty: number; currentUnitPrice: number
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  participants: Array<{ name: string; qty: number; joinedAt?: string }>
  deadline: string; shippingMethod?: string; description?: string; createdAt?: string; createdBy?: { name?: string }
}

function enrichGroup(g: ApiGroupOrder): GroupOrder {
  const progress = Math.min(100, Math.round((g.currentQty / g.targetQty) * 100))
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

/* ─── Mock Data ─── */
const MOCK_F: GroupOrder[] = [
  { groupId:'GRP-001', status:'open', product:{productId:'p1',name:'iPhone reconditionné 128GB',image:'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&q=80',basePrice:245000,currency:'FCFA',category:'Électronique'}, minQty:5,targetQty:50,currentQty:47,currentUnitPrice:178000, priceTiers:[{minQty:10,price:210000},{minQty:25,price:195000},{minQty:50,price:178000}], participants:[{name:'Ahmed D.',qty:5},{name:'Fatou S.',qty:3},{name:'Moussa K.',qty:8},{name:'Aminata B.',qty:2}], deadline:new Date(Date.now()+2*24*60*60*1000).toISOString(), progress:94, daysLeft:2, isAlmostFull:true, isPopular:true, isNew:false, savingsPercent:27, participantCount:42 },
  { groupId:'GRP-002', status:'open', product:{productId:'p2',name:'Set palette make-up pro',image:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',basePrice:12500,currency:'FCFA',category:'Beauté'}, minQty:10,targetQty:50,currentQty:28,currentUnitPrice:8900, priceTiers:[{minQty:10,price:11000},{minQty:30,price:9500},{minQty:50,price:8900}], participants:[{name:'Omar N.',qty:4},{name:'Sophie L.',qty:5}], deadline:new Date(Date.now()+5*24*60*60*1000).toISOString(), progress:56, daysLeft:5, isAlmostFull:false, isPopular:true, isNew:true, savingsPercent:29, participantCount:24 },
  { groupId:'GRP-003', status:'open', product:{productId:'p3',name:'Sneakers tendance unisex',image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',basePrice:22000,currency:'FCFA',category:'Mode'}, minQty:8,targetQty:40,currentQty:8,currentUnitPrice:15500, priceTiers:[{minQty:8,price:18000},{minQty:20,price:16500},{minQty:40,price:15500}], participants:[{name:'Khalil M.',qty:3}], deadline:new Date(Date.now()+10*24*60*60*1000).toISOString(), progress:20, daysLeft:10, isAlmostFull:false, isPopular:false, isNew:true, savingsPercent:30, participantCount:5 }
]

const MOCK_G: GroupOrder[] = [
  { groupId:'GRP-004', status:'open', product:{productId:'p4',name:'Smartwatch Pro Sport GPS',image:'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&q=80',basePrice:55000,currency:'FCFA',category:'Tech'}, minQty:12,targetQty:30,currentQty:18,currentUnitPrice:32000, priceTiers:[], participants:[], deadline:new Date(Date.now()+5*24*60*60*1000).toISOString(), progress:60, daysLeft:5, savingsPercent:42, participantCount:2 },
  { groupId:'GRP-005', status:'open', product:{productId:'p5',name:'Parfums premium lots',image:'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80',basePrice:32000,currency:'FCFA',category:'Beauté'}, minQty:15,targetQty:60,currentQty:28,currentUnitPrice:19000, priceTiers:[], participants:[], deadline:new Date(Date.now()+8*24*60*60*1000).toISOString(), progress:47, daysLeft:8, savingsPercent:41, participantCount:2 },
  { groupId:'GRP-006', status:'open', product:{productId:'p6',name:'GPS tracker voiture',image:'https://images.unsplash.com/photo-1569336412511-266f835c1a47?w=400&q=80',basePrice:42000,currency:'FCFA',category:'Auto'}, minQty:10,targetQty:45,currentQty:24,currentUnitPrice:28000, priceTiers:[], participants:[], deadline:new Date(Date.now()+6*24*60*60*1000).toISOString(), progress:53, daysLeft:6, savingsPercent:33, participantCount:3 },
  { groupId:'GRP-007', status:'filled', product:{productId:'p7',name:'Air fryer nouveauté',image:'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=400&q=80',basePrice:65000,currency:'FCFA',category:'Maison'}, minQty:8,targetQty:40,currentQty:40,currentUnitPrice:39000, priceTiers:[], participants:[], deadline:new Date(Date.now()+3*24*60*60*1000).toISOString(), progress:100, daysLeft:3, savingsPercent:40, participantCount:5 },
  { groupId:'GRP-008', status:'open', product:{productId:'p8',name:'Enceinte Bluetooth Waterproof',image:'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80',basePrice:22000,currency:'FCFA',category:'Tech'}, minQty:15,targetQty:60,currentQty:28,currentUnitPrice:12000, priceTiers:[], participants:[], deadline:new Date(Date.now()+8*24*60*60*1000).toISOString(), progress:47, daysLeft:8, savingsPercent:45, participantCount:2 },
  { groupId:'GRP-009', status:'open', product:{productId:'p9',name:'Sacs à main Cuir PU',image:'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80',basePrice:28000,currency:'FCFA',category:'Mode'}, minQty:20,targetQty:50,currentQty:22,currentUnitPrice:14500, priceTiers:[], participants:[], deadline:new Date(Date.now()+12*24*60*60*1000).toISOString(), progress:44, daysLeft:12, savingsPercent:48, participantCount:2 },
  { groupId:'GRP-010', status:'open', product:{productId:'p10',name:'Lampes LED Solaires',image:'https://images.unsplash.com/photo-1513506003013-d531632103c3?w=400&q=80',basePrice:18000,currency:'FCFA',category:'Maison'}, minQty:25,targetQty:80,currentQty:34,currentUnitPrice:8500, priceTiers:[], participants:[], deadline:new Date(Date.now()+10*24*60*60*1000).toISOString(), progress:43, daysLeft:10, savingsPercent:53, participantCount:2 },
  { groupId:'GRP-011', status:'open', product:{productId:'p11',name:'Écran LED Ultra Slim',image:'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80',basePrice:145000,currency:'FCFA',category:'Tech'}, minQty:5,targetQty:20,currentQty:7,currentUnitPrice:98000, priceTiers:[], participants:[], deadline:new Date(Date.now()+14*24*60*60*1000).toISOString(), progress:35, daysLeft:14, savingsPercent:32, participantCount:1 },
  { groupId:'GRP-012', status:'open', product:{productId:'p12',name:'Tondeuse électrique pro',image:'https://images.unsplash.com/photo-1621607512022-6d5f5c1a4246?w=400&q=80',basePrice:18000,currency:'FCFA',category:'Beauté'}, minQty:20,targetQty:50,currentQty:12,currentUnitPrice:9500, priceTiers:[], participants:[], deadline:new Date(Date.now()+9*24*60*60*1000).toISOString(), progress:24, daysLeft:9, savingsPercent:47, participantCount:2 },
  { groupId:'GRP-013', status:'open', product:{productId:'p13',name:'Chaussures bébé lot',image:'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&q=80',basePrice:15000,currency:'FCFA',category:'Mode'}, minQty:30,targetQty:100,currentQty:45,currentUnitPrice:6500, priceTiers:[], participants:[], deadline:new Date(Date.now()+7*24*60*60*1000).toISOString(), progress:45, daysLeft:7, savingsPercent:57, participantCount:3 }
]

const CATS = ['Tous','Mode','Beauté','Maison','Électronique','Auto']

export default function GroupOrdersPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tous')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0])
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [calcQty, setCalcQty] = useState(50)
  const [calcDiscount, setCalcDiscount] = useState(45)
  const [calcSoloPrice, setCalcSoloPrice] = useState(50000)
  const [calcTransport, setCalcTransport] = useState<'maritime'|'air'|'express'>('maritime')

  /* ─── API Data ─── */
  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [stats, setStats] = useState<{ totalOpen: number; totalFilled: number; totalParticipants: number }>({ totalOpen: 0, totalFilled: 0, totalParticipants: 0 })
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

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
            setStats(data.stats || { totalOpen: 0, totalFilled: 0, totalParticipants: 0 })
            setApiError(false)
          } else {
            throw new Error('API error')
          }
        }
      } catch {
        if (!cancelled) {
          setApiError(true)
          const enriched = [...MOCK_F, ...MOCK_G].map(g => enrichGroup(g as unknown as ApiGroupOrder))
          setGroups(enriched)
          setStats({ totalOpen: 12, totalFilled: 1, totalParticipants: 847 })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchGroups()
    return () => { cancelled = true }
  }, [])

  /* ─── Derived calculator ─── */
  const calcGroupPrice = Math.round(calcSoloPrice * (1 - calcDiscount / 100))
  const unitShip = calcTransport === 'maritime' ? 1500 : calcTransport === 'express' ? 5000 : 3500
  const calcTotalUnit = calcGroupPrice + unitShip
  const calcTotalSavings = (calcSoloPrice - calcTotalUnit) * calcQty
  const calcMarginPct = calcTotalUnit > 0 ? Math.round(((calcSoloPrice - calcTotalUnit) / calcTotalUnit) * 100) : 0

  /* ─── Filters & Sort ─── */
  const filtered = useMemo(() => {
    let res = [...groups]
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      res = res.filter(g => g.product.name.toLowerCase().includes(q) || g.groupId.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'Tous') {
      res = res.filter(g => (g.product.category || '').toLowerCase().includes(categoryFilter.toLowerCase()))
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

  const featured = sorted.slice(0, 3)
  const gridAll = sorted

  const totalSavingsFcfa = stats.totalParticipants * 25000
  const savingsLabel = totalSavingsFcfa >= 1_000_000 ? `${Math.round(totalSavingsFcfa / 1_000_000)}M` : `${Math.round(totalSavingsFcfa / 1000)}k`

  function getProg(g: GroupOrder) {
    return Math.min(100, Math.round((g.currentQty / g.targetQty) * 100))
  }
  function getDays(d: string) {
    const diff = new Date(d).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  function badgeFn(g: GroupOrder) {
    if (g.isAlmostFull || (g.progress && g.progress >= 90)) return { text: `Plus que ${g.targetQty - g.currentQty} places !`, bg: 'bg-[#FF5252]', icon: Zap }
    if (g.isPopular) return { text: 'Populaire', bg: 'bg-[#FFAB40]', icon: Flame }
    if (g.isNew) return { text: 'Nouveau', bg: 'bg-[#00C853]', icon: Sparkles }
    return { text: 'Ouvert', bg: 'bg-[#448AFF]', icon: Clock }
  }
  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const featuredCards = loading ? (
    [1,2,3].map(i => (
      <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200" />
        <div className="p-5 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-8 bg-gray-200 rounded w-full" />
        </div>
      </div>
    ))
  ) : featured.length === 0 ? (
    <div className="col-span-3 text-center py-12 text-gray-500">
      Aucun groupe en vedette pour le moment.
    </div>
  ) : (
    featured.map((g, i) => {
      const b = badgeFn(g); const prog = getProg(g); const days = getDays(g.deadline)
      const solo = g.product.basePrice; const gp = g.currentUnitPrice; const sav = Math.round(((solo-gp)/solo)*100)
      return (
        <motion.div key={g.groupId} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} whileHover={{y:-6}} className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
          <div className="relative h-48 bg-gray-100">
            {g.product.image ? <Image src={g.product.image} alt={g.product.name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">{g.product.name}</div>}
            <span className={`absolute top-3 left-3 px-3 py-1.5 ${b.bg} text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-md`}><b.icon className="w-3.5 h-3.5"/>{b.text}</span>
          </div>
          <div className="p-5">
            <h3 className="font-bold text-lg text-[#1A1A2E] mb-2 line-clamp-1">{g.product.name}</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">{g.currentQty}/{g.targetQty}</span>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div initial={{width:0}} animate={{width:`${prog}%`}} transition={{duration:0.8}} className={`h-full rounded-full ${prog>=100?'bg-[#00C853]':'bg-gradient-to-r from-[#00C853] to-[#7C4DFF]'}`}/>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-2">
                {(g.participants||[]).slice(0,4).map((p,i)=>(
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#448AFF] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white" title={p.name}>{initials(p.name)}</div>
                ))}
              </div>
              <span className="text-xs text-gray-500">+{(g.participantCount||0)>4?(g.participantCount||0)-4:Math.max(0,(g.participantCount||0))} acheteurs</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm text-gray-400 line-through">Solo: {fmt(solo)}</span>
              <span className="text-base font-bold text-[#00C853]">Groupe: {fmt(gp)}</span>
              <span className="text-xs bg-red-50 text-[#FF5252] rounded px-1.5 py-0.5 font-bold">(-{sav}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-orange-500 mb-4">
              <Clock className="w-4 h-4"/>{days>0?`⏱ ${days}j restantes`:'Terminé'}
            </div>
            <button onClick={()=>router.push(`/achats-groupes/${g.groupId}`)} className={`w-full py-3 rounded-xl font-semibold transition ${g.isAlmostFull?'bg-[#FF5252] hover:bg-red-600 text-white shadow-lg shadow-red-200':'bg-[#00C853] hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200'}`}>
              {g.isAlmostFull?'Rejoindre maintenant':g.isNew?`Être le ${g.currentQty+1}ème`:'Rejoindre'}
            </button>
          </div>
        </motion.div>
      )
    })
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 md:pb-0">
      {/* TOP BAR */}
      <div className="h-10 bg-[#1A1A2E] text-white flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00C853]" />
          <span className="font-semibold">IT Vision Plus</span>
          <span className="text-white/60 hidden sm:inline">Import Chine → Sénégal · Livraison Dakar · Support comm. 7j/7</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="text-[#FFAB40]">🪙</span> 1250 pts</span>
          <button className="px-4 py-1 bg-[#00C853] rounded-full font-semibold text-xs hover:bg-emerald-500 transition">Mon compte</button>
        </div>
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white shadow-sm h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-[#1A1A2E] text-lg">
            <Shield className="w-6 h-6 text-[#00C853]" /> IT Vision Plus
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-[#1A1A2E] transition">Accueil</Link>
            <Link href="/produits" className="hover:text-[#1A1A2E] transition">Produits</Link>
            <span className="text-[#1A1A2E] border-b-2 border-[#00C853] pb-0.5 font-semibold">Achats groupés</span>
            <Link href="/boutiques" className="hover:text-[#1A1A2E] transition">Boutiques</Link>
            <Link href="/compte" className="hover:text-[#1A1A2E] transition">Compte</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-300" />
          <span className="text-sm font-medium text-[#1A1A2E] hidden sm:inline">Mon compte</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[500px] overflow-hidden" style={{background:'linear-gradient(135deg, #1A1A2E 0%, #16213E 30%, #0F3460 60%, #00C853 100%)'}}>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize:'40px 40px'}} />
        <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div initial={{opacity:0,x:-30}} animate={{opacity:1,x:0}} transition={{duration:0.6}}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" /> DDM+ · Achetez à plusieurs
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                🤝 Importez en groupe,<br/>économisez ensemble
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-lg">
                Plus on est nombreux, moins c&apos;est cher. Jusqu&apos;à -45% sur vos commandes.
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                <button onClick={()=>document.getElementById('all-groups')?.scrollIntoView({behavior:'smooth'})} className="px-6 py-3 bg-white text-[#1A1A2E] rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg">
                  Voir les groupes actifs
                </button>
                <button onClick={()=>router.push('/achats-groupes/nouveau')} className="px-6 py-3 border-2 border-white/50 text-white rounded-xl font-semibold hover:bg-white/10 transition">
                  Créer un groupe →
                </button>
              </div>
              <div className="flex flex-wrap gap-8 text-white/90 text-sm font-medium">
                <span className="flex items-center gap-2">🔥 <strong className="text-white text-base">{stats.totalOpen}</strong> groupes ouverts</span>
                <span className="flex items-center gap-2">👥 <strong className="text-white text-base">{stats.totalParticipants}</strong> participants</span>
                <span className="flex items-center gap-2">💰 <strong className="text-white text-base">{savingsLabel}</strong> FCFA économisés</span>
              </div>
            </motion.div>

            <div className="hidden lg:block relative">
              <div className="w-[400px] h-[300px] bg-white/10 rounded-2xl flex items-center justify-center text-white/60 text-sm mx-auto border border-white/10">
                <div className="text-center">
                  <Package className="w-16 h-16 mx-auto mb-3 opacity-40" />
                  Illustration 3D isométrique<br/>Import groupe
                </div>
              </div>
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="absolute -top-4 right-0 bg-white rounded-xl shadow-xl p-3 flex items-center gap-3 max-w-[220px]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#448AFF] flex items-center justify-center text-white text-[10px] font-bold">AD</div>
                <div className="text-xs"><span className="font-bold text-[#1A1A2E]">Ahmed D.</span> <span className="text-gray-500">a rejoint un groupe</span></div>
              </motion.div>
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.6}} className="absolute top-20 -right-4 bg-white rounded-xl shadow-xl p-3 flex items-center gap-3 max-w-[220px]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5252] to-[#FFAB40] flex items-center justify-center text-white text-[10px] font-bold">FS</div>
                <div className="text-xs"><span className="font-bold text-[#1A1A2E]">Fatou S.</span> <span className="text-gray-500">a créé une cagnotte</span></div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="sticky top-16 z-30 bg-white py-6 shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative max-w-3xl mx-auto mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Rechercher un produit ou groupe..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full h-14 bg-gray-100 rounded-2xl pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C853] transition" />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap gap-3 justify-center">
              {CATS.map((cat)=>(
                <button key={cat} onClick={()=>setCategoryFilter(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${categoryFilter===cat?'bg-[#1A1A2E] text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {cat}{cat==='Tous'?' (24)':''}
                </button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setShowSortDropdown(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Trier: {sortBy.label} <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showSortDropdown && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt); setShowSortDropdown(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${sortBy.key === opt.key ? 'bg-gray-50 font-semibold text-[#1A1A2E]' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE BADGES */}
      <section className="py-6 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-3 px-5 py-4 bg-[#E8F5E9] rounded-xl">
            <span className="text-xl">💰</span>
            <span className="text-sm font-bold text-[#00C853]">Économisez jusqu&apos;à -45%</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-4 bg-[#EDE7F6] rounded-xl">
            <span className="text-xl">📦</span>
            <span className="text-sm font-bold text-[#7C4DFF]">Stock négocié</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-4 bg-orange-50 rounded-xl">
            <span className="text-xl">🚚</span>
            <span className="text-sm font-bold text-[#FFAB40]">Transport groupé optimisé</span>
          </div>
        </div>
      </section>

      {/* FEATURED GROUPS */}
      <section id="featured-groups" className="py-8 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">GROUPES ACTIFS · HERO GROUP CARDS</p>
            <h2 className="text-xl font-bold text-[#1A1A2E] flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#FFAB40]" />
              Groupes en vedette – Rejoignez vite !
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredCards}
          </div>
        </div>
      </section>

      {/* CALCULATOR + GROUPS — compact side-by-side */}
      <section id="all-groups" className="py-6 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-5">
          {/* LEFT: Calculator */}
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="bg-white rounded-2xl shadow-lg p-5">
            <h2 className="text-base font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#7C4DFF]" />
              Calculez votre économie en temps réel
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1A1A2E] mb-1"><span>Prix unitaire solo</span><span className="text-[#7C4DFF]">{calcSoloPrice.toLocaleString('fr-FR')} F</span></div>
                  <input type="range" min={5000} max={200000} step={5000} value={calcSoloPrice} onChange={(e)=>setCalcSoloPrice(Number(e.target.value))} className="w-full accent-[#7C4DFF] h-1"/>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1A1A2E] mb-1"><span>Réduction groupée</span><span className="text-[#00C853]">{calcDiscount}%</span></div>
                  <input type="range" min={5} max={60} step={5} value={calcDiscount} onChange={(e)=>setCalcDiscount(Number(e.target.value))} className="w-full accent-[#00C853] h-1"/>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1A1A2E] mb-1"><span>Quantité</span><span className="text-[#7C4DFF]">{calcQty}</span></div>
                  <input type="range" min={1} max={100} value={calcQty} onChange={(e)=>setCalcQty(Number(e.target.value))} className="w-full accent-[#7C4DFF] h-1"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1A1A2E] mb-1 block">Produit</label>
                  <select className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00C853]">
                    <option>Caméra IP Hikvision 4MP</option>
                    <option>iPhone reconditionné 128GB</option>
                    <option>Sneakers Running Légères</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1A1A2E] mb-1 block">Mode transport</label>
                  <div className="flex gap-1.5">
                    {['maritime','air','express'].map((t)=>(
                      <button key={t} onClick={()=>setCalcTransport(t as any)} className={`flex-1 py-1 rounded-lg text-[10px] font-semibold border transition ${calcTransport===t?'bg-[#EDE7F6] border-[#7C4DFF] text-[#7C4DFF]':'bg-white border-gray-200 text-gray-600'}`}>
                        {t==='maritime'?'Maritime 45j':t==='air'?'Aérien 7j':'Express 3j'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-xs"><span className="text-gray-600">Prix unitaire individuel</span><span className="font-bold text-gray-500">{fmt(calcSoloPrice)}</span></div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-xs"><span className="text-gray-600">Prix groupé (50+)</span><span className="font-bold text-[#00C853]">{fmt(calcGroupPrice)}</span></div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-xs"><span className="text-gray-600">Transport groupé</span><span className="font-bold text-gray-700">+{fmt(unitShip)}</span></div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-[#1A1A2E]">Total par unité:</span><span className="text-lg font-extrabold text-[#00C853]">{fmt(calcTotalUnit)}</span></div>
                  <span className="text-[10px] text-[#00C853] font-semibold block">💚 Économie: {fmt(calcTotalSavings)} (-{calcDiscount}%)</span>
                  <span className="inline-block mt-1 text-[10px] font-bold text-[#7C4DFF] bg-[#EDE7F6] rounded-full px-2 py-0.5">📈 Marge: +{calcMarginPct}%</span>
                </div>
                <button className="w-full py-2 bg-[#00C853] text-white rounded-xl font-semibold text-xs hover:bg-emerald-600 transition shadow-md">
                  Trouver un groupe pour ce produit
                </button>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Compact groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7C4DFF]" />
                Tous les groupes
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Tous','Bientôt','Nouv.','Mode','Tech','Maison','Beauté'].map((f,i)=> (
                <button key={f} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${i===0?'bg-[#1A1A2E] text-white':i===1?'bg-red-50 text-[#FF5252] border-red-100':i===2?'bg-emerald-50 text-[#00C853] border-emerald-100':'bg-white text-gray-500 border-gray-100'}`}>{f}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {gridAll.slice(0,6).map((g) => {
                const b = badgeFn(g); const prog = getProg(g); const days = getDays(g.deadline)
                const solo = g.product.basePrice; const gp = g.currentUnitPrice; const sav = Math.round(((solo-gp)/solo)*100)
                return (
                  <motion.div key={g.groupId} whileHover={{y:-3}} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="relative h-24 bg-gray-100">
                      {g.product.image ? <Image src={g.product.image} alt={g.product.name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">{g.product.name}</div>}
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 ${b.bg} text-white text-[8px] font-bold rounded-full`}>{b.text}</span>
                    </div>
                    <div className="p-2">
                      <h3 className="font-bold text-[11px] text-[#1A1A2E] mb-0.5 line-clamp-1">{g.product.name}</h3>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-gray-500">{g.currentQty}/{g.targetQty}</span>
                        <div className="w-10 h-1 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#00C853] rounded-full" style={{width:`${prog}%`}}/></div>
                      </div>
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <div className="flex -space-x-1">
                          {['AD','FS'].map((ini,i)=>(<div key={i} className="w-4 h-4 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#448AFF] flex items-center justify-center text-[6px] font-bold text-white border border-white">{ini}</div>))}
                        </div>
                        <span className="text-[8px] text-gray-400">+{Math.max(0,(g.participantCount||1)-2)}</span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-0.5">
                        <span className="text-[9px] text-gray-400 line-through">{fmt(solo)}</span>
                        <span className="text-[11px] font-bold text-[#00C853]">{fmt(gp)}</span>
                        <span className="text-[8px] bg-red-50 text-[#FF5252] rounded px-0.5 font-bold">-{sav}%</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-[9px] text-orange-500 mb-1"><Clock className="w-2.5 h-2.5"/>{days}j</div>
                      <button onClick={()=>router.push(`/achats-groupes/${g.groupId}`)} className={`w-full py-1 rounded-lg text-[10px] font-semibold transition ${g.isAlmostFull?'bg-[#FF5252] text-white':'bg-[#00C853] text-white'}`}>
                        {g.isAlmostFull?'Bientôt complet!':'Rejoindre'}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            {/* Create group CTA */}
            <div className="rounded-2xl p-4 text-white relative overflow-hidden" style={{background:'linear-gradient(135deg, #7C4DFF 0%, #00C853 100%)'}}>
              <p className="text-[10px] opacity-80 mb-0.5">Vous ne trouvez pas ?</p>
              <h3 className="text-sm font-bold mb-1">Créez votre propre groupe</h3>
              <p className="text-[10px] opacity-90 mb-2">Choisissez un produit, fixez la cible et invitez d&apos;autres acheteurs.</p>
              <button onClick={()=>router.push('/achats-groupes/nouveau')} className="px-3 py-1.5 bg-white text-[#7C4DFF] rounded-lg text-[10px] font-semibold hover:bg-gray-100 transition">
                Créer un groupe →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — compact inline */}
      <section className="py-6 px-4 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-base font-bold text-[#1A1A2E] mb-4">Comment fonctionne un achat groupé ?</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              {num:'1', icon:Search, title:'Choisissez un groupe'},
              {num:'2', icon:Users, title:'Rejoignez et réservez'},
              {num:'3', icon:Factory, title:'Production en Chine'},
              {num:'4', icon:Truck, title:'Livraison Sénégal'}
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#1A1A2E] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{step.num}</div>
                <div>
                  <step.icon className="w-3.5 h-3.5 text-[#7C4DFF] mb-0.5" />
                  <h3 className="font-bold text-[#1A1A2E] text-[11px]">{step.title}</h3>
                </div>
                {i < 3 && <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALL GROUPS — full width 4-col grid */}
      <section className="py-8 px-4 bg-[#F8F9FA]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TOUS LES GROUPES ACTIFS · GRD</p>
              <h2 className="text-xl font-bold text-[#1A1A2E] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7C4DFF]"/>Tous les groupes actifs
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Tous','Bientôt complet','Nouveau','Mode','Tech','Maison','Beauté'].map((f,i)=>(
              <button key={f} className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${i===0?'bg-[#1A1A2E] text-white border-[#1A1A2E]':i===1?'bg-red-50 text-[#FF5252] border-red-100':i===2?'bg-emerald-50 text-[#00C853] border-emerald-100':'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{f}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {gridAll.map((g)=>{
              const b=badgeFn(g);const prog=getProg(g);const days=getDays(g.deadline)
              const solo=g.product.basePrice;const gp=g.currentUnitPrice;const sav=Math.round(((solo-gp)/solo)*100)
              return (
                <motion.div key={g.groupId+'-grid'} whileHover={{y:-3}} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="relative h-28 bg-gray-100">
                    {g.product.image&&<Image src={g.product.image} alt={g.product.name} fill className="object-cover"/>}
                    <span className={`absolute top-2 left-2 px-2 py-0.5 ${b.bg} text-white text-[9px] font-bold rounded-full`}>{b.text}</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-xs text-[#1A1A2E] mb-1 line-clamp-1">{g.product.name}</h3>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">{g.currentQty}/{g.targetQty}</span>
                      <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#00C853] rounded-full" style={{width:`${prog}%`}}/></div>
                    </div>
                    <div className="flex -space-x-1 mb-1.5">
                      {['AD','FS','MK'].slice(0,Math.min(3,g.participantCount||1)).map((ini,i)=>(
                        <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#448AFF] flex items-center justify-center text-[7px] font-bold text-white border border-white">{ini}</div>
                      ))}
                      {(g.participantCount||0)>3&&<div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[7px] font-bold text-gray-600 border border-white">+{(g.participantCount||0)-3}</div>}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-[9px] text-gray-400 line-through">Solo: {fmt(solo)}</span>
                      <span className="text-xs font-bold text-[#00C853]">Groupe: {fmt(gp)}</span>
                      <span className="text-[9px] bg-red-50 text-[#FF5252] rounded px-0.5 font-bold">(-{sav}%)</span>
                    </div>
                    <div className="text-[10px] text-orange-500 mb-2 flex items-center gap-0.5"><Clock className="w-3 h-3"/>{days}j restantes</div>
                    <button onClick={()=>router.push(`/achats-groupes/${g.groupId}`)} className={`w-full py-1.5 rounded-lg text-[10px] font-semibold text-white transition ${prog>=100?'bg-gray-400':g.isAlmostFull?'bg-[#FF5252] hover:bg-red-600':'bg-[#00C853] hover:bg-emerald-600'}`}>
                      {prog>=100?'Bientôt complet':g.isAlmostFull?'Rejoindre maintenant':'Rejoindre'}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CREATE GROUP CTA — full width banner */}
      <section className="py-6 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden" style={{background:'linear-gradient(135deg, #1A1A2E 0%, #7C4DFF 50%, #00C853 100%)'}}>
            <div>
              <p className="text-xs text-white/70 mb-1">Vous ne trouvez pas votre produit ?</p>
              <h3 className="text-xl font-bold mb-1">Créez votre propre groupe</h3>
              <p className="text-sm text-white/80">Choisissez un produit, fixez la cible et invitez d&apos;autres acheteurs.</p>
            </div>
            <button onClick={()=>router.push('/achats-groupes/nouveau')} className="flex-shrink-0 px-6 py-3 bg-white text-[#7C4DFF] rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg">
              Créer un groupe →
            </button>
          </motion.div>
        </div>
      </section>

      {/* ENTREPRENEURS */}
      <section className="py-6 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">EXEMPLE DE RENTABILITÉ POUR REVENDEURS</p>
          <h2 className="text-base font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#7C4DFF]" />
            Pour les entrepreneurs &amp; revendeurs
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              {[
                'Bénéficiez de prix grossiste même à petite échelle',
                'Économisez sur l\'importation et la logistique',
                'Revendez avec une marge confortable',
                'Rejoignez une communauté d\'entrepreneurs'
              ].map((txt,i)=> (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00C853] flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700">{txt}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="font-bold text-[#1A1A2E] mb-3 text-xs">Exemple de rentabilité pour revendeurs</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Prix unitaire individuel</span><span className="font-bold text-[#FF5252]">22 000 FCFA</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Prix groupé (50+)</span><span className="font-bold text-[#00C853]">12 000 FCFA</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Transport groupé</span><span className="font-bold text-gray-600">+8 000 FCFA</span></div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-[#1A1A2E]">Total par unité:</span>
                  <span className="text-lg font-extrabold text-[#00C853]">20 000 FCFA</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <span className="text-[10px] font-bold text-[#00C853] bg-emerald-50 rounded-full px-2 py-0.5">💚 Économie: -45%</span>
                  <span className="text-[10px] font-bold text-[#7C4DFF] bg-[#EDE7F6] rounded-full px-2 py-0.5">📈 Marge revente: +67%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1A1A2E] text-white py-12">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold mb-3"><Shield className="w-5 h-5 text-[#00C853]" /> IT Vision Plus</div>
            <p className="text-xs text-gray-400 mb-4">Import Chine → Sénégal. Livraison Dakar. Support 7j/7.</p>
            <div className="flex gap-3">
              {['fb','tw','ig','tk'].map(s=>(<div key={s} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs">{s}</div>))}
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Aide</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <p>Produits</p><p>Commandes</p><p>Paiement & Livraison</p><p>Retours</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Communauté</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <p>Blog</p><p>Partenaires</p><p>Revendeurs</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Certifications</h4>
            <div className="flex gap-2">
              {['CE','ISO','SGS'].map(c=>(<div key={c} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold">{c}</div>))}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-white/10 text-center text-xs text-gray-500">
          © 2024 IT Vision Plus - Import Chine
        </div>
      </footer>

    </div>
  )
}
