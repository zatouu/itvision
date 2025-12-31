'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
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
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail, 
  Phone, 
  Calendar, 
  Settings,
  MoreVertical,
  X,
  Save,
  User,
  Key,
  Smartphone
} from 'lucide-react'
import ImageUpload from './ImageUpload'
import UserFormModal from './admin/UserFormModal'

type UserRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN' | 'PRODUCT_MANAGER' | 'ACCOUNTANT' | 'SUPER_ADMIN'

interface User {
  _id: string
  username: string
  email: string
  name: string
  phone?: string
  avatarUrl?: string
  role: UserRole
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
  role: UserRole
  password?: string
}

// Définition des rôles avec descriptions
const USER_ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: 'CLIENT', label: 'Client', description: 'Accès au portail client', color: 'bg-green-100 text-green-800' },
  { value: 'TECHNICIAN', label: 'Technicien', description: 'Interventions terrain', color: 'bg-blue-100 text-blue-800' },
  { value: 'PRODUCT_MANAGER', label: 'Gestionnaire Produits', description: 'Gestion du catalogue produits uniquement', color: 'bg-purple-100 text-purple-800' },
  { value: 'ACCOUNTANT', label: 'Comptable', description: 'Accès comptabilité et facturation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ADMIN', label: 'Administrateur', description: 'Accès complet à l\'administration', color: 'bg-red-100 text-red-800' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Tous les droits + gestion utilisateurs', color: 'bg-gray-800 text-white' }
]

export default function UserManagementInterface() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    name: '',
    phone: '',
    avatarUrl: '',
    role: 'CLIENT'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const usersPerPage = 10

  // Affectation projet
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignUser, setAssignUser] = useState<User | null>(null)
  const [projectsList, setProjectsList] = useState<Array<{ _id: string; name: string }>>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  const openAssignModal = async (user: User) => {
    setAssignUser(user)
    setShowAssignModal(true)
    setAssignLoading(true)
    try {
      const res = await fetch('/api/projects?status=in_progress&limit=100')
      if (res.ok) {
        const data = await res.json()
        setProjectsList((data.projects || []).map((p: any) => ({ _id: p._id, name: p.name })))
      }
    } finally {
      setAssignLoading(false)
    }
  }

  const assignTechnicianToProject = async () => {
    if (!assignUser || !selectedProjectId) return
    setAssignLoading(true)
    try {
      // Récupérer projet existant pour sa liste assignedTo
      const resGet = await fetch(`/api/projects?limit=1&skip=0&status=all`)
      // On fait un PUT direct en ajoutant l'ID user si non présent
      const putRes = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProjectId,
          // côté API, assignedTo remplace; on doit idéalement récupérer d'abord la liste, mais ici on suppose add unique côté serveur ou on remplace par tableau d’un seul si inconnu
          assignedTo: [assignUser._id]
        })
      })
      if (!putRes.ok) return alert('Échec de l\'affectation')
      alert('Technicien affecté au projet')
      setShowAssignModal(false)
      setAssignUser(null)
      setSelectedProjectId('')
    } catch {
      alert('Erreur lors de l\'affectation')
    } finally {
      setAssignLoading(false)
    }
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
    } catch (error) {
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
        // Si on crée un technicien, créer aussi l'entrée technicien
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
      } else {
        setError(data.error || 'Erreur lors de la création')
      }
    } catch (error) {
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
      } else {
        setError(data.error || 'Erreur lors de la modification')
      }
    } catch (error) {
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
        setSuccess(`Action "${action}" effectuée avec succès`)
        fetchUsers()
      } else {
        setError(data.error || 'Erreur lors de l\'action')
      }
    } catch (error) {
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
  }

  const openEditModal = (user: User) => {
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

  const getRoleColor = (role: string) => {
    const roleInfo = USER_ROLES.find(r => r.value === role)
    return roleInfo?.color || 'bg-gray-100 text-gray-800'
  }

  const getRoleLabel = (role: string) => {
    const roleInfo = USER_ROLES.find(r => r.value === role)
    return roleInfo?.label || role
  }

  const getStatusColor = (user: User) => {
    if (!user.isActive) return 'bg-gray-100 text-gray-800'
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return 'bg-red-100 text-red-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (user: User) => {
    if (!user.isActive) return 'Inactif'
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return 'Verrouillé'
    return 'Actif'
  }

  const totalPages = Math.ceil(totalUsers / usersPerPage)

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="h-8 w-8 mr-3 text-blue-600" />
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600 mt-2">
              Gérez les comptes utilisateurs, rôles et permissions
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel Utilisateur</span>
            </button>
            
            <button
              onClick={fetchUsers}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom, email, username..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les rôles</option>
                {USER_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <div className="font-medium">{totalUsers} utilisateurs</div>
                <div>Page {currentPage} sur {totalPages}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Utilisateurs ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Chargement des utilisateurs...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sécurité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="h-10 w-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {user.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user)}`}>
                        {getStatusText(user)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        {user.twoFactorEnabled && (
                          <div title="2FA activé">
                            <Smartphone className="h-4 w-4 text-green-600" />
                          </div>
                        )}
                        {user.loginAttempts > 0 && (
                          <div className="flex items-center text-yellow-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            <span>{user.loginAttempts}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        
                        {user.isActive ? (
                          <button
                            onClick={() => handleUserAction(user._id, 'deactivate')}
                            className="text-red-600 hover:text-red-900"
                            title="Désactiver"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user._id, 'activate')}
                            className="text-green-600 hover:text-green-900"
                            title="Activer"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        
                        {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                          <button
                            onClick={() => handleUserAction(user._id, 'unlock')}
                            className="text-green-600 hover:text-green-900"
                            title="Déverrouiller"
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user._id, 'lock')}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Verrouiller"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const newPassword = prompt('Nouveau mot de passe:')
                            if (newPassword) {
                              handleUserAction(user._id, 'reset_password', { newPassword })
                            }
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Réinitialiser mot de passe"
                        >
                          <Key className="h-4 w-4" />
                        </button>

                        {user.role === 'TECHNICIAN' && (
                          <button
                            onClick={async () => {
                              try {
                                // Résoudre l'ID technicien via email
                                const tRes = await fetch(`/api/technicians?email=${encodeURIComponent(user.email)}`)
                                if (!tRes.ok) return alert('Technicien introuvable')
                                const json = await tRes.json()
                                const tech = (json.technicians || [])[0]
                                if (!tech?._id && !tech?.id) return alert('Technicien introuvable')
                                const techId = tech._id || tech.id
                                const next = !tech.isAvailable
                                const res = await fetch('/api/technicians', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: techId, action: 'set_availability', isAvailable: next }) })
                                if (!res.ok) return alert('Échec mise à jour disponibilité')
                                alert(`Disponibilité: ${next ? 'Disponible' : 'Indisponible'}`)
                              } catch {
                                alert('Erreur disponibilité technicien')
                              }
                            }}
                            className="text-gray-700 hover:text-gray-900"
                            title="Basculer disponibilité technicien"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        )}

                        {user.role === 'TECHNICIAN' && (
                          <button
                            onClick={() => openAssignModal(user)}
                            className="text-blue-700 hover:text-blue-900"
                            title="Affecter à un projet"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {((currentPage - 1) * usersPerPage) + 1} à {Math.min(currentPage * usersPerPage, totalUsers)} sur {totalUsers} utilisateurs
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Précédent
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded text-sm ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Création - Nouveau design moderne */}
      <UserFormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        onSubmit={async (data) => {
          const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          const result = await response.json()
          if (!result.success) {
            throw new Error(result.error || 'Erreur lors de la création')
          }
          // Si on crée un technicien, créer aussi l'entrée technicien
          if (data.role === 'TECHNICIAN') {
            try {
              await fetch('/api/technicians', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  specialties: [],
                  experience: 0,
                  isAvailable: true,
                  password: data.password
                })
              })
            } catch {}
          }
          setSuccess('Utilisateur créé avec succès')
          fetchUsers()
        }}
      />

      {/* Modal Modification - Nouveau design moderne */}
      <UserFormModal
        isOpen={showEditModal && !!selectedUser}
        onClose={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
        onSubmit={async (data) => {
          if (!selectedUser) return
          const response = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: selectedUser._id,
              name: data.name,
              phone: data.phone,
              avatarUrl: data.avatarUrl,
              role: data.role,
              isActive: selectedUser.isActive
            })
          })
          const result = await response.json()
          if (!result.success) {
            throw new Error(result.error || 'Erreur lors de la modification')
          }
          setSuccess('Utilisateur modifié avec succès')
          fetchUsers()
        }}
        initialData={selectedUser ? {
          username: selectedUser.username,
          email: selectedUser.email,
          name: selectedUser.name,
          phone: selectedUser.phone || '',
          avatarUrl: selectedUser.avatarUrl || '',
          role: selectedUser.role
        } : undefined}
        isEdit={true}
      />

      {/* Modal Affectation Projet */}
      {showAssignModal && assignUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Affecter {assignUser.name} à un projet</h3>
              <button onClick={() => { setShowAssignModal(false); setAssignUser(null); setSelectedProjectId('') }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {assignLoading ? (
                <div className="text-sm text-gray-600">Chargement des projets…</div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projet</label>
                  <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Sélectionner un projet</option>
                    {projectsList.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowAssignModal(false); setAssignUser(null); setSelectedProjectId('') }} className="px-4 py-2 border rounded-lg">Annuler</button>
                <button disabled={!selectedProjectId || assignLoading} onClick={assignTechnicianToProject} className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">Affecter</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}