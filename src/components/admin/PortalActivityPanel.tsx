'use client'
import { useEffect, useState } from 'react'
import { Bell, Eye, Loader2, Star, Users } from 'lucide-react'

type Activity = {
  members: Array<{ id: string; name: string; email: string; role: string; pending: boolean; active: boolean; lastSeen: string | null }>
  stats: {
    members: number; activeMembers30: number; lastVisit: string | null; notifications30: number; visibleProjects: number
    receptionsPending: number; sharedDocuments: number; ratingAvg: number | null; ratingCount: number
  }
  notifications: Array<{ id: string; title: string; createdAt: string; reads: number }>
}

function since(d: string | null) {
  if (!d) return 'Jamais'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} j`
  return new Date(d).toLocaleDateString('fr-FR')
}

/** Encart « Espace client » de la fiche entreprise : qui l'utilise, quand, et ce qui lui a été envoyé. */
export default function PortalActivityPanel({ clientId }: { clientId: string }) {
  const [data, setData] = useState<Activity | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}/portal-activity`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
  }, [clientId])

  if (error) return null
  if (!data) return <div className="flex justify-center rounded-xl border border-stone-200 p-4"><Loader2 className="h-5 w-5 animate-spin text-stone-300" /></div>

  const s = data.stats
  const dormant = s.members > 0 && s.activeMembers30 === 0
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-900"><Eye className="h-4 w-4 text-blue-600" />Espace client</div>
      {dormant && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Aucune visite depuis 30 jours : une relance commerciale peut être utile.</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Dernière visite', since(s.lastVisit)],
          ['Membres actifs (30 j)', `${s.activeMembers30} / ${s.members}`],
          ['Notifications (30 j)', String(s.notifications30)],
          ['Avis moyen', s.ratingAvg ? `${s.ratingAvg.toFixed(1).replace('.', ',')} / 5 (${s.ratingCount})` : '-'],
          ['Projets visibles', String(s.visibleProjects)],
          ['Documents partagés', String(s.sharedDocuments)],
          ['PV à signer', String(s.receptionsPending)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-stone-50 px-3 py-2">
            <p className="text-[11px] text-stone-500">{l}</p>
            <p className="text-sm font-semibold text-stone-900">{v}</p>
          </div>
        ))}
      </div>

      {data.members.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-stone-500"><Users className="h-3.5 w-3.5" />Membres</p>
          <ul className="divide-y divide-stone-100 text-sm">
            {data.members.map(m => (
              <li key={m.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate">{m.name || m.email} <span className="text-xs text-stone-400">· {m.role}</span></span>
                {m.pending ? <span className="text-xs text-amber-700">Invitation en attente</span> : <span className="text-xs text-stone-500">{since(m.lastSeen)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.notifications.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-stone-500"><Bell className="h-3.5 w-3.5" />Dernières notifications envoyées</p>
          <ul className="divide-y divide-stone-100 text-sm">
            {data.notifications.map(n => (
              <li key={n.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-stone-700">{n.title}</span>
                <span className="text-xs text-stone-400">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</span>
                <span className="w-14 text-right text-xs text-stone-500" title="Membres ayant lu">{n.reads ? `${n.reads} lu${n.reads > 1 ? 's' : ''}` : 'Non lu'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.ratingCount > 0 && (
        <a href="/admin/satisfaction" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"><Star className="h-3.5 w-3.5" />Voir la satisfaction clients</a>
      )}
    </div>
  )
}
