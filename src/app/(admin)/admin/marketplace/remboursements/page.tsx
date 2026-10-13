'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { RotateCw, Undo2, Users, PackageX, CheckCircle2, Loader2 } from 'lucide-react'

type OrderRefund = { orderId: string; clientName: string; clientPhone: string; refundAmount?: number; total: number; paymentMethod?: string; transactionId?: string; status: string; updatedAt: string }
type GroupRefund = { groupId: string; productName?: string; participantId: string; name: string; phone: string; amount: number; paymentMethod?: string; transactionId?: string; overpaid?: boolean }
type ReturnRefund = { returnId: string; orderId: string; name?: string; phone?: string; reason: string; items: string[]; suggestedAmount: number; refundable: number; paymentMethod?: string }
type Done = { orderId: string; clientName: string; clientPhone: string; refundAmount?: number; refundReference?: string; refundedAt?: string; refundedBy?: string }

const OPERATOR: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', paydunya: 'PayDunya', cash: 'Espèces' }
const fcfa = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} FCFA`
const op = (m?: string) => (m ? OPERATOR[m] || m : 'moyen inconnu')

export default function AdminMarketRefundsPage() {
  const [tab, setTab] = useState<'orders' | 'groups' | 'returns' | 'done'>('orders')
  const [orders, setOrders] = useState<OrderRefund[]>([])
  const [groups, setGroups] = useState<GroupRefund[]>([])
  const [returns, setReturns] = useState<ReturnRefund[]>([])
  const [done, setDone] = useState<Done[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refs, setRefs] = useState<Record<string, string>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch('/api/admin/market/refunds').then(r => r.json())
      if (!data.success) throw new Error(data.error)
      setOrders(data.orders || [])
      setGroups(data.groups || [])
      setReturns(data.returns || [])
      setDone(data.done || [])
      setTotalPending(data.totalPending || 0)
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

  const patch = (body: object) => fetch('/api/admin/market/refunds', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })

  const refundReturn = (r: ReturnRefund) => run(r.returnId, () => fetch(`/api/returns/${r.returnId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'refunded',
      refundAmount: Number(amounts[r.returnId] ?? r.suggestedAmount),
      refundMethod: 'original',
      refundTransactionId: refs[r.returnId] || '',
    }),
  }), 'Retour remboursé, client prévenu.')

  const refInput = (id: string) => (
    <input value={refs[id] || ''} onChange={e => setRefs(r => ({ ...r, [id]: e.target.value }))}
      placeholder="Réf. transaction opérateur"
      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:w-56" />
  )

  const doneButton = (id: string, onClick: () => void) => (
    <button onClick={onClick} disabled={acting === id || (refs[id] || '').trim().length < 4}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
      {acting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Remboursé
    </button>
  )

  const tabs = [
    ['orders', `Commandes (${orders.length})`],
    ['groups', `Achats groupés (${groups.length})`],
    ['returns', `Retours (${returns.length})`],
    ['done', 'Historique'],
  ] as const

  return (
    <div className="min-h-screen bg-stone-50 p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">DDM+ · Remboursements clients</h1>
            <p className="mt-1 text-sm text-stone-500">Commandes payées puis annulées, achats groupés annulés et retours reçus. Faites le virement chez l’opérateur, puis saisissez sa référence : le client est prévenu.</p>
          </div>
          <button onClick={load} className="rounded-lg p-2 text-stone-600 hover:bg-white" title="Actualiser"><RotateCw className="h-5 w-5" /></button>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800">À rembourser</p>
          <p className="mt-1 text-xl font-bold text-amber-900">{fcfa(totalPending)}</p>
          <p className="text-xs text-amber-700">{orders.length + groups.length + returns.length} dossier(s)</p>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-stone-200">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-emerald-800 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>{label}</button>
          ))}
        </div>

        {notice && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{notice.text}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>
        ) : tab === 'orders' ? (
          orders.length === 0 ? <Empty text="Aucune commande à rembourser." /> : orders.map(o => (
            <Row key={o.orderId} icon={<Undo2 className="h-5 w-5 text-amber-600" />}
              title={`${fcfa(o.refundAmount || o.total)} · ${op(o.paymentMethod)}`}
              line={<>{o.clientName} · <span className="font-mono">{o.clientPhone}</span></>}
              sub={`Commande ${o.orderId}${o.transactionId ? ` · paiement ${o.transactionId}` : ''} · ${o.status === 'cancelled' ? 'annulée' : o.status}`}>
              {refInput(o.orderId)}
              {doneButton(o.orderId, () => run(o.orderId, () => patch({ kind: 'order', orderId: o.orderId, reference: refs[o.orderId] || '' }), 'Remboursement enregistré, client prévenu.'))}
            </Row>
          ))
        ) : tab === 'groups' ? (
          groups.length === 0 ? <Empty text="Aucun participant à rembourser." /> : groups.map(g => (
            <Row key={g.participantId} icon={<Users className="h-5 w-5 text-amber-600" />}
              title={`${fcfa(g.amount)} · ${op(g.paymentMethod)}`}
              line={<>{g.name} · <span className="font-mono">{g.phone}</span></>}
              sub={`${g.overpaid ? 'Trop-perçu · ' : 'Groupe annulé · '}Achat groupé ${g.groupId}${g.productName ? ` · ${g.productName}` : ''}`}>
              {refInput(g.participantId)}
              {doneButton(g.participantId, () => run(g.participantId, () => patch({ kind: g.overpaid ? 'group_overpay' : 'group', groupId: g.groupId, participantId: g.participantId, reference: refs[g.participantId] || '' }), g.overpaid ? 'Trop-perçu remboursé.' : 'Participant marqué remboursé.'))}
            </Row>
          ))
        ) : tab === 'returns' ? (
          returns.length === 0 ? <Empty text="Aucun retour reçu en attente de remboursement." /> : returns.map(r => (
            <Row key={r.returnId} icon={<PackageX className="h-5 w-5 text-amber-600" />}
              title={`Retour ${r.orderId} · ${op(r.paymentMethod)}`}
              line={<>{r.name || 'Client'} · <span className="font-mono">{r.phone || '—'}</span></>}
              sub={`${r.items.join(', ')} — ${r.reason} · remboursable : ${fcfa(r.refundable)}`}>
              <input type="number" min={1} max={r.refundable}
                value={amounts[r.returnId] ?? String(r.suggestedAmount)}
                onChange={e => setAmounts(a => ({ ...a, [r.returnId]: e.target.value }))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm md:w-32" aria-label="Montant remboursé" />
              {refInput(r.returnId)}
              {doneButton(r.returnId, () => refundReturn(r))}
            </Row>
          ))
        ) : (
          done.length === 0 ? <Empty text="Aucun remboursement effectué." /> : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-left text-xs text-stone-500">
                  <tr><th className="px-4 py-2">Commande</th><th className="px-4 py-2">Client</th><th className="px-4 py-2">Montant</th><th className="px-4 py-2">Référence</th><th className="px-4 py-2">Date</th></tr>
                </thead>
                <tbody>
                  {done.map(d => (
                    <tr key={d.orderId} className="border-t border-stone-100">
                      <td className="px-4 py-2 font-mono text-xs">{d.orderId}</td>
                      <td className="px-4 py-2">{d.clientName}<span className="block text-xs text-stone-400">{d.clientPhone}</span></td>
                      <td className="px-4 py-2 font-semibold">{fcfa(d.refundAmount || 0)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{d.refundReference}</td>
                      <td className="px-4 py-2 text-stone-500">{d.refundedAt ? new Date(d.refundedAt).toLocaleDateString('fr-FR') : ''}</td>
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

function Row({ icon, title, line, sub, children }: { icon: ReactNode; title: string; line: ReactNode; sub: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 md:flex-row md:items-center">
      <span className="hidden md:block">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-900">{title}</p>
        <p className="text-sm text-stone-600">{line}</p>
        <p className="text-xs text-stone-400">{sub}</p>
      </div>
      {children}
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
