'use client'

import { useEffect, useState } from 'react'
import { 
  Search, Building2, Mail, Phone, RefreshCw, Users, ShieldCheck, 
  UserCheck, ChevronLeft, ChevronRight, Filter, Plus, Edit3, Trash2,
  Eye, Download, X, Check, MapPin, Calendar, FileText, Upload,
  Activity, AlertCircle, CheckCircle2, Tag, Briefcase, Globe,
  Star, TrendingUp, MessageSquare, Settings, Archive, UserX
} from 'lucide-react'

interface Client {
  _id: string
  clientId: string
  name: string
  email: string
  phone: string
  company?: string
  address?: string
  city?: string
  country?: string
  isActive: boolean
  createdAt: string
  permissions?: {
    canAccessPortal?: boolean
  }
  activeContracts?: Array<{
    contractId: string
    type: string
  }>
  notes?: string
  tags?: string[]
  category?: string
  rating?: number
  lastContact?: string
}

interface Metrics {
  total: number
  active: number
  portalEnabled: number
  withContracts?: number
}

interface ValidationErrors {
  name?: string
  email?: string
  phone?: string
}

export default function ImprovedClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, portalEnabled: 0, withContracts: 0 })
  
  // Modale
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  // Import
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  
  // Formulaire
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    country: 'Sénégal',
    canAccessPortal: true,
    notes: '',
    tags: [] as string[],
    category: '',
    rating: 0
  })
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')
  const perPage = 12

  // Catégories prédéfinies
  const categories = ['PME', 'Grande Entreprise', 'Administration', 'ONG', 'Particulier']
  
  // Tags populaires
  const popularTags = ['VIP', 'Prioritaire', 'Urgent', 'Fidèle', 'Nouveau', 'Prospect']

  // Validation en temps réel
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Le nom est obligatoire'
        if (value.length < 2) return 'Le nom doit contenir au moins 2 caractères'
        break
      case 'email':
        if (!value.trim()) return 'L\'email est obligatoire'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return 'Email invalide'
        break
      case 'phone':
        if (!value.trim()) return 'Le téléphone est obligatoire'
        if (value.length < 9) return 'Numéro de téléphone invalide'
        break
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    const error = validateField(field, value)
    
    // Mettre à jour les erreurs en supprimant celles qui sont résolues
    const newErrors = { ...validationErrors }
    if (error) {
      newErrors[field as keyof ValidationErrors] = error
    } else {
      delete newErrors[field as keyof ValidationErrors]
    }
    setValidationErrors(newErrors)
  }

  const fetchClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * perPage).toString(),
        limit: perPage.toString(),
        q: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter })
      })
      
      const res = await fetch(`/api/admin/clients?${params}`)
      const data = await res.json()
      
      if (data.success) {
        setClients(data.clients)
        setTotal(data.total)
        setError('')
        
        if (data.metrics) {
          setMetrics({
            total: data.metrics.totalClients || 0,
            active: data.metrics.activeClients || 0,
            portalEnabled: data.metrics.portalEnabledClients || 0,
            withContracts: data.clients.filter((c: Client) => c.activeContracts && c.activeContracts.length > 0).length
          })
        }
      } else {
        setError(data.error || 'Erreur lors du chargement')
      }
    } catch (e) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchClients() 
  }, [currentPage, searchTerm, statusFilter, categoryFilter])

  const openModal = (mode: 'add' | 'edit' | 'view', client?: Client) => {
    setModalMode(mode)
    setSelectedClient(client || null)
    setValidationErrors({})
    
    if (mode === 'add') {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        country: 'Sénégal',
        canAccessPortal: true,
        notes: '',
        tags: [],
        category: '',
        rating: 0
      })
    } else if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company || '',
        address: client.address || '',
        city: client.city || '',
        country: client.country || 'Sénégal',
        canAccessPortal: client.permissions?.canAccessPortal ?? true,
        notes: client.notes || '',
        tags: client.tags || [],
        category: client.category || '',
        rating: client.rating || 0
      })
    }
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedClient(null)
    setValidationErrors({})
  }

  const handleSave = async () => {
    console.log('handleSave appelé', formData)
    
    // Validation finale
    const errors: ValidationErrors = {}
    if (!formData.name.trim()) errors.name = 'Le nom est obligatoire'
    if (!formData.email.trim()) errors.email = 'L\'email est obligatoire'
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) errors.email = 'Email invalide'
    }
    if (!formData.phone.trim()) errors.phone = 'Le téléphone est obligatoire'
    
    if (Object.keys(errors).length > 0) {
      console.log('Erreurs de validation:', errors)
      setValidationErrors(errors)
      alert('Veuillez corriger les erreurs avant de soumettre')
      return
    }

    setSaving(true)
    try {
      const url = modalMode === 'edit' && selectedClient 
        ? `/api/admin/clients/${selectedClient._id}`
        : '/api/admin/clients'
      
      const method = modalMode === 'edit' ? 'PUT' : 'POST'
      
      console.log('Envoi requête:', method, url, formData)
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      console.log('Réponse API:', data)
      
      if (data.success) {
        alert(modalMode === 'edit' ? 'Client modifié avec succès !' : 'Client créé avec succès !')
        closeModal()
        fetchClients()
      } else {
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur de connexion: ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return

    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      
      if (data.success) {
        fetchClients()
      } else {
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      alert('Erreur de connexion')
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      alert('Veuillez sélectionner un fichier')
      return
    }

    setImporting(true)
    try {
      const text = await importFile.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      const clientsToImport = []
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        const values = lines[i].split(',').map(v => v.trim())
        
        const client: any = {}
        headers.forEach((header, index) => {
          client[header.toLowerCase()] = values[index]
        })
        
        if (client.name && client.email && client.phone) {
          clientsToImport.push({
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company || client.entreprise || '',
            address: client.address || client.adresse || '',
            city: client.city || client.ville || '',
            country: client.country || client.pays || 'Sénégal',
            canAccessPortal: true,
            notes: client.notes || ''
          })
        }
      }

      // Importer les clients un par un
      let imported = 0
      let errors = 0
      
      for (const client of clientsToImport) {
        try {
          const res = await fetch('/api/admin/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
          })
          
          if (res.ok) {
            imported++
          } else {
            errors++
          }
        } catch {
          errors++
        }
      }

      alert(`Import terminé: ${imported} clients importés, ${errors} erreurs`)
      setShowImportModal(false)
      setImportFile(null)
      fetchClients()
    } catch (error) {
      alert('Erreur lors de l\'import')
    } finally {
      setImporting(false)
    }
  }

  const exportClients = () => {
    const csv = [
      ['Nom', 'Email', 'Téléphone', 'Entreprise', 'Ville', 'Pays', 'Statut', 'Portail', 'Catégorie', 'Tags', 'Date création'].join(','),
      ...clients.map(c => [
        c.name,
        c.email,
        c.phone,
        c.company || '',
        c.city || '',
        c.country || '',
        c.isActive ? 'Actif' : 'Inactif',
        c.permissions?.canAccessPortal ? 'Oui' : 'Non',
        c.category || '',
        (c.tags || []).join(';'),
        new Date(c.createdAt).toLocaleDateString('fr-FR')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clients_it_vision_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] })
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  const totalPages = Math.ceil(total / perPage)
  
  const filteredClients = categoryFilter === 'all' 
    ? clients 
    : clients.filter(c => c.category === categoryFilter)

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* En-tête avec gradient vert IT Vision */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 text-white p-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-700" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-full px-4 py-1.5 mb-3">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium">Gestion Clients</span>
              </div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Building2 className="h-10 w-10" />
                Clients IT Vision
              </h1>
              <p className="text-white/90">Gérez votre portefeuille clients et leurs accès</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => openModal('add')}
                className="inline-flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-xl hover:bg-white/90 transition-all font-semibold shadow-lg hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Nouveau client
              </button>
              
              <button 
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-4 py-3 rounded-xl hover:bg-white/20 transition-all"
              >
                <Upload className="h-5 w-5" />
                Importer
              </button>
              
              <button 
                onClick={exportClients}
                disabled={clients.length === 0}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-4 py-3 rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques améliorées */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-blue-700">Total Clients</div>
            <div className="p-2.5 bg-blue-500 rounded-xl">
              <Users className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-900">{metrics.total}</div>
          <div className="text-xs text-blue-600 mt-1">Base complète</div>
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

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-purple-700">Portail activé</div>
            <div className="p-2.5 bg-purple-500 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-900">{metrics.portalEnabled}</div>
          <div className="text-xs text-purple-600 mt-1">Accès sécurisé</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-orange-700">Avec contrats</div>
            <div className="p-2.5 bg-orange-500 rounded-xl">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-900">{metrics.withContracts}</div>
          <div className="text-xs text-orange-600 mt-1">En cours</div>
        </div>
      </div>

      {/* Barre de recherche et filtres améliorés */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
            />
          </div>
          
          {/* Filtres */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
            >
              <option value="all">Toutes catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <button 
              onClick={fetchClients} 
              disabled={loading}
              className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-3 rounded-xl hover:bg-emerald-200 transition-colors disabled:opacity-50"
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

      {/* Liste des clients */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun client trouvé</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Aucun client ne correspond à vos critères'
              : 'Commencez par ajouter votre premier client'}
          </p>
          <button
            onClick={() => openModal('add')}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Ajouter un client
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div
                key={client._id}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all group relative"
              >
                {/* Badge statut */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    client.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.isActive ? '✓ Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Avatar avec initiales */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg">
                  {client.name.charAt(0).toUpperCase()}
                </div>

                {/* Infos principales */}
                <h3 className="font-bold text-gray-900 text-lg mb-1 pr-20 truncate">
                  {client.name}
                </h3>
                
                {client.company && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{client.company}</span>
                  </div>
                )}

                {/* Catégorie et Rating */}
                {client.category && (
                  <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg mb-3">
                    {client.category}
                  </span>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                  
                  {client.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{client.city}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {client.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-md font-medium">
                        #{tag}
                      </span>
                    ))}
                    {client.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                        +{client.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Infos supplémentaires */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  
                  {client.permissions?.canAccessPortal && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Portail
                    </div>
                  )}
                  
                  {client.activeContracts && client.activeContracts.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
                      <FileText className="h-3.5 w-3.5" />
                      {client.activeContracts.length}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openModal('view', client)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-medium hover:scale-105"
                  >
                    <Eye className="h-4 w-4" />
                    Voir
                  </button>
                  
                  <button
                    onClick={() => openModal('edit', client)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-all text-sm font-medium hover:scale-105"
                  >
                    <Edit3 className="h-4 w-4" />
                    Modifier
                  </button>
                  
                  <button
                    onClick={() => handleDelete(client._id)}
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
                Page <span className="text-emerald-600">{currentPage}</span> sur {totalPages} • {total} client{total > 1 ? 's' : ''}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </button>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modale Add/Edit/View */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-8 shadow-2xl">
            {/* En-tête modale */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-green-500 text-white px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold">
                {modalMode === 'add' && '✨ Nouveau client'}
                {modalMode === 'edit' && '✏️ Modifier le client'}
                {modalMode === 'view' && '👤 Détails du client'}
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
              {modalMode === 'view' && selectedClient ? (
                // Mode Vue
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900">{selectedClient.name}</h3>
                      {selectedClient.company && (
                        <p className="text-lg text-gray-600 flex items-center gap-2 mt-1">
                          <Briefcase className="h-5 w-5" />
                          {selectedClient.company}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                      <div className="text-sm text-blue-700 font-medium mb-1 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                      <div className="font-semibold text-blue-900">{selectedClient.email}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                      <div className="text-sm text-green-700 font-medium mb-1 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </div>
                      <div className="font-semibold text-green-900">{selectedClient.phone}</div>
                    </div>
                    
                    {selectedClient.address && (
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 col-span-2">
                        <div className="text-sm text-purple-700 font-medium mb-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Adresse
                        </div>
                        <div className="font-semibold text-purple-900">
                          {selectedClient.address}
                          {selectedClient.city && `, ${selectedClient.city}`}
                          {selectedClient.country && `, ${selectedClient.country}`}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                      <div className="text-sm text-orange-700 font-medium mb-1">Statut</div>
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                        selectedClient.isActive 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {selectedClient.isActive ? '✓ Actif' : 'Inactif'}
                      </span>
                    </div>
                    
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4">
                      <div className="text-sm text-teal-700 font-medium mb-1">Accès portail</div>
                      {selectedClient.permissions?.canAccessPortal ? (
                        <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-500 text-white">
                          ✓ Activé
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-gray-300 text-gray-700">
                          Désactivé
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedClient.tags && selectedClient.tags.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.tags.map((tag, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-200 text-purple-800 text-sm rounded-lg font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedClient.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Notes
                      </div>
                      <div className="text-sm text-blue-800">{selectedClient.notes}</div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        closeModal()
                        setTimeout(() => openModal('edit', selectedClient), 100)
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl hover:from-emerald-700 hover:to-green-600 transition-all font-semibold shadow-lg hover:scale-105"
                    >
                      <Edit3 className="h-5 w-5" />
                      Modifier ce client
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
                // Mode Add/Edit
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        className={`w-full px-4 py-3 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                        placeholder="Jean Dupont"
                        required
                      />
                      {validationErrors.name && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Entreprise
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Nom de l'entreprise"
                        />
                      </div>
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
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          className={`w-full pl-11 pr-4 py-3 border ${validationErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                          placeholder="email@exemple.com"
                          required
                        />
                      </div>
                      {validationErrors.email && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
                      )}
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
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          className={`w-full pl-11 pr-4 py-3 border ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                          placeholder="+221 77 123 45 67"
                          required
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.phone}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Adresse
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="123 Rue de..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Dakar"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pays
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Sénégal"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Catégorie
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner une catégorie</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:bg-purple-200 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addTag()
                            }
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Ajouter un tag..."
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {popularTags.map(tag => (
                          !formData.tags.includes(tag) && (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setFormData({ ...formData, tags: [...formData.tags, tag] })}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200"
                            >
                              + {tag}
                            </button>
                          )
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes internes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        rows={3}
                        placeholder="Notes ou remarques sur le client..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-3 cursor-pointer p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.canAccessPortal}
                          onChange={(e) => setFormData({ ...formData, canAccessPortal: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-semibold text-emerald-900 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            Activer l'accès au portail client
                          </div>
                          <div className="text-sm text-emerald-700">Le client pourra se connecter pour suivre ses projets et devis</div>
                        </div>
                      </label>
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
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl hover:from-emerald-700 hover:to-green-600 transition-all font-semibold shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Enregistrement...
                        </span>
                      ) : (
                        modalMode === 'edit' ? 'Enregistrer les modifications' : 'Créer le client'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Import CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Upload className="h-6 w-6" />
                Importer des clients (CSV)
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Format CSV attendu :</p>
                    <p className="font-mono text-xs bg-white px-2 py-1 rounded">
                      name,email,phone,company,address,city,country,notes
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Sélectionner le fichier CSV
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label 
                    htmlFor="csv-upload" 
                    className="cursor-pointer"
                  >
                    <span className="text-sm text-gray-600">
                      {importFile ? (
                        <span className="text-emerald-600 font-semibold">
                          ✓ {importFile.name}
                        </span>
                      ) : (
                        'Cliquez pour sélectionner un fichier CSV'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                  }}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-600 transition-all font-semibold shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {importing ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Import en cours...
                    </span>
                  ) : (
                    'Importer les clients'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

