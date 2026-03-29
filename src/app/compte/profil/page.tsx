'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import SoftMessage from '@/components/ui/SoftMessage'

type Profile = {
  _id: string
  name?: string
  email?: string
  phone?: string
  role?: string
  createdAt?: string
  marketplaceTier?: 'standard' | 'pro' | 'reseller' | 'partner'
  totalMarketplacePurchases?: number
  marketplaceOrderCount?: number
  proRequestedAt?: string | null
  proValidatedAt?: string | null
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  standard: { label: 'Standard', color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200' },
  pro: { label: 'Pro', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
  reseller: { label: 'Revendeur', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-200' },
  partner: { label: 'Partenaire', color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' },
}

const PRO_THRESHOLDS = { minOrders: 3, minPurchases: 150_000 }

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
  const [requestingPro, setRequestingPro] = useState(false)
  const [proMessage, setProMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/client/profile', { method: 'GET', credentials: 'include' })
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
      // Récupérer le token CSRF pour les requêtes authentifiées
      let csrfToken: string | null = null
      try {
        const csrfRes = await fetch('/api/csrf', { method: 'GET', credentials: 'include' })
        const csrfData = await csrfRes.json().catch(() => ({}))
        csrfToken = csrfData?.csrfToken || null
      } catch {
        csrfToken = null
      }

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
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        credentials: 'include',
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
    <div className="min-h-screen page-content bg-gradient-to-br from-green-50 via-white to-violet-50 dark:from-black dark:via-black dark:to-black">
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
            <SoftMessage
              variant="error"
              title="Impossible de charger votre profil"
              message={error}
              onClose={() => setError(null)}
            />
          ) : (
            <div className="space-y-6">
              {success && (
                <SoftMessage
                  variant="success"
                  title="Modification enregistrée"
                  message={success}
                  onClose={() => setSuccess(null)}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">Nom</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-green-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">Téléphone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-green-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100"
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
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-green-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-green-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-gray-100"
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
                  className="rounded-xl bg-gradient-to-r from-green-500 to-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:from-green-600 hover:to-violet-600 disabled:opacity-60"
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

              {/* ══ Section Statut Marketplace ══ */}
              {profile && (() => {
                const tier = profile.marketplaceTier || 'standard'
                const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard
                const orders = profile.marketplaceOrderCount || 0
                const purchases = profile.totalMarketplacePurchases || 0
                const isStandard = tier === 'standard'
                const isEligible = orders >= PRO_THRESHOLDS.minOrders || purchases >= PRO_THRESHOLDS.minPurchases
                const alreadyRequested = !!profile.proRequestedAt
                const orderProgress = Math.min(100, Math.round((orders / PRO_THRESHOLDS.minOrders) * 100))
                const purchaseProgress = Math.min(100, Math.round((purchases / PRO_THRESHOLDS.minPurchases) * 100))

                async function handleRequestPro() {
                  setRequestingPro(true)
                  setProMessage(null)
                  try {
                    let csrfToken: string | null = null
                    try {
                      const csrfRes = await fetch('/api/csrf', { credentials: 'include' })
                      const csrfData = await csrfRes.json().catch(() => ({}))
                      csrfToken = csrfData?.csrfToken || null
                    } catch {}
                    const res = await fetch('/api/client/request-pro', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
                      credentials: 'include',
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(data?.error || 'Erreur')
                    setProMessage(data.message || 'Demande envoyee')
                    setProfile(prev => prev ? { ...prev, proRequestedAt: new Date().toISOString() } : prev)
                  } catch (e) {
                    setProMessage(e instanceof Error ? e.message : 'Erreur')
                  } finally {
                    setRequestingPro(false)
                  }
                }

                return (
                  <div className={`mt-2 rounded-2xl border ${cfg.border} ${cfg.bg} p-5 shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Statut Marketplace</h3>
                      <span className={`${cfg.color} ${cfg.bg} px-3 py-1 rounded-full text-xs font-bold border ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {!isStandard ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          Vous beneficiez des prix wholesale automatiquement.
                        </p>
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">{orders}</span> commandes | <span className="font-medium">{purchases.toLocaleString('fr-FR')} FCFA</span> cumul
                        </div>
                        {profile.proValidatedAt && (
                          <p className="text-xs text-gray-400">Valide depuis le {new Date(profile.proValidatedAt).toLocaleDateString('fr-FR')}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Passez au compte Pro pour acceder aux prix wholesale des la premiere piece.
                        </p>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Commandes ({orders}/{PRO_THRESHOLDS.minOrders})</span>
                              <span>{orderProgress}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${orderProgress}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Achats ({purchases.toLocaleString('fr-FR')}/{PRO_THRESHOLDS.minPurchases.toLocaleString('fr-FR')} FCFA)</span>
                              <span>{purchaseProgress}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${purchaseProgress}%` }} />
                            </div>
                          </div>
                        </div>

                        {proMessage && (
                          <SoftMessage
                            variant={proMessage.toLowerCase().includes('erreur') ? 'error' : 'success'}
                            message={proMessage}
                            className="py-3"
                            onClose={() => setProMessage(null)}
                          />
                        )}

                        {isEligible && !alreadyRequested && (
                          <button
                            onClick={handleRequestPro}
                            disabled={requestingPro}
                            className="w-full rounded-xl bg-gradient-to-r from-green-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:from-green-600 hover:to-violet-600 disabled:opacity-60"
                          >
                            {requestingPro ? 'Envoi...' : 'Demander le passage Pro'}
                          </button>
                        )}
                        {alreadyRequested && !profile.proValidatedAt && (
                          <p className="text-xs text-violet-600 font-medium">Demande en cours de validation par notre equipe.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
