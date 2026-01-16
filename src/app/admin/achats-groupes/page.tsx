'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Users,
  Package,
  Clock,
  TrendingDown,
  Search,
  Calendar,
  Target,
  Zap,
  ShoppingCart,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  MoreVertical,
  Truck,
  DollarSign,
  Download,
  RefreshCw,
  Trash2,
  Edit2,
  Play,
  Pause
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
  participants: Array<{
    _id?: string
    name: string
    phone: string
    email?: string
    qty: number
    unitPrice: number
    totalAmount: number
    paidAmount: number
    paymentStatus: string
    paymentReference?: string
    transactionId?: string
    adminNote?: string
    paymentUpdatedAt?: string
    joinedAt: string
  }>
  deadline: string
  shippingMethod?: string
  linkedOrderId?: string
  createdAt: string
}

const formatCurrency = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`
const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { 
  day: 'numeric', month: 'short', year: 'numeric' 
})

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  open: { label: 'Ouvert', color: 'bg-emerald-100 text-emerald-800' },
  filled: { label: 'Objectif atteint', color: 'bg-blue-100 text-blue-800' },
  ordering: { label: 'En commande', color: 'bg-purple-100 text-purple-800' },
  ordered: { label: 'Commandé', color: 'bg-indigo-100 text-indigo-800' },
  shipped: { label: 'Expédié', color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' }
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  partial: { label: 'Partiel', color: 'bg-orange-100 text-orange-800' },
  paid: { label: 'Payé', color: 'bg-green-100 text-green-800' },
  refunded: { label: 'Remboursé', color: 'bg-red-100 text-red-800' }
}

export default function AdminGroupOrdersPage() {
  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<GroupOrder | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [paymentLinksModal, setPaymentLinksModal] = useState<
    | null
    | {
        groupId: string
        participantName: string
        participantPhone: string
        amount: number
        reference: string
        links: Array<{ provider: string; url: string; phoneNumber?: string; instructions?: string }>
      }
  >(null)
  const [paymentLinksLoading, setPaymentLinksLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(null)
    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActionsMenu])

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/group-orders?status=all&includeExpired=true')
      const data = await res.json()
      if (data.success) {
        setGroups(data.groups)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedGroup(null)
    setDetailLoading(false)
    setDetailError(null)
  }

  const refreshSelectedGroup = async (groupId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await fetch(`/api/admin/group-orders/${groupId}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success && data?.group) {
        setSelectedGroup(data.group)
      } else {
        setDetailError(data?.error || 'Erreur lors du chargement')
      }
    } catch {
      setDetailError('Erreur lors du chargement')
    } finally {
      setDetailLoading(false)
    }
  }

  const updateGroupStatus = async (groupId: string, newStatus: string) => {
    setActionLoading(groupId)
    try {
      const res = await fetch(`/api/group-orders/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        showNotification('success', `Statut mis à jour: ${statusConfig[newStatus]?.label || newStatus}`)
        fetchGroups()
        if (showDetailModal && selectedGroup?.groupId === groupId) {
          refreshSelectedGroup(groupId)
        }
      } else {
        throw new Error('Erreur')
      }
    } catch (error) {
      showNotification('error', 'Erreur lors de la mise à jour')
    } finally {
      setActionLoading(null)
      setShowActionsMenu(null)
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm(`Supprimer l'achat groupé ${groupId}?`)) return
    
    setActionLoading(groupId)
    try {
      const res = await fetch(`/api/group-orders/${groupId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showNotification('success', 'Achat groupé supprimé')
        fetchGroups()
        if (showDetailModal && selectedGroup?.groupId === groupId) {
          closeDetailModal()
        }
      } else {
        showNotification('error', data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      showNotification('error', 'Erreur lors de la suppression')
    } finally {
      setActionLoading(null)
    }
  }

  const updatePaymentStatus = async (
    groupId: string,
    participantPhone: string,
    newStatus: 'pending' | 'partial' | 'paid' | 'refunded',
    paidAmount?: number,
    transactionId?: string,
    adminNote?: string
  ) => {
    try {
      const res = await fetch(`/api/group-orders/${groupId}/payment-links`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: participantPhone,
          paymentStatus: newStatus,
          paidAmount,
          transactionId,
          adminNote
        })
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        showNotification('success', 'Paiement mis à jour')
        fetchGroups()
        if (showDetailModal && selectedGroup?.groupId === groupId) {
          refreshSelectedGroup(groupId)
        }
      } else {
        showNotification('error', data?.error || 'Erreur lors de la mise à jour')
      }
    } catch {
      showNotification('error', 'Erreur lors de la mise à jour')
    }
  }

  const generatePaymentLinksForParticipant = async (groupId: string, phone: string, email?: string, name?: string) => {
    setPaymentLinksLoading(`${groupId}:${phone}`)
    try {
      const res = await fetch(`/api/group-orders/${groupId}/payment-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          email: email || undefined,
          sendEmail: Boolean(email)
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        showNotification('error', data?.error || 'Erreur génération lien')
        return
      }

      setPaymentLinksModal({
        groupId,
        participantName: name || data?.participant?.name || 'Participant',
        participantPhone: data?.participant?.phone || phone,
        amount: Number(data?.payment?.amount) || 0,
        reference: String(data?.payment?.reference || ''),
        links: Array.isArray(data?.paymentLinks) ? data.paymentLinks : []
      })

      if (showDetailModal && selectedGroup?.groupId === groupId) {
        refreshSelectedGroup(groupId)
      }
    } catch {
      showNotification('error', 'Erreur génération lien')
    } finally {
      setPaymentLinksLoading(null)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const exportGroups = () => {
    const csv = [
      ['ID', 'Produit', 'Statut', 'Participants', 'Qté actuelle', 'Qté cible', 'Prix unitaire', 'Total', 'Deadline'].join(';'),
      ...filteredGroups.map(g => [
        g.groupId,
        `"${g.product.name}"`,
        statusConfig[g.status]?.label || g.status,
        g.participants.length,
        g.currentQty,
        g.targetQty,
        g.currentUnitPrice,
        g.participants.reduce((sum, p) => sum + p.totalAmount, 0),
        formatDate(g.deadline)
      ].join(';'))
    ].join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `achats_groupes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showNotification('success', `${filteredGroups.length} achats exportés`)
  }

  const filteredGroups = useMemo(() => {
    let result = [...groups]
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(g => 
        g.groupId.toLowerCase().includes(term) ||
        g.product.name.toLowerCase().includes(term)
      )
    }
    
    if (filterStatus !== 'all') {
      result = result.filter(g => g.status === filterStatus)
    }
    
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [groups, searchTerm, filterStatus])

  const stats = useMemo(() => {
    const totalRevenue = groups.reduce((sum, g) => 
      sum + g.participants.reduce((pSum, p) => pSum + p.paidAmount, 0), 0
    )
    const pendingRevenue = groups.reduce((sum, g) => 
      sum + g.participants.reduce((pSum, p) => pSum + (p.totalAmount - p.paidAmount), 0), 0
    )
    return {
      total: groups.length,
      open: groups.filter(g => g.status === 'open').length,
      filled: groups.filter(g => g.status === 'filled').length,
      totalParticipants: groups.reduce((sum, g) => sum + g.participants.length, 0),
      totalRevenue,
      pendingRevenue
    }
  }, [groups])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8 shadow-lg"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <h1 className="text-4xl font-bold">Gestion des Achats Groupés</h1>
            </div>
            <Link
              href="/admin/achats-groupes/nouveau"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <Plus className="h-4 w-4" />
              Créer
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <p className="text-white/80 text-sm">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <p className="text-white/80 text-sm">Ouverts</p>
              <p className="text-2xl font-bold text-emerald-200">{stats.open}</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <p className="text-white/80 text-sm">Objectif atteint</p>
              <p className="text-2xl font-bold text-blue-200">{stats.filled}</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <p className="text-white/80 text-sm">Participants</p>
              <p className="text-2xl font-bold">{stats.totalParticipants}</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <p className="text-white/80 text-sm">Encaissé</p>
              <p className="text-lg font-bold text-emerald-200">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <p className="text-white/80 text-sm">En attente</p>
              <p className="text-lg font-bold text-yellow-200">{formatCurrency(stats.pendingRevenue)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border p-6 shadow-lg mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Ouverts</option>
              <option value="filled">Objectif atteint</option>
              <option value="ordering">En commande</option>
              <option value="ordered">Commandés</option>
              <option value="shipped">Expédiés</option>
              <option value="delivered">Livrés</option>
              <option value="cancelled">Annulés</option>
            </select>
            
            <button
              onClick={fetchGroups}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            
            <button
              onClick={exportGroups}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </motion.div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-500">
            Aucun achat groupé trouvé
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">ID / Produit</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Progression</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Prix</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Deadline</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group, idx) => {
                    const progress = Math.min(100, Math.round((group.currentQty / group.targetQty) * 100))
                    const status = statusConfig[group.status]
                    
                    return (
                      <motion.tr
                        key={group.groupId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-mono text-sm font-bold text-purple-600">{group.groupId}</span>
                            <p className="text-sm text-gray-900 font-semibold mt-1">{group.product.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status?.color}`}>
                            {status?.label || group.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <span>{group.participants.length} participants</span>
                              <span className="font-bold">{group.currentQty}/{group.targetQty}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900">{formatCurrency(group.currentUnitPrice)}</span>
                          <p className="text-xs text-gray-500">Total: {formatCurrency(group.participants.reduce((s, p) => s + p.totalAmount, 0))}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(group.deadline)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={async () => {
                                setSelectedGroup(group)
                                setShowDetailModal(true)
                                await refreshSelectedGroup(group.groupId)
                              }}
                              className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {group.status === 'open' && (
                              <button
                                onClick={() => updateGroupStatus(group.groupId, 'cancelled')}
                                disabled={actionLoading === group.groupId}
                                className="p-2 hover:bg-red-100 text-red-600 rounded-lg disabled:opacity-50"
                                title="Annuler"
                              >
                                {actionLoading === group.groupId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              </button>
                            )}
                            
                            {group.status === 'filled' && (
                              <button
                                onClick={() => updateGroupStatus(group.groupId, 'ordering')}
                                disabled={actionLoading === group.groupId}
                                className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg disabled:opacity-50"
                                title="Lancer la commande"
                              >
                                {actionLoading === group.groupId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                              </button>
                            )}
                            
                            {group.status === 'ordering' && (
                              <button
                                onClick={() => updateGroupStatus(group.groupId, 'ordered')}
                                disabled={actionLoading === group.groupId}
                                className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-lg disabled:opacity-50"
                                title="Marquer commandé"
                              >
                                {actionLoading === group.groupId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              </button>
                            )}
                            
                            {group.status === 'ordered' && (
                              <button
                                onClick={() => updateGroupStatus(group.groupId, 'shipped')}
                                disabled={actionLoading === group.groupId}
                                className="p-2 hover:bg-orange-100 text-orange-600 rounded-lg disabled:opacity-50"
                                title="Marquer expédié"
                              >
                                {actionLoading === group.groupId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                              </button>
                            )}
                            
                            {group.status === 'shipped' && (
                              <button
                                onClick={() => updateGroupStatus(group.groupId, 'delivered')}
                                disabled={actionLoading === group.groupId}
                                className="p-2 hover:bg-green-100 text-green-600 rounded-lg disabled:opacity-50"
                                title="Marquer livré"
                              >
                                {actionLoading === group.groupId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                              </button>
                            )}
                            
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowActionsMenu(showActionsMenu === group.groupId ? null : group.groupId)
                                }}
                                className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {showActionsMenu === group.groupId && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50">
                                  <button
                                    onClick={() => deleteGroup(group.groupId)}
                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-700 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal Détails */}
      <AnimatePresence>
        {showDetailModal && selectedGroup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDetailModal}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedGroup.groupId}</h2>
                    <p className="text-white/80">{selectedGroup.product.name}</p>
                  </div>
                  <button onClick={closeDetailModal} className="text-white/80 hover:text-white text-2xl">×</button>
                </div>
                <div className="flex gap-3 mt-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig[selectedGroup.status]?.color}`}>
                    {statusConfig[selectedGroup.status]?.label}
                  </span>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                    {selectedGroup.currentQty}/{selectedGroup.targetQty} unités
                  </span>
                  {detailLoading && (
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mise à jour…
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {detailError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {detailError}
                  </div>
                )}
                {/* Participants */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Participants ({selectedGroup.participants.length})
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Nom</th>
                          <th className="px-4 py-2 text-left">Contact</th>
                          <th className="px-4 py-2 text-center">Qté</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2 text-right">Payé</th>
                          <th className="px-4 py-2 text-center">Statut</th>
                          <th className="px-4 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroup.participants.map((p, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-3 font-semibold">{p.name}</td>
                            <td className="px-4 py-3">
                              <p>{p.phone}</p>
                              {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{p.qty}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(p.totalAmount)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(p.paidAmount)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${paymentStatusConfig[p.paymentStatus]?.color}`}>
                                {paymentStatusConfig[p.paymentStatus]?.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2 flex-wrap">
                                <button
                                  onClick={() => generatePaymentLinksForParticipant(selectedGroup.groupId, p.phone, p.email, p.name)}
                                  disabled={paymentLinksLoading === `${selectedGroup.groupId}:${p.phone}`}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 disabled:opacity-60"
                                >
                                  {paymentLinksLoading === `${selectedGroup.groupId}:${p.phone}` ? '…' : 'Lien paiement'}
                                </button>

                                {p.paymentStatus !== 'paid' && (
                                  <button
                                    onClick={() => updatePaymentStatus(selectedGroup.groupId, p.phone, 'paid', p.totalAmount)}
                                    className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold hover:bg-emerald-200"
                                  >
                                    Marquer payé
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    const raw = prompt('Montant payé (FCFA) :', String(p.paidAmount || 0))
                                    if (raw === null) return
                                    const amount = Number(raw)
                                    if (!Number.isFinite(amount) || amount < 0) {
                                      showNotification('error', 'Montant invalide')
                                      return
                                    }
                                    const tx = prompt('Transaction ID (optionnel) :', p.transactionId || '')
                                    const note = prompt('Note admin (optionnel) :', p.adminNote || '')
                                    updatePaymentStatus(selectedGroup.groupId, p.phone, 'partial', amount, tx || undefined, note || undefined)
                                  }}
                                  className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold hover:bg-orange-200"
                                >
                                  Partiel
                                </button>

                                <button
                                  onClick={() => {
                                    if (!confirm('Marquer ce paiement comme remboursé ?')) return
                                    const note = prompt('Note admin (optionnel) :', p.adminNote || '')
                                    updatePaymentStatus(selectedGroup.groupId, p.phone, 'refunded', 0, undefined, note || undefined)
                                  }}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200"
                                >
                                  Remboursé
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-3">TOTAL</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(selectedGroup.participants.reduce((s, p) => s + p.totalAmount, 0))}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(selectedGroup.participants.reduce((s, p) => s + p.paidAmount, 0))}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Paliers de prix */}
                {selectedGroup.priceTiers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-emerald-600" />
                      Paliers de prix
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {selectedGroup.priceTiers.map((tier, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border ${
                            selectedGroup.currentQty >= tier.minQty ? 'bg-emerald-50 border-emerald-300' : 'bg-gray-50'
                          }`}
                        >
                          <p className="text-sm text-gray-600">{tier.minQty}+ unités</p>
                          <p className="text-lg font-bold">{formatCurrency(tier.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Liens de paiement */}
      <AnimatePresence>
        {paymentLinksModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPaymentLinksModal(null)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">Liens de paiement</div>
                  <div className="text-lg font-bold text-gray-900">{paymentLinksModal.participantName}</div>
                  <div className="text-xs text-gray-600">{paymentLinksModal.participantPhone}</div>
                </div>
                <button onClick={() => setPaymentLinksModal(null)} className="text-gray-500 hover:text-gray-900 text-2xl">×</button>
              </div>
              <div className="p-5 space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600">Référence:</span>{' '}
                  <span className="font-mono font-semibold">{paymentLinksModal.reference || '-'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Montant:</span>{' '}
                  <span className="font-semibold text-emerald-700">{formatCurrency(paymentLinksModal.amount)}</span>
                </div>

                <div className="mt-3 space-y-2">
                  {paymentLinksModal.links.length === 0 ? (
                    <div className="text-sm text-gray-600">Aucun lien retourné.</div>
                  ) : (
                    paymentLinksModal.links.map((l, idx) => (
                      <div key={idx} className="border rounded-xl p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{l.provider}</div>
                            {l.phoneNumber && <div className="text-xs text-gray-600">Num: {l.phoneNumber}</div>}
                          </div>
                          <button
                            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(l.url)
                                showNotification('success', 'Lien copié')
                              } catch {
                                showNotification('error', 'Copie impossible')
                              }
                            }}
                          >
                            Copier
                          </button>
                        </div>
                        <div className="mt-2 text-xs break-all text-blue-700">
                          <a className="underline" href={l.url} target="_blank" rel="noreferrer">{l.url}</a>
                        </div>
                        {l.instructions && <div className="mt-2 text-xs text-gray-600">{l.instructions}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
