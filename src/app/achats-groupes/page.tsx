'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  Loader2,
  X
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

const shippingLabels: Record<string, string> = {
  maritime_60j: 'Maritime ~60 j • à partir de 170 000 F/m³',
  air_15j: 'Fret aérien ~15 j • à partir de 12 000 F/kg',
  express_3j: 'Express ~3 j • à partir de 8 000 F/kg'
}

export default function GroupOrdersPage() {
  const router = useRouter()
  const [productIdParam, setProductIdParam] = useState<string | null>(null)
  const [createParam, setCreateParam] = useState<'0' | '1'>('0')
  const [qtyParam, setQtyParam] = useState<string | null>(null)

  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ totalOpen: 0, totalFilled: 0, totalParticipants: 0 })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [productPreview, setProductPreview] = useState<{ id: string; name: string; image?: string | null } | null>(null)
  const [createForm, setCreateForm] = useState({
    qty: 1,
    deadline: (() => {
      const d = new Date()
      d.setDate(d.getDate() + 14)
      return d.toISOString().slice(0, 10)
    })(),
    shippingMethod: 'maritime_60j',
    description: '',
    name: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    // Lire les query params côté client (évite useSearchParams + suspense)
    try {
      const params = new URLSearchParams(window.location.search)
      const pid = params.get('productId')
      const create = params.get('create') === '1' ? '1' : '0'
      const qty = params.get('qty')

      setProductIdParam(pid)
      setCreateParam(create)
      setQtyParam(qty)

      if (qty) {
        const parsed = Math.max(1, parseInt(qty) || 1)
        setCreateForm((p) => ({ ...p, qty: parsed }))
      }
      if (create === '1') {
        setShowCreateModal(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [productIdParam])

  // Note: le modal auto est géré dans l'effet de lecture des params

  useEffect(() => {
    const loadProductPreview = async () => {
      if (!productIdParam) {
        setProductPreview(null)
        return
      }
      try {
        const res = await fetch(`/api/catalog/products/${productIdParam}`)
        const data = await res.json()
        if (data?.success && data?.product) {
          setProductPreview({ id: data.product.id, name: data.product.name, image: data.product.image })
        } else {
          setProductPreview({ id: productIdParam, name: 'Produit', image: null })
        }
      } catch {
        setProductPreview({ id: productIdParam, name: 'Produit', image: null })
      }
    }
    loadProductPreview()
  }, [productIdParam])

  const fetchGroups = async () => {
    try {
      const url = productIdParam
        ? `/api/group-orders?productId=${encodeURIComponent(productIdParam)}`
        : '/api/group-orders'
      const res = await fetch(url)
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
              <h1 className="text-4xl md:text-5xl font-bold">Achats groupés import Chine</h1>
            </div>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-6">
              Lancez-vous facilement dans le business sans bloquer un gros capital :
              nous regroupons les commandes et gérons l&apos;import depuis la Chine pour vous.
            </p>
            <p className="text-sm md:text-base text-white/80 max-w-3xl mx-auto mb-8">
              Vous rejoignez un groupe, vous réservez votre quantité et nous mutualisons la commande.
              Nous faisons l&apos;interface entre vous et le marché chinois : vous déposez l&apos;argent (ou une partie),
              nous achetons à la source, faisons venir la marchandise au Sénégal puis la livrons aux clients.
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

            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs md:text-sm text-white/85">
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                Accès à un vaste catalogue en import depuis la Chine
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                Idéal pour tester des produits sans gros stock
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                Paiements mobiles & garanties déjà intégrées
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-12 px-4 bg-white border-b">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-900">Comment ça marche ?</h2>
          <p className="text-sm text-gray-600 text-center max-w-3xl mx-auto mb-8">
            Notre rôle : faire le lien entre vos besoins et les usines/fournisseurs en Chine.
            Vous vous concentrez sur votre vente, nous gérons l&apos;achat groupé, l&apos;import et la logistique.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Search, title: '1. Choisissez une offre', desc: 'Sélectionnez un achat groupé qui correspond à ce que vous voulez vendre ou utiliser' },
              { icon: Users, title: '2. Réservez votre quantité', desc: 'Indiquez la quantité souhaitée et déposez l&apos;argent (ou une partie) pour bloquer votre place' },
              { icon: TrendingDown, title: '3. Achat à la source', desc: 'Nous regroupons toutes les participations et procédons à l&apos;achat en Chine au meilleur tarif' },
              { icon: Package, title: '4. Transport & livraison', desc: 'Transport express, aérien ou maritime jusqu&apos;au Sénégal, puis livraison aux clients' }
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
          {productIdParam && (
            <div className="mb-6 bg-white border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">Filtré pour un produit</div>
                  <div className="text-xs text-gray-600">{productPreview?.name || 'Produit'} • {productIdParam}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Créer un achat groupé
                </button>
                <Link
                  href="/achats-groupes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Effacer le filtre
                  <X className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

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

                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-400 mb-2">
                        <span>Import Chine • sourcing optimisé</span>
                        {group.shippingMethod && (
                          <span className="text-gray-500 normal-case">
                            {shippingLabels[group.shippingMethod] || 'Livraison groupée optimisée'}
                          </span>
                        )}
                      </div>
                      
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
                            Prix dégressifs pensés pour la revente
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

      {/* Modal création achat groupé */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowCreateModal(false)
              setCreateError(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Créer un achat groupé</h2>
                    <p className="text-white/85 text-sm">Lancez un groupe et invitez d'autres personnes à vous rejoindre.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreateError(null)
                    }}
                    className="p-2 hover:bg-white/15 rounded-xl transition"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form
                className="p-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setCreateError(null)
                  if (!productIdParam) {
                    setCreateError('Veuillez ouvrir la création depuis une fiche produit (productId manquant).')
                    return
                  }
                  if (!createForm.name || !createForm.phone || createForm.qty < 1) {
                    setCreateError('Nom, téléphone et quantité sont requis.')
                    return
                  }
                  setCreating(true)
                  try {
                    const res = await fetch('/api/group-orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        productId: productIdParam,
                        qty: createForm.qty,
                        deadline: createForm.deadline,
                        shippingMethod: createForm.shippingMethod,
                        description: createForm.description,
                        creator: {
                          name: createForm.name,
                          phone: createForm.phone,
                          email: createForm.email || undefined
                        }
                      })
                    })
                    const data = await res.json()
                    if (data?.success && data?.group?.groupId) {
                      setShowCreateModal(false)
                      router.push(`/achats-groupes/${data.group.groupId}`)
                      return
                    }
                    setCreateError(data?.error || "Impossible de créer l'achat groupé")
                  } catch {
                    setCreateError("Erreur réseau lors de la création")
                  } finally {
                    setCreating(false)
                  }
                }}
              >
                {/* Produit */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border">
                  {productPreview?.image ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border">
                      <Image src={productPreview.image} alt={productPreview.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white border flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 line-clamp-1">{productPreview?.name || 'Produit'}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">ID: {productIdParam || '—'}</div>
                  </div>
                </div>

                {createError && (
                  <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div>{createError}</div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Quantité initiale</label>
                    <input
                      type="number"
                      min={1}
                      value={createForm.qty}
                      onChange={(e) => setCreateForm((p) => ({ ...p, qty: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date limite</label>
                    <input
                      type="date"
                      value={createForm.deadline}
                      onChange={(e) => setCreateForm((p) => ({ ...p, deadline: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de transport</label>
                  <select
                    value={createForm.shippingMethod}
                    onChange={(e) => setCreateForm((p) => ({ ...p, shippingMethod: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {Object.entries(shippingLabels).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Votre nom</label>
                    <input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nom et prénom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone</label>
                    <input
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="+221 77 000 00 00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email (optionnel)</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="vous@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optionnel)</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                    placeholder="Ex: Couleur souhaitée, détails de livraison..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Créer le groupe
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
