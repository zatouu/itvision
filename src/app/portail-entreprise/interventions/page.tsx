export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { connectDB } from '@/lib/db'
import { Wrench, Calendar, MapPin, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react'
import Intervention from '@/lib/models/Intervention'
import SoftMessage from '@/components/ui/SoftMessage'

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critique',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  urgent:   { label: 'Urgent',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high:     { label: 'Haute',    color: 'bg-orange-100 text-orange-700' },
  medium:   { label: 'Normale',  color: 'bg-yellow-100 text-yellow-700' },
  low:      { label: 'Basse',    color: 'bg-gray-100 text-gray-500' },
}
const TYPE_LABELS: Record<string, string> = {
  urgence: 'Urgence', maintenance: 'Maintenance', installation: 'Installation', autre: 'Autre'
}
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Planifiée',  color: 'bg-blue-100 text-blue-700' },
  in_progress:  { label: 'En cours',   color: 'bg-yellow-100 text-yellow-700' },
  completed:    { label: 'Terminée',   color: 'bg-green-100 text-green-700' },
  cancelled:    { label: 'Annulée',    color: 'bg-gray-100 text-gray-400' },
  scheduled:    { label: 'Planifiée',  color: 'bg-blue-100 text-blue-700' },
  draft:        { label: 'Brouillon',  color: 'bg-gray-100 text-gray-400' },
}

function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function InterventionsPage() {
  const { userId } = await getEnterpriseSession('/portail-entreprise/interventions')

  const interventions = await Intervention.find({ clientId: userId })
    .sort({ date: -1, createdAt: -1 })
    .lean() as any[]

  const upcoming = interventions.filter(i => i.date && new Date(i.date) >= new Date() && !['completed', 'cancelled'].includes(i.status || ''))
  const past = interventions.filter(i => !upcoming.includes(i))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" /> Fiches d&apos;intervention
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {interventions.length} intervention{interventions.length > 1 ? 's' : ''}
            {upcoming.length > 0 && ` · ${upcoming.length} à venir`}
          </p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600">← Tableau de bord</Link>
      </div>

      {interventions.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
          <SoftMessage
            variant="info"
            title="Aucune intervention enregistrée"
            message="Les interventions planifiées et terminées apparaîtront ici dès qu'elles seront créées."
            className="mx-auto max-w-xl text-left"
          />
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3">À venir</h2>
          <div className="space-y-3">
            {upcoming.map(i => <InterventionCard key={String(i._id)} i={i} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3">Historique</h2>
          <div className="space-y-3">
            {past.map(i => <InterventionCard key={String(i._id)} i={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function InterventionCard({ i }: { i: any }) {
  const priority = PRIORITY_CONFIG[i.priority] || { label: i.priority, color: 'bg-gray-100 text-gray-500' }
  const status = STATUS_CONFIG[i.status] || { label: i.status || '—', color: 'bg-gray-100 text-gray-400' }
  const hasSignature = !!i.signatures?.client?.signature
  const photoCount = ((i.photosAvant || []).length + (i.photosApres || []).length)

  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-gray-900 dark:text-white">{i.title}</h3>
              {i.interventionNumber && (
                <span className="text-xs text-gray-400 font-mono">{i.interventionNumber}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
              {i.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(i.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {i.heureDebut && ` · ${i.heureDebut}`}
                </span>
              )}
              {i.site && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {i.site}</span>}
              {i.service && <span>{i.service}</span>}
              {i.typeIntervention && <span>{TYPE_LABELS[i.typeIntervention] || i.typeIntervention}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.color}`}>{priority.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {(i.activites || i.observations || i.recommandations?.length > 0) && (
        <div className="border-t border-gray-50 dark:border-slate-800 px-4 py-3 space-y-2">
          {i.activites && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Activités</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{i.activites}</p>
            </div>
          )}
          {i.observations && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Observations</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{i.observations}</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-gray-50 dark:border-slate-800 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
        {i.isCoveredByContract && (
          <span className="flex items-center gap-1 text-green-600">
            <Shield className="w-3 h-3" /> Couvert contrat
          </span>
        )}
        {hasSignature && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3 h-3" /> Signé
          </span>
        )}
        {photoCount > 0 && (
          <span>{photoCount} photo{photoCount > 1 ? 's' : ''}</span>
        )}
        {i.duree && <span><Clock className="w-3 h-3 inline mr-0.5" />{i.duree}min</span>}
      </div>
    </div>
  )
}
