'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, FileText, Calendar, Package, Loader2, AlertCircle,
  MessageSquare, ThumbsUp, ThumbsDown, Send, CheckCircle, Clock, Ban,
  ArrowRight, Receipt, Tag, MapPin, User, Building2
} from 'lucide-react'

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Brouillon', color: 'bg-gray-100 text-gray-500' },
  sent:     { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté',  color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé',   color: 'bg-red-100 text-red-700' },
}
const CLIENT_RESPONSE: Record<string, { label: string; color: string }> = {
  pending:         { label: 'En attente', color: 'bg-orange-100 text-orange-700' },
  accepted:        { label: 'Accepté',    color: 'bg-green-100 text-green-700' },
  rejected:        { label: 'Refusé',     color: 'bg-red-100 text-red-700' },
  counter_proposed:{ label: 'Contre-proposition', color: 'bg-violet-100 text-violet-700' },
}

function fd(d: any) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fv(v: number) { return Math.round(v || 0).toLocaleString('fr-FR') }

export default function QuoteDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [q, setQ] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/client-enterprise/quotes/${id}`)
      .then(r => { if (!r.ok) throw new Error('Introuvable'); return r.json() })
      .then(d => { setQ(d.quote); setLoading(false) })
      .catch(() => { setError('Impossible de charger le devis.'); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error) return <div className="p-6"><div className="rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!q) return null

  const cfg = QUOTE_STATUS[q.status] || QUOTE_STATUS.draft
  const cr = q.clientResponse && CLIENT_RESPONSE[q.clientResponse]
  const canRespond = q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/portail-entreprise/documents')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{q.title || 'Devis'}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
            {cr && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cr.color}`}>{cr.label}</span>}
          </div>
          <p className="text-sm text-gray-500 mt-1">{q.numero ? `N° ${q.numero}` : ''} · {fd(q.date)}</p>
        </div>
      </div>

      {/* Réponse client */}
      {canRespond && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-900/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
            <Clock className="w-4 h-4" />
            <span>Ce devis attend votre réponse</span>
          </div>
          <Link href={`/portail-entreprise/documents?quote=${id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-orange-700 transition-colors">
            <Send className="w-3 h-3" /> Répondre
          </Link>
        </div>
      )}

      {/* Infos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Client</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{q.client?.name || '—'}</p>
          {q.client?.email && <p className="text-xs text-gray-400">{q.client.email}</p>}
          {q.client?.phone && <p className="text-xs text-gray-400">{q.client.phone}</p>}
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Livraison</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{q.pointExpedition || '—'}</p>
          {q.dateLivraison && <p className="text-xs text-gray-400">Date prévue : {q.dateLivraison}</p>}
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Conditions</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{q.conditions || '—'}</p>
        </div>
      </div>

      {/* Produits */}
      <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 dark:border-slate-800 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-800 dark:text-white">Prestations & fournitures</span>
          <span className="text-xs text-gray-400 ml-auto">{q.products?.length || 0} ligne(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 dark:border-slate-800">
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Description</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Qté</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Prix unit.</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {(q.products || []).map((p: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 dark:border-slate-800/60">
                  <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{p.description}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{p.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{fv(p.unitPrice)} FCFA</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900 dark:text-white">{fv(p.total)} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-4 space-y-1.5 bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total</span>
            <span className="text-gray-700 dark:text-gray-200">{fv(q.subtotal)} FCFA</span>
          </div>
          {q.brsAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>BRS (-5%)</span>
              <span className="text-red-600">-{fv(q.brsAmount)} FCFA</span>
            </div>
          )}
          {q.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA</span>
              <span className="text-gray-700 dark:text-gray-200">{fv(q.taxAmount)} FCFA</span>
            </div>
          )}
          {q.other > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Autres</span>
              <span className="text-gray-700 dark:text-gray-200">{fv(q.other)} FCFA</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
            <span className="text-sm font-bold text-gray-900 dark:text-white">TOTAL</span>
            <span className="text-lg font-bold text-violet-600">{fv(q.total)} FCFA</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {q.notes && (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{q.notes}</p>
        </div>
      )}

      {/* Historique réponse */}
      {q.clientResponse && q.clientResponse !== 'pending' && (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Votre réponse</p>
          <div className="flex items-center gap-2">
            {q.clientResponse === 'accepted' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {q.clientResponse === 'rejected' && <Ban className="w-4 h-4 text-red-600" />}
            {q.clientResponse === 'counter_proposed' && <ArrowRight className="w-4 h-4 text-violet-600" />}
            <span className="text-sm font-medium text-gray-900 dark:text-white">{cr?.label}</span>
            <span className="text-xs text-gray-400">{fd(q.clientRespondedAt)}</span>
          </div>
          {q.clientCounterAmount && (
            <p className="text-sm text-violet-600 mt-1">Contre-proposition : {fv(q.clientCounterAmount)} FCFA</p>
          )}
        </div>
      )}

      {/* Commentaires */}
      {(q.clientComments || []).length > 0 && (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Commentaires ({q.clientComments.length})</p>
          <div className="space-y-3">
            {(q.clientComments || []).map((c: any, i: number) => (
              <div key={i} className={`rounded-lg p-3 ${c.authorRole === 'CLIENT' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold ${c.authorRole === 'CLIENT' ? 'text-green-700' : 'text-gray-500'}`}>{c.authorRole === 'CLIENT' ? 'Vous' : 'IT Vision'}</span>
                  <span className="text-[10px] text-gray-400">{fd(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200">{c.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
