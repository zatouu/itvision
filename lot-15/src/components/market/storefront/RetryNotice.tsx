'use client'

import { RefreshCw } from 'lucide-react'

export default function RetryNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
    <p className="min-w-0 flex-1 basis-48 break-words">{message}</p>
    <button type="button" onClick={onRetry} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-current px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={16} aria-hidden="true"/>Réessayer</button>
  </div>
}