'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Receipt, Calendar, Loader2, AlertCircle, Building2,
  CheckCircle, AlertTriangle, Clock, Ban, Package, Mail, Phone,
  FileText, Download, CreditCard
} from 'lucide-react'

const INVOICE_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  draft:     { label: 'Brouillon', color: 'bg-gray-100 text-gray-500',   icon: Clock },
  sent:      { label: 'À régler',  color: 'bg-blue-100 text-blue-700',   icon: Clock },
  paid:      { label: 'Payée',     color: 'bg-green-100 text-green-700', icon: CheckCircle },
  overdue:   { label: 'En retard', color: 'bg-red-100 text-red-700',     icon: AlertTriangle },
  cancelled: { label: 'Annulée',  color: 'bg-gray-100 text-gray-400',   icon: Ban },
}

function fd(d: any) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fv(v: number) { return Math.round(v || 0).toLocaleString('fr-FR') }

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/client-enterprise/invoices/${id}`)
      .then(r => { if (!r.ok) throw new Error('Introuvable'); return r.json() })
      .then(d => { setInv(d.invoice); setLoading(false) })
      .catch(() => { setError('Impossible de charger la facture.'); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error) return <div className="p-6"><div className="rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!inv) return null

  const cfg = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft
  const StatusIcon = cfg.icon
  const isOverdue = inv.status === 'overdue'
  const isPaid = inv.status === 'paid'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/portail-entreprise/documents')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">Facture #{inv.numero}</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" /> {cfg.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{fd(inv.date)} · Échéance {fd(inv.dueDate)}</p>
        </div>
      </div>

      {/* Alertes */}
      {isOverdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-300">Facture en retard de paiement</p>
            <p className="text-xs text-red-600 mt-0.5">Merci de régulariser dans les plus brefs délais.</p>
          </div>
        </div>
      )}
      {isPaid && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900/40 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-700 dark:text-green-300">Facture réglée</p>
            <p className="text-xs text-green-600 mt-0.5">Payée le {fd(inv.paidAt || inv.paymentDate)} · {inv.paymentMethod || 'Virement'}</p>
          </div>
        </div>
      )}
      {inv.status === 'sent' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900/40 p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Facture en attente de paiement</p>
            <p className="text-xs text-blue-600 mt-0.5">Contactez-nous pour procéder au règlement.</p>
          </div>
        </div>
      )}

      {/* Infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Client</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.client?.name || '—'}</p>
          {inv.client?.company && <p className="text-xs text-gray-400">{inv.client.company}</p>}
          {inv.client?.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{inv.client.email}</p>}
          {inv.client?.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{inv.client.phone}</p>}
          {inv.client?.address && <p className="text-xs text-gray-400">{inv.client.address}{inv.client.city ? `, ${inv.client.city}` : ''}</p>}
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Paiement</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{isPaid ? 'Payée' : isOverdue ? 'En retard' : 'En attente'}</p>
          {inv.paymentMethod && <p className="text-xs text-gray-400">Mode : {inv.paymentMethod}</p>}
          {inv.paymentDate && <p className="text-xs text-gray-400">Date : {fd(inv.paymentDate)}</p>}
          {inv.paidAt && <p className="text-xs text-gray-400">Confirmé le : {fd(inv.paidAt)}</p>}
        </div>
      </div>

      {/* Lignes */}
      <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 dark:border-slate-800 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-800 dark:text-white">Détail</span>
          <span className="text-xs text-gray-400 ml-auto">{inv.items?.length || 0} ligne(s)</span>
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
              {(inv.items || []).map((it: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 dark:border-slate-800/60">
                  <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">
                    {it.description}
                    {it.category && <span className="ml-2 text-[10px] text-gray-400">{it.category}</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{it.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{fv(it.unitPrice)} FCFA</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900 dark:text-white">{fv(it.totalPrice)} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-4 space-y-1.5 bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total</span>
            <span className="text-gray-700 dark:text-gray-200">{fv(inv.subtotal)} FCFA</span>
          </div>
          {inv.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA ({inv.taxRate || 18}%)</span>
              <span className="text-gray-700 dark:text-gray-200">{fv(inv.taxAmount)} FCFA</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
            <span className="text-sm font-bold text-gray-900 dark:text-white">TOTAL TTC</span>
            <span className={`text-lg font-bold ${isOverdue ? 'text-red-600' : isPaid ? 'text-green-600' : 'text-violet-600'}`}>
              {fv(inv.total)} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{inv.notes}</p>
        </div>
      )}

      {inv.terms && (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Conditions</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{inv.terms}</p>
        </div>
      )}

      {/* Contact paiement */}
      {!isPaid && (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Règlement</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Pour effectuer le paiement ou toute question, contactez IT Vision :
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-700 dark:text-gray-200">
            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-gray-400" /> contact@itvisionplus.sn</span>
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" /> +221 77 413 34 40</span>
          </div>
        </div>
      )}
    </div>
  )
}
