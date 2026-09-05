export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import { FolderKanban, Clock, Package, ChevronRight } from 'lucide-react'
import Project from '@/lib/models/Project'
import { CARD, fmtDate, fmtNum, projectStatus, milestoneIcon, StatusBadge, ProgressBar, EmptyState, PageHeader, BackLink } from '@/components/portal-ui'

export default async function ProjetsPage() {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/projets')

  const projects = await Project.find({
    ...companyScope({ userId, companyId })
  }).sort({ updatedAt: -1 }).lean() as any[]

  const active = projects.filter(p => ['in_progress', 'testing', 'approved', 'negotiation'].includes(p.status))
  const completed = projects.filter(p => ['completed', 'maintenance'].includes(p.status))
  const other = projects.filter(p => !active.includes(p) && !completed.includes(p))

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <PageHeader
        icon={FolderKanban}
        eyebrow="Réalisations"
        title="Mes projets"
        subtitle={`${active.length} actif${active.length > 1 ? 's' : ''} · ${projects.length} total`}
      >
        <BackLink href="/portail-entreprise" />
      </PageHeader>

      {projects.length === 0 && (
        <EmptyState icon={FolderKanban} title="Aucun projet" />
      )}

      {active.length > 0 && <ProjectGroup title="Projets actifs" projects={active} />}
      {other.length > 0 && <ProjectGroup title="Autres projets" projects={other} />}
      {completed.length > 0 && <ProjectGroup title="Projets terminés" projects={completed} />}
    </div>
  )
}

function ProjectGroup({ title, projects }: { title: string; projects: any[] }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3">{title} ({projects.length})</h2>
      <div className="space-y-4">
        {projects.map(p => <ProjectCard key={String(p._id)} p={p} />)}
      </div>
    </section>
  )
}

function ProjectCard({ p }: { p: any }) {
  const milestones = (p.milestones || []) as any[]
  const doneMilestones = milestones.filter((m: any) => m.status === 'completed').length
  const pct = p.progress ?? (milestones.length > 0 ? Math.round((doneMilestones / milestones.length) * 100) : 0)
  const products = (p.products || []) as any[]
  const timeline = ((p.timeline || []) as any[]).filter((t: any) => t.clientVisible !== false).slice(-3)

  return (
    <Link href={`/portail-entreprise/projets/${p._id}`} className={`${CARD} block overflow-hidden hover:border-emerald-300 hover:shadow-sm transition-all group`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">{p.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400 flex-wrap">
              {p.serviceType && <span>{p.serviceType}</span>}
              {p.currentPhase && <span>· Phase : {p.currentPhase}</span>}
              {p.address && <span>· {p.address}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={p.status} map={projectStatus} />
          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Progression */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
          <span>Avancement global</span>
          <span className="font-semibold text-stone-700 tabular-nums">{pct}%</span>
        </div>
        <ProgressBar value={pct} size="md" />
      </div>

      {/* Dates */}
      <div className="border-t border-stone-100 px-4 sm:px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div><p className="text-stone-400">Début</p><p className="font-medium text-stone-800 mt-0.5">{fmtDate(p.startDate)}</p></div>
        <div><p className="text-stone-400">Fin prévue</p><p className="font-medium text-stone-800 mt-0.5">{fmtDate(p.endDate)}</p></div>
        {p.value > 0 && <div><p className="text-stone-400">Valeur</p><p className="font-semibold text-emerald-800 tabular-nums mt-0.5">{fmtNum(p.value)} F</p></div>}
        {milestones.length > 0 && (
          <div><p className="text-stone-400">Jalons</p><p className="font-medium text-stone-800 mt-0.5 tabular-nums">{doneMilestones}/{milestones.length}</p></div>
        )}
      </div>

      {/* Jalons */}
      {milestones.length > 0 && (
        <div className="border-t border-stone-100 px-4 sm:px-5 py-3">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Jalons</p>
          <div className="space-y-1.5">
            {milestones.slice(0, 5).map((m: any) => {
              const Icon = milestoneIcon[m.status] || Clock
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <Icon className={`w-3 h-3 flex-shrink-0 ${
                    m.status === 'completed' ? 'text-emerald-600' :
                    m.status === 'delayed' ? 'text-orange-500' :
                    m.status === 'in_progress' ? 'text-sky-500' : 'text-stone-300'
                  }`} />
                  <span className={`text-xs flex-1 ${m.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                    {m.name}
                  </span>
                  {m.dueDate && <span className="text-[10px] text-stone-400">{fmtDate(m.dueDate)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Équipements installés */}
      {products.length > 0 && (
        <div className="border-t border-stone-100 px-4 sm:px-5 py-3">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">
            <Package className="w-3 h-3 inline mr-1" />Équipements ({products.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {products.slice(0, 6).map((pr: any, idx: number) => (
              <span key={idx} className="rounded-lg bg-stone-50 border border-stone-100 px-2 py-1 text-xs text-stone-600">
                {pr.quantity}× {pr.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline récente */}
      {timeline.length > 0 && (
        <div className="border-t border-stone-100 px-4 sm:px-5 py-3">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">Dernières mises à jour</p>
          <div className="space-y-1.5">
            {timeline.map((t: any) => (
              <div key={t.id} className="flex items-start gap-2 text-xs">
                <span className="text-stone-300 flex-shrink-0 mt-0.5">·</span>
                <span className="text-stone-600 flex-1">{t.title}</span>
                <span className="text-stone-400 flex-shrink-0">{fmtDate(t.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Link>
  )
}
