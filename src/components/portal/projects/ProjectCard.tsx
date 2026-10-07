import Link from 'next/link'
import {
  Cctv, KeyRound, Siren, DoorOpen, Home, Flame, Network, Wrench, FolderKanban,
  ChevronRight, CalendarClock, PauseCircle, CheckCircle2, MapPin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ITV_DOMAINS, PROJECT_STAGES, detectDomain, projectStage, type ItvDomain } from '@/lib/portal/project-view'
import { CARD, fmtDate } from '@/components/portal-ui'

const ICONS: Record<string, LucideIcon> = {
  cctv: Cctv, key: KeyRound, siren: Siren, door: DoorOpen, home: Home, flame: Flame, network: Network, wrench: Wrench, folder: FolderKanban,
}

export function DomainIcon({ domain, size = 'md' }: { domain: ItvDomain; size?: 'sm' | 'md' | 'lg' }) {
  const def = ITV_DOMAINS[domain]
  const Icon = ICONS[def.icon] || FolderKanban
  const box = size === 'lg' ? 'w-12 h-12 rounded-2xl' : size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'
  const ico = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <span className={`relative flex-shrink-0 flex items-center justify-center ring-1 ring-inset ${def.chip} ${box}`}>
      <Icon className={ico} aria-hidden />
    </span>
  )
}

export function DomainChip({ domain }: { domain: ItvDomain }) {
  const def = ITV_DOMAINS[domain]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${def.chip}`}>{def.short}</span>
}

/** Frise des étapes : points sur mobile, libellés à partir de sm. */
export function StageStepper({ index, done, paused, compact }: { index: number; done?: boolean; paused?: boolean; compact?: boolean }) {
  return (
    <ol className="flex items-center gap-1" aria-label={`Étape ${index + 1} sur ${PROJECT_STAGES.length} : ${PROJECT_STAGES[index].label}`}>
      {PROJECT_STAGES.map((s, i) => {
        const past = i < index || (done && i <= index)
        const current = i === index && !done
        return (
          <li key={s.key} className="flex-1 min-w-0">
            <div className={`h-1.5 rounded-full ${past ? 'bg-emerald-600' : current ? (paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-stone-200'}`} />
            {!compact && (
              <p className={`mt-1.5 hidden sm:block truncate text-[10px] font-medium ${current ? 'text-emerald-800' : past ? 'text-stone-500' : 'text-stone-300'}`}>{s.label}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export type PortalProject = {
  _id: unknown
  name: string
  status?: string
  progress?: number
  serviceType?: string
  currentPhase?: string
  address?: string
  endDate?: string | Date
  updatedAt?: string | Date
  quote?: { status?: string } | null
  milestones?: Array<{ id?: string; name?: string; status?: string; dueDate?: string | Date }>
  reception?: { requestedAt?: string | Date; signedAt?: string | Date; decision?: string; reservesLiftedAt?: string | Date; warrantyEnd?: string | Date } | null
}

/** Carte projet : domaine, étape, avancement, prochaine étape. */
export function ProjectCard({ p, className = '' }: { p: PortalProject; className?: string }) {
  const domain = detectDomain(p.serviceType, p.name)
  const stage = projectStage(p)
  const milestones = p.milestones || []
  const done = milestones.filter(m => m.status === 'completed').length
  const pct = Math.max(0, Math.min(100, p.progress ?? (milestones.length ? Math.round(done / milestones.length * 100) : 0)))
  const next = milestones.find(m => m.status !== 'completed')
  const late = next?.dueDate && new Date(next.dueDate) < new Date()

  return (
    <Link href={`/portail-entreprise/projets/${String(p._id)}`}
      className={`${CARD} group block p-4 active:scale-[0.99] transition-all hover:border-emerald-300 hover:shadow-md ${className}`}>
      <div className="flex items-start gap-3">
        <DomainIcon domain={domain} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <DomainChip domain={domain} />
            {stage.paused && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"><PauseCircle className="w-3 h-3" />En pause</span>}
            {stage.done && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="w-3 h-3" />Terminé</span>}
          </div>
          <h3 className="mt-1 font-semibold text-stone-900 leading-snug line-clamp-2 group-hover:text-emerald-800 transition-colors">{p.name}</h3>
          {p.address && <p className="mt-0.5 text-xs text-stone-400 truncate flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{p.address}</p>}
        </div>
        <ChevronRight className="w-4 h-4 mt-1 text-stone-300 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-xs font-semibold text-emerald-800">{stage.done ? 'Réception effectuée' : stage.label}</p>
          <p className="text-lg font-bold tabular-nums text-stone-900 leading-none">{pct}<span className="text-xs text-stone-400"> %</span></p>
        </div>
        <StageStepper index={stage.index} done={stage.done} paused={stage.paused} />
      </div>

      {p.reception?.requestedAt && !p.reception.signedAt && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> PV de réception à signer
        </div>
      )}
      {stage.done && p.reception?.warrantyEnd && new Date(p.reception.warrantyEnd) > new Date() && (
        <p className="mt-3 text-xs text-emerald-700">Sous garantie jusqu&apos;au {fmtDate(p.reception.warrantyEnd)}</p>
      )}

      {(next || p.endDate) && !stage.done && !(p.reception?.requestedAt && !p.reception.signedAt) && (
        <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${late ? 'bg-amber-50 text-amber-800' : 'bg-stone-50 text-stone-600'}`}>
          <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {next ? <>Prochaine étape : <strong className="font-semibold">{next.name}</strong>{next.dueDate ? ` · ${fmtDate(next.dueDate)}` : ''}</> : <>Fin prévue le {fmtDate(p.endDate)}</>}
          </span>
        </div>
      )}
    </Link>
  )
}
