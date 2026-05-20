'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Calendar, Clock, MapPin, Wrench, AlertTriangle,
  CheckCircle, Loader2, AlertCircle, FileText, Download, Star,
  Activity, Package, ListChecks, Receipt, User, Phone, MessageSquare
} from 'lucide-react'

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
const ITYPE: Record<string, string> = { preventive: 'Préventive', curative: 'Curative', installation: 'Installation', support: 'Support' }

function fd(d: any) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function ft(d: any) { if (!d) return '—'; return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
function fv(v: number) { return Math.round(v || 0).toLocaleString('fr-FR') }

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
  { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
  { id: 'tasks', label: 'Tâches', icon: ListChecks },
  { id: 'materials', label: 'Matériaux', icon: Package },
  { id: 'documents', label: 'Documents', icon: FileText },
] as const

export default function InterventionDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
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

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error) return <div className="p-6"><div className="rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 p-6 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm text-red-700">{error}</p></div></div>
  if (!iv) return null

  const pc = IP[iv.priority] || IP.medium
  const sc = IS[iv.status] || IS.planned

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/portail-entreprise/interventions')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{iv.title}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${sc.b} ${sc.c}`}>{sc.l}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pc.b} ${pc.c}`}>{pc.l}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{iv.interventionNumber || '—'} · {ITYPE[iv.typeIntervention] || iv.typeIntervention}</p>
        </div>
      </div>

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
          <Card title="Informations" icon={Activity}>
            <Row label="Type" value={ITYPE[iv.typeIntervention] || iv.typeIntervention || '—'} />
            <Row label="Statut" value={sc.l} />
            <Row label="Priorité" value={pc.l} />
            <Row label="Date" value={fd(iv.date)} />
            {iv.startTime && <Row label="Heure début" value={ft(iv.startTime)} />}
            {iv.endTime && <Row label="Heure fin" value={ft(iv.endTime)} />}
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
              <Row label="Coût total" value={`${fv(iv.cost)} FCFA`} bold />
              <Row label="Couverte par contrat" value={iv.isCoveredByContract ? 'Oui' : 'Non'} />
            </Card>
          )}
          {iv.feedback && (
            <Card title="Votre avis" icon={Star}>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < (iv.feedback.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                ))}
                <span className="text-xs text-gray-500 ml-1">{iv.feedback.rating}/5</span>
              </div>
              {iv.feedback.comment && <p className="text-xs text-gray-600 mt-2">{iv.feedback.comment}</p>}
              <p className="text-[10px] text-gray-400 mt-1">{fd(iv.feedback.submittedAt)}</p>
            </Card>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          {(iv.tasks || []).length === 0 ? <Empty icon={ListChecks} msg="Aucune tâche enregistrée" /> : (
            <div className="space-y-2">
              {(iv.tasks || []).map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${t.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    {t.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t.status === 'completed' ? 'Terminée' : 'En attente'}{t.duration && ` · ${t.duration} min`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'materials' && (
        <div>
          {(iv.materialsUsed || []).length === 0 ? <Empty icon={Package} msg="Aucun matériel utilisé" /> : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Article</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Qté</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Prix unit.</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(iv.materialsUsed || []).map((m: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-800/60">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{m.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fv(m.unitPrice)} FCFA</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fv((m.quantity || 0) * (m.unitPrice || 0))} FCFA</td>
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
          {(iv.documents || []).length === 0 ? <Empty icon={FileText} msg="Aucun document disponible" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(iv.documents || []).map((doc: any, i: number) => (
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
