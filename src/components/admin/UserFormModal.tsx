'use client'

import { useState, useEffect } from 'react'
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Shield,
  Package,
  Calculator,
  Wrench,
  Users,
  Crown,
  Building2,
  Camera,
  Sparkles
} from 'lucide-react'

type UserRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN' | 'PRODUCT_MANAGER' | 'ACCOUNTANT' | 'SUPER_ADMIN'

interface UserFormData {
  username: string
  email: string
  name: string
  phone: string
  avatarUrl?: string
  role: UserRole
  password?: string
}

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: UserFormData) => Promise<void>
  initialData?: Partial<UserFormData>
  isEdit?: boolean
}

// Définition des rôles avec icônes et couleurs
const ROLE_OPTIONS: {
  value: UserRole
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  permissions: string[]
}[] = [
  {
    value: 'CLIENT',
    label: 'Client',
    description: 'Accès au portail client pour suivre ses projets et contrats',
    icon: Building2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500',
    permissions: ['Portail client', 'Suivi projets', 'Demandes support']
  },
  {
    value: 'TECHNICIAN',
    label: 'Technicien',
    description: 'Interventions terrain et rapports de maintenance',
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    permissions: ['Interface technicien', 'Rapports', 'Planning']
  },
  {
    value: 'PRODUCT_MANAGER',
    label: 'Gestionnaire Produits',
    description: 'Gestion du catalogue produits sans accès aux autres modules',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    permissions: ['Catalogue produits', 'Import/Export', 'Prix & stocks']
  },
  {
    value: 'ACCOUNTANT',
    label: 'Comptable',
    description: 'Accès aux modules de facturation et comptabilité',
    icon: Calculator,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    permissions: ['Comptabilité', 'Facturation', 'Rapports financiers']
  },
  {
    value: 'ADMIN',
    label: 'Administrateur',
    description: 'Accès complet à tous les modules d\'administration',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    permissions: ['Tout l\'admin', 'Clients', 'Techniciens', 'Produits']
  },
  {
    value: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Tous les droits incluant la gestion des utilisateurs',
    icon: Crown,
    color: 'text-gray-900',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-800',
    permissions: ['Tous les droits', 'Gestion utilisateurs', 'Configuration système']
  }
]

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEdit = false
}: UserFormModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    name: '',
    phone: '',
    avatarUrl: '',
    role: 'CLIENT',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setErrors({})
      if (!initialData) {
        setFormData({
          username: '',
          email: '',
          name: '',
          phone: '',
          avatarUrl: '',
          role: 'CLIENT',
          password: ''
        })
      }
    }
  }, [isOpen, initialData])

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      // Validation du rôle (toujours valide car on force une sélection)
    }

    if (currentStep === 2) {
      if (!formData.name.trim()) newErrors.name = 'Le nom est requis'
      if (!formData.email.trim()) newErrors.email = 'L\'email est requis'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email invalide'
      }
      if (!formData.username.trim()) newErrors.username = 'Le nom d\'utilisateur est requis'
      else if (formData.username.length < 3) {
        newErrors.username = 'Minimum 3 caractères'
      }
    }

    if (currentStep === 3 && !isEdit) {
      if (!formData.password) newErrors.password = 'Le mot de passe est requis'
      else if (formData.password.length < 6) {
        newErrors.password = 'Minimum 6 caractères'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 3))
    }
  }

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.message || 'Erreur lors de la soumission' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedRole = ROLE_OPTIONS.find(r => r.value === formData.role)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop avec blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header avec gradient */}
        <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <p className="text-emerald-100 text-sm mt-0.5">
                {isEdit ? 'Mettez à jour les informations' : 'Créez un nouveau compte utilisateur'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-5">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                  step === s 
                    ? 'bg-white text-emerald-600 shadow-lg scale-110' 
                    : step > s 
                      ? 'bg-emerald-400 text-white' 
                      : 'bg-white/30 text-white'
                }`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    step > s ? 'bg-emerald-400' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-emerald-100">
            <span>Rôle</span>
            <span>Informations</span>
            <span>Sécurité</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Étape 1: Sélection du rôle */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Sparkles className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-900">Choisissez un rôle</h3>
                <p className="text-sm text-gray-500">Définit les accès et permissions de l'utilisateur</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map(role => {
                  const Icon = role.icon
                  const isSelected = formData.role === role.value
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.value })}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? `${role.borderColor} ${role.bgColor} shadow-lg scale-[1.02]`
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full ${role.bgColor} ${role.color} flex items-center justify-center`}>
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl ${role.bgColor} ${role.color} flex items-center justify-center mb-3`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="font-semibold text-gray-900">{role.label}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{role.description}</div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {role.permissions.slice(0, 2).map(perm => (
                          <span key={perm} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                            {perm}
                          </span>
                        ))}
                        {role.permissions.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                            +{role.permissions.length - 2}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Étape 2: Informations personnelles */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className={`w-14 h-14 rounded-full ${selectedRole?.bgColor} ${selectedRole?.color} flex items-center justify-center mx-auto mb-2`}>
                  {selectedRole && <selectedRole.icon className="h-7 w-7" />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Informations personnelles</h3>
                <p className="text-sm text-gray-500">
                  Création d'un compte <span className={`font-medium ${selectedRole?.color}`}>{selectedRole?.label}</span>
                </p>
              </div>

              {/* Avatar preview */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition shadow-lg">
                    <Camera className="h-4 w-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const formData2 = new FormData()
                          formData2.append('file', file)
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: formData2 })
                            if (res.ok) {
                              const data = await res.json()
                              setFormData(prev => ({ ...prev, avatarUrl: data.url }))
                            }
                          } catch {}
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jean Dupont"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                        errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition`}
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom d'utilisateur <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      placeholder="jeandupont"
                      disabled={isEdit}
                      className={`w-full pl-8 pr-4 py-3 rounded-xl border ${
                        errors.username ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
                        isEdit ? 'bg-gray-50' : ''
                      }`}
                    />
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+221 77 123 45 67"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                      placeholder="jean@exemple.com"
                      disabled={isEdit}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                        errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
                        isEdit ? 'bg-gray-50' : ''
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Étape 3: Sécurité */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEdit ? 'Confirmation' : 'Sécurité du compte'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isEdit ? 'Vérifiez les informations avant de sauvegarder' : 'Définissez un mot de passe sécurisé'}
                </p>
              </div>

              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                        errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  <p className="text-xs text-gray-500 mt-1.5">Minimum 6 caractères</p>
                </div>
              )}

              {/* Résumé */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">Résumé du compte</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Nom:</span>
                    <div className="font-medium">{formData.name || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Username:</span>
                    <div className="font-medium">@{formData.username || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <div className="font-medium">{formData.email || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Téléphone:</span>
                    <div className="font-medium">{formData.phone || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Rôle:</span>
                    <div className={`inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full ${selectedRole?.bgColor} ${selectedRole?.color} font-medium text-sm`}>
                      {selectedRole && <selectedRole.icon className="h-4 w-4" />}
                      {selectedRole?.label}
                    </div>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Annuler' : 'Retour'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEdit ? 'Modification...' : 'Création...'}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEdit ? 'Modifier' : 'Créer le compte'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
