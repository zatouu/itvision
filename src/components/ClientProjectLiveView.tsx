'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, FileText, MapPin, User, Users, AlertCircle, TrendingUp, Package, Layers } from 'lucide-react'

interface TimelineEntry {
  id?: string
  date: string | Date
  type: string
  title: string
  description?: string
  author?: string
}

interface MilestoneEntry {
  id?: string
  name: string
  description?: string
  dueDate?: string | Date
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
}

interface DocumentEntry {
  id?: string
  name: string
  type: string
  url: string
  uploadDate: string | Date
}

interface TicketSummary {
  id: string
  title: string
  category: string
  priority: string
  status: string
  createdAt: string | Date
  updatedAt: string | Date
}

interface TechnicianSummary {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
}

export interface ClientProjectSummary {
  project: {
    id: string
    name: string
    description?: string
    address: string
    status: string
    startDate: string | Date
    endDate?: string | Date | null
    serviceType?: string
    currentPhase?: string
    clientAccess?: boolean
    site?: {
      name?: string
      address?: string
      access?: string
      constraints?: string[]
      contacts?: Array<{ name?: string; role?: string; phone?: string; email?: string; availability?: string }>
    }
    clientSnapshot?: {
      company?: string
      contact?: string
      phone?: string
      email?: string
    }
    nextMaintenance?: string | Date | null
    maintenanceWindow?: string | null
    metrics?: {
      tasksTotal?: number
      tasksCompleted?: number
      budgetPlanned?: number
      budgetUsed?: number
      satisfactionScore?: number
    } | null
  }
  stats: {
    progress: number
    margin: number
    value: number
    tasksTotal: number
    tasksCompleted: number
    satisfactionScore: number | null
  }
  timeline: TimelineEntry[]
  milestones: MilestoneEntry[]
  documents: DocumentEntry[]
  statusHistory: Array<{ date: string | Date; status: string; author?: string; note?: string }>
  sharedNotes: Array<{ id?: string; author: string; role: string; createdAt: string | Date; message: string }>
  risks: Array<{ id?: string; title: string; status: string; probability?: string; impact?: string }>
  tickets: TicketSummary[]
  assignedTechnicians: TechnicianSummary[]
}

interface ClientProjectLiveViewProps {
  summary: ClientProjectSummary
  clientId?: string
  onTicketCreated?: () => Promise<void> | void
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return DATE_FORMATTER.format(date)
}

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-700',
  quoted: 'bg-blue-100 text-blue-700',
  negotiation: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  testing: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  maintenance: 'bg-cyan-100 text-cyan-700',
  on_hold: 'bg-red-100 text-red-700'
}

export default function ClientProjectLiveView({ summary, clientId, onTicketCreated }: ClientProjectLiveViewProps) {
  const { project, stats, timeline, milestones, documents, tickets, assignedTechnicians } = summary
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketCategory, setTicketCategory] = useState<'incident' | 'request' | 'change'>('incident')
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [ticketMessage, setTicketMessage] = useState('')
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [ticketFeedback, setTicketFeedback] = useState<string | null>(null)
  const formDisabled = ticketSubmitting || !ticketTitle.trim() || !clientId

  const progressPercent = Math.min(100, Math.max(0, Math.round(stats.progress)))

  const statusBadgeClass = useMemo(() => {
    const key = project.status?.toLowerCase() || ''
    return STATUS_COLORS[key] || 'bg-gray-100 text-gray-700'
  }, [project.status])

  const handleTicketSubmit = async () => {
    if (formDisabled || !clientId) return
    setTicketSubmitting(true)
    setTicketFeedback(null)
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: ticketTitle.trim(),
          category: ticketCategory,
          priority: ticketPriority,
          clientId,
          projectId: summary.project.id,
          message: ticketMessage.trim()
        })
      })
      if (!response.ok) {
        throw new Error('Impossible de créer le ticket pour le moment')
      }
      setTicketTitle('')
      setTicketCategory('incident')
      setTicketPriority('medium')
      setTicketMessage('')
      setTicketFeedback('Votre demande a été envoyée. Notre équipe vous recontactera rapidement.')
      if (onTicketCreated) {
        await onTicketCreated()
      }
    } catch (err) {
      setTicketFeedback((err as Error).message)
    } finally {
      setTicketSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              {project.name}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadgeClass}`}>{project.status}</span>
            </h1>
            {project.description && <p className="text-sm text-gray-600 mt-1 max-w-2xl">{project.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> Démarrage : {formatDate(project.startDate)}</span>
              {project.endDate && <span className="inline-flex items-center gap-1">Fin estimée : {formatDate(project.endDate)}</span>}
              {project.serviceType && <span className="inline-flex items-center gap-1"><Layers className="h-4 w-4" /> {project.serviceType}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Budget</span>
              <p className="font-semibold text-gray-900">{stats.value ? `${stats.value.toLocaleString('fr-FR')} FCFA` : '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Marge</span>
              <p className="font-semibold text-gray-900">{stats.margin ? `${stats.margin.toLocaleString('fr-FR')} FCFA` : '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Tâches</span>
              <p className="font-semibold text-gray-900">{stats.tasksCompleted}/{stats.tasksTotal}</p>
            </div>
            <div>
              <span className="text-gray-500">Satisfaction</span>
              <p className="font-semibold text-gray-900">{stats.satisfactionScore ? `${stats.satisfactionScore.toFixed(1)}/5` : '—'}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progression</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">
            <h2 className="text-sm font-semibold text-emerald-800 flex items-center gap-2"><MapPin className="h-4 w-4" /> Site</h2>
            <div className="text-sm text-emerald-900">
              <p>{project.site?.name || project.address}</p>
              {project.site?.address && <p className="text-emerald-700">{project.site.address}</p>}
              {project.site?.access && <p className="text-emerald-700"><strong>Accès :</strong> {project.site.access}</p>}
            </div>
            {!!project.site?.contacts?.length && (
              <div className="space-y-1 text-sm text-emerald-900">
                <p className="font-medium">Contacts site :</p>
                {project.site.contacts.map((contact, idx) => (
                  <p key={idx} className="flex flex-col">
                    <span>{contact.name}{contact.role ? ` · ${contact.role}` : ''}</span>
                    <span className="text-xs text-emerald-700">{contact.phone || contact.email}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
            <h2 className="text-sm font-semibold text-blue-800 flex items-center gap-2"><User className="h-4 w-4" /> Contact IT Vision</h2>
            <div className="text-sm text-blue-900">
              <p>{project.clientSnapshot?.contact || 'Référent non défini'}</p>
              {project.clientSnapshot?.company && <p className="text-blue-700">{project.clientSnapshot.company}</p>}
              {project.clientSnapshot?.phone && <p>📞 {project.clientSnapshot.phone}</p>}
              {project.clientSnapshot?.email && <p>✉️ {project.clientSnapshot.email}</p>}
            </div>
            {!!assignedTechnicians.length && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-blue-700 uppercase">Techniciens en charge</p>
                <ul className="mt-1 space-y-1 text-sm text-blue-900">
                  {assignedTechnicians.map((tech) => (
                    <li key={tech.id} className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>{tech.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4 text-emerald-500" /> Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun événement disponible pour le moment.</p>
          ) : (
            <ul className="space-y-4">
              {timeline.map((event, index) => (
                <li key={event.id || index} className="flex gap-3">
                  <div className="pt-1">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(event.date)}</span>
                      <span>·</span>
                      <span className="uppercase tracking-wide">{event.type}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    {event.description && <p className="text-sm text-gray-600">{event.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3"><Package className="h-4 w-4 text-indigo-500" /> Prochaines étapes</h2>
            {milestones.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune étape planifiée pour le moment.</p>
            ) : (
              <ul className="space-y-3">
                {milestones.slice(0, 5).map((milestone, index) => (
                  <li key={milestone.id || index} className="text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{milestone.name}</span>
                      <span className="text-xs text-gray-500">{formatDate(milestone.dueDate)}</span>
                    </div>
                    {milestone.description && <p className="text-xs text-gray-500">{milestone.description}</p>}
                    <p className="text-xs uppercase tracking-wide mt-1 text-gray-500">Statut : {milestone.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-purple-500" /> Documents récents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun document partagé pour l'instant.</p>
            ) : (
              <ul className="space-y-3">
                {documents.slice(0, 5).map((doc, index) => (
                  <li key={doc.id || index} className="text-sm text-gray-700">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {doc.name}
                    </a>
                    <div className="text-xs text-gray-500">{doc.type} · {formatDate(doc.uploadDate)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3"><AlertCircle className="h-4 w-4 text-amber-500" /> Tickets & incidents</h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun ticket ouvert pour ce projet.</p>
          ) : (
            <ul className="space-y-3 mb-4">
              {tickets.slice(0, 5).map((ticket) => (
                <li key={ticket.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{ticket.category}</span>
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{ticket.title}</p>
                  <p className="text-xs text-gray-500 mt-1">Priorité : {ticket.priority} · Statut : {ticket.status}</p>
                </li>
              ))}
            </ul>
          )}
          {clientId && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Ouvrir un ticket</p>
              {ticketFeedback && <p className={`text-sm ${ticketFeedback.includes('Impossible') ? 'text-red-600' : 'text-emerald-600'}`}>{ticketFeedback}</p>}
              <input
                type="text"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="Objet de votre demande"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Catégorie</label>
                  <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="incident">Incident</option>
                    <option value="request">Demande</option>
                    <option value="change">Changement</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Priorité</label>
                  <select value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="low">Faible</option>
                    <option value="medium">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
              <textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Décrivez votre demande (optionnel)"
                rows={3}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                disabled={formDisabled}
                onClick={handleTicketSubmit}
                className={`w-full inline-flex justify-center items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
                  formDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {ticketSubmitting ? 'Envoi en cours…' : 'Envoyer la demande'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Notes partagées</h2>
          {summary.sharedNotes.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune note pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {summary.sharedNotes.slice(0, 5).map((note, index) => (
                <li key={note.id || index} className="border border-gray-100 rounded-xl p-3">
                  <div className="text-xs text-gray-500 flex items-center justify-between">
                    <span>{note.author} ({note.role})</span>
                    <span>{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{note.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

