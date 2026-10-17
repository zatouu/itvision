import { cn } from '@/lib/utils';

export type ProgressTone = 'emerald' | 'violet' | 'mixed';

export interface ProgressBarProps {
  value: number;
  max: number;
  tone?: ProgressTone;
  className?: string;
}

const toneMap: Record<ProgressTone, string> = {
  emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  violet: 'bg-gradient-to-r from-violet-500 to-violet-600',
  mixed: 'bg-gradient-to-r from-emerald-500 to-violet-600',
};

export function ProgressBar({
  value,
  max,
  tone = 'emerald',
  className,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800',
        className
      )}
    >
      <div
        className={cn('h-full rounded-full transition-all', toneMap[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
