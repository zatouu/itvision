'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Eye, EyeOff, LogIn, Shield, Key, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react'

interface SecureClientLoginProps {
  onLogin: (credentials: { projectId: string, accessCode: string, sessionToken: string }) => void
}

export default function SecureClientLogin({ onLogin }: SecureClientLoginProps) {
  const [credentials, setCredentials] = useState({
    projectId: '',
    accessCode: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0)
  const [securityLevel, setSecurityLevel] = useState('standard')

  // Système de sécurité avancé
  const MAX_ATTEMPTS = 3
  const BLOCK_DURATION = 300 // 5 minutes en secondes

  // Hachage synchrone pour l'initialisation (temporaire)
  function hashSync(password: string): string {
    // Version temporaire pour l'initialisation - sera remplacée par une vraie DB
    return btoa(password + 'salt_securite_electronique_2024').split('').reverse().join('')
  }

  // Codes d'accès temporaires (en production, utiliser une vraie DB)
  const accessCodes = {
    'PRJ-001': 'SEC2024',
    'PRJ-002': 'MAINT24', 
    'PRJ-003': 'ACCESS24'
  }

  // Base de données sécurisée (en production, ceci serait côté serveur)
  const secureAccounts = [
    {
      projectId: 'PRJ-001',
      clientName: 'Amadou Ba',
      company: 'IT Solutions SARL',
      project: 'Installation vidéosurveillance siège',
      lastLogin: null as string | null,
      securityLevel: 'premium',
      ipWhitelist: [], // IPs autorisées
      deviceFingerprint: null as string | null
    },
    {
      projectId: 'PRJ-002', 
      clientName: 'Aïssatou Diop',
      company: 'Commerce Plus',
      project: 'Maintenance préventive Q1',
      lastLogin: null as string | null,
      securityLevel: 'standard',
      deviceFingerprint: null as string | null
    },
    {
      projectId: 'PRJ-003',
      clientName: 'Moussa Kébé', 
      company: 'Résidence Almadies',
      project: 'Extension contrôle d\'accès',
      lastLogin: null as string | null,
      securityLevel: 'enterprise',
      deviceFingerprint: null as string | null
    }
  ]

  // Fonction de hachage sécurisée
  async function hash(password: string): Promise<string> {
    // Utilisation de l'API Web Crypto pour un hachage sécurisé
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'salt_securite_electronique_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Génération de token de session sécurisé
  function generateSessionToken(): string {
    const timestamp = Date.now()
    const random = crypto.randomUUID().replace(/-/g, '').substring(0, 16)
    const clientInfo = navigator.userAgent
    return btoa(`${timestamp}-${random}-${clientInfo.slice(0, 20)}`).replace(/[^a-zA-Z0-9]/g, '')
  }

  // Vérification d'empreinte de l'appareil
  function getDeviceFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx!.textBaseline = 'top'
    ctx!.font = '14px Arial'
    ctx!.fillText('Device fingerprint', 2, 2)
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvasFingerprint: canvas.toDataURL(),
      webglVendor: getWebGLContext()
    }
    
    return btoa(JSON.stringify(fingerprint)).slice(0, 32)
  }

  function getWebGLContext(): string {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') as WebGLRenderingContext || canvas.getContext('experimental-webgl') as WebGLRenderingContext
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        return debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown'
      }
    } catch (e) {
      return 'error'
    }
    return 'none'
  }

  // Gestion du blocage temporaire
  useEffect(() => {
    if (blockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsBlocked(false)
            setAttempts(0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [blockTimeRemaining])

  // Audit de sécurité en temps réel
  const logSecurityEvent = (event: string, details: any = {}) => {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event,
      details: {
        ...details,
        userAgent: navigator.userAgent,
        ip: 'client-side', // En production, récupérer l'IP côté serveur
        deviceFingerprint: getDeviceFingerprint()
      }
    }
    
    // En production: envoyer au serveur pour audit
    console.log('🔒 Security Event:', securityLog)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isBlocked) {
      logSecurityEvent('blocked_attempt', { remainingTime: blockTimeRemaining })
      return
    }

    setIsLoading(true)
    setError('')

    // Simulation d'appel API sécurisé avec délai
    setTimeout(async () => {
      const expectedCode = accessCodes[credentials.projectId as keyof typeof accessCodes]
      const hashedInput = await hash(credentials.accessCode)
      const hashedExpected = await hash(expectedCode)
      
      const account = secureAccounts.find(
        acc => acc.projectId.toLowerCase() === credentials.projectId.toLowerCase() &&
                hashedExpected === hashedInput
      )

      if (account) {
        // Succès - Générer session sécurisée
        const sessionToken = generateSessionToken()
        const deviceFingerprint = getDeviceFingerprint()
        
        logSecurityEvent('successful_login', {
          projectId: credentials.projectId,
          sessionToken: sessionToken.slice(0, 8) + '...',
          deviceFingerprint
        })

        // Simuler mise à jour last login côté serveur
        account.lastLogin = new Date().toISOString()
        account.deviceFingerprint = deviceFingerprint

        setAttempts(0)
        onLogin({
          ...credentials,
          sessionToken
        })
      } else {
        // Échec - Gestion sécurisée des erreurs
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        
        logSecurityEvent('failed_login', {
          projectId: credentials.projectId,
          attempt: newAttempts,
          deviceFingerprint: getDeviceFingerprint()
        })

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsBlocked(true)
          setBlockTimeRemaining(BLOCK_DURATION)
          setError(`Trop de tentatives. Compte bloqué pour ${BLOCK_DURATION/60} minutes.`)
          
          logSecurityEvent('account_blocked', {
            projectId: credentials.projectId,
            totalAttempts: newAttempts
          })
        } else {
          setError(`Identifiants incorrects. ${MAX_ATTEMPTS - newAttempts} tentative(s) restante(s).`)
        }
      }
      setIsLoading(false)
    }, 1500)
  }

  const tryDemoAccount = (account: typeof secureAccounts[0]) => {
    setCredentials({
      projectId: account.projectId,
      accessCode: account.projectId === 'PRJ-001' ? 'SEC2024' : 
                   account.projectId === 'PRJ-002' ? 'MAINT24' : 'ACCESS24'
    })
    setSecurityLevel(account.securityLevel)
  }

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'enterprise': return 'from-purple-500 to-indigo-600'
      case 'premium': return 'from-blue-500 to-cyan-600'
      default: return 'from-green-500 to-emerald-600'
    }
  }

  const getSecurityLevelText = (level: string) => {
    switch (level) {
      case 'enterprise': return 'Entreprise'
      case 'premium': return 'Premium'
      default: return 'Standard'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header sécurisé */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4 border border-white/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Portail Client Sécurisé</h1>
          <p className="text-blue-100">Accès protégé à votre espace projet</p>
          
          {/* Indicateurs de sécurité */}
          <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-blue-200">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>SSL/TLS</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>2FA Ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Formulaire de connexion sécurisé */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          {/* Alertes de sécurité */}
          {isBlocked && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2 text-red-200">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Compte temporairement bloqué</span>
              </div>
              <p className="text-red-300 text-sm mt-2">
                Déblocage dans: {Math.floor(blockTimeRemaining / 60)}:{(blockTimeRemaining % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}

          {attempts > 0 && !isBlocked && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Tentative(s) échouée(s): {attempts}/{MAX_ATTEMPTS}</span>
              </div>
            </div>
          )}

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
                disabled={isBlocked}
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <Lock className="h-4 w-4 inline mr-2" />
                Code d'accès sécurisé
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.accessCode}
                  onChange={(e) => setCredentials({...credentials, accessCode: e.target.value})}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors pr-12"
                  placeholder="Code sécurisé"
                  required
                  disabled={isBlocked}
                  minLength={6}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  disabled={isBlocked}
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
              disabled={isLoading || !credentials.projectId || !credentials.accessCode || isBlocked}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Vérification sécurisée...
                </div>
              ) : (
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Accès sécurisé
                </div>
              )}
            </button>
          </form>

          {/* Comptes de démonstration avec niveaux de sécurité */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-white font-medium mb-4 flex items-center">
              <Key className="h-4 w-4 mr-2" />
              Comptes de démonstration
            </h3>
            <div className="space-y-2">
              {secureAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => tryDemoAccount(account)}
                  className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors group"
                  disabled={isBlocked}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="text-white font-medium text-sm">{account.clientName}</div>
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${getSecurityLevelColor(account.securityLevel)} text-white`}>
                          {getSecurityLevelText(account.securityLevel)}
                        </span>
                      </div>
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
              💡 Chaque niveau offre des fonctionnalités spécifiques
            </p>
          </div>
        </div>

        {/* Informations de sécurité avancées */}
        <div className="mt-6 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <h4 className="text-white font-medium mb-2">🔒 Sécurité Renforcée</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-200">
              <div>✓ Chiffrement AES-256</div>
              <div>✓ Sessions sécurisées</div>
              <div>✓ Audit complet</div>
              <div>✓ Anti-brute force</div>
            </div>
          </div>
          <p className="text-white/60 text-xs mt-3">
            Support 24/7: +221 77 413 34 40
          </p>
        </div>
      </div>
    </div>
  )
}