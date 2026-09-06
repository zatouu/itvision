'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Receipt, FileText,
  X, Send, MessageSquare, ThumbsUp, ThumbsDown, RefreshCw,
  Loader2, Calendar, Package, ChevronRight, ShoppingCart
} from 'lucide-react'
import SoftMessage from '@/components/ui/SoftMessage'
import SignaturePad from '@/components/portal/SignaturePad'
import {
  CARD, INPUT, BTN_PRIMARY, TONE,
  fmtNum, fmtDate,
  quoteStatus, quoteClientResponse, invoiceStatus,
  StatusBadge, Pill, PageHeader, BackLink, EmptyState
} from '@/components/portal-ui'

// ─── Quote Detail Modal ────────────────────────────────────────────────────────
function QuoteModal({ quote, onClose, onAction }: { quote: any; onClose: () => void; onAction: (q: any) => void }) {
  const [tab, setTab] = useState<'detail' | 'action' | 'comments'>('detail')
  const [action, setAction] = useState<'accepted' | 'rejected' | 'counter_proposed' | 'comment'>('accepted')
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

  const canRespond = quote.status === 'sent' && (!quote.clientResponse || quote.clientResponse === 'pending')
  const comments = quote.clientComments || []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/client-enterprise/quotes/${quote._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          message,
          counterAmount: counterAmount ? parseFloat(counterAmount) : undefined,
          ...(action === 'accepted' ? { signature, signatureName } : {})
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSuccess('Votre réponse a été envoyée. Un email de confirmation a été transmis.')
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
    setSendingComment(true)
    setError('')
    try {
      const res = await fetch(`/api/client-enterprise/quotes/${quote._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', message: newComment })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      if (data?.quote) onAction(data.quote)
      setNewComment('')
      setTab('comments')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi du commentaire')
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-stone-400">#{quote.numero}</span>
              {quote.clientResponse && (
                <StatusBadge status={quote.clientResponse} map={quoteClientResponse} />
              )}
            </div>
            <h2 className="font-bold tracking-tight text-stone-900 mt-0.5 truncate">{quote.title || 'Devis'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100 px-5 sm:px-6 flex-shrink-0 overflow-x-auto">
          {[
            { id: 'detail', label: 'Détail', icon: FileText },
            { id: 'action', label: canRespond ? 'Répondre' : 'Réponse', icon: ThumbsUp },
            { id: 'comments', label: `Commentaires${comments.length ? ` (${comments.length})` : ''}`, icon: MessageSquare },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6">

          {/* DETAIL TAB */}
          {tab === 'detail' && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-xs text-stone-400 mb-0.5">Date</p>
                  <p className="font-medium text-stone-900">{fmtDate(quote.date)}</p>
                </div>
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-xs text-stone-400 mb-0.5">Statut</p>
                  <StatusBadge status={quote.status} map={quoteStatus} fallback="draft" />
                </div>
                {quote.dateLivraison && (
                  <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <p className="text-xs text-stone-400 mb-0.5">Livraison prévue</p>
                    <p className="font-medium text-stone-900">{quote.dateLivraison}</p>
                  </div>
                )}
                {quote.pointExpedition && (
                  <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <p className="text-xs text-stone-400 mb-0.5">Point d&apos;expédition</p>
                    <p className="font-medium text-stone-900">{quote.pointExpedition}</p>
                  </div>
                )}
                {quote.bonCommande && (
                  <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <p className="text-xs text-stone-400 mb-0.5">Bon de commande</p>
                    <p className="font-medium text-stone-900">{quote.bonCommande}</p>
                  </div>
                )}
              </div>

              {/* Lignes produits */}
              {quote.products?.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Prestations & fournitures
                  </h3>
                  <div className="rounded-xl border border-stone-200 overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-stone-400">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">Qté</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">P.U.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {quote.products.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-stone-50/60">
                            <td className="px-3 py-2 text-stone-700">{p.description}</td>
                            <td className="px-3 py-2 text-right text-stone-500 tabular-nums">{p.quantity}</td>
                            <td className="px-3 py-2 text-right text-stone-500 tabular-nums">{fmtNum(p.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-medium text-stone-900 tabular-nums">{fmtNum(p.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totaux */}
              <div className="rounded-xl border border-stone-200 divide-y divide-stone-100">
                {quote.subtotal > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-stone-500">Sous-total HT</span>
                    <span className="text-stone-700 tabular-nums">{fmtNum(quote.subtotal)} FCFA</span>
                  </div>
                )}
                {quote.brsAmount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-stone-500">BRS (5%)</span>
                    <span className="text-red-500 tabular-nums">- {fmtNum(quote.brsAmount)} FCFA</span>
                  </div>
                )}
                {quote.taxAmount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-stone-500">TVA</span>
                    <span className="text-stone-700 tabular-nums">{fmtNum(quote.taxAmount)} FCFA</span>
                  </div>
                )}
                {quote.other !== 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-stone-500">Autres</span>
                    <span className="text-stone-700 tabular-nums">{fmtNum(quote.other)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 font-bold">
                  <span className="text-stone-900">TOTAL TTC</span>
                  <span className="text-emerald-800 text-lg tabular-nums">{fmtNum(quote.total)} FCFA</span>
                </div>
              </div>

              {/* Conditions */}
              {quote.conditions && (
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                  <p className="text-xs font-semibold text-stone-400 mb-1">Conditions</p>
                  <p className="text-sm text-stone-600">{quote.conditions}</p>
                </div>
              )}
              {quote.notes && (
                <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
                  <p className="text-xs font-semibold text-sky-600 mb-1">Notes</p>
                  <p className="text-sm text-sky-800">{quote.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ACTION TAB */}
          {tab === 'action' && (
            <div className="space-y-4">
              {success ? (
                <SoftMessage
                  variant="success"
                  title="Réponse enregistrée"
                  message={success}
                  onClose={() => setSuccess('')}
                />
              ) : !canRespond ? (
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-6 text-center">
                  <p className="text-stone-500 text-sm">
                    {quote.clientResponse === 'accepted' ? 'Vous avez déjà accepté ce devis.' :
                     quote.clientResponse === 'rejected' ? 'Vous avez déjà refusé ce devis.' :
                     quote.clientResponse === 'counter_proposed' ? 'Votre contre-proposition a été envoyée.' :
                     'Ce devis ne nécessite pas de réponse.'}
                  </p>
                  {quote.clientRespondedAt && (
                    <p className="text-xs text-stone-400 mt-1">Le {fmtDate(quote.clientRespondedAt)}</p>
                  )}
                  {quote.clientCounterAmount && (
                    <p className="text-sm font-semibold text-emerald-800 tabular-nums mt-2">Contre-proposition : {fmtNum(quote.clientCounterAmount)} FCFA</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-stone-600">
                    Montant du devis : <strong className="text-emerald-800 tabular-nums">{fmtNum(quote.total)} FCFA</strong>
                  </p>

                  {/* Choix action */}
                  <div>
                    <p className="text-sm font-medium text-stone-700 mb-2">Votre décision</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'accepted', label: 'Accepter', icon: ThumbsUp, color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
                        { id: 'rejected', label: 'Refuser', icon: ThumbsDown, color: 'border-red-300 bg-red-50 text-red-700' },
                        { id: 'counter_proposed', label: 'Contre-proposition', icon: RefreshCw, color: 'border-sky-300 bg-sky-50 text-sky-700' },
                      ].map(opt => (
                        <button key={opt.id} type="button" onClick={() => setAction(opt.id as any)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                            action === opt.id ? opt.color + ' shadow-sm' : 'border-stone-200 text-stone-500 hover:border-stone-300'
                          }`}>
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contre-proposition montant */}
                  {action === 'counter_proposed' && (
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Votre proposition de montant (FCFA)
                      </label>
                      <input
                        type="number" min={0} required={action === 'counter_proposed'}
                        value={counterAmount}
                        onChange={e => setCounterAmount(e.target.value)}
                        placeholder={String(quote.total)}
                        className={INPUT}
                      />
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Message {action === 'counter_proposed' ? '(expliquez votre proposition)' : '(facultatif)'}
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Votre commentaire pour l'équipe IT Vision..."
                      className={`${INPUT} resize-none`}
                    />
                  </div>

                  {/* Signature électronique — requise pour accepter */}
                  {action === 'accepted' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1.5">Nom du signataire *</label>
                        <input
                          className={INPUT}
                          placeholder="Nom et prénom du signataire"
                          value={signatureName}
                          onChange={e => setSignatureName(e.target.value)}
                        />
                      </div>
                      <SignaturePad onChange={setSignature} />
                      <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer">
                        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                          className="mt-0.5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600" />
                        <span>Je reconnais que cette signature électronique vaut engagement de la société {quote.client?.name || ''} et accepte le devis n° {quote.numero} pour un montant de {fmtNum(quote.total)} FCFA.</span>
                      </label>
                    </div>
                  )}

                  {error && (
                    <SoftMessage
                      variant="error"
                      title="Action non envoyée"
                      message={error}
                      onClose={() => setError('')}
                    />
                  )}

                  <button type="submit"
                    disabled={loading || (action === 'accepted' && (!signature || !signatureName.trim() || !consent))}
                    className={`${BTN_PRIMARY} w-full py-3`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? 'Envoi...' : `Confirmer — ${action === 'accepted' ? 'Accepter et signer' : action === 'rejected' ? 'Refuser' : 'Envoyer la contre-proposition'}`}
                  </button>
                  <p className="text-xs text-center text-stone-400">Un email de confirmation vous sera envoyé et l&apos;équipe IT Vision sera notifiée immédiatement.</p>
                </form>
              )}
            </div>
          )}

          {/* COMMENTS TAB */}
          {tab === 'comments' && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">Aucun commentaire pour l&apos;instant</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c: any, i: number) => (
                    <div key={i} className={`flex gap-3 ${c.authorRole === 'CLIENT' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        c.authorRole === 'CLIENT'
                          ? 'bg-emerald-800 text-emerald-50 rounded-br-sm'
                          : 'bg-stone-100 text-stone-800 rounded-bl-sm'
                      }`}>
                        <p className={`text-[10px] font-semibold mb-1 ${c.authorRole === 'CLIENT' ? 'text-emerald-200/80' : 'text-stone-400'}`}>
                          {c.authorRole === 'CLIENT' ? 'Vous' : 'IT Vision'}
                        </p>
                        <p>{c.message}</p>
                        <p className={`text-[10px] mt-1 ${c.authorRole === 'CLIENT' ? 'text-emerald-200/60' : 'text-stone-400'}`}>
                          {fmtDate(c.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleComment} className="flex gap-2 mt-4">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Envoyer un commentaire à IT Vision..."
                  className={`flex-1 ${INPUT}`}
                />
                <button type="submit" disabled={sendingComment || !newComment.trim()}
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

// ─── Invoice Detail Modal ──────────────────────────────────────────────────────
function InvoiceModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const isOverdue = invoice.status === 'overdue'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-stone-200">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="min-w-0">
            <span className="font-mono text-xs text-stone-400">Facture #{invoice.numero}</span>
            <h2 className="font-bold tracking-tight text-stone-900 mt-0.5 truncate">
              {invoice.client?.company || invoice.client?.name || '—'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4">
          {/* Status + dates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
              <p className="text-xs text-stone-400 mb-1">Statut</p>
              <StatusBadge status={invoice.status} map={invoiceStatus} fallback="sent" />
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
              <p className="text-xs text-stone-400 mb-0.5">Date émission</p>
              <p className="font-medium text-stone-900">{fmtDate(invoice.date)}</p>
            </div>
            <div className={`rounded-xl border p-3 ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-stone-50 border-stone-100'}`}>
              <p className="text-xs text-stone-400 mb-0.5">Échéance</p>
              <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-stone-900'}`}>
                {fmtDate(invoice.dueDate)}
              </p>
            </div>
            {invoice.paidAt && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-xs text-stone-400 mb-0.5">Payée le</p>
                <p className="font-medium text-emerald-700">{fmtDate(invoice.paidAt)}</p>
              </div>
            )}
            {invoice.paymentMethod && (
              <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                <p className="text-xs text-stone-400 mb-0.5">Mode de paiement</p>
                <p className="font-medium text-stone-900">{invoice.paymentMethod}</p>
              </div>
            )}
            {invoice.quoteId && (
              <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                <p className="text-xs text-stone-400 mb-0.5">Devis associé</p>
                <p className="font-medium text-stone-900 font-mono">{invoice.quoteId}</p>
              </div>
            )}
          </div>

          {/* Items */}
          {invoice.items?.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Détail des prestations</h3>
              <div className="rounded-xl border border-stone-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-400">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">Qté</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">P.U.</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {invoice.items.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-stone-50/60">
                        <td className="px-3 py-2 text-stone-700">{item.description}</td>
                        <td className="px-3 py-2 text-right text-stone-500 tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-stone-500 tabular-nums">{fmtNum(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium text-stone-900 tabular-nums">{fmtNum(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totaux */}
          <div className="rounded-xl border border-stone-200 divide-y divide-stone-100">
            {invoice.subtotal > 0 && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-stone-500">Sous-total HT</span>
                <span className="text-stone-700 tabular-nums">{fmtNum(invoice.subtotal)} FCFA</span>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-stone-500">TVA ({invoice.taxRate || 18}%)</span>
                <span className="text-stone-700 tabular-nums">{fmtNum(invoice.taxAmount)} FCFA</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 font-bold">
              <span className="text-stone-900">TOTAL TTC</span>
              <span className={`text-lg tabular-nums ${invoice.status === 'paid' ? 'text-emerald-700' : isOverdue ? 'text-red-600' : 'text-emerald-800'}`}>
                {fmtNum(invoice.total)} FCFA
              </span>
            </div>
          </div>

          {isOverdue && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              <strong>Facture en retard.</strong> Merci de régulariser dans les plus brefs délais ou de nous contacter : <strong>contact@itvisionplus.sn</strong>
            </div>
          )}
          {invoice.status === 'sent' && (
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-4 text-sm text-sky-800">
              Pour procéder au paiement ou si vous avez des questions, contactez-nous : <strong>contact@itvisionplus.sn</strong> — <strong>+221 77 413 34 40</strong>
            </div>
          )}
          {invoice.notes && (
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs font-semibold text-stone-400 mb-1">Notes</p>
              <p className="text-sm text-stone-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [tab, setTab] = useState<'quotes' | 'invoices' | 'bons'>('quotes')
  const [quotes, setQuotes] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<any>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [quoteFilter, setQuoteFilter] = useState<string>('all')
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/client-enterprise/documents')
      .then(r => r.json())
      .then(d => { setQuotes(d.quotes || []); setInvoices(d.invoices || []) })
      .finally(() => setLoading(false))
  }, [])

  const handleQuoteAction = useCallback((updated: any) => {
    const normalized = {
      ...updated,
      clientComments: Array.isArray(updated?.clientComments)
        ? [...updated.clientComments].sort((a: any, b: any) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime())
        : updated?.clientComments
    }
    setQuotes(prev => prev.map(q => q._id === normalized._id ? { ...q, ...normalized } : q))
    setSelectedQuote((prev: any) => prev?._id === normalized._id ? { ...prev, ...normalized } : prev)
  }, [])

  // KPIs financiers
  const totalBilled   = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalDue      = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
  const totalOverdue  = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0)
  const quotesPending = quotes.filter(q => q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')).length
  const totalQuotesPending = quotes.filter(q => q.status === 'sent').reduce((s, q) => s + (q.total || 0), 0)

  // Bons de commande = devis acceptés OU avec référence BC
  const bonsDeCommande = quotes.filter(q =>
    q.clientResponse === 'accepted' || q.status === 'accepted' || !!q.bonCommande
  )

  const filteredQuotes = quotes.filter(q => {
    if (quoteFilter === 'all') return true
    if (quoteFilter === 'pending') return q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')
    return q.status === quoteFilter
  })
  const filteredInvoices = invoices.filter(i => {
    if (invoiceFilter === 'all') return true
    return i.status === invoiceFilter
  })

  const pill = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'border-emerald-700 bg-emerald-800 text-white'
        : 'border-stone-200 bg-white text-stone-500 hover:border-emerald-300 hover:text-emerald-800'
    }`

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <PageHeader
        icon={Receipt}
        eyebrow="Facturation"
        title="Documents financiers"
        subtitle={`${quotes.length} devis · ${invoices.length} factures · ${bonsDeCommande.length} bons de commande`}
      >
        <BackLink />
      </PageHeader>

      {/* KPI financiers */}
      {!loading && (
        <section className={`overflow-hidden ${CARD}`}>
          <div className="grid grid-cols-2 gap-px bg-stone-200/70 lg:grid-cols-4">
            {[
              { label: 'Total facturé', value: `${fmtNum(totalBilled)} F`, sub: `${invoices.length} factures`, valueColor: 'text-stone-900' },
              { label: 'Payé', value: `${fmtNum(totalPaid)} F`, sub: `${invoices.filter(i=>i.status==='paid').length} factures`, valueColor: 'text-emerald-700' },
              { label: 'À régler', value: `${fmtNum(totalDue)} F`, sub: totalOverdue > 0 ? `dont ${fmtNum(totalOverdue)} F en retard` : `${invoices.filter(i=>['sent','overdue'].includes(i.status)).length} factures`, valueColor: totalOverdue > 0 ? 'text-red-600' : 'text-amber-600' },
              { label: 'Devis en attente', value: String(quotesPending), sub: quotesPending > 0 ? `${fmtNum(totalQuotesPending)} F en jeu` : 'Aucune action requise', valueColor: quotesPending > 0 ? 'text-sky-700' : 'text-stone-400' },
            ].map(k => (
              <div key={k.label} className="bg-white px-4 sm:px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">{k.label}</p>
                <p className={`text-xl font-bold tracking-tight mt-1.5 tabular-nums ${k.valueColor}`}>{k.value}</p>
                <p className="text-[11px] text-stone-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {[
          { id: 'quotes',   label: `Devis (${quotes.length})` },
          { id: 'invoices', label: `Factures (${invoices.length})` },
          { id: 'bons',     label: `Bons de commande (${bonsDeCommande.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 sm:px-5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.id ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      )}

      {/* ── DEVIS ── */}
      {!loading && tab === 'quotes' && (
        <div className="space-y-4">
          {/* Filtre */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'pending', label: 'À répondre' },
              { id: 'sent', label: 'Envoyés' },
              { id: 'accepted', label: 'Acceptés' },
              { id: 'rejected', label: 'Refusés' },
            ].map(f => (
              <button key={f.id} onClick={() => setQuoteFilter(f.id)} className={pill(quoteFilter === f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredQuotes.length === 0 ? (
            <EmptyState icon={FileText} title="Aucun devis" />
          ) : (
            <ul className={`divide-y divide-stone-100 overflow-hidden ${CARD}`}>
              {filteredQuotes.map(q => {
                const needsAction = q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')
                return (
                  <li key={q._id} className={needsAction ? 'bg-amber-50/40' : ''}>
                    <Link href={`/portail-entreprise/documents/devis/${String(q._id)}`}
                      className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${needsAction ? 'bg-amber-50' : 'bg-stone-50'}`}>
                          <FileText className={`w-4 h-4 ${needsAction ? 'text-amber-600' : 'text-stone-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors truncate">{q.title || 'Devis'}</span>
                            <span className="font-mono text-xs text-stone-400">#{q.numero}</span>
                            {needsAction && (
                              <Pill color={TONE.amber}>Action requise</Pill>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
                            <Calendar className="w-3 h-3" />{fmtDate(q.date)}
                            {q.clientComments?.length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{q.clientComments.length}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        {q.clientResponse && (
                          <StatusBadge status={q.clientResponse} map={quoteClientResponse} className="hidden sm:inline-flex" />
                        )}
                        <StatusBadge status={q.status} map={quoteStatus} fallback="draft" />
                        <span className="text-sm font-bold text-emerald-800 tabular-nums">{fmtNum(q.total)} F</span>
                        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── FACTURES ── */}
      {!loading && tab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'overdue', label: 'En retard' },
              { id: 'sent', label: 'À régler' },
              { id: 'paid', label: 'Payées' },
            ].map(f => (
              <button key={f.id} onClick={() => setInvoiceFilter(f.id)} className={pill(invoiceFilter === f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucune facture" />
          ) : (
            <ul className={`divide-y divide-stone-100 overflow-hidden ${CARD}`}>
              {filteredInvoices.map(inv => {
                const isOverdue = inv.status === 'overdue'
                return (
                  <li key={inv._id} className={isOverdue ? 'bg-red-50/40' : ''}>
                    <Link href={`/portail-entreprise/documents/factures/${String(inv._id)}`}
                      className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-50' : 'bg-stone-50'}`}>
                          <Receipt className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-stone-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">Facture #{inv.numero}</span>
                            {isOverdue && (
                              <Pill color={TONE.red}>En retard</Pill>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
                            <span>Émise {fmtDate(inv.date)}</span>
                            {inv.dueDate && <span className={isOverdue ? 'text-red-500' : ''}>· Éch. {fmtDate(inv.dueDate)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <StatusBadge status={inv.status} map={invoiceStatus} fallback="sent" />
                        <span className={`text-sm font-bold tabular-nums ${isOverdue ? 'text-red-600' : inv.status === 'paid' ? 'text-emerald-700' : 'text-stone-900'}`}>
                          {fmtNum(inv.total)} F
                        </span>
                        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Total row */}
          {filteredInvoices.length > 0 && (
            <div className={`${CARD} p-4 flex justify-between items-center`}>
              <span className="text-sm font-medium text-stone-500">Total affiché</span>
              <span className="text-base font-bold text-stone-900 tabular-nums">
                {fmtNum(filteredInvoices.reduce((s, i) => s + (i.total || 0), 0))} FCFA
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── BONS DE COMMANDE ── */}
      {!loading && tab === 'bons' && (
        <div className="space-y-4">
          {bonsDeCommande.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Aucun bon de commande"
              message="Les devis acceptés apparaîtront ici"
            />
          ) : (
            <ul className={`divide-y divide-stone-100 overflow-hidden ${CARD}`}>
              {bonsDeCommande.map(q => (
                <li key={q._id}>
                  <button type="button" onClick={() => setSelectedQuote(q)}
                    className="w-full text-left flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">
                          BC lié au devis #{q.numero}
                          {q.bonCommande && <span className="ml-2 font-mono text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{q.bonCommande}</span>}
                        </p>
                        {q.title && <p className="text-xs text-stone-400 mt-0.5 truncate">{q.title}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-stone-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {fmtDate(q.clientRespondedAt || q.acceptedAt || q.updatedAt)}
                          </span>
                          <Pill color={TONE.emerald}>
                            {q.status === 'accepted' ? 'Confirmé' : 'Votre accord'}
                          </Pill>
                          {q.dateLivraison && (
                            <span className="text-xs text-stone-400">Livraison : {q.dateLivraison}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-stone-900 tabular-nums">
                        {fmtNum(q.clientCounterAmount || q.total || 0)} F
                      </p>
                      {q.clientCounterAmount && q.clientCounterAmount !== q.total && (
                        <p className="text-[11px] text-stone-400 line-through tabular-nums">{fmtNum(q.total)} F</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {bonsDeCommande.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-800">
                {bonsDeCommande.length} bon{bonsDeCommande.length > 1 ? 's' : ''} de commande
              </span>
              <span className="text-base font-bold text-emerald-800 tabular-nums">
                {fmtNum(bonsDeCommande.reduce((s, q) => s + (q.clientCounterAmount || q.total || 0), 0))} FCFA
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedQuote && (
        <QuoteModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onAction={handleQuoteAction}
        />
      )}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  )
}
