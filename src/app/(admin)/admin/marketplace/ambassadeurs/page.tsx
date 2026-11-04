'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Loader2, RotateCw } from 'lucide-react'

type Row = {
  ambassadorUserId: string
  code: string
  name: string
  phone?: string
  email?: string
  sales: number
  revenue: number
  pending: number
  validated: number
  requested: number
  paid: number
  payoutMethod?: string
  payoutPhone?: string
  lastSaleAt?: string
}

const OPERATOR: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money' }
const fcfa = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} FCFA`

export default function AdminAmbassadorsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [refs, setRefs] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch('/api/admin/market/ambassadors').then(r => r.json())
      if (!data.success) throw new Error(data.error)
      setRows(data.ambassadors || [])
    } catch {
      setNotice({ ok: false, text: 'Chargement impossible' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const markPaid = async (r: Row) => {
    setActing(r.ambassadorUserId); setNotice(null)
    try {
      const res = await fetch('/api/admin/market/ambassadors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambassadorUserId: r.ambassadorUserId, reference: refs[r.ambassadorUserId] || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur')
      setNotice({ ok: true, text: `${fcfa(data.amount)} marqués versés, ambassadeur prévenu.` })
      setRefs(x => ({ ...x, [r.ambassadorUserId]: '' }))
      await load()
    } catch (e: any) {
      setNotice({ ok: false, text: e.message })
    } finally {
      setActing(null)
    }
  }

  const toPay = rows.filter(r => r.requested > 0)
  const totalDue = toPay.reduce((s, r) => s + r.requested, 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><Gift className="h-6 w-6 text-emerald-600" /> Ambassadeurs DDM+</h1>
          <p className="text-sm text-stone-600">Commission sur les ventes payées via un lien ?ref= ; validée à la livraison, annulée si la vente est annulée ou remboursée.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
          <RotateCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {notice && (
        <div className={`rounded-xl border p-3 text-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.text}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
      ) : (
        <>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-bold text-stone-900">Versements demandés : {fcfa(totalDue)}</h2>
            {toPay.length === 0 ? (
              <p className="mt-1 text-sm text-stone-600">Aucune demande en attente.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {toPay.map(r => (
                  <div key={r.ambassadorUserId} className="flex flex-col gap-2 rounded-xl bg-white p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-stone-900">{r.name} <span className="font-mono text-xs text-stone-500">({r.code})</span></p>
                      <p className="text-sm text-stone-600">
                        {fcfa(r.requested)} par {OPERATOR[r.payoutMethod || ''] || r.payoutMethod || '—'} au {r.payoutPhone || r.phone || '—'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        value={refs[r.ambassadorUserId] || ''}
                        onChange={e => setRefs(x => ({ ...x, [r.ambassadorUserId]: e.target.value }))}
                        placeholder="Réf. transaction opérateur"
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:w-56"
                      />
                      <button
                        onClick={() => markPaid(r)}
                        disabled={acting === r.ambassadorUserId || (refs[r.ambassadorUserId] || '').trim().length < 4}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        Versement effectué
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Ambassadeur</th>
                  <th className="px-4 py-3 text-right">Ventes</th>
                  <th className="px-4 py-3 text-right">CA généré</th>
                  <th className="px-4 py-3 text-right">En attente</th>
                  <th className="px-4 py-3 text-right">Validé</th>
                  <th className="px-4 py-3 text-right">Versé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Aucune vente ambassadeur pour l&apos;instant.</td></tr>
                )}
                {rows.map(r => (
                  <tr key={r.ambassadorUserId}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-900">{r.name}</p>
                      <p className="text-xs text-stone-500"><span className="font-mono">{r.code}</span>{r.phone ? ` · ${r.phone}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.sales}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fcfa(r.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fcfa(r.pending)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fcfa(r.validated)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fcfa(r.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}
