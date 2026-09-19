'use client'

import { useState, useRef } from 'react'
import {
  Loader2, Wallet, Truck, Users, LifeBuoy, Plus, ImageIcon,
  CheckCircle, Clock, AlertTriangle, MessageCircle,
} from 'lucide-react'
import { formatFcfa } from '@/components/market/batch1/formatFcfa'
import { brandWhatsAppUrl } from '@/lib/branding'

const METHODS = [
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'free_money', label: 'Free Money' },
  { id: 'bank_transfer', label: 'Virement bancaire' },
]

const PAYOUT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  approved: { label: 'Approuvé', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  paid: { label: 'Versé', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: 'Rejeté', cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
}

const METHOD_LABELS: Record<string, string> = {
  wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', bank_transfer: 'Virement',
}

const RETURN_STATUS: Record<string, string> = {
  requested: 'Demandé', approved: 'Approuvé', rejected: 'Rejeté', in_transit: 'En transit',
  received: 'Reçu', refunded: 'Remboursé', closed: 'Clôturé',
}

const GROUP_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Ouvert', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  filled: { label: 'Rempli', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  ordering: { label: 'Commande en cours', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  ordered: { label: 'Commandé', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  draft: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  shipped: { label: 'Expédié', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  delivered: { label: 'Livré', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  cancelled: { label: 'Annulé', cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition'

function Empty({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="text-center py-12">
      <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
        <Icon size={24} className="text-slate-400" />
      </div>
      <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">{title}</p>
      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
    </div>
  )
}

function Loading() {
  return <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
}

// ─── Trésorerie ──────────────────────────────────────────────
export function TreasuryTab({ data, loading, onRequested }: { data: any; loading: boolean; onRequested: () => void }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('wave')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading || !data) return <Loading />
  const t = data.treasury

  const requestPayout = async () => {
    const val = parseInt(amount, 10)
    if (!val || val < 1000) { setError('Montant minimum : 1 000 F'); return }
    try {
      setSending(true); setError(null)
      const res = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: val, method, phone: phone || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setAmount(''); onRequested()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Soldes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Disponible', value: t.available, cls: 'text-emerald-600 dark:text-emerald-400', hint: 'Retirable maintenant' },
          { label: 'En escrow', value: t.inEscrow, cls: 'text-amber-600 dark:text-amber-400', hint: 'Livraisons en cours' },
          { label: 'Ventes totales', value: t.totalSalesGross, cls: 'text-slate-900 dark:text-white', hint: `${t.ordersCount} commandes` },
          { label: 'Versé', value: t.payoutsPaid, cls: 'text-slate-900 dark:text-white', hint: 'Retraits payés' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className={`mt-1 text-[18px] md:text-[20px] font-extrabold tabular-nums ${c.cls}`}>{formatFcfa(c.value)}</p>
            <p className="text-[10px] text-slate-400">{c.hint}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Commission DDM+ : <b className="text-slate-700 dark:text-slate-300">{t.commissionRate}%</b> — déduite du solde disponible. L'escrow est libéré à la livraison confirmée.
      </p>

      {/* Demande de retrait */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-[13px] font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Wallet size={15} className="text-emerald-600" /> Demander un retrait
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2.5">
          <input type="number" min={1000} value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant (F)" className={inputCls} />
          <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
            {METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone de réception" className={inputCls} />
          <button
            onClick={requestPayout}
            disabled={sending}
            className="h-[42px] px-5 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer'}
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] font-semibold text-red-600">{error}</p>}
      </div>

      {/* Historique payouts */}
      {t.payouts.length > 0 && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Retraits</p>
          <div className="space-y-2">
            {t.payouts.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">{formatFcfa(p.amount)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {METHOD_LABELS[p.method] || p.method} · {new Date(p.requestedAt).toLocaleDateString('fr-FR')}
                    {p.status === 'rejected' && p.rejectionReason ? ` · ${p.rejectionReason}` : ''}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${PAYOUT_STATUS[p.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
                  {PAYOUT_STATUS[p.status]?.label || p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger ventes */}
      {t.ledger.length > 0 && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Journal des ventes</p>
          <div className="space-y-2">
            {t.ledger.slice(0, 20).map((l: any) => (
              <div key={l.orderId} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] font-bold text-slate-900 dark:text-white">{l.orderId}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(l.date).toLocaleDateString('fr-FR')} · brut {formatFcfa(l.gross)} · commission {formatFcfa(l.commission)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(l.net)}</p>
                  <span className={`text-[10px] font-bold ${l.status === 'available' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {l.status === 'available' ? 'Disponible' : 'Escrow'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {t.ledger.length === 0 && t.payouts.length === 0 && (
        <Empty icon={Wallet} title="Aucune vente encaissée" sub="Votre trésorerie se remplira dès la première commande payée." />
      )}
    </div>
  )
}

// ─── Approvisionnement ───────────────────────────────────────
export function PurchasesTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading || !data) return <Loading />
  const groups = data.groupBuys || []
  const orders = data.purchases || []

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Achats groupés <span className="normal-case font-medium">(stock en appro)</span>
        </p>
        {groups.length === 0 ? (
          <p className="text-[12px] text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
            Aucune participation — rejoignez un achat groupé pour vous réapprovisionner à prix réduit.
          </p>
        ) : groups.map((g: any) => {
          const st = GROUP_STATUS[g.status] || { label: g.status, cls: 'bg-slate-100 text-slate-600' }
          return (
            <div key={g.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-2">
              <div className="flex items-center gap-3">
                {g.image && <img src={g.image} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{g.productName}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ma part : {g.myQty} pcs · {formatFcfa(g.myTotal)} · {st.label}
                  </p>
                </div>
                <span className="text-[13px] font-extrabold text-violet-600 dark:text-violet-400 tabular-nums">{g.progress}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${g.progress}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{g.currentQty}/{g.targetQty} · deadline {new Date(g.deadline).toLocaleDateString('fr-FR')}</p>
            </div>
          )
        })}
      </div>

      <div>
        <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Mes commandes directes</p>
        {orders.length === 0 ? (
          <p className="text-[12px] text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
            Aucune commande d'approvisionnement.
          </p>
        ) : orders.map((o: any) => (
          <div key={o.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[12px] font-bold text-slate-900 dark:text-white">{o.orderId}</p>
              <span className="text-[12px] font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(o.total)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(o.items || []).map((i: any, k: number) => (
                <span key={k} className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                  {i.name} ×{i.qty}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Groupes sur mes produits ────────────────────────────────
export function GroupsTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading || !data) return <Loading />
  const groups = data.groups || []

  if (groups.length === 0) {
    return <Empty icon={Users} title="Aucun groupe actif" sub="Les achats groupés sur vos produits apparaîtront ici — un excellent levier de volume." />
  }

  return (
    <div className="space-y-3">
      {groups.map((g: any) => {
        const st = GROUP_STATUS[g.status] || { label: g.status, cls: 'bg-slate-100 text-slate-600' }
        const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000))
        return (
          <div key={g.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              {g.image && <img src={g.image} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800" />}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{g.productName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {g.participantsCount} participant{g.participantsCount > 1 ? 's' : ''} · {daysLeft}j restants · {formatFcfa(g.currentUnitPrice)}/u
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${g.progress}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-400 tabular-nums">{g.currentQty}/{g.targetQty} pcs — {g.progress}%</p>
            {g.participants?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.participants.slice(0, 8).map((p: any, i: number) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                    {p.firstName} ×{p.qty}
                    {p.status === 'paid' && <CheckCircle size={9} className="ml-1 text-emerald-600" />}
                  </span>
                ))}
                {g.participants.length > 8 && <span className="text-[10px] text-slate-400">+{g.participants.length - 8}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Support ─────────────────────────────────────────────────
export function SupportTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading || !data) return <Loading />
  const requests = data.requests || []

  return (
    <div className="space-y-4">
      <a
        href={brandWhatsAppUrl(undefined, "Bonjour DDM+, je suis vendeur et j'ai besoin d'aide avec ma boutique.")}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-4 hover:bg-emerald-100/60 transition"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white">
          <MessageCircle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Support vendeur DDM+</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">Litiges, paiements, mise en ligne — réponse rapide</p>
        </div>
      </a>

      <div>
        <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Retours & litiges sur vos produits</p>
        {requests.length === 0 ? (
          <Empty icon={LifeBuoy} title="Aucun litige" sub="Les demandes de retour concernant vos produits apparaîtront ici." />
        ) : requests.map((r: any) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[12px] font-bold text-slate-900 dark:text-white">{r.orderReference}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {RETURN_STATUS[r.status] || r.status}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">{r.clientName} · {r.reason}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {r.items.map((i: any, k: number) => (
                <span key={k} className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-[10px] text-red-700 dark:text-red-300">
                  {i.name} ×{i.qty}
                </span>
              ))}
            </div>
            {r.refundAmount ? <p className="mt-1 text-[11px] text-slate-500">Remboursement : {formatFcfa(r.refundAmount)}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Nouveau produit ─────────────────────────────────────────
export function NewProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', category: '', price: '', stockQuantity: '' })
  const [image, setImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const uploadImage = async (file: File) => {
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'products')
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur upload')
      setImage(d.url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true); setError(null)
      const res = await fetch('/api/vendor/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          category: form.category || undefined,
          price: parseInt(form.price, 10),
          stockQuantity: parseInt(form.stockQuantity || '0', 10),
          image: image || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-5 md:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-extrabold text-slate-900 dark:text-white">Nouveau produit</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ImageIcon className="hidden" /><span className="text-slate-400 text-lg leading-none">×</span>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="relative w-full aspect-video rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden hover:border-emerald-500 transition group"
          >
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center text-slate-400 gap-1.5">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon size={24} />}
                <span className="text-[12px] font-semibold">Photo du produit</span>
              </span>
            )}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Nom *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Ex : Sneakers running homme" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Prix (FCFA) *</label>
              <input required type="number" min={100} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="15000" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Stock *</label>
              <input required type="number" min={0} value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: e.target.value })} className={inputCls} placeholder="20" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Catégorie</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls} placeholder="Ex : Électronique, Mode…" />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} maxLength={2000} className={inputCls} placeholder="Caractéristiques, état, délais…" />
          </div>

          {error && <p className="text-[12px] font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full h-11 rounded-2xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus size={15} /> Créer le produit</>}
          </button>
          <p className="text-center text-[11px] text-slate-400">Le produit sera visible après validation par nos équipes.</p>
        </form>
      </div>
    </div>
  )
}
