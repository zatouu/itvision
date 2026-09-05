export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  FileText, Wrench, FolderKanban, Receipt, LifeBuoy,
  Building2, ChevronRight, Calendar, Zap
} from 'lucide-react'
import {
  AlertRow, KpiStrip, PageHeader, ProgressBar, SectionCard, StatusBadge,
  daysLeft, fmtDate, fmtNum, genericStatus, statusDef,
} from '@/components/portal-ui'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Ticket from '@/lib/models/Ticket'

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
    MaintenanceContract.find({ ...companyScope({ userId, companyId }) })
      .sort({ endDate: 1 }).limit(3)
      .select('contractNumber name type status endDate annualPrice coverage stats').lean(),
    Intervention.find({ ...companyScope({ userId, companyId }) })
      .sort({ date: -1 }).limit(4)
      .select('interventionNumber title typeIntervention priority status date service site').lean(),
    Project.find(companyScope({ userId, companyId }))
      .sort({ updatedAt: -1 }).limit(3)
      .select('name status progress currentPhase serviceType startDate endDate milestones').lean(),
    AdminQuote.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'draft'] } })
      .sort({ date: -1 }).limit(3)
      .select('numero title date status total').lean(),
    AdminInvoice.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'overdue'] } })
      .sort({ dueDate: 1 }).limit(3)
      .select('numero date dueDate status total').lean(),
    Ticket.find({ ...companyScope({ userId, companyId }), status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } })
      .sort({ createdAt: -1 }).limit(4)
      .select('title category priority status createdAt sla').lean(),
    MaintenanceContract.countDocuments({ ...companyScope({ userId, companyId }), status: 'active' }),
    Intervention.countDocuments({ ...companyScope({ userId, companyId }) }),
    Project.countDocuments(companyScope({ userId, companyId })),
    AdminInvoice.aggregate([
      { $match: { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Ticket.countDocuments({ ...companyScope({ userId, companyId }), status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } }),
  ])

  const amountDue = (kpiInvoiceAgg as any[])[0]?.total ?? 0
  const city = companyCity || ''

  const expiringContract = (contractsData as any[]).find(c => {
    const days = daysLeft(c.endDate)
    return days !== null && days > 0 && days <= 60
  })
  const overdueCount = (invoicesData as any[]).filter((i: any) => i.status === 'overdue').length
  const urgentTickets = (ticketsData as any[]).filter((t: any) => t.priority === 'urgent').length

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const kpis = [
    { label: 'Contrats actifs', value: String(kpiContracts), href: '/portail-entreprise/contrats', icon: FileText, tone: 'emerald' },
    { label: 'Interventions', value: String(kpiInterventions), href: '/portail-entreprise/interventions', icon: Wrench, tone: 'emerald' },
    { label: 'Projets', value: String(kpiProjects), href: '/portail-entreprise/projets', icon: FolderKanban, tone: 'emerald' },
    { label: 'À régler', value: `${fmtNum(amountDue)} F`, href: '/portail-entreprise/documents', icon: Receipt, tone: amountDue > 0 ? 'amber' : 'stone' },
    { label: 'Tickets ouverts', value: String(kpiTickets), href: '/portail-entreprise/support', icon: LifeBuoy, tone: kpiTickets > 0 ? 'orange' : 'stone' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-8">

      {/* ── En-tête éditorial ── */}
      <PageHeader
        size="xl"
        icon={Building2}
        eyebrow={<>Espace entreprise{city ? ` · ${city}` : ''}</>}
        title={companyName}
        subtitle={<>Bonjour {userName || email || '—'} · <span className="capitalize">{today}</span></>}
      >
        <Link href="/portail-entreprise/documents"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-emerald-400 hover:text-emerald-800 transition-colors">
          <Receipt className="w-4 h-4" /> Documents
        </Link>
        <Link href="/portail-entreprise/support"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors shadow-sm">
          <LifeBuoy className="w-4 h-4" /> Ouvrir un ticket
        </Link>
      </PageHeader>

      {/* ── Alertes prioritaires ── */}
      {(expiringContract || overdueCount > 0 || urgentTickets > 0) && (
        <div className="space-y-2.5">
          {expiringContract && (
            <AlertRow tone="amber"
              text={<>Contrat <strong>{(expiringContract as any).name}</strong> — expire dans <strong>{daysLeft((expiringContract as any).endDate)} jours</strong></>}
              href="/portail-entreprise/contrats" action="Voir le contrat" />
          )}
          {overdueCount > 0 && (
            <AlertRow tone="red"
              text={<><strong>{overdueCount} facture{overdueCount > 1 ? 's' : ''}</strong> en retard de paiement</>}
              href="/portail-entreprise/documents" action="Régler maintenant" />
          )}
          {urgentTickets > 0 && (
            <AlertRow tone="orange"
              text={<><strong>{urgentTickets} ticket{urgentTickets > 1 ? 's' : ''} urgent{urgentTickets > 1 ? 's' : ''}</strong> en attente de résolution</>}
              href="/portail-entreprise/support" action="Traiter" icon={<Zap className="w-4 h-4" />} />
          )}
        </div>
      )}

      {/* ── KPI strip ── */}
      <KpiStrip items={kpis} cols={5} />

      {/* ── Grille principale ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        <SectionCard title="Contrats de maintenance" icon={<FileText className="w-4 h-4" />} href="/portail-entreprise/contrats"
          empty={(contractsData as any[]).length === 0} emptyText="Aucun contrat actif">
          <ul className="divide-y divide-stone-100">
            {(contractsData as any[]).map(c => (
              <li key={String(c._id)}>
                <Link href={`/portail-entreprise/contrats/${String(c._id)}`}
                  className="flex items-center justify-between gap-3 py-3.5 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{c.name}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {statusDef(genericStatus, c.type).label} · expire le {fmtDate(c.endDate)}
                      {daysLeft(c.endDate) !== null && daysLeft(c.endDate)! <= 60 && daysLeft(c.endDate)! > 0 && (
                        <span className="ml-1.5 font-semibold text-amber-600">({daysLeft(c.endDate)} j)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <StatusBadge status={c.status} />
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Projets en cours" icon={<FolderKanban className="w-4 h-4" />} href="/portail-entreprise/projets"
          empty={(projectsData as any[]).length === 0} emptyText="Aucun projet actif">
          <ul className="divide-y divide-stone-100">
            {(projectsData as any[]).map(p => {
              const milestones = (p.milestones || []) as any[]
              const done = milestones.filter((m: any) => m.status === 'completed').length
              const total = milestones.length
              const pct = p.progress ?? (total > 0 ? Math.round((done / total) * 100) : 0)
              return (
                <li key={String(p._id)}>
                  <Link href={`/portail-entreprise/projets/${String(p._id)}`} className="block py-3.5 group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{p.name}</p>
                        <p className="mt-0.5 text-xs text-stone-400">{p.serviceType || p.currentPhase || ''}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <ProgressBar value={pct} size="sm" className="flex-1" />
                      <span className="text-xs font-semibold text-stone-500 tabular-nums">{pct}%</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </SectionCard>

        <SectionCard title="Interventions récentes" icon={<Wrench className="w-4 h-4" />} href="/portail-entreprise/interventions"
          empty={(interventionsData as any[]).length === 0} emptyText="Aucune intervention">
          <ul className="divide-y divide-stone-100">
            {(interventionsData as any[]).map(i => (
              <li key={String(i._id)}>
                <Link href={`/portail-entreprise/interventions/${String(i._id)}`}
                  className="flex items-center justify-between gap-3 py-3.5 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{i.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-400">
                      <Calendar className="w-3 h-3" /> {fmtDate(i.date)}
                      {i.site && <span className="truncate">· {i.site}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <StatusBadge status={i.priority} />
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Tickets support ouverts" icon={<LifeBuoy className="w-4 h-4" />} href="/portail-entreprise/support"
            empty={(ticketsData as any[]).length === 0} emptyText="Aucun ticket ouvert" compact>
            <ul className="divide-y divide-stone-100">
              {(ticketsData as any[]).map(t => (
                <li key={String(t._id)}>
                  <Link href={`/portail-entreprise/support?ticket=${String(t._id)}`}
                    className="flex items-center justify-between gap-3 py-2.5 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{t.title}</p>
                      <p className="text-xs text-stone-400">{t.category}</p>
                    </div>
                    <StatusBadge status={t.priority} />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Factures à régler" icon={<Receipt className="w-4 h-4" />} href="/portail-entreprise/documents"
            empty={(invoicesData as any[]).length === 0} emptyText="Aucune facture en attente" compact>
            <ul className="divide-y divide-stone-100">
              {(invoicesData as any[]).map(inv => (
                <li key={String(inv._id)}>
                  <Link href={`/portail-entreprise/documents?invoice=${String(inv._id)}`}
                    className="flex items-center justify-between gap-3 py-2.5 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900 group-hover:text-emerald-800 transition-colors">#{inv.numero}</p>
                      <p className="text-xs text-stone-400">Échéance : {fmtDate(inv.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <p className="text-sm font-bold text-stone-900 tabular-nums">{fmtNum(inv.total)} F</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* ── Devis en attente ── */}
      {(quotesData as any[]).length > 0 && (
        <SectionCard title="Devis en attente de réponse" icon={<FileText className="w-4 h-4" />} href="/portail-entreprise/documents"
          empty={false} emptyText="">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {(quotesData as any[]).map(q => (
              <Link key={String(q._id)} href={`/portail-entreprise/documents?quote=${String(q._id)}`}
                className="group rounded-xl border border-stone-200 bg-white p-4 hover:border-emerald-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-stone-400">#{q.numero}</span>
                  <StatusBadge status={q.status} />
                </div>
                <p className="mt-2 text-sm font-semibold text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{q.title || 'Devis'}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-stone-400">{fmtDate(q.date)}</p>
                  <p className="text-sm font-bold text-emerald-800 tabular-nums">{fmtNum(q.total)} F</p>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
