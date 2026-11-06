// Barre de progression unifiée.
//  - `tone` : classe de couleur explicite (ex. 'bg-emerald-600')
//  - `auto="usage"` : seuils décroissants ≥90 rouge, ≥70 ambre, sinon émeraude (consommation)
//  - `auto="ratio"` : seuils croissants ≥80 émeraude, ≥50 ambre, sinon rouge (performance)
export function ProgressBar({
  value,
  tone,
  auto,
  size = 'md',
  className,
}: {
  value: number
  tone?: string
  auto?: 'usage' | 'ratio'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)))
  const color =
    tone ||
    (auto === 'usage'
      ? pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-600'
      : auto === 'ratio'
        ? pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
        : 'bg-emerald-600')
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-2.5' : 'h-2'
  return (
    <div className={`${h} overflow-hidden rounded-full bg-stone-100 ${className || ''}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
