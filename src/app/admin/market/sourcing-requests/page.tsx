'use client'

/**
 * Admin — File des demandes de sourcing ("Trouvez-moi ce produit").
 * - Filtres par statut + recherche libre + flag overdue.
 * - Détail latéral avec actions : assigner / annoter / créer proposition / envoyer.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  XCircle,
  Package,
  ImageIcon,
  ExternalLink,
  Send,
  Save,
  Phone,
  Mail,
  User as UserIcon
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Status =
  | 'new'
  | 'searching'
  | 'proposal_ready'
  | 'proposal_sent'
  | 'accepted'
  | 'rejected'
  | 'fulfilled'
  | 'cancelled'
  | 'expired'

interface ProposalDraft {
  productName: string
  productImage?: string
  supplierUrl?: string
  supplierName?: string
  notes?: string
  price1688?: number | ''
  exchangeRate?: number | ''
  productCostFCFA: number | ''
  serviceFeeRate: number | ''
  insuranceRate: number | ''
  shippingMethod: 'air_express' | 'air_economy' | 'sea_freight'
  shippingCost: number | ''
  qty: number
  weightKg?: number | ''
  lengthCm?: number | ''
  widthCm?: number | ''
  heightCm?: number | ''
  deliveryDays: number | ''
  expiresInHours: number
}

interface SourcingRow {
  _id: string
  reference: string
  status: Status
  title?: string
  description: string
  source: 'photo' | 'link' | 'text'
  imageUrl?: string
  externalUrl?: string
  qty: number
  budgetMaxFCFA?: number
  deliveryNeededBy?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  isAnonymous?: boolean
  userId?: string
  slaDueAt: string
  createdAt: string
  updatedAt: string
  assignedToUserId?: string
  adminNotes?: string
  proposal?: any
  proposalSentAt?: string
  clientDecision?: 'accepted' | 'rejected'
  publicToken: string
  externalSearchResults?: Array<{
    title: string
    price1688?: number
    image: string
    url: string
    supplier?: string
    minOrder?: number
  }>
}

const STATUS_OPTIONS: Array<{ value: 'all' | 'pending' | Status; label: string }> = [
  { value: 'pending', label: 'À traiter' },
  { value: 'all', label: 'Toutes' },
  { value: 'new', label: 'Nouvelles' },
  { value: 'searching', label: 'En recherche' },
  { value: 'proposal_ready', label: 'Proposition prête (draft)' },
  { value: 'proposal_sent', label: 'Proposition envoyée' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'rejected', label: 'Refusées' },
  { value: 'fulfilled', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
  { value: 'expired', label: 'Expirées' }
]

const STATUS_BADGES: Record<Status, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Nouvelle' },
  searching: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'En recherche' },
  proposal_ready: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Draft prête' },
  proposal_sent: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Envoyée' },
  accepted: { bg: 'bg-emerald-200', text: 'text-emerald-900', label: 'Acceptée' },
  rejected: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Refusée' },
  fulfilled: { bg: 'bg-emerald-300', text: 'text-emerald-900', label: 'Livrée' },
  cancelled: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Annulée' },
  expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Expirée' }
}

function fmtFcfa(n: number | undefined | null) {
  if (n === undefined || n === null) return '—'
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA'
}
function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}
function relativeSla(due: string): { label: string; overdue: boolean; soon: boolean } {
  const ms = new Date(due).getTime() - Date.now()
  const overdue = ms < 0
  const soon = ms > 0 && ms < 4 * 3600 * 1000
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3600000)
  const minutes = Math.floor((abs % 3600000) / 60000)
  const label = `${hours}h${minutes.toString().padStart(2, '0')}`
  return { label: overdue ? `Retard ${label}` : `${label}`, overdue, soon }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminSourcingRequestsPage() {
  const [items, setItems] = useState<SourcingRow[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | Status>('pending')
  const [overdue, setOverdue] = useState(false)
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<SourcingRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (overdue) params.set('overdue', '1')
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '50')
      const res = await fetch(`/api/admin/market/sourcing?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Erreur de chargement')
      setItems(json.items)
      setStatusCounts(json.statusCounts || {})
    } catch (err: any) {
      setError(err?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, overdue, search])

  useEffect(() => {
    load()
  }, [load])

  // Sélectionner automatiquement la 1ère ligne
  useEffect(() => {
    if (!selected && items.length > 0) setSelected(items[0])
    if (selected && !items.find((i) => i._id === selected._id)) setSelected(items[0] || null)
  }, [items, selected])

  const refreshDetail = useCallback(async () => {
    if (!selected) return
    try {
      const res = await fetch(`/api/admin/market/sourcing/${selected._id}`, {
        credentials: 'include',
        cache: 'no-store'
      })
      const json = await res.json()
      if (json?.success) setSelected(json.request)
    } catch {}
  }, [selected])

  const updateRequest = useCallback(
    async (patch: any) => {
      if (!selected) return
      const res = await fetch(`/api/admin/market/sourcing/${selected._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch)
      })
      const json = await res.json()
      if (json?.success) {
        setSelected(json.request)
        load()
      }
    },
    [selected, load]
  )

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes de sourcing</h1>
          <p className="text-sm text-gray-500">
            File "Trouvez-moi ce produit" — SLA 24h ouvrées.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Rafraîchir
        </button>
      </div>

      {/* Filtres */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.value
            const count =
              opt.value === 'all'
                ? Object.values(statusCounts).reduce((s, v) => s + v, 0)
                : opt.value === 'pending'
                ? (statusCounts.new || 0) + (statusCounts.searching || 0) + (statusCounts.proposal_ready || 0)
                : statusCounts[opt.value] || 0
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
                <span className={`ml-1.5 ${isActive ? 'text-violet-100' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => setOverdue(e.target.checked)}
            className="rounded"
          />
          En retard SLA uniquement
        </label>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (référence, description, téléphone…)"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Liste + détail */}
      <div className="mt-5 grid lg:grid-cols-[420px_1fr] gap-5">
        {/* Liste */}
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
          <div className="px-4 py-2.5 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100 bg-gray-50">
            {items.length} demande{items.length > 1 ? 's' : ''}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Aucune demande</div>
            ) : (
              items.map((row) => {
                const sla = relativeSla(row.slaDueAt)
                const isActive = selected?._id === row._id
                return (
                  <button
                    key={row._id}
                    type="button"
                    onClick={() => setSelected(row)}
                    className={`w-full text-left p-3 border-b border-gray-100 transition-colors ${
                      isActive ? 'bg-violet-50 border-l-4 border-l-violet-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {row.imageUrl ? (
                          <img
                            src={row.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-gray-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-violet-600 truncate">{row.reference}</p>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {row.title || row.description.slice(0, 60)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {row.contactName || 'Anonyme'} · {row.contactPhone}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGES[row.status].bg} ${STATUS_BADGES[row.status].text}`}
                      >
                        {STATUS_BADGES[row.status].label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">qty {row.qty}</span>
                      {['new', 'searching', 'proposal_ready'].includes(row.status) && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold ${
                            sla.overdue
                              ? 'bg-red-100 text-red-700'
                              : sla.soon
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Clock className="h-3 w-3" /> {sla.label}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Détail */}
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          {!selected ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              Sélectionnez une demande pour voir les détails.
            </div>
          ) : (
            <DetailPanel
              request={selected}
              onPatch={updateRequest}
              onReload={refreshDetail}
              onListReload={load}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Panneau de détail ───────────────────────────────────────────────────────

function DetailPanel({
  request,
  onPatch,
  onReload,
  onListReload
}: {
  request: SourcingRow
  onPatch: (patch: any) => Promise<void>
  onReload: () => Promise<void>
  onListReload: () => Promise<void>
}) {
  const [notes, setNotes] = useState(request.adminNotes || '')
  const [proposal, setProposal] = useState<ProposalDraft>(() => initProposalDraft(request))
  const [sending, setSending] = useState<'save' | 'send' | null>(null)
  const [propError, setPropError] = useState<string | null>(null)
  const [propSuccess, setPropSuccess] = useState<string | null>(null)

  // Sync quand la requête sélectionnée change
  useEffect(() => {
    setNotes(request.adminNotes || '')
    setProposal(initProposalDraft(request))
    setPropError(null)
    setPropSuccess(null)
  }, [request._id])

  const computed = useMemo(() => {
    const cost = Number(proposal.productCostFCFA) || 0
    const sf = Number(proposal.serviceFeeRate) || 0
    const ins = Number(proposal.insuranceRate) || 0
    const ship = Number(proposal.shippingCost) || 0
    const sfAmt = Math.round(cost * (sf / 100))
    const insAmt = Math.round(cost * (ins / 100))
    const total = cost + sfAmt + insAmt + ship
    return { sfAmt, insAmt, total }
  }, [proposal.productCostFCFA, proposal.serviceFeeRate, proposal.insuranceRate, proposal.shippingCost])

  const submitProposal = useCallback(
    async (send: boolean) => {
      setPropError(null)
      setPropSuccess(null)
      // Validation côté client
      if (!proposal.productName.trim()) {
        setPropError('Nom produit requis.')
        return
      }
      if (!proposal.productCostFCFA || !proposal.shippingCost || !proposal.deliveryDays) {
        setPropError('Coût produit, transport et délai sont obligatoires.')
        return
      }
      setSending(send ? 'send' : 'save')
      try {
        const res = await fetch(`/api/admin/market/sourcing/${request._id}/proposal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            send,
            proposal: {
              ...proposal,
              productCostFCFA: Number(proposal.productCostFCFA) || 0,
              serviceFeeRate: Number(proposal.serviceFeeRate) || 0,
              insuranceRate: Number(proposal.insuranceRate) || 0,
              shippingCost: Number(proposal.shippingCost) || 0,
              deliveryDays: Number(proposal.deliveryDays) || 0,
              price1688: proposal.price1688 === '' ? undefined : Number(proposal.price1688),
              exchangeRate: proposal.exchangeRate === '' ? undefined : Number(proposal.exchangeRate),
              weightKg: proposal.weightKg === '' ? undefined : Number(proposal.weightKg),
              lengthCm: proposal.lengthCm === '' ? undefined : Number(proposal.lengthCm),
              widthCm: proposal.widthCm === '' ? undefined : Number(proposal.widthCm),
              heightCm: proposal.heightCm === '' ? undefined : Number(proposal.heightCm)
            }
          })
        })
        const json = await res.json()
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Échec')
        setPropSuccess(send ? 'Proposition envoyée au client par SMS.' : 'Proposition enregistrée (draft).')
        await onListReload()
        await onReload()
      } catch (err: any) {
        setPropError(err?.message || 'Erreur')
      } finally {
        setSending(null)
      }
    },
    [proposal, request._id, onListReload, onReload]
  )

  const trackUrl = `/market/sourcing/${request.publicToken}`
  const sla = relativeSla(request.slaDueAt)

  return (
    <div className="p-5 max-h-[calc(100vh-220px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-mono text-violet-600">{request.reference}</p>
          <h2 className="text-lg font-bold text-gray-900">
            {request.title || request.description.slice(0, 80)}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Soumise le {fmtDate(request.createdAt)} ·{' '}
            <span className={sla.overdue ? 'text-red-600 font-semibold' : ''}>
              SLA {sla.label}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_BADGES[request.status].bg} ${STATUS_BADGES[request.status].text}`}
          >
            {STATUS_BADGES[request.status].label}
          </span>
          <a
            href={trackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="Vue client"
          >
            <ExternalLink className="h-3 w-3" /> Vue client
          </a>
        </div>
      </div>

      {/* Demande */}
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div className="space-y-3 text-sm">
          <Section title="Description">
            <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
          </Section>
          <Section title="Quantité / Budget / Délai">
            <p>
              Quantité : <strong>{request.qty}</strong>
              {request.budgetMaxFCFA && (
                <>
                  {' '}— Budget max : <strong>{fmtFcfa(request.budgetMaxFCFA)}</strong>
                </>
              )}
              {request.deliveryNeededBy && (
                <>
                  {' '}— Voulu avant : <strong>{fmtDate(request.deliveryNeededBy)}</strong>
                </>
              )}
            </p>
          </Section>
          <Section title="Contact">
            <ul className="text-gray-700 space-y-1">
              <li className="flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                {request.contactName || (request.isAnonymous ? 'Anonyme' : 'Utilisateur')}
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <a href={`tel:${request.contactPhone}`} className="text-violet-600 hover:underline">
                  {request.contactPhone}
                </a>
              </li>
              {request.contactEmail && (
                <li className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`mailto:${request.contactEmail}`} className="text-violet-600 hover:underline">
                    {request.contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </Section>
        </div>
        <div className="space-y-3 text-sm">
          {request.imageUrl && (
            <Section title="Photo client">
              <a href={request.imageUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={request.imageUrl}
                  alt="Photo client"
                  className="rounded-lg max-h-48 object-contain bg-gray-50 border border-gray-200"
                />
              </a>
            </Section>
          )}
          {request.externalUrl && (
            <Section title="Lien fourni">
              <a
                href={request.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-violet-600 hover:underline break-all"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {request.externalUrl}
              </a>
            </Section>
          )}
          {/* Résultats recherche externe 1688 */}
          {request.externalSearchResults && request.externalSearchResults.length > 0 && (
            <Section title={`Résultats 1688 (${request.externalSearchResults.length})`}>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {request.externalSearchResults.map((r, i) => (
                  <div
                    key={i}
                    className="flex gap-2 p-2 rounded-lg border border-gray-100 bg-white"
                  >
                    <div className="w-14 h-14 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                      <img src={r.image} alt={r.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">{r.title}</p>
                      <p className="text-xs text-violet-600">
                        {r.price1688 ? `¥${r.price1688.toLocaleString('fr-FR')}` : 'Prix N/A'}
                      </p>
                      {r.supplier && <p className="text-[11px] text-gray-500 truncate">{r.supplier}</p>}
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[11px] text-violet-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Voir sur 1688
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Notes admin (privées)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onPatch({ adminNotes: notes })}
              rows={4}
              placeholder="Notes internes (visibles uniquement par l'équipe)…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </Section>
          <div className="flex flex-wrap gap-2">
            {!request.assignedToUserId && request.status === 'new' && (
              <button
                type="button"
                onClick={() => onPatch({ assignToMe: true })}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold"
              >
                Me l'assigner & démarrer
              </button>
            )}
            {request.status === 'new' && (
              <button
                type="button"
                onClick={() => onPatch({ status: 'searching' })}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                Marquer "En recherche"
              </button>
            )}
            {!['cancelled', 'fulfilled'].includes(request.status) && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Annuler cette demande ?')) onPatch({ status: 'cancelled' })
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold"
              >
                Annuler la demande
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Proposition */}
      <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-violet-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Proposition au client
          </h3>
          {request.proposalSentAt && (
            <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Envoyée le {fmtDate(request.proposalSentAt)}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <FieldInput
            label="Nom du produit *"
            value={proposal.productName}
            onChange={(v) => setProposal({ ...proposal, productName: v })}
          />
          <FieldInput
            label="URL image"
            value={proposal.productImage || ''}
            onChange={(v) => setProposal({ ...proposal, productImage: v })}
            placeholder="https://..."
          />
          <FieldInput
            label="Lien fournisseur (1688/AE)"
            value={proposal.supplierUrl || ''}
            onChange={(v) => setProposal({ ...proposal, supplierUrl: v })}
            placeholder="https://..."
          />
          <FieldInput
            label="Nom fournisseur"
            value={proposal.supplierName || ''}
            onChange={(v) => setProposal({ ...proposal, supplierName: v })}
          />
          <FieldInput
            label="Prix 1688 (CNY)"
            type="number"
            value={proposal.price1688 ?? ''}
            onChange={(v) => setProposal({ ...proposal, price1688: v === '' ? '' : Number(v) })}
          />
          <FieldInput
            label="Taux change (1 CNY → FCFA)"
            type="number"
            value={proposal.exchangeRate ?? ''}
            onChange={(v) => setProposal({ ...proposal, exchangeRate: v === '' ? '' : Number(v) })}
            placeholder="100"
          />
          <FieldInput
            label="Coût produit FCFA *"
            type="number"
            value={proposal.productCostFCFA}
            onChange={(v) => setProposal({ ...proposal, productCostFCFA: v === '' ? '' : Number(v) })}
          />
          <FieldInput
            label="Quantité *"
            type="number"
            value={proposal.qty}
            onChange={(v) => setProposal({ ...proposal, qty: Number(v) || 1 })}
          />
          <FieldInput
            label="Frais de service % *"
            type="number"
            value={proposal.serviceFeeRate}
            onChange={(v) => setProposal({ ...proposal, serviceFeeRate: v === '' ? '' : Number(v) })}
          />
          <FieldInput
            label="Assurance % *"
            type="number"
            value={proposal.insuranceRate}
            onChange={(v) => setProposal({ ...proposal, insuranceRate: v === '' ? '' : Number(v) })}
          />
          <FieldSelect
            label="Mode transport *"
            value={proposal.shippingMethod}
            onChange={(v) =>
              setProposal({ ...proposal, shippingMethod: v as ProposalDraft['shippingMethod'] })
            }
            options={[
              { value: 'air_express', label: 'Aérien express' },
              { value: 'air_economy', label: 'Aérien éco' },
              { value: 'sea_freight', label: 'Maritime' }
            ]}
          />
          <FieldInput
            label="Coût transport FCFA *"
            type="number"
            value={proposal.shippingCost}
            onChange={(v) => setProposal({ ...proposal, shippingCost: v === '' ? '' : Number(v) })}
          />
          <FieldInput
            label="Délai (jours) *"
            type="number"
            value={proposal.deliveryDays}
            onChange={(v) => setProposal({ ...proposal, deliveryDays: v === '' ? '' : Number(v) })}
          />
          <FieldInput
            label="Validité proposition (heures)"
            type="number"
            value={proposal.expiresInHours}
            onChange={(v) => setProposal({ ...proposal, expiresInHours: Number(v) || 72 })}
          />
        </div>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / argumentaire</label>
          <textarea
            value={proposal.notes || ''}
            onChange={(e) => setProposal({ ...proposal, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder="Détails utiles pour rassurer le client (garantie, marque, etc.)"
          />
        </div>

        {/* Récap calcul */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
          <Recap label="Service" value={computed.sfAmt} />
          <Recap label="Assurance" value={computed.insAmt} />
          <Recap label="Transport" value={Number(proposal.shippingCost) || 0} />
          <Recap label="TOTAL client" value={computed.total} highlight />
        </div>

        {propError && (
          <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">{propError}</div>
        )}
        {propSuccess && (
          <div className="mt-3 p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            {propSuccess}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => submitProposal(false)}
            disabled={!!sending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {sending === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer draft
          </button>
          <button
            type="button"
            onClick={() => submitProposal(true)}
            disabled={!!sending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {sending === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer au client (SMS)
          </button>
        </div>
      </div>
    </div>
  )
}

function initProposalDraft(req: SourcingRow): ProposalDraft {
  const p = req.proposal
  return {
    productName: p?.productName || req.title || '',
    productImage: p?.productImage || req.imageUrl || '',
    supplierUrl: p?.supplierUrl || req.externalUrl || '',
    supplierName: p?.supplierName || '',
    notes: p?.notes || '',
    price1688: p?.price1688 ?? '',
    exchangeRate: p?.exchangeRate ?? 100,
    productCostFCFA: p?.productCostFCFA ?? '',
    serviceFeeRate: p?.serviceFeeRate ?? 10,
    insuranceRate: p?.insuranceRate ?? 2.5,
    shippingMethod: p?.shippingMethod || 'air_economy',
    shippingCost: p?.shippingCost ?? '',
    qty: p?.qty ?? req.qty ?? 1,
    weightKg: p?.weightKg ?? '',
    lengthCm: p?.lengthCm ?? '',
    widthCm: p?.widthCm ?? '',
    heightCm: p?.heightCm ?? '',
    deliveryDays: p?.deliveryDays ?? 15,
    expiresInHours: 72
  }
}

// ─── Composants utilitaires ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value as any}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    </label>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Recap({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-2 text-center ${
        highlight ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-700'
      }`}
    >
      <p className="text-[10px] uppercase font-semibold opacity-80">{label}</p>
      <p className="text-sm font-bold">{fmtFcfa(value)}</p>
    </div>
  )
}
