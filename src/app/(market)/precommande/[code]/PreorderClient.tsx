'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, Clock, Users, Store } from 'lucide-react'
import { formatFcfa } from '@/components/market/storefront/formatFcfa'

type Preorder = {
  code: string
  productName: string
  productImage?: string
  sellerName: string
  shopSlug?: string
  price: number
  deposit?: number
  message?: string
  open: boolean
  closesAt?: string
  transit?: string
  reservedQty: number
}

export default function PreorderClient({ code }: { code: string }) {
  const [p, setP] = useState<Preorder | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<'' | 'new' | 'updated'>('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetch(`/api/market/preorders/${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(d => (d.success ? setP(d.preorder) : setError(d.error || 'Précommande introuvable')))
      .catch(() => setError('Connexion impossible'))
  }, [code])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true); setFormError('')
    try {
      const res = await fetch(`/api/market/preorders/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: `+221 ${phone.replace(/\D/g, '').replace(/^(221|00221)/, '')}`, qty, note: note || undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) setFormError(d.error || 'Réservation impossible')
      else setDone(d.updated ? 'updated' : 'new')
    } catch {
      setFormError('Connexion impossible, réessayez')
    } finally {
      setSending(false)
    }
  }

  if (error) return <div className="mx-auto max-w-md p-8 text-center text-sm text-slate-600">{error}</div>
  if (!p) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>

  const closes = p.closesAt ? new Date(p.closesAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      <div className="mx-auto max-w-md px-4 py-5">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {p.productImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.productImage} alt={p.productName} className="aspect-square w-full object-cover" />
          )}
          <div className="p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
              <Store size={13} /> Précommande chez <b className="text-slate-800 dark:text-slate-200">{p.sellerName}</b>
            </p>
            <h1 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{p.productName}</h1>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{formatFcfa(p.price)}</p>
            {p.message && <p className="mt-2 whitespace-pre-line text-[13px] text-slate-700 dark:text-slate-300">{p.message}</p>}
            <ul className="mt-3 space-y-1.5 text-[12px] text-slate-600 dark:text-slate-400">
              {closes && <li className="flex items-center gap-1.5"><Clock size={13} /> Réservations jusqu&apos;au {closes}{p.transit ? `, puis ${p.transit} de transport` : ''}</li>}
              {p.reservedQty > 0 && <li className="flex items-center gap-1.5"><Users size={13} /> {p.reservedQty} pièce{p.reservedQty > 1 ? 's' : ''} déjà réservée{p.reservedQty > 1 ? 's' : ''}</li>}
            </ul>
          </div>
        </div>

        {done ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 font-bold text-slate-900 dark:text-white">{done === 'updated' ? 'Réservation mise à jour' : 'Réservation enregistrée'}</p>
            <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">{p.sellerName} vous contacte pour confirmer{p.deposit ? ' et convenir de l\'acompte' : ''}.</p>
          </div>
        ) : p.open ? (
          <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Je réserve</p>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" maxLength={80} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 pl-3 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">+221</span>
              <input required value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="77 123 45 67" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">Quantité</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} className="h-9 w-9 rounded-lg border border-slate-200 text-lg dark:border-slate-700 dark:text-white">−</button>
                <span className="w-8 text-center font-bold tabular-nums dark:text-white">{qty}</span>
                <button type="button" onClick={() => setQty(q => Math.min(100, q + 1))} className="h-9 w-9 rounded-lg border border-slate-200 text-lg dark:border-slate-700 dark:text-white">+</button>
              </div>
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Couleur, taille… (facultatif)" maxLength={200} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Total</span>
              <b className="tabular-nums text-slate-900 dark:text-white">{formatFcfa(p.price * qty)}</b>
            </div>
            {formError && <p className="text-[12px] text-red-600">{formError}</p>}
            <button disabled={sending} className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60">
              {sending ? 'Envoi…' : 'Réserver'}
            </button>
            <p className="text-center text-[11px] text-slate-500">
              Aucun paiement sur cette page.{p.deposit ? ` Acompte demandé par le vendeur : ${formatFcfa(p.deposit)}, à régler directement avec lui.` : ''}
            </p>
          </form>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Les précommandes sont fermées.
          </div>
        )}

        {p.shopSlug && (
          <Link href={`/boutiques/${p.shopSlug}`} className="mt-4 block text-center text-[13px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Voir la boutique de {p.sellerName}
          </Link>
        )}
      </div>
    </div>
  )
}
