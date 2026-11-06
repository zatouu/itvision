import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'violet'
  | 'outline'
  | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | (string & {});
  size?: ButtonSize | (string & {});
  children?: ReactNode;
  className?: string;
}

const sizes: Record<string, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-lg',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-[15px] rounded-xl',
};

const variants: Record<string, string> = {
  primary:
    'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md',
  secondary:
    'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  violet:
    'bg-violet-600 text-white hover:bg-violet-700 shadow-sm hover:shadow-md',
  outline:
    'bg-transparent text-emerald-700 border border-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500 dark:hover:bg-emerald-950/40',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...rest
}: ButtonProps) {
  const variantKey = typeof variant === 'string' && variant in variants ? variant : 'primary';
  const sizeKey = typeof size === 'string' && size in sizes ? size : 'md';
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        sizes[sizeKey],
        variants[variantKey],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
