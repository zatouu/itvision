import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface SectionProps {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Section({
  title,
  subtitle,
  right,
  children,
  className,
}: SectionProps) {
  return (
    <section className={cn('px-4 md:px-6', className)}>
      {(title || right) && (
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            {title && (
              <h2 className="text-base md:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
