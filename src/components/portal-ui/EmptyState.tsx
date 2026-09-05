import type { LucideIcon } from 'lucide-react'
import SoftMessage from '@/components/ui/SoftMessage'
import { CARD_DASHED } from './tokens'

// État vide unifié.
//  - défaut : carte en pointillés + icône + message (+ action optionnelle)
//  - soft   : même carte avec un SoftMessage riche (titre + message)
//  - bare   : simple bloc centré, sans carte
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  soft,
  bare,
  className,
  iconClassName,
}: {
  icon?: LucideIcon
  title: string
  message?: string
  action?: React.ReactNode
  soft?: boolean
  bare?: boolean
  className?: string
  iconClassName?: string
}) {
  if (soft) {
    return (
      <div className={`${CARD_DASHED} p-10 text-center sm:p-12 ${className || ''}`}>
        <SoftMessage
          variant="info"
          title={title}
          message={message || ''}
          className="mx-auto max-w-xl text-left"
        />
      </div>
    )
  }

  if (bare) {
    return (
      <div className={`py-8 text-center ${className || ''}`}>
        {Icon && <Icon className={`mx-auto mb-2 h-8 w-8 ${iconClassName || 'text-stone-300'}`} />}
        <p className="text-sm text-stone-400">{title}</p>
        {message && <p className="mt-1 text-xs text-stone-400">{message}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center p-10 text-center sm:p-12 ${CARD_DASHED} ${className || ''}`}>
      {Icon && <Icon className={`mb-3 h-10 w-10 ${iconClassName || 'text-stone-300'}`} />}
      <p className="text-sm text-stone-500">{title}</p>
      {message && <p className="mt-1 max-w-md text-xs text-stone-400">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
