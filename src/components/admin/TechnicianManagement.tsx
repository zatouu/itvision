'use client'

import { useEffect, useState } from 'react'
import { 
  Search, Users, Mail, Phone, RefreshCw, Plus, Edit3, Trash2,
  Eye, Download, X, MapPin, Calendar, Activity, Award, Clock,
  CheckCircle2, AlertCircle, Wrench, Shield, Star, TrendingUp,
  Navigation, Settings, User, Key, Upload, Briefcase
} from 'lucide-react'

interface Technician {
  _id: string
  technicianId: string
  name: string
  email: string
  phone: string
  isActive: boolean
  isAvailable: boolean
  profilePhoto?: string
  specialties: string[]
  certifications: string[]
  experience: number
  currentLocation?: {
    lat: number
    lng: number
    lastUpdate: string
  }
  stats: {
    totalReports: number
    averageRating: number
    completionRate: number
    averageResponseTime: number
    onTimeRate: number
  }
  preferences?: {
    workingHours?: {
      start: string
      end: string
      weekends: boolean
    }
  }
  createdAt: string
  lastLogin?: string
}

interface TechFormData {
  name: string
  email: string
  phone: string
  password?: string
  specialties: string[]
  certifications: string[]
  experience: number
  workingHours: {
    start: string
    end: string
    weekends: boolean
  }
}

export default function TechnicianManagement() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'available' | 'unavailable'>('all')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Modale
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add')
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null)
  
  // Formulaire
  const [formData, setFormData] = useState<TechFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialties: [],
    certifications: [],
    experience: 0,
    workingHours: {
      start: '08:00',
      end: '18:00',
      weekends: false
    }
  })
  
  const [saving, setSaving] = useState(false)
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newCertification, setNewCertification] = useState('')
  const perPage = 12

  // Spécialités prédéfinies
  const predefinedSpecialties = [
    'Fibre Optique',
    'Réseau',
    'Électricité',
    'Domotique',
    'Vidéosurveillance',
    'Contrôle d\'Accès',
    'Téléphonie',
    'Installation',
    'Maintenance',
    'Dépannage'
  ]

  const fetchTechnicians = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * perPage).toString(),
        limit: perPage.toString(),
        q: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(specialtyFilter !== 'all' && { specialty: specialtyFilter })
      })
      
      const res = await fetch(`/api/admin/technicians?${params}`)
      const data = await res.json()
      
      if (data.success) {
        setTechnicians(data.technicians || [])
        setTotal(data.total || 0)
        setError('')
      } else {
        setError(data.error || 'Erreur lors du chargement')
      }
    } catch (e) {
      setError('Erreur de connexion')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchTechnicians() 
  }, [currentPage, searchTerm, statusFilter, specialtyFilter])

  const openModal = (mode: 'add' | 'edit' | 'view', tech?: Technician) => {
    setModalMode(mode)
    setSelectedTech(tech || null)
    
    if (mode === 'add') {
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        specialties: [],
        certifications: [],
        experience: 0,
        workingHours: {
          start: '08:00',
          end: '18:00',
          weekends: false
        }
      })
    } else if (tech) {
      setFormData({
        name: tech.name,
        email: tech.email,
        phone: tech.phone,
        password: '',
        specialties: tech.specialties || [],
        certifications: tech.certifications || [],
        experience: tech.experience || 0,
        workingHours: tech.preferences?.workingHours || {
          start: '08:00',
          end: '18:00',
          weekends: false
        }
      })
    }
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTech(null)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    if (modalMode === 'add' && !formData.password) {
      alert('Le mot de passe est obligatoire pour créer un technicien')
      return
    }

    setSaving(true)
    try {
      const url = modalMode === 'edit' && selectedTech 
        ? `/api/admin/technicians/${selectedTech._id}`
        : '/api/admin/technicians'
      
      const method = modalMode === 'edit' ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      
      if (data.success) {
        alert(modalMode === 'edit' ? 'Technicien modifié avec succès !' : 'Technicien créé avec succès !')
        closeModal()
        fetchTechnicians()
      } else {
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (techId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce technicien ?')) return

    try {
      const res = await fetch(`/api/admin/technicians/${techId}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      
      if (data.success) {
        alert('Technicien supprimé avec succès')
        fetchTechnicians()
      } else {
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      alert('Erreur de connexion')
    }
  }

  const toggleAvailability = async (tech: Technician) => {
    try {
      const res = await fetch(`/api/admin/technicians/${tech._id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !tech.isAvailable })
      })

      const data = await res.json()
      
      if (data.success) {
        fetchTechnicians()
      } else {
        alert(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      alert('Erreur de connexion')
    }
  }

  const exportTechnicians = () => {
    const csv = [
      ['ID', 'Nom', 'Email', 'Téléphone', 'Spécialités', 'Certifications', 'Expérience', 'Statut', 'Disponible', 'Total Rapports', 'Note', 'Date création'].join(','),
      ...technicians.map(t => [
        t.technicianId,
        t.name,
        t.email,
        t.phone,
        (t.specialties || []).join(';'),
        (t.certifications || []).join(';'),
        t.experience + ' ans',
        t.isActive ? 'Actif' : 'Inactif',
        t.isAvailable ? 'Disponible' : 'Occupé',
        t.stats.totalReports || 0,
        (t.stats.averageRating || 0).toFixed(1),
        new Date(t.createdAt).toLocaleDateString('fr-FR')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `techniciens_it_vision_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData({ ...formData, specialties: [...formData.specialties, newSpecialty.trim()] })
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (spec: string) => {
    setFormData({ ...formData, specialties: formData.specialties.filter(s => s !== spec) })
  }

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData({ ...formData, certifications: [...formData.certifications, newCertification.trim()] })
      setNewCertification('')
    }
  }

  const removeCertification = (cert: string) => {
    setFormData({ ...formData, certifications: formData.certifications.filter(c => c !== cert) })
  }

  const totalPages = Math.ceil(total / perPage)
  
  const filteredTechs = technicians.filter(t => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (!t.name.toLowerCase().includes(search) && 
          !t.email.toLowerCase().includes(search) &&
          !t.phone.includes(search)) {
        return false
      }
    }
    return true
  })

  // Calcul des métriques
  const metrics = {
    total: technicians.length,
    active: technicians.filter(t => t.isActive).length,
    available: technicians.filter(t => t.isAvailable).length,
    avgRating: technicians.length > 0 
      ? (technicians.reduce((sum, t) => sum + (t.stats.averageRating || 0), 0) / technicians.length).toFixed(1)
      : '0.0'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* En-tête avec gradient orange pour les techniciens */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-red-500 to-rose-500 text-white p-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-700" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-full px-4 py-1.5 mb-3">
                <Wrench className="h-4 w-4" />
                <span className="text-xs font-medium">Gestion Techniciens</span>
              </div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Users className="h-10 w-10" />
                Techniciens IT Vision
              </h1>
              <p className="text-white/90">Gérez votre équipe technique et leurs interventions</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => openModal('add')}
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-xl hover:bg-white/90 transition-all font-semibold shadow-lg hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Nouveau technicien
              </button>
              
              <button 
                onClick={exportTechnicians}
                disabled={technicians.length === 0}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-4 py-3 rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-blue-700">Total Techniciens</div>
            <div className="p-2.5 bg-blue-500 rounded-xl">
              <Users className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-900">{metrics.total}</div>
          <div className="text-xs text-blue-600 mt-1">Dans l'équipe</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-green-700">Actifs</div>
            <div className="p-2.5 bg-green-500 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-900">{metrics.active}</div>
          <div className="text-xs text-green-600 mt-1">
            {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}% du total
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-orange-700">Disponibles</div>
            <div className="p-2.5 bg-orange-500 rounded-xl">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-900">{metrics.available}</div>
          <div className="text-xs text-orange-600 mt-1">Prêts à intervenir</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-yellow-700">Note moyenne</div>
            <div className="p-2.5 bg-yellow-500 rounded-xl">
              <Star className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-yellow-900">{metrics.avgRating}/5</div>
          <div className="text-xs text-yellow-600 mt-1">Satisfaction</div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
              <option value="available">Disponibles</option>
              <option value="unavailable">Occupés</option>
            </select>

            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
            >
              <option value="all">Toutes spécialités</option>
              {predefinedSpecialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            
            <button 
              onClick={fetchTechnicians} 
              disabled={loading}
              className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-3 rounded-xl hover:bg-orange-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Liste des techniciens */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-orange-600 animate-spin" />
        </div>
      ) : filteredTechs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun technicien trouvé</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || specialtyFilter !== 'all'
              ? 'Aucun technicien ne correspond à vos critères'
              : 'Commencez par ajouter votre premier technicien'}
          </p>
          <button
            onClick={() => openModal('add')}
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl hover:bg-orange-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Ajouter un technicien
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTechs.map((tech) => (
              <div
                key={tech._id}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all group relative"
              >
                {/* Badges statut */}
                <div className="absolute top-4 right-4 flex gap-2 flex-col items-end">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    tech.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tech.isActive ? '✓ Actif' : 'Inactif'}
                  </span>
                  {tech.isActive && (
                    <button
                      onClick={() => toggleAvailability(tech)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        tech.isAvailable 
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } transition`}
                    >
                      {tech.isAvailable ? '🟢 Disponible' : '🔴 Occupé'}
                    </button>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg">
                  {tech.name.charAt(0).toUpperCase()}
                </div>

                {/* Infos principales */}
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 text-lg mb-1 pr-28 truncate">
                    {tech.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">{tech.technicianId}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span>{tech.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span>{tech.experience} an{tech.experience > 1 ? 's' : ''} d'expérience</span>
                  </div>
                </div>

                {/* Spécialités */}
                {tech.specialties && tech.specialties.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {tech.specialties.slice(0, 3).map((spec, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                          {spec}
                        </span>
                      ))}
                      {tech.specialties.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                          +{tech.specialties.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Statistiques */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{tech.stats.totalReports || 0}</div>
                    <div className="text-xs text-gray-500">Rapports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                      {(tech.stats.averageRating || 0).toFixed(1)}
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                    <div className="text-xs text-gray-500">Note</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{tech.stats.completionRate || 0}%</div>
                    <div className="text-xs text-gray-500">Complété</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal('view', tech)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-medium hover:scale-105"
                  >
                    <Eye className="h-4 w-4" />
                    Voir
                  </button>
                  
                  <button
                    onClick={() => openModal('edit', tech)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-all text-sm font-medium hover:scale-105"
                  >
                    <Edit3 className="h-4 w-4" />
                    Modifier
                  </button>
                  
                  <button
                    onClick={() => handleDelete(tech._id)}
                    className="inline-flex items-center justify-center p-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all hover:scale-105"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4">
              <div className="text-sm text-gray-600 font-medium">
                Page <span className="text-orange-600">{currentPage}</span> sur {totalPages} • {total} technicien{total > 1 ? 's' : ''}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modale Add/Edit/View */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 shadow-2xl">
            {/* En-tête modale */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold">
                {modalMode === 'add' && '✨ Nouveau technicien'}
                {modalMode === 'edit' && '✏️ Modifier le technicien'}
                {modalMode === 'view' && '👨‍🔧 Détails du technicien'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Contenu modale */}
            <div className="p-6 space-y-6">
              {modalMode === 'view' && selectedTech ? (
                // Mode Vue
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                      {selectedTech.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-gray-900">{selectedTech.name}</h3>
                      <p className="text-sm text-gray-500 font-mono mt-1">{selectedTech.technicianId}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                          selectedTech.isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                        }`}>
                          {selectedTech.isActive ? '✓ Actif' : 'Inactif'}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                          selectedTech.isAvailable ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-700'
                        }`}>
                          {selectedTech.isAvailable ? '🟢 Disponible' : '🔴 Occupé'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                      <div className="text-sm text-blue-700 font-medium mb-1 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                      <div className="font-semibold text-blue-900 break-all">{selectedTech.email}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                      <div className="text-sm text-green-700 font-medium mb-1 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </div>
                      <div className="font-semibold text-green-900">{selectedTech.phone}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                      <div className="text-sm text-purple-700 font-medium mb-1 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Expérience
                      </div>
                      <div className="font-semibold text-purple-900">{selectedTech.experience} an{selectedTech.experience > 1 ? 's' : ''}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
                      <div className="text-sm text-yellow-700 font-medium mb-1 flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Note moyenne
                      </div>
                      <div className="font-semibold text-yellow-900">{(selectedTech.stats.averageRating || 0).toFixed(1)}/5</div>
                    </div>
                  </div>

                  {/* Spécialités */}
                  {selectedTech.specialties && selectedTech.specialties.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Spécialités
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTech.specialties.map((spec, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-200 text-blue-800 text-sm rounded-lg font-medium">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {selectedTech.certifications && selectedTech.certifications.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Certifications
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTech.certifications.map((cert, idx) => (
                          <span key={idx} className="px-3 py-1 bg-green-200 text-green-800 text-sm rounded-lg font-medium">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statistiques détaillées */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-xl p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{selectedTech.stats.totalReports || 0}</div>
                      <div className="text-xs text-gray-600 mt-1">Rapports totaux</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedTech.stats.completionRate || 0}%</div>
                      <div className="text-xs text-gray-600 mt-1">Taux complétion</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{selectedTech.stats.onTimeRate || 0}%</div>
                      <div className="text-xs text-gray-600 mt-1">Ponctualité</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedTech.stats.averageResponseTime || 0}min</div>
                      <div className="text-xs text-gray-600 mt-1">Temps réponse</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        closeModal()
                        setTimeout(() => openModal('edit', selectedTech), 100)
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl hover:from-orange-700 hover:to-red-600 transition-all font-semibold shadow-lg hover:scale-105"
                    >
                      <Edit3 className="h-5 w-5" />
                      Modifier ce technicien
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                // Mode Add/Edit - Formulaire
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Informations de base */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Informations de base
                      </h3>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Jean Dupont"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="jean@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Téléphone *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="+221 77 123 45 67"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {modalMode === 'add' ? 'Mot de passe *' : 'Nouveau mot de passe (optionnel)'}
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="••••••••"
                          required={modalMode === 'add'}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Années d'expérience
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    {/* Spécialités */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 mt-4">
                        <Wrench className="h-5 w-5" />
                        Spécialités
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.specialties.map((spec, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                            {spec}
                            <button
                              type="button"
                              onClick={() => removeSpecialty(spec)}
                              className="hover:bg-blue-200 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addSpecialty()
                            }
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Ajouter une spécialité..."
                        />
                        <button
                          type="button"
                          onClick={addSpecialty}
                          className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {predefinedSpecialties.map(spec => (
                          !formData.specialties.includes(spec) && (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => setFormData({ ...formData, specialties: [...formData.specialties, spec] })}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200"
                            >
                              + {spec}
                            </button>
                          )
                        ))}
                      </div>
                    </div>

                    {/* Certifications */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 mt-4">
                        <Award className="h-5 w-5" />
                        Certifications
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.certifications.map((cert, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            {cert}
                            <button
                              type="button"
                              onClick={() => removeCertification(cert)}
                              className="hover:bg-green-200 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCertification}
                          onChange={(e) => setNewCertification(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addCertification()
                            }
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Ajouter une certification..."
                        />
                        <button
                          type="button"
                          onClick={addCertification}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Horaires de travail */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 mt-4">
                        <Clock className="h-5 w-5" />
                        Horaires de travail
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Début</label>
                          <input
                            type="time"
                            value={formData.workingHours.start}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              workingHours: { ...formData.workingHours, start: e.target.value }
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Fin</label>
                          <input
                            type="time"
                            value={formData.workingHours.end}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              workingHours: { ...formData.workingHours, end: e.target.value }
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-3 cursor-pointer p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors w-full">
                            <input
                              type="checkbox"
                              checked={formData.workingHours.weekends}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                workingHours: { ...formData.workingHours, weekends: e.target.checked }
                              })}
                              className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-sm font-medium text-orange-900">Week-ends</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl hover:from-orange-700 hover:to-red-600 transition-all font-semibold shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Enregistrement...
                        </span>
                      ) : (
                        modalMode === 'edit' ? 'Enregistrer les modifications' : 'Créer le technicien'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





