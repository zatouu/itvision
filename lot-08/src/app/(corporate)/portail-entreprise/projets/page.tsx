export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import Project from '@/lib/models/Project'
import { EmptyState, PageHeader, BackLink } from '@/components/portal-ui'
import { ITV_DOMAINS, clientProjectFilter, detectDomain, projectStage, type ItvDomain } from '@/lib/portal/project-view'
import { DomainIcon, ProjectCard } from '@/components/portal/projects/ProjectCard'

export default async function ProjetsPage({ searchParams }: { searchParams: Promise<{ domaine?: string }> }) {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/projets')
  const { domaine } = await searchParams

  const projects = (await Project.find(clientProjectFilter(companyScope({ userId, companyId })))
    .sort({ updatedAt: -1 })
    .select('name status progress currentPhase serviceType address startDate endDate updatedAt quote.status milestones.id milestones.name milestones.status milestones.dueDate reception.requestedAt reception.signedAt reception.decision reception.reservesLiftedAt reception.warrantyEnd')
    .lean() as any[])
    .map(p => ({ ...p, domain: detectDomain(p.serviceType, p.name) as ItvDomain, stage: projectStage(p) }))

  const counts = projects.reduce<Record<string, number>>((acc, p) => { acc[p.domain] = (acc[p.domain] || 0) + 1; return acc }, {})
  const domains = (Object.keys(counts) as ItvDomain[]).sort((a, b) => counts[b] - counts[a])
  const filter = domaine && domaine in ITV_DOMAINS ? (domaine as ItvDomain) : null
  const shown = filter ? projects.filter(p => p.domain === filter) : projects
  const running = shown.filter(p => !p.stage.done && !p.stage.paused)
  const paused = shown.filter(p => p.stage.paused)
  const done = shown.filter(p => p.stage.done)

  const chip = (active: boolean) =>
    `flex flex-shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-semibold transition-colors ${
      active ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-300'
    }`

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5 lg:py-10 space-y-6">
      <PageHeader
        icon={FolderKanban}
        eyebrow="Réalisations"
        title="Mes projets"
        subtitle={`${projects.filter(p => !p.stage.done).length} en cours · ${projects.length} au total`}
      >
        <BackLink href="/portail-entreprise" />
      </PageHeader>

      {domains.length > 1 && (
        <nav aria-label="Filtrer par domaine" className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Link href="/portail-entreprise/projets" className={chip(!filter)} aria-current={!filter ? 'page' : undefined}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600"><FolderKanban className="h-4 w-4" /></span>
            Tous <span className="text-stone-400 tabular-nums">{projects.length}</span>
          </Link>
          {domains.map(d => (
            <Link key={d} href={`/portail-entreprise/projets?domaine=${d}`} className={chip(filter === d)} aria-current={filter === d ? 'page' : undefined}>
              <DomainIcon domain={d} size="sm" />
              <span className="whitespace-nowrap">{ITV_DOMAINS[d].short}</span>
              <span className="text-stone-400 tabular-nums">{counts[d]}</span>
            </Link>
          ))}
        </nav>
      )}

      {shown.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title={filter ? `Aucun projet ${ITV_DOMAINS[filter].label.toLowerCase()}` : 'Aucun projet partagé pour le moment'}
          message="Vos projets apparaissent ici dès leur lancement : étapes, photos, documents et prochaines échéances."
        />
      )}

      <ProjectGroup title="En cours" projects={running} />
      <ProjectGroup title="En pause" projects={paused} />
      <ProjectGroup title="Terminés" projects={done} />
    </div>
  )
}

function ProjectGroup({ title, projects }: { title: string; projects: any[] }) {
  if (!projects.length) return null
  return (
    <section>
      <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3">{title} ({projects.length})</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map(p => <ProjectCard key={String(p._id)} p={p} />)}
      </div>
    </section>
  )
}
