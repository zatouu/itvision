'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

function parseTrackingInput(input: string): { orderId?: string; token?: string; error?: string } {
  const trimmed = input.trim()
  if (!trimmed) return { error: 'Veuillez saisir un lien ou un ID de commande.' }

  // 1) Si l'utilisateur colle une URL complète
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      const token = url.searchParams.get('token') || url.searchParams.get('t') || undefined

      // Essayer d'extraire l'orderId depuis le chemin /commandes/<id>
      const parts = url.pathname.split('/').filter(Boolean)
      const commandesIndex = parts.findIndex(p => p === 'commandes')
      const orderId = commandesIndex >= 0 ? parts[commandesIndex + 1] : undefined

      if (!orderId) return { error: 'Impossible de trouver l’ID de commande dans ce lien.' }
      if (!token) return { orderId, token: undefined }
      return { orderId, token }
    } catch {
      // fallthrough
    }
  }

  // 2) Si l'utilisateur colle directement /commandes/<id>?token=...
  if (trimmed.startsWith('/')) {
    try {
      const url = new URL(trimmed, 'https://local.example')
      const token = url.searchParams.get('token') || url.searchParams.get('t') || undefined
      const parts = url.pathname.split('/').filter(Boolean)
      const commandesIndex = parts.findIndex(p => p === 'commandes')
      const orderId = commandesIndex >= 0 ? parts[commandesIndex + 1] : undefined

      if (!orderId) return { error: 'Impossible de trouver l’ID de commande dans ce lien.' }
      return { orderId, token }
    } catch {
      // fallthrough
    }
  }

  // 3) Sinon, on assume que c'est un orderId
  return { orderId: trimmed }
}

export default function ReclamerCommandePage() {
  const [trackingInput, setTrackingInput] = useState('')
  const [tokenOverride, setTokenOverride] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const parsed = useMemo(() => parseTrackingInput(trackingInput), [trackingInput])

  const effectiveOrderId = parsed.orderId
  const effectiveToken = tokenOverride.trim() || parsed.token

  async function handleClaim() {
    setError(null)
    setSuccess(null)

    if (parsed.error) {
      setError(parsed.error)
      return
    }
    if (!effectiveOrderId) {
      setError('ID de commande manquant.')
      return
    }
    if (!effectiveToken) {
      setError('Token manquant. Collez le lien de suivi complet, ou saisissez le token.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/order/${encodeURIComponent(effectiveOrderId)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: effectiveToken })
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error || 'Impossible de réclamer la commande.')
        return
      }

      setSuccess(data?.alreadyClaimed ? 'Commande déjà associée à votre compte.' : 'Commande associée à votre compte avec succès.')
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen page-content bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-black dark:via-black dark:to-black">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Mon compte</div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Réclamer une commande</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Si vous avez commandé en invité, associez la commande à votre compte depuis le lien de suivi.
            </p>
          </div>
          <Link
            href="/compte"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            Retour
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950/70">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">Lien de suivi ou ID de commande</label>
              <input
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
                placeholder="Collez ici: /commandes/XXX?token=... ou l’URL complète"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100"
              />
              {effectiveOrderId && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  Détecté: <span className="font-semibold">{effectiveOrderId}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">Token (si nécessaire)</label>
              <input
                value={tokenOverride}
                onChange={e => setTokenOverride(e.target.value)}
                placeholder="Laissez vide si le token est déjà dans le lien"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                {success}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleClaim}
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:from-emerald-700 hover:to-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Association…' : 'Associer à mon compte'}
              </button>

              <Link
                href="/retrouver-ma-commande"
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
              >
                Je n’ai plus mon lien
              </Link>
            </div>

            <div className="pt-2 text-xs text-gray-600 dark:text-gray-300">
              Astuce: ouvrez d’abord votre lien de suivi, puis copiez-collez l’URL ici.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
