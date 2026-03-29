'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Receipt, FileText, CheckCircle, Clock, AlertTriangle, Ban,
  X, Send, MessageSquare, ThumbsUp, ThumbsDown, RefreshCw,
  Loader2, Calendar, Package, ChevronDown, ChevronRight, ShoppingCart
} from 'lucide-react'
import SoftMessage from '@/components/ui/SoftMessage'

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Brouillon', color: 'bg-gray-100 text-gray-500' },
  sent:     { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté',  color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé',   color: 'bg-red-100 text-red-700' },
}
const CLIENT_RESPONSE: Record<string, { label: string; color: string }> = {
  pending:         { label: 'En attente de votre réponse', color: 'bg-orange-100 text-orange-700' },
  accepted:        { label: 'Vous avez accepté',           color: 'bg-green-100 text-green-700' },
  rejected:        { label: 'Vous avez refusé',            color: 'bg-red-100 text-red-700' },
  counter_proposed:{ label: 'Contre-proposition envoyée',  color: 'bg-violet-100 text-violet-700' },
}
const INVOICE_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  draft:     { label: 'Brouillon', color: 'bg-gray-100 text-gray-500',   icon: Clock },
  sent:      { label: 'À régler',  color: 'bg-blue-100 text-blue-700',   icon: Clock },
  paid:      { label: 'Payée',     color: 'bg-green-100 text-green-700', icon: CheckCircle },
  overdue:   { label: 'En retard', color: 'bg-red-100 text-red-700',     icon: AlertTriangle },
  cancelled: { label: 'Annulée',  color: 'bg-gray-100 text-gray-400',   icon: Ban },
}

function fmt(v: number) { return Math.round(v).toLocaleString('fr-FR') }
function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

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
          counterAmount: counterAmount ? parseFloat(counterAmount) : undefined
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-400">#{quote.numero}</span>
              {quote.clientResponse && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CLIENT_RESPONSE[quote.clientResponse]?.color || ''}`}>
                  {CLIENT_RESPONSE[quote.clientResponse]?.label}
                </span>
              )}
            </div>
            <h2 className="font-bold text-gray-900 dark:text-white mt-0.5">{quote.title || 'Devis'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-slate-800 px-6 flex-shrink-0">
          {[
            { id: 'detail', label: 'Détail', icon: FileText },
            { id: 'action', label: canRespond ? 'Répondre' : 'Réponse', icon: ThumbsUp },
            { id: 'comments', label: `Commentaires${comments.length ? ` (${comments.length})` : ''}`, icon: MessageSquare },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* DETAIL TAB */}
          {tab === 'detail' && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{fmtDate(quote.date)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Statut</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${QUOTE_STATUS[quote.status]?.color || 'bg-gray-100'}`}>
                    {QUOTE_STATUS[quote.status]?.label || quote.status}
                  </span>
                </div>
                {quote.dateLivraison && (
                  <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Livraison prévue</p>
                    <p className="font-medium text-gray-900 dark:text-white">{quote.dateLivraison}</p>
                  </div>
                )}
                {quote.pointExpedition && (
                  <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Point d&apos;expédition</p>
                    <p className="font-medium text-gray-900 dark:text-white">{quote.pointExpedition}</p>
                  </div>
                )}
                {quote.bonCommande && (
                  <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Bon de commande</p>
                    <p className="font-medium text-gray-900 dark:text-white">{quote.bonCommande}</p>
                  </div>
                )}
              </div>

              {/* Lignes produits */}
              {quote.products?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Package className="w-3 h-3" /> Prestations & fournitures
                  </h3>
                  <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">Qté</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">P.U.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                        {quote.products.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{p.description}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{p.quantity}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{fmt(p.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{fmt(p.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totaux */}
              <div className="rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700">
                {quote.subtotal > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-gray-500">Sous-total HT</span>
                    <span className="text-gray-700 dark:text-gray-200">{fmt(quote.subtotal)} FCFA</span>
                  </div>
                )}
                {quote.brsAmount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-gray-500">BRS (5%)</span>
                    <span className="text-red-500">- {fmt(quote.brsAmount)} FCFA</span>
                  </div>
                )}
                {quote.taxAmount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-gray-500">TVA</span>
                    <span className="text-gray-700 dark:text-gray-200">{fmt(quote.taxAmount)} FCFA</span>
                  </div>
                )}
                {quote.other !== 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-gray-500">Autres</span>
                    <span className="text-gray-700 dark:text-gray-200">{fmt(quote.other)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 font-bold">
                  <span className="text-gray-900 dark:text-white">TOTAL TTC</span>
                  <span className="text-violet-600 text-lg">{fmt(quote.total)} FCFA</span>
                </div>
              </div>

              {/* Conditions */}
              {quote.conditions && (
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Conditions</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{quote.conditions}</p>
                </div>
              )}
              {quote.notes && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-4">
                  <p className="text-xs font-semibold text-blue-500 mb-1">Notes</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{quote.notes}</p>
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
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-6 text-center">
                  <p className="text-gray-500">
                    {quote.clientResponse === 'accepted' ? 'Vous avez déjà accepté ce devis.' :
                     quote.clientResponse === 'rejected' ? 'Vous avez déjà refusé ce devis.' :
                     quote.clientResponse === 'counter_proposed' ? 'Votre contre-proposition a été envoyée.' :
                     'Ce devis ne nécessite pas de réponse.'}
                  </p>
                  {quote.clientRespondedAt && (
                    <p className="text-xs text-gray-400 mt-1">Le {fmtDate(quote.clientRespondedAt)}</p>
                  )}
                  {quote.clientCounterAmount && (
                    <p className="text-sm font-semibold text-violet-600 mt-2">Contre-proposition : {fmt(quote.clientCounterAmount)} FCFA</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Montant du devis : <strong className="text-violet-600">{fmt(quote.total)} FCFA</strong>
                  </p>

                  {/* Choix action */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Votre décision</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'accepted', label: 'Accepter', icon: ThumbsUp, color: 'border-green-300 bg-green-50 text-green-700' },
                        { id: 'rejected', label: 'Refuser', icon: ThumbsDown, color: 'border-red-300 bg-red-50 text-red-700' },
                        { id: 'counter_proposed', label: 'Contre-proposition', icon: RefreshCw, color: 'border-violet-300 bg-violet-50 text-violet-700' },
                      ].map(opt => (
                        <button key={opt.id} type="button" onClick={() => setAction(opt.id as any)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                            action === opt.id ? opt.color + ' scale-105 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'
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
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Votre proposition de montant (FCFA)
                      </label>
                      <input
                        type="number" min={0} required={action === 'counter_proposed'}
                        value={counterAmount}
                        onChange={e => setCounterAmount(e.target.value)}
                        placeholder={String(quote.total)}
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Message {action === 'counter_proposed' ? '(expliquez votre proposition)' : '(facultatif)'}
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Votre commentaire pour l'équipe IT Vision..."
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {error && (
                    <SoftMessage
                      variant="error"
                      title="Action non envoyée"
                      message={error}
                      onClose={() => setError('')}
                    />
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? 'Envoi...' : `Confirmer — ${action === 'accepted' ? 'Accepter' : action === 'rejected' ? 'Refuser' : 'Envoyer la contre-proposition'}`}
                  </button>
                  <p className="text-xs text-center text-gray-400">Un email de confirmation vous sera envoyé et l&apos;équipe IT Vision sera notifiée immédiatement.</p>
                </form>
              )}
            </div>
          )}

          {/* COMMENTS TAB */}
          {tab === 'comments' && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Aucun commentaire pour l&apos;instant</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c: any, i: number) => (
                    <div key={i} className={`flex gap-3 ${c.authorRole === 'CLIENT' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        c.authorRole === 'CLIENT'
                          ? 'bg-gradient-to-br from-green-500 to-violet-600 text-white rounded-br-sm'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                      }`}>
                        <p className={`text-[10px] font-semibold mb-1 ${c.authorRole === 'CLIENT' ? 'text-white/70' : 'text-gray-400'}`}>
                          {c.authorRole === 'CLIENT' ? 'Vous' : 'IT Vision'}
                        </p>
                        <p>{c.message}</p>
                        <p className={`text-[10px] mt-1 ${c.authorRole === 'CLIENT' ? 'text-white/50' : 'text-gray-400'}`}>
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
                  className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button type="submit" disabled={sendingComment || !newComment.trim()}
                  className="rounded-xl bg-gradient-to-r from-green-500 to-violet-600 px-3 py-2 text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
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
  const cfg = INVOICE_STATUS[invoice.status] || INVOICE_STATUS.sent
  const StatusIcon = cfg.icon
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <span className="font-mono text-xs text-gray-400">Facture #{invoice.numero}</span>
            <h2 className="font-bold text-gray-900 dark:text-white mt-0.5">
              {invoice.client?.company || invoice.client?.name || '—'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Status + dates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-gray-400 mb-1">Statut</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                <StatusIcon className="w-3 h-3" /> {cfg.label}
              </span>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-gray-400 mb-0.5">Date émission</p>
              <p className="font-medium text-gray-900 dark:text-white">{fmtDate(invoice.date)}</p>
            </div>
            <div className={`rounded-xl p-3 ${invoice.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
              <p className="text-xs text-gray-400 mb-0.5">Échéance</p>
              <p className={`font-medium ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {fmtDate(invoice.dueDate)}
              </p>
            </div>
            {invoice.paidAt && (
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3">
                <p className="text-xs text-gray-400 mb-0.5">Payée le</p>
                <p className="font-medium text-green-700 dark:text-green-300">{fmtDate(invoice.paidAt)}</p>
              </div>
            )}
            {invoice.paymentMethod && (
              <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                <p className="text-xs text-gray-400 mb-0.5">Mode de paiement</p>
                <p className="font-medium text-gray-900 dark:text-white">{invoice.paymentMethod}</p>
              </div>
            )}
            {invoice.quoteId && (
              <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                <p className="text-xs text-gray-400 mb-0.5">Devis associé</p>
                <p className="font-medium text-gray-900 dark:text-white font-mono">{invoice.quoteId}</p>
              </div>
            )}
          </div>

          {/* Items */}
          {invoice.items?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Détail des prestations</h3>
              <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">Qté</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">P.U.</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {invoice.items.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{item.description}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{fmt(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totaux */}
          <div className="rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700">
            {invoice.subtotal > 0 && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500">Sous-total HT</span>
                <span className="text-gray-700 dark:text-gray-200">{fmt(invoice.subtotal)} FCFA</span>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500">TVA ({invoice.taxRate || 18}%)</span>
                <span className="text-gray-700 dark:text-gray-200">{fmt(invoice.taxAmount)} FCFA</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 font-bold">
              <span className="text-gray-900 dark:text-white">TOTAL TTC</span>
              <span className={`text-lg ${invoice.status === 'paid' ? 'text-green-600' : invoice.status === 'overdue' ? 'text-red-600' : 'text-violet-600'}`}>
                {fmt(invoice.total)} FCFA
              </span>
            </div>
          </div>

          {invoice.status === 'overdue' && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4 text-sm text-red-700 dark:text-red-300">
              <strong>Facture en retard.</strong> Merci de régulariser dans les plus brefs délais ou de nous contacter : <strong>contact@itvisionplus.sn</strong>
            </div>
          )}
          {invoice.status === 'sent' && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-4 text-sm text-blue-700 dark:text-blue-300">
              Pour procéder au paiement ou si vous avez des questions, contactez-nous : <strong>contact@itvisionplus.sn</strong> — <strong>+221 77 413 34 40</strong>
            </div>
          )}
          {invoice.notes && (
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
              <p className="text-xs font-semibold text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.notes}</p>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-600" /> Documents financiers
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{quotes.length} devis · {invoices.length} factures · {bonsDeCommande.length} bons de commande</p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
      </div>

      {/* KPI financiers */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total facturé', value: `${fmt(totalBilled)} FCFA`, sub: `${invoices.length} factures`, color: 'bg-gray-50 dark:bg-slate-800', valueColor: 'text-gray-900 dark:text-white' },
            { label: 'Payé', value: `${fmt(totalPaid)} FCFA`, sub: `${invoices.filter(i=>i.status==='paid').length} factures`, color: 'bg-green-50 dark:bg-green-900/20', valueColor: 'text-green-700 dark:text-green-400' },
            { label: 'À régler', value: `${fmt(totalDue)} FCFA`, sub: totalOverdue > 0 ? `dont ${fmt(totalOverdue)} FCFA en retard` : `${invoices.filter(i=>['sent','overdue'].includes(i.status)).length} factures`, color: totalOverdue > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-orange-50 dark:bg-orange-900/20', valueColor: totalOverdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400' },
            { label: 'Devis en attente', value: String(quotesPending), sub: quotesPending > 0 ? `${fmt(totalQuotesPending)} FCFA en jeu` : 'Aucune action requise', color: quotesPending > 0 ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-gray-50 dark:bg-slate-800', valueColor: quotesPending > 0 ? 'text-violet-700 dark:text-violet-400' : 'text-gray-500' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border border-gray-100 dark:border-slate-800 ${k.color} p-4`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${k.valueColor}`}>{k.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800">
        {[
          { id: 'quotes',   label: `Devis (${quotes.length})` },
          { id: 'invoices', label: `Factures (${invoices.length})` },
          { id: 'bons',     label: `Bons de commande (${bonsDeCommande.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div>
      )}

      {/* ── DEVIS ── */}
      {!loading && tab === 'quotes' && (
        <div className="space-y-3">
          {/* Filtre */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'pending', label: 'À répondre' },
              { id: 'sent', label: 'Envoyés' },
              { id: 'accepted', label: 'Acceptés' },
              { id: 'rejected', label: 'Refusés' },
            ].map(f => (
              <button key={f.id} onClick={() => setQuoteFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  quoteFilter === f.id ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun devis</p>
            </div>
          ) : (
            filteredQuotes.map(q => {
              const cfg = QUOTE_STATUS[q.status] || QUOTE_STATUS.draft
              const cr = q.clientResponse && CLIENT_RESPONSE[q.clientResponse]
              const needsAction = q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')
              return (
                <div key={q._id}
                  className={`rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                    needsAction ? 'border-orange-200 dark:border-orange-900/40' : 'border-gray-100 dark:border-slate-800'
                  }`}
                  onClick={() => setSelectedQuote(q)}>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${needsAction ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                        <FileText className={`w-4 h-4 ${needsAction ? 'text-orange-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">{q.title || 'Devis'}</span>
                          <span className="font-mono text-xs text-gray-400">#{q.numero}</span>
                          {needsAction && <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-bold">Action requise</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />{fmtDate(q.date)}
                          {q.clientComments?.length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{q.clientComments.length}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {cr && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cr.color}`}>{cr.label}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm font-bold text-violet-600">{fmt(q.total)} FCFA</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── FACTURES ── */}
      {!loading && tab === 'invoices' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'overdue', label: 'En retard' },
              { id: 'sent', label: 'À régler' },
              { id: 'paid', label: 'Payées' },
            ].map(f => (
              <button key={f.id} onClick={() => setInvoiceFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  invoiceFilter === f.id ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
              <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucune facture</p>
            </div>
          ) : (
            filteredInvoices.map(inv => {
              const cfg = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent
              const StatusIcon = cfg.icon
              const isOverdue = inv.status === 'overdue'
              return (
                <div key={inv._id}
                  className={`rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                    isOverdue ? 'border-red-200 dark:border-red-900/40' : 'border-gray-100 dark:border-slate-800'
                  }`}
                  onClick={() => setSelectedInvoice(inv)}>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                        <Receipt className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">Facture #{inv.numero}</span>
                          {isOverdue && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">En retard</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span>Émise {fmtDate(inv.date)}</span>
                          {inv.dueDate && <span className={`${isOverdue ? 'text-red-500' : ''}`}>· Éch. {fmtDate(inv.dueDate)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                        <StatusIcon className="w-2.5 h-2.5" />{cfg.label}
                      </span>
                      <span className={`text-sm font-bold ${isOverdue ? 'text-red-600' : inv.status === 'paid' ? 'text-green-600' : 'text-violet-600'}`}>
                        {fmt(inv.total)} FCFA
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* Total row */}
          {filteredInvoices.length > 0 && (
            <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total affiché</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {fmt(filteredInvoices.reduce((s, i) => s + (i.total || 0), 0))} FCFA
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── BONS DE COMMANDE ── */}
      {!loading && tab === 'bons' && (
        <div className="space-y-3">
          {bonsDeCommande.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-12 text-center">
              <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun bon de commande</p>
              <p className="text-xs text-gray-300 mt-1">Les devis acceptés apparaîtront ici</p>
            </div>
          ) : (
            bonsDeCommande.map(q => (
              <div key={q._id}
                className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedQuote(q)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        BC lié au devis #{q.numero}
                        {q.bonCommande && <span className="ml-2 font-mono text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 px-1.5 py-0.5 rounded">{q.bonCommande}</span>}
                      </p>
                      {q.title && <p className="text-xs text-gray-400 mt-0.5">{q.title}</p>}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(q.clientRespondedAt || q.acceptedAt || q.updatedAt)}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {q.status === 'accepted' ? 'Confirmé' : 'Votre accord'}
                        </span>
                        {q.dateLivraison && (
                          <span className="text-xs text-gray-400">Livraison : {q.dateLivraison}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      {fmt(q.clientCounterAmount || q.total || 0)} FCFA
                    </p>
                    {q.clientCounterAmount && q.clientCounterAmount !== q.total && (
                      <p className="text-[10px] text-gray-400 line-through">{fmt(q.total)} FCFA</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {bonsDeCommande.length > 0 && (
            <div className="rounded-xl border border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {bonsDeCommande.length} bon{bonsDeCommande.length > 1 ? 's' : ''} de commande
              </span>
              <span className="text-base font-bold text-green-700 dark:text-green-400">
                {fmt(bonsDeCommande.reduce((s, q) => s + (q.clientCounterAmount || q.total || 0), 0))} FCFA
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
