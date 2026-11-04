'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Crown, FolderKanban, Loader2 } from 'lucide-react'
import { readJsonResponse } from '@/lib/http/read-json'
import { PROJECT_STATUS_META, normalizeProjectStatus } from '@/lib/projects/workflow'

/** Projets sur lesquels un technicien est responsable ou membre (fiche technicien admin). */
export default function TechnicianProjects({ technicianId }: { technicianId: string }) {
  const [projects, setProjects] = useState<any[] | null>(null)

  useEffect(() => {
    fetch(`/api/projects?technicianId=${technicianId}&limit=50`, { credentials: 'include' })
      .then(readJsonResponse)
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
  }, [technicianId])

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900"><FolderKanban className="h-4 w-4" />Projets</p>
      {projects === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
      ) : projects.length === 0 ? (
        <p className="text-sm text-stone-500">Affecté à aucun projet.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {projects.map(p => {
            const status = normalizeProjectStatus(p.status)
            const lead = String(p.leadTechnicianId || '') === technicianId
            return (
              <li key={p._id}>
                <Link href={`/admin/projects/${p._id}`} className="flex items-center gap-3 py-2 hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-stone-900">
                      {lead && <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" aria-label="Responsable" />}
                      <span className="truncate">{p.name}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PROJECT_STATUS_META[status].color}`}>{PROJECT_STATUS_META[status].short}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Number(p.progress) || 0)}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-stone-500">{Number(p.progress) || 0} %</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-300" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
