'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  Store,
  BadgeCheck,
  Star,
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  Plus,
  Minus,
  Eye,
  Settings,
  Clock,
} from 'lucide-react'
import { formatFcfa } from '@/components/market/batch1/formatFcfa'

interface VendorStats {
  productsCount: number
  ordersCount: number
  pendingOrdersCount: number
  completedOrdersCount: number
  revenue: number
  lowStockCount: number
}

interface VendorInfo {
  name: string
  slug: string
  verified: boolean
  rating: number
  memberSince?: string
}

interface VendorProduct {
  id: string
  name: string
  image: string
  price?: number
  stockQuantity: number
  stockStatus: string
  sellerSlug?: string
  category?: string
}

interface VendorOrder {
  orderId: string
  status: string
  paymentStatus: string
  total: number
  currency: string
  clientName: string
  createdAt: string
  items: { productId: string; name: string; qty: number; price: number }[]
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900',
}

function statusLabel(s: string) {
  const map: Record<string, string> = { pending: 'En attente', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' }
  return map[s] || s
}

export default function VendorDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendor, setVendor] = useState<VendorInfo | null>(null)
  const [stats, setStats] = useState<VendorStats | null>(null)
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reviews'>('products')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, productsRes, ordersRes] = await Promise.all([
          fetch('/api/vendor/stats'),
          fetch('/api/vendor/products'),
          fetch('/api/vendor/orders'),
        ])

        if (!statsRes.ok) {
          const data = await statsRes.json()
          throw new Error(data.error || 'Accès refusé')
        }

        const statsData = await statsRes.json()
        const productsData = await productsRes.json()
        const ordersData = await ordersRes.json()

        if (statsData.success) {
          setVendor(statsData.vendor)
          setStats(statsData.stats)
        }
        if (productsData.success) setProducts(productsData.products)
        if (ordersData.success) setOrders(ordersData.orders)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const updateStock = async (productId: string, newQty: number) => {
    try {
      const res = await fetch(`/api/vendor/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newQty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, stockQuantity: newQty, stockStatus: newQty > 0 ? 'in_stock' : 'out_of_stock' }
            : p
        )
      )
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Erreur</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Link href="/login" className="text-emerald-600 font-medium">Se connecter</Link>
        </div>
      </div>
    )
  }

  const statCards = [
    { key: 'products', label: 'Produits', value: stats?.productsCount || 0, tone: 'slate', icon: Package },
    { key: 'orders', label: 'Commandes', value: stats?.ordersCount || 0, tone: 'emerald', icon: Truck },
    { key: 'pending', label: 'En attente', value: stats?.pendingOrdersCount || 0, tone: 'amber', icon: Clock },
    { key: 'revenue', label: 'Revenus', value: formatFcfa(stats?.revenue || 0), tone: 'violet', icon: DollarSign, isText: true },
    { key: 'lowStock', label: 'Stock faible', value: stats?.lowStockCount || 0, tone: 'red', icon: AlertTriangle },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 md:h-20 md:w-20 place-items-center rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-[22px] md:text-[28px] font-extrabold">
                {vendor?.name?.split(/\s+/).map((w) => w[0]?.toUpperCase()).slice(0, 2).join('') || 'B'}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Espace vendeur</p>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] md:text-[28px] font-extrabold">{vendor?.name || 'Boutique Alpha'}</h1>
                  {vendor?.verified && <BadgeCheck className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-white/70 mt-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{vendor?.rating?.toFixed(1) || '0.0'}</span>
                  <span>· Membre depuis {vendor?.memberSince || '2026'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/boutiques/${vendor?.slug || ''}`}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-[13px] font-semibold hover:bg-white/20 transition"
              >
                <Eye size={14} /> Voir ma boutique
              </Link>
              <button className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-slate-900 text-[13px] font-semibold hover:bg-slate-100 transition">
                <Settings size={14} /> Paramètres
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 md:px-6 -mt-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {statCards.map((s) => {
            const Icon = s.icon
            const bg =
              s.tone === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
              s.tone === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
              s.tone === 'violet' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' :
              s.tone === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            return (
              <div key={s.key} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3 md:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-[20px] md:text-[24px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap truncate">
                  {s.value}
                </p>
                <div className={`mt-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon size={18} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto">
            {[
              { k: 'products', l: 'Produits' },
              { k: 'orders', l: 'Commandes' },
              { k: 'reviews', l: 'Avis' },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k as any)}
                className={`flex-shrink-0 whitespace-nowrap px-5 py-3 text-[13px] font-bold border-b-2 transition ${
                  activeTab === t.k
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'products' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white">{products.length} produits</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 text-[10px] font-bold">
                    <Plus size={10} /> BIENTÔT
                  </span>
                </div>
                {products.length === 0 && <p className="text-slate-500 text-center py-8">Aucun produit associé à ce vendeur.</p>}
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <img src={product.image} alt={product.name} className="w-14 h-14 object-cover rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/produits/${product.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-emerald-600 truncate block text-[13px]">
                        {product.name}
                      </Link>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">
                        {product.price ? formatFcfa(product.price) : 'Sur devis'}
                      </p>
                      {product.stockQuantity < 5 && product.stockQuantity > 0 && (
                        <p className="text-[10px] font-bold text-red-600 mt-0.5">Stock bas</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateStock(product.id, Math.max(0, product.stockQuantity - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className={`w-12 text-center text-[13px] font-bold ${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {product.stockQuantity}
                      </span>
                      <button
                        onClick={() => updateStock(product.id, product.stockQuantity + 1)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-3">
                {orders.length === 0 && <p className="text-slate-500 text-center py-8">Aucune commande pour le moment.</p>}
                {orders.map((order) => (
                  <div key={order.orderId} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <Link href={`/commandes/${order.orderId}`} className="font-mono font-bold text-slate-900 dark:text-white hover:text-emerald-600 text-[13px]">
                        {order.orderId}
                      </Link>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">{order.clientName} · {new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p className="text-[14px] font-extrabold text-slate-900 dark:text-white mt-1">{formatFcfa(order.total)}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      {order.items.map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
                          {item.name} x{item.qty}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="text-center py-12">
                <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                  <Star size={24} className="text-slate-400" />
                </div>
                <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Aucun avis pour le moment</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">Les avis de vos clients apparaîtront ici.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
