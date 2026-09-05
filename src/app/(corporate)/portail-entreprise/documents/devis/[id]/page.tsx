'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Package, Loader2, AlertCircle,
  MessageSquare, Send, CheckCircle, Ban,
  ArrowRight, Tag, MapPin, Building2, Clock
} from 'lucide-react'
import { CARD, fmtDate, fmtNum, quoteStatus, quoteClientResponseShort, StatusBadge, DetailHeader } from '@/components/portal-ui'

export default function QuoteDetailPage() {
  const { id } = useParams() as { id: string }
  const [q, setQ] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/client-enterprise/quotes/${id}`)
      .then(r => { if (!r.ok) throw new Error('Introuvable'); return r.json() })
      .then(d => { setQ(d.quote); setLoading(false) })
      .catch(() => { setError('Impossible de charger le devis.'); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
  if (error) return <div className="p-4 sm:p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!q) return null

  const canRespond = q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')
  const responseIcon = q.clientResponse === 'accepted' ? CheckCircle : q.clientResponse === 'rejected' ? Ban : q.clientResponse === 'counter_proposed' ? ArrowRight : undefined

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <DetailHeader
        back={{ href: '/portail-entreprise/documents', label: 'Documents' }}
        icon={FileText}
        title={q.title || 'Devis'}
        badges={
          <>
            <StatusBadge status={q.status} map={quoteStatus} fallback="draft" />
            {q.clientResponse && (
              <StatusBadge status={q.clientResponse} map={quoteClientResponseShort} />
            )}
          </>
        }
        meta={<>{q.numero ? <span className="font-mono">N° {q.numero}</span> : ''} · {fmtDate(q.date)}</>}
      />

      {/* Réponse client */}
      {canRespond && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Ce devis attend votre réponse</span>
          </div>
          <Link href={`/portail-entreprise/documents?quote=${id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-800 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-900 transition-colors flex-shrink-0">
            <Send className="w-3 h-3" /> Répondre
          </Link>
        </div>
      )}

      {/* Infos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className={`${CARD} p-4`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-1.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> Client</p>
          <p className="text-sm font-medium text-stone-900">{q.client?.name || '—'}</p>
          {q.client?.email && <p className="text-xs text-stone-400 mt-0.5">{q.client.email}</p>}
          {q.client?.phone && <p className="text-xs text-stone-400">{q.client.phone}</p>}
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Livraison</p>
          <p className="text-sm font-medium text-stone-900">{q.pointExpedition || '—'}</p>
          {q.dateLivraison && <p className="text-xs text-stone-400 mt-0.5">Date prévue : {q.dateLivraison}</p>}
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" /> Conditions</p>
          <p className="text-sm font-medium text-stone-900">{q.conditions || '—'}</p>
        </div>
      </div>

      {/* Produits */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="px-4 sm:px-5 py-3.5 border-b border-stone-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-700" />
          <span className="text-sm font-semibold text-stone-900">Prestations & fournitures</span>
          <span className="text-xs text-stone-400 ml-auto tabular-nums">{q.products?.length || 0} ligne(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60">
                <th className="text-left px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Description</th>
                <th className="text-right px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Qté</th>
                <th className="text-right px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Prix unit.</th>
                <th className="text-right px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(q.products || []).map((p: any, i: number) => (
                <tr key={i}>
                  <td className="px-4 sm:px-5 py-3 text-stone-900 font-medium">{p.description}</td>
                  <td className="px-4 sm:px-5 py-3 text-right text-stone-500 tabular-nums">{p.quantity}</td>
                  <td className="px-4 sm:px-5 py-3 text-right text-stone-500 tabular-nums">{fmtNum(p.unitPrice)} F</td>
                  <td className="px-4 sm:px-5 py-3 text-right font-semibold text-stone-900 tabular-nums">{fmtNum(p.total)} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="border-t border-stone-100 px-4 sm:px-5 py-4 space-y-1.5 bg-stone-50/60">
          <div className="flex justify-between text-sm text-stone-500">
            <span>Sous-total</span>
            <span className="text-stone-700 tabular-nums">{fmtNum(q.subtotal)} FCFA</span>
          </div>
          {q.brsAmount > 0 && (
            <div className="flex justify-between text-sm text-stone-500">
              <span>BRS (-5%)</span>
              <span className="text-red-600 tabular-nums">-{fmtNum(q.brsAmount)} FCFA</span>
            </div>
          )}
          {q.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-stone-500">
              <span>TVA</span>
              <span className="text-stone-700 tabular-nums">{fmtNum(q.taxAmount)} FCFA</span>
            </div>
          )}
          {q.other > 0 && (
            <div className="flex justify-between text-sm text-stone-500">
              <span>Autres</span>
              <span className="text-stone-700 tabular-nums">{fmtNum(q.other)} FCFA</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-stone-200">
            <span className="text-sm font-bold text-stone-900">TOTAL</span>
            <span className="text-lg font-bold text-emerald-800 tabular-nums">{fmtNum(q.total)} FCFA</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {q.notes && (
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Notes</p>
          <p className="text-sm text-stone-600 whitespace-pre-line">{q.notes}</p>
        </div>
      )}

      {/* Historique réponse */}
      {q.clientResponse && q.clientResponse !== 'pending' && (
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3">Votre réponse</p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={q.clientResponse} map={quoteClientResponseShort} icon={responseIcon} />
            <span className="text-xs text-stone-400">{fmtDate(q.clientRespondedAt)}</span>
          </div>
          {q.clientCounterAmount && (
            <p className="text-sm text-emerald-800 font-semibold tabular-nums mt-1">Contre-proposition : {fmtNum(q.clientCounterAmount)} FCFA</p>
          )}
          {q.clientSignature && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Signature électronique</p>
              <div className="flex items-center gap-4 flex-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.clientSignature.signature} alt="Signature" className="h-14 rounded-lg bg-stone-50 border border-stone-200 object-contain px-2" />
                <div>
                  <p className="text-sm font-medium text-stone-900">{q.clientSignature.name}</p>
                  <p className="text-xs text-stone-400">Signé le {fmtDate(q.clientSignature.signedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commentaires */}
      {(q.clientComments || []).length > 0 && (
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Commentaires ({q.clientComments.length})</p>
          <div className="space-y-3">
            {(q.clientComments || []).map((c: any, i: number) => (
              <div key={i} className={`rounded-xl p-3 ${c.authorRole === 'CLIENT' ? 'bg-emerald-50 border border-emerald-100' : 'bg-stone-50 border border-stone-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold ${c.authorRole === 'CLIENT' ? 'text-emerald-700' : 'text-stone-500'}`}>{c.authorRole === 'CLIENT' ? 'Vous' : 'IT Vision'}</span>
                  <span className="text-[10px] text-stone-400">{fmtDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-stone-700">{c.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
