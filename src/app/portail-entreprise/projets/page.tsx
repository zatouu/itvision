import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Link from 'next/link'
import { FolderKanban, Calendar, CheckCircle, Clock, AlertTriangle, Package } from 'lucide-react'
import Project from '@/lib/models/Project'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lead:        { label: 'Prospect',    color: 'text-gray-500',   bg: 'bg-gray-100' },
  quoted:      { label: 'Devis',       color: 'text-purple-700', bg: 'bg-purple-100' },
  negotiation: { label: 'Négociation', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  approved:    { label: 'Approuvé',    color: 'text-blue-700',   bg: 'bg-blue-100' },
  in_progress: { label: 'En cours',    color: 'text-green-700',  bg: 'bg-green-100' },
  testing:     { label: 'Tests',       color: 'text-teal-700',   bg: 'bg-teal-100' },
  completed:   { label: 'Terminé',     color: 'text-gray-600',   bg: 'bg-gray-100' },
  maintenance: { label: 'Maintenance', color: 'text-violet-700', bg: 'bg-violet-100' },
  on_hold:     { label: 'En pause',    color: 'text-orange-700', bg: 'bg-orange-100' },
}

const MILESTONE_STATUS_ICON: Record<string, typeof CheckCircle> = {
  completed:  CheckCircle,
  in_progress: Clock,
  delayed:    AlertTriangle,
  pending:    Clock,
}

function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmt(v: number) { return Math.round(v).toLocaleString('fr-FR') }

export default async function ProjetsPage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user) redirect('/login?redirect=/portail-entreprise/projets')
  if (auth.user.role !== 'CLIENT' || !auth.user.companyClientId) redirect('/compte')

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const companyId = new mongoose.Types.ObjectId(auth.user.companyClientId)

  const projects = await Project.find({
    $or: [{ clientId: userId }, { clientCompanyId: companyId }]
  }).sort({ updatedAt: -1 }).lean() as any[]

  const active = projects.filter(p => ['in_progress', 'testing', 'approved', 'negotiation'].includes(p.status))
  const completed = projects.filter(p => ['completed', 'maintenance'].includes(p.status))
  const other = projects.filter(p => !active.includes(p) && !completed.includes(p))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-violet-600" /> Mes projets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {active.length} actif{active.length > 1 ? 's' : ''} · {projects.length} total
          </p>
        </div>
        <Link href="/portail-entreprise" className="text-sm text-gray-400 hover:text-gray-600">← Tableau de bord</Link>
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
          <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun projet</p>
        </div>
      )}

      {active.length > 0 && <ProjectGroup title="Projets actifs" projects={active} />}
      {other.length > 0 && <ProjectGroup title="Autres projets" projects={other} />}
      {completed.length > 0 && <ProjectGroup title="Projets terminés" projects={completed} collapsed />}
    </div>
  )
}

function ProjectGroup({ title, projects, collapsed }: { title: string; projects: any[]; collapsed?: boolean }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{title} ({projects.length})</h2>
      <div className="space-y-4">
        {projects.map(p => <ProjectCard key={String(p._id)} p={p} />)}
      </div>
    </section>
  )
}

function ProjectCard({ p }: { p: any }) {
  const cfg = STATUS_CONFIG[p.status] || { label: p.status, color: 'text-gray-500', bg: 'bg-gray-100' }
  const milestones = (p.milestones || []) as any[]
  const doneMilestones = milestones.filter((m: any) => m.status === 'completed').length
  const pct = p.progress ?? (milestones.length > 0 ? Math.round((doneMilestones / milestones.length) * 100) : 0)
  const products = (p.products || []) as any[]
  const timeline = ((p.timeline || []) as any[]).filter((t: any) => t.clientVisible !== false).slice(-3)

  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
              {p.serviceType && <span>{p.serviceType}</span>}
              {p.currentPhase && <span>· Phase : {p.currentPhase}</span>}
              {p.address && <span>· {p.address}</span>}
            </div>
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Progression */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Avancement global</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-violet-500 rounded-full transition-all"
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Dates */}
      <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div><p className="text-gray-400">Début</p><p className="font-medium text-gray-800 dark:text-white mt-0.5">{fmtDate(p.startDate)}</p></div>
        <div><p className="text-gray-400">Fin prévue</p><p className="font-medium text-gray-800 dark:text-white mt-0.5">{fmtDate(p.endDate)}</p></div>
        {p.value > 0 && <div><p className="text-gray-400">Valeur</p><p className="font-semibold text-violet-600 mt-0.5">{fmt(p.value)} FCFA</p></div>}
        {milestones.length > 0 && (
          <div><p className="text-gray-400">Jalons</p><p className="font-medium text-gray-800 dark:text-white mt-0.5">{doneMilestones}/{milestones.length}</p></div>
        )}
      </div>

      {/* Jalons */}
      {milestones.length > 0 && (
        <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Jalons</p>
          <div className="space-y-1.5">
            {milestones.slice(0, 5).map((m: any) => {
              const Icon = MILESTONE_STATUS_ICON[m.status] || Clock
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <Icon className={`w-3 h-3 flex-shrink-0 ${
                    m.status === 'completed' ? 'text-green-500' :
                    m.status === 'delayed' ? 'text-orange-500' :
                    m.status === 'in_progress' ? 'text-blue-500' : 'text-gray-300'
                  }`} />
                  <span className={`text-xs flex-1 ${m.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {m.name}
                  </span>
                  {m.dueDate && <span className="text-[10px] text-gray-400">{fmtDate(m.dueDate)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Équipements installés */}
      {products.length > 0 && (
        <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            <Package className="w-3 h-3 inline mr-1" />Équipements ({products.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {products.slice(0, 6).map((pr: any, idx: number) => (
              <span key={idx} className="rounded-lg bg-gray-50 dark:bg-slate-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                {pr.quantity}× {pr.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline récente */}
      {timeline.length > 0 && (
        <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Dernières mises à jour</p>
          <div className="space-y-1.5">
            {timeline.map((t: any) => (
              <div key={t.id} className="flex items-start gap-2 text-xs">
                <span className="text-gray-300 flex-shrink-0 mt-0.5">·</span>
                <span className="text-gray-600 dark:text-gray-300 flex-1">{t.title}</span>
                <span className="text-gray-400 flex-shrink-0">{fmtDate(t.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
