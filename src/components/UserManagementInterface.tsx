'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Shield, 
  Lock, 
  Unlock, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail, 
  Phone, 
  X,
  Save,
  User,
  Key,
  Smartphone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UserPlus,
  Settings
} from 'lucide-react'
import ModernModal, { ModalActions, ModalPrimaryButton, ModalSecondaryButton } from './ui/ModernModal'
import ImageUpload from './ImageUpload'

interface UserData {
  _id: string
  username: string
  email: string
  name: string
  phone?: string
  avatarUrl?: string
  role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  isActive: boolean
  loginAttempts: number
  lockedUntil?: string
  twoFactorEnabled?: boolean
  createdAt: string
  updatedAt: string
}

interface UserFormData {
  username: string
  email: string
  name: string
  phone: string
  avatarUrl?: string
  role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  password?: string
}

export default function UserManagementInterface() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    name: '',
    phone: '',
    avatarUrl: '',
    role: 'CLIENT'
  })
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const usersPerPage = 10

  // Stats calculées
  const stats = {
    total: totalUsers,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    technicians: users.filter(u => u.role === 'TECHNICIAN').length,
    clients: users.filter(u => u.role === 'CLIENT').length
  }

  // Charger les utilisateurs
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * usersPerPage).toString(),
        limit: usersPerPage.toString(),
        q: searchTerm,
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { isActive: statusFilter })
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
        setTotalUsers(data.total)
      } else {
        setError(data.error || 'Erreur lors du chargement')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm, roleFilter, statusFilter])

  // Créer un utilisateur
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        if (formData.role === 'TECHNICIAN') {
          try {
            await fetch('/api/technicians', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                specialties: [],
                experience: 0,
                isAvailable: true,
                password: formData.password
              })
            })
          } catch {}
        }
        setSuccess('Utilisateur créé avec succès')
        setShowCreateModal(false)
        resetForm()
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erreur lors de la création')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modifier un utilisateur
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser._id,
          name: formData.name,
          phone: formData.phone,
          avatarUrl: formData.avatarUrl,
          role: formData.role,
          isActive: selectedUser.isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Utilisateur modifié avec succès')
        setShowEditModal(false)
        setSelectedUser(null)
        resetForm()
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erreur lors de la modification')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Réinitialiser le mot de passe
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedUser._id, 
          action: 'reset_password', 
          newPassword 
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Mot de passe réinitialisé')
        setShowPasswordModal(false)
        setNewPassword('')
        setSelectedUser(null)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erreur')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actions sur les utilisateurs
  const handleUserAction = async (userId: string, action: string, payload?: any) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, action, ...payload })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Action effectuée avec succès`)
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erreur')
      }
    } catch {
      setError('Erreur de connexion')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      name: '',
      phone: '',
      avatarUrl: '',
      role: 'CLIENT'
    })
    setNewPassword('')
  }

  const openEditModal = (user: UserData) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
      role: user.role
    })
    setShowEditModal(true)
  }

  const openPasswordModal = (user: UserData) => {
    setSelectedUser(user)
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const getRoleBadge = (role: string) => {
    const config = {
      ADMIN: { bg: 'bg-red-100', text: 'text-red-700', label: 'Admin' },
      TECHNICIAN: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Technicien' },
      CLIENT: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Client' }
    }
    const c = config[role as keyof typeof config] || { bg: 'bg-gray-100', text: 'text-gray-700', label: role }
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
  }

  const getStatusBadge = (user: UserData) => {
    if (!user.isActive) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">Inactif</span>
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700">Verrouillé</span>
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">Actif</span>
  }

  const totalPages = Math.ceil(totalUsers / usersPerPage)

  // Formulaire utilisateur (réutilisable)
  const UserForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="relative">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-white" />
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-2">Photo de profil</p>
          <ImageUpload
            onUpload={(url) => setFormData({ ...formData, avatarUrl: url })}
            maxFiles={1}
            type="avatars"
            existingImages={formData.avatarUrl ? [formData.avatarUrl] : []}
          />
        </div>
      </div>

      {/* Nom complet */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nom complet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
          placeholder="Jean Dupont"
        />
      </div>

      {/* Username + Email en grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nom d&apos;utilisateur <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={isEdit}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="jean.dupont"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            disabled={isEdit}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="jean@exemple.com"
          />
        </div>
      </div>

      {/* Téléphone + Rôle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
            placeholder="+221 77 123 45 67"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Rôle <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
          >
            <option value="CLIENT">👤 Client</option>
            <option value="TECHNICIAN">🔧 Technicien</option>
            <option value="ADMIN">👑 Administrateur</option>
          </select>
        </div>
      </div>

      {/* Mot de passe (création seulement) */}
      {!isEdit && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Min. 8 caractères avec majuscule, minuscule et chiffre</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header avec stats */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <Users className="h-7 w-7 text-white" />
              </div>
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600 mt-2">
              Gérez les comptes, rôles et permissions de votre équipe
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Nouvel Utilisateur
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
            { label: 'Actifs', value: stats.active, icon: UserCheck, color: 'green' },
            { label: 'Admins', value: stats.admins, icon: Shield, color: 'red' },
            { label: 'Techniciens', value: stats.technicians, icon: Settings, color: 'purple' },
            { label: 'Clients', value: stats.clients, icon: User, color: 'emerald' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center"
            >
              <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="ml-3 p-1 hover:bg-red-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center"
            >
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess('')} className="ml-3 p-1 hover:bg-emerald-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
                  placeholder="Nom, email..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
              >
                <option value="all">Tous les rôles</option>
                <option value="CLIENT">Clients</option>
                <option value="TECHNICIAN">Techniciens</option>
                <option value="ADMIN">Administrateurs</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
              >
                <option value="all">Tous</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-2.5 w-full">
                <span className="font-semibold text-gray-900">{totalUsers}</span> utilisateurs • Page {currentPage}/{totalPages || 1}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto text-emerald-600 mb-4" />
            <p className="text-gray-600">Chargement des utilisateurs...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</p>
            <p className="text-gray-500 mb-6">Créez votre premier utilisateur pour commencer</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Créer un utilisateur
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sécurité</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user, index) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold text-sm">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                      <td className="px-6 py-4">{getStatusBadge(user)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.twoFactorEnabled && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700" title="2FA activé">
                              <Smartphone className="h-3 w-3" />
                              2FA
                            </span>
                          )}
                          {user.loginAttempts > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700">
                              <AlertTriangle className="h-3 w-3" />
                              {user.loginAttempts} tentatives
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Réinitialiser mot de passe"
                          >
                            <Key className="h-4 w-4" />
                          </button>

                          {user.isActive ? (
                            <button
                              onClick={() => handleUserAction(user._id, 'deactivate')}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Désactiver"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(user._id, 'activate')}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Activer"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}

                          {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                            <button
                              onClick={() => handleUserAction(user._id, 'unlock')}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Déverrouiller"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(user._id, 'lock')}
                              className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Verrouiller"
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <p className="text-sm text-gray-600">
                  {((currentPage - 1) * usersPerPage) + 1} - {Math.min(currentPage * usersPerPage, totalUsers)} sur {totalUsers}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const page = i + 1
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-emerald-600 text-white'
                            : 'border border-gray-200 hover:bg-white'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Création */}
      <ModernModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Nouvel utilisateur"
        subtitle="Créez un nouveau compte utilisateur"
        icon={<UserPlus className="h-6 w-6 text-white" />}
        size="lg"
        footer={
          <ModalActions>
            <ModalSecondaryButton onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Annuler
            </ModalSecondaryButton>
            <ModalPrimaryButton
              onClick={() => document.getElementById('create-form')?.dispatchEvent(new Event('submit', { bubbles: true }))}
              loading={isSubmitting}
              icon={<Save className="h-4 w-4" />}
            >
              Créer l&apos;utilisateur
            </ModalPrimaryButton>
          </ModalActions>
        }
      >
        <form id="create-form" onSubmit={handleCreateUser}>
          <UserForm isEdit={false} />
        </form>
      </ModernModal>

      {/* Modal Modification */}
      <ModernModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
        title="Modifier l'utilisateur"
        subtitle={selectedUser?.name}
        icon={<Edit3 className="h-6 w-6 text-white" />}
        size="lg"
        footer={
          <ModalActions>
            <ModalSecondaryButton onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}>
              Annuler
            </ModalSecondaryButton>
            <ModalPrimaryButton
              onClick={() => document.getElementById('edit-form')?.dispatchEvent(new Event('submit', { bubbles: true }))}
              loading={isSubmitting}
              icon={<Save className="h-4 w-4" />}
            >
              Enregistrer
            </ModalPrimaryButton>
          </ModalActions>
        }
      >
        <form id="edit-form" onSubmit={handleUpdateUser}>
          <UserForm isEdit={true} />
        </form>
      </ModernModal>

      {/* Modal Mot de passe */}
      <ModernModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setSelectedUser(null); setNewPassword(''); }}
        title="Réinitialiser le mot de passe"
        subtitle={selectedUser?.name}
        icon={<Key className="h-6 w-6 text-white" />}
        size="sm"
        footer={
          <ModalActions>
            <ModalSecondaryButton onClick={() => { setShowPasswordModal(false); setSelectedUser(null); setNewPassword(''); }}>
              Annuler
            </ModalSecondaryButton>
            <ModalPrimaryButton
              onClick={handleResetPassword}
              loading={isSubmitting}
              disabled={!newPassword || newPassword.length < 8}
              icon={<Key className="h-4 w-4" />}
            >
              Réinitialiser
            </ModalPrimaryButton>
          </ModalActions>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              L&apos;utilisateur devra utiliser ce nouveau mot de passe pour se connecter.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Min. 8 caractères</p>
          </div>
        </div>
      </ModernModal>
    </div>
  )
}
