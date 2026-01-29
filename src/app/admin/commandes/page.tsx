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
  MoreVertical,
  Check,
  X,
  Truck,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Send,
  Bell,
  Printer
} from 'lucide-react'

const formatCurrency = (v?: number) => (typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-')
const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
}
const formatDateTime = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Mapping des labels transport
const shippingLabels: Record<string, string> = {
  air_express: 'Express (3-5 jrs)',
  air_15: 'Aérien (10-15 jrs)',
  sea_freight: 'Maritime (45-50 jrs)',
  express_3j: 'Express (3-5 jrs)', // legacy aliases
  air_15j: 'Aérien (10-15 jrs)',
  maritime_60j: 'Maritime (45-50 jrs)'
}

// Traductions des statuts
const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En traitement',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée'
}
const paymentLabels: Record<string, string> = {
  pending: 'En attente',
  completed: 'Payée',
  failed: 'Échoué'
}

interface Order {
  _id?: string
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
  updatedAt?: string
  currency: string
  notes?: string
  timeline?: { action: string; date: string; by: string }[]
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
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // ID de la commande en cours
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showEditModal, setShowEditModal] = useState(false)

  // Charger les commandes
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

  useEffect(() => {
    fetchOrders()
  }, [])

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(null)
    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActionsMenu])

  // Actions sur les commandes
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId)
    try {
      const res = await fetch(`/api/order/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          timelineAction: `Statut changé vers ${statusLabels[newStatus] || newStatus}`
        })
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour')
      
      showNotification('success', `Commande mise à jour: ${statusLabels[newStatus] || newStatus}`)
      await fetchOrders()
      setShowActionsMenu(null)
    } catch (e) {
      showNotification('error', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId)
    try {
      const res = await fetch(`/api/order/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentStatus: newStatus,
          timelineAction: `Paiement: ${paymentLabels[newStatus] || newStatus}`
        })
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du paiement')
      
      showNotification('success', `Paiement: ${paymentLabels[newStatus] || newStatus}`)
      await fetchOrders()
      setShowActionsMenu(null)
    } catch (e) {
      showNotification('error', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  const deleteOrder = async (orderId: string) => {
    if (!confirm(`⚠️ Supprimer définitivement la commande ${orderId}?\n\nCette action est irréversible.`)) return
    
    setActionLoading(orderId)
    try {
      const res = await fetch(`/api/order/${orderId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur lors de la suppression')
      
      showNotification('success', `Commande ${orderId} supprimée`)
      setShowActionsMenu(null)
      await fetchOrders()
    } catch (e) {
      showNotification('error', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotificationMessage({ type, message })
    setTimeout(() => setNotificationMessage(null), 4000)
  }

  const exportOrders = () => {
    const csv = [
      ['ID', 'Client', 'Téléphone', 'Email', 'Articles', 'Sous-total', 'Transport', 'Total', 'Statut', 'Paiement', 'Adresse', 'Date'].join(';'),
      ...filteredOrders.map(o => [
        o.orderId,
        `"${o.clientName}"`,
        o.clientPhone,
        o.clientEmail || '',
        o.items.length,
        o.subtotal,
        o.shipping?.totalCost || 0,
        o.total,
        statusLabels[o.status] || o.status,
        paymentLabels[o.paymentStatus] || o.paymentStatus,
        `"${o.address?.street || ''} ${o.address?.neighborhood || ''} ${o.address?.city || ''}"`,
        formatDateTime(o.createdAt)
      ].join(';'))
    ].join('\n')

    const BOM = '\uFEFF' // Pour Excel reconnaître UTF-8
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showNotification('success', `${filteredOrders.length} commandes exportées`)
  }

  const printOrder = (order: Order) => {
     // Ouvrir une nouvelle fenêtre pour l'impression simplifiée
     const printWindow = window.open('', '_blank')
     if (!printWindow) return
     
     const html = `
       <html>
         <head>
           <title>Commande ${order.orderId}</title>
           <style>
             body { font-family: sans-serif; padding: 20px; line-height: 1.5; }
             .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
             .section { margin-bottom: 20px; }
             .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
             table { width: 100%; border-collapse: collapse; margin-top: 10px; }
             th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
             .total { text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 20px; }
             @media print { .no-print { display: none; } }
           </style>
         </head>
         <body>
           <div class="header">
             <div>
               <h1>IT Vision</h1>
               <p>Commande #${order.orderId}</p>
             </div>
             <div style="text-align:right">
               <p>Date: ${formatDateTime(order.createdAt)}</p>
               <p>Statut: ${statusLabels[order.status] || order.status}</p>
             </div>
           </div>
           
           <div class="grid">
             <div class="section">
               <h3>Client</h3>
               <p><strong>${order.clientName}</strong></p>
               <p>${order.clientPhone}</p>
               <p>${order.clientEmail || ''}</p>
             </div>
             
             <div class="section">
               <h3>Livraison</h3>
               <p>${order.address?.street}</p>
               <p>${order.address?.neighborhood || order.address?.city}</p>
               <p>${order.address?.region || 'Sénégal'}</p>
               <p><em>Transport: ${shippingLabels[order.shipping.method] || order.shipping.method}</em></p>
             </div>
           </div>

           <div class="section">
             <h3>Articles</h3>
             <table>
               <thead>
                 <tr><th>Article</th><th>Qté</th><th style="text-align:right">Prix</th><th style="text-align:right">Total</th></tr>
               </thead>
               <tbody>
                 ${order.items.map(item => `
                   <tr>
                     <td>${item.name}</td>
                     <td>${item.qty || 1}</td>
                     <td style="text-align:right">${formatCurrency(item.price)}</td>
                     <td style="text-align:right">${formatCurrency((item.price || 0) * (item.qty || 1))}</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
           </div>

           <div class="total">
             <p>Sous-total: ${formatCurrency(order.subtotal)}</p>
             <p>Transport: ${formatCurrency(order.shipping.totalCost)}</p>
             <p>TOTAL: ${formatCurrency(order.total)}</p>
           </div>
           
           <script>window.print();</script>
         </body>
       </html>
     `
     printWindow.document.write(html)
     printWindow.document.close()
  }

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

    // Filtre date
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      result = result.filter(o => {
        const orderDate = new Date(o.createdAt)
        if (dateFilter === 'today') {
          return orderDate >= today
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          return orderDate >= weekAgo
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          return orderDate >= monthAgo
        }
        return true
      })
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
  }, [orders, searchTerm, filterStatus, dateFilter, sortBy])

  // Stats
  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.paymentStatus === 'completed')
    return {
      total: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      paidRevenue: paidOrders.reduce((sum, o) => sum + o.total, 0),
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      avgOrderValue: orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + o.total, 0) / orders.length) : 0
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
      {/* Notifications */}
      <AnimatePresence>
        {notificationMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${
              notificationMessage.type === 'success' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            {notificationMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="font-semibold">{notificationMessage.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">Revenu</p>
              <p className="text-xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-white/60 text-xs mt-1">Payé: {formatCurrency(stats.paidRevenue)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">En Attente</p>
              <p className="text-2xl font-bold text-yellow-200">{stats.pending}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">En cours</p>
              <p className="text-2xl font-bold text-purple-200">{stats.confirmed + stats.processing}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">Expédiées</p>
              <p className="text-2xl font-bold text-indigo-200">{stats.shipped}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white/20 backdrop-blur rounded-lg p-4"
            >
              <p className="text-white/80 text-sm">Livrées</p>
              <p className="text-2xl font-bold text-emerald-200">{stats.delivered}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            {/* Filtre période */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd&apos;hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
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
            <button 
              onClick={exportOrders}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
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
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${paymentBadgeColor(order.paymentStatus)}`}>
                          {paymentLabels[order.paymentStatus] || order.paymentStatus}
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
                          
                          {/* Actions rapides */}
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.orderId, 'confirmed')}
                              disabled={actionLoading === order.orderId}
                              className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition disabled:opacity-50"
                              title="Confirmer"
                            >
                              {actionLoading === order.orderId ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(order.orderId, 'processing')}
                              disabled={actionLoading === order.orderId}
                              className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition disabled:opacity-50"
                              title="En traitement"
                            >
                              {actionLoading === order.orderId ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Package className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          {order.status === 'processing' && (
                            <button
                              onClick={() => updateOrderStatus(order.orderId, 'shipped')}
                              disabled={actionLoading === order.orderId}
                              className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-lg transition disabled:opacity-50"
                              title="Expédier"
                            >
                              {actionLoading === order.orderId ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Truck className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          {/* Menu actions */}
                          <div className="relative">
                            <buttonitems-center justify-between mt-4">
                  <div className="flex gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeColor(selectedOrder.status)}`}>
                      {statusLabels[selectedOrder.status] || selectedOrder.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${paymentBadgeColor(selectedOrder.paymentStatus)}`}>
                      {paymentLabels[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}
                    </span>
                  </div>
                  <button
                    onClick={() => printOrder(selectedOrder)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimer
                  </button>
                </div>
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
                      <p className="font-semibold">{selectedOrder.address.street}</p>
                      <p>{[selectedOrder.address.neighborhood, selectedOrder.address.city, selectedOrder.address.department].filter(Boolean).join(', ')}</p>
                      <p>{selectedOrder.address.region || 'Sénégal'}</p>
                      {selectedOrder.address.additionalInfo && <p className="text-gray-600 italic mt-2">Note: {selectedOrder.address.additionalInfo}</p>}
                    </div>
                  </div>
                )}

                {/* Articles */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Articles ({selectedOrder.items.length})</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-gray-500">Variante: {item.variantId || 'Standard'}</span>
                        </div>
                        <div className="text-right">
                          <div>{formatCurrency(item.price * (item.qty || 1))}</div>
                          <div className="text-xs text-gray-500">{item.qty || 1} x {formatCurrency(item.price)}</div>
                        </div>
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
                    <span>Transport ({shippingLabels[selectedOrder.shipping.method] || selectedOrder.shipping.method}):</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.shipping.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Poids / Volume:</span>
                    <span>{(selectedOrder.shipping.totalWeight || 0).toFixed(2)}kg / {(selectedOrder.shipping.totalVolume || 0).toFixed(3)}m³</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mw-y-auto shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-emerald-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedOrder.orderId}</h2>
                    <p className="text-white/80 text-sm mt-1">Créée le {formatDateTime(selectedOrder.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-white/80 hover:text-white text-2xl p-2"
                  >
                    ×
                  </button>
                </div>
                <div className="flex gap-3 mt-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeColor(selectedOrder.status)}`}>
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${paymentBadgeColor(selectedOrder.paymentStatus)}`}>
                    {paymentLabels[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}
                  </span>
                </div>
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
