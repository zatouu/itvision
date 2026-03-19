export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  FileText, Wrench, FolderKanban, Receipt, LifeBuoy,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Building2,
  ChevronRight, Calendar, ArrowUpRight, Shield, Zap
} from 'lucide-react'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { connectDB } from '@/lib/db'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Ticket from '@/lib/models/Ticket'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  open: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-700',
  quoted: 'bg-purple-100 text-purple-700',
  maintenance: 'bg-teal-100 text-teal-700',
  on_hold: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', in_progress: 'En cours', completed: 'Terminé',
  expired: 'Expiré', pending: 'En attente', draft: 'Brouillon',
  sent: 'Envoyé', overdue: 'En retard', open: 'Ouvert',
  urgent: 'Urgent', high: 'Haute', medium: 'Normale', low: 'Faible',
  approved: 'Approuvé', quoted: 'Devis', maintenance: 'Maintenance', on_hold: 'En pause',
  preventive: 'Préventif', curative: 'Curatif', full: 'Complet', basic: 'Basique',
  installation: 'Installation', support: 'Support',
}

function fmt(v: number) { return Math.round(v).toLocaleString('fr-FR') }
function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function daysLeft(d: any) {
  if (!d) return null
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000)
}

export default async function EnterprisePortalDashboard() {
  const session = await getEnterpriseSession('/portail-entreprise')
  const { userId, companyId, companyName, companyCity, userName, email } = session

  const [
    contractsData,
    interventionsData,
    projectsData,
    quotesData,
    invoicesData,
    ticketsData,
    kpiContracts,
    kpiInterventions,
    kpiProjects,
    kpiInvoiceAgg,
    kpiTickets,
  ] = await Promise.all([
    MaintenanceContract.find({ clientId: userId })
      .sort({ endDate: 1 }).limit(3)
      .select('contractNumber name type status endDate annualPrice coverage stats').lean(),
    Intervention.find({ clientId: userId })
      .sort({ date: -1 }).limit(4)
      .select('interventionNumber title typeIntervention priority status date service site').lean(),
    Project.find({ $or: [{ clientId: userId }, { clientCompanyId: companyId }] })
      .sort({ updatedAt: -1 }).limit(3)
      .select('name status progress currentPhase serviceType startDate endDate milestones').lean(),
    AdminQuote.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'draft'] } })
      .sort({ date: -1 }).limit(3)
      .select('numero title date status total').lean(),
    AdminInvoice.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'overdue'] } })
      .sort({ dueDate: 1 }).limit(3)
      .select('numero date dueDate status total').lean(),
    Ticket.find({ clientId: userId, status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } })
      .sort({ createdAt: -1 }).limit(4)
      .select('title category priority status createdAt sla').lean(),
    MaintenanceContract.countDocuments({ clientId: userId, status: 'active' }),
    Intervention.countDocuments({ clientId: userId }),
    Project.countDocuments({ $or: [{ clientId: userId }, { clientCompanyId: companyId }] }),
    AdminInvoice.aggregate([
      { $match: { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Ticket.countDocuments({ clientId: userId, status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } }),
  ])

  const amountDue = (kpiInvoiceAgg as any[])[0]?.total ?? 0
  const city = companyCity || ''

  const expiringContract = (contractsData as any[]).find(c => {
    const days = daysLeft(c.endDate)
    return days !== null && days > 0 && days <= 60
  })
  const overdueCount = (invoicesData as any[]).filter((i: any) => i.status === 'overdue').length
  const urgentTickets = (ticketsData as any[]).filter((t: any) => t.priority === 'urgent').length

  const kpis = [
    {
      label: 'Contrats actifs',
      value: kpiContracts,
      icon: FileText,
      color: 'from-green-500 to-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      href: '/portail-entreprise/contrats',
    },
    {
      label: 'Interventions totales',
      value: kpiInterventions,
      icon: Wrench,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/portail-entreprise/interventions',
    },
    {
      label: 'Projets',
      value: kpiProjects,
      icon: FolderKanban,
      color: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      href: '/portail-entreprise/projets',
    },
    {
      label: 'À régler (FCFA)',
      value: amountDue > 0 ? `${fmt(amountDue)}` : '0',
      icon: Receipt,
      color: amountDue > 0 ? 'from-orange-500 to-red-500' : 'from-gray-400 to-gray-500',
      bg: amountDue > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
      href: '/portail-entreprise/documents',
    },
    {
      label: 'Tickets ouverts',
      value: kpiTickets,
      icon: LifeBuoy,
      color: kpiTickets > 0 ? 'from-rose-500 to-pink-600' : 'from-gray-400 to-gray-500',
      bg: kpiTickets > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
      href: '/portail-entreprise/support',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-green-700 to-violet-700 px-6 py-7 shadow-xl">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">{city || 'Portail Entreprise'}</span>

            </div>
            <h1 className="text-2xl font-bold text-white lg:text-3xl">{companyName}</h1>
            <p className="mt-1 text-sm text-white/70">Bienvenue, {userName || email || 'Client'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/portail-entreprise/support"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25 transition-colors">
              <LifeBuoy className="w-4 h-4" /> Ouvrir un ticket
            </Link>
            <Link href="/portail-entreprise/documents"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25 transition-colors">
              <Receipt className="w-4 h-4" /> Mes documents
            </Link>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {(expiringContract || overdueCount > 0 || urgentTickets > 0) && (
        <div className="space-y-2">
          {expiringContract && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-900/40 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span className="text-sm text-orange-800 dark:text-orange-300 flex-1">
                Contrat <strong>{(expiringContract as any).name}</strong> expire dans <strong>{daysLeft((expiringContract as any).endDate)} jours</strong>
              </span>
              <Link href="/portail-entreprise/contrats" className="text-xs font-medium text-orange-700 hover:underline">Voir</Link>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800 dark:text-red-300 flex-1">
                <strong>{overdueCount} facture{overdueCount > 1 ? 's' : ''}</strong> en retard de paiement
              </span>
              <Link href="/portail-entreprise/documents" className="text-xs font-medium text-red-700 hover:underline">Régler</Link>
            </div>
          )}
          {urgentTickets > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-900/40 px-4 py-3">
              <Zap className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="text-sm text-rose-800 dark:text-rose-300 flex-1">
                <strong>{urgentTickets} ticket{urgentTickets > 1 ? 's' : ''} urgent{urgentTickets > 1 ? 's' : ''}</strong> en attente de résolution
              </span>
              <Link href="/portail-entreprise/support" className="text-xs font-medium text-rose-700 hover:underline">Traiter</Link>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <Link key={k.label} href={k.href}
              className={`group relative overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}>
              <div className={`mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${k.color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{k.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{k.label}</div>
              <ArrowUpRight className="absolute top-3 right-3 w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors" />
            </Link>
          )
        })}
      </div>

      {/* Grid principal */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Contrats */}
        <SectionCard
          title="Contrats de maintenance"
          icon={<FileText className="w-4 h-4" />}
          href="/portail-entreprise/contrats"
          empty={(contractsData as any[]).length === 0}
          emptyText="Aucun contrat"
        >
          <ul className="divide-y divide-gray-50 dark:divide-slate-800">
            {(contractsData as any[]).map(c => (
              <li key={String(c._id)} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {STATUS_LABELS[c.type] || c.type} · Expire le {fmtDate(c.endDate)}
                    {daysLeft(c.endDate) !== null && daysLeft(c.endDate)! <= 60 && daysLeft(c.endDate)! > 0 && (
                      <span className="ml-1 text-orange-600 font-medium">({daysLeft(c.endDate)}j)</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Projets */}
        <SectionCard
          title="Projets en cours"
          icon={<FolderKanban className="w-4 h-4" />}
          href="/portail-entreprise/projets"
          empty={(projectsData as any[]).length === 0}
          emptyText="Aucun projet actif"
        >
          <ul className="divide-y divide-gray-50 dark:divide-slate-800">
            {(projectsData as any[]).map(p => {
              const milestones = (p.milestones || []) as any[]
              const done = milestones.filter((m: any) => m.status === 'completed').length
              const total = milestones.length
              const pct = p.progress ?? (total > 0 ? Math.round((done / total) * 100) : 0)
              return (
                <li key={String(p._id)} className="py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.serviceType || p.currentPhase || ''}</p>
                    </div>
                    <Badge status={p.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </SectionCard>

        {/* Dernières interventions */}
        <SectionCard
          title="Interventions récentes"
          icon={<Wrench className="w-4 h-4" />}
          href="/portail-entreprise/interventions"
          empty={(interventionsData as any[]).length === 0}
          emptyText="Aucune intervention"
        >
          <ul className="divide-y divide-gray-50 dark:divide-slate-800">
            {(interventionsData as any[]).map(i => (
              <li key={String(i._id)} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{i.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {fmtDate(i.date)}
                    {i.site && <span>· {i.site}</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge status={i.priority} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Tickets + Factures */}
        <div className="space-y-5">
          <SectionCard
            title="Tickets support ouverts"
            icon={<LifeBuoy className="w-4 h-4" />}
            href="/portail-entreprise/support"
            empty={(ticketsData as any[]).length === 0}
            emptyText="Aucun ticket ouvert"
            compact
          >
            <ul className="divide-y divide-gray-50 dark:divide-slate-800">
              {(ticketsData as any[]).map(t => (
                <li key={String(t._id)} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.category}</p>
                  </div>
                  <Badge status={t.priority} />
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Factures à régler"
            icon={<Receipt className="w-4 h-4" />}
            href="/portail-entreprise/documents"
            empty={(invoicesData as any[]).length === 0}
            emptyText="Aucune facture en attente"
            compact
          >
            <ul className="divide-y divide-gray-50 dark:divide-slate-800">
              {(invoicesData as any[]).map(inv => (
                <li key={String(inv._id)} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">#{inv.numero}</p>
                    <p className="text-xs text-gray-400">Échéance : {fmtDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(inv.total)} FCFA</p>
                    <Badge status={inv.status} />
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

      </div>

      {/* Devis en attente */}
      {(quotesData as any[]).length > 0 && (
        <SectionCard
          title="Devis en attente de réponse"
          icon={<FileText className="w-4 h-4" />}
          href="/portail-entreprise/documents"
          empty={false}
          emptyText=""
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(quotesData as any[]).map(q => (
              <div key={String(q._id)} className="rounded-lg border border-gray-100 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-400">#{q.numero}</span>
                  <Badge status={q.status} />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{q.title || 'Devis'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(q.date)}</p>
                <p className="text-sm font-bold text-violet-600 mt-1">{fmt(q.total)} FCFA</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

    </div>
  )
}

function Badge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'
  const label = STATUS_LABELS[status] || status
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  )
}

function SectionCard({
  title, icon, href, empty, emptyText, children, compact
}: {
  title: string; icon: React.ReactNode; href: string; empty: boolean; emptyText: string; children?: React.ReactNode; compact?: boolean
}) {
  return (
    <div className={`rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${compact ? '' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
          <span className="text-gray-400">{icon}</span>
          {title}
        </div>
        <Link href={href} className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-green-600 transition-colors">
          Tout voir <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className={`px-4 ${compact ? 'py-1' : 'py-2'}`}>
        {empty ? (
          <p className="py-6 text-center text-sm text-gray-400">{emptyText}</p>
        ) : children}
      </div>
    </div>
  )
}
