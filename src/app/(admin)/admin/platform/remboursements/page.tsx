'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCw, Undo2, ArrowUpRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type Refund = {
  _id: string
  amountToRefund: number
  provider: string
  refundReason?: string
  refundedAt?: string
  refundReference?: string
  refundDoneAt?: string
  requestId?: string
  orderId?: string
  client: { name?: string; phone?: string; email?: string } | null
}

type Withdrawal = {
  _id: string
  amount: number
  method: string
  phone: string
  createdAt: string
  user: { name?: string; phone?: string; kycVerified?: boolean } | null
}

const OPERATOR: Record<string, string> = { wave: 'Wave', wave_qr: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money' }
const fcfa = (n: number) => `${(n || 0).toLocaleString('fr-FR')} FCFA`

export default function AdminXeuyTreasuryPage() {
  const [tab, setTab] = useState<'refunds' | 'withdrawals' | 'done'>('refunds')
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [done, setDone] = useState<Refund[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refs, setRefs] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, d, w] = await Promise.all([
        fetch('/api/admin/platform/refunds?status=pending').then(x => x.json()),
        fetch('/api/admin/platform/refunds?status=done').then(x => x.json()),
        fetch('/api/admin/withdrawals?status=pending&limit=100').then(x => x.json()),
      ])
      setRefunds(r.items || [])
      setTotalPending(r.totalPending || 0)
      setDone(d.items || [])
      setWithdrawals(w.items || [])
    } catch {
      setNotice({ ok: false, text: 'Chargement impossible' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const run = async (key: string, fn: () => Promise<Response>, okText: string) => {
    setActing(key); setNotice(null)
    try {
      const res = await fn()
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) throw new Error(data.error || 'Erreur')
      setNotice({ ok: true, text: okText })
      setRefs(r => ({ ...r, [key]: '' }))
      await load()
    } catch (e: any) {
      setNotice({ ok: false, text: e.message })
    } finally {
      setActing(null)
    }
  }

  const markRefunded = (p: Refund) => run(p._id, () => fetch('/api/admin/platform/refunds', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: p._id, reference: refs[p._id] || '', method: OPERATOR[p.provider] || p.provider }),
  }), 'Remboursement enregistré, client prévenu.')

  const processWithdrawal = (w: Withdrawal, action: 'process' | 'reject') => {
    let rejectionReason: string | undefined
    if (action === 'reject') {
      rejectionReason = window.prompt('Motif du refus (communiqué au prestataire) :') || undefined
      if (!rejectionReason) return
    }
    return run(w._id, () => fetch(`/api/admin/withdrawals/${w._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payoutReference: refs[w._id] || '', rejectionReason }),
    }), action === 'process' ? 'Retrait marqué versé.' : 'Retrait refusé, montant recrédité.')
  }

  const refInput = (id: string) => (
    <input value={refs[id] || ''} onChange={e => setRefs(r => ({ ...r, [id]: e.target.value }))}
      placeholder="Réf. transaction opérateur"
      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:w-56" />
  )

  return (
    <div className="min-h-screen bg-stone-50 p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Xeuy Bi · Remboursements et retraits</h1>
            <p className="mt-1 text-sm text-stone-500">Missions de services uniquement (la marketplace DDM+ a ses propres retours et reversements vendeurs). Argent à renvoyer aux clients et retraits demandés par les prestataires : effectuez le virement chez l’opérateur, puis saisissez sa référence.</p>
          </div>
          <button onClick={load} className="rounded-lg p-2 text-stone-600 hover:bg-white" title="Actualiser"><RotateCw className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">À rembourser</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{fcfa(totalPending)}</p>
            <p className="text-xs text-amber-700">{refunds.length} client(s)</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-semibold text-sky-800">Retraits à verser</p>
            <p className="mt-1 text-xl font-bold text-sky-900">{fcfa(withdrawals.reduce((s, w) => s + w.amount, 0))}</p>
            <p className="text-xs text-sky-700">{withdrawals.length} demande(s)</p>
          </div>
        </div>

        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-stone-200">
          {([['refunds', `Remboursements (${refunds.length})`], ['withdrawals', `Retraits (${withdrawals.length})`], ['done', 'Historique']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-emerald-800 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>{label}</button>
          ))}
        </div>

        {notice && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{notice.text}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>
        ) : tab === 'refunds' ? (
          refunds.length === 0 ? <Empty text="Aucun remboursement en attente." /> : refunds.map(p => (
            <div key={p._id} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 md:flex-row md:items-center">
              <Undo2 className="hidden h-5 w-5 text-amber-600 md:block" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{fcfa(p.amountToRefund)} · {OPERATOR[p.provider] || p.provider}</p>
                <p className="text-sm text-stone-600">{p.client?.name || 'Client'} · <span className="font-mono">{p.client?.phone || '—'}</span></p>
                <p className="text-xs text-stone-400">{p.refundReason || 'Remboursement'} · décidé le {p.refundedAt ? new Date(p.refundedAt).toLocaleString('fr-FR') : '—'}</p>
              </div>
              {refInput(p._id)}
              <button onClick={() => markRefunded(p)} disabled={acting === p._id || (refs[p._id] || '').trim().length < 4}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {acting === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Remboursé
              </button>
            </div>
          ))
        ) : tab === 'withdrawals' ? (
          withdrawals.length === 0 ? <Empty text="Aucun retrait en attente." /> : withdrawals.map(w => (
            <div key={w._id} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 md:flex-row md:items-center">
              <ArrowUpRight className="hidden h-5 w-5 text-sky-600 md:block" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{fcfa(w.amount)} · {OPERATOR[w.method] || w.method}</p>
                <p className="text-sm text-stone-600">{w.user?.name || 'Prestataire'} · <span className="font-mono">{w.phone}</span>{w.user?.kycVerified ? '' : ' · KYC non vérifié'}</p>
                <p className="text-xs text-stone-400">Demandé le {new Date(w.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              {refInput(w._id)}
              <div className="flex gap-2">
                <button onClick={() => processWithdrawal(w, 'process')} disabled={acting === w._id || (refs[w._id] || '').trim().length < 4}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  <CheckCircle2 className="h-4 w-4" /> Versé
                </button>
                <button onClick={() => processWithdrawal(w, 'reject')} disabled={acting === w._id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <XCircle className="h-4 w-4" /> Refuser
                </button>
              </div>
            </div>
          ))
        ) : (
          done.length === 0 ? <Empty text="Aucun remboursement effectué." /> : (
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-left text-xs text-stone-500">
                  <tr><th className="px-4 py-2">Client</th><th className="px-4 py-2">Montant</th><th className="px-4 py-2">Référence</th><th className="px-4 py-2">Date</th></tr>
                </thead>
                <tbody>
                  {done.map(p => (
                    <tr key={p._id} className="border-t border-stone-100">
                      <td className="px-4 py-2">{p.client?.name || '—'}<span className="block text-xs text-stone-400">{p.client?.phone}</span></td>
                      <td className="px-4 py-2 font-semibold">{fcfa(p.amountToRefund)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{p.refundReference}</td>
                      <td className="px-4 py-2 text-stone-500">{p.refundDoneAt ? new Date(p.refundDoneAt).toLocaleDateString('fr-FR') : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-12 text-center text-stone-400">
      <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />{text}
    </div>
  )
}
