export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import {
  ClipboardList, Calendar, Clock, MapPin, CheckCircle,
  AlertTriangle, ChevronRight, Wrench, Camera,
  ThumbsUp, Package, Shield
} from 'lucide-react'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import {
  BackLink, EmptyState, KpiStrip, PageHeader, Pill, StatusBadge, TONE,
  fmtDateLong, fmtDuration, fmtTime, reportType, severity,
} from '@/components/portal-ui'

export default async function RapportsPage() {
  const { companyId } = await getEnterpriseSession('/portail-entreprise/rapports')

  const reports = await MaintenanceReport.find({
    clientId: companyId,
    publishedToClient: true
  })
    .sort({ interventionDate: -1 })
    .select('reportId interventionDate startTime endTime duration site interventionType status priority tasksPerformed results issuesDetected followUpRecommendations materialsUsed photos publishedAt clientFeedback clientAcknowledgement billing')
    .lean() as any[]

  const pendingAck = reports.filter(r => r.clientAcknowledgement?.status === 'pending').length
  const totalIssues = reports.reduce((s, r) => s + (r.issuesDetected?.length || 0), 0)
  const criticalIssues = reports.reduce((s, r) => s + (r.issuesDetected?.filter((i: any) => i.severity === 'critical' || i.severity === 'high').length || 0), 0)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <PageHeader
        icon={ClipboardList}
        eyebrow="Maintenance"
        title="Rapports d'intervention"
        subtitle={
          <>
            {reports.length} rapport{reports.length > 1 ? 's' : ''} transmis
            {pendingAck > 0 && (
              <Pill color={TONE.amber} className="ml-2">
                {pendingAck} à valider
              </Pill>
            )}
          </>
        }
      >
        <BackLink />
      </PageHeader>

      {/* KPIs */}
      {reports.length > 0 && (
        <KpiStrip cols={4} items={[
          { label: 'Rapports reçus',      value: reports.length,  valueClassName: 'text-stone-900' },
          { label: 'À valider',           value: pendingAck,      valueClassName: pendingAck > 0 ? 'text-amber-600' : 'text-stone-400' },
          { label: 'Anomalies détectées', value: totalIssues,     valueClassName: totalIssues > 0 ? 'text-orange-600' : 'text-stone-400' },
          { label: 'Critiques / Hautes',  value: criticalIssues,  valueClassName: criticalIssues > 0 ? 'text-red-600' : 'text-stone-400' },
        ]} />
      )}

      {/* Liste */}
      {reports.length === 0 ? (
        <EmptyState
          soft
          title="Aucun rapport transmis"
          message="Les rapports validés par l'équipe IT Vision apparaîtront ici dès leur publication."
        />
      ) : (
        <div className="space-y-4">
          {reports.map(r => {
            const issues: any[] = r.issuesDetected || []
            const tasks: string[] = r.tasksPerformed || []
            const recs: any[] = r.followUpRecommendations || []
            const materials: any[] = r.materialsUsed || []
            const needsAck = r.clientAcknowledgement?.status === 'pending'

            return (
              <div key={r.reportId}
                className={`rounded-2xl border bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all ${
                  needsAck ? 'border-amber-200' : 'border-stone-200'
                }`}
              >
                {/* Header */}
                <div className={`px-4 sm:px-5 py-4 flex items-start justify-between gap-3 ${needsAck ? 'bg-amber-50/50' : 'bg-stone-50/60'}`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-stone-900 font-mono">{r.reportId}</p>
                        <StatusBadge status={r.interventionType} map={reportType} fallback="maintenance" />
                        {needsAck && <Pill color={TONE.amber}>À valider</Pill>}
                        {r.clientAcknowledgement?.status === 'acknowledged' && <Pill color={TONE.emerald}>Validé</Pill>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-500 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDateLong(r.interventionDate)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(r.startTime)} – {fmtTime(r.endTime)} · {fmtDuration(r.duration)}</span>
                        {r.site && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.site}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(r.photos?.before?.length > 0 || r.photos?.after?.length > 0) && (
                      <span className="flex items-center gap-1 text-xs text-stone-400 tabular-nums"><Camera className="w-3 h-3" />{(r.photos.before?.length || 0) + (r.photos.after?.length || 0)}</span>
                    )}
                    {r.billing?.needsQuote && (
                      <Pill color={TONE.sky}>Devis requis</Pill>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 sm:px-5 py-4 space-y-4">
                  {/* Tâches réalisées */}
                  {tasks.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Travaux réalisés
                      </h3>
                      <ul className="space-y-1">
                        {tasks.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Résultats */}
                  {r.results && (
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 px-4 py-3">
                      <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Résultats</p>
                      <p className="text-sm text-emerald-900">{r.results}</p>
                    </div>
                  )}

                  {/* Anomalies */}
                  {issues.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Anomalies détectées ({issues.length})
                      </h3>
                      <div className="space-y-2">
                        {issues.map((issue: any, i: number) => (
                          <div key={i} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-stone-900">{issue.component}</p>
                                {issue.location && <p className="text-xs text-stone-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{issue.location}</p>}
                                <p className="text-sm text-stone-600 mt-1">{issue.description}</p>
                                {issue.recommendedSolution && (
                                  <p className="text-xs text-sky-700 mt-1">→ {issue.recommendedSolution}</p>
                                )}
                              </div>
                              <StatusBadge status={issue.severity} map={severity} fallback="medium" className="flex-shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommandations de suivi */}
                  {recs.filter((r: any) => r.status !== 'completed').length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-sky-600" /> Recommandations de suivi
                      </h3>
                      <div className="space-y-2">
                        {recs.filter((rec: any) => rec.status !== 'completed').map((rec: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-sky-50/60 border border-sky-100 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-sky-900">{rec.title}</p>
                              {rec.description && <p className="text-xs text-sky-700 mt-0.5">{rec.description}</p>}
                              {rec.estimatedCost && (
                                <p className="text-xs text-stone-500 mt-0.5 tabular-nums">Coût estimé : {rec.estimatedCost.toLocaleString('fr-FR')} FCFA</p>
                              )}
                            </div>
                            <StatusBadge status={rec.priority} map={severity} fallback="medium" className="flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matériaux utilisés */}
                  {materials.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-stone-400" /> Matériaux utilisés
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {materials.map((m: any, i: number) => (
                          <span key={i} className="rounded-full bg-stone-100 text-stone-600 text-xs px-3 py-1">
                            {m.name} × {m.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback client déjà fourni */}
                  {r.clientFeedback?.rating && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50/60 border border-emerald-100 px-4 py-2.5">
                      <ThumbsUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-sm ${i < r.clientFeedback.rating ? 'text-amber-400' : 'text-stone-200'}`}>★</span>
                        ))}
                      </div>
                      {r.clientFeedback.comment && (
                        <p className="text-xs text-stone-500 italic truncate">&ldquo;{r.clientFeedback.comment}&rdquo;</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action valider */}
                {needsAck && (
                  <div className="px-4 sm:px-5 py-3 bg-amber-50/60 border-t border-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-amber-800">
                      Ce rapport nécessite votre accusé de réception. Contactez IT Vision pour le valider.
                    </p>
                    <Link href="/portail-entreprise/support"
                      className="flex-shrink-0 inline-flex items-center justify-center rounded-full bg-emerald-800 text-white text-xs font-semibold px-4 py-2 hover:bg-emerald-900 transition-colors">
                      Contacter
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
