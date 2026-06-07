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
  Package
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
        const res = await fetch(`/api/market/sourcing/track/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* Back */}
        <Link
          href="/market"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-violet-600"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        {/* Header */}
        <div className="mt-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Référence</p>
              <p className="text-xl font-mono font-bold text-violet-700 dark:text-violet-300 mt-1">
                {data.reference}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusCfg.color}`}
            >
              <StatusIcon className={`h-3.5 w-3.5 ${data.status === 'searching' ? 'animate-spin' : ''}`} />
              {statusCfg.label}
            </div>
          </div>

          {data.title && (
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{data.title}</h1>
          )}
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{data.description}</p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Stat label="Quantité" value={`${data.qty}`} icon={Package} />
            {data.budgetMaxFCFA ? (
              <Stat label="Budget max" value={fmtPrice(data.budgetMaxFCFA)} icon={ShoppingBag} />
            ) : null}
            <Stat
              label="Réponse avant"
              value={fmtDate(data.slaDueAt)}
              icon={Clock}
              accent={slaPassed && !data.proposal ? 'red' : 'default'}
            />
            <Stat label="Soumise le" value={fmtDate(data.createdAt)} icon={Sparkles} />
          </div>

          {/* Pièce jointe / lien */}
          {(data.imageUrl || data.externalUrl) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {data.imageUrl && (
                <a
                  href={data.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Voir la photo
                </a>
              )}
              {data.externalUrl && (
                <a
                  href={data.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Lien fourni
                </a>
              )}
            </div>
          )}
        </div>

        {/* Statut sans proposition */}
        {!data.proposal && data.status !== 'cancelled' && data.status !== 'rejected' && (
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-violet-50 to-emerald-50 dark:from-violet-900/20 dark:to-emerald-900/20 border border-violet-200 dark:border-violet-900/40 p-6">
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
          <div className="mt-5 rounded-2xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/40 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Proposition de l'équipe
              </h2>
              {data.proposal.proposedByName && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  par {data.proposal.proposedByName}
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Image */}
              {data.proposal.productImage ? (
                <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square">
                  <img
                    src={data.proposal.productImage}
                    alt={data.proposal.productName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-gray-100 dark:bg-gray-800 aspect-square flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-300" />
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{data.proposal.productName}</h3>
                {data.proposal.supplierName && (
                  <p className="text-xs text-gray-500 mt-1">Fournisseur : {data.proposal.supplierName}</p>
                )}

                <div className="mt-4 text-3xl font-extrabold text-emerald-600">
                  {fmtPrice(data.proposal.totalClientPrice, data.proposal.currency)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Prix livré tout compris, pour {data.proposal.qty} unité{data.proposal.qty > 1 ? 's' : ''}
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                  <Truck className="h-3.5 w-3.5" />
                  Livraison en {data.proposal.deliveryDays} jours
                </div>
              </div>
            </div>

            {/* Détail prix */}
            <div className="mt-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-sm space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Détail du prix</p>
              <PriceRow label="Coût produit" value={data.proposal.productCostFCFA} />
              <PriceRow
                label={`Frais de service (${data.proposal.serviceFeeRate}%)`}
                value={data.proposal.serviceFeeAmount}
              />
              <PriceRow
                label={`Assurance (${data.proposal.insuranceRate}%)`}
                value={data.proposal.insuranceAmount}
              />
              <PriceRow
                label={`Transport (${data.proposal.shippingMethod.replace('_', ' ')})`}
                value={data.proposal.shippingCost}
              />
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              <PriceRow label="Total livré Dakar" value={data.proposal.totalClientPrice} bold />
            </div>

            {/* Notes */}
            {data.proposal.notes && (
              <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {data.proposal.notes}
              </div>
            )}

            {/* Alternatives */}
            {data.proposal.alternativeOffers && data.proposal.alternativeOffers.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Autres options
                </p>
                <div className="space-y-2">
                  {data.proposal.alternativeOffers.map((alt, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{alt.label}</p>
                        {alt.notes && (
                          <p className="text-xs text-gray-500 mt-0.5">{alt.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {fmtPrice(alt.totalClientPrice)}
                        </p>
                        <p className="text-xs text-gray-500">{alt.deliveryDays} jours</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expiration / Décision */}
            <div className="mt-5">
              {data.status === 'proposal_sent' && !proposalExpired && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Cette proposition est valable jusqu'au {fmtDate(data.proposal.expiresAt)}
                  </p>
                  {decisionError && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {decisionError}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => submitDecision('accepted')}
                      disabled={!!acting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                      {acting === 'accepted' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Accepter et commander
                    </button>
                    <button
                      type="button"
                      onClick={() => submitDecision('rejected')}
                      disabled={!!acting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {acting === 'rejected' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Refuser
                    </button>
                  </div>
                </>
              )}
              {data.status === 'accepted' && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 p-4 text-sm">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    🎉 Proposition acceptée le {fmtDate(data.clientDecisionAt)}
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
              {data.status === 'expired' || proposalExpired ? (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4 text-sm text-red-700 dark:text-red-300">
                  Cette proposition a expiré. Recontactez-nous pour relancer une nouvelle estimation.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Footer contact */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
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
