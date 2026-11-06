import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BTN_GHOST } from './tokens'

// En-tête des pages liste : eyebrow micro-caps + titre + sous-titre + actions.
// `size="xl"` pour le tableau de bord (titre plus éditorial).
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  size,
  children,
  className,
}: {
  icon?: LucideIcon
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  size?: 'xl'
  children?: React.ReactNode
  className?: string
}) {
  const xl = size === 'xl'
  return (
    <header
      className={`flex flex-col border-b border-stone-200 sm:flex-row sm:items-end sm:justify-between ${
        xl ? 'gap-5 pb-6' : 'gap-4 pb-5'
      } ${className || ''}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase text-emerald-700 ${xl ? 'tracking-[0.14em]' : 'tracking-[0.12em]'}`}>
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </p>
        )}
        <h1 className={`mt-2 font-brand font-bold tracking-tight text-stone-900 ${xl ? 'text-3xl lg:text-4xl' : 'text-2xl lg:text-3xl'}`}>
          {title}
        </h1>
        {subtitle && <p className={`text-sm text-stone-500 ${xl ? 'mt-1.5' : 'mt-1'}`}>{subtitle}</p>}
      </div>
      {children && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">{children}</div>
      )}
    </header>
  )
}

// Lien retour.
//  - défaut : pilule bordée « ← Tableau de bord » (pages liste)
//  - subtle : « ‹ Section » discret (pages détail)
export function BackLink({
  href = '/portail-entreprise',
  label = 'Tableau de bord',
  subtle,
  className,
}: {
  href?: string
  label?: string
  subtle?: boolean
  className?: string
}) {
  if (subtle) {
    return (
      <Link
        href={href}
        className={`mb-3 inline-flex items-center gap-1 text-xs font-medium text-stone-400 transition-colors hover:text-emerald-700 ${className || ''}`}
      >
        <ChevronLeft className="h-3.5 w-3.5" /> {label}
      </Link>
    )
  }
  return (
    <Link href={href} className={`${BTN_GHOST} ${className || ''}`}>
      ← {label}
    </Link>
  )
}

// En-tête des pages détail : retour + tuile icône + titre/badges + méta.
export function DetailHeader({
  back,
  icon: Icon,
  iconClassName = 'bg-emerald-50 text-emerald-700',
  title,
  badges,
  meta,
  children,
}: {
  back?: { href: string; label: string }
  icon?: LucideIcon
  iconClassName?: string
  title: React.ReactNode
  badges?: React.ReactNode
  meta?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="border-b border-stone-200 pb-5">
      {back && <BackLink subtle href={back.href} label={back.label} />}
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-brand text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">{title}</h1>
            {badges}
          </div>
          {meta && <div className="mt-1 text-sm text-stone-500">{meta}</div>}
        </div>
      </div>
      {children}
    </header>
  )
}
