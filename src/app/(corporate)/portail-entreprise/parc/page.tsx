export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Boxes, ShieldCheck, ShieldAlert, CalendarClock, MapPin, Wrench, AlertTriangle, ChevronDown, FolderKanban } from 'lucide-react'
import { getEnterpriseSession, sessionCan } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import Project from '@/lib/models/Project'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import { CARD, EmptyState, PageHeader, BackLink, fmtDate } from '@/components/portal-ui'
import { ITV_DOMAINS, clientProjectFilter, detectDomain, projectStage, type ItvDomain } from '@/lib/portal/project-view'
import { DomainIcon } from '@/components/portal/projects/ProjectCard'

type Equip = { name: string; detail?: string; quantity: number; location?: string; href?: string; source: 'projet' | 'contrat' }
type Block = {
  equipment: Equip[]
  sites: Set<string>
  contracts: Map<string, { name: string; endDate?: Date }>
  nextMaintenance?: Date
  lastIntervention?: { id: string; title: string; date: Date }
  openInterventions: number
  warrantyEnd?: Date
}

const OPEN_INTERVENTION = ['pending', 'scheduled', 'in_progress']

export default async function ParcPage() {
  const session = await getEnterpriseSession('/portail-entreprise/parc')
  const { userId, companyId } = session
  const scope = companyScope({ userId, companyId })
  const can = (c: Parameters<typeof sessionCan>[1]) => session.capabilities.length === 0 || sessionCan(session, c)

  const [projects, contracts, interventions] = await Promise.all([
    Project.find(clientProjectFilter(scope))
      .select('name serviceType status progress address site.name products nextMaintenance quote.status reception.signedAt reception.decision reception.reservesLiftedAt reception.warrantyEnd').lean() as Promise<any[]>,
    MaintenanceContract.find({ ...scope, status: { $in: ['active', 'suspended'] } })
      .select('name contractNumber status endDate coverage.equipmentTypes services equipment').lean() as Promise<any[]>,
    Intervention.find(scope).sort({ date: -1 }).limit(300)
      .select('title service typeIntervention status date site').lean() as Promise<any[]>,
  ])

  const blocks = new Map<ItvDomain, Block>()
  const block = (d: ItvDomain) => {
    if (!blocks.has(d)) blocks.set(d, { equipment: [], sites: new Set(), contracts: new Map(), openInterventions: 0 })
    return blocks.get(d)!
  }
  const earliest = (a: Date | undefined, b: unknown) => {
    const d = b ? new Date(b as string) : null
    if (!d || isNaN(d.getTime()) || d < new Date()) return a
    return !a || d < a ? d : a
  }

  for (const p of projects) {
    const stage = projectStage(p)
    const installed = (p.products || []).filter((pr: any) => pr.status === 'installed' || (stage.done && pr.status !== 'planned'))
    if (!installed.length && !stage.done) continue
    const b = block(detectDomain(p.serviceType, p.name))
    const location = p.site?.name || p.address
    if (location) b.sites.add(location)
    for (const pr of installed) {
      b.equipment.push({
        name: pr.name, detail: [pr.brand, pr.model].filter(Boolean).join(' '), quantity: Number(pr.quantity) || 1,
        location, href: `/portail-entreprise/projets/${String(p._id)}`, source: 'projet',
      })
    }
    b.nextMaintenance = earliest(b.nextMaintenance, p.nextMaintenance)
    const w = p.reception?.signedAt && p.reception?.warrantyEnd ? new Date(p.reception.warrantyEnd) : null
    if (w && w > new Date() && (!b.warrantyEnd || w > b.warrantyEnd)) b.warrantyEnd = w
  }

  for (const c of contracts) {
    const next = (c.services || []).reduce((acc: Date | undefined, s: any) => earliest(acc, s.nextScheduled), undefined)
    const covered = new Set<ItvDomain>()
    for (const e of c.equipment || []) {
      const d = detectDomain(e.type)
      covered.add(d)
      const b = block(d)
      if (e.location) b.sites.add(e.location)
      b.equipment.push({ name: e.type, quantity: Number(e.quantity) || 1, location: e.location, source: 'contrat', href: `/portail-entreprise/contrats/${String(c._id)}` })
    }
    for (const t of c.coverage?.equipmentTypes || []) covered.add(detectDomain(t))
    if (!covered.size) covered.add('maintenance')
    for (const d of covered) {
      const b = block(d)
      b.contracts.set(String(c._id), { name: c.name, endDate: c.endDate })
      b.nextMaintenance = earliest(b.nextMaintenance, next)
    }
  }

  for (const i of interventions) {
    const d = detectDomain(i.service, i.title)
    if (!blocks.has(d)) continue
    const b = blocks.get(d)!
    if (OPEN_INTERVENTION.includes(i.status)) b.openInterventions++
    if (i.status === 'completed' && !b.lastIntervention) b.lastIntervention = { id: String(i._id), title: i.title, date: i.date }
  }

  const domains = [...blocks.entries()].sort((a, b) => b[1].equipment.length - a[1].equipment.length)
  const totalEquipment = domains.reduce((s, [, b]) => s + b.equipment.reduce((n, e) => n + e.quantity, 0), 0)
  const coveredDomains = domains.filter(([, b]) => b.contracts.size > 0).length
  const nextVisit = domains.reduce<Date | undefined>((acc, [, b]) => earliest(acc, b.nextMaintenance), undefined)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5 lg:py-10 space-y-6">
      <PageHeader icon={Boxes} eyebrow="Installations" title="Mon parc" subtitle="Vos équipements installés par IT Vision, domaine par domaine">
        <BackLink href="/portail-entreprise" />
      </PageHeader>

      {domains.length === 0 ? (
        <EmptyState icon={Boxes} title="Votre parc apparaîtra ici"
          message="Dès la réception de vos premières installations : équipements, sites, contrats de maintenance et prochaines visites." />
      ) : (
        <>
          <section className={`overflow-hidden ${CARD}`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200/70">
              {[
                { label: 'Équipements', value: String(totalEquipment) },
                { label: 'Domaines', value: String(domains.length) },
                { label: 'Sous contrat', value: `${coveredDomains}/${domains.length}`, tone: coveredDomains < domains.length ? 'text-amber-600' : 'text-emerald-700' },
                { label: 'Prochaine visite', value: nextVisit ? fmtDate(nextVisit) : 'À planifier', tone: nextVisit ? 'text-stone-900' : 'text-stone-400' },
              ].map(k => (
                <div key={k.label} className="bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">{k.label}</p>
                  <p className={`mt-1.5 text-lg sm:text-xl font-bold tabular-nums ${k.tone || 'text-stone-900'}`}>{k.value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {domains.map(([d, b]) => {
              const def = ITV_DOMAINS[d]
              const qty = b.equipment.reduce((n, e) => n + e.quantity, 0)
              const covered = b.contracts.size > 0
              return (
                <article key={d} className={`${CARD} p-4 sm:p-5 flex flex-col`}>
                  <header className="flex items-start gap-3">
                    <DomainIcon domain={d} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-stone-900">{def.label}</h2>
                      <p className="text-xs text-stone-500">{qty} équipement{qty > 1 ? 's' : ''} · {b.sites.size} site{b.sites.size > 1 ? 's' : ''}</p>
                    </div>
                    {covered ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><ShieldCheck className="w-3.5 h-3.5" />Sous contrat</span>
                    ) : b.warrantyEnd ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20"><ShieldCheck className="w-3.5 h-3.5" />Sous garantie</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20"><ShieldAlert className="w-3.5 h-3.5" />Hors contrat</span>
                    )}
                  </header>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-stone-50 px-3 py-2.5">
                      <dt className="text-stone-400 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Prochaine maintenance</dt>
                      <dd className={`mt-0.5 font-semibold ${b.nextMaintenance ? 'text-stone-900' : 'text-stone-400'}`}>{b.nextMaintenance ? fmtDate(b.nextMaintenance) : 'Non planifiée'}</dd>
                    </div>
                    <div className="rounded-xl bg-stone-50 px-3 py-2.5">
                      <dt className="text-stone-400 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />Dernière intervention</dt>
                      <dd className="mt-0.5 font-semibold text-stone-900 truncate">
                        {b.lastIntervention
                          ? <Link href={`/portail-entreprise/interventions/${b.lastIntervention.id}`} className="hover:text-emerald-700">{fmtDate(b.lastIntervention.date)}</Link>
                          : <span className="text-stone-400">Aucune</span>}
                      </dd>
                    </div>
                  </dl>

                  {b.openInterventions > 0 && (
                    <p className="mt-3 text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2">{b.openInterventions} intervention{b.openInterventions > 1 ? 's' : ''} en cours ou planifiée{b.openInterventions > 1 ? 's' : ''}</p>
                  )}
                  {b.warrantyEnd && (
                    <p className={`mt-3 text-xs rounded-lg px-3 py-2 ${!covered && b.warrantyEnd.getTime() - Date.now() < 60 * 24 * 3600 * 1000 ? 'bg-amber-50 text-amber-800' : 'bg-stone-50 text-stone-600'}`}>
                      Garantie jusqu&apos;au {fmtDate(b.warrantyEnd)}{!covered ? ' : un contrat de maintenance prend le relais ensuite.' : '.'}
                    </p>
                  )}
                  {covered && (
                    <p className="mt-3 text-xs text-stone-500 truncate">
                      Contrat : {[...b.contracts.entries()].map(([id, c]) => c.name).join(', ')}
                    </p>
                  )}

                  {b.equipment.length > 0 && (
                    <details className="group mt-3 border-t border-stone-100 pt-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-stone-700">
                        Voir les équipements ({b.equipment.length})
                        <ChevronDown className="w-4 h-4 text-stone-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <ul className="mt-2 divide-y divide-stone-100">
                        {b.equipment.slice(0, 50).map((e, idx) => (
                          <li key={idx} className="py-2 flex items-start justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <p className="text-stone-800 truncate">{e.name}{e.detail ? <span className="text-stone-400"> · {e.detail}</span> : null}</p>
                              {e.location && <p className="text-xs text-stone-400 truncate flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{e.location}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-semibold text-stone-600 tabular-nums">× {e.quantity}</span>
                              {e.href && (
                                <Link href={e.href} aria-label={e.source === 'projet' ? 'Voir le projet' : 'Voir le contrat'} className="text-stone-300 hover:text-emerald-700">
                                  <FolderKanban className="w-4 h-4" />
                                </Link>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                    {can('tickets:write') && (
                      <Link href={`/portail-entreprise/support?sujet=panne&domaine=${d}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900">
                        <AlertTriangle className="w-3.5 h-3.5" />Signaler un problème
                      </Link>
                    )}
                    {!covered && (
                      <Link href={`/portail-entreprise/support?sujet=contrat&domaine=${d}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:border-emerald-400 hover:text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5" />Demander un contrat de maintenance
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
