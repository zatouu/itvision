'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  FileText, Calendar, AlertTriangle,
  Shield, Wrench, Package, Receipt, Download, Activity, BarChart3,
  Loader2, AlertCircle, TrendingUp
} from 'lucide-react'
import {
  Card,
  EmptyState,
  DetailHeader,
  StatusBadge,
  ProgressBar,
  contractStatus,
  contractTypeLabel,
  contractTypeText,
  interventionStatus,
  interventionPriority,
  fmtDate,
  fmtNum,
  daysLeft,
} from '@/components/portal-ui'

const IS_TILE: Record<string, string> = {
  planned: 'bg-sky-50 text-sky-600',
  pending: 'bg-sky-50 text-sky-600',
  scheduled: 'bg-sky-50 text-sky-600',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-stone-100 text-stone-400',
  draft: 'bg-stone-100 text-stone-400',
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div><p className="text-xs text-stone-400">{label}</p><p className={`text-sm ${bold ? 'font-bold text-emerald-800 tabular-nums' : 'font-medium text-stone-900'}`}>{value}</p></div>
}

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Shield },
  { id: 'coverage', label: 'Couverture', icon: BarChart3 },
  { id: 'equipment', label: 'Équipements', icon: Package },
  { id: 'interventions', label: 'Interventions', icon: Wrench },
  { id: 'documents', label: 'Documents', icon: FileText },
] as const

export default function ContractDetailPage() {
  const { id } = useParams() as { id: string }
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<typeof TABS[number]['id']>('overview')

  useEffect(() => {
    fetch(`/api/client-enterprise/contracts/${id}`)
      .then(r => { if (!r.ok) throw new Error('Introuvable'); return r.json() })
      .then(d => { setContract(d.contract); setLoading(false) })
      .catch(() => { setError('Impossible de charger le contrat.'); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
  if (error) return <div className="p-4 sm:p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!contract) return null

  const cfg = contractStatus[contract.status] || contractStatus.draft
  const tcfgLabel = contractTypeLabel[contract.type] || contractTypeLabel.basic
  const tcfgColor = contractTypeText[contract.type] || contractTypeText.basic
  const days = daysLeft(contract.endDate)
  const coverage = contract.coverage || {}
  const usageRate = coverage.interventionsIncluded > 0 ? Math.round((coverage.interventionsUsed || 0) / coverage.interventionsIncluded * 100) : 0
  const visitUsage = coverage.preventiveVisitsIncluded > 0 ? Math.round((coverage.preventiveVisitsUsed || 0) / coverage.preventiveVisitsIncluded * 100) : 0

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <DetailHeader
        back={{ href: '/portail-entreprise/contrats', label: 'Contrats' }}
        icon={Shield}
        title={contract.name}
        badges={
          <>
            <StatusBadge status={contract.status} map={contractStatus} fallback="draft" icon={false} />
            <span className={`text-xs font-semibold ${tcfgColor}`}>{tcfgLabel}</span>
          </>
        }
        meta={<>Contrat n° <span className="font-mono">{contract.contractNumber}</span></>}
      />

      {days !== null && days <= 60 && days > 0 && contract.status === 'active' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Expiration proche</p>
            <p className="text-xs text-amber-700 mt-0.5">Ce contrat expire dans {days} jour{days > 1 ? 's' : ''} ({fmtDate(contract.endDate)}). Contactez-nous pour le renouveler.</p>
          </div>
        </div>
      )}
      {contract.status === 'expired' && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Contrat expiré</p>
            <p className="text-xs text-red-700 mt-0.5">Ce contrat est arrivé à échéance le {fmtDate(contract.endDate)}. Contactez-nous pour un renouvellement.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {TABS.map(t => {
          const I = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}>
              <I className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Informations" icon={Shield}>
            <Row label="Type" value={tcfgLabel} />
            <Row label="Statut" value={cfg.label} />
            <Row label="Date début" value={fmtDate(contract.startDate)} />
            <Row label="Date fin" value={fmtDate(contract.endDate)} />
            <Row label="Coût annuel" value={`${fmtNum(contract.annualPrice)} FCFA`} bold />
            {contract.description && <Row label="Description" value={contract.description} />}
          </Card>
          <Card title="Statistiques d'utilisation" icon={Activity}>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-stone-500">Interventions utilisées</span>
                  <span className="font-semibold text-stone-700 tabular-nums">{coverage.interventionsUsed || 0} / {coverage.interventionsIncluded || 0}</span>
                </div>
                <ProgressBar value={usageRate} tone="bg-emerald-600" />
                <p className="text-[11px] text-stone-400 mt-1 tabular-nums">{usageRate}% utilisé</p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-stone-500">Visites préventives</span>
                  <span className="font-semibold text-stone-700 tabular-nums">{coverage.preventiveVisitsUsed || 0} / {coverage.preventiveVisitsIncluded || 0}</span>
                </div>
                <ProgressBar value={visitUsage} tone="bg-emerald-600" />
                <p className="text-[11px] text-stone-400 mt-1 tabular-nums">{visitUsage}% utilisé</p>
              </div>
            </div>
          </Card>
          <Card title="Historique récent" icon={Calendar}>
            {(contract.history || []).length === 0 ? <p className="text-xs text-stone-400">Aucun événement</p> : (
              <div className="space-y-2">
                {(contract.history || []).slice(0, 5).map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-stone-300 mt-0.5">·</span>
                    <div className="flex-1">
                      <p className="text-stone-700 font-medium">{h.action}</p>
                      <p className="text-stone-400">{fmtDate(h.date)} {h.note && `· ${h.note}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'coverage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Interventions incluses" icon={Wrench}>
            <Row label="Interventions incluses" value={`${coverage.interventionsIncluded || 0}`} />
            <Row label="Interventions utilisées" value={`${coverage.interventionsUsed || 0}`} />
            <Row label="Restantes" value={`${Math.max(0, (coverage.interventionsIncluded || 0) - (coverage.interventionsUsed || 0))}`} bold />
          </Card>
          <Card title="Visites préventives" icon={Calendar}>
            <Row label="Visites incluses" value={`${coverage.preventiveVisitsIncluded || 0}`} />
            <Row label="Visites effectuées" value={`${coverage.preventiveVisitsUsed || 0}`} />
            <Row label="Restantes" value={`${Math.max(0, (coverage.preventiveVisitsIncluded || 0) - (coverage.preventiveVisitsUsed || 0))}`} bold />
          </Card>
          <Card title="Garantie" icon={Shield}>
            <Row label="Garantie matériel" value={coverage.warrantyDurationMonths ? `${coverage.warrantyDurationMonths} mois` : '—'} />
            <Row label="Réponse SLA" value={coverage.responseTimeHours ? `${coverage.responseTimeHours}h` : '—'} />
            <Row label="Heures de service" value={coverage.serviceHours || '—'} />
            <Row label="Jours couverts" value={coverage.coverageDays || '—'} />
          </Card>
          {contract.stats && (
            <Card title="Chiffres clés" icon={TrendingUp}>
              <Row label="Interventions totales" value={`${contract.stats.totalInterventions || 0}`} />
              <Row label="Coût total réalisé" value={`${fmtNum(contract.stats.totalCost || 0)} FCFA`} />
              <Row label="Dernière intervention" value={fmtDate(contract.stats.lastInterventionDate)} />
              <Row label="Prochaine visite préventive" value={fmtDate(contract.stats.nextPreventiveDate)} />
            </Card>
          )}
        </div>
      )}

      {tab === 'equipment' && (
        <div>
          {(contract.equipment || []).length === 0 ? (
            <EmptyState icon={Package} title="Aucun équipement couvert par ce contrat" className="px-0 sm:px-0 py-16 sm:py-16" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(contract.equipment || []).map((eq: any, i: number) => (
                <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Package className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{eq.name}</p>
                      <p className="text-xs text-stone-500">{eq.model || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                    {eq.serialNumber && <p className="text-[11px] text-stone-500"><span className="text-stone-400">S/N :</span> {eq.serialNumber}</p>}
                    {eq.serialNumbers?.length > 0 && <p className="text-[11px] text-stone-500"><span className="text-stone-400">S/N :</span> {eq.serialNumbers.join(', ')}</p>}
                    {eq.quantity > 1 && <p className="text-[11px] text-stone-500"><span className="text-stone-400">Qté :</span> {eq.quantity}</p>}
                    {eq.location && <p className="text-[11px] text-stone-500"><span className="text-stone-400">Emplacement :</span> {eq.location}</p>}
                    {eq.installationDate && <p className="text-[11px] text-stone-500"><span className="text-stone-400">Installé le :</span> {fmtDate(eq.installationDate)}</p>}
                    {eq.warrantyEndDate && <p className="text-[11px] text-stone-500"><span className="text-stone-400">Garantie jusqu'au :</span> {fmtDate(eq.warrantyEndDate)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'interventions' && (
        <div>
          {(contract.interventions || []).length === 0 ? (
            <EmptyState icon={Wrench} title="Aucune intervention pour ce contrat" className="px-0 sm:px-0 py-16 sm:py-16" />
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              {(contract.interventions || []).map((iv: any) => {
                const tile = IS_TILE[iv.status] || IS_TILE.planned
                return (
                  <li key={iv._id} className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${tile}`}>
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-stone-900">{iv.title}</p>
                        <StatusBadge status={iv.status} map={interventionStatus} fallback="planned" icon={false} />
                        <StatusBadge status={iv.priority} map={interventionPriority} fallback="medium" icon={false} />
                      </div>
                      <p className="text-xs text-stone-500 mt-1">{iv.interventionNumber} · {iv.typeIntervention || 'Intervention'}{iv.site && ` · ${iv.site}`}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400">
                        {iv.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(iv.date)}</span>}
                        {iv.cost > 0 && <span className="flex items-center gap-1 tabular-nums"><Receipt className="w-3 h-3" />{fmtNum(iv.cost)} F</span>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div>
          {(contract.documents || []).length === 0 ? (
            <EmptyState icon={FileText} title="Aucun document disponible" className="px-0 sm:px-0 py-16 sm:py-16" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(contract.documents || []).map((doc: any, i: number) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-start gap-3 hover:border-emerald-300 hover:shadow-sm transition-all group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-stone-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{doc.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{doc.type || 'Document'} · {fmtDate(doc.uploadedAt)}</p>
                  </div>
                  <Download className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 transition-colors flex-shrink-0 mt-2" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
