'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  Download,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Badge,
  MoreVertical
} from 'lucide-react'

const formatCurrency = (v?: number) => (typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-')
const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Order {
  orderId: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  items: any[]
  subtotal: number
  shipping: { method: string; totalCost: number; totalWeight: number; totalVolume: number }
  total: number
  status: string
  paymentStatus: string
  address?: any
  createdAt: string
  currency: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Charger les commandes
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/orders')
        if (!res.ok) throw new Error('Erreur lors du chargement')
        const data = await res.json()
        setOrders(data.orders || [])
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  // Filtres et tri
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        o => o.orderId.toLowerCase().includes(term) ||
             o.clientName.toLowerCase().includes(term) ||
             o.clientPhone.includes(term)
      )
    }

    // Filtre status
    if (filterStatus && filterStatus !== 'all') {
      result = result.filter(o => o.status === filterStatus)
    }

    // Tri
    if (sortBy === 'amount') {
      result.sort((a, b) => b.total - a.total)
    } else if (sortBy === 'status') {
      result.sort((a, b) => a.status.localeCompare(b.status))
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return result
  }, [orders, searchTerm, filterStatus, sortBy])

  // Stats
  const stats = useMemo(() => {
    return {
      total: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length
    }
  }, [orders])

  const statusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const paymentBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800',
      completed: 'bg-emerald-100 text-emerald-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white p-8 shadow-lg"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Gestion des Commandes</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">Total Commandes</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">Revenu Total</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">En Attente</p>
              <p className="text-3xl font-bold text-yellow-200">{stats.pending}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">Confirmées</p>
              <p className="text-3xl font-bold text-blue-200">{stats.confirmed}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Filtres et recherche */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Chercher par ID, nom, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Filtre status */}
            <div>
              <select
                value={filterStatus || 'all'}
                onChange={(e) => setFilterStatus(e.target.value === 'all' ? null : e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmée</option>
                <option value="processing">En traitement</option>
                <option value="shipped">Expédiée</option>
                <option value="delivered">Livrée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>

            {/* Tri */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="date">Plus récentes</option>
                <option value="amount">Montant décroissant</option>
                <option value="status">Par statut</option>
              </select>
            </div>

            {/* Export */}
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </motion.div>

        {/* Tableau des commandes */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">Chargement des commandes...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            Erreur: {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center text-gray-500">
            Aucune commande trouvée
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">ID Commande</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Montant</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Paiement</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, idx) => (
                    <motion.tr
                      key={order.orderId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-blue-600">{order.orderId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{order.clientName}</span>
                          <span className="text-xs text-gray-500">{order.clientPhone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${paymentBadgeColor(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setShowDetailModal(true)
                            }}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition" title="Éditer">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal Détails */}
      <AnimatePresence>
        {showDetailModal && selectedOrder && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-emerald-600 text-white p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{selectedOrder.orderId}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Client */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Informations Client
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Nom:</span> <span className="font-semibold">{selectedOrder.clientName}</span></p>
                    <p><span className="text-gray-600">Téléphone:</span> <span className="font-semibold">{selectedOrder.clientPhone}</span></p>
                    {selectedOrder.clientEmail && <p><span className="text-gray-600">Email:</span> <span className="font-semibold">{selectedOrder.clientEmail}</span></p>}
                  </div>
                </div>

                {/* Adresse */}
                {selectedOrder.address && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Adresse de Livraison
                    </h3>
                    <div className="space-y-1 text-sm bg-gray-50 p-4 rounded-lg">
                      <p>{selectedOrder.address.street}</p>
                      <p>{selectedOrder.address.neighborhood}, {selectedOrder.address.department}</p>
                      <p>{selectedOrder.address.region}, Sénégal</p>
                      {selectedOrder.address.additionalInfo && <p className="text-gray-600">{selectedOrder.address.additionalInfo}</p>}
                    </div>
                  </div>
                )}

                {/* Articles */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Articles ({selectedOrder.items.length})</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <span>{item.name} × {item.qty || 1}</span>
                        <span className="font-semibold">{formatCurrency(item.price * (item.qty || 1))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totaux */}
                <div className="bg-gradient-to-r from-blue-50 to-emerald-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total:</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Transport ({selectedOrder.shipping.method}):</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.shipping.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-transparent bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
