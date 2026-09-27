'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/market/storefront/Icon'
import { Button } from '@/components/market/storefront/Button'
import { Card } from '@/components/market/storefront/Card'

const inputCls =
  'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500'

export default function RecoverOrderPage() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const submit = async () => {
    try {
      setStatus('sending')
      setMessage(null)

      let csrfToken: string | null = null
      try {
        const csrfRes = await fetch('/api/csrf', { method: 'GET' })
        const csrfData = await csrfRes.json().catch(() => ({}))
        csrfToken = csrfData?.csrfToken || csrfRes.headers.get('X-CSRF-Token')
      } catch {
        csrfToken = null
      }

      const res = await fetch('/api/order/recover-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify({ email, phone: phone || undefined })
      })

      const data = await res.json().catch(() => ({}))
      setMessage(data?.message || "Demande envoyée. Si les informations sont correctes, vous recevrez un email.")
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 7000)
    } catch {
      setMessage("Demande envoyée. Si les informations sont correctes, vous recevrez un email.")
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 7000)
    }
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 dark:bg-slate-950 md:py-12">
      <div className="mx-auto max-w-lg">
        <Card className="p-5 md:p-6">
          <h1 className="text-[20px] font-extrabold text-slate-900 dark:text-white">Retrouver ma commande</h1>
          <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
            Entrez l&apos;email utilisé lors de votre commande. Si vos informations sont correctes, nous vous enverrons
            un ou plusieurs liens de suivi.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</span>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="ex : nom@domaine.com"
                className={inputCls}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Téléphone (optionnel, recommandé)</span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="ex : 77 123 45 67"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Astuce : vous pouvez saisir seulement les derniers chiffres.</p>
            </label>

            <Button
              variant="primary"
              size="lg"
              disabled={status === 'sending'}
              onClick={submit}
              className="w-full"
            >
              {status === 'sending' ? 'Envoi…' : status === 'sent' ? 'Demande envoyée' : 'Envoyer le lien de suivi'}
            </Button>

            {message && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Icon name="checkCircle" size={16} className="mt-px flex-shrink-0" />
                {message}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between text-[13px]">
            <Link href="/" className="font-semibold text-slate-600 underline dark:text-slate-300">
              Retour à l&apos;accueil
            </Link>
            <Link href="/contact" className="font-semibold text-slate-600 underline dark:text-slate-300">
              Contacter le support
            </Link>
          </div>
        </Card>

        <p className="mt-4 flex items-start gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Icon name="shield" size={13} className="mt-px flex-shrink-0" />
          Pour votre sécurité, nous n&apos;affichons jamais vos commandes directement sur cette page.
        </p>
      </div>
    </div>
  )
}
