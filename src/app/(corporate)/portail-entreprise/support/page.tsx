'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { LifeBuoy, Plus, X, Send, Clock, Zap, ChevronRight } from 'lucide-react'
import SoftMessage from '@/components/ui/SoftMessage'
import { CARD, INPUT, fmtDateTime, ticketStatus, priority, StatusBadge, EmptyState, PageHeader, BackLink } from '@/components/portal-ui'

const CATEGORIES = [
  { value: 'incident',  label: 'Incident' },
  { value: 'request',   label: 'Demande de service' },
  { value: 'technical', label: 'Problème technique' },
  { value: 'billing',   label: 'Facturation' },
  { value: 'urgent',    label: 'Urgence' },
  { value: 'general',   label: 'Général' },
]
const PRIORITIES = [
  { value: 'low',    label: 'Basse' },
  { value: 'medium', label: 'Normale' },
  { value: 'high',   label: 'Haute' },
  { value: 'urgent', label: 'Urgent' },
]

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [form, setForm] = useState({ title: '', category: 'incident', priority: 'medium', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/client-enterprise/tickets')
      const data = await response.json().catch(() => ({}))
      setTickets(Array.isArray(data?.tickets) ? data.tickets : [])
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tickets === null) {
      loadTickets()
    }
  }, [tickets, loadTickets])

  const filteredTickets = (tickets || []).filter(t => {
    if (filter === 'open') return !['resolved', 'closed'].includes(t.status)
    if (filter === 'closed') return ['resolved', 'closed'].includes(t.status)
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/client-enterprise/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setTickets(prev => [data.ticket, ...(prev || [])])
      setShowForm(false)
      setForm({ title: '', category: 'incident', priority: 'medium', description: '' })
      setSuccess('Ticket créé avec succès')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <PageHeader
        icon={LifeBuoy}
        eyebrow="Assistance"
        title="Support"
        subtitle="Tickets d'assistance"
      >
        <BackLink href="/portail-entreprise" className="hidden sm:inline-flex" />
        <button
          onClick={() => { setShowForm(true); setError('') }}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nouveau ticket
        </button>
      </PageHeader>

      {/* Succès */}
      {success && (
        <SoftMessage
          variant="success"
          title="Ticket envoyé"
          message={success}
          onClose={() => setSuccess('')}
        />
      )}

      {/* Formulaire nouveau ticket */}
      {showForm && (
        <div className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-stone-100">
            <h2 className="font-semibold text-stone-900 text-sm">Nouveau ticket</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Titre *</label>
              <input
                type="text" required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Décrivez brièvement votre problème..."
                className={INPUT}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Catégorie</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className={INPUT}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Priorité</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className={INPUT}
                >
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Description détaillée</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez le problème en détail (étapes, comportement attendu vs observé...)"
                className={`${INPUT} resize-none`}
              />
            </div>
            {error && (
              <SoftMessage
                variant="error"
                title="Échec de la création"
                message={error}
                onClose={() => setError('')}
              />
            )}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
                {submitting ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-1 border-b border-stone-200">
        {(['open', 'all', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}>
            {f === 'open' ? 'Ouverts' : f === 'closed' ? 'Résolus' : 'Tous'}
          </button>
        ))}
      </div>

      {/* Liste tickets */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && filteredTickets.length === 0 && (
        <EmptyState
          icon={LifeBuoy}
          title={filter === 'open' ? 'Aucun ticket ouvert' : filter === 'closed' ? 'Aucun ticket résolu' : 'Aucun ticket'}
          action={filter === 'open' ? (
            <button onClick={() => setShowForm(true)}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Ouvrir un ticket
            </button>
          ) : undefined}
        />
      )}

      {!loading && filteredTickets.length > 0 && (
        <ul className={`divide-y divide-stone-100 overflow-hidden ${CARD}`}>
          {filteredTickets.map((t: any) => {
            const slaDeadline = t.sla?.deadlineAt ? new Date(t.sla.deadlineAt) : null
            const slaBreached = t.sla?.breached || (slaDeadline && slaDeadline < new Date() && !['resolved', 'closed'].includes(t.status))

            return (
              <li key={String(t._id)} className={slaBreached ? 'bg-red-50/40' : ''}>
                <Link href={`/portail-entreprise/support/${String(t._id)}`}
                  className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
                      t.priority === 'urgent' ? 'bg-red-50' : 'bg-stone-50'
                    }`}>
                      {t.priority === 'urgent' ? (
                        <Zap className="w-4 h-4 text-red-600" />
                      ) : (
                        <LifeBuoy className="w-4 h-4 text-stone-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400 flex-wrap">
                        <span>{t.category}</span>
                        <span>·</span>
                        <span>{fmtDateTime(t.createdAt)}</span>
                        {slaDeadline && !['resolved', 'closed'].includes(t.status) && (
                          <span className={`flex items-center gap-0.5 ${slaBreached ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            SLA {slaBreached ? 'dépassé' : `jusqu'au ${fmtDateTime(slaDeadline)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <StatusBadge status={t.priority} map={priority} fallback="medium" icon={false} />
                    <StatusBadge status={t.status} map={ticketStatus} fallback="open" />
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
