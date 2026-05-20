'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, ChevronLeft, Calendar, CheckCircle, Clock, AlertTriangle, Package, FileText, MessageSquare, ShieldAlert, TrendingUp, MapPin, User, Loader2, AlertCircle, Milestone, Activity, Inbox, Download } from 'lucide-react'

const S: Record<string, { l: string; c: string; b: string }> = {
  lead:{l:'Prospect',c:'text-gray-500',b:'bg-gray-100'},quoted:{l:'Devis',c:'text-purple-700',b:'bg-purple-100'},
  negotiation:{l:'Négociation',c:'text-yellow-700',b:'bg-yellow-100'},approved:{l:'Approuvé',c:'text-blue-700',b:'bg-blue-100'},
  in_progress:{l:'En cours',c:'text-green-700',b:'bg-green-100'},testing:{l:'Tests',c:'text-teal-700',b:'bg-teal-100'},
  completed:{l:'Terminé',c:'text-gray-600',b:'bg-gray-100'},maintenance:{l:'Maintenance',c:'text-violet-700',b:'bg-violet-100'},
  on_hold:{l:'En pause',c:'text-orange-700',b:'bg-orange-100'},
}
const MI: Record<string, any> = { completed:CheckCircle, in_progress:Clock, delayed:AlertTriangle, pending:Clock }
const TI: Record<string, any> = { created:FolderKanban, quoted:FileText, approved:CheckCircle, started:Activity, milestone:Milestone, issue:AlertTriangle, completed:CheckCircle }
const TC: Record<string, string> = { created:'bg-gray-100 text-gray-600', quoted:'bg-purple-100 text-purple-600', approved:'bg-blue-100 text-blue-600', started:'bg-green-100 text-green-600', milestone:'bg-violet-100 text-violet-600', issue:'bg-red-100 text-red-600', completed:'bg-emerald-100 text-emerald-600' }
const RM: Record<string, Record<string, { l: string; c: string; b: string }>> = {
  low:{ low:{l:'Faible',c:'text-green-700',b:'bg-green-100'}, medium:{l:'Modérée',c:'text-yellow-700',b:'bg-yellow-100'}, high:{l:'Élevée',c:'text-orange-700',b:'bg-orange-100'} },
  medium:{ low:{l:'Modérée',c:'text-yellow-700',b:'bg-yellow-100'}, medium:{l:'Significative',c:'text-orange-700',b:'bg-orange-100'}, high:{l:'Élevée',c:'text-red-700',b:'bg-red-100'} },
  high:{ low:{l:'Élevée',c:'text-orange-700',b:'bg-orange-100'}, medium:{l:'Élevée',c:'text-red-700',b:'bg-red-100'}, high:{l:'Critique',c:'text-red-800',b:'bg-red-200'} },
}
function fd(d:any){ if(!d) return '—'; return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) }
function fv(v:number){ return Math.round(v).toLocaleString('fr-FR') }
function Empty({icon:I,msg}:{icon:any;msg:string}){ return <div className="flex flex-col items-center py-16 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"><I className="w-10 h-10 text-gray-300 mb-3"/><p className="text-sm text-gray-500">{msg}</p></div> }
function Card({title,icon:I,children}:{title:string;icon:any;children:React.ReactNode}){ return <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><I className="w-3 h-3"/> {title}</p><div className="space-y-3">{children}</div></div> }
function Row({label,value,bold}:{label:string;value:string;bold?:boolean}){ return <div><p className="text-xs text-gray-400">{label}</p><p className={`text-sm ${bold?'font-bold text-violet-600':'font-medium text-gray-900 dark:text-white'}`}>{value}</p></div> }

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

  if(loading) return <div className="flex flex-col items-center justify-center h-full gap-3"><Loader2 className="w-8 h-8 animate-spin text-gray-300"/><p className="text-sm text-gray-400">Chargement du projet...</p></div>
  if(error||!project) return <div className="flex flex-col items-center justify-center h-full gap-3"><AlertCircle className="w-10 h-10 text-red-300"/><p className="text-sm text-gray-500">{error||'Projet introuvable'}</p><Link href="/portail-entreprise/projets" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Retour aux projets</Link></div>

  const cfg=S[project.status]||{l:project.status,c:'text-gray-500',b:'bg-gray-100'}
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/portail-entreprise/projets" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-1.5"><ChevronLeft className="w-3 h-3"/> Projets</Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center"><FolderKanban className="w-5 h-5 text-violet-600"/></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                {project.serviceType&&<span>{project.serviceType}</span>}
                {project.currentPhase&&<span>· Phase : {project.currentPhase}</span>}
                {project.address&&<span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/> {project.address}</span>}
              </div>
            </div>
          </div>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${cfg.b} ${cfg.c}`}>{cfg.l}</span>
      </div>

      <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2"><span>Avancement global</span><span className="font-bold text-gray-900 dark:text-white text-lg">{pct}%</span></div>
        <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden"><div className="h-full bg-gradient-to-r from-green-500 to-violet-500 rounded-full transition-all" style={{width:`${pct}%`}}/></div>
        {milestones.length>0&&<p className="text-xs text-gray-400 mt-2">{doneMilestones} jalon{doneMilestones>1?'s':''} terminé{doneMilestones>1?'s':''} sur {milestones.length}</p>}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab===t.id?'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 shadow-sm':'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
            <t.icon className="w-3.5 h-3.5"/>{t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview'&&(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Dates" icon={Calendar}><Row label="Début" value={fd(project.startDate)}/><Row label="Fin prévue" value={fd(project.endDate)}/>{project.nextMaintenance&&<Row label="Prochaine maintenance" value={fd(project.nextMaintenance)}/>}</Card>
          <Card title="Financier" icon={TrendingUp}>{project.value>0&&<Row label="Valeur du projet" value={`${fv(project.value)} FCFA`} bold/>}{project.quote&&<Row label="Devis approuvé" value={`${fv(project.quote.totalTTC||0)} FCFA`}/>}{project.metrics?.budgetPlanned&&<Row label="Budget utilisé" value={`${fv(project.metrics.budgetUsed||0)} / ${fv(project.metrics.budgetPlanned)} FCFA`}/>}</Card>
          {project.clientSnapshot&&<Card title="Contact" icon={User}>{project.clientSnapshot.company&&<p className="text-sm font-medium text-gray-900 dark:text-white">{project.clientSnapshot.company}</p>}{project.clientSnapshot.contact&&<p className="text-sm text-gray-600 dark:text-gray-300">{project.clientSnapshot.contact}</p>}{project.clientSnapshot.phone&&<p className="text-sm text-gray-500">{project.clientSnapshot.phone}</p>}{project.clientSnapshot.email&&<p className="text-sm text-gray-500">{project.clientSnapshot.email}</p>}</Card>}
          {project.site&&<Card title="Site" icon={MapPin}>{project.site.name&&<p className="text-sm font-medium text-gray-900 dark:text-white">{project.site.name}</p>}{project.site.address&&<p className="text-sm text-gray-600 dark:text-gray-300">{project.site.address}</p>}{project.site.access&&<p className="text-sm text-gray-500">Accès : {project.site.access}</p>}</Card>}
          {products.length>0&&<div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:col-span-2 lg:col-span-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Package className="w-3 h-3"/> Équipements ({products.length})</p>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-slate-800"><tr><th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">Article</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">Qté</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">P.U.</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">Total</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">Statut</th></tr></thead><tbody className="divide-y divide-gray-50 dark:divide-slate-700">
              {products.map((pr:any,i:number)=>(<tr key={i}><td className="px-3 py-2 text-gray-700 dark:text-gray-200">{pr.name}{pr.brand?` · ${pr.brand}`:''}{pr.model?` · ${pr.model}`:''}</td><td className="px-3 py-2 text-right text-gray-500">{pr.quantity}</td><td className="px-3 py-2 text-right text-gray-500">{fv(pr.unitPrice)}</td><td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{fv(pr.totalPrice)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pr.status==='installed'?'bg-green-100 text-green-700':pr.status==='received'?'bg-blue-100 text-blue-700':pr.status==='ordered'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-500'}`}>{pr.status==='installed'?'Installé':pr.status==='received'?'Reçu':pr.status==='ordered'?'Commandé':'Planifié'}</span></td></tr>))}
            </tbody></table></div>
          </div>}
          {(project.quotes?.length||project.invoices?.length)&&<div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:col-span-2 lg:col-span-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Documents liés</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project.quotes?.map((q:any)=>(<div key={q._id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800 px-4 py-3"><div><p className="text-sm font-medium text-gray-900 dark:text-white">Devis {q.numero}</p><p className="text-xs text-gray-500">{q.title||''}</p></div><div className="text-right"><p className="text-sm font-semibold text-violet-600">{fv(q.total)} FCFA</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${q.status==='accepted'?'bg-green-100 text-green-700':q.status==='rejected'?'bg-red-100 text-red-700':q.status==='sent'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-500'}`}>{q.status}</span></div></div>))}
              {project.invoices?.map((inv:any)=>(<div key={inv._id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800 px-4 py-3"><div><p className="text-sm font-medium text-gray-900 dark:text-white">Facture {inv.numero}</p><p className="text-xs text-gray-500">{fd(inv.date)}</p></div><div className="text-right"><p className="text-sm font-semibold text-violet-600">{fv(inv.total)} FCFA</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${inv.status==='paid'?'bg-green-100 text-green-700':inv.status==='overdue'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{inv.status==='paid'?'Payée':inv.status==='overdue'?'En retard':'À régler'}</span></div></div>))}
            </div>
          </div>}
        </div>
      )}

      {/* MILESTONES */}
      {tab==='milestones'&&(milestones.length===0?<Empty icon={Milestone} msg="Aucun jalon défini pour ce projet."/>:<div className="space-y-3">{milestones.map((m:any)=>{const I=MI[m.status]||Clock;const done=m.status==='completed';return(<div key={m.id} className={`rounded-xl border p-5 shadow-sm ${done?'border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/5':'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}><div className="flex items-start gap-3"><div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${done?'bg-green-100 text-green-600':m.status==='delayed'?'bg-orange-100 text-orange-600':m.status==='in_progress'?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-400'}`}><I className="w-5 h-5"/></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><h3 className={`text-sm font-semibold ${done?'line-through text-gray-400':'text-gray-900 dark:text-white'}`}>{m.name}</h3><span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${done?'bg-green-100 text-green-700':m.status==='delayed'?'bg-orange-100 text-orange-700':m.status==='in_progress'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-500'}`}>{done?'Terminé':m.status==='delayed'?'Retard':m.status==='in_progress'?'En cours':'En attente'}</span></div>{m.description&&<p className="text-xs text-gray-500 mt-1">{m.description}</p>}<div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">{m.dueDate&&<span>Échéance : {fd(m.dueDate)}</span>}{m.completedDate&&<span>Terminé le : {fd(m.completedDate)}</span>}{m.deliverables?.length&&<span>{m.deliverables.length} livrable{m.deliverables.length>1?'s':''}</span>}</div></div></div></div>)})}</div>)}

      {/* TIMELINE */}
      {tab==='timeline'&&(timeline.length===0?<Empty icon={Activity} msg="Aucun événement dans la timeline."/>:<div className="space-y-0 relative pl-6 border-l-2 border-gray-100 dark:border-slate-700">{timeline.map((t:any,i:number)=>{const Ic=TI[t.type]||CheckCircle;const cc=TC[t.type]||'bg-gray-100 text-gray-600';return(<div key={t.id||i} className="mb-6 relative"><div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center ${cc}`}><Ic className="w-3.5 h-3.5"/></div><div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"><p className="text-sm font-semibold text-gray-900 dark:text-white">{t.title}</p>{t.description&&<p className="text-xs text-gray-500 mt-1">{t.description}</p>}<p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><Calendar className="w-3 h-3"/>{fd(t.date)}{t.author&&<span>· {t.author}</span>}</p></div></div>)})}</div>)}

      {/* DOCUMENTS */}
      {tab==='documents'&&(documents.length===0?<Empty icon={FileText} msg="Aucun document partagé."/>:<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{documents.map((d:any)=>(<a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow"><div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-blue-600"/></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.name}</p><p className="text-[10px] text-gray-400 mt-0.5">{d.type} · {fd(d.uploadDate)}</p></div><Download className="w-4 h-4 text-gray-300 flex-shrink-0"/></a>))}</div>)}

      {/* NOTES */}
      {tab==='notes'&&(notes.length===0?<Empty icon={MessageSquare} msg="Aucune note partagée."/>:<div className="space-y-3">{notes.map((n:any)=>(<div key={n.id} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"><div className="flex items-center gap-2 mb-2"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${n.role==='CLIENT'?'bg-green-100 text-green-700':'bg-violet-100 text-violet-700'}`}>{n.role==='CLIENT'?'C':'A'}</div><div><p className="text-xs font-medium text-gray-900 dark:text-white">{n.author}</p><p className="text-[10px] text-gray-400">{n.role==='CLIENT'?'Client':'IT Vision'} · {fd(n.createdAt)}</p></div></div><p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{n.message}</p></div>))}</div>)}

      {/* RISKS */}
      {tab==='risks'&&(risks.length===0?<Empty icon={ShieldAlert} msg="Aucun risque identifié."/>:<div className="space-y-3">{risks.map((r:any)=>{const sev=(RM[r.probability]?.[r.impact])||{l:'Inconnu',c:'text-gray-500',b:'bg-gray-100'};return(<div key={r.id} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3 flex-1 min-w-0"><div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${r.status==='mitigated'?'bg-green-100 text-green-600':r.status==='occurred'?'bg-red-100 text-red-600':'bg-orange-100 text-orange-600'}`}><ShieldAlert className="w-5 h-5"/></div><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-gray-900 dark:text-white">{r.title}</h3>{r.description&&<p className="text-xs text-gray-500 mt-1">{r.description}</p>}<div className="flex flex-wrap items-center gap-2 mt-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.b} ${sev.c}`}>{sev.l}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.status==='mitigated'?'bg-green-100 text-green-700':r.status==='occurred'?'bg-red-100 text-red-700':r.status==='monitoring'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-500'}`}>{r.status==='mitigated'?'Atténué':r.status==='occurred'?'Survenu':r.status==='monitoring'?'Surveillance':'Identifié'}</span></div>{r.mitigation&&<div className="mt-3 rounded-lg bg-gray-50 dark:bg-slate-800 p-3"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Mesure d'atténuation</p><p className="text-xs text-gray-600 dark:text-gray-300">{r.mitigation}</p></div>}</div></div></div></div>)})}</div>)}
    </div>
  )
}
