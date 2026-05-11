'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { LifeBuoy, Plus, X, Send, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'
import SoftMessage from '@/components/ui/SoftMessage'

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent',  color: 'bg-red-100 text-red-700' },
  high:   { label: 'Haute',   color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Normale', color: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Basse',   color: 'bg-gray-100 text-gray-500' },
}
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  open:           { label: 'Ouvert',        color: 'bg-orange-100 text-orange-700', icon: Clock },
  in_progress:    { label: 'En traitement', color: 'bg-blue-100 text-blue-700',     icon: Clock },
  waiting_client: { label: 'Votre retour',  color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  waiting:        { label: 'En attente',    color: 'bg-gray-100 text-gray-500',     icon: Clock },
  resolved:       { label: 'Résolu',        color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  closed:         { label: 'Fermé',         color: 'bg-gray-100 text-gray-400',     icon: CheckCircle },
}
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

function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-rose-600" /> Support
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Tickets d&apos;assistance</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600 hidden sm:block">← Tableau de bord</Link>
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Nouveau ticket
          </button>
        </div>
      </div>

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
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Nouveau ticket</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Titre *</label>
              <input
                type="text" required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Décrivez brièvement votre problème..."
                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Catégorie</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Priorité</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Description détaillée</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez le problème en détail (étapes, comportement attendu vs observé...)"
                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
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
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                <Send className="w-4 h-4" />
                {submitting ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800">
        {(['open', 'all', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}>
            {f === 'open' ? 'Ouverts' : f === 'closed' ? 'Résolus' : 'Tous'}
          </button>
        ))}
      </div>

      {/* Liste tickets */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && filteredTickets.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
          <LifeBuoy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {filter === 'open' ? 'Aucun ticket ouvert' : filter === 'closed' ? 'Aucun ticket résolu' : 'Aucun ticket'}
          </p>
          {filter === 'open' && (
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-green-600 hover:underline">
              Ouvrir un ticket
            </button>
          )}
        </div>
      )}

      {!loading && filteredTickets.length > 0 && (
        <div className="space-y-3">
          {filteredTickets.map((t: any) => {
            const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
            const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
            const StatusIcon = statusCfg.icon
            const slaDeadline = t.sla?.deadlineAt ? new Date(t.sla.deadlineAt) : null
            const slaBreached = t.sla?.breached || (slaDeadline && slaDeadline < new Date() && !['resolved', 'closed'].includes(t.status))

            return (
              <Link key={String(t._id)} href={`/portail-entreprise/support/${String(t._id)}`}
                className={`block rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  slaBreached ? 'border-red-200 dark:border-red-900/40 hover:border-red-300' : 'border-gray-100 dark:border-slate-800 hover:border-green-200 dark:hover:border-green-900/40'
                }`}>
                <div className="flex items-start justify-between gap-3 p-4 group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
                      t.priority === 'urgent' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-slate-800'
                    }`}>
                      {t.priority === 'urgent' ? (
                        <Zap className="w-4 h-4 text-red-600" />
                      ) : (
                        <LifeBuoy className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-green-700 transition-colors">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                        <span>{t.category}</span>
                        <span>·</span>
                        <span>{fmtDate(t.createdAt)}</span>
                        {slaDeadline && !['resolved', 'closed'].includes(t.status) && (
                          <span className={`flex items-center gap-0.5 ${slaBreached ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            SLA {slaBreached ? 'dépassé' : `jusqu'au ${fmtDate(slaDeadline)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityCfg.color}`}>
                      {priorityCfg.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>
                      <StatusIcon className="w-2.5 h-2.5" /> {statusCfg.label}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
