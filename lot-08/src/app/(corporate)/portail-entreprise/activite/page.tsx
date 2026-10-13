export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import { Activity, ChevronRight } from 'lucide-react'
import {
  BackLink, EmptyState, PageHeader, Pill,
  activityBadge, activityIcon, fmtRelative, projectStatus, statusDef,
} from '@/components/portal-ui'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import { clientProjectFilter } from '@/lib/portal/project-view'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { CLIENT_VISIBLE_QUOTE, CLIENT_VISIBLE_INVOICE } from '@/lib/client-documents'
import Ticket from '@/lib/models/Ticket'
import AuditLog from '@/lib/models/AuditLog'

const AUDIT_LABEL: Record<string, string> = {
  client_accepted: 'Devis accepté',
  client_rejected: 'Devis refusé',
  client_counter_proposed: 'Contre-proposition envoyée',
  client_comment: 'Commentaire ajouté sur un devis',
  created: 'Créé',
  client_reply: 'Réponse envoyée',
  profile_updated: 'Profil mis à jour',
  team_invite: 'Membre invité',
  team_role: 'Rôle modifié',
  team_remove: 'Membre retiré',
}
const AUDIT_HREF: Record<string, string> = {
  AdminQuote: '/portail-entreprise/documents',
  Ticket: '/portail-entreprise/support',
  Client: '/portail-entreprise/profil',
}

const TYPE_FILTERS = [
  { id: 'all', label: 'Tout' },
  { id: 'documents', label: 'Devis & factures' },
  { id: 'intervention', label: 'Interventions' },
  { id: 'ticket', label: 'Support' },
  { id: 'project', label: 'Projets' },
  { id: 'contract', label: 'Contrats' },
  { id: 'audit', label: 'Journal' },
] as const
type TypeFilter = (typeof TYPE_FILTERS)[number]['id']

const PERIOD_FILTERS = [
  { id: '7', label: '7 jours' },
  { id: '30', label: '30 jours' },
  { id: '90', label: '3 mois' },
  { id: 'all', label: 'Tout' },
] as const

// Sans filtre : aperçu de chaque type ; filtré : historique plus profond du type choisi
const LIMIT_OVERVIEW = 10
const LIMIT_FOCUSED = 60
const MAX_EVENTS = 80

type TimelineEvent = {
  id: string
  date: Date
  type: 'contract' | 'intervention' | 'project' | 'quote' | 'invoice' | 'ticket' | 'comment' | 'audit'
  title: string
  subtitle: string
  status?: string
  href: string
  icon: typeof Activity
  color: string
  badge?: string
  badgeColor?: string
  urgent?: boolean
}

export default async function ActivitePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; period?: string }>
}) {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/activite')
  const params = await searchParams
  const typeFilter: TypeFilter = TYPE_FILTERS.some(t => t.id === params.type) ? (params.type as TypeFilter) : 'all'
  const period = PERIOD_FILTERS.some(p => p.id === params.period) ? params.period! : 'all'
  const since = period === 'all' ? null : new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000)

  const wants = (t: TypeFilter) => typeFilter === 'all' || typeFilter === t
  const limit = typeFilter === 'all' ? LIMIT_OVERVIEW : LIMIT_FOCUSED
  const none = Promise.resolve([] as any[])

  const [contracts, interventions, projects, quotes, invoices, tickets, auditLogs] = await Promise.all([
    wants('contract') ? MaintenanceContract.find({ ...companyScope({ userId, companyId }) })
      .sort({ updatedAt: -1 }).limit(limit)
      .select('name status type createdAt updatedAt endDate').lean() as Promise<any[]> : none,
    wants('intervention') ? Intervention.find({ ...companyScope({ userId, companyId }) })
      .sort({ date: -1, createdAt: -1 }).limit(limit)
      .select('title typeIntervention priority status date createdAt').lean() as Promise<any[]> : none,
    wants('project') ? Project.find(clientProjectFilter(companyScope({ userId, companyId })))
      .sort({ updatedAt: -1 }).limit(limit)
      .select('name status progress serviceType createdAt updatedAt').lean() as Promise<any[]> : none,
    wants('documents') ? AdminQuote.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], ...CLIENT_VISIBLE_QUOTE })
      .sort({ updatedAt: -1 }).limit(limit)
      .select('numero title total status clientResponse clientRespondedAt clientComments createdAt updatedAt sentAt').lean() as Promise<any[]> : none,
    wants('documents') ? AdminInvoice.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }], ...CLIENT_VISIBLE_INVOICE })
      .sort({ updatedAt: -1 }).limit(limit)
      .select('numero total status dueDate paidAt createdAt updatedAt sentAt').lean() as Promise<any[]> : none,
    wants('ticket') ? Ticket.find({ ...companyScope({ userId, companyId }) })
      .sort({ updatedAt: -1 }).limit(limit)
      .select('title category priority status createdAt updatedAt').lean() as Promise<any[]> : none,
    wants('audit') ? AuditLog.find(companyId ? { clientCompanyId: companyId } : { userId })
      .sort({ createdAt: -1 }).limit(typeFilter === 'all' ? 15 : LIMIT_FOCUSED)
      .select('entityType entityId action changedFields metadata createdAt').lean() as Promise<any[]> : none,
  ])

  const events: TimelineEvent[] = []

  // Contrats
  for (const c of contracts) {
    const ic = activityIcon.contract
    events.push({
      id: `contract-${c._id}`,
      date: new Date(c.updatedAt || c.createdAt),
      type: 'contract',
      title: c.name,
      subtitle: `Contrat ${c.type} · Statut : ${c.status === 'active' ? 'Actif' : c.status}`,
      href: `/portail-entreprise/contrats/${c._id}`,
      icon: ic.icon,
      color: ic.color,
      badge: c.status === 'active' ? 'Actif' : c.status,
      badgeColor: c.status === 'active' ? activityBadge.ok : activityBadge.neutral,
    })
  }

  // Interventions
  for (const i of interventions) {
    const ic = activityIcon.intervention
    events.push({
      id: `intervention-${i._id}`,
      date: new Date(i.date || i.createdAt),
      type: 'intervention',
      title: i.title,
      subtitle: `${i.typeIntervention || 'Intervention'} · ${i.status === 'completed' ? 'Terminée' : i.status === 'in_progress' ? 'En cours' : 'Planifiée'}`,
      href: `/portail-entreprise/interventions/${i._id}`,
      icon: ic.icon,
      color: ic.color,
      badge: i.priority === 'urgent' || i.priority === 'critical' ? i.priority : undefined,
      badgeColor: activityBadge.alert,
      urgent: i.priority === 'urgent' || i.priority === 'critical',
    })
  }

  // Projets
  for (const p of projects) {
    const ic = activityIcon.project
    events.push({
      id: `project-${p._id}`,
      date: new Date(p.updatedAt || p.createdAt),
      type: 'project',
      title: p.name,
      subtitle: `${p.serviceType || 'Projet'} · ${statusDef(projectStatus, p.status).label}${p.progress != null ? ` · ${p.progress}%` : ''}`,
      href: `/portail-entreprise/projets/${p._id}`,
      icon: ic.icon,
      color: ic.color,
    })
  }

  // Devis + commentaires
  for (const q of quotes) {
    const ic = activityIcon.quote
    const needsAction = q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')
    events.push({
      id: `quote-${q._id}`,
      date: new Date(q.sentAt || q.updatedAt || q.createdAt),
      type: 'quote',
      title: `Devis #${q.numero}${q.title ? ` — ${q.title}` : ''}`,
      subtitle: needsAction ? 'En attente de votre réponse' :
        q.clientResponse === 'accepted' ? 'Vous avez accepté ce devis' :
        q.clientResponse === 'rejected' ? 'Vous avez refusé ce devis' :
        q.clientResponse === 'counter_proposed' ? 'Contre-proposition envoyée' :
        `Statut : ${q.status}`,
      href: `/portail-entreprise/documents/devis/${q._id}`,
      icon: ic.icon,
      color: needsAction ? 'bg-amber-50 text-amber-700' : ic.color,
      badge: needsAction ? 'Action requise' : undefined,
      badgeColor: activityBadge.action,
      urgent: needsAction,
    })
    // Commentaires récents sur ce devis
    if (q.clientComments?.length) {
      for (const cm of q.clientComments.slice(-2)) {
        const icm = activityIcon.comment
        events.push({
          id: `comment-${q._id}-${String(cm._id || Math.random())}`,
          date: new Date(cm.createdAt),
          type: 'comment',
          title: `Commentaire sur devis #${q.numero}`,
          subtitle: `${cm.authorRole === 'CLIENT' ? 'Vous' : 'IT Vision'} : ${cm.message.slice(0, 80)}${cm.message.length > 80 ? '...' : ''}`,
          href: `/portail-entreprise/documents/devis/${q._id}`,
          icon: icm.icon,
          color: icm.color,
        })
      }
    }
  }

  // Factures
  for (const inv of invoices) {
    const ic = activityIcon.invoice
    const isOverdue = inv.status === 'overdue'
    const isDueSoon = inv.dueDate && !isOverdue && Math.floor((new Date(inv.dueDate).getTime() - Date.now()) / 86400000) <= 7
    events.push({
      id: `invoice-${inv._id}`,
      date: new Date(inv.paidAt || inv.sentAt || inv.updatedAt || inv.createdAt),
      type: 'invoice',
      title: `Facture #${inv.numero}`,
      subtitle: inv.status === 'paid'
        ? `Payée — ${inv.total?.toLocaleString('fr-FR')} F`
        : isOverdue
        ? `En retard · Échéance dépassée`
        : isDueSoon
        ? `À régler dans ${Math.floor((new Date(inv.dueDate).getTime() - Date.now()) / 86400000)} jour(s)`
        : `À régler · Échéance ${new Date(inv.dueDate || inv.date).toLocaleDateString('fr-FR')}`,
      href: `/portail-entreprise/documents/factures/${inv._id}`,
      icon: ic.icon,
      color: isOverdue ? 'bg-red-50 text-red-700' : ic.color,
      badge: isOverdue ? 'En retard' : inv.status === 'paid' ? 'Payée' : undefined,
      badgeColor: isOverdue ? activityBadge.alert : activityBadge.ok,
      urgent: isOverdue,
    })
  }

  // Tickets
  for (const t of tickets) {
    const ic = activityIcon.ticket
    const isUrgent = t.priority === 'urgent' || t.priority === 'high'
    events.push({
      id: `ticket-${t._id}`,
      date: new Date(t.updatedAt || t.createdAt),
      type: 'ticket',
      title: t.title,
      subtitle: `${t.category} · ${t.status === 'open' ? 'Ouvert' : t.status === 'in_progress' ? 'En traitement' : t.status === 'resolved' ? 'Résolu' : t.status}`,
      href: `/portail-entreprise/support/${t._id}`,
      icon: ic.icon,
      color: isUrgent && t.status !== 'resolved' ? 'bg-red-50 text-red-700' : ic.color,
      badge: isUrgent && !['resolved', 'closed'].includes(t.status) ? 'Urgent' : undefined,
      badgeColor: activityBadge.alert,
      urgent: isUrgent && !['resolved', 'closed'].includes(t.status),
    })
  }

  // Journal d'audit (actions sensibles du compte)
  for (const a of auditLogs) {
    const ic = activityIcon.audit
    const target = a.entityType === 'AdminQuote'
      ? `Devis ${a.metadata?.numero ? `#${a.metadata.numero}` : ''}`.trim()
      : a.entityType === 'Ticket'
        ? `Ticket « ${a.metadata?.title || '—'} »`
        : (a.metadata?.invitedEmail || 'Compte entreprise')
    events.push({
      id: `audit-${a._id}`,
      date: new Date(a.createdAt),
      type: 'audit',
      title: AUDIT_LABEL[a.action] || a.action,
      subtitle: `${target}${a.changedFields?.length ? ` · ${a.changedFields.length} champ${a.changedFields.length > 1 ? 's' : ''} modifié${a.changedFields.length > 1 ? 's' : ''}` : ''}`,
      href: a.entityId && a.entityType === 'AdminQuote' ? `/portail-entreprise/documents/devis/${a.entityId}`
        : a.entityId && a.entityType === 'Ticket' ? `/portail-entreprise/support/${a.entityId}`
        : AUDIT_HREF[a.entityType] || '/portail-entreprise/activite',
      icon: ic.icon,
      color: ic.color,
      badge: 'Journal',
      badgeColor: activityBadge.neutral,
    })
  }

  // Trier par date desc, puis appliquer la période
  events.sort((a, b) => b.date.getTime() - a.date.getTime())
  const visible = since ? events.filter(e => e.date >= since) : events

  // Grouper par jour
  type GroupedEvents = { dayLabel: string; events: TimelineEvent[] }[]
  const grouped: GroupedEvents = []
  let currentDay = ''
  for (const ev of visible.slice(0, MAX_EVENTS)) {
    const day = ev.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (day !== currentDay) {
      grouped.push({ dayLabel: day, events: [] })
      currentDay = day
    }
    grouped[grouped.length - 1].events.push(ev)
  }

  const urgentCount = visible.filter(e => e.urgent).length
  const filterHref = (type: string, per: string) => {
    const qs = new URLSearchParams()
    if (type !== 'all') qs.set('type', type)
    if (per !== 'all') qs.set('period', per)
    const s = qs.toString()
    return `/portail-entreprise/activite${s ? `?${s}` : ''}`
  }
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? 'bg-emerald-800 text-white' : 'border border-stone-200 bg-white text-stone-500 hover:border-emerald-300 hover:text-emerald-800'
    }`

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <PageHeader
        icon={Activity}
        eyebrow="Portail entreprise"
        title="Activité récente"
        subtitle={
          <>
            Timeline de tous les événements de votre portail
            {urgentCount > 0 && (
              <Pill color={activityBadge.action} className="ml-2">
                {urgentCount} action{urgentCount > 1 ? 's' : ''} requise{urgentCount > 1 ? 's' : ''}
              </Pill>
            )}
          </>
        }
      >
        <BackLink />
      </PageHeader>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map(t => (
            <Link key={t.id} href={filterHref(t.id, period)} className={chip(typeFilter === t.id)} scroll={false}>
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_FILTERS.map(p => (
            <Link key={p.id} href={filterHref(typeFilter, p.id)} className={chip(period === p.id)} scroll={false}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          soft
          title={events.length === 0 ? "Aucune activité pour l'instant" : 'Aucun événement pour ce filtre'}
          message={events.length === 0
            ? 'Les nouveaux événements (tickets, devis, factures, interventions) apparaîtront ici automatiquement.'
            : 'Élargissez la période ou choisissez un autre type.'}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.dayLabel}>
              <h2 className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <span className="flex-1 border-t border-stone-200" />
                {group.dayLabel}
                <span className="flex-1 border-t border-stone-200" />
              </h2>
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                {group.events.map(ev => {
                  const Icon = ev.icon
                  return (
                    <li key={ev.id} className={ev.urgent ? 'bg-amber-50/40' : ''}>
                      <Link href={ev.href}
                        className="flex items-start gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${ev.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">{ev.title}</p>
                            {ev.badge && (
                              <Pill color={ev.badgeColor}>{ev.badge}</Pill>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">{ev.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[11px] text-stone-400 tabular-nums">{fmtRelative(ev.date)}</span>
                          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
