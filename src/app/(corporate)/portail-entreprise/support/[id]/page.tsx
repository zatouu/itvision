'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  Clock, CheckCircle,
  Loader2, AlertCircle, Send, Paperclip, Tag, User, Shield,
  MessageSquare, History
} from 'lucide-react'
import { CARD, INPUT, BTN_PRIMARY, fmtDate, fmtDateTime, hoursLeft, ticketStatus, priority, ticketCategoryLabel, ticketActionLabel, StatusBadge, EmptyState, DetailHeader } from '@/components/portal-ui'
import { initSocket, joinTicket, leaveTicket, onSocketEvent } from '@/lib/socket-client'

export default function TicketDetailPage() {
  const { id } = useParams() as { id: string }
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [activeTab, setActiveTab] = useState<'messages' | 'history'>('messages')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/client-enterprise/tickets/${id}`)
      .then(r => { if (!r.ok) throw new Error('Introuvable'); return r.json() })
      .then(d => { setTicket(d.ticket); setLoading(false) })
      .catch(() => { setError('Impossible de charger le ticket.'); setLoading(false) })
  }, [id])

  // Chat live : room ticket + réception des nouveaux messages
  useEffect(() => {
    try {
      initSocket()
      joinTicket(id)
      const off = onSocketEvent('new-message', (data: any) => {
        if (data?.ticketId !== id) return
        setTicket((prev: any) => {
          if (!prev) return prev
          const exists = (prev.messages || []).some((m: any) =>
            m.message === data.message && String(m.authorId) === String(data.authorId) && Math.abs(new Date(m.createdAt).getTime() - new Date(data.createdAt || data.timestamp).getTime()) < 5000
          )
          if (exists) return prev
          return { ...prev, messages: [...prev.messages, { authorId: data.authorId, authorRole: data.authorRole, message: data.message, createdAt: data.createdAt || data.timestamp }] }
        })
      })
      return () => { off(); leaveTicket(id) }
    } catch {
      return undefined
    }
  }, [id])

  useEffect(() => {
    if (messagesEndRef.current && activeTab === 'messages') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [ticket?.messages?.length, activeTab])

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true); setSendError('')
    try {
      const res = await fetch(`/api/client-enterprise/tickets/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setTicket((prev: any) => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev)
      setReply('')
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
  if (error) return <div className="p-4 sm:p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!ticket) return null

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'
  const slaH = hoursLeft(ticket.sla?.deadlineAt)
  const slaBreached = ticket.sla?.breached || (slaH !== null && slaH < 0 && !isClosed)

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <DetailHeader
        back={{ href: '/portail-entreprise/support', label: 'Support' }}
        title={ticket.title}
        badges={
          <>
            <StatusBadge status={ticket.status} map={ticketStatus} fallback="open" />
            <StatusBadge status={ticket.priority} map={priority} fallback="medium" icon={false} />
          </>
        }
        meta={
          <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-400 flex-wrap">
            <span>{ticketCategoryLabel[ticket.category] || ticket.category}</span>
            <span>·</span>
            <span>Ouvert le {fmtDate(ticket.createdAt)}</span>
            {ticket.resolvedAt && <span>· Résolu le {fmtDate(ticket.resolvedAt)}</span>}
            {ticket.tags?.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                {ticket.tags.join(', ')}
              </span>
            )}
          </div>
        }
      />

      {/* SLA */}
      {ticket.sla && !isClosed && (
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${slaBreached ? 'border-red-200 bg-red-50/60' : 'border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]'}`}>
          <Clock className={`w-5 h-5 flex-shrink-0 ${slaBreached ? 'text-red-600' : 'text-stone-400'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${slaBreached ? 'text-red-700' : 'text-stone-700'}`}>
              {slaBreached
                ? `SLA dépassé · Délai de ${ticket.sla.targetHours}h non respecté`
                : slaH !== null && slaH <= 4
                  ? `SLA critique · Réponse attendue sous ${slaH}h`
                  : `SLA · Réponse sous ${ticket.sla.targetHours}h${slaH !== null ? ` (${slaH}h restantes)` : ''}`
              }
            </p>
            <p className="text-xs text-stone-400">Échéance : {fmtDateTime(ticket.sla.deadlineAt)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        {[
          { id: 'messages', label: 'Messages', icon: MessageSquare, count: ticket.messages?.length },
          { id: 'history', label: 'Historique', icon: History, count: ticket.history?.length },
        ].map(t => {
          const I = t.icon
          const active = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}>
              <I className="w-3.5 h-3.5" />
              {t.label}
              {t.count ? <span className="rounded-full bg-stone-100 px-1.5 py-0 text-[10px] text-stone-500 tabular-nums">{t.count}</span> : null}
            </button>
          )
        })}
      </div>

      {/* Messages tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {(ticket.messages || []).length === 0 ? (
            <EmptyState icon={MessageSquare} title="Aucun message" className="py-12 px-0" />
          ) : (
            <div className="space-y-3">
              {(ticket.messages || []).map((m: any, i: number) => {
                const isClient = m.authorRole === 'CLIENT'
                return (
                  <div key={i} className={`flex gap-3 ${isClient ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isClient ? 'bg-emerald-50' : 'bg-sky-50'
                    }`}>
                      {isClient ? <User className="w-4 h-4 text-emerald-700" /> : <Shield className="w-4 h-4 text-sky-700" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isClient
                        ? 'bg-emerald-50/60 border border-emerald-100'
                        : 'bg-white border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                    }`}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold ${isClient ? 'text-emerald-700' : 'text-sky-700'}`}>
                          {isClient ? 'Vous' : 'IT Vision'}
                        </span>
                        <span className="text-[10px] text-stone-400">{fmtDateTime(m.createdAt)}</span>
                        {m.statusSnapshot && m.statusSnapshot !== ticket.status && (
                          <span className="text-[10px] text-stone-400">· {ticketStatus[m.statusSnapshot]?.label || m.statusSnapshot}</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-800 whitespace-pre-line">{m.message}</p>
                      {(m.attachments || []).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {m.attachments.map((a: any, j: number) => (
                            <a key={j} href={a.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 hover:underline">
                              <Paperclip className="w-3 h-3" />{a.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Reply form */}
          {!isClosed ? (
            <form onSubmit={handleReply} className={`${CARD} p-4 space-y-3`}>
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-1.5">Votre réponse</label>
                <textarea
                  rows={3}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className={`${INPUT} resize-none`}
                />
              </div>
              {sendError && <p className="text-xs text-red-600">{sendError}</p>}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-stone-400">{ticket.status === 'waiting_client' ? 'Ce ticket attend votre retour' : 'Réponse facultative'}</p>
                <button type="submit" disabled={sending || !reply.trim()}
                  className={BTN_PRIMARY}>
                  <Send className="w-4 h-4" />{sending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-sm text-stone-500">Ce ticket est {ticket.status === 'resolved' ? 'résolu' : 'fermé'}.</p>
              <p className="text-xs text-stone-400 mt-0.5">Vous ne pouvez plus y répondre.</p>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {(ticket.history || []).length === 0 ? (
            <EmptyState icon={History} title="Aucun historique" className="py-12 px-0" />
          ) : (
            (ticket.history || []).map((h: any, i: number) => {
              const isClient = h.authorRole === 'CLIENT'
              return (
                <div key={i} className={`flex items-start gap-3 ${CARD} p-4`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isClient ? 'bg-emerald-50' : 'bg-sky-50'}`}>
                    {isClient ? <User className="w-4 h-4 text-emerald-700" /> : <Shield className="w-4 h-4 text-sky-700" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-900">{ticketActionLabel[h.action] || h.action}</span>
                      <span className="text-[10px] text-stone-400">{fmtDateTime(h.createdAt)}</span>
                    </div>
                    {h.payload && (
                      <p className="text-xs text-stone-500 mt-1">
                        {h.payload.from && h.payload.to
                          ? `De « ${h.payload.from} » vers « ${h.payload.to} »`
                          : JSON.stringify(h.payload)}
                      </p>
                    )}
                    <span className="text-[10px] text-stone-400 mt-0.5">{isClient ? 'Par vous' : 'Par IT Vision'}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
