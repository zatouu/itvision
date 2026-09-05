import type { LucideIcon } from 'lucide-react'
import { PILL, TONE } from './tokens'
import { genericStatus, statusDef, type StatusDef } from './status'

// Pastille de statut unifiée. Usage :
//   <StatusBadge status={t.status} map={ticketStatus} />
//   <StatusBadge status={c.status} />                       // map générique
//   <StatusBadge status={x} label="Libre" />               // libellé forcé
export function StatusBadge({
  status,
  map = genericStatus,
  fallback,
  label,
  icon,
  className,
}: {
  status: string | null | undefined
  map?: Record<string, StatusDef>
  fallback?: string
  label?: string
  icon?: LucideIcon | false
  className?: string
}) {
  const def = statusDef(map, status, fallback)
  const Icon = icon === false ? undefined : icon || def.icon
  return (
    <span className={`${PILL} gap-1 ${def.color} ${className || ''}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label || def.label}
    </span>
  )
}

// Pastille libre (couleur + contenu fournis directement).
export function Pill({
  color = TONE.neutral,
  icon: Icon,
  children,
  className,
}: {
  color?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`${PILL} gap-1 ${color} ${className || ''}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
