export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { connectDB } from '@/lib/db'
import {
  ClipboardList, Calendar, Clock, MapPin, CheckCircle,
  AlertTriangle, ChevronRight, Wrench, Camera, FileText,
  ThumbsUp, Package, Shield
} from 'lucide-react'
import MaintenanceReport from '@/lib/models/MaintenanceReport'

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  maintenance:  { label: 'Maintenance',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  installation: { label: 'Installation',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  repair:       { label: 'Réparation',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  inspection:   { label: 'Inspection',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  emergency:    { label: 'Urgence',       color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}
const SEV_COLOR: Record<string, string> = {
  low:      'bg-gray-100 text-gray-500',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
const SEV_LABEL: Record<string, string> = {
  low: 'Faible', medium: 'Modéré', high: 'Élevé', critical: 'Critique'
}

function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTime(t: string) { return t || '—' }
function fmtDuration(m: number) {
  if (!m) return '—'
  const h = Math.floor(m / 60), min = m % 60
  return h > 0 ? `${h}h${min > 0 ? min.toString().padStart(2, '0') : ''}` : `${min} min`
}

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" /> Rapports d&apos;intervention
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {reports.length} rapport{reports.length > 1 ? 's' : ''} transmis
            {pendingAck > 0 && <span className="ml-2 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-semibold">{pendingAck} à valider</span>}
          </p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
      </div>

      {/* KPIs */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Rapports reçus',    value: reports.length,   color: 'text-gray-900 dark:text-white',   bg: 'bg-white dark:bg-slate-900' },
            { label: 'À valider',          value: pendingAck,        color: pendingAck > 0 ? 'text-orange-600' : 'text-gray-400', bg: pendingAck > 0 ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-white dark:bg-slate-900' },
            { label: 'Anomalies détectées',value: totalIssues,       color: totalIssues > 0 ? 'text-yellow-600' : 'text-gray-400', bg: 'bg-white dark:bg-slate-900' },
            { label: 'Critiques / Hautes', value: criticalIssues,    color: criticalIssues > 0 ? 'text-red-600' : 'text-gray-400', bg: criticalIssues > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-slate-900' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border border-gray-100 dark:border-slate-800 ${k.bg} p-4`}>
              <p className="text-xs text-gray-400 mb-0.5">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liste */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-14 text-center">
          <ClipboardList className="w-10 h-10 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-gray-500">Aucun rapport transmis pour l&apos;instant</p>
          <p className="text-xs text-gray-400 mt-1">Les rapports validés par l&apos;admin apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => {
            const typeCfg = TYPE_CONFIG[r.interventionType] || TYPE_CONFIG.maintenance
            const issues: any[] = r.issuesDetected || []
            const tasks: string[] = r.tasksPerformed || []
            const recs: any[] = r.followUpRecommendations || []
            const materials: any[] = r.materialsUsed || []
            const needsAck = r.clientAcknowledgement?.status === 'pending'

            return (
              <div key={r.reportId}
                className={`rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  needsAck ? 'border-orange-200 dark:border-orange-900/40' : 'border-gray-100 dark:border-slate-800'
                }`}
              >
                {/* Header */}
                <div className={`px-5 py-4 flex items-start justify-between gap-3 ${needsAck ? 'bg-orange-50/50 dark:bg-orange-900/5' : 'bg-gray-50/50 dark:bg-slate-800/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{r.reportId}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeCfg.color}`}>{typeCfg.label}</span>
                        {needsAck && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700">⚠ À valider</span>}
                        {r.clientAcknowledgement?.status === 'acknowledged' && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700">✓ Validé</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(r.interventionDate)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(r.startTime)} – {fmtTime(r.endTime)} · {fmtDuration(r.duration)}</span>
                        {r.site && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.site}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(r.photos?.before?.length > 0 || r.photos?.after?.length > 0) && (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Camera className="w-3 h-3" />{(r.photos.before?.length || 0) + (r.photos.after?.length || 0)}</span>
                    )}
                    {r.billing?.needsQuote && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700">Devis requis</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                  {/* Tâches réalisées */}
                  {tasks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Travaux réalisés
                      </h3>
                      <ul className="space-y-1">
                        {tasks.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Résultats */}
                  {r.results && (
                    <div className="rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 px-4 py-3">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Résultats</p>
                      <p className="text-sm text-green-800 dark:text-green-300">{r.results}</p>
                    </div>
                  )}

                  {/* Anomalies */}
                  {issues.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Anomalies détectées ({issues.length})
                      </h3>
                      <div className="space-y-2">
                        {issues.map((issue: any, i: number) => (
                          <div key={i} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{issue.component}</p>
                                {issue.location && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{issue.location}</p>}
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{issue.description}</p>
                                {issue.recommendedSolution && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">→ {issue.recommendedSolution}</p>
                                )}
                              </div>
                              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEV_COLOR[issue.severity] || SEV_COLOR.medium}`}>
                                {SEV_LABEL[issue.severity] || issue.severity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommandations de suivi */}
                  {recs.filter((r: any) => r.status !== 'completed').length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-violet-500" /> Recommandations de suivi
                      </h3>
                      <div className="space-y-2">
                        {recs.filter((rec: any) => rec.status !== 'completed').map((rec: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/20 px-4 py-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-violet-900 dark:text-violet-200">{rec.title}</p>
                              {rec.description && <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">{rec.description}</p>}
                              {rec.estimatedCost && (
                                <p className="text-xs text-gray-500 mt-0.5">Coût estimé : {rec.estimatedCost.toLocaleString('fr-FR')} FCFA</p>
                              )}
                            </div>
                            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEV_COLOR[rec.priority] || SEV_COLOR.medium}`}>
                              {SEV_LABEL[rec.priority] || rec.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matériaux utilisés */}
                  {materials.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-gray-400" /> Matériaux utilisés
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {materials.map((m: any, i: number) => (
                          <span key={i} className="rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1">
                            {m.name} × {m.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback client déjà fourni */}
                  {r.clientFeedback?.rating && (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/10 px-4 py-2.5">
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-sm ${i < r.clientFeedback.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                      {r.clientFeedback.comment && (
                        <p className="text-xs text-gray-500 italic">&ldquo;{r.clientFeedback.comment}&rdquo;</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action valider */}
                {needsAck && (
                  <div className="px-5 py-3 bg-orange-50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900/30 flex items-center justify-between gap-3">
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      Ce rapport nécessite votre accusé de réception. Contactez IT Vision pour le valider.
                    </p>
                    <Link href="/portail-entreprise/support"
                      className="flex-shrink-0 rounded-xl bg-orange-500 text-white text-xs font-medium px-4 py-2 hover:bg-orange-600 transition-colors">
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
