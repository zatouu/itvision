'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Profile = {
  _id: string
  name?: string
  email?: string
  phone?: string
  role?: string
  createdAt?: string
}

export default function CompteProfilPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [profile, setProfile] = useState<Profile | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/client/profile', { method: 'GET' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'Impossible de charger le profil')
        }

        if (cancelled) return
        const p = data?.profile as Profile
        setProfile(p)
        setName(p?.name || '')
        setPhone(p?.phone || '')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Erreur lors du chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    setSuccess(null)
    setError(null)

    if (!name.trim()) {
      setError('Le nom est requis.')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim() || undefined
      }

      const wantsPasswordChange = Boolean(currentPassword.trim() || newPassword.trim())
      if (wantsPasswordChange) {
        if (!currentPassword.trim() || !newPassword.trim()) {
          setError('Pour changer le mot de passe, renseignez les deux champs.')
          return
        }
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      const res = await fetch('/api/client/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Impossible de mettre à jour le profil')
      }

      setSuccess('Profil mis à jour.')
      const p = data?.profile as Profile
      setProfile(prev => ({ ...(prev || ({} as any)), ...(p || {}) }))
      setCurrentPassword('')
      setNewPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen page-content bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-black dark:via-black dark:to-black">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Mon compte</div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Profil</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">Mettez à jour vos informations.</p>
          </div>
          <Link
            href="/compte"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            Retour
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950/70">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-600 dark:text-gray-300">Chargement…</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {success}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">Nom</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">Téléphone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100"
                    placeholder="Ex: 77 123 45 67"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">Email</label>
                  <input
                    value={profile?.email || ''}
                    readOnly
                    className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:text-gray-300"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Changer le mot de passe (optionnel)</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Mot de passe actuel</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-gray-100"
                    />
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Minimum 6 caractères.</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:from-emerald-700 hover:to-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>

                <Link
                  href="/api/auth/logout"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                >
                  Se déconnecter
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
