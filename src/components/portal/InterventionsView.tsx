'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { interventionStatus, statusDef } from '@/components/portal-ui'

export interface CalItem {
  id: string
  title: string
  date: string
  status: string
  heureDebut?: string
  site?: string
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function InterventionsView({ items, children }: { items: CalItem[]; children: React.ReactNode }) {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>()
    for (const i of items) {
      if (!i.date) continue
      const k = dayKey(new Date(i.date))
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(i)
    }
    return m
  }, [items])

  const todayKey = dayKey(new Date())
  const monthLabel = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const move = (delta: number) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  // Grille : lundi en premier
  const firstDow = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Toggle vue */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {([
            { id: 'list', label: 'Liste', icon: List },
            { id: 'calendar', label: 'Calendrier', icon: Calendar },
          ] as const).map(v => (
            <button key={v.id} type="button" onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === v.id ? 'bg-emerald-800 text-white' : 'text-stone-500 hover:text-stone-700'
              }`}>
              <v.icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          ))}
        </div>
        {view === 'calendar' && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => move(-1)} aria-label="Mois précédent"
              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-stone-800 capitalize">{monthLabel}</span>
            <button type="button" onClick={() => move(1)} aria-label="Mois suivant"
              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d) }}
              className="ml-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:border-emerald-300 hover:text-emerald-800 transition-colors">
              Aujourd&apos;hui
            </button>
          </div>
        )}
      </div>

      {view === 'list' ? children : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/60">
            {WEEKDAYS.map(d => (
              <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d.charAt(0)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-stone-100">
            {cells.map((day, idx) => {
              const key = day ? dayKey(day) : `empty-${idx}`
              const dayItems = day ? (byDay.get(key) || []) : []
              const isToday = day ? key === todayKey : false
              return (
                <div key={key} className={`min-h-[64px] sm:min-h-[96px] p-1 sm:p-1.5 ${!day ? 'bg-stone-50/40' : ''}`}>
                  {day && (
                    <>
                      <p className={`text-right text-[11px] font-semibold px-1 ${isToday ? 'inline-flex float-right h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white' : 'text-stone-400'}`}>
                        {day.getDate()}
                      </p>
                      <div className="clear-both space-y-1">
                        {dayItems.slice(0, 3).map(i => {
                          const def = statusDef(interventionStatus, i.status)
                          return (
                            <Link key={i.id} href={`/portail-entreprise/interventions/${i.id}`}
                              title={`${i.heureDebut ? i.heureDebut + ' — ' : ''}${i.title}`}
                              className={`block truncate rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium ${def.color}`}>
                              <span className="hidden sm:inline">{i.heureDebut ? `${i.heureDebut} ` : ''}</span>{i.title}
                            </Link>
                          )
                        })}
                        {dayItems.length > 3 && (
                          <p className="px-1.5 text-[10px] text-stone-400">+{dayItems.length - 3} autre{dayItems.length - 3 > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
