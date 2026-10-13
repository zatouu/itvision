export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  FileText, Wrench, FolderKanban, Receipt, LifeBuoy,
  ChevronRight, Calendar, Zap, MapPin, Clock, HardHat, PackageSearch, Plus,
  FileSignature, Wallet, ClipboardList, Sparkles
} from 'lucide-react'
import {
  ActionCenter, AlertRow, KpiStrip, SectionCard, StatusBadge,
  daysLeft, fmtDate, fmtNum, genericStatus, interventionStatus, statusDef,
} from '@/components/portal-ui'
import { getEnterpriseSession, sessionCan } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import { getPortalActionCounts } from '@/lib/portal/action-center'
import { ITV_DOMAINS, clientProjectFilter, detectDomain, projectStage, type ItvDomain } from '@/lib/portal/project-view'
import { DomainIcon, ProjectCard } from '@/components/portal/projects/ProjectCard'
import { whatsNewSinceLastVisit } from '@/lib/portal/whats-new'

const NEWS_ICON: Record<string, typeof FileText> = {
  quote: FileSignature, invoice: Receipt, payment: Wallet, project: FolderKanban,
  intervention: Wrench, report: ClipboardList, ticket: LifeBuoy, contract: FileText,
}
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import '@/lib/models/Technician'
import Project from '@/lib/models/Project'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Ticket from '@/lib/models/Ticket'

export default async function EnterprisePortalDashboard() {
  const session = await getEnterpriseSession('/portail-entreprise')
  const { userId, companyId, companyName, companyCity, userName, email } = session

  // Aperçu admin : pas de capacités d'entreprise, on montre tout
  const can = (c: Parameters<typeof sessionCan>[1]) => session.capabilities.length === 0 || sessionCan(session, c)
  const canFinance = can('finance:view')
  const canQuotes = canFinance || can('quotes:respond')

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
      .select(`contractNumber name type status endDate coverage stats${canFinance ? ' annualPrice' : ''}`).lean(),
    Intervention.find({ ...companyScope({ userId, companyId }) })
      .sort({ date: -1 }).limit(4)
      .select('interventionNumber title typeIntervention priority status date service site').lean(),
    Project.find(clientProjectFilter(companyScope({ userId, companyId })))
      .sort({ updatedAt: -1 }).limit(200)
      .select('name status progress currentPhase serviceType address startDate endDate updatedAt quote.status milestones.id milestones.name milestones.status milestones.dueDate reception.requestedAt reception.signedAt reception.decision reception.reservesLiftedAt reception.warrantyEnd').lean(),
    !canQuotes ? [] : AdminQuote.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: 'sent' })
      .sort({ date: -1 }).limit(3)
      .select('numero title date status total').lean(),
    !canFinance ? [] : AdminInvoice.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'overdue', 'partial'] } })
      .sort({ dueDate: 1 }).limit(3)
      .select('numero date dueDate status total').lean(),
    Ticket.find({ ...companyScope({ userId, companyId }), status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } })
      .sort({ createdAt: -1 }).limit(4)
      .select('title category priority status createdAt sla').lean(),
    MaintenanceContract.countDocuments({ ...companyScope({ userId, companyId }), status: 'active' }),
    Intervention.countDocuments({ ...companyScope({ userId, companyId }) }),
    Project.countDocuments(clientProjectFilter(companyScope({ userId, companyId }))),
    !canFinance ? [] : AdminInvoice.aggregate([
      { $match: { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], status: { $in: ['sent', 'overdue', 'partial'] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$total', { $add: [{ $ifNull: ['$amountPaid', 0] }, { $ifNull: ['$creditedAmount', 0] }] }] } } } }
    ]),
    Ticket.countDocuments({ ...companyScope({ userId, companyId }), status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } }),
  ])

  const amountDue = (kpiInvoiceAgg as any[])[0]?.total ?? 0
  const city = companyCity || ''

  const now = new Date()
  const [actionCounts, expiringContract, news] = await Promise.all([
    getPortalActionCounts({ userId, companyId, can }),
    MaintenanceContract.findOne({
      ...companyScope({ userId, companyId }),
      status: 'active',
      endDate: { $gt: now, $lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
    }).sort({ endDate: 1 }).select('name endDate').lean() as Promise<any>,
    whatsNewSinceLastVisit({ userId: String(userId), companyId: String(companyId), can: c => can(c as any) })
      .catch(() => ({ since: null, items: [] as any[] })),
  ])

  // Mission control : intervention en cours ou prochaine planifiée
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const nextIntervention = await Intervention.findOne({
    ...companyScope({ userId, companyId }),
    $or: [
      { status: 'in_progress' },
      { status: 'scheduled', date: { $gte: startOfToday } },
    ]
  })
    .sort({ date: 1 })
    .select('interventionNumber title typeIntervention status date heureDebut heureFin site technicienId')
    .populate({ path: 'technicienId', select: 'name' })
    .lean() as any

  const urgentTickets = (ticketsData as any[]).filter((t: any) => t.priority === 'urgent').length

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = String(userName || '').split(' ')[0]

  // Projets : en cours d'abord (les plus récents), puis terminés ; synthèse par domaine d'activité
  const allProjects = (projectsData as any[]).map(p => ({ ...p, domain: detectDomain(p.serviceType, p.name), stage: projectStage(p) }))
  const runningProjects = allProjects.filter(p => !p.stage.done)
  const featuredProjects = [...runningProjects, ...allProjects.filter(p => p.stage.done)].slice(0, 6)
  const domainCounts = allProjects.reduce<Record<string, { total: number; running: number }>>((acc, p) => {
    const c = acc[p.domain] || (acc[p.domain] = { total: 0, running: 0 })
    c.total++
    if (!p.stage.done) c.running++
    return acc
  }, {})
  const domains = (Object.keys(domainCounts) as ItvDomain[]).sort((a, b) => domainCounts[b].total - domainCounts[a].total)

  const quickActions = [
    can('maintenance:request') && { href: '/portail-entreprise/interventions?nouvelle=1', label: 'Intervention', icon: Wrench },
    { href: '/portail-entreprise/support', label: 'Ticket', icon: LifeBuoy },
    canQuotes && { href: '/portail-entreprise/documents', label: 'Documents', icon: Receipt },
    can('sourcing:request') && { href: '/portail-entreprise/sourcing', label: 'Équipement', icon: PackageSearch },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Wrench }>

  const kpis = [
    { label: 'Contrats actifs', value: String(kpiContracts), href: '/portail-entreprise/contrats', icon: FileText, tone: 'emerald' },
    { label: 'Interventions', value: String(kpiInterventions), href: '/portail-entreprise/interventions', icon: Wrench, tone: 'emerald' },
    { label: 'Projets', value: String(kpiProjects), href: '/portail-entreprise/projets', icon: FolderKanban, tone: 'emerald' },
    canFinance && { label: 'À régler', value: `${fmtNum(amountDue)} F`, href: '/portail-entreprise/documents', icon: Receipt, tone: amountDue > 0 ? 'amber' : 'stone' },
    { label: 'Tickets ouverts', value: String(kpiTickets), href: '/portail-entreprise/support', icon: LifeBuoy, tone: kpiTickets > 0 ? 'orange' : 'stone' },
  ].filter(Boolean) as Array<{ label: string; value: string; href: string; icon: typeof Wrench; tone: string }>

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 lg:py-10 space-y-6 lg:space-y-8">

      {/* ── En-tête ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 capitalize">{today}{city ? ` · ${city}` : ''}</p>
          <h1 className="mt-1.5 font-brand text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-900">
            {firstName ? `Bonjour ${firstName}` : companyName}
          </h1>
          <p className="mt-1 text-sm text-stone-500 truncate">
            {runningProjects.length > 0
              ? `${runningProjects.length} projet${runningProjects.length > 1 ? 's' : ''} en cours pour ${companyName}`
              : `Espace ${companyName}`}
          </p>
        </div>
        <div className="hidden sm:flex flex-shrink-0 flex-wrap items-center gap-2.5">
          <Link href="/portail-entreprise/documents"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-emerald-400 hover:text-emerald-800 transition-colors">
            <Receipt className="w-4 h-4" /> Documents
          </Link>
          <Link href="/portail-entreprise/support"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors shadow-sm">
            <LifeBuoy className="w-4 h-4" /> Ouvrir un ticket
          </Link>
        </div>
      </header>

      {/* ── Raccourcis (mobile) ── */}
      <nav aria-label="Raccourcis" className="sm:hidden grid grid-cols-4 gap-2">
        {quickActions.map(a => (
          <Link key={a.href} href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white py-3 text-[11px] font-medium text-stone-700 active:bg-emerald-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><a.icon className="h-[18px] w-[18px]" /></span>
            {a.label}
          </Link>
        ))}
      </nav>

      {/* ── Depuis votre dernière visite ── */}
      {news.since && news.items.length > 0 && (
        <section aria-labelledby="news-title" className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
          <h2 id="news-title" className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Depuis votre dernière visite
            <span className="font-normal text-emerald-700/70">· {fmtDate(news.since)}</span>
          </h2>
          <ul className="mt-3 space-y-1">
            {news.items.map((n: any) => {
              const Icon = NEWS_ICON[n.metadata?.category] || Sparkles
              const body = (
                <>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 ring-1 ring-emerald-100"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-900">{n.title}</span>
                    <span className="block truncate text-xs text-stone-500">{n.message}</span>
                  </span>
                  {n.actionUrl && <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-300" />}
                </>
              )
              return (
                <li key={String(n._id)}>
                  {n.actionUrl
                    ? <Link href={n.actionUrl} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/80 active:bg-white">{body}</Link>
                    : <div className="flex items-center gap-3 px-2 py-2">{body}</div>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ── Alertes prioritaires ── */}
      {(expiringContract || urgentTickets > 0) && (
        <div className="space-y-2.5">
          {expiringContract && (
            <AlertRow tone="amber"
              text={<>Contrat <strong>{expiringContract.name}</strong> — expire dans <strong>{daysLeft(expiringContract.endDate)} jours</strong></>}
              href={`/portail-entreprise/contrats/${String(expiringContract._id)}`} action="Voir le contrat" />
          )}
          {urgentTickets > 0 && (
            <AlertRow tone="orange"
              text={<><strong>{urgentTickets} ticket{urgentTickets > 1 ? 's' : ''} urgent{urgentTickets > 1 ? 's' : ''}</strong> en attente de résolution</>}
              href="/portail-entreprise/support" action="Suivre" icon={<Zap className="w-4 h-4" />} />
          )}
        </div>
      )}

      {/* ── Centre d'actions ── */}
      <ActionCenter counts={actionCounts} />

      {/* ── Mission control : prochaine intervention ── */}
      {nextIntervention && (() => {
        const ni = nextIntervention
        const inProgress = ni.status === 'in_progress'
        const dl = daysLeft(ni.date)
        const eta = inProgress ? 'En cours' : dl === 0 ? "Aujourd'hui" : dl === 1 ? 'Demain' : dl !== null ? `Dans ${dl} j` : ''
        const tech = ni.technicienId && typeof ni.technicienId === 'object' ? ni.technicienId : null
        return (
          <Link href={`/portail-entreprise/interventions/${String(ni._id)}`} className="group block">
            <div className="relative overflow-hidden rounded-2xl bg-emerald-950 px-5 py-5 sm:px-7 sm:py-6 text-white shadow-sm transition-shadow group-hover:shadow-md">
              <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-emerald-400/10 blur-2xl" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-emerald-400">
                    {inProgress ? 'Intervention en cours' : 'Prochaine intervention'}
                  </p>
                  <h3 className="mt-1.5 font-brand text-lg sm:text-xl font-bold truncate">{ni.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-100/70">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {fmtDate(ni.date)}
                      {ni.heureDebut && (
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{ni.heureDebut}–{ni.heureFin}</span>
                      )}
                    </span>
                    {ni.site && <span className="inline-flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{ni.site}</span>}
                    {tech?.name && <span className="inline-flex items-center gap-1.5"><HardHat className="w-3.5 h-3.5" />{tech.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                    inProgress ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' : 'bg-white/10 text-white ring-white/20'
                  }`}>
                    {inProgress && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>}
                    {eta || statusDef(interventionStatus, ni.status).label}
                  </span>
                  <ChevronRight className="w-5 h-5 text-emerald-400/60 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>
        )
      })()}

      {/* ── Mes projets ── */}
      <section aria-labelledby="projets-title" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="projets-title" className="font-brand text-lg sm:text-xl font-bold text-stone-900">Mes projets</h2>
            <p className="text-xs text-stone-500">Où en sont vos installations avec IT Vision</p>
          </div>
          {allProjects.length > 0 && (
            <Link href="/portail-entreprise/projets" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Tout voir <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {domains.length > 0 && (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {domains.map(d => (
              <Link key={d} href={`/portail-entreprise/projets?domaine=${d}`}
                className="flex flex-shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 hover:border-emerald-300 transition-colors">
                <DomainIcon domain={d} size="sm" />
                <span className="text-xs font-semibold text-stone-800 whitespace-nowrap">{ITV_DOMAINS[d].short}</span>
                <span className="text-[11px] text-stone-400 tabular-nums whitespace-nowrap">
                  {domainCounts[d].running > 0 ? `${domainCounts[d].running} en cours` : `${domainCounts[d].total} terminé${domainCounts[d].total > 1 ? 's' : ''}`}
                </span>
              </Link>
            ))}
          </div>
        )}

        {featuredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-2 text-sm font-semibold text-stone-700">Aucun projet en cours</p>
            <p className="mt-1 text-xs text-stone-500">Vidéosurveillance, contrôle d&apos;accès, incendie, domotique… Parlez-nous de votre prochain besoin.</p>
            <Link href="/portail-entreprise/support?sujet=projet"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
              <Plus className="h-4 w-4" /> Nouveau projet
            </Link>
          </div>
        ) : (
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
            {featuredProjects.map(p => (
              <ProjectCard key={String(p._id)} p={p} className="snap-start flex-shrink-0 w-[85%] sm:w-auto" />
            ))}
          </div>
        )}
      </section>

      {/* ── KPI strip ── */}
      <KpiStrip items={kpis} cols={kpis.length === 5 ? 5 : 4} />

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

          {canFinance && (
          <SectionCard title="Factures à régler" icon={<Receipt className="w-4 h-4" />} href="/portail-entreprise/documents?tab=invoices&filtre=due"
            empty={(invoicesData as any[]).length === 0} emptyText="Aucune facture en attente" compact>
            <ul className="divide-y divide-stone-100">
              {(invoicesData as any[]).map(inv => (
                <li key={String(inv._id)}>
                  <Link href={`/portail-entreprise/documents/factures/${String(inv._id)}`}
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
          )}
        </div>
      </div>

      {/* ── Devis en attente ── */}
      {(quotesData as any[]).length > 0 && (
        <SectionCard title="Devis en attente de réponse" icon={<FileText className="w-4 h-4" />} href="/portail-entreprise/documents?tab=quotes&filtre=pending"
          empty={false} emptyText="">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {(quotesData as any[]).map(q => (
              <Link key={String(q._id)} href={`/portail-entreprise/documents/devis/${String(q._id)}?repondre=1`}
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
