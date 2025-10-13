'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Shield, CheckCircle, AlertTriangle, Globe, Zap, Users, Building } from 'lucide-react'

interface KeycloakClientLoginProps {
  onLogin: (credentials: { 
    projectId: string
    accessToken: string
    refreshToken: string
    userInfo: any
    keycloakSession: any
  }) => void
}

// Configuration Keycloak (à adapter selon votre instance)
const KEYCLOAK_CONFIG = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'https://auth.itvision.sn',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'itvision-clients',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'client-portal',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/client-portal` : ''
}

export default function KeycloakClientLogin({ onLogin }: KeycloakClientLoginProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [keycloakInstance, setKeycloakInstance] = useState<any>(null)
  const [isKeycloakReady, setIsKeycloakReady] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'demo' | 'keycloak'>('keycloak')

  // Comptes de démonstration pour développement
  const demoAccounts = [
    {
      projectId: 'PRJ-001',
      email: 'amadou.ba@itsolutions.sn',
      name: 'Amadou Ba',
      company: 'IT Solutions SARL',
      role: 'admin',
      securityLevel: 'premium'
    },
    {
      projectId: 'PRJ-002',
      email: 'aissatou.diop@commerceplus.sn',
      name: 'Aïssatou Diop',
      company: 'Commerce Plus',
      role: 'manager',
      securityLevel: 'standard'
    },
    {
      projectId: 'PRJ-003',
      email: 'moussa.kebe@almadies.sn',
      name: 'Moussa Kébé',
      company: 'Résidence Almadies',
      role: 'user',
      securityLevel: 'enterprise'
    }
  ]

  // Initialisation Keycloak
  useEffect(() => {
    initKeycloak()
  }, [])

  const initKeycloak = async () => {
    try {
      // Simulation d'initialisation Keycloak
      // En production: import Keycloak from 'keycloak-js'
      
      /*
      const keycloak = new Keycloak({
        url: KEYCLOAK_CONFIG.url,
        realm: KEYCLOAK_CONFIG.realm,
        clientId: KEYCLOAK_CONFIG.clientId
      })

      const authenticated = await keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: false,
        pkceMethod: 'S256'
      })

      setKeycloakInstance(keycloak)
      
      if (authenticated) {
        handleKeycloakLogin(keycloak)
      }
      */

      // Simulation pour démo
      setKeycloakInstance({
        authenticated: false,
        login: () => simulateKeycloakLogin(),
        logout: () => console.log('Logout'),
        token: null,
        tokenParsed: null,
        userInfo: null
      })
      
      setIsKeycloakReady(true)
    } catch (error) {
      console.error('Erreur initialisation Keycloak:', error)
      setError('Erreur de connexion au serveur d\'authentification')
      setIsKeycloakReady(true) // Continuer en mode démo
    }
  }

  const simulateKeycloakLogin = async () => {
    setIsLoading(true)
    
    // Simulation d'authentification Keycloak
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simulation token et user info
    const mockTokens = {
      accessToken: generateMockJWT('access'),
      refreshToken: generateMockJWT('refresh'),
      userInfo: {
        sub: 'user-123',
        email: 'amadou.ba@itsolutions.sn',
        name: 'Amadou Ba',
        preferred_username: 'amadou.ba',
        company: 'IT Solutions SARL',
        projects: ['PRJ-001'],
        roles: ['client', 'project-manager'],
        security_level: 'premium'
      }
    }
    
    onLogin({
      projectId: 'PRJ-001',
      accessToken: mockTokens.accessToken,
      refreshToken: mockTokens.refreshToken,
      userInfo: mockTokens.userInfo,
      keycloakSession: {
        authenticated: true,
        realm: KEYCLOAK_CONFIG.realm,
        loginTime: Date.now()
      }
    })
    
    setIsLoading(false)
  }

  const generateMockJWT = (type: 'access' | 'refresh'): string => {
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
      iss: KEYCLOAK_CONFIG.url,
      sub: 'user-123',
      aud: KEYCLOAK_CONFIG.clientId,
      exp: Math.floor(Date.now() / 1000) + (type === 'access' ? 300 : 1800), // 5min ou 30min
      iat: Math.floor(Date.now() / 1000),
      typ: type === 'access' ? 'Bearer' : 'Refresh',
      azp: KEYCLOAK_CONFIG.clientId,
      scope: 'openid profile email'
    }
    
    // Simulation JWT (en production: vrai token signé)
    return `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}.signature`
  }

  const handleKeycloakLogin = () => {
    if (keycloakInstance && !keycloakInstance.authenticated) {
      keycloakInstance.login({
        redirectUri: KEYCLOAK_CONFIG.redirectUri,
        prompt: 'login'
      })
    }
  }

  const handleDemoLogin = (account: typeof demoAccounts[0]) => {
    setIsLoading(true)
    
    setTimeout(() => {
      const mockTokens = {
        accessToken: generateMockJWT('access'),
        refreshToken: generateMockJWT('refresh'),
        userInfo: {
          sub: `demo-${account.projectId}`,
          email: account.email,
          name: account.name,
          preferred_username: account.email.split('@')[0],
          company: account.company,
          projects: [account.projectId],
          roles: ['client', account.role],
          security_level: account.securityLevel
        }
      }
      
      onLogin({
        projectId: account.projectId,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        userInfo: mockTokens.userInfo,
        keycloakSession: {
          authenticated: true,
          realm: 'demo',
          loginTime: Date.now()
        }
      })
      
      setIsLoading(false)
    }, 1500)
  }

  if (!isKeycloakReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-emerald-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Initialisation sécurisée en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4 border border-white/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">IT Vision Portal</h1>
          <p className="text-blue-100">Authentification Sécurisée Enterprise</p>
          
          {/* Badges de sécurité */}
          <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-blue-200">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Keycloak SSO</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>OAuth 2.0</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>RBAC</span>
            </div>
          </div>
        </div>

        {/* Sélection méthode de connexion */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-6">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setLoginMethod('keycloak')}
              className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
                loginMethod === 'keycloak' 
                  ? 'bg-white text-blue-900 font-semibold' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Building className="h-4 w-4 inline mr-2" />
              Entreprise
            </button>
            <button
              onClick={() => setLoginMethod('demo')}
              className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
                loginMethod === 'demo' 
                  ? 'bg-white text-blue-900 font-semibold' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Démonstration
            </button>
          </div>

          {/* Connexion Keycloak */}
          {loginMethod === 'keycloak' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Connexion Enterprise SSO
                </h2>
                <p className="text-blue-100 text-sm mb-6">
                  Utilisez vos identifiants d'entreprise pour accéder à votre portail projet
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={simulateKeycloakLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 px-6 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Authentification...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 mr-3" />
                    Se connecter via Keycloak
                  </div>
                )}
              </button>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-100 font-medium mb-2">🔐 Sécurité Enterprise</h3>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Single Sign-On (SSO)</li>
                  <li>• Multi-Factor Authentication</li>
                  <li>• Role-Based Access Control</li>
                  <li>• Session Management</li>
                </ul>
              </div>
            </div>
          )}

          {/* Comptes de démonstration */}
          {loginMethod === 'demo' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Comptes de Démonstration
                </h2>
                <p className="text-blue-100 text-sm mb-6">
                  Testez les fonctionnalités avec différents niveaux d'accès
                </p>
              </div>

              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoLogin(account)}
                  disabled={isLoading}
                  className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <div className="text-white font-medium">{account.name}</div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          account.securityLevel === 'enterprise' ? 'bg-purple-500 text-white' :
                          account.securityLevel === 'premium' ? 'bg-blue-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {account.securityLevel}
                        </span>
                      </div>
                      <div className="text-blue-200 text-sm">{account.company}</div>
                      <div className="text-white/70 text-xs">{account.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-300 text-xs font-mono">{account.projectId}</div>
                      <div className="text-white/50 text-xs">{account.role}</div>
                    </div>
                  </div>
                </button>
              ))}

              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="text-yellow-100 font-medium mb-2">💡 Mode Démonstration</h3>
                <p className="text-yellow-200 text-sm">
                  Les données sont simulées à des fins de présentation. 
                  En production, l'authentification se fait via Keycloak.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Informations de configuration */}
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <h4 className="text-white font-medium mb-2">🔧 Configuration Keycloak</h4>
            <div className="grid grid-cols-1 text-xs text-blue-200 space-y-1">
              <div>Realm: <span className="font-mono">{KEYCLOAK_CONFIG.realm}</span></div>
              <div>Client: <span className="font-mono">{KEYCLOAK_CONFIG.clientId}</span></div>
              <div>URL: <span className="font-mono">{KEYCLOAK_CONFIG.url}</span></div>
            </div>
          </div>
          <p className="text-white/60 text-xs mt-3">
            Support IT: +221 77 413 34 40
          </p>
        </div>
      </div>
    </div>
  )
}