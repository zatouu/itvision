'use client'

import { Clock, MapPin, Building2, Camera, PenLine, ChevronRight } from 'lucide-react'
import { INTERVENTION_STATUS, PRIORITY, TYPE_LABELS, clientLabel } from './tech-ui'

export interface TechInterventionItem {
  id: string
  number?: string | null
  title: string
  status: string
  priority?: string
  type?: string
  site?: string
  date?: string
  scheduledDate?: string
  heureDebut?: string
  heureFin?: string
  client?: { name?: string; company?: string; address?: string; city?: string; phone?: string } | null
  report: { photosAvant: number; photosApres: number; signedByClient: boolean; hasObservations: boolean }
}

export default function InterventionCard({ item, onOpen, highlight = false }: {
  item: TechInterventionItem
  onOpen: (id: string) => void
  highlight?: boolean
}) {
  const st = INTERVENTION_STATUS[item.status] || INTERVENTION_STATUS.pending
  const prio = item.priority ? PRIORITY[item.priority] : undefined
  const photos = item.report.photosAvant + item.report.photosApres
  const place = [item.client?.address, item.client?.city].filter(Boolean).join(', ') || item.site

  return (
    <button
      onClick={() => onOpen(item.id)}
      className={`group w-full text-left rounded-2xl border bg-white p-4 shadow-sm transition active:scale-[0.99] hover:shadow-md ${
        highlight ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-stone-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex w-12 flex-shrink-0 flex-col items-center rounded-xl bg-stone-50 py-2">
          <span className="text-sm font-bold tabular-nums text-stone-900">{item.heureDebut || '--:--'}</span>
          {item.heureFin && <span className="text-[10px] tabular-nums text-stone-400">{item.heureFin}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.chip}`}>{st.label}</span>
            {prio && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${prio.chip}`}>{prio.label}</span>}
            {item.type && <span className="text-[10px] font-medium text-stone-400">{TYPE_LABELS[item.type] || item.type}</span>}
          </div>
          <p className="mt-1 truncate text-sm font-bold text-stone-900">{item.title}</p>
          {clientLabel(item.client) && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stone-500">
              <Building2 className="h-3 w-3 flex-shrink-0" />{clientLabel(item.client)}
            </p>
          )}
          {place && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stone-400">
              <MapPin className="h-3 w-3 flex-shrink-0" />{place}
            </p>
          )}
          {(photos > 0 || item.report.signedByClient || item.report.hasObservations) && (
            <div className="mt-2 flex items-center gap-3 text-[10px] font-medium text-stone-400">
              {photos > 0 && <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{photos}</span>}
              {item.report.hasObservations && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Compte rendu</span>}
              {item.report.signedByClient && <span className="flex items-center gap-1 text-emerald-600"><PenLine className="h-3 w-3" />Signé</span>}
            </div>
          )}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500" />
      </div>
    </button>
  )
}
