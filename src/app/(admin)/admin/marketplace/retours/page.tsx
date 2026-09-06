'use client'

import { useEffect, useState } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import { RefreshCw, Loader2, CheckCircle, XCircle, Truck, Package } from 'lucide-react'

interface ReturnItem {
  productId: string
  name: string
  qty: number
}

interface ReturnRequest {
  _id: string
  orderReference: string
  clientName?: string
  clientPhone?: string
  reason: string
  details?: string
  status: string
  items: ReturnItem[]
  createdAt: string
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ReturnRequest | null>(null)
  const [updating, setUpdating] = useState(false)
  const [filter, setFilter] = useState('requested')

  const loadReturns = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/returns?status=${filter}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setReturns(data.returns || [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReturns() }, [filter])

  const updateStatus = async (id: string, status: string, adminNotes?: string) => {
    try {
      setUpdating(true)
      const res = await fetch(`/api/returns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, adminNotes })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      await loadReturns()
      setSelected(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUpdating(false)
    }
  }

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      requested: 'Demandée',
      approved: 'Approuvée',
      rejected: 'Rejetée',
      in_transit: 'En transit',
      received: 'Reçue',
      refunded: 'Remboursée',
      closed: 'Clôturée'
    }
    return labels[status] || status
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-amber-100 text-amber-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'in_transit': return 'bg-purple-100 text-purple-800'
      case 'received': return 'bg-emerald-100 text-emerald-800'
      case 'refunded': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-stone-100 text-stone-800'
    }
  }

  return (
    <div className="pt-2 pb-6">
      <Breadcrumb backHref="/admin/marketplace" backLabel="Retour marketplace" />

      <div className="max-w-6xl mx-auto px-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-amber-600" />
            Gestion des retours
          </h1>
          <div className="flex gap-2">
            {['requested', 'approved', 'in_transit', 'received', 'refunded', 'all'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === s ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              >
                {s === 'all' ? 'Tous' : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-500">
            Aucune demande de retour pour ce filtre.
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                      <span className="text-sm font-medium text-stone-900">{r.orderReference}</span>
                    </div>
                    <p className="text-sm text-stone-600 mt-1">{r.clientName} · {r.clientPhone}</p>
                    <p className="text-sm text-stone-700 mt-1">
                      <span className="font-medium">Raison:</span> {r.reason}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {r.items.length} article{r.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelected(r)}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                    >
                      Traiter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Traiter le retour {selected.orderReference}</h2>
            <div className="space-y-3 mb-4">
              <p className="text-sm"><span className="font-medium">Client:</span> {selected.clientName}</p>
              <p className="text-sm"><span className="font-medium">Raison:</span> {selected.reason}</p>
              {selected.details && <p className="text-sm text-stone-600">{selected.details}</p>}
              <div className="text-sm">
                <span className="font-medium">Articles:</span>
                <ul className="mt-1 space-y-1">
                  {selected.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-stone-600">
                      <Package className="h-4 w-4" /> {item.name} (x{item.qty})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {selected.status === 'requested' && (
                <>
                  <button
                    disabled={updating}
                    onClick={() => updateStatus(selected._id, 'approved')}
                    className="flex items-center justify-center gap-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" /> Approuver
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => updateStatus(selected._id, 'rejected')}
                    className="flex items-center justify-center gap-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Rejeter
                  </button>
                </>
              )}
              {selected.status === 'approved' && (
                <button
                  disabled={updating}
                  onClick={() => updateStatus(selected._id, 'in_transit')}
                  className="col-span-2 flex items-center justify-center gap-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  <Truck className="h-4 w-4" /> En transit
                </button>
              )}
              {selected.status === 'in_transit' && (
                <button
                  disabled={updating}
                  onClick={() => updateStatus(selected._id, 'received')}
                  className="col-span-2 flex items-center justify-center gap-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Package className="h-4 w-4" /> Reçu
                </button>
              )}
              {selected.status === 'received' && (
                <button
                  disabled={updating}
                  onClick={() => updateStatus(selected._id, 'refunded')}
                  className="col-span-2 flex items-center justify-center gap-1 bg-emerald-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" /> Rembourser
                </button>
              )}
            </div>

            <button
              onClick={() => setSelected(null)}
              disabled={updating}
              className="w-full py-2 border border-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
