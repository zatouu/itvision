'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, Loader2, ShieldCheck, Camera, Receipt, Undo2, Link2, Wallet } from 'lucide-react'
import { formatFcfa } from '@/components/market/storefront/formatFcfa'

type Data = {
  code: string
  link: string
  rate: number
  minPayout: number
  totals: { pending: number; validated: number; available: number; requested: number; paid: number; sales: number }
  commissions: { id: string; label: string; buyerName?: string; amount: number; status: string; payoutRequested: boolean; createdAt: string }[]
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente de livraison', cls: 'bg-amber-100 text-amber-800' },
  validated: { label: 'Validée', cls: 'bg-emerald-100 text-emerald-800' },
  paid: { label: 'Versée', cls: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Annulée', cls: 'bg-red-100 text-red-700' },
}

const TRUST_PITCH = [
  'Pourquoi je commande sur DDM+ :',
  '- Paiement garanti : l\'argent est bloqué jusqu\'à la livraison, remboursé si rien n\'arrive.',
  '- Contrôle qualité en Chine avec photos avant l\'expédition.',
  '- Prix et frais détaillés avant de payer (produit, service, assurance, transport) : pas de marge cachée.',
  '- Achats groupés : plus on est nombreux, moins c\'est cher.',
].join('\n')

export default function AmbassadorPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [anyLink, setAnyLink] = useState('')
  const [method, setMethod] = useState('wave')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = async () => {
    const res = await fetch('/api/market/ambassador', { credentials: 'include' })
    if (res.status === 401) {
      window.location.href = '/login?redirect=/compte/ambassadeur'
      return
    }
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d.success) setError(d.error || 'Chargement impossible')
    else setData(d)
  }

  useEffect(() => { void load() }, [])

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  // Tout lien DDM+ (produit, groupe, boutique) devient un lien ambassadeur
  const withRef = (raw: string) => {
    if (!data) return ''
    try {
      const u = new URL(raw.trim())
      if (u.origin !== new URL(data.link).origin) return ''
      u.searchParams.set('ref', data.code)
      return u.toString()
    } catch {
      return ''
    }
  }
  const builtLink = anyLink ? withRef(anyLink) : ''

  const requestPayout = async () => {
    setSending(true); setPayoutMsg(null)
    try {
      const res = await fetch('/api/market/ambassador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ method, phone }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) setPayoutMsg({ ok: false, text: d.error || 'Demande impossible' })
      else {
        setPayoutMsg({ ok: true, text: `Demande envoyée : ${formatFcfa(d.amount)}. Versement sous 72 h ouvrées.` })
        void load()
      }
    } finally {
      setSending(false)
    }
  }

  if (error) return <div className="mx-auto max-w-lg p-6 text-center text-sm text-red-600">{error}</div>
  if (!data) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>

  const pct = `${Math.round(data.rate * 1000) / 10} %`

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      <div className="bg-gradient-to-br from-emerald-700 to-violet-700 text-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link href="/compte" className="mb-3 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Mon compte
          </Link>
          <h1 className="text-2xl font-extrabold">Ambassadeur DDM+</h1>
          <p className="mt-1 text-sm text-white/85">
            Partagez vos liens sur TikTok, WhatsApp ou Instagram : vous touchez {pct} sur chaque vente payée et livrée, versés sur Wave ou Orange Money.
          </p>
          <div className="mt-4 rounded-2xl bg-white/10 p-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-wider text-white/70">Votre lien</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-sm font-bold">{data.link}</code>
              <button onClick={() => copy('link', data.link)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3 text-xs font-bold text-slate-900">
                {copied === 'link' ? <Check size={14} /> : <Copy size={14} />} {copied === 'link' ? 'Copié' : 'Copier'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-white/70">Code : <b>{data.code}</b> · valable 30 jours après le clic</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { l: 'Ventes', v: String(data.totals.sales) },
            { l: 'En attente', v: formatFcfa(data.totals.pending) },
            { l: 'Disponible', v: formatFcfa(data.totals.available) },
            { l: 'Déjà versé', v: formatFcfa(data.totals.paid) },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.l}</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Link2 size={16} /> Lien vers un produit ou un groupe précis</h2>
          <p className="mt-0.5 text-xs text-slate-500">Collez n&apos;importe quel lien DDM+ : il devient votre lien ambassadeur.</p>
          <input
            value={anyLink}
            onChange={(e) => setAnyLink(e.target.value)}
            placeholder={`${new URL(data.link).origin}/achats-groupes/GRP-…`}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {anyLink && !builtLink && <p className="mt-1 text-xs text-red-600">Ce lien ne vient pas de DDM+.</p>}
          {builtLink && (
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2 py-2 text-xs dark:bg-slate-800 dark:text-slate-200">{builtLink}</code>
              <button onClick={() => copy('built', builtLink)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white">
                {copied === 'built' ? <Check size={14} /> : <Copy size={14} />} Copier
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Vos arguments face aux arnaques</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Ce qui rassure vos abonnés, et que les intermédiaires ne peuvent pas promettre :</p>
          <ul className="mt-3 space-y-2 text-[13px] text-slate-800 dark:text-slate-200">
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Paiement garanti : l&apos;argent est bloqué jusqu&apos;à la livraison, remboursé si rien n&apos;arrive.</li>
            <li className="flex gap-2"><Camera size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Contrôle qualité en Chine, photos publiées sur la page du groupe avant l&apos;expédition.</li>
            <li className="flex gap-2"><Receipt size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Prix et frais détaillés avant de payer (produit, service, assurance, transport) : aucune marge cachée.</li>
            <li className="flex gap-2"><Undo2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> 48 h après livraison pour signaler un problème ou demander un retour.</li>
          </ul>
          <button onClick={() => copy('pitch', `${TRUST_PITCH}\n${data.link}`)} className="mt-3 inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
            {copied === 'pitch' ? <Check size={14} /> : <Copy size={14} />} Copier ce message avec mon lien
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Wallet size={16} /> Recevoir mes commissions</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Disponible : <b>{formatFcfa(data.totals.available)}</b>{data.totals.requested > 0 ? ` · ${formatFcfa(data.totals.requested)} en cours de versement` : ''}. Minimum {formatFcfa(data.minPayout)}.
          </p>
          <div className="mt-3 grid grid-cols-[120px_1fr] gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="free_money">Free Money</option>
            </select>
            <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 123 45 67" className="h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <button
            onClick={requestPayout}
            disabled={sending || data.totals.available < data.minPayout || !phone.trim()}
            className="mt-2 h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-50"
          >
            {sending ? 'Envoi…' : 'Demander le versement'}
          </button>
          {payoutMsg && <p className={`mt-2 text-xs ${payoutMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{payoutMsg.text}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Mes ventes</h2>
          {data.commissions.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">Aucune vente pour l&apos;instant. Astuce : partagez la vidéo d&apos;un achat groupé en statut WhatsApp avec votre lien.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {data.commissions.map((c) => {
                const st = STATUS[c.status] || { label: c.status, cls: 'bg-slate-100 text-slate-700' }
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{c.label}</p>
                      <p className="text-[11px] text-slate-500">{c.buyerName ? `${c.buyerName} · ` : ''}{new Date(c.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-extrabold tabular-nums text-slate-900 dark:text-white">{formatFcfa(c.amount)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{c.payoutRequested && c.status === 'validated' ? 'Versement demandé' : st.label}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
