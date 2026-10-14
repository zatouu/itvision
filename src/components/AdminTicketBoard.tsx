'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, BellRing, Filter, Loader2, MessageCircle, RefreshCcw, Send, ShieldAlert, Users2 } from 'lucide-react'

interface TicketListItem {
  id: string
  title: string
  status: string
  priority: string
  category: string
  clientId: string
  projectId: string
  createdAt: string
  updatedAt: string
}

interface TicketDetail {
  id: string
  title: string
  status: string
  priority: string
  category: string
  tags: string[]
  clientId: string
  projectId: string
  messages: Array<{
    authorRole: string
    message: string
    createdAt: string
    attachments?: Array<{ name: string; url: string }>
    internal?: boolean
  }>
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'open', label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'waiting_client', label: 'En attente client' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'closed', label: 'Fermé' }
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Normale' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' }
]

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  waiting_client: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-teal-50 text-teal-700 border-teal-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200'
}

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
}

function formatDate(date: string | Date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminTicketBoard() {
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [statusFilter, setStatusFilter] = useState('open')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [messageDraft, setMessageDraft] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const fetchTickets = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ limit: '100', sortBy: 'updatedAt', sortDir: 'desc' })
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter && priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/tickets?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Erreur chargement tickets')
      const data = await res.json()
      const formatted: TicketListItem[] = (data.tickets || []).map((ticket: any) => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        clientId: ticket.clientId,
        projectId: ticket.projectId,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }))
      setTickets(formatted)
      if (!selectedId && formatted.length > 0) {
        setSelectedId(formatted[0].id)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingList(false)
    }
  }, [statusFilter, priorityFilter, search, selectedId])

  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/tickets/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Erreur chargement ticket')
      const data = await res.json()
      const ticket = data.ticket
      if (ticket) {
        setDetail({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          tags: ticket.tags || [],
          clientId: ticket.clientId,
          projectId: ticket.projectId,
          messages: ticket.messages || [],
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt
        })
      }
    } catch (error) {
      console.error(error)
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId)
    } else {
      setDetail(null)
    }
  }, [selectedId, fetchDetail])

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedId), [tickets, selectedId])

  const updateTicket = async (payload: Record<string, unknown>) => {
    if (!selectedId) return
    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, ...payload })
      })
      if (!res.ok) throw new Error('Mise à jour impossible')
      await fetchTickets()
      await fetchDetail(selectedId)
    } catch (error) {
      console.error(error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedId || !messageDraft.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch(`/api/tickets/${selectedId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageDraft.trim() })
      })
      if (!res.ok) throw new Error('Envoi impossible')
      setMessageDraft('')
      await fetchDetail(selectedId)
    } catch (error) {
      console.error(error)
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-500" /> Support tickets</h1>
          <p className="text-sm text-gray-500">Suivi temps réel des demandes clients et interventions terrain.</p>
        </div>
        <button onClick={fetchTickets} className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          <RefreshCcw className="h-4 w-4" /> Rafraîchir
        </button>
      </div>

      <div className="grid gap-6 px-6 py-6 xl:grid-cols-5">
        <aside className="xl:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Filter className="h-4 w-4" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs">
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs">
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche"
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="rounded-2xl border border-gray-100 max-h-[420px] overflow-y-auto divide-y">
            {loadingList && <p className="text-sm text-gray-500 p-4">Chargement des tickets...</p>}
            {!loadingList && tickets.length === 0 && <p className="text-sm text-gray-500 p-4">Aucun ticket pour le moment.</p>}
            {tickets.map((ticket) => {
              const active = ticket.id === selectedId
              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                  className={`w-full text-left px-4 py-3 transition ${active ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{PRIORITY_OPTIONS.find((p) => p.value === ticket.priority)?.label || ticket.priority}</span>
                    <span>{formatDate(ticket.updatedAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{ticket.title}</p>
                  <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS_BADGE[ticket.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {STATUS_OPTIONS.find((s) => s.value === ticket.status)?.label || ticket.status}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="xl:col-span-3 border border-gray-100 rounded-2xl p-6 space-y-4 min-h-[460px]">
          {loadingDetail && <p className="text-sm text-gray-500">Chargement du ticket...</p>}

          {!loadingDetail && detail && (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{detail.title}</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS_BADGE[detail.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {STATUS_OPTIONS.find((s) => s.value === detail.status)?.label || detail.status}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${PRIORITY_BADGE[detail.priority] || 'bg-gray-100 text-gray-600'}`}>
                      {PRIORITY_OPTIONS.find((p) => p.value === detail.priority)?.label || detail.priority}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Créé le {formatDate(detail.createdAt)}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => updateTicket({ status: 'in_progress' })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <Users2 className="h-4 w-4" /> Prendre en charge
                  </button>
                  <button onClick={() => updateTicket({ status: 'resolved' })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <BadgeCheck className="h-4 w-4" /> Marquer résolu
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {detail.messages.map((message, idx) => (
                  <div key={`${message.createdAt}-${idx}`} className={`rounded-xl border p-4 ${message.authorRole === 'CLIENT' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-medium">{message.authorRole === 'CLIENT' ? 'Client' : message.authorRole === 'TECHNICIAN' ? 'Technicien' : 'Admin'}</span>
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{message.message}</p>
                    {message.attachments?.length ? (
                      <ul className="mt-2 text-xs text-emerald-600 space-y-1">
                        {message.attachments.map((att, index) => (
                          <li key={`${att.url}-${index}`}><a href={att.url} target="_blank" rel="noopener" className="hover:underline">📎 {att.name}</a></li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500">Répondre au ticket</label>
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  rows={3}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Écrivez votre message ou compte rendu"
                />
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-red-600"><ShieldAlert className="h-4 w-4" /> SLA : {selectedTicket ? formatDate(selectedTicket.updatedAt) : '—'}</span>
                    <span className="inline-flex items-center gap-1 text-blue-600"><BellRing className="h-4 w-4" /> Notifications envoyées</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !messageDraft.trim()}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${sendingMessage || !messageDraft.trim() ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loadingDetail && !detail && (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Sélectionnez un ticket pour afficher les détails.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

