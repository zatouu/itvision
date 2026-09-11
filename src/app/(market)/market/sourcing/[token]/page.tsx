'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  Sparkles,
  ImageIcon,
  ExternalLink,
  Phone,
  Shield,
  Factory,
  Package,
  MessageCircle,
  Calendar,
} from 'lucide-react'
import { formatFcfa } from '@/components/market/batch1/formatFcfa'

type Proposal = {
  productName: string
  productImage?: string
  productGallery?: string[]
  supplierUrl?: string
  supplierName?: string
  supplierVerified?: boolean
  notes?: string
  productCostFCFA: number
  serviceFeeRate: number
  serviceFeeAmount: number
  insuranceRate: number
  insuranceAmount: number
  shippingMethod: string
  shippingCost: number
  totalClientPrice: number
  currency: string
  qty: number
  deliveryDays: number
  expiresAt: string
  proposedAt: string
  proposedByName?: string
  alternativeOffers?: Array<{
    label: string
    totalClientPrice: number
    deliveryDays: number
    notes?: string
  }>
}

type SourcingRequest = {
  id: string
  reference: string
  status:
    | 'new'
    | 'searching'
    | 'proposal_ready'
    | 'proposal_sent'
    | 'accepted'
    | 'rejected'
    | 'fulfilled'
    | 'cancelled'
    | 'expired'
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
  slaDueAt: string
  createdAt: string
  updatedAt: string
  proposal?: Proposal | null
  proposalSentAt?: string
  clientDecision?: 'accepted' | 'rejected'
  clientDecisionAt?: string
}

const STATUS_MAP: Record<string, { tone: string; label: string; icon: any }> = {
  new: { tone: 'blue', label: 'Demande reçue', icon: Package },
  searching: { tone: 'violet', label: 'Recherche en cours', icon: Search },
  proposal_ready: { tone: 'emerald', label: 'Proposition disponible', icon: CheckCircle2 },
  proposal_sent: { tone: 'emerald', label: 'Proposition envoyée', icon: Sparkles },
  accepted: { tone: 'emerald', label: 'Acceptée', icon: Check },
  rejected: { tone: 'red', label: 'Refusée', icon: AlertCircle },
  fulfilled: { tone: 'emerald', label: 'Livrée', icon: Package },
  cancelled: { tone: 'slate', label: 'Annulée', icon: AlertCircle },
  expired: { tone: 'amber', label: 'Expirée', icon: Clock },
}

const TONE_STYLES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-900',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
  red: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
}

const STEPS = [
  { key: 'new', label: 'Demande reçue', desc: 'Votre demande est enregistrée' },
  { key: 'searching', label: 'Recherche en cours', desc: 'Nous comparons les fournisseurs' },
  { key: 'proposal_ready', label: 'Proposition disponible', desc: 'Devis prêt' },
  { key: 'proposal_sent', label: 'En commande', desc: 'Validation client' },
  { key: 'fulfilled', label: 'Livré', desc: 'Produit reçu' },
]

function fmtDate(d?: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function fmtDateTime(d?: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return d
  }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.new
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${TONE_STYLES[cfg.tone]}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

function Timeline({ currentStatus, createdAt, proposalSentAt }: { currentStatus: string; createdAt: string; proposalSentAt?: string }) {
  const currentIndex = STEPS.findIndex((s) =>
    currentStatus === s.key ||
    (s.key === 'proposal_sent' && ['proposal_sent', 'accepted', 'rejected'].includes(currentStatus))
  )
  const effectiveIndex = currentIndex >= 0 ? currentIndex : 0

  return (
    <div className="relative">
      {STEPS.map((step, i) => {
        const isDone = i <= effectiveIndex
        const isCurrent = i === effectiveIndex
        const isLast = i === STEPS.length - 1
        return (
          <div key={step.key} className="relative pl-11 pb-4 last:pb-0">
            {!isLast && (
              <span className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${isDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
            <span className={`absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold ${
              isDone ? 'bg-emerald-500 text-white' :
              isCurrent ? 'bg-violet-500 text-white ring-4 ring-violet-500/20' :
              'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {isDone ? <Check size={14} /> : i + 1}
            </span>
            <p className={`text-[13px] font-extrabold ${(isDone || isCurrent) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {step.label}
            </p>
            <p className={`mt-0.5 text-[11px] ${(isDone || isCurrent) ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
              {step.desc}
            </p>
            {step.key === 'new' && createdAt && (
              <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(createdAt)}</p>
            )}
            {step.key === 'proposal_ready' && proposalSentAt && (
              <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(proposalSentAt)}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SourcingTrackingPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token
  const [data, setData] = useState<SourcingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<'accepted' | 'rejected' | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/market/sourcing/track/${token}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Demande introuvable')
      setData(json.request)
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger la demande')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const submitDecision = useCallback(
    async (decision: 'accepted' | 'rejected') => {
      if (!token) return
      setActing(decision)
      setDecisionError(null)
      try {
        const csrf = await fetch('/api/csrf', { credentials: 'include', cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.csrfToken || null)
          .catch(() => null)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (csrf) headers['X-CSRF-Token'] = csrf
        const res = await fetch(`/api/market/sourcing/track/${token}`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ decision })
        })
        const json = await res.json()
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Échec de l\'envoi')
        setData(json.request)
      } catch (err: any) {
        setDecisionError(err?.message || 'Erreur')
      } finally {
        setActing(null)
      }
    },
    [token]
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Demande introuvable</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">{error || 'Le lien semble invalide ou expiré.'}</p>
        <Link href="/market" className="mt-6 inline-flex items-center gap-2 text-violet-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour au market
        </Link>
      </div>
    )
  }

  const proposalExpired = data.proposal && new Date(data.proposal.expiresAt).getTime() < Date.now()
  const marketPrice = data.proposal ? Math.round(data.proposal.totalClientPrice * 1.3) : 0
  const savingPct = data.proposal && marketPrice > 0 ? Math.round((1 - data.proposal.totalClientPrice / marketPrice) * 100) : 0
  const unitPrice = data.proposal ? Math.round(data.proposal.totalClientPrice / data.proposal.qty) : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:text-violet-600 transition">
            <ArrowLeft size={16} /> Retour
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6">
        <div className="mb-6">
          <StatusBadge status={data.status} />
          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">Créée le {fmtDateTime(data.createdAt)}</p>
          <h1 className="mt-1 text-[24px] md:text-[32px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            Votre demande de sourcing
          </h1>
          <p className="mt-1 font-mono text-[12px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 inline-block rounded-lg px-2 py-0.5">
            {data.reference || token}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 md:gap-6">
          {/* Left: Request */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Votre demande</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">{fmtDate(data.createdAt)}</p>
              </div>
              <div className="p-4">
                {data.imageUrl && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3">
                    <img src={data.imageUrl} alt="Produit recherché" className="h-full w-full object-cover" />
                  </div>
                )}
                <p className="text-[13px] text-slate-900 dark:text-white font-semibold leading-snug mb-3">
                  {data.title || data.description}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</p>
                    <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-slate-900 dark:text-white">{data.qty} pcs</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Budget max</p>
                    <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {data.budgetMaxFCFA ? formatFcfa(data.budgetMaxFCFA) : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Délai</p>
                    <p className="mt-0.5 text-[10px] font-extrabold text-slate-900 dark:text-white leading-tight">
                      {data.deliveryNeededBy ? fmtDate(data.deliveryNeededBy) : 'Flexible'}
                    </p>
                  </div>
                </div>

                {data.externalUrl && (
                  <a
                    href={data.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    <ExternalLink size={12} /> Lien fourni
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Suivi de la demande</p>
              <Timeline currentStatus={data.status} createdAt={data.createdAt} proposalSentAt={data.proposalSentAt} />
            </div>
          </div>

          {/* Right: Proposal or searching */}
          <div className="space-y-4">
            {!data.proposal && data.status !== 'cancelled' && data.status !== 'rejected' && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-900 p-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-100 dark:bg-violet-900/60 mb-3">
                  <Search size={28} className="text-violet-600 dark:text-violet-300" />
                </div>
                <h3 className="text-[16px] font-extrabold text-slate-900 dark:text-white">Notre équipe travaille sur votre demande</h3>
                <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">Nous comparons les fournisseurs et calculons le meilleur prix livré.</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-violet-200 dark:bg-violet-900/60 px-2.5 py-1 text-[10px] font-bold text-violet-800 dark:text-violet-200">
                  <Clock size={10} /> 24h
                </span>
                <a
                  href="https://wa.me/221761234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 mx-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700 transition"
                >
                  <MessageCircle size={14} /> Contacter mon conseiller
                </a>
              </div>
            )}

            {data.proposal && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/40 overflow-hidden">
                <div className="border-b border-emerald-200 dark:border-emerald-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
                      <Sparkles size={14} />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Proposition trouvée</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">Envoyée le {fmtDate(data.proposal.proposedAt)}</p>
                    </div>
                  </div>
                  {savingPct > 0 && (
                    <span className="rounded-md bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5">-{savingPct}%</span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    {data.proposal.productImage ? (
                      <img src={data.proposal.productImage} alt={data.proposal.productName} className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800" />
                    ) : (
                      <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <ImageIcon size={28} className="text-slate-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{data.proposal.productName}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <Factory size={11} />
                        <span>{data.proposal.supplierName || 'Fournisseur DDM+'}</span>
                        {data.proposal.supplierVerified && <CheckCircle2 size={11} className="text-emerald-500" />}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/70 dark:bg-slate-900/70 p-3 space-y-2 mb-4">
                    <div className="flex justify-between items-baseline text-[12px]">
                      <span className="text-slate-500 dark:text-slate-400">Prix unitaire livré</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatFcfa(unitPrice)}</span>
                    </div>
                    <div className="flex justify-between items-baseline text-[12px]">
                      <span className="text-slate-500 dark:text-slate-400">Prix marché estimé</span>
                      <span className="font-semibold text-slate-400 line-through tabular-nums whitespace-nowrap">{formatFcfa(marketPrice)}</span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-baseline">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-white">Total ({data.proposal.qty} pcs)</span>
                      <span className="text-[18px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatFcfa(data.proposal.totalClientPrice)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Délai</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-slate-900 dark:text-white">{data.proposal.deliveryDays}j</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Garantie</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-slate-900 dark:text-white">2 ans</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">MOQ</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-slate-900 dark:text-white">{data.qty} pcs</p>
                    </div>
                  </div>

                  {data.proposal.notes && (
                    <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 p-3 text-[12px] text-slate-700 dark:text-slate-300 mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Notes du conseiller</p>
                      {data.proposal.notes}
                    </div>
                  )}

                  {data.status === 'proposal_sent' && !proposalExpired && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => submitDecision('accepted')}
                        disabled={!!acting}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {acting === 'accepted' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Accepter et payer · {formatFcfa(data.proposal.totalClientPrice)}
                      </button>
                      <button
                        type="button"
                        onClick={() => submitDecision('rejected')}
                        disabled={!!acting}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-violet-200 bg-white text-violet-700 font-semibold hover:bg-violet-50 dark:bg-slate-900 dark:border-violet-800 dark:text-violet-300 transition disabled:opacity-50"
                      >
                        {acting === 'rejected' ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                        Discuter avec un conseiller
                      </button>
                    </div>
                  )}

                  {data.status === 'accepted' && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900 p-4 text-[13px]">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">Proposition acceptée le {fmtDate(data.clientDecisionAt)}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 mt-1">Notre équipe vous contacte pour finaliser le paiement et la livraison.</p>
                    </div>
                  )}

                  {data.status === 'rejected' && (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-[13px] text-slate-700 dark:text-slate-300">
                      Proposition refusée le {fmtDate(data.clientDecisionAt)}. Merci de votre retour.
                    </div>
                  )}

                  {(data.status === 'expired' || proposalExpired) && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-900 p-4 text-[13px] text-red-700 dark:text-red-300">
                      Cette proposition a expiré. Recontactez-nous pour relancer une nouvelle estimation.
                    </div>
                  )}

                  {decisionError && (
                    <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
                      {decisionError}
                    </div>
                  )}

                  {data.status === 'proposal_sent' && !proposalExpired && (
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar size={12} /> Cette proposition est valable jusqu&apos;au {fmtDate(data.proposal.expiresAt)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {data.proposal && data.proposal.alternativeOffers && data.proposal.alternativeOffers.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Alternatives</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {data.proposal.alternativeOffers.map((alt, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
                      <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-800 mb-3 flex items-center justify-center">
                        <ImageIcon size={28} className="text-slate-300" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2">{alt.label}</p>
                      <p className="text-[14px] font-extrabold text-emerald-600 mt-1">{formatFcfa(alt.totalClientPrice)}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{alt.deliveryDays} jours</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex-shrink-0">
                  <Shield size={18} />
                </span>
                <div>
                  <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Paiement Escrow protégé</p>
                  <p className="text-[12px] text-slate-600 dark:text-slate-400">Votre argent est sécurisé jusqu&apos;à la réception du produit.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
