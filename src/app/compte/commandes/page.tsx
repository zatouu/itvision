import Link from 'next/link'
import { redirect } from 'next/navigation'
import mongoose from 'mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import {
  Package, Truck, CheckCircle, Clock, AlertCircle, XCircle,
  Search, ArrowRight, ShoppingBag
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

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'En attente'
    case 'confirmed': return 'Confirmée'
    case 'processing': return 'Traitement'
    case 'shipped': return 'Expédiée'
    case 'delivered': return 'Livrée'
    case 'cancelled': return 'Annulée'
    default: return status
  }
}

function statusConfig(status: string) {
  switch (status) {
    case 'pending': return { color: 'amber', icon: Clock, bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'En attente' }
    case 'confirmed': return { color: 'blue', icon: CheckCircle, bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmée' }
    case 'processing': return { color: 'violet', icon: Package, bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Traitement' }
    case 'shipped': return { color: 'orange', icon: Truck, bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Expédiée' }
    case 'delivered': return { color: 'emerald', icon: CheckCircle, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Livrée' }
    case 'cancelled': return { color: 'red', icon: XCircle, bg: 'bg-red-50 text-red-700 border-red-200', label: 'Annulée' }
    default: return { color: 'slate', icon: AlertCircle, bg: 'bg-slate-50 text-slate-700 border-slate-200', label: status }
  }
}

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'En attente' },
  { id: 'processing', label: 'En cours' },
  { id: 'shipped', label: 'Expédiées' },
  { id: 'delivered', label: 'Livrées' },
  { id: 'cancelled', label: 'Annulées' },
]

export default async function CompteCommandesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status: statusFilter, q: searchQuery } = await searchParams
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user?.id) {
    redirect('/login?redirect=/compte/commandes')
  }

  await connectDB()

  const clientId = new mongoose.Types.ObjectId(auth.user.id)

  const query: any = { clientId }
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'processing') {
      query.status = { $in: ['confirmed', 'processing'] }
    } else {
      query.status = statusFilter
    }
  }

  const allOrders = (await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()) as any[]

  let orders = allOrders
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    orders = orders.filter(o =>
      (o.orderId || '').toLowerCase().includes(q) ||
      (o.items || []).some((i: any) => (i.name || '').toLowerCase().includes(q))
    )
  }

  const statusCounts = FILTERS.reduce((acc, f) => {
    if (f.id === 'all') {
      acc[f.id] = allOrders.length
    } else if (f.id === 'processing') {
      acc[f.id] = allOrders.filter(o => ['confirmed', 'processing'].includes(String(o.status || ''))).length
    } else {
      acc[f.id] = allOrders.filter(o => String(o.status || '') === f.id).length
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen page-content bg-gradient-to-br from-green-50 via-white to-violet-50 dark:from-black dark:via-black dark:to-black pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Mon compte</div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Mes commandes</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              {orders.length > 0
                ? `Vous avez ${orders.length} commande${orders.length > 1 ? 's' : ''} sur votre compte.`
                : 'Vos commandes “invitées” apparaîtront ici après connexion depuis votre lien de suivi.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/compte/reclamer-commande"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
            >
              Réclamer
            </Link>
            <Link
              href="/compte"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
            >
              Retour
            </Link>
          </div>
        </div>

        {/* Filtres */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => {
              const active = (statusFilter || 'all') === f.id
              const count = statusCounts[f.id] || 0
              return (
                <Link
                  key={f.id}
                  href={`/compte/commandes?status=${f.id}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition border ${
                    active
                      ? 'bg-gradient-to-r from-green-500 to-violet-500 text-white border-transparent'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'}`}>
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <form className="relative w-full sm:w-auto" action="/compte/commandes" method="GET">
            <input type="hidden" name="status" value={statusFilter || 'all'} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery || ''}
                placeholder="Rechercher une commande..."
                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200"
              />
            </div>
          </form>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950/70">
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Aucune commande</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {statusFilter && statusFilter !== 'all'
                  ? `Aucune commande avec le statut "${statusLabel(statusFilter)}".`
                  : searchQuery
                  ? 'Aucune commande ne correspond à votre recherche.'
                  : 'Vos commandes “invitées” apparaîtront ici après connexion depuis votre lien de suivi.'}
              </div>
              <div className="mt-6 flex justify-center gap-3 flex-wrap">
                <Link
                  href="/compte/reclamer-commande"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                >
                  Réclamer une commande
                </Link>
                <Link
                  href="/produits"
                  className="rounded-xl bg-gradient-to-r from-green-500 to-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:from-green-600 hover:to-violet-600"
                >
                  Voir le catalogue
                </Link>
                <Link
                  href="/retrouver-ma-commande"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                >
                  Retrouver un lien
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(o => {
                const cfg = statusConfig(String(o.status || ''))
                const Icon = cfg.icon
                const itemCount = o.items?.length || 0
                const mainImage = o.items?.[0]?.image || o.items?.[0]?.productImage
                return (
                  <div
                    key={o._id}
                    className="group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-green-200 hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Image miniature */}
                    <div className="w-full sm:w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                      {mainImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mainImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/commandes/${encodeURIComponent(o.orderId)}`}
                              className="font-bold text-gray-900 hover:text-green-600 transition dark:text-white"
                            >
                              {o.orderId}
                            </Link>
                            <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border ${cfg.bg}`}>
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(o.createdAt)} • {itemCount} article{itemCount > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(Number(o.total || 0), String(o.currency || 'FCFA'))}
                          </p>
                          {o.paymentStatus === 'completed' && (
                            <p className="text-xs text-emerald-600 font-medium">Payé</p>
                          )}
                        </div>
                      </div>

                      {itemCount > 0 && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-1 dark:text-gray-300">
                          {o.items.map((i: any) => i.name).filter(Boolean).join(', ')}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/commandes/${encodeURIComponent(o.orderId)}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800 transition dark:text-green-400"
                        >
                          Voir les détails <ArrowRight className="w-4 h-4" />
                        </Link>
                        {o.status === 'shipped' && (
                          <span className="text-xs text-orange-600 font-medium">En cours de livraison</span>
                        )}
                        {o.status === 'delivered' && !o.reviewed && (
                          <Link
                            href={`/commandes/${encodeURIComponent(o.orderId)}/avis`}
                            className="text-xs text-violet-600 font-medium hover:underline"
                          >
                            Laisser un avis
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
