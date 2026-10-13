'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Loader2, RotateCw, Users, ShoppingCart, Gift, Store, TrendingUp } from 'lucide-react'

type Funnel = {
  days: number
  funnel: { sessions: number; mobileSessions: number; groupSessions: number; checkoutSessions: number; interests: number; joins: number; paidParticipants: number }
  groups: { created: number; filled: number; cancelled: number; open: number; paidAmount: number; viaAmbassador: number; viaReseller: number }
  orders: { created: number; paid: number; paidAmount: number; viaAmbassador: number }
  payments: { marketplace: { amount: number; count: number }; group: { amount: number; count: number } }
  ambassadors: Array<{ ambassadorUserId: string; name: string; code: string; sales: number; revenue: number; commission: number }>
  resellers: Array<{ ownerUserId: string; name: string; shopSlug: string | null; reservations: number; confirmed: number; qty: number; amount: number }>
  topGroups: Array<{ groupId: string; name: string; status: string; joins: number; paid: number; currentQty: number; minQty: number; deadline: string }>
}

const PERIODS = [7, 30, 90]
const fcfa = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} F`
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : '—')

export default function AdminMarketFunnelPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Funnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/market/funnel?days=${days}`).then(r => r.json())
      if (!res.success) throw new Error(res.error || 'Chargement impossible')
      setData(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const f = data?.funnel
  const steps = f ? [
    { label: 'Visiteurs marketplace', value: f.sessions, hint: `${pct(f.mobileSessions, f.sessions)} sur mobile` },
    { label: 'Ont vu un achat groupé', value: f.groupSessions, hint: pct(f.groupSessions, f.sessions) },
    { label: 'Inscriptions à un groupe', value: f.joins, hint: pct(f.joins, f.groupSessions) },
    { label: 'Participants payés', value: f.paidParticipants, hint: pct(f.paidParticipants, f.joins) },
  ] : []
  const max = Math.max(1, ...steps.map(s => s.value))

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><BarChart3 className="h-6 w-6 text-emerald-600" /> Tunnel DDM+</h1>
          <p className="text-sm text-stone-600">Du visiteur au paiement : où l&apos;on perd des acheteurs, qui fait vendre.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setDays(p)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${days === p ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-50'}`}
              >
                {p} j
              </button>
            ))}
          </div>
          <button onClick={load} aria-label="Actualiser" className="rounded-lg border border-stone-300 p-2 text-stone-700 hover:bg-stone-50">
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading || !data ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
      ) : (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-500">Achat groupé</h2>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={s.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-stone-800">{i + 1}. {s.label}</span>
                    <span className="tabular-nums text-stone-900"><b>{s.value.toLocaleString('fr-FR')}</b> <span className="text-xs text-stone-500">{s.hint}</span></span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(2, (s.value / max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-500">
              Visiteurs uniques sur la période (pages /produits, /achats-groupes, /boutiques, /panier, /checkout, /precommande).
              {f && f.interests > 0 ? ` ${f.interests} « Préviens-moi » laissés sur la période.` : ''}
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={Users} label="Groupes créés" value={String(data.groups.created)} sub={`${data.groups.filled} complétés · ${data.groups.cancelled} annulés`} />
            <Kpi icon={TrendingUp} label="Encaissé groupes" value={fcfa(data.payments.group.amount)} sub={`${data.payments.group.count} paiements`} />
            <Kpi icon={ShoppingCart} label="Commandes directes" value={`${data.orders.paid} / ${data.orders.created}`} sub={`payées · ${pct(data.orders.paid, data.orders.created)}`} />
            <Kpi icon={TrendingUp} label="Encaissé commandes" value={fcfa(data.payments.marketplace.amount)} sub={`${f?.checkoutSessions || 0} sessions panier ou paiement`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi icon={Gift} label="Ventes apportées par les ambassadeurs" value={String(data.groups.viaAmbassador + data.orders.viaAmbassador)} sub={`${data.groups.viaAmbassador} en groupe · ${data.orders.viaAmbassador} en commande directe`} />
            <Kpi icon={Store} label="Inscriptions via une fiche revendeur" value={String(data.groups.viaReseller)} sub={pct(data.groups.viaReseller, f?.joins || 0) + ' des inscriptions'} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Ranking
              title="Ambassadeurs"
              empty="Aucune vente apportée sur la période."
              href="/admin/marketplace/ambassadeurs"
              rows={data.ambassadors.map(a => ({ key: a.ambassadorUserId, title: a.name, meta: `${a.code} · ${a.sales} vente(s)`, value: fcfa(a.revenue), sub: `commission ${fcfa(a.commission)}` }))}
            />
            <Ranking
              title="Revendeurs (précommandes)"
              empty="Aucune précommande sur la période."
              rows={data.resellers.map(r => ({ key: r.ownerUserId, title: r.name, meta: `${r.reservations} réservation(s) · ${r.confirmed} confirmée(s) · ${r.qty} pièce(s)`, value: fcfa(r.amount), sub: r.shopSlug ? `/boutiques/${r.shopSlug}` : '' }))}
            />
          </div>

          <Ranking
            title="Groupes les plus rejoints"
            empty="Aucune inscription sur la période."
            href="/admin/achats-groupes"
            rows={data.topGroups.map(t => ({
              key: t.groupId,
              title: t.name,
              meta: `${t.groupId} · ${t.status} · ${t.currentQty}/${t.minQty} pièces`,
              value: `${t.joins} inscrit(s)`,
              sub: `${t.paid} payé(s) · ${pct(t.paid, t.joins)}`,
            }))}
          />
        </>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500"><Icon className="h-3.5 w-3.5 text-emerald-600" /> {label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-stone-900">{value}</p>
      {sub && <p className="text-xs text-stone-500">{sub}</p>}
    </div>
  )
}

function Ranking({ title, rows, empty, href }: { title: string; empty: string; href?: string; rows: Array<{ key: string; title: string; meta: string; value: string; sub?: string }> }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">{title}</h2>
        {href && <Link href={href} className="text-xs font-semibold text-emerald-700 hover:underline">Gérer</Link>}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ol className="divide-y divide-stone-100">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">{i + 1}. {r.title}</p>
                <p className="truncate text-xs text-stone-500">{r.meta}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-stone-900">{r.value}</p>
                {r.sub && <p className="text-xs text-stone-500">{r.sub}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
