'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, CheckCircle2, Factory, Loader2, Search, Upload } from 'lucide-react'
import type { PricelistPlan, PricelistRow } from '@/lib/market/supplier-pricelists/import'

type ListInfo = { id: string; supplier: PricelistPlan['supplier']; families: number }
type Filter = 'all' | 'checked' | 'flagged'

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`
const pct = (n: number) => `${n > 0 ? '+' : ''}${n} %`

const STATUS: Record<PricelistRow['status'], { label: string; cls: string }> = {
  new: { label: 'Nouvelle fiche', cls: 'bg-sky-100 text-sky-800' },
  update: { label: 'Mise à jour', cls: 'bg-amber-100 text-amber-800' },
  unchanged: { label: 'À jour', cls: 'bg-stone-200 text-stone-700' },
  skipped: { label: 'Écartée', cls: 'bg-stone-200 text-stone-600' },
}

const COMPETITIVENESS: Record<PricelistRow['pricing']['competitiveness'], { label: string; cls: string } | null> = {
  ok: null,
  'marge plancher': { label: 'Marge plancher : peu de gain', cls: 'bg-amber-100 text-amber-900' },
  'plus cher que Dakar': { label: 'Plus cher que Dakar', cls: 'bg-red-100 text-red-800' },
}

function gapCls(gap: number) {
  if (gap >= 0) return 'text-red-700'
  if (gap > -15) return 'text-amber-700'
  return 'text-emerald-700'
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-stone-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="truncate text-sm font-bold tabular-nums text-stone-900">{value}</p>
      {hint && <p className="text-[11px] leading-snug text-stone-500">{hint}</p>}
    </div>
  )
}

function FamilyCard({ row, checked, onToggle }: { row: PricelistRow; checked: boolean; onToggle: () => void }) {
  const warn = COMPETITIVENESS[row.pricing.competitiveness]
  const source = { marché: 'Calé sur Dakar', comparable: 'Calé sur un produit comparable', estimé: 'Estimé (pas de relevé)' }[row.pricing.source]
  return (
    <div className={`rounded-2xl border bg-white p-4 ${checked ? 'border-emerald-300' : 'border-stone-200 opacity-80'}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Importer ${row.name}`} className="mt-1 h-5 w-5 shrink-0 accent-emerald-600" />
        <Image src={row.image} alt="" width={64} height={64} className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 object-contain sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-stone-900">{row.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${STATUS[row.status].cls}`}>{STATUS[row.status].label}</span>
            {row.isPublished !== undefined && (
              <span className={`rounded-full px-2 py-0.5 ${row.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{row.isPublished ? 'Publiée' : 'Brouillon'}</span>
            )}
            {row.corporate && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800">B2B IT Vision</span>}
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">{source} · marge {row.pricing.marginRate} %</span>
            {warn && <span className={`rounded-full px-2 py-0.5 ${warn.cls}`}>{warn.label}</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Lot minimum" value={`${row.minOrder.qty} unité${row.minOrder.qty > 1 ? 's' : ''}`} hint={row.minOrder.explanation} />
        <Metric label="Prix catalogue" value={fcfa(row.unitFcfa)} hint="variante de base, hors frais et transport" />
        <Metric label="Payé / unité au lot" value={fcfa(row.atMin.paidFcfa)} hint={`dont ${row.atMin.shippingMode} ${fcfa(row.atMin.shippingFcfa)}`} />
        <Metric label="Gain DDM / unité" value={fcfa(row.atMin.gainFcfa)} hint={`coût usine ${fcfa(row.atMin.costFcfa)}`} />
      </div>

      {(row.pricing.tiers.length > 0 || row.seaAtBulk.qty > row.minOrder.qty) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-stone-700">
          {row.pricing.tiers.map(t => (
            <span key={t.minQty} className="rounded-lg border border-stone-200 px-2 py-1 tabular-nums">dès {t.minQty} : {fcfa(t.unitFcfa)} · payé {fcfa(t.paidFcfa)}</span>
          ))}
          <span className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 tabular-nums text-sky-900">maritime groupé ({row.seaAtBulk.qty}) : payé {fcfa(row.seaAtBulk.paidFcfa)}</span>
        </div>
      )}

      {row.market.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {row.market.map(m => (
            <div key={m.variant} className="rounded-lg border border-stone-200 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold text-stone-800">{m.variant}{m.comparableTo ? ` (via ${m.comparableTo})` : ''}</span>
                <span className="tabular-nums text-stone-700">
                  Dakar {fcfa(m.marketFcfa)} · DDM <span className={`font-bold ${gapCls(m.gapAtMinPercent)}`}>{fcfa(m.paidAtMinFcfa)} ({pct(m.gapAtMinPercent)})</span>
                  {m.paidAtBulkFcfa !== m.paidAtMinFcfa && <> · gros <span className={`font-bold ${gapCls(m.gapAtBulkPercent)}`}>{fcfa(m.paidAtBulkFcfa)} ({pct(m.gapAtBulkPercent)})</span></>}
                </span>
              </div>
              <p className="mt-0.5 break-words text-stone-500">
                {m.shops.map((s, i) => (
                  <span key={s.url}>{i > 0 && ' · '}<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-stone-300 hover:text-stone-800">{s.shop}</a> {fcfa(s.fcfa)}</span>
                ))}
              </p>
            </div>
          ))}
        </div>
      )}

      {row.question && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> À confirmer avec l&apos;usine : {row.question}
        </p>
      )}

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-semibold text-stone-600">{row.variants.length} variante{row.variants.length > 1 ? 's' : ''} · groupe {row.groupBuy.minQty}–{row.groupBuy.targetQty}</summary>
        <ul className="mt-2 divide-y divide-stone-100">
          {row.variants.map(v => (
            <li key={v.name} className="flex flex-wrap justify-between gap-x-3 py-1 tabular-nums">
              <span className="text-stone-800">{v.name}</span>
              <span className="text-stone-600">{v.cny} ¥ · MOQ usine {v.factoryMoq} · {fcfa(v.unitFcfa)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export default function AdminSupplierPricelistsPage() {
  const [lists, setLists] = useState<ListInfo[]>([])
  const [listId, setListId] = useState<string>('')
  const [plan, setPlan] = useState<PricelistPlan | null>(null)
  const [canApply, setCanApply] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [publish, setPublish] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const receive = useCallback((d: { lists: ListInfo[]; plan: PricelistPlan; canApply: boolean }, resetSelection: boolean) => {
    setLists(d.lists)
    setPlan(d.plan)
    setListId(d.plan.id)
    setCanApply(d.canApply)
    if (resetSelection) setChecked(new Set(d.plan.rows.filter(r => r.recommended).map(r => r.key)))
  }, [])

  const load = useCallback(async (id?: string) => {
    setLoading(true); setNotice(null)
    try {
      const d = await fetch(`/api/admin/supplier-pricelists${id ? `?id=${encodeURIComponent(id)}` : ''}`).then(r => r.json())
      if (!d.success) throw new Error(d.error)
      receive(d, true)
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Chargement impossible' })
    } finally {
      setLoading(false)
    }
  }, [receive])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr')
    return (plan?.rows || []).filter(r =>
      (!q || r.name.toLocaleLowerCase('fr').includes(q) || r.key.includes(q)) &&
      (filter === 'all' || (filter === 'checked' ? checked.has(r.key) : r.pricing.competitiveness !== 'ok' || !!r.question)))
  }, [plan, query, filter, checked])

  const toggle = (key: string) => setChecked(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const apply = async () => {
    if (!plan || checked.size === 0) return
    const message = `Appliquer ${checked.size} famille(s) de la grille ${plan.supplier.name} en base de PRODUCTION ?\n\n` +
      `${publish ? 'Les fiches seront PUBLIÉES sur ddm.sn.' : 'Les nouvelles fiches restent en brouillon.'}\n` +
      'Les fiches existantes reçoivent les nouveaux prix, paliers, lots minimums et variantes.'
    if (!window.confirm(message)) return
    setApplying(true); setNotice(null)
    try {
      const res = await fetch('/api/admin/supplier-pricelists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, confirm: plan.id, keys: Array.from(checked), publish }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) throw new Error(d.error || 'Import impossible')
      receive(d, false)
      const t = (d.plan as PricelistPlan).totals
      setNotice({ ok: true, text: `Import appliqué : ${t.new} fiche(s) créée(s), ${t.update} mise(s) à jour, ${t.unchanged} déjà à jour, ${t.skipped} écartée(s).` })
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Import impossible' })
    } finally {
      setApplying(false)
    }
  }

  const rules = plan?.rules.pricing

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><Factory className="h-6 w-6 shrink-0 text-emerald-600" /> Grilles fournisseurs</h1>
          <p className="text-sm text-stone-600">Prix de gros DDM calés sur Dakar, lots minimums et paliers, avant import dans le catalogue de production.</p>
        </div>
        {lists.length > 1 && (
          <select value={listId} onChange={e => load(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm sm:w-auto">
            {lists.map(l => <option key={l.id} value={l.id}>{l.supplier.name}</option>)}
          </select>
        )}
      </div>

      {notice && (
        <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />} {notice.text}
        </div>
      )}

      {loading || !plan || !rules ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
              <p className="font-semibold text-stone-900">{plan.supplier.name}</p>
              <p className="text-xs text-stone-500">Grille du {plan.supplier.priceListDate}, reçue le {plan.supplier.receivedAt} · prix EXW Dongguan · {plan.totals.families} familles ({plan.totals.corporate} aussi en B2B)</p>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-xs">
                <li>Payé par le client au lot minimum (frais, remise quantité et transport estimé compris) : <b>{Math.round(rules.entryDiscount * 100)} % sous Dakar</b>.</li>
                <li>Paliers dégressifs jusqu&apos;à <b>{Math.round(rules.bulkDiscount * 100)} % sous Dakar</b> en gros volume, pas au-delà (la marge laissée ne rend pas l&apos;offre plus attractive).</li>
                <li>Marge produit jamais sous <b>{rules.minMarginRate} %</b>. Familles sans relevé ni produit comparable : <b>{plan.rules.fallbackMarginRate} %</b> (1er quartile des familles relevées).</li>
                <li>Lot minimum : ligne d&apos;au moins 10 000 F, MOQ usine réparti sur 10 acheteurs au plus, articles lourds en maritime seulement.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <p className="font-semibold">Avant de cocher</p>
              <p className="mt-1">Sont décochées les familles <b>plus chères que Dakar</b> et celles en <b>marge plancher</b> qui rapportent moins de 2 000 F par unité : le fret aérien pèse trop lourd pour leur valeur. Elles ne deviennent rentables qu&apos;en achat groupé maritime ou avec un meilleur prix usine. Les transports sont des estimations (poids et volumes ajustés à la pesée).</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-stone-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une famille" className="w-full rounded-lg border border-stone-300 py-2 pe-3 ps-9 text-sm focus:border-emerald-500 focus:outline-none" />
            </label>
            <select value={filter} onChange={e => setFilter(e.target.value as Filter)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
              <option value="all">Toutes les familles</option>
              <option value="checked">Cochées</option>
              <option value="flagged">À vérifier (marge, prix, questions)</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setChecked(new Set(plan.rows.filter(r => r.recommended).map(r => r.key)))} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold sm:flex-none">Recommandées</button>
              <button type="button" onClick={() => setChecked(new Set())} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold sm:flex-none">Aucune</button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {rows.map(r => <FamilyCard key={r.key} row={r} checked={checked.has(r.key)} onToggle={() => toggle(r.key)} />)}
            {rows.length === 0 && <p className="text-sm text-stone-500">Aucune famille ne correspond.</p>}
          </div>
        </>
      )}

      {plan && (
        <div className="sticky bottom-0 z-30 -mx-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-stone-900">{checked.size} famille{checked.size > 1 ? 's' : ''} cochée{checked.size > 1 ? 's' : ''}</span>
              <label className="flex items-center gap-2 text-stone-700">
                <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Publier directement sur ddm.sn
              </label>
            </div>
            <button
              type="button"
              onClick={apply}
              disabled={!canApply || applying || checked.size === 0}
              title={canApply ? undefined : 'Réservé aux administrateurs'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Appliquer en base (production)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
