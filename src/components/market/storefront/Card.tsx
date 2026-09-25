import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
