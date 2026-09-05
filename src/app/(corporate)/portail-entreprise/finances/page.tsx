export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import {
  TrendingUp, AlertTriangle, CheckCircle,
  Clock, Calendar, FileText, Receipt, BarChart2, Mail, Phone
} from 'lucide-react'
import AdminInvoice from '@/lib/models/AdminInvoice'
import AdminQuote from '@/lib/models/AdminQuote'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import SoftMessage from '@/components/ui/SoftMessage'
import FinanceExport from '@/components/portal/FinanceExport'
import {
  BackLink, CARD, EmptyState, KpiStrip, MiniStat, PageHeader, Panel, ProgressBar,
  fmtDate, fmtMonth, fmtNum,
} from '@/components/portal-ui'

export default async function FinancesPage() {
  const { userId, companyId, companyName } = await getEnterpriseSession('/portail-entreprise/finances')
  const filter = { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }

  const [invoices, quotes, contracts] = await Promise.all([
    AdminInvoice.find(filter).sort({ date: -1 }).lean() as Promise<any[]>,
    AdminQuote.find(filter).sort({ date: -1 }).lean() as Promise<any[]>,
    MaintenanceContract.find({ ...companyScope({ userId, companyId }), status: 'active' })
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
      label: fmtMonth(d),
      billed: monthInvoices.reduce((s, inv) => s + (inv.total || 0), 0),
      paid: monthInvoices.filter((inv: any) => inv.status === 'paid').reduce((s, inv) => s + (inv.total || 0), 0),
    })
  }
  const maxBilled = Math.max(...months.map(m => m.billed), 1)

  // Échéancier : factures à régler groupées par mois d'échéance
  const unpaid = invoices
    .filter((i: any) => ['sent', 'overdue'].includes(i.status) && i.dueDate)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  const schedule: { key: string; label: string; total: number; items: any[] }[] = []
  for (const inv of unpaid) {
    const d = new Date(inv.dueDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    let g = schedule.find(s => s.key === key)
    if (!g) { g = { key, label: fmtMonth(d), total: 0, items: [] }; schedule.push(g) }
    g.items.push(inv)
    g.total += inv.total || 0
  }

  // Historique paiements
  const paidInvoices = invoices
    .filter((i: any) => i.status === 'paid' && i.paidAt)
    .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 5)

  const kpis = [
    {
      label: 'Total facturé', value: `${fmtNum(totalBilled)} F`,
      icon: Receipt, tone: 'text-stone-400',
      sub: `${invoices.length} factures`
    },
    {
      label: 'Total réglé', value: `${fmtNum(totalPaid)} F`,
      icon: CheckCircle, tone: 'text-emerald-600',
      sub: `${paymentRate}% du total`
    },
    {
      label: totalOverdue > 0 ? 'Dont en retard' : 'En attente de paiement',
      value: `${fmtNum(totalDue)} F`,
      icon: totalOverdue > 0 ? AlertTriangle : Clock,
      tone: totalOverdue > 0 ? 'text-red-600' : 'text-amber-600',
      sub: totalOverdue > 0 ? `${fmtNum(totalOverdue)} F en retard` : `${invoices.filter(i=>['sent','overdue'].includes(i.status)).length} factures`
    },
    {
      label: 'Contrats annuels', value: `${fmtNum(contractAnnual)} F`,
      icon: FileText, tone: 'text-emerald-700',
      sub: `${contracts.length} contrat${contracts.length > 1 ? 's' : ''} actif${contracts.length > 1 ? 's' : ''}`
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <PageHeader
        icon={BarChart2}
        eyebrow="Comptabilité"
        title="Finances"
        subtitle="Vue consolidée de votre relation financière avec IT Vision"
      >
        <BackLink />
        <FinanceExport companyName={companyName} />
      </PageHeader>

      {/* KPI Cards */}
      <KpiStrip items={kpis} cols={4} />

      {/* Taux de règlement */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700" /> Taux de règlement
          </h2>
          <span className={`text-sm font-bold tabular-nums ${paymentRate >= 80 ? 'text-emerald-700' : paymentRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {paymentRate}%
          </span>
        </div>
        <ProgressBar value={paymentRate} auto="ratio" size="lg" />
        <div className="flex justify-between text-xs text-stone-400 mt-1.5">
          <span className="tabular-nums">{fmtNum(totalPaid)} FCFA payés</span>
          <span className="tabular-nums">{fmtNum(totalBilled)} FCFA facturés</span>
        </div>
      </div>

      {/* Trend mensuel */}
      {months.some(m => m.billed > 0) && (
        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-semibold text-stone-900 mb-4">Activité des 6 derniers mois</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <div className="flex-1 w-full flex flex-col justify-end gap-0.5">
                  <div
                    className="w-full rounded-t-sm bg-emerald-500/90"
                    style={{ height: `${Math.round((m.paid / maxBilled) * 100)}%`, minHeight: m.paid > 0 ? '2px' : '0' }}
                    title={`Payé: ${fmtNum(m.paid)} FCFA`}
                  />
                  <div
                    className="w-full rounded-t-sm bg-stone-200"
                    style={{ height: `${Math.round(((m.billed - m.paid) / maxBilled) * 100)}%`, minHeight: (m.billed - m.paid) > 0 ? '2px' : '0' }}
                    title={`En attente: ${fmtNum(m.billed - m.paid)} FCFA`}
                  />
                </div>
                <span className="text-[10px] text-stone-400">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" /> Payé</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-stone-200 inline-block" /> En attente</span>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Échéancier des paiements */}
        <Panel
          title="Échéancier des paiements"
          icon={Calendar}
          iconClassName="text-amber-600"
          action={<Link href="/portail-entreprise/documents" className="text-xs font-medium text-stone-400 hover:text-emerald-700 transition-colors">Voir tout</Link>}
        >
          {schedule.length === 0 ? (
            <EmptyState bare icon={CheckCircle} iconClassName="text-emerald-200" title="Aucune échéance en attente" />
          ) : (
            <div>
              {schedule.map(g => (
                <div key={g.key}>
                  <div className="flex items-center justify-between px-4 sm:px-5 py-2 bg-stone-50/80 border-y border-stone-100 first:border-t-0">
                    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-stone-500">{g.label}</span>
                    <span className="text-xs font-semibold text-stone-500 tabular-nums">{fmtNum(g.total)} F</span>
                  </div>
                  <ul className="divide-y divide-stone-100">
                    {g.items.map((inv: any) => {
                      const days = Math.floor((new Date(inv.dueDate).getTime() - Date.now()) / 86400000)
                      const isOverdue = inv.status === 'overdue'
                      return (
                        <li key={String(inv._id)} className={`flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 ${isOverdue ? 'bg-red-50/40' : ''}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900">Facture #{inv.numero}</p>
                            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-stone-400'}`}>
                              {isOverdue ? `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}` : days === 0 ? "Aujourd'hui" : `Échéance dans ${days} jour${days > 1 ? 's' : ''}`}
                              {' · '}{fmtDate(inv.dueDate)}
                            </p>
                          </div>
                          <p className={`text-sm font-bold flex-shrink-0 tabular-nums ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>{fmtNum(inv.total)} F</p>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-t border-stone-200 bg-stone-50/60">
                <span className="text-xs font-semibold text-stone-500">Total à régler</span>
                <span className="text-sm font-bold text-amber-700 tabular-nums">{fmtNum(totalDue)} FCFA</span>
              </div>
            </div>
          )}
        </Panel>

        {/* Historique paiements */}
        <Panel title="Historique des paiements" icon={CheckCircle} iconClassName="text-emerald-600">
          {paidInvoices.length === 0 ? (
            <EmptyState bare icon={Receipt} title="Aucun paiement enregistré" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {paidInvoices.map((inv: any) => (
                <li key={String(inv._id)} className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">Facture #{inv.numero}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Payée le {fmtDate(inv.paidAt)}
                        {inv.paymentMethod && ` · ${inv.paymentMethod}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 flex-shrink-0 tabular-nums">{fmtNum(inv.total)} F</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Contrats actifs + coût annuel */}
        <Panel
          title="Engagement contractuel annuel"
          icon={FileText}
          action={<Link href="/portail-entreprise/contrats" className="text-xs font-medium text-stone-400 hover:text-emerald-700 transition-colors">Voir contrats</Link>}
        >
          {contracts.length === 0 ? (
            <div className="p-4 sm:p-5">
              <SoftMessage
                variant="info"
                title="Aucun contrat actif"
                message="Aucun engagement contractuel actif n'est enregistré pour le moment."
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {contracts.map((c: any) => (
                <li key={String(c._id)} className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">{c.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">Expire le {fmtDate(c.endDate)} · {c.type}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-800 flex-shrink-0 tabular-nums">{fmtNum(c.annualPrice)} F/an</p>
                </li>
              ))}
            </ul>
          )}
          {contracts.length > 0 && (
            <div className="px-4 sm:px-5 py-3 border-t border-stone-100 flex justify-between items-center bg-stone-50/60">
              <span className="text-xs font-semibold text-stone-500">Total engagement annuel</span>
              <span className="text-sm font-bold text-emerald-800 tabular-nums">{fmtNum(contractAnnual)} FCFA/an</span>
            </div>
          )}
        </Panel>

        {/* Devis stats */}
        <Panel
          title="Statistiques devis"
          icon={TrendingUp}
          iconClassName="text-sky-600"
          action={<Link href="/portail-entreprise/documents" className="text-xs font-medium text-stone-400 hover:text-emerald-700 transition-colors">Voir devis</Link>}
        >
          <div className="p-4 sm:p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'Devis total', value: String(quotes.length) },
              { label: 'Taux acceptation', value: `${conversionRate}%` },
              { label: 'Valeur acceptée', value: `${fmtNum(quotesTotal)} F` },
              { label: 'En attente', value: String(quotes.filter(q => q.status === 'sent').length) },
            ].map(s => (
              <MiniStat key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </Panel>
      </div>

      {/* Alerte retard */}
      {totalOverdue > 0 && (
        <div className="space-y-3">
          <SoftMessage
            variant="warning"
            title={`Paiements en retard — ${fmtNum(totalOverdue)} FCFA`}
            message="Certaines factures dépassent leur date d'échéance. Merci de régulariser rapidement ou de contacter IT Vision."
          />
          <div className="flex flex-wrap gap-3">
            <a href="mailto:contact@itvisionplus.sn"
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-4 py-2 text-xs font-semibold hover:bg-red-700 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Contacter IT Vision
            </a>
            <a href="https://wa.me/221774133440" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-900 transition-colors">
              <Phone className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
