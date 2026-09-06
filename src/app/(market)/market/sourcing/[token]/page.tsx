'use client'

/**
 * Page de suivi public d'une demande de sourcing.
 * Accessible via le lien envoyé par SMS (publicToken).
 * - Affiche l'état de la demande, la proposition (si envoyée).
 * - Permet au client d'accepter / refuser sans compte.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  XCircle,
  ShoppingBag,
  Sparkles,
  ImageIcon,
  ExternalLink,
  Phone,
  Truck,
  Package,
  Shield
} from 'lucide-react'

type Proposal = {
  productName: string
  productImage?: string
  productGallery?: string[]
  supplierUrl?: string
  supplierName?: string
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

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'Demande reçue', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Sparkles },
  searching: { label: 'Recherche en cours', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Loader2 },
  proposal_ready: { label: 'Proposition en préparation', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  proposal_sent: { label: 'Proposition disponible', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  accepted: { label: 'Acceptée', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Refusée', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle },
  fulfilled: { label: 'Livrée', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle },
  expired: { label: 'Proposition expirée', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle }
}

function fmtPrice(n: number, currency = 'FCFA') {
  return `${Math.round(n).toLocaleString('fr-FR')} ${currency}`
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
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
        // Récupère un token CSRF (le middleware l'exige en production)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Demande introuvable</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">{error || 'Le lien semble invalide ou expiré.'}</p>
        <Link
          href="/market"
          className="mt-6 inline-flex items-center gap-2 text-violet-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au market
        </Link>
      </div>
    )
  }

  const statusCfg = STATUS_LABELS[data.status] || STATUS_LABELS.new
  const StatusIcon = statusCfg.icon
  const slaPassed = new Date(data.slaDueAt).getTime() < Date.now()
  const proposalExpired =
    data.proposal && new Date(data.proposal.expiresAt).getTime() < Date.now()

  const marketPrice = data.proposal ? Math.round(data.proposal.totalClientPrice * 1.3) : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/market"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-violet-600"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="mt-4 grid lg:grid-cols-[360px_1fr] gap-5">
          {/* Colonne gauche — Votre demande */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-violet-500" />
                Votre demande
              </h2>

              {data.imageUrl && (
                <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square mb-4">
                  <img src={data.imageUrl} alt="Photo" className="w-full h-full object-cover" />
                </div>
              )}

              <h3 className="font-bold text-gray-900 dark:text-white">
                {data.title || data.description.slice(0, 60)}
              </h3>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  Quantité : <strong>{data.qty}</strong>
                </div>
                {data.budgetMaxFCFA && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                    Budget max : <strong>{fmtPrice(data.budgetMaxFCFA)}</strong>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                  Soumise le <strong>{fmtDate(data.createdAt)}</strong>
                </div>
              </div>

              {data.externalUrl && (
                <a
                  href={data.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Lien fourni
                </a>
              )}
            </div>

            {/* Timeline statut */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                Statut de votre demande
              </h3>
              <StatusTimeline currentStatus={data.status} dates={{ createdAt: data.createdAt, proposalSentAt: data.proposalSentAt, clientDecisionAt: data.clientDecisionAt }} />
            </div>
          </div>

          {/* Colonne droite — Proposition */}
          <div className="space-y-5">
            {/* Statut sans proposition */}
            {!data.proposal && data.status !== 'cancelled' && data.status !== 'rejected' && (
              <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-emerald-50 dark:from-violet-900/20 dark:to-emerald-900/20 border border-violet-200 dark:border-violet-900/40 p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-xl">
                    <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      Notre équipe travaille sur votre demande
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Nous comparons les fournisseurs et calculons le meilleur prix livré chez vous.
                      Vous recevrez un <strong>SMS</strong> dès que la proposition est prête (sous 24h ouvrées max).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Proposition */}
            {data.proposal && (
              <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Header gradient */}
                <div className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-emerald-500 px-6 py-4">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5" />
                    <h2 className="text-lg font-bold">Nouvelle proposition reçue :</h2>
                  </div>
                </div>

                <div className="p-6">
                  {/* Produit sélectionné */}
                  <div className="flex items-start gap-3 mb-5">
                    {data.proposal.productImage ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        <img src={data.proposal.productImage} alt={data.proposal.productName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full mb-1">
                        <CheckCircle2 className="h-3 w-3" /> Produit sélectionné
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{data.proposal.productName}</h3>
                      {data.proposal.supplierName && (
                        <p className="text-xs text-gray-500 mt-0.5">{data.proposal.supplierName}</p>
                      )}
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prix unitaire livré</p>
                      <p className="text-2xl font-extrabold text-emerald-600">
                        {fmtPrice(Math.round(data.proposal.totalClientPrice / data.proposal.qty))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total {data.proposal.qty} unités</p>
                      <p className="text-2xl font-extrabold text-emerald-600">
                        {fmtPrice(data.proposal.totalClientPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Prix marché</p>
                      <p className="text-lg font-bold text-gray-400 line-through">
                        {fmtPrice(marketPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Économie */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 text-sm text-emerald-700 dark:text-emerald-300 mb-5">
                    <ShoppingBag className="h-4 w-4" />
                    Vous économisez <strong>{fmtPrice(marketPrice - data.proposal.totalClientPrice)}</strong>{' '}
                    (-{Math.round((1 - data.proposal.totalClientPrice / marketPrice) * 100)}%)
                  </div>

                  {/* Détails */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Truck className="h-4 w-4 text-violet-500" />
                      <span>Délai : <strong>{data.proposal.deliveryDays} jours</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Shield className="h-4 w-4 text-violet-500" />
                      <span>Garantie <strong>2 ans</strong> incluse</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {data.proposal.notes && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-5">
                      {data.proposal.notes}
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-2">
                    {data.status === 'proposal_sent' && !proposalExpired && (
                      <>
                        <button
                          type="button"
                          onClick={() => submitDecision('accepted')}
                          disabled={!!acting}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 text-white rounded-xl font-bold shadow-lg transition-opacity disabled:opacity-50"
                        >
                          {acting === 'accepted' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Accepter et payer
                        </button>
                        <button
                          type="button"
                          onClick={() => submitDecision('rejected')}
                          disabled={!!acting}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-violet-200 dark:bg-gray-800 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-xl font-bold hover:bg-violet-50 transition-colors disabled:opacity-50"
                        >
                          {acting === 'rejected' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                          Discuter avec un conseiller
                        </button>
                      </>
                    )}
                    {data.status === 'accepted' && (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 p-4 text-sm">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                          Proposition acceptée le {fmtDate(data.clientDecisionAt)}
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                          Notre équipe vous contacte pour finaliser le paiement et la livraison.
                        </p>
                      </div>
                    )}
                    {data.status === 'rejected' && (
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-700 dark:text-gray-300">
                        Proposition refusée le {fmtDate(data.clientDecisionAt)}. Merci de votre retour.
                      </div>
                    )}
                    {(data.status === 'expired' || proposalExpired) && (
                      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4 text-sm text-red-700 dark:text-red-300">
                        Cette proposition a expiré. Recontactez-nous pour relancer une nouvelle estimation.
                      </div>
                    )}
                  </div>

                  {decisionError && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {decisionError}
                    </div>
                  )}

                  {/* Expiration */}
                  {data.status === 'proposal_sent' && !proposalExpired && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Cette proposition est valable jusqu'au {fmtDate(data.proposal.expiresAt)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {data.proposal && data.proposal.alternativeOffers && data.proposal.alternativeOffers.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  {data.proposal.alternativeOffers.length} alternative{data.proposal.alternativeOffers.length > 1 ? 's' : ''} proposée{data.proposal.alternativeOffers.length > 1 ? 's' : ''}
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {data.proposal.alternativeOffers.map((alt, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
                    >
                      <div className="w-full h-24 rounded-lg bg-gray-100 dark:bg-gray-800 mb-3 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{alt.label}</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">{fmtPrice(alt.totalClientPrice)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Total {data.proposal!.qty} unités</p>
                      {alt.notes && <p className="text-xs text-gray-400 mt-1">{alt.notes}</p>}
                      <button className="mt-3 w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Voir détails
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer contact */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          <p className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Une question ? Répondez simplement au SMS reçu ou appelez-nous.
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  accent = 'default'
}: {
  label: string
  value: string
  icon: any
  accent?: 'default' | 'red'
}) {
  const colors =
    accent === 'red'
      ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-300'
      : 'border-gray-200 bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-300'
  return (
    <div className={`rounded-lg border p-2 ${colors}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold opacity-80">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-0.5 text-sm font-bold leading-tight">{value}</p>
    </div>
  )
}

function PriceRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-bold text-base text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
      <span>{label}</span>
      <span>{fmtPrice(value)}</span>
    </div>
  )
}

// ─── Timeline verticale de statut ───────────────────────────────────────────

function StatusTimeline({
  currentStatus,
  dates
}: {
  currentStatus: string
  dates: { createdAt?: string; proposalSentAt?: string; clientDecisionAt?: string }
}) {
  const steps = [
    { key: 'new', label: 'Demande reçue', desc: 'Nous avons bien reçu votre demande' },
    { key: 'searching', label: 'Analyse en cours', desc: 'Nous recherchons le meilleur fournisseur' },
    { key: 'proposal_ready', label: 'Proposition prête', desc: 'Notre équipe finalise le devis' },
    { key: 'proposal_sent', label: 'Proposition envoyée', desc: 'Votre devis est prêt !' },
    { key: 'accepted', label: 'Acceptation', desc: 'Commande confirmée' },
    { key: 'fulfilled', label: 'Livraison Sénégal', desc: 'Produit livré chez vous' },
  ]

  const statusOrder = steps.map((s) => s.key)
  const currentIndex = statusOrder.indexOf(currentStatus)

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
      {steps.map((s, i) => {
        const isActive = currentIndex >= i
        const isCurrent = currentStatus === s.key
        return (
          <div key={s.key} className="flex gap-3 relative py-2">
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 text-xs font-bold ${
                isActive
                  ? 'bg-gradient-to-br from-violet-500 to-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {isActive ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isCurrent ? 'text-violet-700 dark:text-violet-300' : isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {s.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
              {s.key === 'new' && dates.createdAt && (
                <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(dates.createdAt)}</p>
              )}
              {s.key === 'proposal_sent' && dates.proposalSentAt && (
                <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(dates.proposalSentAt)}</p>
              )}
              {s.key === 'accepted' && dates.clientDecisionAt && (
                <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(dates.clientDecisionAt)}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
