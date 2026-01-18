'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Wrench, Shield, ArrowRight, Eye, EyeOff, LogIn, Lock, ArrowLeft, Home } from 'lucide-react'

interface LoginCredentials {
  email: string
  password: string
  userType?: 'client' | 'technician' | 'admin'
}

export default function UnifiedLoginPage() {
  const router = useRouter()
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  })
  // Un seul formulaire: plus de sélection de profil
  const [selectedUserType, setSelectedUserType] = useState<'client' | 'technician' | 'admin' | null>('client')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const [resetRequested, setResetRequested] = useState(false)
  const [mfaRequired, setMfaRequired] = useState<{ required: boolean, userId?: string }>({ required: false })
  const [mfaCode, setMfaCode] = useState('')

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const candidate = params.get('return') || params.get('redirect')
      if (candidate && candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('://')) {
        setReturnTo(candidate)
      }

      const prefillEmail = params.get('email')
      if (prefillEmail) {
        setCredentials(prev => ({ ...prev, email: prefillEmail }))
      } else {
        try {
          const remembered = localStorage.getItem('rememberEmail')
          if (remembered) setCredentials(prev => ({ ...prev, email: remembered }))
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const userTypes = [
    {
      type: 'client' as const,
      title: 'Client',
      description: 'Accès au portail client pour suivre vos projets',
      icon: User,
      color: 'from-emerald-500 to-emerald-600',
      borderColor: 'border-blue-200 hover:border-blue-400',
      bgColor: 'bg-emerald-50'
    },
    {
      type: 'technician' as const,
      title: 'Technicien',
      description: 'Interface mobile pour rapports et interventions',
      icon: Wrench,
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-200 hover:border-green-400',
      bgColor: 'bg-green-50'
    },
    {
      type: 'admin' as const,
      title: 'Administrateur',
      description: 'Dashboard de gestion et supervision',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      borderColor: 'border-red-200 hover:border-red-400',
      bgColor: 'bg-red-50'
    }
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // Plus de sélection obligatoire: un seul formulaire commun

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...credentials, remember })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Login response:', data) // Debug log
        
        if (data.mfa_required && data.userId) {
          setMfaRequired({ required: true, userId: data.userId })
          return
        }
        
        // Redirection selon rôle, avec PRODUCT_MANAGER vers admin/produits
        if (data.user?.role) {
          const role = String(data.user.role).toUpperCase()
          console.log('User role:', role, 'Redirecting to:', data.redirectUrl) // Debug log

          if (returnTo) {
            window.location.href = returnTo
            return
          }
          
          // Utiliser l'URL de redirection de l'API si disponible
          const redirectUrl = data.redirectUrl || (
            role === 'PRODUCT_MANAGER' ? '/admin/produits' :
            role === 'ADMIN' ? '/admin' :
            role === 'TECHNICIAN' ? '/tech-interface' :
            '/compte'
          )
          
          console.log('Final redirect URL:', redirectUrl) // Debug log
          
          // Utiliser window.location.href pour forcer la redirection
          window.location.href = redirectUrl
        } else {
          console.log('No user role found, redirecting to client-portal') // Debug log
          router.push(returnTo || '/compte')
        }
        
        if (remember) {
          try { localStorage.setItem('rememberEmail', credentials.email) } catch {}
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Identifiants incorrects')
      }
    } catch (error) {
      setError('Erreur de connexion. Veuillez réessayer.')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedType = userTypes.find(type => type.type === selectedUserType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Bouton de retour */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="group flex items-center gap-3 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-emerald-600 px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-emerald-300"
        >
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 group-hover:from-emerald-100 group-hover:to-emerald-200 rounded-lg transition-all duration-300">
            <ArrowLeft className="h-4 w-4 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Retour au site</span>
            <span className="text-xs text-gray-500 group-hover:text-emerald-500">Accueil IT Vision</span>
          </div>
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion IT Vision</h1>
          <p className="text-gray-600">Accédez à votre espace personnalisé</p>
        </div>

        {/* Sélection de profil retirée: un seul formulaire */}

        {/* Formulaire de connexion */}
        {true && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header du formulaire */}
            <div className="flex items-center mb-6" />

            {/* Formulaire */}
            {!mfaRequired.required ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="votre.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    placeholder="••••••••"
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

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r from-purple-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Se connecter
                  </>
                )}
              </button>

              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-gray-600">
                  <input type="checkbox" className="mr-2" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
                  Se souvenir de moi
                </label>
                <a
                  href="/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Mot de passe oublié ?
                </a>
              </div>

              {resetRequested && (
                <p className="text-xs text-green-600">Si l'email existe, un lien de réinitialisation a été généré (console dev).</p>
              )}
            </form>
            ) : (
            <form onSubmit={async (e)=>{
              e.preventDefault()
              setError('')
              const res = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: mfaRequired.userId, code: mfaCode, remember })
              })
              if (res.ok) {
                const data = await res.json()

                if (returnTo) return router.push(returnTo)

                const role = String(data.user?.role || '').toUpperCase()
                if (role === 'ADMIN') return router.push('/admin-reports')
                if (role === 'TECHNICIAN') return router.push('/tech-interface')
                return router.push('/compte')
              } else {
                const j = await res.json(); setError(j.error || 'Code invalide')
              }
            }} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code 2FA (6 chiffres)</label>
                <input
                  value={mfaCode}
                  onChange={(e)=>setMfaCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="000000"
                />
              </div>
              <button className={`w-full bg-gradient-to-r from-purple-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300`}>Vérifier</button>
            </form>
            )}

            {/* Aide */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Pas encore de compte ?{' '}
                <a 
                  href="/register"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Créer un compte
                </a>
              </p>
              <p className="text-sm text-gray-600">
                Problème de connexion ?{' '}
                <a 
                  href="https://wa.me/221774133440?text=Bonjour, j'ai besoin d'aide pour accéder à mon compte IT Vision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Contactez le support
                </a>
              </p>
              
              {/* Bouton retour mobile */}
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors duration-300"
                >
                  <Home className="h-4 w-4" />
                  <span className="text-sm font-medium">Retour à l'accueil</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}