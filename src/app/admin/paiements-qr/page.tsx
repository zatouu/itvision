'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, RotateCw, QrCode, Wallet, Briefcase } from 'lucide-react'

type ManualPayment = {
  _id: string
  amount: number
  reference?: string
  externalId?: string
  phase?: string
  clientId: string
  createdAt: string
}
type ManualTopup = {
  _id: string
  points: number
  bonusCredits?: number
  amountFcfa: number
  reference?: string
  phone: string
  userId: string
  createdAt: string
}

export default function AdminManualPaymentsPage() {
  const [payments, setPayments] = useState<ManualPayment[]>([])
  const [topups, setTopups] = useState<ManualTopup[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/payments/manual')
      const data = await res.json()
      if (data?.success) {
        setPayments(data.payments || [])
        setTopups(data.topups || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (kind: 'payment' | 'topup', id: string, action: 'confirm' | 'reject') => {
    if (action === 'reject' && !window.confirm('Rejeter ce paiement ? Le client sera notifié.')) return
    setActing(`${kind}-${id}`)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.success) {
        setMessage(action === 'confirm' ? 'Paiement confirmé ✔' : 'Paiement rejeté')
        await load()
      } else {
        setMessage(data?.error || 'Erreur')
      }
    } catch {
      setMessage('Erreur réseau')
    }
    setActing(null)
    setTimeout(() => setMessage(null), 4000)
  }

  const total = payments.length + topups.length

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-cyan-600" />
              Paiements Wave QR en attente
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Vérifiez la réception sur le compte Wave Business (montant + référence), puis confirmez.
            </p>
          </div>
          <button onClick={load} className="p-2 text-gray-600 hover:bg-white rounded-lg transition" title="Recharger">
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm font-medium">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-16">Chargement…</div>
        ) : total === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            Aucun paiement en attente de validation.
          </div>
        ) : (
          <>
            {payments.map(p => (
              <div key={p._id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Mission — {p.amount.toLocaleString('fr-FR')} FCFA</div>
                    <div className="text-xs text-gray-500">
                      Réf: <span className="font-mono font-bold text-amber-700">{p.reference || '—'}</span>
                      {' · '}{new Date(p.createdAt).toLocaleString('fr-FR')}
                      {p.phase ? ` · ${p.phase}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act('payment', p._id, 'confirm')}
                    disabled={acting === `payment-${p._id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmer
                  </button>
                  <button
                    onClick={() => act('payment', p._id, 'reject')}
                    disabled={acting === `payment-${p._id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Rejeter
                  </button>
                </div>
              </div>
            ))}

            {topups.map(tp => (
              <div key={tp._id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Recharge XC — {tp.amountFcfa.toLocaleString('fr-FR')} FCFA → {tp.points + (tp.bonusCredits || 0)} crédits
                    </div>
                    <div className="text-xs text-gray-500">
                      Réf: <span className="font-mono font-bold text-amber-700">{tp.reference || '—'}</span>
                      {' · '}{tp.phone}
                      {' · '}{new Date(tp.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act('topup', tp._id, 'confirm')}
                    disabled={acting === `topup-${tp._id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmer
                  </button>
                  <button
                    onClick={() => act('topup', tp._id, 'reject')}
                    disabled={acting === `topup-${tp._id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Rejeter
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
