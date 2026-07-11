import { LucideIcon } from 'lucide-react'

interface TrustBadgeProps {
  icon: LucideIcon
  label: string
  className?: string
}

export default function TrustBadge({ icon: Icon, label, className = '' }: TrustBadgeProps) {
  return (
    <div className={`flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 ${className}`}>
      <Icon className="w-4 h-4 text-ddm-emerald flex-shrink-0" />
      <span>{label}</span>
    </div>
  )
}
