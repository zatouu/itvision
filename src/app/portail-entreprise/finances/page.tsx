export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { connectDB } from '@/lib/db'
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle,
  Clock, Calendar, FileText, Receipt, BarChart2, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import AdminInvoice from '@/lib/models/AdminInvoice'
import AdminQuote from '@/lib/models/AdminQuote'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import SoftMessage from '@/components/ui/SoftMessage'

function fmt(v: number) { return Math.round(v).toLocaleString('fr-FR') }
function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getMonthLabel(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export default async function FinancesPage() {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/finances')
  const filter = { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }

  const [invoices, quotes, contracts] = await Promise.all([
    AdminInvoice.find(filter).sort({ date: -1 }).lean() as Promise<any[]>,
    AdminQuote.find(filter).sort({ date: -1 }).lean() as Promise<any[]>,
    MaintenanceContract.find({ clientId: userId, status: 'active' })
      .select('name annualPrice endDate type').lean() as Promise<any[]>,
  ])

  // Calculs financiers globaux
  const totalBilled  = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalDue     = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0)
  const paymentRate  = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0

  const quotesTotal   = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0)
  const conversionRate = quotes.length > 0 ? Math.round((quotes.filter(q => q.status === 'accepted').length / quotes.length) * 100) : 0

  const contractAnnual = contracts.reduce((s: number, c: any) => s + (c.annualPrice || 0), 0)

  // Trend mensuel (6 derniers mois)
  const now = new Date()
  const months: { label: string; billed: number; paid: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthInvoices = invoices.filter((inv: any) => {
      const invDate = new Date(inv.date)
      return invDate >= d && invDate <= end
    })
    months.push({
      label: getMonthLabel(d),
      billed: monthInvoices.reduce((s, inv) => s + (inv.total || 0), 0),
      paid: monthInvoices.filter((inv: any) => inv.status === 'paid').reduce((s, inv) => s + (inv.total || 0), 0),
    })
  }
  const maxBilled = Math.max(...months.map(m => m.billed), 1)

  // Prochaines échéances (factures)
  const upcomingDue = invoices
    .filter((i: any) => ['sent', 'overdue'].includes(i.status) && i.dueDate)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)

  // Historique paiements
  const paidInvoices = invoices
    .filter((i: any) => i.status === 'paid' && i.paidAt)
    .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 5)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-green-600" /> Finances & Comptabilité
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue consolidée de votre relation financière avec IT Vision</p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total facturé', value: `${fmt(totalBilled)} FCFA`,
            icon: Receipt, color: 'from-gray-500 to-gray-600',
            bg: 'bg-gray-50 dark:bg-slate-800',
            sub: `${invoices.length} factures`
          },
          {
            label: 'Total réglé', value: `${fmt(totalPaid)} FCFA`,
            icon: CheckCircle, color: 'from-green-500 to-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20',
            sub: `${paymentRate}% du total`
          },
          {
            label: totalOverdue > 0 ? 'Dont en retard' : 'En attente de paiement',
            value: `${fmt(totalDue)} FCFA`,
            icon: totalOverdue > 0 ? AlertTriangle : Clock,
            color: totalOverdue > 0 ? 'from-red-500 to-red-600' : 'from-orange-500 to-orange-600',
            bg: totalOverdue > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-orange-50 dark:bg-orange-900/20',
            sub: totalOverdue > 0 ? `${fmt(totalOverdue)} FCFA en retard` : `${invoices.filter(i=>['sent','overdue'].includes(i.status)).length} factures`
          },
          {
            label: 'Contrats annuels', value: `${fmt(contractAnnual)} FCFA`,
            icon: FileText, color: 'from-violet-500 to-violet-600',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            sub: `${contracts.length} contrat${contracts.length > 1 ? 's' : ''} actif${contracts.length > 1 ? 's' : ''}`
          },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className={`rounded-xl border border-gray-100 dark:border-slate-800 ${k.bg} p-4`}>
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${k.color} mb-2.5`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Taux de règlement */}
      <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" /> Taux de règlement
          </h2>
          <span className={`text-sm font-bold ${paymentRate >= 80 ? 'text-green-600' : paymentRate >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
            {paymentRate}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${paymentRate >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' : paymentRate >= 50 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
            style={{ width: `${paymentRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>{fmt(totalPaid)} FCFA payés</span>
          <span>{fmt(totalBilled)} FCFA facturés</span>
        </div>
      </div>

      {/* Trend mensuel */}
      {months.some(m => m.billed > 0) && (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Activité des 6 derniers mois</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="flex-1 w-full flex flex-col justify-end gap-0.5">
                  <div
                    className="w-full rounded-t-sm bg-green-500 opacity-90"
                    style={{ height: `${Math.round((m.paid / maxBilled) * 100)}%`, minHeight: m.paid > 0 ? '2px' : '0' }}
                    title={`Payé: ${fmt(m.paid)} FCFA`}
                  />
                  <div
                    className="w-full rounded-t-sm bg-gray-200 dark:bg-slate-600"
                    style={{ height: `${Math.round(((m.billed - m.paid) / maxBilled) * 100)}%`, minHeight: (m.billed - m.paid) > 0 ? '2px' : '0' }}
                    title={`En attente: ${fmt(m.billed - m.paid)} FCFA`}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-500 inline-block" /> Payé</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-gray-200 dark:bg-slate-600 inline-block" /> En attente</span>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Prochaines échéances */}
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" /> Prochaines échéances
            </h2>
            <Link href="/portail-entreprise/documents" className="text-xs text-gray-400 hover:text-green-600">Voir tout</Link>
          </div>
          {upcomingDue.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucune échéance en attente</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-slate-800">
              {upcomingDue.map((inv: any) => {
                const days = Math.floor((new Date(inv.dueDate).getTime() - Date.now()) / 86400000)
                const isOverdue = inv.status === 'overdue'
                return (
                  <li key={String(inv._id)} className={`flex items-center justify-between gap-2 px-4 py-3 ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Facture #{inv.numero}</p>
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        {isOverdue ? `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}` : `Échéance dans ${days} jour${days > 1 ? 's' : ''}`}
                        {' · '}{fmtDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>{fmt(inv.total)} FCFA</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Historique paiements */}
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> Historique des paiements
            </h2>
          </div>
          {paidInvoices.length === 0 ? (
            <div className="py-8 text-center">
              <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun paiement enregistré</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-slate-800">
              {paidInvoices.map((inv: any) => (
                <li key={String(inv._id)} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Facture #{inv.numero}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Payée le {fmtDate(inv.paidAt)}
                        {inv.paymentMethod && ` · ${inv.paymentMethod}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-green-600 flex-shrink-0">{fmt(inv.total)} FCFA</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Contrats actifs + coût annuel */}
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-600" /> Engagement contractuel annuel
            </h2>
            <Link href="/portail-entreprise/contrats" className="text-xs text-gray-400 hover:text-green-600">Voir contrats</Link>
          </div>
          {contracts.length === 0 ? (
            <div className="p-4">
              <SoftMessage
                variant="info"
                title="Aucun contrat actif"
                message="Aucun engagement contractuel actif n'est enregistré pour le moment."
              />
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-slate-800">
              {contracts.map((c: any) => (
                <li key={String(c._id)} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Expire le {fmtDate(c.endDate)} · {c.type}</p>
                  </div>
                  <p className="text-sm font-bold text-violet-600 flex-shrink-0">{fmt(c.annualPrice)} FCFA/an</p>
                </li>
              ))}
            </ul>
          )}
          {contracts.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
              <span className="text-xs font-semibold text-gray-500">Total engagement annuel</span>
              <span className="text-sm font-bold text-violet-600">{fmt(contractAnnual)} FCFA/an</span>
            </div>
          )}
        </div>

        {/* Devis stats */}
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Statistiques devis
            </h2>
            <Link href="/portail-entreprise/documents" className="text-xs text-gray-400 hover:text-green-600">Voir devis</Link>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Devis total', value: String(quotes.length) },
              { label: 'Taux acceptation', value: `${conversionRate}%` },
              { label: 'Valeur acceptée', value: `${fmt(quotesTotal)} FCFA` },
              { label: 'En attente', value: String(quotes.filter(q => q.status === 'sent').length) },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerte retard */}
      {totalOverdue > 0 && (
        <div className="space-y-3">
          <SoftMessage
            variant="warning"
            title={`Paiements en retard — ${fmt(totalOverdue)} FCFA`}
            message="Certaines factures dépassent leur date d'échéance. Merci de régulariser rapidement ou de contacter IT Vision."
          />
          <div className="flex gap-3">
            <a href="mailto:contact@itvisionplus.sn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-red-700 transition-colors">
              📧 Contacter IT Vision
            </a>
            <a href="https://wa.me/221774133440" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-green-700 transition-colors">
              📱 WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
