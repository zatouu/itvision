'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  ClipboardCheck,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Ship,
  ShoppingCart,
  Truck
} from 'lucide-react'

interface ChinaPurchaseItem {
  productName: string
  quantity: number
  expectedQty: number
  receivedQty: number
  defectiveQty: number
  unitPriceCny?: number
  unitPriceFcfa?: number
}

interface ChinaPurchase {
  purchaseId: string
  source: {
    type: string
    id?: string
    label?: string
  }
  platform: string
  platformOrderId?: string
  sellerName?: string
  status: string
  items: ChinaPurchaseItem[]
  customerFinancials: {
    expectedAmount: number
    collectedAmount: number
    outstandingAmount: number
    paymentCoverageRatio: number
    currency: string
  }
  alipay?: {
    paidAmountCny?: number
    paidAt?: string
    reference?: string
  }
  guangzhouReception?: {
    collaboratorName?: string
    receivedAt?: string
    warehouseAddress?: string
  }
  qualityCheck?: {
    checkedBy?: string
    checkedAt?: string
    result?: string
  }
  freight?: {
    providerName?: string
    trackingNumber?: string
    handedOverAt?: string
    shippingMethod?: string
  }
  updatedAt: string
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  to_purchase: { label: 'À acheter 1688', color: 'bg-purple-100 text-purple-800', icon: ShoppingCart },
  purchased_1688: { label: 'Acheté 1688', color: 'bg-indigo-100 text-indigo-800', icon: ShoppingCart },
  paid_alipay: { label: 'Payé Alipay', color: 'bg-blue-100 text-blue-800', icon: CreditCard },
  seller_shipped: { label: 'Expédié vendeur', color: 'bg-orange-100 text-orange-800', icon: Truck },
  received_guangzhou: { label: 'Reçu Guangzhou', color: 'bg-teal-100 text-teal-800', icon: Package },
  quality_check_pending: { label: 'Contrôle à faire', color: 'bg-yellow-100 text-yellow-800', icon: ClipboardCheck },
  quality_check_passed: { label: 'Contrôle OK', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  quality_check_failed: { label: 'Contrôle échoué', color: 'bg-red-100 text-red-800', icon: ClipboardCheck },
  quality_check_partial: { label: 'Contrôle partiel', color: 'bg-orange-100 text-orange-800', icon: ClipboardCheck },
  handed_to_freight: { label: 'Remis au fret', color: 'bg-emerald-100 text-emerald-800', icon: Ship },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: Package }
}

const statusOptions = [
  'all',
  'to_purchase',
  'purchased_1688',
  'paid_alipay',
  'seller_shipped',
  'received_guangzhou',
  'quality_check_pending',
  'quality_check_passed',
  'quality_check_failed',
  'quality_check_partial',
  'handed_to_freight',
  'cancelled'
]

const workflowSteps = [
  'to_purchase',
  'purchased_1688',
  'paid_alipay',
  'seller_shipped',
  'received_guangzhou',
  'quality_check_pending',
  'quality_check_passed',
  'handed_to_freight'
]

const formatCurrency = (value: number, currency = 'FCFA') => `${Math.round(value || 0).toLocaleString('fr-FR')} ${currency}`
const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function AdminChinaPurchasesPage() {
  const [purchases, setPurchases] = useState<ChinaPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const res = await fetch(`/api/admin/china-purchases?${params.toString()}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur chargement')
      setPurchases(data.purchases || [])
    } catch (error) {
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Erreur chargement' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchases()
  }, [filterStatus])

  const filteredPurchases = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return purchases
    return purchases.filter((purchase) => {
      const haystack = [
        purchase.purchaseId,
        purchase.source?.id,
        purchase.source?.label,
        purchase.platformOrderId,
        purchase.sellerName,
        purchase.items?.map(item => item.productName).join(' ')
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [purchases, searchTerm])

  const updateStatus = async (purchase: ChinaPurchase, status: string) => {
    try {
      setActionLoading(purchase.purchaseId)
      const res = await fetch(`/api/admin/china-purchases/${purchase.purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur mise à jour')
      setPurchases(prev => prev.map(item => item.purchaseId === purchase.purchaseId ? data.purchase : item))
      setNotification({ type: 'success', message: 'Statut achat Chine mis à jour' })
    } catch (error) {
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Erreur mise à jour' })
    } finally {
      setActionLoading(null)
    }
  }

  const nextStatus = (status: string) => {
    const index = workflowSteps.indexOf(status)
    if (index < 0 || index >= workflowSteps.length - 1) return null
    return workflowSteps[index + 1]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Achats Chine</h1>
                <p className="text-sm text-gray-500">1688, Alipay, réception Guangzhou, contrôle et remise fret</p>
              </div>
            </div>
            <button
              onClick={fetchPurchases}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {notification && (
          <div className={`mb-4 p-4 rounded-xl ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher achat, source, vendeur, produit..."
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status === 'all' ? 'Tous les statuts' : statusConfig[status]?.label || status}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Aucun achat Chine</h2>
            <p className="text-gray-500 mt-2">Les achats seront créés automatiquement au lancement d’un achat groupé.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map((purchase, index) => {
              const config = statusConfig[purchase.status] || statusConfig.to_purchase
              const Icon = config.icon
              const next = nextStatus(purchase.status)
              const firstItem = purchase.items?.[0]

              return (
                <motion.div
                  key={purchase.purchaseId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-mono font-bold text-gray-900">{purchase.purchaseId}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.color}`}>{config.label}</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{purchase.platform}</span>
                          </div>
                          <p className="font-bold text-gray-900 mt-2 truncate">{firstItem?.productName || purchase.source?.label || 'Achat Chine'}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                            <span>Source : {purchase.source?.type} {purchase.source?.id ? `· ${purchase.source.id}` : ''}</span>
                            <span>Qté : {purchase.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</span>
                            <span>MAJ : {formatDate(purchase.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {next && (
                          <button
                            onClick={() => updateStatus(purchase, next)}
                            disabled={actionLoading === purchase.purchaseId}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2"
                          >
                            {actionLoading === purchase.purchaseId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {statusConfig[next]?.label || next}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Attendu client</p>
                        <p className="font-bold text-gray-900">{formatCurrency(purchase.customerFinancials.expectedAmount, purchase.customerFinancials.currency)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Encaissé</p>
                        <p className="font-bold text-green-700">{formatCurrency(purchase.customerFinancials.collectedAmount, purchase.customerFinancials.currency)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Reste</p>
                        <p className={purchase.customerFinancials.outstandingAmount > 0 ? 'font-bold text-red-700' : 'font-bold text-green-700'}>
                          {formatCurrency(purchase.customerFinancials.outstandingAmount, purchase.customerFinancials.currency)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Couverture</p>
                        <p className="font-bold text-purple-700">{purchase.customerFinancials.paymentCoverageRatio}%</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-gray-500">Commande plateforme</p>
                        <p className="font-medium text-gray-900">{purchase.platformOrderId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Paiement Alipay</p>
                        <p className="font-medium text-gray-900">{purchase.alipay?.reference || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Réception Guangzhou</p>
                        <p className="font-medium text-gray-900">{purchase.guangzhouReception?.collaboratorName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fret Chine-Dakar</p>
                        <p className="font-medium text-gray-900">{purchase.freight?.providerName || purchase.freight?.trackingNumber || '—'}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
