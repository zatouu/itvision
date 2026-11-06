import Link from 'next/link'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'

// Bandeau d'alerte actionnable (bord gauche accentué).
export function AlertRow({
  tone,
  text,
  href,
  action,
  icon,
}: {
  tone: 'amber' | 'red' | 'orange'
  text: React.ReactNode
  href: string
  action: string
  icon?: React.ReactNode
}) {
  const tones = {
    amber: 'border-l-amber-500 bg-amber-50/60 text-amber-900',
    red: 'border-l-red-500 bg-red-50/60 text-red-900',
    orange: 'border-l-orange-500 bg-orange-50/60 text-orange-900',
  }
  return (
    <div className={`flex items-center gap-3 rounded-r-xl border border-l-[3px] px-4 py-3 ${tones[tone]}`}>
      <span className="flex-shrink-0 opacity-70">{icon || <AlertTriangle className="h-4 w-4" />}</span>
      <p className="flex-1 text-sm">{text}</p>
      <Link href={href} className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold underline-offset-2 hover:underline">
        {action} <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
