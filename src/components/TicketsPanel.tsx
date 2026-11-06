"use client"
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, MessageCircle, Plus } from 'lucide-react'

interface Ticket {
  _id: string
  title: string
  category: 'incident' | 'request' | 'change'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed'
  createdAt: string
  sla: {
    targetHours: number
    startedAt: string
    deadlineAt: string
    breached: boolean
  }
  messages: Array<{ authorRole: string; message: string; createdAt: string }>
}

export default function TicketsPanel({ projectId }: { projectId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/tickets?projectId=${projectId}`, { cache: 'no-store' })
    const j = await r.json()
    if (j.success) setTickets(j.tickets)
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  const createTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as any
    const body = {
      title: form.title.value,
      category: form.category.value,
      priority: form.priority.value,
      projectId,
      clientId: 'CLI-FAKE-USERID',
      message: form.message.value
    }
    const r = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) { setCreating(false); form.reset(); load() }
  }

  const statusBadge = (t: Ticket) => {
    const timeLeftMs = new Date(t.sla.deadlineAt).getTime() - Date.now()
    const breached = timeLeftMs <= 0 || t.sla.breached
    const hoursLeft = Math.max(0, Math.ceil(timeLeftMs / (1000 * 60 * 60)))
    return (
      <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded text-xs ${breached ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {breached ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
        <span>{breached ? 'SLA dépassé' : `SLA: ${hoursLeft}h restantes`}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">Tickets ({tickets.length})</h4>
        <button onClick={()=>setCreating(true)} className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          <Plus className="h-4 w-4" />
          <span>Nouveau ticket</span>
        </button>
      </div>

      {creating && (
        <form onSubmit={createTicket} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded border">
          <input name="title" placeholder="Titre" className="border rounded px-3 py-2" required />
          <select name="category" className="border rounded px-3 py-2">
            <option value="incident">Incident</option>
            <option value="request">Demande</option>
            <option value="change">Changement</option>
          </select>
          <select name="priority" className="border rounded px-3 py-2">
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
            <option value="urgent">Urgente</option>
          </select>
          <input name="message" placeholder="Message initial (optionnel)" className="border rounded px-3 py-2 md:col-span-4" />
          <div className="md:col-span-4 text-right">
            <button type="button" onClick={()=>setCreating(false)} className="px-3 py-2 border rounded mr-2">Annuler</button>
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Créer</button>
          </div>
        </form>
      )}

      <div className="divide-y">
        {loading ? (
          <div className="py-6 text-gray-500">Chargement...</div>
        ) : tickets.length === 0 ? (
          <div className="py-6 text-gray-500">Aucun ticket</div>
        ) : (
          tickets.map(t => (
            <div key={t._id} className="py-4 flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900">{t.title}</div>
                <div className="text-xs text-gray-600 mt-1 flex items-center space-x-3">
                  <span className="inline-flex items-center space-x-1"><Clock className="h-3 w-3" /><span>Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</span></span>
                  <span className="inline-flex items-center space-x-1"><MessageCircle className="h-3 w-3" /><span>{t.messages?.length || 0} messages</span></span>
                </div>
              </div>
              <div>{statusBadge(t)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
