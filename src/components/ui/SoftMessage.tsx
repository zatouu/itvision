'use client'

import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type MessageVariant = 'success' | 'error' | 'warning' | 'info'

type SoftMessageProps = {
  variant?: MessageVariant
  title?: string
  message: string
  onClose?: () => void
  className?: string
}

const VARIANT_STYLES: Record<MessageVariant, {
  container: string
  iconWrap: string
  iconColor: string
  title: string
  text: string
  close: string
}> = {
  success: {
    container: 'border-green-200/80 bg-gradient-to-r from-green-50 to-emerald-50 dark:border-green-900/40 dark:from-green-950/30 dark:to-emerald-950/25',
    iconWrap: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600 dark:text-green-300',
    title: 'text-green-800 dark:text-green-200',
    text: 'text-green-700 dark:text-green-300',
    close: 'text-green-500 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/40'
  },
  error: {
    container: 'border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50 dark:border-red-900/40 dark:from-red-950/30 dark:to-rose-950/25',
    iconWrap: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-300',
    title: 'text-red-800 dark:text-red-200',
    text: 'text-red-700 dark:text-red-300',
    close: 'text-red-500 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40'
  },
  warning: {
    container: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-yellow-50 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-yellow-950/25',
    iconWrap: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-300',
    title: 'text-amber-800 dark:text-amber-200',
    text: 'text-amber-700 dark:text-amber-300',
    close: 'text-amber-500 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40'
  },
  info: {
    container: 'border-violet-200/80 bg-gradient-to-r from-violet-50 to-indigo-50 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-indigo-950/25',
    iconWrap: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-300',
    title: 'text-violet-800 dark:text-violet-200',
    text: 'text-violet-700 dark:text-violet-300',
    close: 'text-violet-500 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-900/40'
  }
}

function VariantIcon({ variant, className }: { variant: MessageVariant; className: string }) {
  if (variant === 'success') return <CheckCircle2 className={className} />
  if (variant === 'warning') return <TriangleAlert className={className} />
  if (variant === 'error') return <AlertCircle className={className} />
  return <Info className={className} />
}

export default function SoftMessage({
  variant = 'info',
  title,
  message,
  onClose,
  className = ''
}: SoftMessageProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className={`rounded-2xl border p-4 shadow-sm backdrop-blur-sm ${styles.container} ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${styles.iconWrap}`}>
          <VariantIcon variant={variant} className={`h-4 w-4 ${styles.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          {title && <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>}
          <p className={`text-sm leading-relaxed ${styles.text}`}>{message}</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${styles.close}`}
            aria-label="Fermer le message"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
