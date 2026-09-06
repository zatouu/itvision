'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, ChevronLeft, Calendar, CheckCircle, Clock, AlertTriangle,
  Shield, Wrench, Package, Receipt, Download, Activity, BarChart3,
  Loader2, AlertCircle, Users, MapPin, TrendingUp
} from 'lucide-react'

const ST: Record<string, { l: string; c: string; b: string }> = {
  active: { l: 'Actif', c: 'text-green-700', b: 'bg-green-100' },
  draft: { l: 'Brouillon', c: 'text-gray-600', b: 'bg-gray-100' },
  suspended: { l: 'Suspendu', c: 'text-yellow-700', b: 'bg-yellow-100' },
  expired: { l: 'Expiré', c: 'text-red-700', b: 'bg-red-100' },
  cancelled: { l: 'Annulé', c: 'text-gray-500', b: 'bg-gray-100' },
}
const IT: Record<string, { l: string; c: string }> = {
  preventive: { l: 'Préventif', c: 'text-blue-600' },
  curative: { l: 'Curatif', c: 'text-orange-600' },
  full: { l: 'Complet', c: 'text-violet-600' },
  basic: { l: 'Basique', c: 'text-gray-600' },
}
const IP: Record<string, { l: string; c: string; b: string }> = {
  low: { l: 'Faible', c: 'text-gray-600', b: 'bg-gray-100' },
  medium: { l: 'Normale', c: 'text-yellow-700', b: 'bg-yellow-100' },
  high: { l: 'Haute', c: 'text-orange-700', b: 'bg-orange-100' },
  urgent: { l: 'Urgente', c: 'text-red-700', b: 'bg-red-100' },
  critical: { l: 'Critique', c: 'text-red-800', b: 'bg-red-200' },
}
const IS: Record<string, { l: string; c: string; b: string }> = {
  planned: { l: 'Planifiée', c: 'text-blue-700', b: 'bg-blue-100' },
  in_progress: { l: 'En cours', c: 'text-amber-700', b: 'bg-amber-100' },
  completed: { l: 'Terminée', c: 'text-green-700', b: 'bg-green-100' },
  cancelled: { l: 'Annulée', c: 'text-gray-600', b: 'bg-gray-100' },
}

function fd(d: any) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fv(v: number) { return Math.round(v || 0).toLocaleString('fr-FR') }
function dl(d: any) { if (!d) return null; return Math.floor((new Date(d).getTime() - Date.now()) / 86400000) }

function Empty({ icon: I, msg }: { icon: any; msg: string }) {
  return <div className="flex flex-col items-center py-16 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"><I className="w-10 h-10 text-gray-300 mb-3" /><p className="text-sm text-gray-500">{msg}</p></div>
}
function Card({ title, icon: I, children }: { title: string; icon: any; children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><I className="w-3 h-3" /> {title}</p><div className="space-y-3">{children}</div></div>
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div><p className="text-xs text-gray-400">{label}</p><p className={`text-sm ${bold ? 'font-bold text-violet-600' : 'font-medium text-gray-900 dark:text-white'}`}>{value}</p></div>
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
  const router = useRouter()
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

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error) return <div className="p-6"><div className="rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!contract) return null

  const cfg = ST[contract.status] || ST.draft
  const tcfg = IT[contract.type] || IT.basic
  const days = dl(contract.endDate)
  const coverage = contract.coverage || {}
  const usageRate = coverage.interventionsIncluded > 0 ? Math.round((coverage.interventionsUsed || 0) / coverage.interventionsIncluded * 100) : 0
  const visitUsage = coverage.preventiveVisitsIncluded > 0 ? Math.round((coverage.preventiveVisitsUsed || 0) / coverage.preventiveVisitsIncluded * 100) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/portail-entreprise/contrats')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{contract.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cfg.b} ${cfg.c}`}>{cfg.l}</span>
            <span className={`text-xs font-semibold ${tcfg.c}`}>{tcfg.l}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Contrat n° {contract.contractNumber}</p>
        </div>
      </div>

      {days !== null && days <= 60 && days > 0 && contract.status === 'active' && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Expiration proche</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Ce contrat expire dans {days} jour{days > 1 ? 's' : ''} ({fd(contract.endDate)}). Contactez-nous pour le renouveler.</p>
          </div>
        </div>
      )}
      {contract.status === 'expired' && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Contrat expiré</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Ce contrat est arrivé à échéance le {fd(contract.endDate)}. Contactez-nous pour un renouvellement.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800 overflow-x-auto">
        {TABS.map(t => {
          const I = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                active ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <I className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Informations" icon={Shield}>
            <Row label="Type" value={tcfg.l} />
            <Row label="Statut" value={cfg.l} />
            <Row label="Date début" value={fd(contract.startDate)} />
            <Row label="Date fin" value={fd(contract.endDate)} />
            <Row label="Coût annuel" value={`${fv(contract.annualPrice)} FCFA`} bold />
            {contract.description && <Row label="Description" value={contract.description} />}
          </Card>
          <Card title="Statistiques d'utilisation" icon={Activity}>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Interventions utilisées</span>
                  <span className="font-bold text-gray-700">{coverage.interventionsUsed || 0} / {coverage.interventionsIncluded || 0}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-violet-500 rounded-full" style={{ width: `${Math.min(usageRate, 100)}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{usageRate}% utilisé</p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Visites préventives</span>
                  <span className="font-bold text-gray-700">{coverage.preventiveVisitsUsed || 0} / {coverage.preventiveVisitsIncluded || 0}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full" style={{ width: `${Math.min(visitUsage, 100)}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{visitUsage}% utilisé</p>
              </div>
            </div>
          </Card>
          <Card title="Historique récent" icon={Calendar}>
            {(contract.history || []).length === 0 ? <p className="text-xs text-gray-400">Aucun événement</p> : (
              <div className="space-y-2">
                {(contract.history || []).slice(0, 5).map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-300 mt-0.5">·</span>
                    <div className="flex-1">
                      <p className="text-gray-700 dark:text-gray-300 font-medium">{h.action}</p>
                      <p className="text-gray-400">{fd(h.date)} {h.note && `· ${h.note}`}</p>
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
              <Row label="Coût total réalisé" value={`${fv(contract.stats.totalCost || 0)} FCFA`} />
              <Row label="Dernière intervention" value={fd(contract.stats.lastInterventionDate)} />
              <Row label="Prochaine visite préventive" value={fd(contract.stats.nextPreventiveDate)} />
            </Card>
          )}
        </div>
      )}

      {tab === 'equipment' && (
        <div>
          {(contract.equipment || []).length === 0 ? (
            <Empty icon={Package} msg="Aucun équipement couvert par ce contrat" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(contract.equipment || []).map((eq: any, i: number) => (
                <div key={i} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{eq.name}</p>
                      <p className="text-xs text-gray-500">{eq.model || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-slate-800 space-y-1.5">
                    {eq.serialNumber && <p className="text-[11px] text-gray-500"><span className="text-gray-400">S/N :</span> {eq.serialNumber}</p>}
                    {eq.serialNumbers?.length > 0 && <p className="text-[11px] text-gray-500"><span className="text-gray-400">S/N :</span> {eq.serialNumbers.join(', ')}</p>}
                    {eq.quantity > 1 && <p className="text-[11px] text-gray-500"><span className="text-gray-400">Qté :</span> {eq.quantity}</p>}
                    {eq.location && <p className="text-[11px] text-gray-500"><span className="text-gray-400">Emplacement :</span> {eq.location}</p>}
                    {eq.installationDate && <p className="text-[11px] text-gray-500"><span className="text-gray-400">Installé le :</span> {fd(eq.installationDate)}</p>}
                    {eq.warrantyEndDate && <p className="text-[11px] text-gray-500"><span className="text-gray-400">Garantie jusqu'au :</span> {fd(eq.warrantyEndDate)}</p>}
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
            <Empty icon={Wrench} msg="Aucune intervention pour ce contrat" />
          ) : (
            <div className="space-y-3">
              {(contract.interventions || []).map((iv: any) => {
                const pc = IP[iv.priority] || IP.medium
                const sc = IS[iv.status] || IS.planned
                return (
                  <div key={iv._id} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${sc.b}`}>
                      <Wrench className={`w-4 h-4 ${sc.c}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{iv.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.b} ${sc.c}`}>{sc.l}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pc.b} ${pc.c}`}>{pc.l}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{iv.interventionNumber} · {iv.typeIntervention || 'Intervention'}{iv.site && ` · ${iv.site}`}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        {iv.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fd(iv.date)}</span>}
                        {iv.cost > 0 && <span className="flex items-center gap-1"><Receipt className="w-3 h-3" />{fv(iv.cost)} FCFA</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div>
          {(contract.documents || []).length === 0 ? (
            <Empty icon={FileText} msg="Aucun document disponible" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(contract.documents || []).map((doc: any, i: number) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{doc.type || 'Document'} · {fd(doc.uploadedAt)}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors flex-shrink-0 mt-2" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
