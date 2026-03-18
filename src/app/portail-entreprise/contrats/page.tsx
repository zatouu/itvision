import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Link from 'next/link'
import { FileText, CheckCircle, AlertTriangle, Clock, Shield, Wrench, ChevronRight, Calendar } from 'lucide-react'
import MaintenanceContract from '@/lib/models/MaintenanceContract'

const TYPE_LABELS: Record<string, string> = {
  preventive: 'Préventif', curative: 'Curatif', full: 'Complet', basic: 'Basique'
}
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active:    { label: 'Actif',    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  draft:     { label: 'Brouillon', color: 'bg-gray-100 text-gray-500', icon: Clock },
  suspended: { label: 'Suspendu', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  expired:   { label: 'Expiré',  color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-400', icon: AlertTriangle },
}

function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmt(v: number) { return Math.round(v).toLocaleString('fr-FR') }
function daysLeft(d: any) {
  if (!d) return null
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000)
}

export default async function ContratsPage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user) redirect('/login?redirect=/portail-entreprise/contrats')
  if (auth.user.role !== 'CLIENT' || !auth.user.companyClientId) redirect('/compte')

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const contracts = await MaintenanceContract.find({ clientId: userId }).sort({ status: 1, endDate: 1 }).lean() as any[]

  const active = contracts.filter(c => c.status === 'active')
  const other = contracts.filter(c => c.status !== 'active')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" /> Contrats de maintenance
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{active.length} contrat{active.length > 1 ? 's' : ''} actif{active.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          ← Tableau de bord
        </Link>
      </div>

      {contracts.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun contrat de maintenance</p>
          <p className="text-sm text-gray-400 mt-1">Contactez-nous pour souscrire à un contrat</p>
        </div>
      )}

      {contracts.length > 0 && (
        <div className="space-y-4">
          {contracts.map(c => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft
            const StatusIcon = cfg.icon
            const days = daysLeft(c.endDate)
            const usageRate = c.coverage?.interventionsIncluded > 0
              ? Math.round((c.coverage.interventionsUsed / c.coverage.interventionsIncluded) * 100)
              : 0

            return (
              <div key={String(c._id)}
                className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                {/* Header contrat */}
                <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-50 dark:border-slate-800">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">{c.contractNumber}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{TYPE_LABELS[c.type] || c.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Corps contrat */}
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Début</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{fmtDate(c.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Fin</p>
                    <p className={`text-sm font-medium mt-0.5 ${days !== null && days <= 30 ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                      {fmtDate(c.endDate)}
                      {days !== null && days > 0 && days <= 60 && (
                        <span className="ml-1 text-xs text-orange-500">({days}j)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Tarif annuel</p>
                    <p className="text-sm font-semibold text-violet-600 mt-0.5">{fmt(c.annualPrice)} FCFA</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Délai réponse</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{c.coverage?.responseTime || '—'}</p>
                  </div>
                </div>

                {/* Utilisation interventions */}
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Interventions utilisées</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {c.coverage?.interventionsUsed || 0} / {c.coverage?.interventionsIncluded || 0}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usageRate >= 90 ? 'bg-red-500' : usageRate >= 70 ? 'bg-orange-400' : 'bg-gradient-to-r from-green-500 to-violet-500'}`}
                      style={{ width: `${Math.min(usageRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Services inclus */}
                {c.services && c.services.length > 0 && (
                  <div className="px-5 pb-5">
                    <p className="text-xs font-medium text-gray-500 mb-2">Services inclus</p>
                    <div className="flex flex-wrap gap-2">
                      {(c.services as any[]).map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 px-2.5 py-1">
                          <Wrench className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600 dark:text-gray-300">{s.name}</span>
                          <span className="text-xs text-gray-400">({s.frequency})</span>
                          {s.nextScheduled && (
                            <span className="text-xs text-green-600 flex items-center gap-0.5 ml-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {fmtDate(s.nextScheduled)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {c.stats && (
                  <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-3 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{c.stats.totalInterventions}</p>
                      <p className="text-[10px] text-gray-400">Total inter.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{c.stats.preventiveInterventions}</p>
                      <p className="text-[10px] text-gray-400">Préventives</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{c.stats.curativeInterventions}</p>
                      <p className="text-[10px] text-gray-400">Curatives</p>
                    </div>
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
