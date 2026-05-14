import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import ProductValidated from '@/lib/models/Product.validated'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import {
  Users,
  Heart,
  ShoppingCart,
  Package,
  Search,
  FileText,
  ArrowRight,
  ChevronRight,
  BadgeCheck,
  Store,
  Mail,
  Settings,
  LogOut,
  Zap,
  TrendingDown
} from 'lucide-react'

export default async function ComptePage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user) {
    redirect('/login?redirect=/compte')
  }

  // Client entreprise : rediriger vers le portail entreprise
  if (auth.user.role === 'CLIENT' && auth.user.companyClientId) {
    redirect('/portail-entreprise')
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

  // Favoris
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

  // Achats groupés ouverts (promo)
  const openGroups = (await GroupOrder.find({ status: 'open', deadline: { $gte: new Date() } })
    .sort({ currentQty: -1 })
    .limit(3)
    .select('groupId product.name product.image product.basePrice currentUnitPrice currentQty targetQty deadline participants')
    .lean()) as any[]

  // Stats
  const totalOrders = recentOrders.length
  const totalGroups = recentGroups.length
  const totalFavorites = favoriteProductIds.length
  const pendingOrders = recentOrders.filter(o => ['pending', 'processing'].includes(String(o.status || '').toLowerCase()))

  const formatCurrency = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} FCFA`

  // Nom
  const displayName = auth.user.name || auth.user.email?.split('@')[0] || 'Utilisateur'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <MarketHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header utilisateur premium */}
        <div className="relative overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-br from-green-600 via-green-700 to-violet-700 p-8 shadow-2xl dark:border-green-900/30">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-5">
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

        {/* Actions prioritaires (3 cartes principales) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/compte/commandes"
            className="group relative overflow-hidden rounded-2xl border border-green-100 bg-white p-6 shadow-lg transition hover:shadow-xl dark:border-green-900/30 dark:bg-slate-900"
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-green-100 opacity-50 dark:bg-green-900/20" />
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
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
              
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-700 group-hover:gap-3 dark:text-green-400 transition-all">
                Voir mes commandes
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link
            href="/panier"
            className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-6 shadow-lg transition hover:shadow-xl dark:border-violet-900/30 dark:bg-slate-900"
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-violet-100 opacity-50 dark:bg-violet-900/20" />
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
              
              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Mon panier</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Finalisez votre commande
              </p>
              
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 group-hover:gap-3 dark:text-violet-400 transition-all">
                Accéder au panier
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

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

        {/* Actions secondaires compactes (4 cartes) */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Banner achats groupés — incitation proactive */}
        {openGroups.length > 0 && (
          <div className="mt-8">
            <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-green-50 p-6 shadow-lg dark:border-violet-900/30 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-violet-500 text-white">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Achats groupés en cours</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Rejoignez un groupe et payez moins cher — import direct Chine</p>
                  </div>
                </div>
                <Link
                  href="/achats-groupes"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:from-green-600 hover:to-violet-600"
                >
                  <Zap className="h-4 w-4" />
                  Voir tous les groupes
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openGroups.map((g: any) => {
                  const progress = g.targetQty > 0 ? Math.min(100, Math.round((g.currentQty / g.targetQty) * 100)) : 0
                  const savings = g.product?.basePrice && g.currentUnitPrice ? Math.round(((g.product.basePrice - g.currentUnitPrice) / g.product.basePrice) * 100) : 0
                  return (
                    <Link
                      key={g.groupId}
                      href={`/achats-groupes/${g.groupId}`}
                      className="group flex gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {g.product?.image ? (
                          <Image src={g.product.image} alt={g.product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                        {savings > 0 && (
                          <span className="absolute bottom-0 right-0 rounded-tl-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            -{savings}%
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{g.product?.name}</p>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(g.currentUnitPrice)}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-green-400 to-violet-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-500">{progress}%</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Favoris preview */}
        {favoritePreviewProducts.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Vos favoris
              </h3>
              <Link href="/produits/favoris" className="text-sm font-semibold text-green-700 hover:underline dark:text-green-400">
                Voir tout →
              </Link>
            </div>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {favoritePreviewProducts.map((p: any) => (
                <Link
                  key={String(p._id)}
                  href={`/produits/${p._id}`}
                  className="group rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative h-28 bg-gray-100">
                    {(p.image || p.gallery?.[0]) ? (
                      <Image src={p.image || p.gallery[0]} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{p.name}</p>
                    {p.price ? (
                      <p className="text-sm font-bold text-green-600 mt-0.5">{formatCurrency(p.price)}</p>
                    ) : p.requiresQuote ? (
                      <p className="text-xs font-semibold text-violet-600 mt-0.5">Sur devis</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">IT Vision+ — Marketplace import Chine &amp; produits tech</p>
        </div>
      </div>
      <MarketFooter />
    </div>
  )
}
