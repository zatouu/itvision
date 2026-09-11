import { cn } from '@/lib/utils';

export type LiveDotTone = 'red' | 'emerald' | 'green';

export interface LiveDotProps {
  tone?: LiveDotTone | (string & {});
  className?: string;
}

const toneMap: Record<string, string> = {
  red: 'text-red-600 dark:text-red-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  green: 'text-emerald-600 dark:text-emerald-400',
};

const dotMap: Record<string, string> = {
  red: 'bg-red-600 dark:bg-red-400',
  emerald: 'bg-emerald-600 dark:bg-emerald-400',
  green: 'bg-emerald-600 dark:bg-emerald-400',
};

export function LiveDot({ tone = 'red', className }: LiveDotProps) {
  const toneKey = typeof tone === 'string' && tone in toneMap ? tone : 'red';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider',
        toneMap[toneKey],
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full animate-ping',
          dotMap[toneKey]
        )}
        style={{ animationDuration: '2s' }}
      />
      Live
    </span>
  );
}
