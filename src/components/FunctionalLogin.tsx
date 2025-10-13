'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Wrench, Shield, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

interface LoginFormProps {
  userType?: 'client' | 'technician' | 'admin'
}

export default function FunctionalLogin({ userType }: LoginFormProps) {
  const router = useRouter()
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          userType
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Redirection selon le rôle
        switch (data.user.role.toLowerCase()) {
          case 'admin':
            router.push('/admin-reports')
            break
          case 'technician':
            router.push('/tech-interface')
            break
          case 'client':
            router.push('/client-portal')
            break
          default:
            router.push('/')
        }
      } else {
        setError(data.error || 'Erreur de connexion')
      }
    } catch (error) {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  const getUserTypeInfo = () => {
    switch (userType) {
      case 'admin':
        return {
          icon: Shield,
          title: 'Connexion Administrateur',
          description: 'Accès au panneau d\'administration',
          color: 'red',
          placeholder: 'admin@itvisionplus.sn'
        }
      case 'technician':
        return {
          icon: Wrench,
          title: 'Connexion Technicien',
          description: 'Accès aux outils de maintenance',
          color: 'blue',
          placeholder: 'moussa.diop@itvisionplus.sn'
        }
      case 'client':
        return {
          icon: User,
          title: 'Connexion Client',
          description: 'Accès à votre espace personnel',
          color: 'green',
          placeholder: 'amadou.ba@sonatel.sn'
        }
      default:
        return {
          icon: User,
          title: 'Connexion',
          description: 'Accès à votre compte',
          color: 'blue',
          placeholder: 'votre@email.com'
        }
    }
  }

  const typeInfo = getUserTypeInfo()
  const IconComponent = typeInfo.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 bg-${typeInfo.color}-100 rounded-full mb-4`}>
              <IconComponent className={`h-8 w-8 text-${typeInfo.color}-600`} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {typeInfo.title}
            </h1>
            <p className="text-gray-600">
              {typeInfo.description}
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
                placeholder={typeInfo.placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                  placeholder="Votre mot de passe"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
              className={`w-full bg-${typeInfo.color}-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-${typeInfo.color}-700 focus:outline-none focus:ring-2 focus:ring-${typeInfo.color}-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
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
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Comptes de démonstration :</h3>
            <div className="text-xs text-gray-600 space-y-1">
              {userType === 'admin' && (
                <div>Admin: admin@itvisionplus.sn / Admin123!</div>
              )}
              {userType === 'technician' && (
                <>
                  <div>Tech 1: moussa.diop@itvisionplus.sn / Tech123!</div>
                  <div>Tech 2: omar.fall@itvisionplus.sn / Tech123!</div>
                </>
              )}
              {userType === 'client' && (
                <>
                  <div>Client 1: amadou.ba@sonatel.sn / Client123!</div>
                  <div>Client 2: fatou.diallo@cbao.sn / Client123!</div>
                </>
              )}
              {!userType && (
                <>
                  <div>Admin: admin@itvisionplus.sn / Admin123!</div>
                  <div>Technicien: moussa.diop@itvisionplus.sn / Tech123!</div>
                  <div>Client: amadou.ba@sonatel.sn / Client123!</div>
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}