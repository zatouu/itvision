'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  FileText, Calendar, AlertTriangle,
  Shield, Wrench, Package, Receipt, Download, Activity, BarChart3,
  Loader2, AlertCircle, TrendingUp, RefreshCw, Timer, CheckCircle2
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
  const [renewalState, setRenewalState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const requestRenewal = async () => {
    if (!contract || renewalState === 'sending' || renewalState === 'sent') return
    setRenewalState('sending')
    try {
      const res = await fetch('/api/client-enterprise/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Demande de renouvellement — Contrat ${contract.contractNumber}`,
          category: 'request',
          priority: 'medium',
          description: `Le client souhaite renouveler le contrat « ${contract.name} » (n° ${contract.contractNumber}), arrivant à échéance le ${fmtDate(contract.endDate)}.`,
        }),
      })
      if (!res.ok) throw new Error()
      setRenewalState('sent')
    } catch {
      setRenewalState('error')
    }
  }

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

      {(days !== null && days <= 60 && days > 0 && contract.status === 'active' || contract.status === 'expired') && (() => {
        const expired = contract.status === 'expired'
        return (
          <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${expired ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${expired ? 'text-red-600' : 'text-amber-600'}`} />
              <div>
                <p className={`text-sm font-semibold ${expired ? 'text-red-900' : 'text-amber-900'}`}>
                  {expired ? 'Contrat expiré' : 'Expiration proche'}
                </p>
                <p className={`text-xs mt-0.5 ${expired ? 'text-red-700' : 'text-amber-700'}`}>
                  {expired
                    ? `Ce contrat est arrivé à échéance le ${fmtDate(contract.endDate)}.`
                    : `Ce contrat expire dans ${days} jour${days! > 1 ? 's' : ''} (${fmtDate(contract.endDate)}).`}
                  {contract.autoRenewal ? ' Le renouvellement automatique est activé.' : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestRenewal}
              disabled={renewalState === 'sending' || renewalState === 'sent'}
              className={`inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full px-4 py-2 text-xs font-semibold transition-colors flex-shrink-0 ${
                renewalState === 'sent'
                  ? 'bg-emerald-100 text-emerald-800'
                  : expired
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
              } disabled:opacity-70`}
            >
              {renewalState === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {renewalState === 'sent' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {renewalState !== 'sending' && renewalState !== 'sent' && <RefreshCw className="w-3.5 h-3.5" />}
              {renewalState === 'sent' ? 'Demande envoyée' : renewalState === 'error' ? 'Réessayer' : 'Demander le renouvellement'}
            </button>
          </div>
        )
      })()}
      {renewalState === 'sent' && (
        <p className="text-xs text-emerald-700 -mt-2">Votre demande a été transmise à IT Vision — un ticket est visible dans <a href="/portail-entreprise/support" className="underline font-medium">Support</a>.</p>
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
            <Row label="Renouvellement" value={contract.autoRenewal ? 'Automatique' : 'Manuel'} />
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
            <Row label="Réponse SLA" value={coverage.responseTimeHours ? `${coverage.responseTimeHours}h` : (coverage.responseTime || '—')} />
            <Row label="Heures de service" value={coverage.serviceHours || coverage.supportHours || '—'} />
            <Row label="Jours couverts" value={coverage.coverageDays || '—'} />
          </Card>
          {(() => {
            const slaTarget = coverage.responseTimeHours ?? (typeof coverage.responseTime === 'string' ? parseFloat(coverage.responseTime) : null)
            const slaActual = contract.stats?.averageResponseTime ?? null
            if (!slaTarget) return null
            const ratio = slaActual !== null ? Math.min(Math.round((slaActual / slaTarget) * 100), 200) : null
            const respected = slaActual !== null && slaActual <= slaTarget
            return (
              <Card title="Engagement de service (SLA)" icon={Timer}>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Temps de réponse contractuel</span>
                    <span className="font-semibold text-stone-700 tabular-nums">{slaTarget}h</span>
                  </div>
                  {slaActual !== null ? (
                    <>
                      <ProgressBar value={Math.min(ratio!, 100)} tone={respected ? 'bg-emerald-600' : 'bg-red-500'} />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-stone-400">Moyenne constatée : <span className="font-semibold text-stone-700 tabular-nums">{slaActual}h</span></span>
                        <StatusBadge status={respected ? 'active' : 'overdue'} map={{ active: { label: 'SLA respecté', color: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' }, overdue: { label: 'SLA dépassé', color: 'bg-red-50 text-red-700 ring-red-600/20' } }} icon={false} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-stone-400">Pas encore de données de réponse mesurées sur ce contrat.</p>
                  )}
                </div>
              </Card>
            )
          })()}
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
