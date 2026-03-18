import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Link from 'next/link'
import { Receipt, FileText, CheckCircle, Clock, AlertTriangle, Ban } from 'lucide-react'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Brouillon', color: 'bg-gray-100 text-gray-500' },
  sent:     { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté',   color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé',    color: 'bg-red-100 text-red-700' },
}
const INVOICE_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft:     { label: 'Brouillon',  color: 'bg-gray-100 text-gray-500',   icon: Clock },
  sent:      { label: 'À régler',   color: 'bg-blue-100 text-blue-700',   icon: Clock },
  paid:      { label: 'Payée',      color: 'bg-green-100 text-green-700', icon: CheckCircle },
  overdue:   { label: 'En retard',  color: 'bg-red-100 text-red-700',     icon: AlertTriangle },
  cancelled: { label: 'Annulée',    color: 'bg-gray-100 text-gray-400',   icon: Ban },
}

function fmt(v: number) { return Math.round(v).toLocaleString('fr-FR') }
function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function DocumentsPage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user) redirect('/login?redirect=/portail-entreprise/documents')
  if (auth.user.role !== 'CLIENT' || !auth.user.companyClientId) redirect('/compte')

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const companyId = new mongoose.Types.ObjectId(auth.user.companyClientId)
  const filter = { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }

  const [quotes, invoices]: [any[], any[]] = await Promise.all([
    AdminQuote.find(filter).sort({ date: -1 }).lean(),
    AdminInvoice.find(filter).sort({ date: -1 }).lean(),
  ])

  const unpaidTotal = invoices
    .filter(i => ['sent', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.total || 0), 0)

  const pendingQuotesCount = quotes.filter(q => q.status === 'sent').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-600" /> Devis & Factures
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {quotes.length} devis · {invoices.length} facture{invoices.length > 1 ? 's' : ''}
            {unpaidTotal > 0 && ` · ${fmt(unpaidTotal)} FCFA à régler`}
          </p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600">← Tableau de bord</Link>
      </div>

      {/* Résumé financier */}
      {(unpaidTotal > 0 || pendingQuotesCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {unpaidTotal > 0 && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-900/20 p-4">
              <p className="text-xs text-orange-600 font-medium">Montant total à régler</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">{fmt(unpaidTotal)} FCFA</p>
            </div>
          )}
          {pendingQuotesCount > 0 && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-xs text-blue-600 font-medium">Devis en attente de réponse</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{pendingQuotesCount}</p>
            </div>
          )}
        </div>
      )}

      {/* Factures */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Factures ({invoices.length})
        </h2>
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
            <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune facture</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Échéance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {invoices.map(inv => {
                  const cfg = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent
                  const Icon = cfg.icon
                  return (
                    <tr key={String(inv._id)} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">{inv.numero}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{fmtDate(inv.date)}</td>
                      <td className={`px-4 py-3 hidden md:table-cell ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {fmtDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {fmt(inv.total)} FCFA
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5" /> {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Total</td>
                  <td colSpan={1} className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white md:hidden">
                    Total : {fmt(invoices.reduce((s, i) => s + (i.total || 0), 0))} FCFA
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white hidden md:table-cell">
                    {fmt(invoices.reduce((s, i) => s + (i.total || 0), 0))} FCFA
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Devis */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Devis ({quotes.length})
        </h2>
        {quotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucun devis</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Objet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {quotes.map(q => {
                  const cfg = QUOTE_STATUS[q.status] || QUOTE_STATUS.draft
                  return (
                    <tr key={String(q._id)} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">{q.numero}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 max-w-[180px] truncate">{q.title || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{fmtDate(q.date)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-violet-600">{fmt(q.total)} FCFA</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
