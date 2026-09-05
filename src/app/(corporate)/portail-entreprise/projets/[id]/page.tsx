'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, ChevronLeft, Calendar, CheckCircle, Clock, AlertTriangle, Package, FileText, MessageSquare, ShieldAlert, TrendingUp, MapPin, User, Loader2, AlertCircle, Milestone, Activity, Download } from 'lucide-react'
import { CARD, PILL, TONE, fmtDate, fmtNum, projectStatus, milestoneIcon, StatusBadge, ProgressBar, EmptyState, BackLink, Card, Pill } from '@/components/portal-ui'

const TI: Record<string, any> = { created:FolderKanban, quoted:FileText, approved:CheckCircle, started:Activity, milestone:Milestone, issue:AlertTriangle, completed:CheckCircle }
const TC: Record<string, string> = { created:'bg-stone-100 text-stone-600', quoted:'bg-sky-50 text-sky-700', approved:'bg-sky-50 text-sky-700', started:'bg-emerald-50 text-emerald-700', milestone:'bg-teal-50 text-teal-700', issue:'bg-red-50 text-red-700', completed:'bg-emerald-50 text-emerald-700' }
const RM: Record<string, Record<string, { l: string; c: string }>> = {
  low:{ low:{l:'Faible',c:'bg-emerald-50 text-emerald-700 ring-emerald-600/20'}, medium:{l:'Modérée',c:'bg-amber-50 text-amber-700 ring-amber-600/20'}, high:{l:'Élevée',c:'bg-orange-50 text-orange-700 ring-orange-600/20'} },
  medium:{ low:{l:'Modérée',c:'bg-amber-50 text-amber-700 ring-amber-600/20'}, medium:{l:'Significative',c:'bg-orange-50 text-orange-700 ring-orange-600/20'}, high:{l:'Élevée',c:'bg-red-50 text-red-700 ring-red-600/20'} },
  high:{ low:{l:'Élevée',c:'bg-orange-50 text-orange-700 ring-orange-600/20'}, medium:{l:'Élevée',c:'bg-red-50 text-red-700 ring-red-600/20'}, high:{l:'Critique',c:'bg-red-50 text-red-800 ring-red-600/20'} },
}
function Row({label,value,bold}:{label:string;value:string;bold?:boolean}){ return <div><p className="text-xs text-stone-400">{label}</p><p className={`text-sm ${bold?'font-bold text-emerald-800 tabular-nums':'font-medium text-stone-900'}`}>{value}</p></div> }

export default function ProjectDetailPage(){
  const {id}=useParams() as {id:string}
  const router=useRouter()
  const [project,setProject]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [tab,setTab]=useState<'overview'|'milestones'|'timeline'|'documents'|'notes'|'risks'>('overview')

  useEffect(()=>{
    fetch(`/api/client-enterprise/projects/${id}`)
      .then(r=>{ if(r.status===401){router.push('/login');return null} if(r.status===404){setError('Projet introuvable');return null} if(!r.ok){setError('Erreur de chargement');return null} return r.json() })
      .then(d=>{ if(d?.success) setProject(d.project); setLoading(false) })
      .catch(()=>{ setError('Erreur de connexion'); setLoading(false) })
  },[id,router])

  if(loading) return <div className="flex flex-col items-center justify-center h-full gap-3 p-6"><Loader2 className="w-8 h-8 animate-spin text-stone-300"/><p className="text-sm text-stone-400">Chargement du projet...</p></div>
  if(error||!project) return <div className="flex flex-col items-center justify-center h-full gap-3 p-6"><AlertCircle className="w-10 h-10 text-red-300"/><p className="text-sm text-stone-500">{error||'Projet introuvable'}</p><Link href="/portail-entreprise/projets" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Retour aux projets</Link></div>

  const milestones=project.milestones||[]
  const doneMilestones=milestones.filter((m:any)=>m.status==='completed').length
  const pct=project.progress??(milestones.length>0?Math.round((doneMilestones/milestones.length)*100):0)
  const timeline=project.timeline||[]
  const documents=project.documents||[]
  const notes=project.sharedNotes||[]
  const risks=project.risks||[]
  const products=project.products||[]

  const tabs=[
    {id:'overview' as const, label:'Vue d\'ensemble', icon:TrendingUp},
    {id:'milestones' as const, label:`Jalons${milestones.length?` (${doneMilestones}/${milestones.length})`:''}`, icon:Milestone},
    {id:'timeline' as const, label:`Timeline${timeline.length?` (${timeline.length})`:''}`, icon:Activity},
    {id:'documents' as const, label:`Documents${documents.length?` (${documents.length})`:''}`, icon:FileText},
    {id:'notes' as const, label:`Notes${notes.length?` (${notes.length})`:''}`, icon:MessageSquare},
    {id:'risks' as const, label:`Risques${risks.length?` (${risks.length})`:''}`, icon:ShieldAlert},
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <header className="border-b border-stone-200 pb-5">
        <BackLink subtle href="/portail-entreprise/projets" label="Projets" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0"><FolderKanban className="w-5 h-5 text-emerald-700"/></div>
            <div className="min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-stone-900 truncate">{project.name}</h1>
              <div className="flex items-center gap-2 text-xs text-stone-400 flex-wrap mt-1">
                {project.serviceType&&<span>{project.serviceType}</span>}
                {project.currentPhase&&<span>· Phase : {project.currentPhase}</span>}
                {project.address&&<span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/> {project.address}</span>}
              </div>
            </div>
          </div>
          <StatusBadge status={project.status} map={projectStatus} className="self-start flex-shrink-0" />
        </div>
      </header>

      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between text-sm text-stone-500 mb-2"><span>Avancement global</span><span className="font-bold text-stone-900 text-lg tabular-nums">{pct}%</span></div>
        <ProgressBar value={pct} size="lg" />
        {milestones.length>0&&<p className="text-xs text-stone-400 mt-2 tabular-nums">{doneMilestones} jalon{doneMilestones>1?'s':''} terminé{doneMilestones>1?'s':''} sur {milestones.length}</p>}
      </div>

      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab===t.id?'border-emerald-600 text-emerald-800':'border-transparent text-stone-400 hover:text-stone-600'}`}>
            <t.icon className="w-3.5 h-3.5"/>{t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview'&&(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Dates" icon={Calendar}><Row label="Début" value={fmtDate(project.startDate)}/><Row label="Fin prévue" value={fmtDate(project.endDate)}/>{project.nextMaintenance&&<Row label="Prochaine maintenance" value={fmtDate(project.nextMaintenance)}/>}</Card>
          <Card title="Financier" icon={TrendingUp}>{project.value>0&&<Row label="Valeur du projet" value={`${fmtNum(project.value)} FCFA`} bold/>}{project.quote&&<Row label="Devis approuvé" value={`${fmtNum(project.quote.totalTTC||0)} FCFA`}/>}{project.metrics?.budgetPlanned&&<Row label="Budget utilisé" value={`${fmtNum(project.metrics.budgetUsed||0)} / ${fmtNum(project.metrics.budgetPlanned)} FCFA`}/>}</Card>
          {project.clientSnapshot&&<Card title="Contact" icon={User}>{project.clientSnapshot.company&&<p className="text-sm font-medium text-stone-900">{project.clientSnapshot.company}</p>}{project.clientSnapshot.contact&&<p className="text-sm text-stone-600">{project.clientSnapshot.contact}</p>}{project.clientSnapshot.phone&&<p className="text-sm text-stone-500">{project.clientSnapshot.phone}</p>}{project.clientSnapshot.email&&<p className="text-sm text-stone-500">{project.clientSnapshot.email}</p>}</Card>}
          {project.site&&<Card title="Site" icon={MapPin}>{project.site.name&&<p className="text-sm font-medium text-stone-900">{project.site.name}</p>}{project.site.address&&<p className="text-sm text-stone-600">{project.site.address}</p>}{project.site.access&&<p className="text-sm text-stone-500">Accès : {project.site.access}</p>}</Card>}
          {products.length>0&&<div className={`${CARD} p-5 sm:col-span-2 lg:col-span-3`}>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-emerald-700"/> Équipements ({products.length})</p>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-stone-50"><tr><th className="px-3 py-2 text-left text-xs font-semibold text-stone-400">Article</th><th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">Qté</th><th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">P.U.</th><th className="px-3 py-2 text-right text-xs font-semibold text-stone-400">Total</th><th className="px-3 py-2 text-left text-xs font-semibold text-stone-400">Statut</th></tr></thead><tbody className="divide-y divide-stone-100">
              {products.map((pr:any,i:number)=>(<tr key={i}><td className="px-3 py-2 text-stone-700">{pr.name}{pr.brand?` · ${pr.brand}`:''}{pr.model?` · ${pr.model}`:''}</td><td className="px-3 py-2 text-right text-stone-500 tabular-nums">{pr.quantity}</td><td className="px-3 py-2 text-right text-stone-500 tabular-nums">{fmtNum(pr.unitPrice)}</td><td className="px-3 py-2 text-right font-medium text-stone-900 tabular-nums">{fmtNum(pr.totalPrice)}</td><td className="px-3 py-2"><Pill color={pr.status==='installed'?TONE.emerald:pr.status==='received'?TONE.sky:pr.status==='ordered'?TONE.amber:TONE.neutral} className="flex-shrink-0">{pr.status==='installed'?'Installé':pr.status==='received'?'Reçu':pr.status==='ordered'?'Commandé':'Planifié'}</Pill></td></tr>))}
            </tbody></table></div>
          </div>}
          {(project.quotes?.length||project.invoices?.length)&&<div className={`${CARD} p-5 sm:col-span-2 lg:col-span-3`}>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3">Documents liés</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project.quotes?.map((q:any)=>(<div key={q._id} className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-4 py-3"><div className="min-w-0"><p className="text-sm font-medium text-stone-900">Devis {q.numero}</p><p className="text-xs text-stone-500 truncate">{q.title||''}</p></div><div className="text-right flex-shrink-0"><p className="text-sm font-semibold text-emerald-800 tabular-nums">{fmtNum(q.total)} F</p><Pill color={q.status==='accepted'?TONE.emerald:q.status==='rejected'?TONE.red:q.status==='sent'?TONE.sky:TONE.neutral} className="flex-shrink-0">{q.status==='accepted'?'Accepté':q.status==='rejected'?'Refusé':q.status==='sent'?'Envoyé':q.status}</Pill></div></div>))}
              {project.invoices?.map((inv:any)=>(<div key={inv._id} className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-4 py-3"><div className="min-w-0"><p className="text-sm font-medium text-stone-900">Facture {inv.numero}</p><p className="text-xs text-stone-500">{fmtDate(inv.date)}</p></div><div className="text-right flex-shrink-0"><p className="text-sm font-semibold text-emerald-800 tabular-nums">{fmtNum(inv.total)} F</p><Pill color={inv.status==='paid'?TONE.emerald:inv.status==='overdue'?TONE.red:TONE.sky} className="flex-shrink-0">{inv.status==='paid'?'Payée':inv.status==='overdue'?'En retard':'À régler'}</Pill></div></div>))}
            </div>
          </div>}
        </div>
      )}

      {/* MILESTONES */}
      {tab==='milestones'&&(milestones.length===0?<EmptyState icon={Milestone} title="Aucun jalon défini pour ce projet." className="py-16 px-0" />:<div className="space-y-3">{milestones.map((m:any)=>{const I=milestoneIcon[m.status]||Clock;const done=m.status==='completed';return(<div key={m.id} className={`${CARD} p-5 ${done?'border-emerald-200 bg-emerald-50/40':''}`}><div className="flex items-start gap-3"><div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${done?'bg-emerald-50 text-emerald-600':m.status==='delayed'?'bg-orange-50 text-orange-600':m.status==='in_progress'?'bg-sky-50 text-sky-600':'bg-stone-100 text-stone-400'}`}><I className="w-5 h-5"/></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><h3 className={`text-sm font-semibold ${done?'line-through text-stone-400':'text-stone-900'}`}>{m.name}</h3><Pill color={done?TONE.emerald:m.status==='delayed'?TONE.orange:m.status==='in_progress'?TONE.sky:TONE.neutral} className="flex-shrink-0">{done?'Terminé':m.status==='delayed'?'Retard':m.status==='in_progress'?'En cours':'En attente'}</Pill></div>{m.description&&<p className="text-xs text-stone-500 mt-1">{m.description}</p>}<div className="flex items-center gap-3 mt-2 text-[10px] text-stone-400">{m.dueDate&&<span>Échéance : {fmtDate(m.dueDate)}</span>}{m.completedDate&&<span>Terminé le : {fmtDate(m.completedDate)}</span>}{m.deliverables?.length&&<span>{m.deliverables.length} livrable{m.deliverables.length>1?'s':''}</span>}</div></div></div></div>)})}</div>)}

      {/* TIMELINE */}
      {tab==='timeline'&&(timeline.length===0?<EmptyState icon={Activity} title="Aucun événement dans la timeline." className="py-16 px-0" />:<div className="space-y-0 relative pl-6 border-l-2 border-stone-200">{timeline.map((t:any,i:number)=>{const Ic=TI[t.type]||CheckCircle;const cc=TC[t.type]||'bg-stone-100 text-stone-600';return(<div key={t.id||i} className="mb-6 relative"><div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-stone-50 ${cc}`}><Ic className="w-3.5 h-3.5"/></div><div className={`${CARD} p-4`}><p className="text-sm font-semibold text-stone-900">{t.title}</p>{t.description&&<p className="text-xs text-stone-500 mt-1">{t.description}</p>}<p className="text-[10px] text-stone-400 mt-2 flex items-center gap-1"><Calendar className="w-3 h-3"/>{fmtDate(t.date)}{t.author&&<span>· {t.author}</span>}</p></div></div>)})}</div>)}

      {/* DOCUMENTS */}
      {tab==='documents'&&(documents.length===0?<EmptyState icon={FileText} title="Aucun document partagé." className="py-16 px-0" />:<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{documents.map((d:any)=>(<a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 ${CARD} p-4 hover:border-emerald-300 hover:shadow-sm transition-all group`}><div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-sky-700"/></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-stone-900 truncate group-hover:text-emerald-800 transition-colors">{d.name}</p><p className="text-[10px] text-stone-400 mt-0.5">{d.type} · {fmtDate(d.uploadDate)}</p></div><Download className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 transition-colors flex-shrink-0"/></a>))}</div>)}

      {/* NOTES */}
      {tab==='notes'&&(notes.length===0?<EmptyState icon={MessageSquare} title="Aucune note partagée." className="py-16 px-0" />:<div className="space-y-3">{notes.map((n:any)=>(<div key={n.id} className={`${CARD} p-4`}><div className="flex items-center gap-2 mb-2"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${n.role==='CLIENT'?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-600'}`}>{n.role==='CLIENT'?'C':'A'}</div><div><p className="text-xs font-medium text-stone-900">{n.author}</p><p className="text-[10px] text-stone-400">{n.role==='CLIENT'?'Client':'IT Vision'} · {fmtDate(n.createdAt)}</p></div></div><p className="text-sm text-stone-700 whitespace-pre-line">{n.message}</p></div>))}</div>)}

      {/* RISKS */}
      {tab==='risks'&&(risks.length===0?<EmptyState icon={ShieldAlert} title="Aucun risque identifié pour ce projet." className="py-16 px-0" />:<div className="space-y-3">{risks.map((r:any)=>{const sev=(RM[r.probability]?.[r.impact])||{l:'Inconnu',c:'bg-stone-100 text-stone-500 ring-stone-400/20'};return(<div key={r.id} className={`${CARD} p-5`}><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3 flex-1 min-w-0"><div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${r.status==='mitigated'?'bg-emerald-50 text-emerald-600':r.status==='occurred'?'bg-red-50 text-red-600':'bg-orange-50 text-orange-600'}`}><ShieldAlert className="w-5 h-5"/></div><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-stone-900">{r.title}</h3>{r.description&&<p className="text-xs text-stone-500 mt-1">{r.description}</p>}<div className="flex flex-wrap items-center gap-2 mt-2"><span className={`${PILL} ${sev.c}`}>{sev.l}</span><Pill color={r.status==='mitigated'?TONE.emerald:r.status==='occurred'?TONE.red:r.status==='monitoring'?TONE.sky:TONE.neutral} className="flex-shrink-0">{r.status==='mitigated'?'Atténué':r.status==='occurred'?'Survenu':r.status==='monitoring'?'Surveillance':'Identifié'}</Pill></div>{r.mitigation&&<div className="mt-3 rounded-xl bg-stone-50 border border-stone-100 p-3"><p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-1">Mesure d'atténuation</p><p className="text-xs text-stone-600">{r.mitigation}</p></div>}</div></div></div></div>)})}</div>)}
    </div>
  )
}
