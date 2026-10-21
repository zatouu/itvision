'use client'

import { useCallback, useEffect, useState } from 'react'
import { PackageSearch, Send, Clock, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react'
import {
  CARD, INPUT, BTN_PRIMARY, PageHeader, BackLink, EmptyState, StatusBadge, Pill, TONE,
  fmtDate, fmtNum, sourcingStatus,
} from '@/components/portal-ui'

type SourcingRequestRow = {
  id: string
  reference: string
  title?: string
  description?: string
  qty: number
  budgetMaxFCFA?: number
  externalUrl?: string
  status: string
  createdAt: string
  slaDueAt?: string
  clientDecision?: string
  proposal?: {
    productName: string
    productImage?: string
    supplierUrl?: string
    qty: number
    totalClientPrice: number
    deliveryDays: number
    expiresAt?: string
    notes?: string
  } | null
}

export default function SourcingSection({ canRequest = true }: { canRequest?: boolean }) {  const [requests, setRequests] = useState<SourcingRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    qty: '1',
    budgetMaxFCFA: '',
    externalUrl: '',
    contactPhone: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client-enterprise/sourcing')
      const data = await res.json().catch(() => ({}))
      setRequests(Array.isArray(data?.requests) ? data.requests : [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/client-enterprise/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          qty: parseInt(form.qty, 10) || 1,
          budgetMaxFCFA: form.budgetMaxFCFA ? parseInt(form.budgetMaxFCFA, 10) : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSuccess(`Demande ${data.reference} envoyée — réponse sous 24h ouvrées.`)
      setForm({ title: '', description: '', qty: '1', budgetMaxFCFA: '', externalUrl: '', contactPhone: form.contactPhone })
      await load()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’envoi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <PageHeader
        icon={PackageSearch}
        eyebrow="Sourcing"
        title="Trouvez-moi un produit"
        subtitle="Un produit absent du catalogue ? Décrivez-le, nous le sourçons en Chine et revenons avec un prix livré."
      >
        <BackLink href="/portail-entreprise" className="hidden sm:inline-flex" />
      </PageHeader>

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm font-medium text-emerald-800">{success}</p>
        </div>
      )}

      {canRequest && (
        <form onSubmit={handleSubmit} className={`${CARD} p-5 space-y-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Produit recherché *</label>
              <input
                className={INPUT}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex : caméra IP 4MP extérieure avec NVR 8 canaux"
                maxLength={200}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Description détaillée *</label>
              <textarea
                rows={4}
                required
                className={`${INPUT} resize-none`}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Caractéristiques, marque souhaitée, usage, contraintes techniques…"
                maxLength={4000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Quantité</label>
              <input
                type="number"
                min={1}
                className={INPUT}
                value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Budget indicatif (FCFA)</label>
              <input
                type="number"
                min={0}
                className={INPUT}
                value={form.budgetMaxFCFA}
                onChange={e => setForm(f => ({ ...f, budgetMaxFCFA: e.target.value }))}
                placeholder="Optionnel"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Lien du produit (1688 / AliExpress…)</label>
              <input
                className={INPUT}
                value={form.externalUrl}
                onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Téléphone de contact *</label>
              <input
                className={INPUT}
                required
                value={form.contactPhone}
                onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+221 …"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-900">Vos demandes</h2>

        {loading ? (
          <div className={`${CARD} p-6 text-center text-sm text-stone-400`}>Chargement…</div>
        ) : requests.length === 0 ? (
          <EmptyState
            soft
            icon={PackageSearch}
            title="Aucune demande de sourcing"
            message="Vos demandes et les propositions reçues apparaîtront ici."
          />
        ) : (
          <ul className="space-y-3">
            {requests.map(r => (
              <li key={r.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-stone-400">{r.reference}</span>
                      <StatusBadge status={r.status} map={sourcingStatus} />
                      {r.status === 'new' && r.slaDueAt && (
                        <Pill color={TONE.amber}><Clock className="w-3 h-3 mr-1" />réponse avant {fmtDate(r.slaDueAt)}</Pill>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-stone-900 truncate">{r.title || 'Produit recherché'}</p>
                    <p className="mt-0.5 text-xs text-stone-400 line-clamp-2">{r.description}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      Quantité : {r.qty}
                      {r.budgetMaxFCFA ? ` · Budget : ${fmtNum(r.budgetMaxFCFA)} F` : ''}
                      {r.createdAt ? ` · ${fmtDate(r.createdAt)}` : ''}
                    </p>
                  </div>
                </div>

                {r.proposal && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <CheckCircle className="w-3.5 h-3.5" /> Proposition IT Vision
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      {r.proposal.productImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.proposal.productImage} alt="" className="h-14 w-14 rounded-lg object-cover border border-emerald-100 bg-white" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900 truncate">{r.proposal.productName}</p>
                        <p className="text-xs text-stone-500">
                          {fmtNum(r.proposal.totalClientPrice)} F livré · {r.proposal.deliveryDays} j
                          {r.proposal.expiresAt ? ` · valable jusqu'au ${fmtDate(r.proposal.expiresAt)}` : ''}
                        </p>
                      </div>
                      {r.proposal.supplierUrl && (
                        <a href={r.proposal.supplierUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" /> Référence
                        </a>
                      )}
                    </div>
                    {r.clientDecision === 'rejected' && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-stone-500">
                        <XCircle className="w-3.5 h-3.5" /> Vous avez refusé cette proposition
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
