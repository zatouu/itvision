'use client'
import { useState } from 'react'
import { BellRing, Loader2, Smartphone } from 'lucide-react'
import { CARD } from '@/components/portal-ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { NOTIFY_GROUPS } from '@/lib/company-rights'

/** Réglages personnels du membre : alertes sur ce téléphone / ordinateur, par thème. Enregistrés immédiatement. */
export default function MyNotificationsSection({ muted, onChange }: { muted: string[]; onChange: (muted: string[]) => void }) {
  const push = usePushNotifications()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const toggleGroup = async (key: string, categories: string[], enabled: boolean) => {
    const next = enabled ? muted.filter(c => !categories.includes(c)) : [...new Set([...muted, ...categories])]
    const previous = muted
    onChange(next)
    setSavingKey(key); setError('')
    try {
      const res = await fetch('/api/client-enterprise/me', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyMuted: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      onChange(previous)
      setError('Réglage non enregistré, réessayez.')
    } finally { setSavingKey(null) }
  }

  return (
    <div className={`${CARD} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <BellRing className="w-4 h-4 text-emerald-700" />
        <h3 className="text-sm font-semibold text-stone-900">Mes alertes</h3>
      </div>
      <p className="text-xs text-stone-500 -mt-2">Réglage personnel. Tout reste consultable dans la cloche de votre espace.</p>

      {push.supported && push.permission !== 'granted' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <Smartphone className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <p className="flex-1 text-sm text-emerald-900">
            {push.permission === 'denied'
              ? 'Les alertes sont bloquées par votre navigateur. Autorisez-les dans les réglages du site pour les recevoir.'
              : 'Activez les alertes sur cet appareil pour être prévenu dès qu’un projet avance.'}
          </p>
          {push.permission !== 'denied' && (
            <button onClick={() => push.requestPermission()} disabled={push.subscribing}
              className="self-start sm:self-auto rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
              {push.subscribing ? 'Activation…' : 'Activer'}
            </button>
          )}
        </div>
      )}

      <ul className="divide-y divide-stone-100">
        {NOTIFY_GROUPS.map(g => {
          const enabled = !g.categories.some(c => muted.includes(c))
          return (
            <li key={g.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">{g.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{g.hint}</p>
              </div>
              <button type="button" role="switch" aria-checked={enabled} aria-label={g.label}
                onClick={() => toggleGroup(g.key, g.categories, !enabled)} disabled={savingKey !== null}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-emerald-600' : 'bg-stone-200'}`}>
                {savingKey === g.key
                  ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" />
                  : <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />}
              </button>
            </li>
          )
        })}
      </ul>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
