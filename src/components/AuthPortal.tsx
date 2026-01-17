'use client'

import { useState } from 'react'
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Shield, 
  Wrench, 
  Settings,
  ArrowRight,
  Building
} from 'lucide-react'
import Link from 'next/link'

interface AuthPortalProps {
  userType: 'client' | 'admin' | 'technician'
  onLogin?: (credentials: any) => void
}

export default function AuthPortal({ userType, onLogin }: AuthPortalProps) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    remember: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const portalConfig = {
    client: {
      title: 'Portail Client',
      subtitle: 'Accédez à vos projets et rapports',
      icon: Building,
      color: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50'
    },
    admin: {
      title: 'Portail Administrateur',
      subtitle: 'Gestion et supervision complète',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50 to-pink-50'
    },
    technician: {
      title: 'Portail Technicien',
      subtitle: 'Interface de terrain et rapports',
      icon: Wrench,
      color: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-emerald-50'
    }
  }

  const config = portalConfig[userType]
  const IconComponent = config.icon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Simulation d'authentification
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Validation basique pour la démo
      if (credentials.username && credentials.password) {
        onLogin?.(credentials)
      } else {
        setError('Veuillez remplir tous les champs')
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex items-center justify-center p-4`}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${config.color} rounded-full mb-4 shadow-lg`}>
            <IconComponent className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {config.title}
          </h1>
          <p className="text-gray-600">
            {config.subtitle}
          </p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Champ utilisateur */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre nom d'utilisateur"
                />
              </div>
            </div>

            {/* Champ mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={credentials.remember}
                onChange={(e) => setCredentials(prev => ({ ...prev, remember: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                Se souvenir de moi
              </label>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-gradient-to-r ${config.color} text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 flex items-center justify-center`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-5 w-5 mr-2" />
                  Se connecter
                </div>
              )}
            </button>
          </form>

          {/* Liens utiles */}
          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
              Mot de passe oublié ?
            </a>
          </div>

          {/* Informations de contact */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-2">Besoin d'aide ?</p>
              <a 
                href="tel:+221774133440" 
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                +221 77 413 34 40
              </a>
            </div>
          </div>
        </div>

        {/* Retour à l'accueil */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}