'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, List, Clock, User, Shield, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

interface PlanningItem {
  _id: string
  title: string
  status: string
  priority: string
  date?: string
  typeIntervention?: string
  technician?: { name: string; specialties: string[]; isAvailable: boolean } | null
  contract?: { contractNumber: string; type: string } | null
}

interface Stats {
  total: number
  pending: number
  scheduled: number
  inProgress: number
  completed: number
  unassigned: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Planifiée', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-red-400',
  urgent: 'border-red-300',
  high: 'border-orange-300',
  medium: 'border-yellow-200',
  low: 'border-gray-200',
}

export default function AdminPlanning() {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [data, setData] = useState<PlanningItem[]>([])
  const [calendarData, setCalendarData] = useState<Record<string, PlanningItem[]>>({})
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, scheduled: 0, inProgress: 0, completed: 0, unassigned: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const fetchPlanning = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0]
      const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0]
      const url = `/api/admin/planning?view=${view}&from=${from}&to=${to}&status=${filterStatus}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (view === 'calendar') {
        setCalendarData(json.data || {})
      } else {
        setData(json.data || [])
      }
      setStats(json.stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [view, currentMonth, filterStatus])

  useEffect(() => { fetchPlanning() }, [fetchPlanning])

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthLabel = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <List className="w-4 h-4" /> Liste
          </button>
          <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Calendar className="w-4 h-4" /> Calendrier
          </button>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">Tous statuts</option>
          <option value="pending">En attente</option>
          <option value="scheduled">Planifiées</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminées</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-50' },
          { label: 'Non assignées', value: stats.unassigned, color: 'bg-orange-50' },
          { label: 'En attente', value: stats.pending, color: 'bg-gray-50' },
          { label: 'Planifiées', value: stats.scheduled, color: 'bg-blue-50' },
          { label: 'En cours', value: stats.inProgress, color: 'bg-yellow-50' },
          { label: 'Terminées', value: stats.completed, color: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-lg border border-gray-100 p-2.5 text-center`}>
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-[10px] text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && <div className="text-sm text-gray-400 py-8 text-center">Chargement...</div>}

      {/* Vue Liste */}
      {!loading && view === 'list' && (
        <div className="space-y-2">
          {data.length === 0 && <div className="text-sm text-gray-400 py-8 text-center">Aucune intervention</div>}
          {data.map(item => {
            const status = STATUS_LABELS[item.status] || { label: item.status, color: 'bg-gray-100' }
            return (
              <div key={item._id} className={`rounded-lg border ${PRIORITY_COLORS[item.priority] || 'border-gray-200'} bg-white p-3 flex items-start justify-between gap-3`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 truncate">{item.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    {item.date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.date).toLocaleDateString('fr-FR')}</span>}
                    {item.technician ? (
                      <span className="flex items-center gap-1 text-gray-600">
                        <User className="w-3 h-3" /> {item.technician.name}
                        {!item.technician.isAvailable && <span className="text-orange-500">(indisponible)</span>}
                      </span>
                    ) : (
                      <span className="text-orange-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Non assigné</span>
                    )}
                    {item.contract && <span className="flex items-center gap-1 text-green-600"><Shield className="w-3 h-3" /> {item.contract.contractNumber}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vue Calendrier */}
      {!loading && view === 'calendar' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h3 className="text-sm font-semibold text-gray-700 capitalize">{monthLabel}</h3>
            <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
              <div key={d} className="text-[10px] font-semibold text-gray-400 text-center py-1">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-lg bg-gray-50/50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, day) => {
              const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day + 1).toISOString().split('T')[0]
              const dayItems = calendarData[dateStr] || []
              return (
                <div key={day} className="h-20 rounded-lg border border-gray-100 bg-white p-1 overflow-hidden">
                  <div className="text-[10px] font-medium text-gray-500 mb-0.5">{day + 1}</div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => (
                      <div key={item._id} className={`text-[10px] truncate px-1 py-0.5 rounded ${item.status === 'completed' ? 'bg-green-50 text-green-700' : item.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-gray-400 text-center">+{dayItems.length - 3}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
