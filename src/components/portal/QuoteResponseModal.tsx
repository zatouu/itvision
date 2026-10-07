'use client'

import { useEffect, useState } from 'react'
import { X, Send, MessageSquare, ThumbsUp, ThumbsDown, RefreshCw, Loader2 } from 'lucide-react'
import SoftMessage from '@/components/ui/SoftMessage'
import SignaturePad from '@/components/portal/SignaturePad'
import { INPUT, BTN_PRIMARY, fmtNum, fmtDate, quoteClientResponse, StatusBadge } from '@/components/portal-ui'

export type QuoteModalTab = 'action' | 'comments'
type Decision = 'accepted' | 'rejected' | 'counter_proposed'

const DECISIONS: Array<{ id: Decision; label: string; icon: any; color: string }> = [
  { id: 'accepted', label: 'Accepter', icon: ThumbsUp, color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
  { id: 'rejected', label: 'Refuser', icon: ThumbsDown, color: 'border-red-300 bg-red-50 text-red-700' },
  { id: 'counter_proposed', label: 'Contre-proposition', icon: RefreshCw, color: 'border-sky-300 bg-sky-50 text-sky-700' },
]

/** Réponse du client à un devis (accepter et signer, refuser, contre-proposer) et commentaires. */
export default function QuoteResponseModal({
  quote, onClose, onAction, canRespond = true, initialTab = 'action',
}: {
  quote: any
  onClose: () => void
  onAction: (q: any) => void
  canRespond?: boolean
  initialTab?: QuoteModalTab
}) {
  const [tab, setTab] = useState<QuoteModalTab>(initialTab)
  const [action, setAction] = useState<Decision>('accepted')
  const [message, setMessage] = useState('')
  const [counterAmount, setCounterAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureName, setSignatureName] = useState('')
  const [consent, setConsent] = useState(false)

  const canAnswer = canRespond && quote.status === 'sent' && (!quote.clientResponse || quote.clientResponse === 'pending')
  const comments = quote.clientComments || []
  const missingForAccept = action === 'accepted'
    ? [!signatureName.trim() && 'le nom du signataire', !signature && 'la signature', !consent && 'la case de consentement'].filter(Boolean) as string[]
    : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  async function post(body: Record<string, unknown>) {
    const res = await fetch(`/api/client-enterprise/quotes/${quote._id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Erreur')
    return data
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (action === 'rejected' && !confirm('Confirmer le refus de ce devis ?')) return
    setLoading(true); setError('')
    try {
      const data = await post({
        action,
        message,
        counterAmount: counterAmount ? parseFloat(counterAmount) : undefined,
        ...(action === 'accepted' ? { signature, signatureName } : {}),
      })
      setSuccess('Votre réponse a été envoyée. Un email de confirmation vous a été transmis.')
      onAction(data?.quote || { ...quote, clientResponse: action, status: action === 'accepted' ? 'accepted' : action === 'rejected' ? 'rejected' : quote.status })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    setSendingComment(true); setError('')
    try {
      const data = await post({ action: 'comment', message: newComment })
      if (data?.quote) onAction(data.quote)
      setNewComment('')
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du commentaire")
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-950/50 backdrop-blur-sm" onClick={() => !loading && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="quote-modal-title" onClick={e => e.stopPropagation()}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-stone-200">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-stone-400">#{quote.numero}</span>
              {quote.clientResponse && <StatusBadge status={quote.clientResponse} map={quoteClientResponse} />}
            </div>
            <h2 id="quote-modal-title" className="font-bold tracking-tight text-stone-900 mt-0.5 truncate">{quote.title || 'Devis'}</h2>
            <p className="text-sm text-emerald-800 font-semibold tabular-nums">{fmtNum(quote.total)} FCFA</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-stone-100 px-5 sm:px-6 flex-shrink-0" role="tablist">
          {[
            { id: 'action' as const, label: canAnswer ? 'Répondre' : 'Réponse', icon: ThumbsUp },
            { id: 'comments' as const, label: `Commentaires${comments.length ? ` (${comments.length})` : ''}`, icon: MessageSquare },
          ].map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-6">
          {tab === 'action' && (
            <div className="space-y-4">
              {success ? (
                <SoftMessage variant="success" title="Réponse enregistrée" message={success} onClose={onClose} />
              ) : !canAnswer ? (
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-6 text-center">
                  <p className="text-stone-500 text-sm">
                    {!canRespond ? "Vous n'avez pas le droit d'accepter ou refuser les devis. Un administrateur de votre espace peut vous l'accorder (Paramètres > Équipe et droits). Vous pouvez laisser un commentaire." :
                     quote.clientResponse === 'accepted' ? 'Vous avez déjà accepté ce devis.' :
                     quote.clientResponse === 'rejected' ? 'Vous avez déjà refusé ce devis.' :
                     quote.clientResponse === 'counter_proposed' ? 'Votre contre-proposition a été envoyée.' :
                     'Ce devis ne nécessite pas de réponse.'}
                  </p>
                  {quote.clientRespondedAt && <p className="text-xs text-stone-400 mt-1">Le {fmtDate(quote.clientRespondedAt)}</p>}
                  {quote.clientCounterAmount && (
                    <p className="text-sm font-semibold text-emerald-800 tabular-nums mt-2">Contre-proposition : {fmtNum(quote.clientCounterAmount)} FCFA</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-stone-700 mb-2">Votre décision</p>
                    <div className="grid grid-cols-3 gap-2">
                      {DECISIONS.map(opt => (
                        <button key={opt.id} type="button" onClick={() => setAction(opt.id)} aria-pressed={action === opt.id}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                            action === opt.id ? opt.color + ' shadow-sm' : 'border-stone-200 text-stone-500 hover:border-stone-300'
                          }`}>
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {action === 'counter_proposed' && (
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Votre proposition de montant (FCFA)</label>
                      <input type="number" min={0} required value={counterAmount} onChange={e => setCounterAmount(e.target.value)}
                        placeholder={String(quote.total)} className={INPUT} />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Message {action === 'counter_proposed' ? '(expliquez votre proposition)' : '(facultatif)'}
                    </label>
                    <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="Votre commentaire pour l'équipe IT Vision..." className={`${INPUT} resize-none`} />
                  </div>

                  {action === 'accepted' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1.5">Nom du signataire *</label>
                        <input className={INPUT} placeholder="Nom et prénom du signataire" value={signatureName} onChange={e => setSignatureName(e.target.value)} autoComplete="name" />
                      </div>
                      <SignaturePad onChange={setSignature} />
                      <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer">
                        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                          className="mt-0.5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600" />
                        <span>Je reconnais que cette signature électronique vaut engagement de la société {quote.client?.name || ''} et accepte le devis n° {quote.numero} pour un montant de {fmtNum(quote.total)} FCFA.</span>
                      </label>
                    </div>
                  )}

                  {error && <SoftMessage variant="error" title="Action non envoyée" message={error} onClose={() => setError('')} />}

                  <button type="submit" disabled={loading || missingForAccept.length > 0} className={`${BTN_PRIMARY} w-full py-3`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? 'Envoi...' : action === 'accepted' ? 'Accepter et signer' : action === 'rejected' ? 'Refuser le devis' : 'Envoyer la contre-proposition'}
                  </button>
                  {missingForAccept.length > 0 && (
                    <p className="text-xs text-center text-amber-700">Pour signer, renseignez {missingForAccept.join(', ')}.</p>
                  )}
                  <p className="text-xs text-center text-stone-400">Un email de confirmation vous sera envoyé et l&apos;équipe IT Vision sera notifiée immédiatement.</p>
                </form>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">Aucun commentaire pour l&apos;instant. Posez votre question à l&apos;équipe IT Vision.</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c: any, i: number) => (
                    <div key={i} className={`flex gap-3 ${c.authorRole === 'CLIENT' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        c.authorRole === 'CLIENT' ? 'bg-emerald-800 text-emerald-50 rounded-br-sm' : 'bg-stone-100 text-stone-800 rounded-bl-sm'
                      }`}>
                        <p className={`text-[10px] font-semibold mb-1 ${c.authorRole === 'CLIENT' ? 'text-emerald-200/80' : 'text-stone-400'}`}>
                          {c.authorRole === 'CLIENT' ? 'Vous' : 'IT Vision'}
                        </p>
                        <p className="whitespace-pre-line">{c.message}</p>
                        <p className={`text-[10px] mt-1 ${c.authorRole === 'CLIENT' ? 'text-emerald-200/60' : 'text-stone-400'}`}>{fmtDate(c.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {error && <SoftMessage variant="error" title="Commentaire non envoyé" message={error} onClose={() => setError('')} />}
              <form onSubmit={handleComment} className="flex gap-2 mt-4">
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Envoyer un commentaire à IT Vision..."
                  aria-label="Nouveau commentaire" className={`flex-1 ${INPUT}`} />
                <button type="submit" disabled={sendingComment || !newComment.trim()} aria-label="Envoyer"
                  className="rounded-full bg-emerald-800 px-3.5 py-2 text-white hover:bg-emerald-900 disabled:opacity-40 transition-colors flex-shrink-0">
                  {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
