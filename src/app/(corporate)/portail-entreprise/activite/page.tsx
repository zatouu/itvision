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
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
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
}
const AUDIT_HREF: Record<string, string> = {
  AdminQuote: '/portail-entreprise/documents',
  Ticket: '/portail-entreprise/support',
  Client: '/portail-entreprise/profil',
}

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

export default async function ActivitePage() {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/activite')

  const [contracts, interventions, projects, quotes, invoices, tickets, auditLogs] = await Promise.all([
    MaintenanceContract.find({ ...companyScope({ userId, companyId }) })
      .sort({ updatedAt: -1 }).limit(10)
      .select('name status type createdAt updatedAt endDate').lean() as Promise<any[]>,
    Intervention.find({ ...companyScope({ userId, companyId }) })
      .sort({ date: -1, createdAt: -1 }).limit(10)
      .select('title typeIntervention priority status date createdAt').lean() as Promise<any[]>,
    Project.find(companyScope({ userId, companyId }))
      .sort({ updatedAt: -1 }).limit(10)
      .select('name status progress serviceType createdAt updatedAt').lean() as Promise<any[]>,
    AdminQuote.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] })
      .sort({ updatedAt: -1 }).limit(10)
      .select('numero title total status clientResponse clientRespondedAt clientComments createdAt updatedAt sentAt').lean() as Promise<any[]>,
    AdminInvoice.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] })
      .sort({ updatedAt: -1 }).limit(10)
      .select('numero total status dueDate paidAt createdAt updatedAt sentAt').lean() as Promise<any[]>,
    Ticket.find({ ...companyScope({ userId, companyId }) })
      .sort({ updatedAt: -1 }).limit(10)
      .select('title category priority status createdAt updatedAt').lean() as Promise<any[]>,
    AuditLog.find(companyId ? { clientCompanyId: companyId } : { userId })
      .sort({ createdAt: -1 }).limit(15)
      .select('entityType action changedFields metadata createdAt').lean() as Promise<any[]>,
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
      href: '/portail-entreprise/contrats',
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
      href: '/portail-entreprise/interventions',
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
      href: '/portail-entreprise/projets',
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
      href: '/portail-entreprise/documents',
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
          href: '/portail-entreprise/documents',
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
      href: '/portail-entreprise/documents',
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
      href: '/portail-entreprise/support',
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
        : 'Compte entreprise'
    events.push({
      id: `audit-${a._id}`,
      date: new Date(a.createdAt),
      type: 'audit',
      title: AUDIT_LABEL[a.action] || a.action,
      subtitle: `${target}${a.changedFields?.length ? ` · ${a.changedFields.length} champ${a.changedFields.length > 1 ? 's' : ''} modifié${a.changedFields.length > 1 ? 's' : ''}` : ''}`,
      href: AUDIT_HREF[a.entityType] || '/portail-entreprise/activite',
      icon: ic.icon,
      color: ic.color,
      badge: 'Journal',
      badgeColor: activityBadge.neutral,
    })
  }

  // Trier par date desc
  events.sort((a, b) => b.date.getTime() - a.date.getTime())

  // Grouper par jour
  type GroupedEvents = { dayLabel: string; events: TimelineEvent[] }[]
  const grouped: GroupedEvents = []
  let currentDay = ''
  for (const ev of events.slice(0, 50)) {
    const day = ev.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (day !== currentDay) {
      grouped.push({ dayLabel: day, events: [] })
      currentDay = day
    }
    grouped[grouped.length - 1].events.push(ev)
  }

  const urgentCount = events.filter(e => e.urgent).length

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

      {events.length === 0 ? (
        <EmptyState
          soft
          title="Aucune activité pour l'instant"
          message="Les nouveaux événements (tickets, devis, factures, interventions) apparaîtront ici automatiquement."
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
