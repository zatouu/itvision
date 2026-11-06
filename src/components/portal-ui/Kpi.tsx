import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CARD, ICON_TONE, type IconToneKey } from './tokens'

export interface KpiItem {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  tone?: IconToneKey | string
  valueClassName?: string
  sub?: string
  href?: string
}

const LG_COLS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

const SM_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-3',
}

// Bandeau KPI : une carte divisée en cellules (grille à joints fins).
// `href` rend la cellule cliquable avec l'indice « Détail → ».
export function KpiStrip({ items, cols = 4 }: { items: KpiItem[]; cols?: 2 | 3 | 4 | 5 }) {
  return (
    <section className={`overflow-hidden ${CARD}`}>
      <div className={`grid grid-cols-2 gap-px bg-stone-200/70 ${SM_COLS[cols]} ${LG_COLS[cols]}`}>
        {items.map(k => {
          const Icon = k.icon
          const iconTone = k.tone ? (ICON_TONE[k.tone as IconToneKey] || k.tone) : 'text-stone-400'
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">{k.label}</p>
                {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${iconTone}`} />}
              </div>
              <p className={`mt-2 text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${k.valueClassName || 'text-stone-900'}`}>{k.value}</p>
              {k.sub && <p className="mt-0.5 text-[11px] text-stone-400">{k.sub}</p>}
              {k.href && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 transition-colors group-hover:text-emerald-700">
                  Détail <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </>
          )
          const cls = `bg-white px-4 py-4 sm:px-5 sm:py-5 ${k.href ? 'group transition-colors hover:bg-emerald-50/40' : ''}`
          return k.href ? (
            <Link key={k.label} href={k.href} className={cls}>{body}</Link>
          ) : (
            <div key={k.label} className={cls}>{body}</div>
          )
        })}
      </div>
    </section>
  )
}

// Mini-stat centrée en tuile stone (stats secondaires).
export function MiniStat({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-center">
      <p className={`text-lg font-bold tabular-nums ${valueClassName || 'text-stone-900'}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-stone-400">{label}</p>
    </div>
  )
}
