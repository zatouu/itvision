'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { chatService } from '@/lib/chat'

// Import ChatBox dynamiquement pour éviter les erreurs SSR
const ChatBox = dynamicImport(() => import('@/components/ChatBox'), { ssr: false })

import {
  Users,
  Package,
  Clock,
  TrendingDown,
  ArrowRight,
  Search,
  Target,
  Zap,
  ShoppingCart,
  CheckCircle,
  Share2,
  MessageCircle,
  Heart,
  Award,
  Sparkles,
  TrendingUp,
  Gift,
  Bell
} from 'lucide-react'

// Désactiver le prerendering pour cette page
export const dynamic = 'force-dynamic'

// Interface utilisateur local
interface LocalUser {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

interface GroupOrder {
  _id: string
  groupId: string
  status: string
  product: {
    productId: string
    name: string
    image?: string
    basePrice: number
    currency: string
  }
  minQty: number
  targetQty: number
  currentQty: number
  currentUnitPrice: number
  priceTiers: Array<{ minQty: number; price: number }>
  participantsCount?: number
  deadline: string
  proposal?: {
    proposedBy?: string
    message?: string
  }
}

interface RecentActivity {
  type: 'joined' | 'proposed' | 'filled' | 'ordered'
  userName: string
  groupName: string
  time: string
  qty?: number
}

export default function GroupBuysCollaborativePage() {
  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalParticipants: 0,
    totalSavings: 0,
    successRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent' | 'new'>('all')
  const [showChat, setShowChat] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null)

  // Vérifier l'auth via l'API me
  useEffect(() => {
    setIsMounted(true)
    
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setCurrentUser({
              id: data.user.id,
              name: data.user.name || data.user.username,
              email: data.user.email,
              role: data.user.role || 'CLIENT'
            })
          }
        }
      } catch (err) {
        console.error('Auth check error:', err)
      }
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    fetchData()
    
    // Connecter le service chat si utilisateur connecté
    if (currentUser) {
      const token = localStorage.getItem('token')
      if (token) {
        chatService.connect(token).catch(err => console.error('Chat connexion:', err))
      }
    }
    
    // Simuler activité temps réel
    const interval = setInterval(() => {
      addRecentActivity()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [currentUser])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/group-orders/active')
      if (res.ok) {
        const responseData = await res.json()
        // L'API retourne { success: true, groups: [...] }
        const data = responseData.groups || responseData || []
        setGroups(data)
        
        // Calcul stats
        const totalPart = data.reduce((sum: number, g: any) => sum + (g.currentQty || 0), 0)
        const totalSav = data.reduce((sum: number, g: any) => {
          const basePrice = g.product?.basePrice || g.basePrice || 0
          const currentPrice = g.currentUnitPrice || g.currentPrice || basePrice
          const saving = basePrice - currentPrice
          return sum + (saving * (g.currentQty || 0))
        }, 0)
        
        setStats({
          totalGroups: data.length,
          totalParticipants: totalPart,
          totalSavings: totalSav,
          successRate: 87
        })
      }
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const addRecentActivity = () => {
    const activities: RecentActivity[] = [
      { type: 'joined', userName: 'Amadou D.', groupName: 'Caméra Hikvision 4MP', time: 'Il y a 2 min', qty: 5 },
      { type: 'proposed', userName: 'Fatima S.', groupName: 'Kit Domotique Zigbee', time: 'Il y a 8 min' },
      { type: 'filled', userName: '12 participants', groupName: 'Terminal Biométrique', time: 'Il y a 15 min' }
    ]
    setRecentActivity(prev => [activities[Math.floor(Math.random() * activities.length)], ...prev.slice(0, 9)])
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'FCFA' ? 'XOF' : currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calcProgress = (current: number, target: number) => Math.min((current / target) * 100, 100)
  const calcSavings = (base: number, current: number) => Math.round(((base - current) / base) * 100)
  
  const calcTimeLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    if (diff <= 0) return 'Expiré'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return days > 0 ? `${days}j ${hours}h` : `${hours}h`
  }

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const progress = calcProgress(g.currentQty, g.targetQty)
    
    if (filter === 'urgent') return matchesSearch && progress >= 70
    if (filter === 'new') return matchesSearch && progress < 30
    if (filter === 'open') return matchesSearch && g.status === 'open'
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50">
      <Header />
      
      {/* Hero collaboratif */}
      <section className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white py-16 px-4 pt-28 mt-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-12 h-12" />
                <h1 className="text-5xl font-extrabold">Achats Groupés</h1>
              </div>
              <p className="text-xl text-white/90 mb-6 leading-relaxed">
                Rejoignez la communauté ! Économisez ensemble sur vos produits préférés. 
                Plus on est nombreux, moins on paie. C&apos;est simple, social et efficace.
              </p>
              
              {/* CTA principaux */}
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/produits"
                  className="inline-flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
                >
                  <Gift className="w-5 h-5" />
                  Proposer un groupe
                </Link>
                <button className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30">
                  <Bell className="w-5 h-5" />
                  Recevoir les alertes
                </button>
              </div>
            </motion.div>

            {/* Stats en temps réel */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white/20 backdrop-blur rounded-2xl p-6 border border-white/30">
                <div className="text-5xl font-black mb-2">{stats.totalGroups}</div>
                <div className="text-sm text-white/80 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Groupes actifs
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur rounded-2xl p-6 border border-white/30">
                <div className="text-5xl font-black mb-2">{stats.totalParticipants}</div>
                <div className="text-sm text-white/80 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participants
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur rounded-2xl p-6 border border-white/30 col-span-2">
                <div className="text-5xl font-black mb-2">{formatPrice(stats.totalSavings, 'FCFA')}</div>
                <div className="text-sm text-white/80 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Économies totales de la communauté
                </div>
              </div>
              
              <div className="bg-emerald-500/30 backdrop-blur rounded-2xl p-6 border border-emerald-400/50 col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-black mb-1">{stats.successRate}%</div>
                    <div className="text-sm text-white/90">Taux de réussite</div>
                  </div>
                  <Award className="w-12 h-12 text-emerald-300" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Barre de recherche et filtres */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-lg border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit, marque, catégorie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>

            {/* Filtres rapides */}
            <div className="flex gap-2">
              {(['all', 'open', 'urgent', 'new'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === f
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' && 'Tous'}
                  {f === 'open' && '🟢 Ouverts'}
                  {f === 'urgent' && '🔥 Urgents'}
                  {f === 'new' && '✨ Nouveaux'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne principale - Groupes actifs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredGroups.length} {filter === 'all' ? 'groupes actifs' : 'résultats'}
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun groupe trouvé</h3>
                <p className="text-gray-600 mb-6">Soyez le premier à proposer un achat groupé !</p>
                <Link
                  href="/produits"
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Proposer un groupe
                </Link>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredGroups.map((group, index) => {
                  const progress = calcProgress(group.currentQty, group.targetQty)
                  const savings = calcSavings(group.product.basePrice, group.currentUnitPrice)
                  const timeLeft = calcTimeLeft(group.deadline)
                  const isUrgent = progress >= 70

                  return (
                    <motion.div
                      key={group._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/achats-groupes/${group.groupId}`}>
                        <div className="group bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-purple-300 hover:shadow-xl transition-all cursor-pointer">
                          <div className="flex gap-6">
                            {/* Image produit */}
                            <div className="relative w-32 h-32 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden">
                              {group.product.image ? (
                                <img 
                                  src={group.product.image} 
                                  alt={group.product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-12 h-12 text-gray-300" />
                                </div>
                              )}
                              
                              {savings > 0 && (
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                  -{savings}%
                                </div>
                              )}
                              
                              {isUrgent && (
                                <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                  🔥 Urgent
                                </div>
                              )}
                            </div>

                            {/* Infos */}
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                                {group.product.name}
                              </h3>
                              
                              {/* Prix */}
                              <div className="flex items-baseline gap-3 mb-4">
                                <div className="text-3xl font-black text-purple-600">
                                  {formatPrice(group.currentUnitPrice, group.product.currency)}
                                </div>
                                {savings > 0 && (
                                  <div>
                                    <div className="text-sm text-gray-500 line-through">
                                      {formatPrice(group.product.basePrice, group.product.currency)}
                                    </div>
                                    <div className="text-sm text-emerald-600 font-semibold">
                                      Économie: {formatPrice(group.product.basePrice - group.currentUnitPrice, group.product.currency)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Progression */}
                              <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-700 mb-2 font-medium">
                                  <span className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-purple-600" />
                                    {group.currentQty}/{group.targetQty} unités • {group.participantsCount || 0} participants
                                  </span>
                                  <span className="font-bold text-purple-700">{Math.round(progress)}%</span>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      isUrgent 
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                                        : 'bg-gradient-to-r from-purple-500 to-blue-500'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-orange-600" />
                                    <span className="font-medium text-orange-600">{timeLeft}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Target className="w-4 h-4 text-purple-600" />
                                    <span>Min: {group.minQty}</span>
                                  </div>
                                </div>

                                {/* Actions sociales */}
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault()
                                      // TODO: partage
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Share2 className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault()
                                      // TODO: favoris
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Heart className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm group-hover:bg-purple-700 transition-colors flex items-center gap-2">
                                    Rejoindre
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar - Activité récente & Chat */}
          <div className="space-y-6">
            {/* Activité en temps réel - Design compact avec slider */}
            <div className="bg-white rounded-2xl border shadow-lg sticky top-32 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 border-b">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <h3 className="font-bold text-gray-900 text-sm">Activité en direct</h3>
                <span className="ml-auto text-xs text-gray-500">{recentActivity.length} événements</span>
              </div>
              
              {/* Carousel horizontal d'activités - max 2 visibles */}
              <div className="relative h-[88px] overflow-hidden">
                <AnimatePresence mode="popLayout">
                  {recentActivity.slice(0, 2).map((activity, i) => (
                    <motion.div
                      key={`${activity.userName}-${activity.time}-${i}`}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="px-3 py-2"
                    >
                      <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-lg">
                        <div className={`p-1.5 rounded-full flex-shrink-0 ${
                          activity.type === 'joined' ? 'bg-emerald-100' :
                          activity.type === 'proposed' ? 'bg-purple-100' :
                          activity.type === 'filled' ? 'bg-blue-100' : 'bg-orange-100'
                        }`}>
                          {activity.type === 'joined' && <Users className="w-3 h-3 text-emerald-600" />}
                          {activity.type === 'proposed' && <Sparkles className="w-3 h-3 text-purple-600" />}
                          {activity.type === 'filled' && <CheckCircle className="w-3 h-3 text-blue-600" />}
                          {activity.type === 'ordered' && <ShoppingCart className="w-3 h-3 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{activity.userName}</p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {activity.type === 'joined' && `a rejoint "${activity.groupName}"`}
                            {activity.type === 'proposed' && `propose "${activity.groupName}"`}
                            {activity.type === 'filled' && `objectif atteint !`}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{activity.time.replace('Il y a ', '')}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* CTA Proposer - Plus compact */}
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold mb-1">Proposez votre groupe !</h3>
                  <p className="text-xs text-white/80 mb-3">
                    Lancez votre propre achat groupé
                  </p>
                </div>
              </div>
              <Link
                href="/produits"
                className="block w-full bg-white text-purple-600 text-center py-2.5 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all"
              >
                Créer un groupe
              </Link>
            </div>

            {/* Chat communautaire - Style WhatsApp/Telegram moderne */}
            {isMounted && currentUser && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between hover:from-emerald-600 hover:to-teal-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-bold text-white">Discussion</h3>
                      <p className="text-[10px] text-white/70">Communauté achats groupés</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: showChat ? 180 : 0 }}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                  >
                    <ArrowRight className={`w-4 h-4 text-white ${showChat ? 'rotate-90' : '-rotate-90'}`} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showChat && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChatBox
                        conversationId="group-buys-general"
                        conversationType="group-buy"
                        currentUser={{
                          userId: currentUser.id,
                          name: currentUser.name,
                          avatar: currentUser.avatar,
                          role: currentUser.role
                        }}
                        height="h-80"
                        placeholder="Message..."
                        allowReactions={true}
                        showParticipants={false}
                        metadata={{
                          context: 'group-buys-lobby',
                          totalGroups: stats.totalGroups,
                          totalParticipants: stats.totalParticipants
                        }}
                        onNewMessage={(msg) => {
                          console.log('Nouveau message:', msg)
                        }}
                        className="border-0 shadow-none rounded-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
