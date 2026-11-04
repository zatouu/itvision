export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { CalendarDays, CalendarPlus, ChevronRight, Flag, MapPin, Wrench, ShieldCheck } from 'lucide-react'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { getAgendaEvents, type AgendaKind } from '@/lib/portal/agenda'
import { PageHeader, BackLink, EmptyState, CARD } from '@/components/portal-ui'
import { DomainIcon } from '@/components/portal/projects/ProjectCard'

const KIND: Record<AgendaKind, { label: string; icon: typeof Wrench; tone: string }> = {
  intervention: { label: 'Intervention', icon: Wrench, tone: 'bg-sky-50 text-sky-700' },
  maintenance: { label: 'Maintenance', icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
  milestone: { label: 'Étape de projet', icon: Flag, tone: 'bg-violet-50 text-violet-700' },
}

function dayLabel(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function AgendaPage() {
  const session = await getEnterpriseSession('/portail-entreprise/agenda')
  const events = await getAgendaEvents({ userId: session.userId, companyId: session.companyId })

  const days = new Map<string, typeof events>()
  for (const e of events) {
    const k = e.start.toISOString().slice(0, 10)
    days.set(k, [...(days.get(k) || []), e])
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-5 lg:py-10 space-y-6">
      <PageHeader icon={CalendarDays} eyebrow="Planning" title="Mes rendez-vous"
        subtitle="Interventions, visites de maintenance et étapes de vos projets, sur les 4 prochains mois">
        {events.length > 0 && (
          <a href="/api/client-enterprise/agenda" className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
            <CalendarPlus className="w-4 h-4" /> Tout ajouter à mon agenda
          </a>
        )}
        <BackLink href="/portail-entreprise" />
      </PageHeader>

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Aucun rendez-vous à venir"
          message="Les interventions planifiées, visites de maintenance et échéances de vos projets s'afficheront ici." />
      ) : (
        <div className="space-y-5">
          {[...days.entries()].map(([k, list]) => (
            <section key={k}>
              <h2 className="sticky top-0 z-10 -mx-1 bg-stone-50/90 px-1 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500 backdrop-blur">{dayLabel(list[0].start)}</h2>
              <ul className="mt-2 space-y-2">
                {list.map(e => {
                  const kind = KIND[e.kind]
                  return (
                    <li key={e.uid} className={`${CARD} flex items-stretch gap-3 p-3`}>
                      <div className="flex w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-stone-50 text-center">
                        {e.timed
                          ? <span className="text-sm font-bold tabular-nums text-stone-900">{e.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          : <span className="text-[11px] font-medium text-stone-500">Journée</span>}
                      </div>
                      <Link href={e.href} className="group flex min-w-0 flex-1 items-center gap-3">
                        <DomainIcon domain={e.domain} />
                        <span className="min-w-0 flex-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${kind.tone}`}><kind.icon className="w-3 h-3" />{kind.label}</span>
                          <span className="mt-0.5 block truncate text-sm font-semibold text-stone-900 group-hover:text-emerald-800">{e.title}</span>
                          {e.detail && <span className="block truncate text-xs text-stone-500">{e.detail}</span>}
                          {e.location && <span className="flex items-center gap-1 truncate text-xs text-stone-400"><MapPin className="w-3 h-3 flex-shrink-0" />{e.location}</span>}
                        </span>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 text-stone-300" />
                      </Link>
                      <a href={`/api/client-enterprise/agenda?uid=${encodeURIComponent(e.uid)}`} aria-label="Ajouter à mon agenda" title="Ajouter à mon agenda"
                        className="flex w-10 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:border-emerald-400 hover:text-emerald-700">
                        <CalendarPlus className="w-4 h-4" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
