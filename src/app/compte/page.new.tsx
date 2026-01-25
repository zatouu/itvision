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
import WishlistCountBadge from '@/components/WishlistCountBadge'
import {
  ShoppingBag,
  Users,
  User as UserIcon,
  Heart,
  ShoppingCart,
  Package,
  Search,
  Bell,
  Shield,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  LogOut
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

  const quickActions = [
    { icon: ShoppingBag, label: 'Mes commandes', href: '/compte/commandes', description: `${totalOrders} commande${totalOrders > 1 ? 's' : ''}`, color: 'emerald' },
    { icon: Users, label: 'Achats groupés', href: '/compte/achats-groupes', description: `${totalGroups} groupe${totalGroups > 1 ? 's' : ''}`, color: 'purple' },
    { icon: Heart, label: 'Mes favoris', href: '/produits/favoris', description: `${totalFavorites} produit${totalFavorites > 1 ? 's' : ''}`, color: 'pink' },
    { icon: ShoppingCart, label: 'Mon panier', href: '/panier', description: 'Finaliser mes achats', color: 'blue' },
  ]

  const settingsActions = [
    { icon: UserIcon, label: 'Mon profil', href: '/compte/profil', description: 'Coordonnées & mot de passe' },
    { icon: Bell, label: 'Notifications', href: '/compte/notifications', description: 'Gérer les alertes' },
    { icon: Shield, label: 'Sécurité', href: '/compte/securite', description: '2FA & sessions actives' },
    { icon: Settings, label: 'Préférences', href: '/compte/preferences', description: 'Langue, devise, thème' },
  ]

  return (
    <div className="min-h-screen page-content bg-gradient-to-br from-slate-50 via-emerald-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header avec gradient moderne */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-purple-600 p-8 shadow-2xl sm:p-10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-white/90 animate-pulse" />
                  <span className="text-sm font-semibold text-white/90">Espace Client</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  Bienvenue, {auth.user.name || auth.user.email?.split('@')[0] || 'Client'}
                </h1>
                <p className="text-white/90 text-base sm:text-lg">
                  Gérez vos achats, commandes et préférences en toute simplicité
                </p>
              </div>
              <Link
                href="/produits"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-lg transition hover:shadow-xl hover:scale-105"
              >
                <TrendingUp className="h-4 w-4" />
                Découvrir
              </Link>
            </div>

            {/* Stats Cards Inline */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-4">
                <div className="text-2xl sm:text-3xl font-bold text-white">{totalOrders}</div>
                <div className="text-sm text-white/80">Commandes</div>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-4">
                <div className="text-2xl sm:text-3xl font-bold text-white">{totalGroups}</div>
                <div className="text-sm text-white/80">Groupes</div>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-4">
                <div className="text-2xl sm:text-3xl font-bold text-white">{totalFavorites}</div>
                <div className="text-sm text-white/80">Favoris</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Actions rapides
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              const colorClasses = {
                emerald: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
                purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
                pink: 'from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
                blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
              }[action.color]

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses} p-6 shadow-lg transition hover:shadow-xl hover:scale-105`}
                >
                  <div className="relative z-10">
                    <Icon className="h-8 w-8 text-white mb-3" />
                    <div className="text-lg font-bold text-white">{action.label}</div>
                    <div className="mt-1 text-sm text-white/90">{action.description}</div>
                    <ArrowRight className="mt-3 h-5 w-5 text-white/80 transition group-hover:translate-x-1" />
                  </div>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition"></div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Autres actions */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/compte/reclamer-commande"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
          >
            <Package className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mb-3" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">Réclamer commande</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Associer une commande invité</div>
          </Link>

          <Link
            href="/retrouver-ma-commande"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
          >
            <Search className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mb-3" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">Suivi commande</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Retrouver un lien de suivi</div>
          </Link>

          <Link
            href="/produits"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
          >
            <TrendingUp className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mb-3" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">Catalogue</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Continuer vos achats</div>
          </Link>

          <Link
            href="/panier"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
          >
            <ShoppingCart className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mb-3" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">Panier</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Finaliser mes achats</div>
          </Link>
        </div>

        {/* Paramètres & Sécurité */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Paramètres & Sécurité
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {settingsActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-purple-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-700"
                >
                  <Icon className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-3" />
                  <div className="text-base font-semibold text-gray-900 dark:text-white">{action.label}</div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{action.description}</div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Activité récente */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Dernières commandes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dernières commandes</h3>
              </div>
              <Link href="/compte/commandes" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                Tout voir
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-300">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                Aucune commande pour l'instant
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map(o => (
                  <Link
                    key={o._id}
                    href={`/commandes/${encodeURIComponent(o.orderId)}`}
                    className="group block rounded-xl border border-gray-200 p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-emerald-700"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-900 dark:text-white">{o.orderId}</div>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{formatDate(o.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(Number(o.total || 0), String(o.currency || 'FCFA'))}</div>
                        <ArrowRight className="ml-auto mt-1 h-4 w-4 text-emerald-600 dark:text-emerald-400 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Derniers achats groupés */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Achats groupés</h3>
              </div>
              <Link href="/compte/achats-groupes" className="text-sm font-semibold text-purple-700 hover:underline dark:text-purple-300">
                Tout voir
              </Link>
            </div>

            {recentGroups.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-300">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                Aucun achat groupé
              </div>
            ) : (
              <div className="space-y-3">
                {recentGroups.map(g => (
                  <Link
                    key={g._id}
                    href={`/achats-groupes/${encodeURIComponent(g.groupId)}`}
                    className="group block rounded-xl border border-gray-200 p-4 transition hover:border-purple-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-purple-700"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white line-clamp-1">{g.product?.name || g.groupId}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          Deadline {formatDate(g.deadline)} • {Number(g.currentQty || 0)}/{Number(g.targetQty || 0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {Math.round(Number(g.currentUnitPrice || 0)).toLocaleString('fr-FR')} {String(g.product?.currency || 'FCFA')}
                        </div>
                        <ArrowRight className="ml-auto mt-1 h-4 w-4 text-purple-600 dark:text-purple-400 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Favoris preview */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mes favoris</h3>
            </div>
            <Link href="/produits/favoris" className="text-sm font-semibold text-pink-700 hover:underline dark:text-pink-300">
              Tout voir ({totalFavorites})
            </Link>
          </div>

          {favoritePreviewProducts.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-300">
              <Heart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              Vous n'avez pas encore de favoris
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                    className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-pink-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-pink-700"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 border border-gray-200 dark:border-slate-800">
                      <Image src={imageSrc} alt={String(p.name || 'Produit')} fill className="object-contain p-2" sizes="160px" />
                    </div>
                    <div className="mt-2">
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2 dark:text-white">{String(p.name || '')}</div>
                      <div className="mt-1 text-xs font-semibold text-pink-700 dark:text-pink-300">{priceLabel}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer logout */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/api/auth/logout"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Link>
        </div>
      </div>
    </div>
  )
}
