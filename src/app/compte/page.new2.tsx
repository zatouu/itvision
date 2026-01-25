import Link from 'next/link'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { verifyAuthServer } from '@/lib/auth-server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import ProductValidated from '@/lib/models/Product.validated'
import {
  ShoppingBag,
  Users,
  User as UserIcon,
  Heart,
  ShoppingCart,
  Package,
  Search,
  FileText,
  CreditCard,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  XCircle,
  ExternalLink,
  Eye,
  ChevronRight,
  Sparkles,
  BadgeCheck,
  Store,
  MapPin,
  Mail,
  Phone,
  Settings,
  LogOut,
  Bell
} from 'lucide-react'

function formatCurrency(v: number, currency = 'FCFA') {
  return `${Math.round(v).toLocaleString('fr-FR')} ${currency}`
}

function formatDate(value: any) {
  try {
    const d = value instanceof Date ? value : new Date(value)
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return ''
  }
}

export default async function ComptePage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user) {
    redirect('/login?redirect=/compte')
  }

  await connectDB()
  const userObjectId = new mongoose.Types.ObjectId(auth.user.id)

  const recentOrders = (await Order.find({ clientId: userObjectId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()) as any[]

  const recentGroups = (await GroupOrder.find({
    $or: [{ 'participants.userId': userObjectId }, { 'createdBy.userId': userObjectId }]
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean()) as any[]

  // Favoris (aperçu des 4 derniers)
  const userDoc = await User.findById(userObjectId).select('favoriteProductIds').lean()
  const clientDoc = userDoc ? null : await Client.findById(userObjectId).select('favoriteProductIds').lean()
  const favoriteProductIds: string[] = Array.isArray((userDoc as any)?.favoriteProductIds)
    ? (userDoc as any).favoriteProductIds
    : Array.isArray((clientDoc as any)?.favoriteProductIds)
      ? (clientDoc as any).favoriteProductIds
      : []

  const favoritePreviewIds = favoriteProductIds.slice(-4).reverse().filter(Boolean)
  const favoritePreviewObjectIds = favoritePreviewIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const favoritePreviewDocs = favoritePreviewObjectIds.length
    ? ((await ProductValidated.find({ _id: { $in: favoritePreviewObjectIds } })
        .select('name image gallery price currency requiresQuote')
        .lean()) as any[])
    : ([] as any[])

  const favoritePreviewById = new Map<string, any>(favoritePreviewDocs.map((p) => [String(p._id), p]))
  const favoritePreviewProducts = favoritePreviewIds.map((id) => favoritePreviewById.get(String(id))).filter(Boolean)

  // Stats rapides
  const totalOrders = recentOrders.length
  const totalGroups = recentGroups.length
  const totalFavorites = favoriteProductIds.length

  // Identifier les commandes en cours (statut pending/processing)
  const pendingOrders = recentOrders.filter(o => ['pending', 'processing'].includes(String(o.status || '').toLowerCase()))

  // Nom d'affichage
  const displayName = auth.user.name || auth.user.email?.split('@')[0] || 'Utilisateur'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen page-content bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* 🎯 EN-TÊTE UTILISATEUR */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-8 shadow-2xl dark:border-emerald-900/30">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold text-white shadow-lg backdrop-blur-sm">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white lg:text-3xl">{displayName}</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Client actif
                  </span>
                </div>
                
                {auth.user.email && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-white/90">
                    <Mail className="h-4 w-4" />
                    {auth.user.email}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-6 text-sm text-white/90">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">{totalOrders}</span> commande{totalOrders > 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{totalGroups}</span> achat{totalGroups > 1 ? 's' : ''} groupé{totalGroups > 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="font-semibold">{totalFavorites}</span> favori{totalFavorites > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions rapides header */}
            <div className="flex gap-2">
              <Link
                href="/compte/profil"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Paramètres</span>
              </Link>
              <Link
                href="/api/auth/logout"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 🚀 ACTIONS RAPIDES (PRIORITAIRES) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Mes commandes (priorité haute) */}
          <Link
            href="/compte/commandes"
            className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-lg transition hover:shadow-xl dark:border-emerald-900/30 dark:bg-slate-900"
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-100 opacity-50 dark:bg-emerald-900/20" />
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <Package className="h-6 w-6" />
                </div>
                {pendingOrders.length > 0 && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    {pendingOrders.length} en cours
                  </span>
                )}
              </div>
              
              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Mes commandes</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {totalOrders === 0 ? 'Aucune commande pour le moment' : `${totalOrders} commande${totalOrders > 1 ? 's' : ''} enregistrée${totalOrders > 1 ? 's' : ''}`}
              </p>
              
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 group-hover:gap-3 dark:text-emerald-400 transition-all">
                Voir mes commandes
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          {/* Panier (priorité haute) */}
          <Link
            href="/panier"
            className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-lg transition hover:shadow-xl dark:border-blue-900/30 dark:bg-slate-900"
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-100 opacity-50 dark:bg-blue-900/20" />
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
              
              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Mon panier</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Finalisez votre commande
              </p>
              
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 group-hover:gap-3 dark:text-blue-400 transition-all">
                Accéder au panier
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          {/* Achats groupés (priorité haute) */}
          <Link
            href="/compte/achats-groupes"
            className="group relative overflow-hidden rounded-2xl border border-purple-100 bg-white p-6 shadow-lg transition hover:shadow-xl dark:border-purple-900/30 dark:bg-slate-900"
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-purple-100 opacity-50 dark:bg-purple-900/20" />
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                  <Users className="h-6 w-6" />
                </div>
                {totalGroups > 0 && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    {totalGroups} actif{totalGroups > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Achats groupés</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {totalGroups === 0 ? 'Rejoindre ou créer un groupe' : `${totalGroups} groupe${totalGroups > 1 ? 's' : ''}`}
              </p>
              
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 group-hover:gap-3 dark:text-purple-400 transition-all">
                Voir mes groupes
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* 💎 ACTIONS SECONDAIRES */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Favoris */}
          <Link
            href="/produits/favoris"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                <Heart className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">Favoris</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{totalFavorites} produit{totalFavorites > 1 ? 's' : ''}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Catalogue */}
          <Link
            href="/produits"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">Catalogue</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Explorer les produits</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Suivi */}
          <Link
            href="/retrouver-ma-commande"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Search className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">Suivi</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Retrouver commande</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Réclamations */}
          <Link
            href="/compte/reclamer-commande"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">Réclamation</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Associer commande</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* 📊 ACTIVITÉ RÉCENTE */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Dernières commandes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dernières commandes</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Historique d'achats récent</p>
              </div>
              <Link
                href="/compte/commandes"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Tout voir
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
                  <Package className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                </div>
                <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">Aucune commande</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Commencez par explorer le catalogue</p>
                <Link
                  href="/produits"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Store className="h-4 w-4" />
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {recentOrders.map((o) => {
                  const status = String(o.status || '').toLowerCase()
                  const statusConfig = {
                    pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Clock },
                    processing: { label: 'En cours', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Package },
                    completed: { label: 'Terminée', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle },
                    cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle }
                  }
                  const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-700', icon: Package }
                  const StatusIcon = config.icon

                  return (
                    <div
                      key={o._id}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex flex-1 items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
                          <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 dark:text-white">#{o.orderId}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${config.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{formatDate(o.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(Number(o.total || 0), String(o.currency || 'FCFA'))}</p>
                        </div>
                        <Link
                          href={`/commandes/${encodeURIComponent(o.orderId)}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 opacity-0 transition group-hover:opacity-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                          title="Voir la commande"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Derniers achats groupés */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Achats groupés</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Groupes rejoints ou créés</p>
              </div>
              <Link
                href="/compte/achats-groupes"
                className="text-sm font-semibold text-purple-700 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Tout voir
              </Link>
            </div>

            {recentGroups.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
                  <Users className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                </div>
                <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">Aucun achat groupé</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Rejoignez un groupe pour bénéficier de prix réduits</p>
                <Link
                  href="/achats-groupes"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  <Users className="h-4 w-4" />
                  Explorer les groupes
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {recentGroups.map((g) => {
                  const progress = Math.round(((Number(g.currentQty || 0) / Number(g.targetQty || 1)) * 100))
                  const isComplete = progress >= 100

                  return (
                    <div
                      key={g._id}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex flex-1 items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
                          <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 line-clamp-1 dark:text-white">{g.product?.name || g.groupId}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            Deadline {formatDate(g.deadline)}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                              <div
                                className={`h-full ${isComplete ? 'bg-emerald-600' : 'bg-purple-600'}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {Number(g.currentQty || 0)}/{Number(g.targetQty || 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {Math.round(Number(g.currentUnitPrice || 0)).toLocaleString('fr-FR')} {String(g.product?.currency || 'FCFA')}
                          </p>
                        </div>
                        <Link
                          href={`/achats-groupes/${encodeURIComponent(g.groupId)}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 opacity-0 transition group-hover:opacity-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
                          title="Voir le groupe"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 🎁 BONUS: RECOMMANDATIONS (UI uniquement, pas de backend) */}
        {favoritePreviewProducts.length > 0 && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vos favoris</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Produits que vous avez enregistrés</p>
                </div>
              </div>
              <Link
                href="/produits/favoris"
                className="text-sm font-semibold text-pink-700 hover:text-pink-800 dark:text-pink-400 dark:hover:text-pink-300"
              >
                Tout voir
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {favoritePreviewProducts.map((p) => {
                const productId = String(p._id)
                const imageSrc = p.image || (Array.isArray(p.gallery) && p.gallery[0]) || '/file.svg'
                const priceLabel = p.requiresQuote
                  ? 'Sur devis'
                  : typeof p.price === 'number'
                    ? formatCurrency(Number(p.price), String(p.currency || 'FCFA'))
                    : 'Sur devis'

                return (
                  <Link
                    key={productId}
                    href={`/produits/${productId}`}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900/40"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-50 dark:bg-slate-800">
                      <Image src={imageSrc} alt={String(p.name || 'Produit')} fill className="object-contain p-2 transition group-hover:scale-105" sizes="200px" />
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 dark:text-white">{String(p.name || '')}</p>
                      <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">{priceLabel}</p>
                    </div>
                    <div className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 opacity-0 shadow-lg backdrop-blur-sm transition group-hover:opacity-100 dark:bg-slate-900/90">
                      <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* 💡 BONUS: CTA INCITATIF (si aucune activité) */}
        {recentOrders.length === 0 && recentGroups.length === 0 && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 shadow-lg dark:border-emerald-900/30 dark:from-emerald-950/30 dark:to-teal-950/30">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Commencez votre première commande</h3>
              <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Explorez notre catalogue de produits et profitez des prix négociés ou rejoignez un achat groupé pour économiser encore plus.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Link
                  href="/produits"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-emerald-700"
                >
                  <Store className="h-5 w-5" />
                  Explorer le catalogue
                </Link>
                <Link
                  href="/achats-groupes"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                >
                  <Users className="h-5 w-5" />
                  Voir les achats groupés
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
