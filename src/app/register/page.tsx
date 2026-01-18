'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, ArrowLeft, Phone, Mail } from 'lucide-react'
import Link from 'next/link'

interface FormData {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
}

export default function RegisterPage() {
  const router = useRouter()
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'CLIENT'
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
      const candidate = params.get('return') || params.get('redirect')
      if (candidate && candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('://')) {
        setReturnTo(candidate)
      }

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
        checkEmailAvailability(email)
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validatePassword = (password: string) => {
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

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null)
      return
    }

    setCheckingEmail(true)
    try {
      const response = await fetch(`/api/auth/register?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setEmailAvailable(data.available)
    } catch (error) {
      console.error('Erreur lors de la vérification d\'email:', error)
      setEmailAvailable(null)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email })
    
    // Debounce la vérification d'email
    const timeoutId = setTimeout(() => {
      checkEmailAvailability(email)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validations côté client
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    const passwordValidation = validatePassword(formData.password)
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim() || undefined,
          password: formData.password,
          role: formData.role
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        // Onboarding fluide: rediriger vers la connexion, email pré-rempli
        const target = `/login?email=${encodeURIComponent(formData.email)}&redirect=${encodeURIComponent(returnTo || '/compte')}`
        setTimeout(() => {
          router.push(target)
        }, 900)
      } else {
        setError(data.error || 'Une erreur est survenue lors de la création du compte')
      }
    } catch (error) {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = validatePassword(formData.password)

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Compte créé avec succès !
            </h1>
            <p className="text-gray-600 mb-6">
              Votre compte IT Vision Plus a été créé. Un email de bienvenue vous a été envoyé.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">
              Redirection vers la connexion...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Créer un compte
            </h1>
            <p className="text-gray-600">
              Rejoignez IT Vision Plus pour accéder à nos services
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom complet */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Votre nom complet"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email *
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="votre.email@example.com"
                  className={`w-full px-4 py-3 pl-10 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    emailAvailable === false ? 'border-red-300' : 
                    emailAvailable === true ? 'border-green-300' : 'border-gray-300'
                  }`}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  </div>
                )}
                {!checkingEmail && emailAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
                {!checkingEmail && emailAvailable === false && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                )}
              </div>
              {emailAvailable === false && (
                <p className="text-sm text-red-600 mt-1">Cette adresse email est déjà utilisée</p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone (optionnel)
              </label>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+221 77 123 45 67"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                />
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Type de compte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de compte *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as FormData['role'] })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              >
                <option value="CLIENT">Client - Accès au portail client</option>
                <option value="TECHNICIAN">Technicien - Interface mobile</option>
                <option value="ADMIN">Administrateur - Dashboard complet</option>
              </select>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {/* Password Requirements */}
            {formData.password && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Critères du mot de passe :</h3>
                <ul className="text-xs space-y-1">
                  <li className={`flex items-center ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.minLength ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Au moins 8 caractères
                  </li>
                  <li className={`flex items-center ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-gray-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasUpperCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Une majuscule
                  </li>
                  <li className={`flex items-center ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-gray-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasLowerCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Une minuscule
                  </li>
                  <li className={`flex items-center ${passwordValidation.hasNumbers ? 'text-green-600' : 'text-gray-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasNumbers ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Un chiffre
                  </li>
                  <li className={`flex items-center ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasSpecialChar ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Un caractère spécial
                  </li>
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || emailAvailable === false || !passwordValidation.isValid}
              className="w-full bg-gradient-to-r from-purple-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Créer mon compte
                </>
              )}
            </button>
          </form>

          {/* Navigation */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{' '}
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                Se connecter
              </Link>
            </p>
            <Link
              href="/"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}