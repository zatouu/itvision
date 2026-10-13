'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, Loader2, Share2, Users, X } from 'lucide-react'
import { formatFcfa } from '@/components/market/storefront/formatFcfa'

type Reservation = { id: string; name: string; phone: string; qty: number; note?: string; status: string; createdAt: string }
type Campaign = {
  code: string
  url: string
  groupId: string
  productName: string
  productImage?: string
  resalePrice: number
  deposit?: number
  message?: string
  closed: boolean
  reservedQty: number
  reservations: Reservation[]
  group: null | { status: string; deadline: string; currentQty: number; targetQty: number; currentUnitPrice: number; myQty: number; myUnitPrice?: number; myPaymentStatus?: string; shippingMethod?: string; transportPerPiece?: number; transportIsReal?: boolean }
}

const SHIP: Record<string, string> = { express_3j: 'Avion express 3 à 5 j', air_15j: 'Avion 10 à 15 j', maritime_60j: 'Bateau groupé 45 à 50 j' }

const RES_STATUS: Record<string, string> = { reserved: 'Réservé', confirmed: 'Confirmé', cancelled: 'Annulé' }

export default function PreordersPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState('')
  const [draft, setDraft] = useState<{ groupId: string; price: string; deposit: string; message: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/market/preorders', { credentials: 'include' })
    if (res.status === 401) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d.success) setError(d.error || 'Chargement impossible')
    else setCampaigns(d.campaigns)
  }, [])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const groupId = sp.get('groupId')
    if (groupId && /^GRP-[\w-]{3,40}$/.test(groupId)) {
      setDraft({ groupId, price: sp.get('price')?.replace(/\D/g, '') || '', deposit: '', message: '' })
    }
    void load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft) return
    setBusy('create'); setNotice(null)
    try {
      const res = await fetch('/api/market/preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId: draft.groupId, resalePrice: Number(draft.price), deposit: draft.deposit || undefined, message: draft.message || undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) throw new Error(d.error || 'Création impossible')
      setDraft(null)
      window.history.replaceState(null, '', '/compte/precommandes')
      setNotice({ ok: true, text: 'Page de précommande prête : partagez le lien à vos clients.' })
      await load()
    } catch (err: any) {
      setNotice({ ok: false, text: err.message })
    } finally {
      setBusy('')
    }
  }

  const act = async (key: string, fn: () => Promise<Response>, ok: string) => {
    setBusy(key); setNotice(null)
    try {
      const res = await fn()
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.success === false) throw new Error(d.error || 'Erreur')
      setNotice({ ok: true, text: ok })
      await load()
    } catch (err: any) {
      setNotice({ ok: false, text: err.message })
    } finally {
      setBusy('')
    }
  }

  const patch = (code: string, body: object) => fetch(`/api/market/preorders/${code}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
  })

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000) } catch {}
  }

  const shareText = (c: Campaign) =>
    `${c.productName} à ${formatFcfa(c.resalePrice)}. Arrivage en cours, réservez votre pièce ici : ${c.url}`

  if (error) return <div className="mx-auto max-w-lg p-6 text-center text-sm text-red-600">{error}</div>
  if (!campaigns) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <Link href="/compte" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><ArrowLeft className="h-3.5 w-3.5" /> Mon compte</Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Mes précommandes clients</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Vos clients réservent à votre prix avant la clôture ; vous commandez la bonne quantité dans l&apos;achat groupé. Votre prix d&apos;achat DDM+ n&apos;apparaît jamais sur leur page.</p>
        </div>

        {notice && (
          <div className={`rounded-xl border p-3 text-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.text}</div>
        )}

        {draft && (
          <form onSubmit={create} className="space-y-3 rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Ouvrir les précommandes · {draft.groupId}</p>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Mon prix de vente par pièce (FCFA)
              <input required type="number" min={100} value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Acompte demandé (facultatif, réglé directement avec vous)
              <input type="number" min={0} value={draft.deposit} onChange={e => setDraft({ ...draft, deposit: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Message à vos clients (facultatif)
              <textarea value={draft.message} maxLength={300} rows={2} onChange={e => setDraft({ ...draft, message: e.target.value })} placeholder="Livraison à Dakar dès l'arrivage, couleurs au choix…" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <div className="flex gap-2">
              <button disabled={busy === 'create'} className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-60">{busy === 'create' ? '…' : 'Créer ma page de précommande'}</button>
              <button type="button" onClick={() => setDraft(null)} className="h-11 rounded-xl border border-slate-300 px-4 text-sm">Annuler</button>
            </div>
          </form>
        )}

        {campaigns.length === 0 && !draft && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Ouvrez un achat groupé, cliquez sur « Je revends » puis « Ouvrir les précommandes à mes clients ».
            <div className="mt-3"><Link href="/achats-groupes" className="font-semibold text-emerald-700 hover:underline">Voir les achats groupés</Link></div>
          </div>
        )}

        {campaigns.map(c => {
          const g = c.group
          const groupOpen = !!g && g.status === 'open' && new Date(g.deadline) > new Date()
          const missing = Math.max(0, c.reservedQty - (g?.myQty || 0))
          const unit = (g?.myUnitPrice || g?.currentUnitPrice || 0) + (g?.transportPerPiece || 0)
          return (
            <div key={c.code} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                {c.productImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.productImage} alt="" className="h-14 w-14 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{c.productName}</p>
                  <p className="text-[12px] text-slate-500">Mon prix : <b>{formatFcfa(c.resalePrice)}</b>{unit ? ` · revient ${formatFcfa(unit)} · marge ${formatFcfa(c.resalePrice - unit)}/pc` : ''}</p>
                  {g?.shippingMethod && (
                    <p className="text-[11px] text-slate-400">
                      {SHIP[g.shippingMethod] || g.shippingMethod}{g.transportPerPiece ? ` · transport ${g.transportIsReal ? 'réel' : 'estimé'} ${formatFcfa(g.transportPerPiece)}/pc` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><p className="text-[10px] uppercase text-slate-500">Réservé</p><p className="text-lg font-extrabold tabular-nums dark:text-white">{c.reservedQty}</p></div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><p className="text-[10px] uppercase text-slate-500">Dans le groupe</p><p className="text-lg font-extrabold tabular-nums dark:text-white">{g?.myQty || 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><p className="text-[10px] uppercase text-slate-500">Bénéfice prévu</p><p className="text-sm font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{unit ? formatFcfa((c.resalePrice - unit) * c.reservedQty) : '—'}</p></div>
              </div>

              {groupOpen && missing > 0 && (
                g!.myQty > 0 ? (
                  <button
                    disabled={busy === `qty:${c.code}`}
                    onClick={() => act(`qty:${c.code}`, () => fetch(`/api/group-orders/${c.groupId}/quantity`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ addQty: missing }),
                    }), `${missing} pièce(s) ajoutée(s) à votre participation.`)}
                    className="mt-3 h-11 w-full rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Ajouter {missing} pièce{missing > 1 ? 's' : ''} à ma participation
                  </button>
                ) : (
                  <Link href={`/achats-groupes/${c.groupId}?qty=${c.reservedQty}`} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
                    Rejoindre le groupe avec {c.reservedQty} pièce{c.reservedQty > 1 ? 's' : ''}
                  </Link>
                )
              )}
              {!groupOpen && g && <p className="mt-3 text-[12px] text-slate-500">Achat groupé clôturé : les réservations sont figées.</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => copy(c.code, c.url)} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700 dark:text-white">
                  {copied === c.code ? <Check size={13} /> : <Copy size={13} />} Copier le lien
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText(c))}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#25D366] px-3 text-xs font-bold text-white">
                  <Share2 size={13} /> WhatsApp
                </a>
                <button onClick={() => setDraft({ groupId: c.groupId, price: String(c.resalePrice), deposit: c.deposit ? String(c.deposit) : '', message: c.message || '' })} className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700 dark:text-white">
                  Modifier
                </button>
                {groupOpen && (
                  <button onClick={() => act(`close:${c.code}`, () => patch(c.code, { closed: !c.closed }), c.closed ? 'Précommandes rouvertes' : 'Précommandes fermées')} className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700 dark:text-white">
                    {c.closed ? 'Rouvrir' : 'Fermer'}
                  </button>
                )}
              </div>

              {c.reservations.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {c.reservations.map(r => (
                    <li key={r.id} className={`flex items-center justify-between gap-2 py-2 ${r.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white"><Users size={12} className="mr-1 inline" />{r.name} · {r.qty} pc{r.qty > 1 ? 's' : ''}</p>
                        <p className="truncate text-[11px] text-slate-500"><a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>{r.note ? ` · ${r.note}` : ''}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-500">{RES_STATUS[r.status] || r.status}</span>
                        {r.status === 'reserved' && (
                          <button title="Confirmer" onClick={() => act(`r:${r.id}`, () => patch(c.code, { reservationId: r.id, status: 'confirmed' }), 'Réservation confirmée')} className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Check size={14} /></button>
                        )}
                        {r.status !== 'cancelled' && (
                          <button title="Annuler" onClick={() => act(`r:${r.id}`, () => patch(c.code, { reservationId: r.id, status: 'cancelled' }), 'Réservation annulée')} className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600"><X size={14} /></button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
