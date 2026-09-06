'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, LifeBuoy, Clock, AlertTriangle, CheckCircle, Zap,
  Loader2, AlertCircle, Send, Paperclip, Tag, User, Shield,
  MessageSquare, History, Calendar, Check, X, RotateCcw
} from 'lucide-react'

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  urgent: { label: 'Urgent',  color: 'bg-red-100 text-red-700', border: 'border-red-200' },
  high:   { label: 'Haute',   color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  medium: { label: 'Normale', color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200' },
  low:    { label: 'Basse',   color: 'bg-gray-100 text-gray-500', border: 'border-gray-200' },
}
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open:           { label: 'Ouvert',        color: 'bg-orange-100 text-orange-700', icon: Clock },
  in_progress:    { label: 'En traitement', color: 'bg-blue-100 text-blue-700',     icon: Clock },
  waiting_client: { label: 'Votre retour',  color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  waiting:        { label: 'En attente',    color: 'bg-gray-100 text-gray-500',     icon: Clock },
  resolved:       { label: 'Résolu',        color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  closed:         { label: 'Fermé',         color: 'bg-gray-100 text-gray-400',     icon: CheckCircle },
}
const CAT_LABELS: Record<string, string> = {
  incident: 'Incident', request: 'Demande', technical: 'Technique',
  billing: 'Facturation', urgent: 'Urgence', general: 'Général', change: 'Changement'
}
const ACTION_LABELS: Record<string, string> = {
  status_change: 'Changement de statut', assignment: 'Assignation', note: 'Note', message: 'Message'
}

function fd(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fdate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function hoursLeft(deadline: string | Date) {
  if (!deadline) return null
  const h = Math.floor((new Date(deadline).getTime() - Date.now()) / 3600000)
  return h
}

function Empty({ icon: I, msg }: { icon: any; msg: string }) {
  return <div className="flex flex-col items-center py-12 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"><I className="w-10 h-10 text-gray-300 mb-3" /><p className="text-sm text-gray-500">{msg}</p></div>
}

export default function TicketDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
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

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error) return <div className="p-6"><div className="rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!ticket) return null

  const pc = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium
  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
  const StatusIcon = sc.icon
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'
  const slaH = hoursLeft(ticket.sla?.deadlineAt)
  const slaBreached = ticket.sla?.breached || (slaH !== null && slaH < 0 && !isClosed)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/portail-entreprise/support')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{ticket.title}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${sc.color}`}>
              <StatusIcon className="w-3 h-3 inline mr-0.5" />{sc.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pc.color}`}>{pc.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            <span>{CAT_LABELS[ticket.category] || ticket.category}</span>
            <span>·</span>
            <span>Ouvert le {fdate(ticket.createdAt)}</span>
            {ticket.resolvedAt && <span>· Résolu le {fdate(ticket.resolvedAt)}</span>}
            {ticket.tags?.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                {ticket.tags.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SLA */}
      {ticket.sla && !isClosed && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${slaBreached ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40' : 'border-gray-100 bg-gray-50 dark:bg-slate-900 dark:border-slate-800'}`}>
          <Clock className={`w-5 h-5 flex-shrink-0 ${slaBreached ? 'text-red-600' : 'text-gray-400'}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${slaBreached ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-200'}`}>
              {slaBreached
                ? `SLA dépassé · Délai de ${ticket.sla.targetHours}h non respecté`
                : slaH !== null && slaH <= 4
                  ? `SLA critique · Réponse attendue sous ${slaH}h`
                  : `SLA · Réponse sous ${ticket.sla.targetHours}h${slaH !== null ? ` (${slaH}h restantes)` : ''}`
              }
            </p>
            <p className="text-xs text-gray-400">Échéance : {fd(ticket.sla.deadlineAt)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800">
        {[
          { id: 'messages', label: 'Messages', icon: MessageSquare, count: ticket.messages?.length },
          { id: 'history', label: 'Historique', icon: History, count: ticket.history?.length },
        ].map(t => {
          const I = t.icon
          const active = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                active ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <I className="w-3.5 h-3.5" />
              {t.label}
              {t.count ? <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-1.5 py-0 text-[10px] text-gray-500">{t.count}</span> : null}
            </button>
          )
        })}
      </div>

      {/* Messages tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {(ticket.messages || []).length === 0 ? (
            <Empty icon={MessageSquare} msg="Aucun message" />
          ) : (
            <div className="space-y-3">
              {(ticket.messages || []).map((m: any, i: number) => {
                const isClient = m.authorRole === 'CLIENT'
                return (
                  <div key={i} className={`flex gap-3 ${isClient ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isClient ? 'bg-green-100 dark:bg-green-900/30' : 'bg-violet-100 dark:bg-violet-900/30'
                    }`}>
                      {isClient ? <User className="w-4 h-4 text-green-600" /> : <Shield className="w-4 h-4 text-violet-600" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isClient
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30'
                        : 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold ${isClient ? 'text-green-700' : 'text-violet-700'}`}>
                          {isClient ? 'Vous' : 'IT Vision'}
                        </span>
                        <span className="text-[10px] text-gray-400">{fd(m.createdAt)}</span>
                        {m.statusSnapshot && m.statusSnapshot !== ticket.status && (
                          <span className="text-[10px] text-gray-400">· {STATUS_CONFIG[m.statusSnapshot]?.label || m.statusSnapshot}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{m.message}</p>
                      {(m.attachments || []).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {m.attachments.map((a: any, j: number) => (
                            <a key={j} href={a.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-green-600 hover:underline">
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
            <form onSubmit={handleReply} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Votre réponse</label>
                <textarea
                  rows={3}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              {sendError && <p className="text-xs text-red-600">{sendError}</p>}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{ticket.status === 'waiting_client' ? 'Ce ticket attend votre retour' : 'Réponse facultative'}</p>
                <button type="submit" disabled={sending || !reply.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  <Send className="w-4 h-4" />{sending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-4 text-center">
              <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-sm text-gray-500">Ce ticket est {ticket.status === 'resolved' ? 'résolu' : 'fermé'}.</p>
              <p className="text-xs text-gray-400 mt-0.5">Vous ne pouvez plus y répondre.</p>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {(ticket.history || []).length === 0 ? (
            <Empty icon={History} msg="Aucun historique" />
          ) : (
            (ticket.history || []).map((h: any, i: number) => {
              const isClient = h.authorRole === 'CLIENT'
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isClient ? 'bg-green-50' : 'bg-violet-50'}`}>
                    {isClient ? <User className="w-4 h-4 text-green-600" /> : <Shield className="w-4 h-4 text-violet-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{ACTION_LABELS[h.action] || h.action}</span>
                      <span className="text-[10px] text-gray-400">{fd(h.createdAt)}</span>
                    </div>
                    {h.payload && (
                      <p className="text-xs text-gray-500 mt-1">
                        {h.payload.from && h.payload.to
                          ? `De « ${h.payload.from} » vers « ${h.payload.to} »`
                          : JSON.stringify(h.payload)}
                      </p>
                    )}
                    <span className="text-[10px] text-gray-400 mt-0.5">{isClient ? 'Par vous' : 'Par IT Vision'}</span>
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
