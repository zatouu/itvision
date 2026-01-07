'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  Package,
  Clock,
  TrendingDown,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  Target,
  Zap,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface GroupOrder {
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
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  participants: Array<{ name: string; qty: number }>
  deadline: string
  shippingMethod?: string
  description?: string
}

const formatCurrency = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`
const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { 
  day: 'numeric', month: 'long', year: 'numeric' 
})

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Ouvert', color: 'bg-emerald-100 text-emerald-800', icon: Users },
  filled: { label: 'Objectif atteint', color: 'bg-blue-100 text-blue-800', icon: Target },
  ordering: { label: 'En commande', color: 'bg-purple-100 text-purple-800', icon: ShoppingCart },
  ordered: { label: 'Commandé', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  shipped: { label: 'Expédié', color: 'bg-orange-100 text-orange-800', icon: Package },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: AlertCircle }
}

export default function GroupOrdersPage() {
  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ totalOpen: 0, totalFilled: 0, totalParticipants: 0 })

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/group-orders')
      const data = await res.json()
      if (data.success) {
        setGroups(data.groups)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter(g => 
    g.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.groupId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getProgressPercent = (g: GroupOrder) => Math.min(100, Math.round((g.currentQty / g.targetQty) * 100))
  const getDaysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold">Achats Groupés</h1>
            </div>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Rejoignez d&apos;autres acheteurs pour obtenir les meilleurs prix sur vos produits préférés. 
              Plus on est nombreux, moins on paie !
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold">{stats.totalOpen}</p>
                <p className="text-sm text-white/80">Achats ouverts</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold">{stats.totalFilled}</p>
                <p className="text-sm text-white/80">Objectifs atteints</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold">{stats.totalParticipants}</p>
                <p className="text-sm text-white/80">Participants</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-12 px-4 bg-white border-b">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Search, title: '1. Trouvez', desc: 'Choisissez un achat groupé qui vous intéresse' },
              { icon: Users, title: '2. Rejoignez', desc: 'Indiquez la quantité souhaitée et inscrivez-vous' },
              { icon: TrendingDown, title: '3. Économisez', desc: 'Plus de participants = prix unitaire réduit' },
              { icon: Package, title: '4. Recevez', desc: 'Une fois l\'objectif atteint, on commande ensemble' }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white border"
              >
                <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white">
                  <step.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Liste des achats groupés */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Recherche */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600">Chargement des achats groupés...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-gray-50 rounded-2xl"
            >
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Aucun achat groupé disponible</h3>
              <p className="text-gray-500 mb-6">Revenez bientôt ou créez le premier !</p>
              <Link
                href="/produits"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
              >
                <ShoppingCart className="w-5 h-5" />
                Voir les produits
              </Link>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group, idx) => {
                const progress = getProgressPercent(group)
                const daysLeft = getDaysLeft(group.deadline)
                const status = statusConfig[group.status] || statusConfig.open
                const savings = group.product.basePrice - group.currentUnitPrice
                const savingsPercent = Math.round((savings / group.product.basePrice) * 100)
                
                return (
                  <motion.div
                    key={group.groupId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition group"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-gray-100">
                      {group.product.image ? (
                        <Image
                          src={group.product.image}
                          alt={group.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                        {status.label}
                      </span>
                      
                      {/* Économie badge */}
                      {savingsPercent > 0 && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
                          -{savingsPercent}%
                        </span>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                        {group.product.name}
                      </h3>
                      
                      {/* Prix */}
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(group.currentUnitPrice)}
                        </span>
                        {savings > 0 && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatCurrency(group.product.basePrice)}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">/unité</span>
                      </div>
                      
                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            <Users className="w-4 h-4 inline mr-1" />
                            {group.participants.length} participant{group.participants.length > 1 ? 's' : ''}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {group.currentQty} / {group.targetQty}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.05 }}
                            className={`h-full rounded-full ${
                              progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                      
                      {/* Deadline */}
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          {daysLeft > 0 ? `${daysLeft} jours restants` : 'Terminé'}
                        </span>
                        <span className="text-gray-500">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {formatDate(group.deadline)}
                        </span>
                      </div>
                      
                      {/* Paliers de prix */}
                      {group.priceTiers.length > 0 && (
                        <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
                          <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1">
                            <TrendingDown className="w-4 h-4" />
                            Prix dégressifs
                          </p>
                          <div className="space-y-1">
                            {group.priceTiers.slice(0, 3).map((tier, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                  {tier.minQty}+ unités
                                </span>
                                <span className="font-semibold text-emerald-700">
                                  {formatCurrency(tier.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* CTA */}
                      <Link
                        href={`/achats-groupes/${group.groupId}`}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition ${
                          group.status === 'open'
                            ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white hover:from-emerald-700 hover:to-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {group.status === 'open' ? (
                          <>
                            <Zap className="w-5 h-5" />
                            Rejoindre
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-5 h-5" />
                            Voir les détails
                          </>
                        )}
                      </Link>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
