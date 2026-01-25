'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, BadgeCheck, CheckCircle, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, Sparkles, User, UserPlus } from 'lucide-react'

interface FormData {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

function sanitizeRedirect(candidate: string | null): string | null {
  if (!candidate) return null
  if (!candidate.startsWith('/')) return null
  if (candidate.startsWith('//')) return null
  if (candidate.includes('://')) return null
  return candidate
}

function validatePassword(password: string) {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  return {
    minLength: password.length >= minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
  }
}

function getPasswordStrength(v: ReturnType<typeof validatePassword>) {
  const score = [v.minLength, v.hasUpperCase, v.hasLowerCase, v.hasNumbers, v.hasSpecialChar].filter(Boolean).length
  const pct = Math.round((score / 5) * 100)
  const label = score <= 2 ? 'Faible' : score === 3 ? 'Moyen' : score === 4 ? 'Bon' : 'Excellent'
  const barClass = score <= 2 ? 'bg-red-500' : score === 3 ? 'bg-amber-500' : score === 4 ? 'bg-emerald-500' : 'bg-emerald-600'
  return { score, pct, label, barClass }
}

export default function MarketCreateAccountPage() {
  const router = useRouter()

  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const candidate = sanitizeRedirect(params.get('return') || params.get('redirect'))
      if (candidate) setReturnTo(candidate)

      const name = params.get('name')
      const email = params.get('email')
      const phone = params.get('phone')

      setFormData(prev => ({
        ...prev,
        name: name || prev.name,
        email: email || prev.email,
        phone: phone || prev.phone
      }))

      if (email) {
        void checkEmailAvailability(email)
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const passwordValidation = useMemo(() => validatePassword(formData.password), [formData.password])
  const strength = useMemo(() => getPasswordStrength(passwordValidation), [passwordValidation])

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null)
      return
    }

    setCheckingEmail(true)
    try {
      const response = await fetch(`/api/auth/register?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setEmailAvailable(Boolean(data.available))
    } catch {
      setEmailAvailable(null)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleEmailChange = (email: string) => {
    setFormData(prev => ({ ...prev, email }))

    const timeoutId = setTimeout(() => {
      void checkEmailAvailability(email)
    }, 450)

    return () => clearTimeout(timeoutId)
  }

  const targetAfterAuth = returnTo || '/achats-groupes'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (!passwordValidation.isValid) {
      setError('Le mot de passe ne respecte pas les critères de sécurité')
      return
    }

    if (emailAvailable === false) {
      setError('Cette adresse email est déjà utilisée')
      return
    }

    setIsLoading(true)

    try {
      // 1) Register (CLIENT)
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim() || undefined,
          password: formData.password,
          role: 'CLIENT'
        })
      })

      const registerData = await registerRes.json().catch(() => ({}))

      if (!registerRes.ok) {
        setError(registerData.error || 'Une erreur est survenue lors de la création du compte')
        return
      }

      // 2) Auto-login (sets auth-token cookie)
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          remember: true
        })
      })

      const loginData = await loginRes.json().catch(() => ({}))

      if (!loginRes.ok) {
        const fallbackLoginUrl = `/login?email=${encodeURIComponent(formData.email)}&redirect=${encodeURIComponent(targetAfterAuth)}`
        setIsSuccess(true)
        setTimeout(() => {
          router.push(fallbackLoginUrl)
        }, 800)
        return
      }

      setIsSuccess(true)
      const redirectUrl = typeof loginData?.redirectUrl === 'string' && loginData.redirectUrl.startsWith('/') ? loginData.redirectUrl : targetAfterAuth
      setTimeout(() => {
        router.push(redirectUrl)
      }, 650)
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600" />
            <div className="p-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                <CheckCircle className="h-7 w-7 text-emerald-700" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Compte créé</h1>
              <p className="mt-2 text-gray-600">Connexion automatique en cours…</p>
              <div className="mt-6 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
              <p className="mt-6 text-xs text-gray-500">Vous allez être redirigé(e) vers votre parcours d'achat.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-2">
          {/* Side panel */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-cyan-700 to-blue-800 p-8 text-white shadow-2xl">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-4 w-4" />
                Catalogue Market
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Créez votre compte en 1 minute</h1>
              <p className="mt-3 max-w-md text-white/85">
                Un compte est requis pour finaliser vos achats, rejoindre un achat groupé et retrouver votre historique.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 text-emerald-200" />
                  <div>
                    <p className="font-semibold">Suivi & historique</p>
                    <p className="text-sm text-white/80">Commandes, achats groupés, confirmations et statuts au même endroit.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-200" />
                  <div>
                    <p className="font-semibold">Accès sécurisé</p>
                    <p className="text-sm text-white/80">Session chiffrée via cookie httpOnly (auth-token).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 text-emerald-200" />
                  <div>
                    <p className="font-semibold">Mot de passe renforcé</p>
                    <p className="text-sm text-white/80">Critères visibles + indicateur de robustesse.</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs text-white/80">
                  En créant un compte, vous acceptez nos conditions. Nous n’affichons jamais votre téléphone publiquement.
                </p>
              </div>

              <div className="mt-6 text-xs text-white/70">
                Redirection après inscription : <span className="font-semibold text-white">{targetAfterAuth}</span>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600" />
            <div className="p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Créer un compte</h2>
                  <p className="mt-1 text-sm text-gray-600">Rapide, simple, et pensé pour l’achat.</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
                  <UserPlus className="h-5 w-5" />
                </div>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Impossible de créer le compte</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">Nom complet *</label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 pl-10 text-gray-900 shadow-sm outline-none ring-0 transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex: Cheikh Ndiaye"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">Adresse email *</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full rounded-2xl border bg-white/80 px-4 py-3 pl-10 pr-10 text-gray-900 shadow-sm outline-none transition focus:ring-4 ${
                    emailAvailable === false
                      ? 'border-red-200 focus:border-red-300 focus:ring-red-100'
                      : emailAvailable === true
                        ? 'border-emerald-200 focus:border-emerald-300 focus:ring-emerald-100'
                        : 'border-gray-200 focus:border-emerald-300 focus:ring-emerald-100'
                  }`}
                  placeholder="votre.email@example.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
                  </div>
                )}
              </div>
              {emailAvailable === false && (
                <p className="mt-1 text-xs text-red-600">Email déjà utilisé. Connectez-vous plutôt.</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">Téléphone</label>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 pl-10 text-gray-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex: 77 123 45 67"
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">Mot de passe *</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 pr-10 text-gray-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Robustesse</span>
                  <span className="font-semibold text-gray-800">{strength.label}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full ${strength.barClass} transition-all`} style={{ width: `${strength.pct}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                  <p className={passwordValidation.minLength ? 'text-emerald-700' : ''}>• 8+ caractères</p>
                  <p className={passwordValidation.hasUpperCase ? 'text-emerald-700' : ''}>• 1 majuscule</p>
                  <p className={passwordValidation.hasLowerCase ? 'text-emerald-700' : ''}>• 1 minuscule</p>
                  <p className={passwordValidation.hasNumbers ? 'text-emerald-700' : ''}>• 1 chiffre</p>
                  <p className={passwordValidation.hasSpecialChar ? 'text-emerald-700' : ''}>• 1 caractère spécial</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-700">Confirmer *</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 pr-10 text-gray-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-emerald-700 hover:to-blue-700 disabled:opacity-60"
            >
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-0" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Création…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Créer mon compte
                  </>
                )}
              </span>
            </button>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>Connexion automatique après création</span>
                </div>
                <Link href={targetAfterAuth} className="font-semibold text-gray-700 hover:underline">
                  Retour
                </Link>
              </div>

              <div className="mt-6 text-sm text-gray-600 text-center">
                Déjà un compte ?{' '}
                <Link
                  href={`/login?email=${encodeURIComponent(formData.email)}&redirect=${encodeURIComponent(targetAfterAuth)}`}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  Se connecter
                </Link>
              </div>
              </form>

              <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
                <Lock className="h-4 w-4" />
                <span>Vos infos restent privées. Aucun partage public.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
