'use client'

import { useState } from 'react'
import { User, Lock, Eye, EyeOff, LogIn, Shield, Key, ArrowRight } from 'lucide-react'

interface ClientLoginProps {
  onLogin: (credentials: { projectId: string, accessCode: string }) => void
}

export default function ClientLogin({ onLogin }: ClientLoginProps) {
  const [credentials, setCredentials] = useState({
    projectId: '',
    accessCode: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Simulated client accounts for demo
  const demoAccounts = [
    {
      projectId: 'PRJ-001',
      accessCode: 'SEC2024',
      clientName: 'Amadou Ba',
      company: 'IT Solutions SARL',
      project: 'Installation vidéosurveillance siège'
    },
    {
      projectId: 'PRJ-002',
      accessCode: 'MAINT24',
      clientName: 'Aïssatou Diop',
      company: 'Commerce Plus',
      project: 'Maintenance préventive Q1'
    },
    {
      projectId: 'PRJ-003',
      accessCode: 'ACCESS24',
      clientName: 'Moussa Kébé',
      company: 'Résidence Almadies',
      project: 'Extension contrôle d\'accès'
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simulate API call
    setTimeout(() => {
      const account = demoAccounts.find(
        acc => acc.projectId.toLowerCase() === credentials.projectId.toLowerCase() &&
                acc.accessCode === credentials.accessCode
      )

      if (account) {
        onLogin(credentials)
      } else {
        setError('ID projet ou code d\'accès incorrect')
      }
      setIsLoading(false)
    }, 1500)
  }

  const tryDemoAccount = (account: typeof demoAccounts[0]) => {
    setCredentials({
      projectId: account.projectId,
      accessCode: account.accessCode
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Portail Client</h1>
          <p className="text-blue-100">Accédez à votre espace projet sécurisé</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <User className="h-4 w-4 inline mr-2" />
                ID Projet
              </label>
              <input
                type="text"
                value={credentials.projectId}
                onChange={(e) => setCredentials({...credentials, projectId: e.target.value})}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                placeholder="Ex: PRJ-001"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <Lock className="h-4 w-4 inline mr-2" />
                Code d'accès
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.accessCode}
                  onChange={(e) => setCredentials({...credentials, accessCode: e.target.value})}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors pr-12"
                  placeholder="Code fourni par IT Vision"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !credentials.projectId || !credentials.accessCode}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-4 w-4 mr-2" />
                  Accéder à mon projet
                </div>
              )}
            </button>
          </form>

          {/* Comptes de démonstration */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-white font-medium mb-4 flex items-center">
              <Key className="h-4 w-4 mr-2" />
              Comptes de démonstration
            </h3>
            <div className="space-y-2">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => tryDemoAccount(account)}
                  className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-sm">{account.clientName}</div>
                      <div className="text-blue-200 text-xs">{account.company}</div>
                      <div className="text-white/70 text-xs">{account.project}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-300 text-xs font-mono">{account.projectId}</div>
                      <ArrowRight className="h-4 w-4 text-white/50 group-hover:text-white transition-colors mt-1" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-white/60 text-xs mt-3">
              💡 Cliquez sur un compte pour tester l'interface
            </p>
          </div>
        </div>

        {/* Informations de sécurité */}
        <div className="mt-6 text-center">
          <p className="text-blue-200 text-sm">
            🔒 Connexion sécurisée SSL • Données chiffrées
          </p>
          <p className="text-white/60 text-xs mt-2">
            Besoin d'aide ? Contactez-nous au +221 77 413 34 40
          </p>
        </div>
      </div>
    </div>
  )
}