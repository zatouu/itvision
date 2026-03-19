export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { connectDB } from '@/lib/db'
import {
  Activity, FileText, Wrench, FolderKanban, Receipt,
  LifeBuoy, Shield, MessageSquare, CheckCircle, Clock,
  AlertTriangle, ChevronRight
} from 'lucide-react'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Ticket from '@/lib/models/Ticket'

function fmtDate(d: any) {
  if (!d) return '—'
  const date = new Date(d)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 60000) // minutes
  if (diff < 1) return "À l'instant"
  if (diff < 60) return `Il y a ${diff} min`
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`
  if (diff < 10080) return `Il y a ${Math.floor(diff / 1440)}j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type TimelineEvent = {
  id: string
  date: Date
  type: 'contract' | 'intervention' | 'project' | 'quote' | 'invoice' | 'ticket' | 'comment'
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

const ICON_CONFIG = {
  contract:     { icon: Shield,       color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  intervention: { icon: Wrench,       color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  project:      { icon: FolderKanban, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  quote:        { icon: FileText,     color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  invoice:      { icon: Receipt,      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ticket:       { icon: LifeBuoy,     color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  comment:      { icon: MessageSquare, color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
}

export default async function ActivitePage() {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/activite')

  const [contracts, interventions, projects, quotes, invoices, tickets] = await Promise.all([
    MaintenanceContract.find({ clientId: userId })
      .sort({ updatedAt: -1 }).limit(10)
      .select('name status type createdAt updatedAt endDate').lean() as Promise<any[]>,
    Intervention.find({ clientId: userId })
      .sort({ date: -1, createdAt: -1 }).limit(10)
      .select('title typeIntervention priority status date createdAt').lean() as Promise<any[]>,
    Project.find({ $or: [{ clientId: userId }, { clientCompanyId: companyId }] })
      .sort({ updatedAt: -1 }).limit(10)
      .select('name status progress serviceType createdAt updatedAt').lean() as Promise<any[]>,
    AdminQuote.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] })
      .sort({ updatedAt: -1 }).limit(10)
      .select('numero title total status clientResponse clientRespondedAt clientComments createdAt updatedAt sentAt').lean() as Promise<any[]>,
    AdminInvoice.find({ $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] })
      .sort({ updatedAt: -1 }).limit(10)
      .select('numero total status dueDate paidAt createdAt updatedAt sentAt').lean() as Promise<any[]>,
    Ticket.find({ clientId: userId })
      .sort({ updatedAt: -1 }).limit(10)
      .select('title category priority status createdAt updatedAt').lean() as Promise<any[]>,
  ])

  const events: TimelineEvent[] = []

  // Contrats
  for (const c of contracts) {
    const ic = ICON_CONFIG.contract
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
      badgeColor: c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
    })
  }

  // Interventions
  for (const i of interventions) {
    const ic = ICON_CONFIG.intervention
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
      badgeColor: 'bg-red-100 text-red-700',
      urgent: i.priority === 'urgent' || i.priority === 'critical',
    })
  }

  // Projets
  for (const p of projects) {
    const ic = ICON_CONFIG.project
    const statusLabels: Record<string, string> = {
      in_progress: 'En cours', completed: 'Terminé', approved: 'Approuvé',
      quoted: 'Devis', lead: 'Prospect', testing: 'Tests', on_hold: 'En pause'
    }
    events.push({
      id: `project-${p._id}`,
      date: new Date(p.updatedAt || p.createdAt),
      type: 'project',
      title: p.name,
      subtitle: `${p.serviceType || 'Projet'} · ${statusLabels[p.status] || p.status}${p.progress != null ? ` · ${p.progress}%` : ''}`,
      href: '/portail-entreprise/projets',
      icon: ic.icon,
      color: ic.color,
    })
  }

  // Devis + commentaires
  for (const q of quotes) {
    const ic = ICON_CONFIG.quote
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
      color: needsAction ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : ic.color,
      badge: needsAction ? 'Action requise' : undefined,
      badgeColor: 'bg-orange-100 text-orange-700',
      urgent: needsAction,
    })
    // Commentaires récents sur ce devis
    if (q.clientComments?.length) {
      for (const cm of q.clientComments.slice(-2)) {
        const icm = ICON_CONFIG.comment
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
    const ic = ICON_CONFIG.invoice
    const isOverdue = inv.status === 'overdue'
    const isDueSoon = inv.dueDate && !isOverdue && Math.floor((new Date(inv.dueDate).getTime() - Date.now()) / 86400000) <= 7
    events.push({
      id: `invoice-${inv._id}`,
      date: new Date(inv.paidAt || inv.sentAt || inv.updatedAt || inv.createdAt),
      type: 'invoice',
      title: `Facture #${inv.numero}`,
      subtitle: inv.status === 'paid'
        ? `Payée — ${inv.total?.toLocaleString('fr-FR')} FCFA`
        : isOverdue
        ? `En retard · Échéance dépassée`
        : isDueSoon
        ? `À régler dans ${Math.floor((new Date(inv.dueDate).getTime() - Date.now()) / 86400000)} jour(s)`
        : `À régler · Échéance ${new Date(inv.dueDate || inv.date).toLocaleDateString('fr-FR')}`,
      href: '/portail-entreprise/documents',
      icon: ic.icon,
      color: isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : ic.color,
      badge: isOverdue ? 'En retard' : inv.status === 'paid' ? 'Payée' : undefined,
      badgeColor: isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
      urgent: isOverdue,
    })
  }

  // Tickets
  for (const t of tickets) {
    const ic = ICON_CONFIG.ticket
    const isUrgent = t.priority === 'urgent' || t.priority === 'high'
    events.push({
      id: `ticket-${t._id}`,
      date: new Date(t.updatedAt || t.createdAt),
      type: 'ticket',
      title: t.title,
      subtitle: `${t.category} · ${t.status === 'open' ? 'Ouvert' : t.status === 'in_progress' ? 'En traitement' : t.status === 'resolved' ? 'Résolu' : t.status}`,
      href: '/portail-entreprise/support',
      icon: ic.icon,
      color: isUrgent && t.status !== 'resolved' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : ic.color,
      badge: isUrgent && !['resolved', 'closed'].includes(t.status) ? 'Urgent' : undefined,
      badgeColor: 'bg-red-100 text-red-700',
      urgent: isUrgent && !['resolved', 'closed'].includes(t.status),
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" /> Activité récente
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Timeline de tous les événements de votre portail
            {urgentCount > 0 && <span className="ml-2 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-semibold">{urgentCount} action{urgentCount > 1 ? 's' : ''} requise{urgentCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-16 text-center">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune activité pour l&apos;instant</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.dayLabel}>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="flex-1 border-t border-gray-100 dark:border-slate-800" />
                {group.dayLabel}
                <span className="flex-1 border-t border-gray-100 dark:border-slate-800" />
              </h2>
              <div className="space-y-2">
                {group.events.map(ev => {
                  const Icon = ev.icon
                  return (
                    <Link key={ev.id} href={ev.href}
                      className={`flex items-start gap-3 rounded-xl border bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all group ${
                        ev.urgent ? 'border-orange-200 dark:border-orange-900/40 bg-orange-50/30 dark:bg-orange-900/5' : 'border-gray-100 dark:border-slate-800'
                      }`}>
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${ev.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.title}</p>
                          {ev.badge && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ev.badgeColor}`}>{ev.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ev.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-gray-400">{fmtDate(ev.date)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
