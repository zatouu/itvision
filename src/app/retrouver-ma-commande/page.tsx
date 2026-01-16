'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4">
      <div className="max-w-lg mx-auto pt-12">
        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">Retrouver ma commande</h1>
          <p className="text-sm text-gray-600 mt-2">
            Entrez l&apos;email utilisé lors de votre commande. Si vos informations sont correctes, nous vous enverrons
            un ou plusieurs liens de suivi.
          </p>

          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="ex: nom@domaine.com"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Téléphone (optionnel, recommandé)</span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="tel"
                placeholder="ex: 77 123 45 67"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="mt-1 text-xs text-gray-500">Astuce: vous pouvez saisir seulement les derniers chiffres.</p>
            </label>

            <button
              disabled={status === 'sending'}
              onClick={submit}
              className="w-full rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 disabled:opacity-60"
            >
              {status === 'sending' ? 'Envoi…' : status === 'sent' ? 'Demande envoyée' : 'Envoyer le lien de suivi'}
            </button>

            {message && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
                {message}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/" className="text-gray-700 hover:text-gray-900 underline">
              Retour à l&apos;accueil
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-gray-900 underline">
              Contacter le support
            </Link>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Pour votre sécurité, nous n&apos;affichons jamais vos commandes directement sur cette page.
        </div>
      </div>
    </div>
  )
}
