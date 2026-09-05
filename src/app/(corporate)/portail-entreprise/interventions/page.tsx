export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import { Wrench, Calendar, MapPin, CheckCircle, Clock, Shield, ChevronRight } from 'lucide-react'
import Intervention from '@/lib/models/Intervention'
import RequestInterventionButton from '@/components/client/RequestInterventionButton'
import InterventionFeedback from '@/components/client/InterventionFeedback'
import {
  PageHeader,
  BackLink,
  StatusBadge,
  EmptyState,
  interventionStatus,
  priority,
  interventionTypeLabel,
  fmtDate,
} from '@/components/portal-ui'

export default async function InterventionsPage() {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/interventions')

  const interventions = await Intervention.find({ ...companyScope({ userId, companyId }) })
    .sort({ date: -1, createdAt: -1 })
    .lean() as any[]

  const upcoming = interventions.filter(i => i.date && new Date(i.date) >= new Date() && !['completed', 'cancelled'].includes(i.status || ''))
  const past = interventions.filter(i => !upcoming.includes(i))

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <PageHeader
        icon={Wrench}
        eyebrow="Maintenance"
        title="Fiches d'intervention"
        subtitle={`${interventions.length} intervention${interventions.length > 1 ? 's' : ''}${upcoming.length > 0 ? ` · ${upcoming.length} à venir` : ''}`}
      >
        <RequestInterventionButton />
        <BackLink />
      </PageHeader>

      {interventions.length === 0 && (
        <EmptyState
          soft
          title="Aucune intervention enregistrée"
          message="Les interventions planifiées et terminées apparaîtront ici dès qu'elles seront créées."
        />
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3">À venir</h2>
          <div className="space-y-3">
            {upcoming.map(i => <InterventionCard key={String(i._id)} i={i} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3">Historique</h2>
          <div className="space-y-3">
            {past.map(i => <InterventionCard key={String(i._id)} i={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function InterventionCard({ i }: { i: any }) {
  const hasSignature = !!i.signatures?.client?.signature
  const photoCount = ((i.photosAvant || []).length + (i.photosApres || []).length)
  const isCompleted = i.status === 'completed'

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-sky-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-stone-900">{i.title}</h3>
              {i.interventionNumber && (
                <span className="text-xs text-stone-400 font-mono">{i.interventionNumber}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-stone-400 flex-wrap">
              {i.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {fmtDate(i.date)}
                  {i.heureDebut && ` · ${i.heureDebut}`}
                </span>
              )}
              {i.site && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {i.site}</span>}
              {i.service && <span>{i.service}</span>}
              {i.typeIntervention && <span>{interventionTypeLabel[i.typeIntervention] || i.typeIntervention}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <StatusBadge status={i.priority} map={priority} />
          <StatusBadge status={i.status} map={interventionStatus} />
        </div>
      </div>

      {(i.activites || i.observations || i.recommandations?.length > 0) && (
        <div className="border-t border-stone-100 px-4 sm:px-5 py-3 space-y-2">
          {i.activites && (
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-0.5">Activités</p>
              <p className="text-xs text-stone-600 line-clamp-2">{i.activites}</p>
            </div>
          )}
          {i.observations && (
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-0.5">Observations</p>
              <p className="text-xs text-stone-600 line-clamp-2">{i.observations}</p>
            </div>
          )}
        </div>
      )}

      {/* Feedback client */}
      {i.clientFeedback?.rating && (
        <div className="border-t border-stone-100 px-4 sm:px-5 py-2.5 flex items-center gap-2 text-xs">
          <span className="text-amber-500">{'★'.repeat(i.clientFeedback.rating)}{'☆'.repeat(5 - i.clientFeedback.rating)}</span>
          {i.clientFeedback.comment && (
            <span className="text-stone-500 truncate">{i.clientFeedback.comment}</span>
          )}
        </div>
      )}

      {/* Actions client post-intervention */}
      {isCompleted && (
        <div className="border-t border-stone-100 px-4 sm:px-5 py-2.5">
          <InterventionFeedback
            interventionId={String(i._id)}
            existingFeedback={i.clientFeedback}
            hasSignature={hasSignature}
          />
        </div>
      )}

      <div className="border-t border-stone-100 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        <Link href={`/portail-entreprise/interventions/${String(i._id)}`}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group">
          Voir le détail <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
        <div className="flex items-center gap-4 text-xs text-stone-400 flex-wrap">
          {i.isCoveredByContract && (
            <span className="flex items-center gap-1 text-emerald-700">
              <Shield className="w-3 h-3" /> Couvert contrat
            </span>
          )}
          {hasSignature && (
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle className="w-3 h-3" /> Signé
            </span>
          )}
          {photoCount > 0 && (
            <span className="tabular-nums">{photoCount} photo{photoCount > 1 ? 's' : ''}</span>
          )}
          {i.duree && <span className="tabular-nums"><Clock className="w-3 h-3 inline mr-0.5" />{i.duree}min</span>}
        </div>
      </div>
    </div>
  )
}
