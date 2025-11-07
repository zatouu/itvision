'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, MessageCircle, Plus, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface ClientTicketCenterProps {
  projectId: string
  clientId?: string
  initialTickets?: Array<{
    id: string
    title: string
    status: string
    priority: string
    category: string
    createdAt: string | Date
  }>
  onChange?: () => Promise<void> | void
}

interface TicketListItem {
  id: string
  title: string
  status: string
  priority: string
  category: string
  createdAt: string
  lastResponseAt?: string
}

interface TicketDetail {
  id: string
  title: string
  status: string
  priority: string
  category: string
  messages: Array<{
    authorRole: string
    message: string
    createdAt: string
    attachments?: Array<{ name: string; url: string; type?: string }>
    internal?: boolean
  }>
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_client: 'En attente client',
  resolved: 'Résolu',
  closed: 'Fermé'
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
}

function formatDate(date: string | Date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ClientTicketCenter({ projectId, clientId, initialTickets = [], onChange }: ClientTicketCenterProps) {
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets.map((t) => ({
    ...t,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString()
  })))
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTickets[0]?.id || null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creatingError, setCreatingError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [expandedForm, setExpandedForm] = useState(false)
  const [newCategory, setNewCategory] = useState<'incident' | 'request' | 'change'>('incident')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [replyMessage, setReplyMessage] = useState('')
  const [replySending, setReplySending] = useState(false)

  const canCreate = Boolean(clientId)

  const fetchTickets = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ projectId, limit: '50', sortBy: 'updatedAt' })
      const res = await fetch(`/api/tickets?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Impossible de charger les tickets')
      const data = await res.json()
      const formatted: TicketListItem[] = (data.tickets || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        createdAt: t.createdAt,
        lastResponseAt: t.lastResponseAt
      }))
      setTickets(formatted)
      if (!selectedTicketId && formatted.length > 0) {
        setSelectedTicketId(formatted[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingList(false)
    }
  }, [projectId, selectedTicketId])

  const fetchDetail = useCallback(async (ticketId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Impossible de charger le ticket')
      const data = await res.json()
      const ticket = data.ticket
      if (ticket) {
        setDetail({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          messages: (ticket.messages || []).map((m: any) => ({
            authorRole: m.authorRole,
            message: m.message,
            createdAt: m.createdAt,
            attachments: m.attachments,
            internal: m.internal
          })),
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt
        })
      }
    } catch (err) {
      console.error(err)
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTickets])

  useEffect(() => {
    if (selectedTicketId) {
      fetchDetail(selectedTicketId)
    } else {
      setDetail(null)
    }
  }, [selectedTicketId, fetchDetail])

  const handleCreateTicket = async () => {
    if (!canCreate || !newTitle.trim()) return
    setCreating(true)
    setCreatingError(null)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          projectId,
          message: newMessage.trim() || undefined
        })
      })
      if (!res.ok) {
        throw new Error('Création impossible pour le moment')
      }
      setNewTitle('')
      setNewMessage('')
      setExpandedForm(false)
      await fetchTickets()
      if (onChange) await onChange()
    } catch (err) {
      setCreatingError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleSendMessage = async () => {
    if (!replyMessage.trim() || !selectedTicketId) return
    setReplySending(true)
    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage.trim() })
      })
      if (!res.ok) throw new Error('Impossible d’envoyer votre message')
      setReplyMessage('')
      await fetchDetail(selectedTicketId)
      if (onChange) await onChange()
    } catch (err) {
      console.error(err)
    } finally {
      setReplySending(false)
    }
  }

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId), [tickets, selectedTicketId])

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-500" /> Tickets & support</h2>
        {canCreate && (
          <button
            type="button"
            onClick={() => setExpandedForm((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" /> Nouveau ticket
            {expandedForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {expandedForm && canCreate && (
        <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4 space-y-3">
          {creatingError && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {creatingError}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Titre</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Caméra hors ligne" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Catégorie</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="incident">Incident</option>
                  <option value="request">Demande</option>
                  <option value="change">Changement</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Priorité</label>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="low">Faible</option>
                  <option value="medium">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} rows={3} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Expliquez brièvement votre besoin" />
          </div>
          <button
            type="button"
            disabled={creating || !newTitle.trim()}
            onClick={handleCreateTicket}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg ${creating || !newTitle.trim() ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Créer le ticket
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Mes tickets ({tickets.length})</span>
            <button onClick={fetchTickets} className="text-emerald-600 hover:text-emerald-700">Rafraîchir</button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {loadingList && <p className="text-sm text-gray-500">Chargement...</p>}
            {!loadingList && tickets.length === 0 && <p className="text-sm text-gray-500">Aucun ticket pour ce projet.</p>}
            {tickets.map((ticket) => {
              const active = ticket.id === selectedTicketId
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition ${active ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/60'}`}
                >
                  <p className="text-sm font-semibold truncate">{ticket.title}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{STATUS_LABELS[ticket.status] || ticket.status}</span>
                    <span>·</span>
                    <span>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Créé le {formatDate(ticket.createdAt)}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-3 border border-gray-100 rounded-xl p-4 min-h-[280px]">
          {loadingDetail && <p className="text-sm text-gray-500">Chargement du ticket...</p>}
          {!loadingDetail && detail && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{detail.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-2">{STATUS_LABELS[detail.status] || detail.status}<span>·</span>{PRIORITY_LABELS[detail.priority] || detail.priority}</p>
              </div>
              <div className="space-y-3">
                {detail.messages.map((message, idx) => (
                  <div key={`${message.createdAt}-${idx}`} className={`rounded-lg p-3 border ${message.authorRole === 'CLIENT' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{message.authorRole === 'CLIENT' ? 'Vous' : message.authorRole === 'TECHNICIAN' ? 'Technicien IT Vision' : 'IT Vision'}</span>
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{message.message}</p>
                    {message.attachments?.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-emerald-600">
                        {message.attachments.map((att, index) => (
                          <li key={`${att.url}-${index}`}><a href={att.url} target="_blank" rel="noopener" className="hover:underline">📎 {att.name}</a></li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
              {clientId && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Écrivez votre réponse"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={replySending || !replyMessage.trim()}
                    className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg ${replySending || !replyMessage.trim() ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                  >
                    {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
                  </button>
                </div>
              )}
            </div>
          )}
          {!loadingDetail && !detail && (
            <p className="text-sm text-gray-500">Sélectionnez un ticket pour consulter la conversation.</p>
          )}
        </div>
      </div>
    </div>
  )
}

