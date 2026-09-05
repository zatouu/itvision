'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Clock, MapPin, Wrench,
  CheckCircle, Loader2, AlertCircle, FileText, Download, Star,
  Activity, Package, ListChecks, Receipt, MessageSquare
} from 'lucide-react'
import {
  Card,
  EmptyState,
  DetailHeader,
  StatusBadge,
  interventionStatus,
  interventionPriority,
  interventionTypeLabel,
  fmtDate,
  fmtTime,
  fmtNum,
} from '@/components/portal-ui'

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div><p className="text-xs text-stone-400">{label}</p><p className={`text-sm ${bold ? 'font-bold text-emerald-800 tabular-nums' : 'font-medium text-stone-900'}`}>{value}</p></div>
}

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
  { id: 'tasks', label: 'Tâches', icon: ListChecks },
  { id: 'materials', label: 'Matériaux', icon: Package },
  { id: 'documents', label: 'Documents', icon: FileText },
] as const

export default function InterventionDetailPage() {
  const { id } = useParams() as { id: string }
  const [iv, setIv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<typeof TABS[number]['id']>('overview')

  useEffect(() => {
    fetch(`/api/client-enterprise/interventions/${id}`)
      .then(r => { if (!r.ok) throw new Error('Introuvable'); return r.json() })
      .then(d => { setIv(d.intervention); setLoading(false) })
      .catch(() => { setError('Impossible de charger l\'intervention.'); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
  if (error) return <div className="p-4 sm:p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!iv) return null

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <DetailHeader
        back={{ href: '/portail-entreprise/interventions', label: 'Interventions' }}
        icon={Wrench}
        iconClassName="bg-sky-50 text-sky-700"
        title={iv.title}
        badges={
          <>
            <StatusBadge status={iv.status} map={interventionStatus} fallback="planned" icon={false} />
            <StatusBadge status={iv.priority} map={interventionPriority} fallback="medium" icon={false} />
          </>
        }
        meta={<><span className="font-mono">{iv.interventionNumber || '—'}</span> · {interventionTypeLabel[iv.typeIntervention] || iv.typeIntervention}</>}
      />

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
          <Card title="Informations" icon={Activity}>
            <Row label="Type" value={interventionTypeLabel[iv.typeIntervention] || iv.typeIntervention || '—'} />
            <Row label="Statut" value={interventionStatus[iv.status]?.label || interventionStatus.planned.label} />
            <Row label="Priorité" value={interventionPriority[iv.priority]?.label || interventionPriority.medium.label} />
            <Row label="Date" value={fmtDate(iv.date)} />
            {iv.startTime && <Row label="Heure début" value={fmtTime(iv.startTime)} />}
            {iv.endTime && <Row label="Heure fin" value={fmtTime(iv.endTime)} />}
            {iv.estimatedDuration && <Row label="Durée estimée" value={`${iv.estimatedDuration} min`} />}
          </Card>
          <Card title="Site & Contact" icon={MapPin}>
            <Row label="Site" value={iv.site || '—'} />
            <Row label="Adresse" value={iv.address || '—'} />
            <Row label="Contact" value={iv.contactName || '—'} />
            <Row label="Téléphone" value={iv.contactPhone || '—'} />
          </Card>
          <Card title="Problème & Solution" icon={MessageSquare}>
            <Row label="Description du problème" value={iv.problemDescription || '—'} />
            <Row label="Diagnostic" value={iv.diagnosis || '—'} />
            <Row label="Solution appliquée" value={iv.solution || '—'} />
            <Row label="Notes" value={iv.notes || '—'} />
          </Card>
          {iv.cost > 0 && (
            <Card title="Coût" icon={Receipt}>
              <Row label="Coût total" value={`${fmtNum(iv.cost)} FCFA`} bold />
              <Row label="Couverte par contrat" value={iv.isCoveredByContract ? 'Oui' : 'Non'} />
            </Card>
          )}
          {iv.feedback && (
            <Card title="Votre avis" icon={Star}>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < (iv.feedback.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`} />
                ))}
                <span className="text-xs text-stone-500 ml-1 tabular-nums">{iv.feedback.rating}/5</span>
              </div>
              {iv.feedback.comment && <p className="text-xs text-stone-600 mt-2">{iv.feedback.comment}</p>}
              <p className="text-[11px] text-stone-400 mt-1">{fmtDate(iv.feedback.submittedAt)}</p>
            </Card>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          {(iv.tasks || []).length === 0 ? <EmptyState icon={ListChecks} title="Aucune tâche enregistrée" className="px-0 sm:px-0 py-16 sm:py-16" /> : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              {(iv.tasks || []).map((t: any, i: number) => (
                <li key={i} className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-50 text-stone-400'}`}>
                    {t.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900">{t.description}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{t.status === 'completed' ? 'Terminée' : 'En attente'}{t.duration && ` · ${t.duration} min`}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'materials' && (
        <div>
          {(iv.materialsUsed || []).length === 0 ? <EmptyState icon={Package} title="Aucun matériel utilisé" className="px-0 sm:px-0 py-16 sm:py-16" /> : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/60">
                    <th className="text-left px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Article</th>
                    <th className="text-right px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Qté</th>
                    <th className="text-right px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Prix unit.</th>
                    <th className="text-right px-4 sm:px-5 py-2.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(iv.materialsUsed || []).map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 sm:px-5 py-3 font-medium text-stone-900">{m.name}</td>
                      <td className="px-4 sm:px-5 py-3 text-right text-stone-500 tabular-nums">{m.quantity}</td>
                      <td className="px-4 sm:px-5 py-3 text-right text-stone-500 tabular-nums">{fmtNum(m.unitPrice)} F</td>
                      <td className="px-4 sm:px-5 py-3 text-right font-semibold text-stone-900 tabular-nums">{fmtNum((m.quantity || 0) * (m.unitPrice || 0))} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div>
          {(iv.documents || []).length === 0 ? <EmptyState icon={FileText} title="Aucun document disponible" className="px-0 sm:px-0 py-16 sm:py-16" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(iv.documents || []).map((doc: any, i: number) => (
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
