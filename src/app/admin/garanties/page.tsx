'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  X,
  Send,
  Lock,
  Unlock
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Transaction {
  _id: string
  reference: string
  status: string
  amount: number
  paidAmount: number
  client: { name: string; phone: string; email?: string }
  createdAt: string
  updatedAt: string
  deliveredAt?: string
  completedAt?: string
  timeline: Array<{ status: string; timestamp: string; note?: string }>
  delivery?: { trackingNumber?: string; carrier?: string }
  dispute?: { reason: string; openedAt: string }
}

interface Stats {
  total: number
  pending: number
  secured: number
  inTransit: number
  completed: number
  disputed: number
  totalAmount: number
  paidAmount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Background (version admin - plus sobre)
// ─────────────────────────────────────────────────────────────────────────────

function AdminBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px]" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Glass Card Component
// ─────────────────────────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ 
  icon, 
  label, 
  value, 
  subValue,
  trend,
  color = 'emerald'
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  trend?: { value: number; positive: boolean }
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple'
}) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-indigo-500/20 text-blue-400',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400',
    red: 'from-red-500/20 to-rose-500/20 text-red-400',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden"
    >
      <GlassCard className="p-5">
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-white/40">{label}</p>
          {subValue && <p className="text-xs text-white/30 mt-1">{subValue}</p>}
        </div>
      </GlassCard>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    pending_payment: { label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    payment_received: { label: 'Payé', color: 'text-green-400', bg: 'bg-green-500/20' },
    funds_secured: { label: 'Sécurisé', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    order_placed: { label: 'Commandé', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    order_confirmed: { label: 'Confirmé', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    in_transit: { label: 'En transit', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    delivered: { label: 'Livré', color: 'text-green-400', bg: 'bg-green-500/20' },
    verification: { label: 'Vérification', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    completed: { label: 'Terminé', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    disputed: { label: 'Litige', color: 'text-red-400', bg: 'bg-red-500/20' },
    refunded: { label: 'Remboursé', color: 'text-blue-400', bg: 'bg-blue-500/20' }
  }

  const { label, color, bg } = config[status] || config.pending_payment

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${color} ${bg}`}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

function TransactionModal({ 
  transaction, 
  onClose, 
  onUpdateStatus 
}: { 
  transaction: Transaction
  onClose: () => void
  onUpdateStatus: (reference: string, status: string, note?: string) => Promise<void>
}) {
  const [selectedStatus, setSelectedStatus] = useState(transaction.status)
  const [note, setNote] = useState('')
  const [trackingNumber, setTrackingNumber] = useState(transaction.delivery?.trackingNumber || '')
  const [carrier, setCarrier] = useState(transaction.delivery?.carrier || '')
  const [updating, setUpdating] = useState(false)

  const statusOptions = [
    { value: 'payment_received', label: 'Paiement reçu', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'funds_secured', label: 'Fonds sécurisés', icon: <Lock className="w-4 h-4" /> },
    { value: 'order_placed', label: 'Commande passée', icon: <Package className="w-4 h-4" /> },
    { value: 'order_confirmed', label: 'Commande confirmée', icon: <CheckCircle2 className="w-4 h-4" /> },
    { value: 'in_transit', label: 'En transit', icon: <Truck className="w-4 h-4" /> },
    { value: 'delivered', label: 'Livré', icon: <Package className="w-4 h-4" /> },
    { value: 'completed', label: 'Terminé', icon: <CheckCircle2 className="w-4 h-4" /> },
    { value: 'refunded', label: 'Remboursé', icon: <RefreshCw className="w-4 h-4" /> }
  ]

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      await onUpdateStatus(transaction.reference, selectedStatus, note)
      onClose()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <GlassCard className="p-0">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  {transaction.reference}
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  Créé le {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-xs text-white/40 mb-1">Client</p>
                <p className="font-medium text-white">{transaction.client.name}</p>
                <p className="text-sm text-white/60">{transaction.client.phone}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-xs text-white/40 mb-1">Montant</p>
                <p className="font-medium text-white">{transaction.amount.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-sm text-emerald-400">
                  {transaction.paidAmount >= transaction.amount ? '✓ Payé' : `${transaction.paidAmount.toLocaleString('fr-FR')} payé`}
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-xs text-white/40 mb-2">Statut actuel</p>
              <StatusBadge status={transaction.status} />
            </div>

            {/* Dispute Alert */}
            {transaction.dispute && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="font-medium text-red-400">Litige ouvert</p>
                    <p className="text-sm text-white/60">{transaction.dispute.reason}</p>
                    <p className="text-xs text-white/40">
                      {new Date(transaction.dispute.openedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Update Status */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-white/60">Mettre à jour le statut</p>
              
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStatus(option.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition ${
                      selectedStatus === option.value
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {option.icon}
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Delivery Info (if in_transit or delivered) */}
              {['in_transit', 'delivered'].includes(selectedStatus) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-2">Transporteur</label>
                    <input
                      type="text"
                      value={carrier}
                      onChange={e => setCarrier(e.target.value)}
                      placeholder="DHL, Fedex..."
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-2">N° de suivi</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="ABC123456"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-xs text-white/40 mb-2">Note (optionnel)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ajouter une note..."
                  rows={2}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleUpdate}
                  disabled={updating || selectedStatus === transaction.status}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {updating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Mettre à jour
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 bg-white/5 text-white rounded-xl font-medium hover:bg-white/10 transition"
                >
                  Annuler
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-sm font-medium text-white/60 mb-3">Historique</p>
              <div className="relative pl-6 border-l border-white/10 space-y-4">
                {transaction.timeline.slice().reverse().map((event, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-emerald-500" />
                    <p className="text-sm text-white">{event.note || event.status}</p>
                    <p className="text-xs text-white/40">
                      {new Date(event.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminEscrowPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/escrow')
      const data = await response.json()
      setTransactions(data.transactions || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (reference: string, status: string, note?: string) => {
    try {
      await fetch(`/api/admin/escrow/${reference}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note })
      })
      await fetchData()
    } catch (error) {
      console.error('Erreur mise à jour:', error)
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client.phone.includes(searchQuery)
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const exportCSV = () => {
    const headers = ['Référence', 'Client', 'Téléphone', 'Montant', 'Statut', 'Date']
    const rows = filteredTransactions.map(t => [
      t.reference,
      t.client.name,
      t.client.phone,
      t.amount,
      t.status,
      new Date(t.createdAt).toLocaleDateString('fr-FR')
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `escrow-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <AdminBackground />
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Gestion des Garanties</h1>
                <p className="text-sm text-white/40">Escrow & Transactions sécurisées</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <StatCard
                icon={<Package className="w-6 h-6" />}
                label="Total transactions"
                value={stats.total}
                color="blue"
              />
              <StatCard
                icon={<Clock className="w-6 h-6" />}
                label="En attente"
                value={stats.pending}
                color="amber"
              />
              <StatCard
                icon={<Lock className="w-6 h-6" />}
                label="Sécurisés"
                value={stats.secured}
                color="emerald"
              />
              <StatCard
                icon={<Truck className="w-6 h-6" />}
                label="En transit"
                value={stats.inTransit}
                color="purple"
              />
              <StatCard
                icon={<CheckCircle2 className="w-6 h-6" />}
                label="Complétés"
                value={stats.completed}
                color="emerald"
              />
              <StatCard
                icon={<AlertTriangle className="w-6 h-6" />}
                label="Litiges"
                value={stats.disputed}
                color="red"
              />
            </div>
          )}

          {/* Revenue Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <StatCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Volume total"
                value={`${(stats.totalAmount / 1000000).toFixed(1)}M`}
                subValue={`${stats.totalAmount.toLocaleString('fr-FR')} FCFA`}
                trend={{ value: 12, positive: true }}
                color="emerald"
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Montant encaissé"
                value={`${(stats.paidAmount / 1000000).toFixed(1)}M`}
                subValue={`${stats.paidAmount.toLocaleString('fr-FR')} FCFA`}
                trend={{ value: 8, positive: true }}
                color="blue"
              />
            </div>
          )}

          {/* Search & Filters */}
          <GlassCard className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par référence, nom ou téléphone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              
              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition ${
                  statusFilter !== 'all' 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtres
                <ChevronDown className={`w-4 h-4 transition ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Filter Options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'Tous' },
                      { value: 'pending_payment', label: 'En attente' },
                      { value: 'funds_secured', label: 'Sécurisés' },
                      { value: 'order_placed', label: 'Commandés' },
                      { value: 'in_transit', label: 'En transit' },
                      { value: 'delivered', label: 'Livrés' },
                      { value: 'completed', label: 'Terminés' },
                      { value: 'disputed', label: 'Litiges' }
                    ].map(filter => (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition ${
                          statusFilter === filter.value
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Transactions Table */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-white/40 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransactions.map((transaction, index) => (
                    <motion.tr
                      key={transaction._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-white/5 transition cursor-pointer"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono font-medium text-white">
                            {transaction.reference}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{transaction.client.name}</p>
                        <p className="text-sm text-white/40">{transaction.client.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">
                          {transaction.amount.toLocaleString('fr-FR')} FCFA
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={transaction.status} />
                      </td>
                      <td className="px-6 py-4 text-white/60">
                        {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 rounded-lg hover:bg-white/10 transition">
                          <Eye className="w-4 h-4 text-white/60" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">Aucune transaction trouvée</p>
                </div>
              )}
            </div>
          </GlassCard>
        </main>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <TransactionModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
