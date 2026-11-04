import { cn } from '@/lib/utils';
import { Icon } from './Icon';

export interface CountdownChipProps {
  time: string;
  urgent?: boolean;
  className?: string;
}

export function CountdownChip({
  time,
  urgent = false,
  className,
}: CountdownChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold',
        urgent
          ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        className
      )}
    >
      <Icon name="clock" size={12} />
      <span className="tabular-nums">{time}</span>
    </span>
  );
}
