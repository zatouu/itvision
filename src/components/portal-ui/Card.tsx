import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CARD } from './tokens'

// Carte d'information sobre : titre micro-caps + contenu.
export function Card({
  title,
  icon: Icon,
  children,
  className,
}: {
  title?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`${CARD} p-5 ${className || ''}`}>
      {title && (
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
          {Icon && <Icon className="h-3.5 w-3.5 text-emerald-700" />}
          {title}
        </p>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// Ligne label / valeur utilisée dans les fiches détail.
export function InfoRow({
  label,
  value,
  bold,
}: {
  label: React.ReactNode
  value: React.ReactNode
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-stone-400">{label}</span>
      <span className={`text-sm text-stone-900 text-right ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

// Panneau listant : en-tête (icône + titre + action) séparé d'une bordure,
// corps libre (listes `divide-y`, grilles, etc.).
export function Panel({
  title,
  icon: Icon,
  iconClassName = 'text-emerald-700',
  action,
  children,
  className,
}: {
  title: React.ReactNode
  icon?: LucideIcon
  iconClassName?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`${CARD} overflow-hidden ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          {Icon && <Icon className={`h-4 w-4 ${iconClassName}`} />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// Action « Voir tout » standard des panneaux.
export function PanelLink({ href, children = 'Tout voir' }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-xs font-medium text-stone-400 transition-colors hover:text-emerald-700">
      {children} <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  )
}

// Carte de section du tableau de bord : icône en tuile + titre + lien,
// corps sous bordure supérieure, état vide intégré.
export function SectionCard({
  title,
  icon,
  href,
  empty,
  emptyText,
  compact,
  children,
}: {
  title: string
  icon: React.ReactNode
  href: string
  empty: boolean
  emptyText: string
  compact?: boolean
  children?: React.ReactNode
}) {
  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-800/5 text-emerald-700 ring-1 ring-emerald-800/10">
            {icon}
          </span>
          <h2 className="text-sm font-bold tracking-tight text-stone-900">{title}</h2>
        </div>
        <PanelLink href={href} />
      </div>
      <div className={`border-t border-stone-100 px-5 ${compact ? 'py-1' : 'py-2'}`}>
        {empty ? (
          <p className="py-8 text-center text-sm text-stone-400">{emptyText}</p>
        ) : children}
      </div>
    </section>
  )
}
