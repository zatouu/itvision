'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Receipt, Loader2, AlertCircle, Building2,
  CheckCircle, AlertTriangle, Clock, Package, Mail, Phone,
  CreditCard
} from 'lucide-react'
import { CARD, fmtDate, fmtNum, invoiceStatus, StatusBadge, DetailHeader } from '@/components/portal-ui'

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string }
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/client-enterprise/invoices/${id}`)
      .then(r => { if (!r.ok) throw new Error('Introuvable'); return r.json() })
      .then(d => { setInv(d.invoice); setLoading(false) })
      .catch(() => { setError('Impossible de charger la facture.'); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
  if (error) return <div className="p-4 sm:p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!inv) return null

  const isOverdue = inv.status === 'overdue'
  const isPaid = inv.status === 'paid'

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <DetailHeader
        back={{ href: '/portail-entreprise/documents', label: 'Documents' }}
        icon={Receipt}
        title={<>Facture <span className="font-mono">#{inv.numero}</span></>}
        badges={<StatusBadge status={inv.status} map={invoiceStatus} fallback="draft" />}
        meta={<>{fmtDate(inv.date)} · Échéance {fmtDate(inv.dueDate)}</>}
      />

      {/* Alertes */}
      {isOverdue && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">Facture en retard de paiement</p>
            <p className="text-xs text-red-700 mt-0.5">Merci de régulariser dans les plus brefs délais.</p>
          </div>
        </div>
      )}
      {isPaid && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Facture réglée</p>
            <p className="text-xs text-emerald-700 mt-0.5">Payée le {fmtDate(inv.paidAt || inv.paymentDate)} · {inv.paymentMethod || 'Virement'}</p>
          </div>
        </div>
      )}
      {inv.status === 'sent' && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-sky-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-sky-900">Facture en attente de paiement</p>
            <p className="text-xs text-sky-700 mt-0.5">Contactez-nous pour procéder au règlement.</p>
          </div>
        </div>
      )}

      {/* Infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`${CARD} p-4`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-1.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> Client</p>
          <p className="text-sm font-medium text-stone-900">{inv.client?.name || '—'}</p>
          {inv.client?.company && <p className="text-xs text-stone-400 mt-0.5">{inv.client.company}</p>}
          {inv.client?.email && <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5"><Mail className="w-2.5 h-2.5" />{inv.client.email}</p>}
          {inv.client?.phone && <p className="text-xs text-stone-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{inv.client.phone}</p>}
          {inv.client?.address && <p className="text-xs text-stone-400 mt-0.5">{inv.client.address}{inv.client.city ? `, ${inv.client.city}` : ''}</p>}
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-1.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Paiement</p>
          <p className="text-sm font-medium text-stone-900">{isPaid ? 'Payée' : isOverdue ? 'En retard' : 'En attente'}</p>
          {inv.paymentMethod && <p className="text-xs text-stone-400 mt-0.5">Mode : {inv.paymentMethod}</p>}
          {inv.paymentDate && <p className="text-xs text-stone-400">Date : {fmtDate(inv.paymentDate)}</p>}
          {inv.paidAt && <p className="text-xs text-stone-400">Confirmé le : {fmtDate(inv.paidAt)}</p>}
        </div>
      </div>

      {/* Lignes */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="px-4 sm:px-5 py-3.5 border-b border-stone-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-700" />
          <span className="text-sm font-semibold text-stone-900">Détail</span>
          <span className="text-xs text-stone-400 ml-auto tabular-nums">{inv.items?.length || 0} ligne(s)</span>
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
              {(inv.items || []).map((it: any, i: number) => (
                <tr key={i}>
                  <td className="px-4 sm:px-5 py-3 text-stone-900 font-medium">
                    {it.description}
                    {it.category && <span className="ml-2 text-[10px] text-stone-400">{it.category}</span>}
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right text-stone-500 tabular-nums">{it.quantity}</td>
                  <td className="px-4 sm:px-5 py-3 text-right text-stone-500 tabular-nums">{fmtNum(it.unitPrice)} F</td>
                  <td className="px-4 sm:px-5 py-3 text-right font-semibold text-stone-900 tabular-nums">{fmtNum(it.totalPrice)} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="border-t border-stone-100 px-4 sm:px-5 py-4 space-y-1.5 bg-stone-50/60">
          <div className="flex justify-between text-sm text-stone-500">
            <span>Sous-total</span>
            <span className="text-stone-700 tabular-nums">{fmtNum(inv.subtotal)} FCFA</span>
          </div>
          {inv.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-stone-500">
              <span>TVA ({inv.taxRate || 18}%)</span>
              <span className="text-stone-700 tabular-nums">{fmtNum(inv.taxAmount)} FCFA</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-stone-200">
            <span className="text-sm font-bold text-stone-900">TOTAL TTC</span>
            <span className={`text-lg font-bold tabular-nums ${isOverdue ? 'text-red-600' : 'text-emerald-800'}`}>
              {fmtNum(inv.total)} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Notes</p>
          <p className="text-sm text-stone-600 whitespace-pre-line">{inv.notes}</p>
        </div>
      )}

      {inv.terms && (
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Conditions</p>
          <p className="text-sm text-stone-600 whitespace-pre-line">{inv.terms}</p>
        </div>
      )}

      {/* Contact paiement */}
      {!isPaid && (
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Règlement</p>
          <p className="text-sm text-stone-600">
            Pour effectuer le paiement ou toute question, contactez IT Vision :
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-stone-700">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-stone-400" /> contact@itvisionplus.sn</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-stone-400" /> +221 77 413 34 40</span>
          </div>
        </div>
      )}
    </div>
  )
}
