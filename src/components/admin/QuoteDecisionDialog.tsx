'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'

const CHANNELS = [
  { value: 'phone', label: 'Téléphone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'signed_po', label: 'Bon de commande / devis signé' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'En personne' },
  { value: 'other', label: 'Autre' },
]

/** Enregistre la réponse d'un client obtenue hors portail (accord téléphonique, BC papier…). */
export default function QuoteDecisionDialog({
  quote,
  decision,
  onClose,
  onDone,
}: {
  quote: { id: string; numero: string; total?: number }
  decision: 'accepted' | 'rejected'
  onClose: () => void
  onDone: (result: { status: string; projectId: string | null }) => void
}) {
  const [channel, setChannel] = useState('phone')
  const [decidedAt, setDecidedAt] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accept = decision === 'accepted'

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/decision`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, channel, decidedAt, reference, note }),
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data, 'Enregistrement impossible'))
      onDone({ status: data.status, projectId: data.projectId })
    } catch (e: any) {
      setError(e?.message || 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <p className={`flex items-center gap-2 text-base font-semibold ${accept ? 'text-emerald-800' : 'text-red-700'}`}>
          {accept ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {accept ? 'Le client a accepté' : 'Le client a refusé'} le devis {quote.numero}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {accept
            ? 'Le projet lié passe en « Validé » et le montant contractuel est mis à jour, comme une acceptation depuis le portail.'
            : 'Le devis est clôturé ; vous pourrez en émettre une nouvelle version.'}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-stone-600">
            Comment ?
            <select value={channel} onChange={e => setChannel(e.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm">
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-stone-600">
            Date
            <input type="date" value={decidedAt} max={new Date().toISOString().slice(0, 10)} onChange={e => setDecidedAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
          </label>
          {accept && (
            <label className="text-xs font-medium text-stone-600 sm:col-span-2">
              N° de bon de commande (facultatif)
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="BC-2026-…"
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
            </label>
          )}
          <label className="text-xs font-medium text-stone-600 sm:col-span-2">
            Note (tracée dans l’historique)
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder={accept ? 'Ex. accord de M. Mamoudou par téléphone, acompte à la livraison' : 'Motif du refus'}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Annuler</button>
          <button type="button" onClick={submit} disabled={busy}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${accept ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {accept ? 'Enregistrer l’acceptation' : 'Enregistrer le refus'}
          </button>
        </div>
      </div>
    </div>
  )
}
