'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, Store, BadgeCheck, Star, Package, Truck, DollarSign, AlertTriangle, Plus, Minus } from 'lucide-react'

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
}

interface VendorProduct {
  id: string
  name: string
  image: string
  price?: number
  stockQuantity: number
  stockStatus: string
  sellerSlug?: string
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

export default function VendorDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendor, setVendor] = useState<VendorInfo | null>(null)
  const [stats, setStats] = useState<VendorStats | null>(null)
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products')

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
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stockQuantity: newQty, stockStatus: newQty > 0 ? 'in_stock' : 'out_of_stock' } : p))
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/login" className="text-emerald-600 font-medium">Se connecter</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{vendor?.name}</h1>
                {vendor?.verified && <BadgeCheck className="w-6 h-6 text-emerald-200" />}
              </div>
              <p className="text-emerald-100 text-sm">Espace vendeur</p>
              {vendor?.rating ? (
                <p className="text-sm text-emerald-100 flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {vendor.rating.toFixed(1)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Produits</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.productsCount || 0}</p>
            <Package className="w-5 h-5 text-emerald-600 mt-2" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Commandes</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.ordersCount || 0}</p>
            <Truck className="w-5 h-5 text-blue-600 mt-2" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-gray-500 uppercase">En attente</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.pendingOrdersCount || 0}</p>
            <AlertCircle className="w-5 h-5 text-orange-500 mt-2" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Revenus</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.revenue?.toLocaleString('fr-FR') || 0} FCFA</p>
            <DollarSign className="w-5 h-5 text-green-600 mt-2" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 col-span-2 md:col-span-1">
            <p className="text-xs text-gray-500 uppercase">Stock faible</p>
            <p className="text-2xl font-bold text-red-600">{stats?.lowStockCount || 0}</p>
            <AlertTriangle className="w-5 h-5 text-red-500 mt-2" />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 flex">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'products' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-gray-600 hover:bg-slate-50'}`}
            >
              Produits
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'orders' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-gray-600 hover:bg-slate-50'}`}
            >
              Commandes
            </button>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'products' && (
              <div className="space-y-4">
                {products.length === 0 && <p className="text-gray-500 text-center py-8">Aucun produit associé à ce vendeur.</p>}
                {products.map(product => (
                  <div key={product.id} className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg">
                    <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-lg bg-slate-100" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/produits/${product.id}`} className="font-medium text-gray-900 hover:text-emerald-600 truncate block">
                        {product.name}
                      </Link>
                      <p className="text-sm text-gray-500">{product.price ? `${product.price.toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStock(product.id, Math.max(0, product.stockQuantity - 1))}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className={`w-16 text-center font-medium ${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity < 5 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {product.stockQuantity}
                      </span>
                      <button
                        onClick={() => updateStock(product.id, product.stockQuantity + 1)}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-50"
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
                {orders.length === 0 && <p className="text-gray-500 text-center py-8">Aucune commande pour le moment.</p>}
                {orders.map(order => (
                  <div key={order.orderId} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <Link href={`/commandes/${order.orderId}`} className="font-mono font-semibold text-gray-900 hover:text-emerald-600">
                        {order.orderId}
                      </Link>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{order.clientName} — {new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{order.total.toLocaleString('fr-FR')} {order.currency}</p>
                    <ul className="mt-2 text-xs text-gray-500 space-y-1">
                      {order.items.map(item => (
                        <li key={item.productId} className="flex justify-between">
                          <span className="truncate">{item.name}</span>
                          <span>x{item.qty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
