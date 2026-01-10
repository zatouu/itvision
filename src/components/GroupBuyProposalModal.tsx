'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Users, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  TrendingDown,
  MessageSquare
} from 'lucide-react'
import clsx from 'clsx'

interface ProductInfo {
  id: string
  name: string
  image?: string
  basePrice: number
  currency: string
  groupBuyMinQty: number
  groupBuyTargetQty: number
  priceTiers?: Array<{ minQty: number; price: number; discount?: number }>
}

interface GroupBuyProposalModalProps {
  isOpen: boolean
  onClose: () => void
  product: ProductInfo
  onSuccess?: (proposalId: string) => void
}

type Step = 'check' | 'login' | 'register' | 'proposal' | 'success'

export default function GroupBuyProposalModal({ 
  isOpen, 
  onClose, 
  product,
  onSuccess 
}: GroupBuyProposalModalProps) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('check')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Register form
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  
  // Proposal form
  const [desiredQty, setDesiredQty] = useState(product.groupBuyMinQty || 5)
  const [proposalMessage, setProposalMessage] = useState('')
  
  // Result
  const [proposalResult, setProposalResult] = useState<{ groupId: string } | null>(null)

  // Check auth on mount
  useEffect(() => {
    if (isOpen) {
      checkAuth()
    }
  }, [isOpen])

  const checkAuth = async () => {
    setLoading(true)
    try {
      // Utiliser credentials: 'include' pour envoyer le cookie auth-token
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setIsAuthenticated(true)
          setCurrentStep('proposal')
        } else {
          setCurrentStep('login')
        }
      } else {
        setCurrentStep('login')
      }
    } catch {
      setCurrentStep('login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de connexion')
      }

      // Stocker le token pour Socket.io
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      setIsAuthenticated(true)
      setCurrentStep('proposal')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (registerPassword !== registerPasswordConfirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
          role: 'CLIENT'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription')
      }

      // Auto-login après inscription
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: registerEmail, password: registerPassword })
      })

      const loginData = await loginRes.json()

      if (loginRes.ok) {
        // Stocker le token pour Socket.io
        if (loginData.token) {
          localStorage.setItem('token', loginData.token)
        }
        setIsAuthenticated(true)
        setCurrentStep('proposal')
      } else {
        // Inscription réussie mais connexion échouée, aller au login
        setCurrentStep('login')
        setLoginEmail(registerEmail)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Utiliser credentials: 'include' pour envoyer le cookie auth-token
      const res = await fetch('/api/group-orders/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: product.id,
          desiredQty,
          message: proposalMessage || `Je souhaite lancer un achat groupé pour ${product.name}`
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.existingGroupId) {
          // Il y a déjà un groupe ouvert
          setError(`Un achat groupé existe déjà pour ce produit`)
        } else {
          throw new Error(data.error || 'Erreur lors de la soumission')
        }
        return
      }

      setProposalResult({ groupId: data.proposal.groupId })
      setCurrentStep('success')
      onSuccess?.(data.proposal.groupId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' ' + (product.currency || 'FCFA')
  }

  // Calculer le prix estimé basé sur la quantité
  const getEstimatedPrice = () => {
    if (!product.priceTiers || product.priceTiers.length === 0) {
      return product.basePrice
    }
    
    const sortedTiers = [...product.priceTiers].sort((a, b) => b.minQty - a.minQty)
    for (const tier of sortedTiers) {
      if (desiredQty >= tier.minQty) {
        return tier.price
      }
    }
    return product.basePrice
  }

  const estimatedPrice = getEstimatedPrice()
  const estimatedSavings = product.basePrice - estimatedPrice
  const savingsPercent = Math.round((estimatedSavings / product.basePrice) * 100)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Proposer un Achat Groupé</h2>
                <p className="text-sm text-white/80">{product.name}</p>
              </div>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {['auth', 'proposal', 'success'].map((step, i) => (
                <div key={step} className="flex items-center">
                  <div className={clsx(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    (currentStep === 'login' || currentStep === 'register' || currentStep === 'check') && i === 0 ? 'bg-white' :
                    currentStep === 'proposal' && i === 1 ? 'bg-white' :
                    currentStep === 'success' && i === 2 ? 'bg-white' :
                    'bg-white/30'
                  )} />
                  {i < 2 && <div className="w-8 h-0.5 bg-white/30 mx-1" />}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Check Auth */}
            {currentStep === 'check' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                <p className="mt-4 text-gray-600">Vérification de votre session...</p>
              </div>
            )}

            {/* Login Form */}
            {currentStep === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Connexion requise</h3>
                  <p className="text-sm text-gray-600">Connectez-vous pour proposer un achat groupé</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Pas encore de compte ?{' '}
                    <button
                      type="button"
                      onClick={() => { setCurrentStep('register'); setError(null) }}
                      className="text-purple-600 font-semibold hover:underline"
                    >
                      Créer un compte
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* Register Form */}
            {currentStep === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="text-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Créer un compte</h3>
                  <p className="text-sm text-gray-600">Rejoignez la communauté IT Vision</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nom complet</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Prénom Nom"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="77 123 45 67"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Confirmer</label>
                    <input
                      type="password"
                      value={registerPasswordConfirm}
                      onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <p className="text-[10px] text-gray-500">
                  Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-600">
                    J'accepte les{' '}
                    <a href="/conditions" className="text-purple-600 hover:underline" target="_blank">
                      conditions d'utilisation
                    </a>{' '}
                    et la{' '}
                    <a href="/confidentialite" className="text-purple-600 hover:underline" target="_blank">
                      politique de confidentialité
                    </a>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !acceptTerms}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer mon compte'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setCurrentStep('login'); setError(null) }}
                    className="text-sm text-gray-600 hover:text-purple-600 flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}

            {/* Proposal Form */}
            {currentStep === 'proposal' && (
              <form onSubmit={handleSubmitProposal} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Résumé produit */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {product.image && (
                      <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-600">Prix de base: {formatCurrency(product.basePrice)}</p>
                    </div>
                  </div>
                </div>

                {/* Quantité souhaitée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Combien d'unités souhaitez-vous commander ?
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDesiredQty(Math.max(1, desiredQty - 1))}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={desiredQty}
                      onChange={(e) => setDesiredQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setDesiredQty(desiredQty + 1)}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Objectif groupe: {product.groupBuyTargetQty} unités • Min: {product.groupBuyMinQty} unités
                  </p>
                </div>

                {/* Estimation économies */}
                {savingsPercent > 0 && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                      <TrendingDown className="w-5 h-5" />
                      Économie estimée
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-600">-{savingsPercent}%</span>
                      <span className="text-gray-600">soit {formatCurrency(estimatedSavings)} / unité</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Prix estimé: {formatCurrency(estimatedPrice)} au lieu de {formatCurrency(product.basePrice)}
                    </p>
                  </div>
                )}

                {/* Message optionnel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Message (optionnel)
                  </label>
                  <textarea
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Expliquez pourquoi vous lancez cet achat groupé, vos délais souhaités..."
                  />
                </div>

                {/* Info validation */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Validation requise</p>
                      <p className="text-xs mt-1">
                        Votre proposition sera examinée par notre équipe sous 24-48h.
                        Une fois validée, l'achat groupé sera ouvert et vous serez inscrit automatiquement.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Soumettre ma proposition
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Success */}
            {currentStep === 'success' && (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Proposition envoyée !</h3>
                <p className="text-gray-600 mb-4">
                  Votre demande d'achat groupé pour <strong>{product.name}</strong> a été soumise avec succès.
                </p>
                
                {proposalResult && (
                  <div className="p-4 bg-gray-50 rounded-xl mb-4">
                    <p className="text-sm text-gray-600">Référence de la proposition:</p>
                    <p className="font-mono font-bold text-purple-600">{proposalResult.groupId}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Vous recevrez un email dès que votre proposition sera validée.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                    <a
                      href="/mon-compte/achats-groupes"
                      className="flex-1 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      Mes propositions
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
