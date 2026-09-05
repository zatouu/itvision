export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getEnterpriseSession } from '@/lib/enterprise-auth'
import { companyScope } from '@/lib/domain-access'
import { FileText, Shield, Wrench, ChevronRight, Calendar } from 'lucide-react'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import {
  PageHeader,
  BackLink,
  StatusBadge,
  EmptyState,
  ProgressBar,
  contractStatus,
  contractTypeLabel,
  fmtDateLong,
  fmtNum,
  daysLeft,
} from '@/components/portal-ui'

export default async function ContratsPage() {
  const { userId, companyId } = await getEnterpriseSession('/portail-entreprise/contrats')

  const contracts = await MaintenanceContract.find({ ...companyScope({ userId, companyId }) }).sort({ status: 1, endDate: 1 }).lean() as any[]

  const active = contracts.filter(c => c.status === 'active')

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <PageHeader
        icon={FileText}
        eyebrow="Maintenance"
        title="Contrats de maintenance"
        subtitle={`${active.length} contrat${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}`}
      >
        <BackLink />
      </PageHeader>

      {contracts.length === 0 && (
        <EmptyState
          soft
          title="Aucun contrat de maintenance"
          message="Aucun contrat n'est disponible pour votre compte. Contactez IT Vision pour souscrire à une offre adaptée."
        />
      )}

      {contracts.length > 0 && (
        <div className="space-y-4">
          {contracts.map(c => {
            const days = daysLeft(c.endDate)
            const usageRate = c.coverage?.interventionsIncluded > 0
              ? Math.round((c.coverage.interventionsUsed / c.coverage.interventionsIncluded) * 100)
              : 0

            return (
              <Link key={String(c._id)} href={`/portail-entreprise/contrats/${String(c._id)}`}
                className="block rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden hover:border-emerald-300 hover:shadow-sm transition-all group">
                {/* Header contrat */}
                <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-stone-100">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{c.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-stone-400 font-mono">{c.contractNumber}</span>
                        <span className="text-xs text-stone-300">·</span>
                        <span className="text-xs text-stone-500">{contractTypeLabel[c.type] || c.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={c.status} map={contractStatus} fallback="draft" />
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Corps contrat */}
                <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-stone-400">Début</p>
                    <p className="text-sm font-medium text-stone-900 mt-0.5">{fmtDateLong(c.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Fin</p>
                    <p className={`text-sm font-medium mt-0.5 ${days !== null && days <= 30 ? 'text-amber-600' : 'text-stone-900'}`}>
                      {fmtDateLong(c.endDate)}
                      {days !== null && days > 0 && days <= 60 && (
                        <span className="ml-1 text-xs font-semibold text-amber-600">({days}j)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Tarif annuel</p>
                    <p className="text-sm font-semibold text-emerald-800 tabular-nums mt-0.5">{fmtNum(c.annualPrice)} F</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Délai réponse</p>
                    <p className="text-sm font-medium text-stone-900 mt-0.5">{c.coverage?.responseTime || '—'}</p>
                  </div>
                </div>

                {/* Utilisation interventions */}
                <div className="px-4 sm:px-5 pb-5">
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
                    <span>Interventions utilisées</span>
                    <span className="font-semibold text-stone-700 tabular-nums">
                      {c.coverage?.interventionsUsed || 0} / {c.coverage?.interventionsIncluded || 0}
                    </span>
                  </div>
                  <ProgressBar value={usageRate} auto="usage" />
                </div>

                {/* Services inclus */}
                {c.services && c.services.length > 0 && (
                  <div className="px-4 sm:px-5 pb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 mb-2">Services inclus</p>
                    <div className="flex flex-wrap gap-2">
                      {(c.services as any[]).map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 rounded-lg bg-stone-50 border border-stone-100 px-2.5 py-1">
                          <Wrench className="w-3 h-3 text-stone-400" />
                          <span className="text-xs text-stone-600">{s.name}</span>
                          <span className="text-xs text-stone-400">({s.frequency})</span>
                          {s.nextScheduled && (
                            <span className="text-xs text-emerald-700 flex items-center gap-0.5 ml-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {fmtDateLong(s.nextScheduled)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {c.stats && (
                  <div className="border-t border-stone-100 px-4 sm:px-5 py-3 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-stone-900 tabular-nums">{c.stats.totalInterventions}</p>
                      <p className="text-[10px] text-stone-400">Total inter.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-stone-900 tabular-nums">{c.stats.preventiveInterventions}</p>
                      <p className="text-[10px] text-stone-400">Préventives</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-stone-900 tabular-nums">{c.stats.curativeInterventions}</p>
                      <p className="text-[10px] text-stone-400">Curatives</p>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
