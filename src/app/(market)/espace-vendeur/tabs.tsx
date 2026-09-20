'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Loader2, Wallet, Users, LifeBuoy, Plus, ImageIcon,
  CheckCircle, MessageCircle, X, Trash2, ChevronDown,
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
type VariantRow = { name: string; price: string; stock: string; imageIndex: string }
type VariantGroupRow = { name: string; variants: VariantRow[] }
type TierRow = { minQty: string; price: string }

const MAX_PHOTOS = 8

function Section({ title, hint, open, onToggle, children }: {
  title: string; hint?: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        <span className="text-left">
          <span className="block text-[13px] font-bold text-slate-900 dark:text-white">{title}</span>
          {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

export function NewProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', category: '', price: '', stockQuantity: '', condition: 'new', deliveryDays: '', weightKg: '', tags: '' })
  const [photos, setPhotos] = useState<string[]>([])
  const [features, setFeatures] = useState<string[]>([''])
  const [variantGroups, setVariantGroups] = useState<VariantGroupRow[]>([])
  const [priceTiers, setPriceTiers] = useState<TierRow[]>([])
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([])
  const [open, setOpen] = useState({ variants: false, tiers: false, details: false })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/catalog/categories')
      .then(r => r.json())
      .then(d => {
        const list = (d.categories || d || []) as any[]
        setCategories(list.map(c => ({ slug: c.slug, name: c.labelFr || c.name || c.slug })))
      })
      .catch(() => {})
  }, [])

  const uploadImages = async (files: FileList) => {
    try {
      setUploading(true)
      const room = MAX_PHOTOS - photos.length
      for (const file of Array.from(files).slice(0, room)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'products')
        const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'Erreur upload')
        setPhotos(prev => [...prev, d.url].slice(0, MAX_PHOTOS))
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const removePhoto = (i: number) => setPhotos(prev => prev.filter((_, idx) => idx !== i))
  const promotePhoto = (i: number) =>
    setPhotos(prev => (i <= 0 ? prev : [prev[i], ...prev.filter((_, idx) => idx !== i)]))

  const setGroup = (gi: number, patch: Partial<VariantGroupRow>) =>
    setVariantGroups(prev => prev.map((g, i) => (i === gi ? { ...g, ...patch } : g)))
  const setVariant = (gi: number, vi: number, patch: Partial<VariantRow>) =>
    setVariantGroups(prev =>
      prev.map((g, i) => (i === gi ? { ...g, variants: g.variants.map((v, j) => (j === vi ? { ...v, ...patch } : v)) } : g))
    )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true); setError(null)

      const groups = variantGroups
        .map(g => ({
          name: g.name.trim(),
          variants: g.variants
            .filter(v => v.name.trim())
            .map((v, i) => ({
              name: v.name.trim(),
              priceFCFA: v.price ? parseInt(v.price, 10) : undefined,
              stock: v.stock ? parseInt(v.stock, 10) : undefined,
              image: v.imageIndex !== '' ? photos[parseInt(v.imageIndex, 10)] : undefined,
              isDefault: i === 0,
            })),
        }))
        .filter(g => g.name && g.variants.length > 0)

      const tiers = priceTiers
        .filter(t => parseInt(t.minQty, 10) >= 2 && parseInt(t.price, 10) >= 1)
        .map(t => ({ minQty: parseInt(t.minQty, 10), price: parseInt(t.price, 10) }))

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
          image: photos[0],
          gallery: photos,
          condition: form.condition,
          deliveryDays: form.deliveryDays ? parseInt(form.deliveryDays, 10) : undefined,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10),
          features: features.map(f => f.trim()).filter(Boolean).slice(0, 10),
          variantGroups: groups.length ? groups : undefined,
          priceTiers: tiers.length ? tiers : undefined,
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
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-5 md:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-extrabold text-slate-900 dark:text-white">Nouveau produit</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="text-slate-400 text-lg leading-none">×</span>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Photos — multi-upload, première = principale */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Photos ({photos.length}/{MAX_PHOTOS})</label>
              {photos.length > 1 && <span className="text-[10px] text-slate-400">Cliquez sur une photo pour la mettre en principale</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                  <button type="button" onClick={() => promotePhoto(i)} className="block h-full w-full" title={i === 0 ? 'Photo principale' : 'Définir comme principale'}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                  {i === 0 ? (
                    <span className="absolute top-1 left-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Principale</span>
                  ) : (
                    <span className="absolute top-1 left-1 rounded-md bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition">★ 1re</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-1 text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-1 hover:border-emerald-500 hover:text-emerald-600 transition"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon size={18} />}
                  <span className="text-[10px] font-semibold">Ajouter</span>
                </button>
              )}
            </div>
            <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files?.length && uploadImages(e.target.files)} />
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Catégorie</label>
              {categories.length > 0 ? (
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                  <option value="">— Choisir —</option>
                  {categories.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls} placeholder="Ex : Électronique, Mode…" />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">État</label>
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className={inputCls}>
                <option value="new">Neuf</option>
                <option value="used">Occasion</option>
                <option value="refurbished">Reconditionné</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} maxLength={2000} className={inputCls} placeholder="Caractéristiques, état, délais…" />
          </div>

          {/* Variantes */}
          <Section
            title="Variantes"
            hint={variantGroups.length ? `${variantGroups.length} groupe(s) — couleur, taille…` : 'Couleur, taille, capacité… avec prix/stock spécifiques'}
            open={open.variants}
            onToggle={() => setOpen(o => ({ ...o, variants: !o.variants }))}
          >
            {variantGroups.map((g, gi) => (
              <div key={gi} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={g.name}
                    onChange={e => setGroup(gi, { name: e.target.value })}
                    className={`${inputCls} flex-1`}
                    placeholder="Nom du groupe : Couleur, Taille…"
                  />
                  <button type="button" onClick={() => setVariantGroups(prev => prev.filter((_, i) => i !== gi))} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 size={14} />
                  </button>
                </div>
                {g.variants.map((v, vi) => (
                  <div key={vi} className="grid grid-cols-[1fr_80px_70px_70px_32px] gap-1.5 items-center">
                    <input value={v.name} onChange={e => setVariant(gi, vi, { name: e.target.value })} className={inputCls} placeholder="Rouge, XL…" />
                    <input type="number" min={0} value={v.price} onChange={e => setVariant(gi, vi, { price: e.target.value })} className={inputCls} placeholder="Prix" title="Prix spécifique (vide = prix de base)" />
                    <input type="number" min={0} value={v.stock} onChange={e => setVariant(gi, vi, { stock: e.target.value })} className={inputCls} placeholder="Stock" title="Stock spécifique" />
                    <select value={v.imageIndex} onChange={e => setVariant(gi, vi, { imageIndex: e.target.value })} className={inputCls} title="Photo associée">
                      <option value="">Photo</option>
                      {photos.map((_, pi) => <option key={pi} value={pi}>N°{pi + 1}</option>)}
                    </select>
                    <button type="button" onClick={() => setGroup(gi, { variants: g.variants.filter((_, i) => i !== vi) })} className="p-1.5 text-slate-400 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setGroup(gi, { variants: [...g.variants, { name: '', price: '', stock: '', imageIndex: '' }] })}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={12} /> Ajouter une variante
                </button>
              </div>
            ))}
            {variantGroups.length < 3 && (
              <button
                type="button"
                onClick={() => setVariantGroups(prev => [...prev, { name: '', variants: [{ name: '', price: '', stock: '', imageIndex: '' }] }])}
                className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2.5 text-[12px] font-bold text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition flex items-center justify-center gap-1.5"
              >
                <Plus size={13} /> Ajouter un groupe de variantes
              </button>
            )}
            <p className="text-[10px] text-slate-400">Prix/stock vides = le prix et stock de base du produit s'appliquent.</p>
          </Section>

          {/* Prix dégressifs */}
          <Section
            title="Prix dégressifs"
            hint={priceTiers.length ? `${priceTiers.length} palier(s)` : 'Prix réduit par quantité — encourage le gros achat'}
            open={open.tiers}
            onToggle={() => setOpen(o => ({ ...o, tiers: !o.tiers }))}
          >
            {priceTiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">Dès</span>
                  <input type="number" min={2} value={t.minQty} onChange={e => setPriceTiers(prev => prev.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))} className={inputCls} placeholder="10" />
                  <span className="text-[11px] text-slate-400">pièces</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={1} value={t.price} onChange={e => setPriceTiers(prev => prev.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className={inputCls} placeholder="13500" />
                  <span className="text-[11px] text-slate-400">F/pc</span>
                </div>
                <button type="button" onClick={() => setPriceTiers(prev => prev.filter((_, j) => j !== i))} className="p-1.5 text-slate-400 hover:text-red-500">
                  <X size={13} />
                </button>
              </div>
            ))}
            {priceTiers.length < 8 && (
              <button
                type="button"
                onClick={() => setPriceTiers(prev => [...prev, { minQty: '', price: '' }])}
                className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2.5 text-[12px] font-bold text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition flex items-center justify-center gap-1.5"
              >
                <Plus size={13} /> Ajouter un palier
              </button>
            )}
          </Section>

          {/* Détails */}
          <Section
            title="Détails & logistique"
            hint="Points forts, tags, délai, poids"
            open={open.details}
            onToggle={() => setOpen(o => ({ ...o, details: !o.details }))}
          >
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Points forts</label>
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <input value={f} onChange={e => setFeatures(prev => prev.map((x, j) => (j === i ? e.target.value : x)))} className={`${inputCls} flex-1`} placeholder="Ex : Batterie 5000 mAh, garantie 1 an…" />
                  <button type="button" onClick={() => setFeatures(prev => prev.filter((_, j) => j !== i))} className="p-1.5 text-slate-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {features.length < 10 && (
                <button type="button" onClick={() => setFeatures(prev => [...prev, ''])} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <Plus size={12} /> Ajouter un point fort
                </button>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Tags</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className={inputCls} placeholder="sneakers, running, homme (séparés par des virgules)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Délai livraison (jours)</label>
                <input type="number" min={0} max={90} value={form.deliveryDays} onChange={e => setForm({ ...form, deliveryDays: e.target.value })} className={inputCls} placeholder="Ex : 2" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Poids (kg)</label>
                <input type="number" min={0} step="0.1" value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} className={inputCls} placeholder="Ex : 0.5" />
              </div>
            </div>
          </Section>

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
