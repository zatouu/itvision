import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type BadgeTone =
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'blue'
  | 'red'
  | 'slate'
  | 'ink';

export interface BadgeProps {
  tone?: BadgeTone | (string & {});
  children?: ReactNode;
  className?: string;
}

const toneMap: Record<string, string> = {
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  violet:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900',
  amber:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
  slate:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  ink: 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white',
};

export function Badge({ tone = 'slate', children, className }: BadgeProps) {
  const toneKey = typeof tone === 'string' && tone in toneMap ? tone : 'slate';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold',
        toneMap[toneKey],
        className
      )}
    >
      {children}
    </span>
  );
}
