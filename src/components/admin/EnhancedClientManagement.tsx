'use client'

import { useEffect, useState } from 'react'
import { 
  Search, Building2, Mail, Phone, RefreshCw, Users, ShieldCheck, 
  UserCheck, ChevronLeft, ChevronRight, Filter, Plus, Edit3, Trash2,
  Eye, Download, X, Check, MoreVertical, MapPin, Calendar, FileText,
  Activity, AlertCircle, CheckCircle2
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
}

interface Metrics {
  total: number
  active: number
  portalEnabled: number
}

export default function EnhancedClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, portalEnabled: 0 })
  
  // Modale
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
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
    notes: ''
  })
  
  const [saving, setSaving] = useState(false)
  const perPage = 12

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
            portalEnabled: data.metrics.portalEnabledClients || 0
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
  }, [currentPage, searchTerm, statusFilter])

  const openModal = (mode: 'add' | 'edit' | 'view', client?: Client) => {
    setModalMode(mode)
    setSelectedClient(client || null)
    
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
        notes: ''
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
        notes: client.notes || ''
      })
    }
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedClient(null)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSaving(true)
    try {
      const url = modalMode === 'edit' && selectedClient 
        ? `/api/admin/clients/${selectedClient._id}`
        : '/api/admin/clients'
      
      const method = modalMode === 'edit' ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      
      if (data.success) {
        alert(modalMode === 'edit' ? 'Client modifié avec succès' : 'Client créé avec succès')
        closeModal()
        fetchClients()
      } else {
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      alert('Erreur de connexion')
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
        alert('Client supprimé avec succès')
        fetchClients()
      } else {
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      alert('Erreur de connexion')
    }
  }

  const handleToggleStatus = async (client: Client) => {
    try {
      const res = await fetch(`/api/admin/clients/${client._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !client.isActive })
      })

      const data = await res.json()
      
      if (data.success) {
        fetchClients()
      } else {
        alert(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      alert('Erreur de connexion')
    }
  }

  const exportClients = () => {
    const csv = [
      ['Nom', 'Email', 'Téléphone', 'Entreprise', 'Ville', 'Statut', 'Portail', 'Date création'].join(','),
      ...clients.map(c => [
        c.name,
        c.email,
        c.phone,
        c.company || '',
        c.city || '',
        c.isActive ? 'Actif' : 'Inactif',
        c.permissions?.canAccessPortal ? 'Oui' : 'Non',
        new Date(c.createdAt).toLocaleDateString('fr-FR')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
            Gestion des Clients
          </h1>
          <p className="text-gray-600 mt-2 text-sm">Gérez vos clients et leurs accès aux portails</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => openModal('add')}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-600/30"
          >
            <Plus className="h-5 w-5" />
            Nouveau client
          </button>
          
          <button 
            onClick={exportClients}
            disabled={clients.length === 0}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
          
          <button 
            onClick={fetchClients} 
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-600">Total clients</div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.total}</div>
          <p className="text-xs text-gray-500 mt-2">Tous les clients enregistrés</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-600">Clients actifs</div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.active}</div>
          <p className="text-xs text-gray-500 mt-2">
            {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}% du total
          </p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-600">Accès portail</div>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.portalEnabled}</div>
          <p className="text-xs text-gray-500 mt-2">Avec accès au portail client</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Nom, email, téléphone, entreprise..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtre statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Tous les clients</option>
              <option value="active">Actifs uniquement</option>
              <option value="inactive">Inactifs uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Erreur</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Liste des clients */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client trouvé</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Aucun client ne correspond à vos critères de recherche'
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
            {clients.map((client) => (
              <div
                key={client._id}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all group relative"
              >
                {/* Badge statut */}
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-xl mb-4">
                  {client.name.charAt(0).toUpperCase()}
                </div>

                {/* Infos principales */}
                <h3 className="font-semibold text-gray-900 text-lg mb-1 pr-16 truncate">
                  {client.name}
                </h3>
                
                {client.company && (
                  <p className="text-sm text-gray-600 mb-3 truncate">{client.company}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                  
                  {client.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.city}</span>
                    </div>
                  )}
                </div>

                {/* Infos supplémentaires */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  
                  {client.permissions?.canAccessPortal && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <ShieldCheck className="h-3 w-3" />
                      Portail
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openModal('view', client)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    Voir
                  </button>
                  
                  <button
                    onClick={() => openModal('edit', client)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    <Edit3 className="h-4 w-4" />
                    Modifier
                  </button>
                  
                  <button
                    onClick={() => handleDelete(client._id)}
                    className="inline-flex items-center justify-center p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
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
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages} • {total} client{total > 1 ? 's' : ''} au total
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </button>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
            {/* En-tête modale */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'add' && 'Nouveau client'}
                {modalMode === 'edit' && 'Modifier le client'}
                {modalMode === 'view' && 'Détails du client'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenu modale */}
            <div className="p-6 space-y-6">
              {modalMode === 'view' && selectedClient ? (
                // Mode Vue
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-3xl">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedClient.name}</h3>
                      {selectedClient.company && (
                        <p className="text-gray-600">{selectedClient.company}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Email</div>
                      <div className="font-medium text-gray-900">{selectedClient.email}</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Téléphone</div>
                      <div className="font-medium text-gray-900">{selectedClient.phone}</div>
                    </div>
                    
                    {selectedClient.address && (
                      <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                        <div className="text-sm text-gray-600 mb-1">Adresse</div>
                        <div className="font-medium text-gray-900">
                          {selectedClient.address}
                          {selectedClient.city && `, ${selectedClient.city}`}
                          {selectedClient.country && `, ${selectedClient.country}`}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Statut</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedClient.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedClient.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Accès portail</div>
                      <div className="flex items-center gap-2">
                        {selectedClient.permissions?.canAccessPortal ? (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                            Activé
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                            Désactivé
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                      <div className="text-sm text-gray-600 mb-1">Date de création</div>
                      <div className="font-medium text-gray-900">
                        {new Date(selectedClient.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {selectedClient.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-blue-900 mb-2">Notes</div>
                      <div className="text-sm text-blue-800">{selectedClient.notes}</div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        closeModal()
                        openModal('edit', selectedClient)
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Edit3 className="h-5 w-5" />
                      Modifier
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Jean Dupont"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entreprise
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Nom de l'entreprise"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="email@exemple.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="+221 77 123 45 67"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adresse
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="123 Rue de..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Dakar"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pays
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Sénégal"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes internes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        rows={3}
                        placeholder="Notes ou remarques sur le client..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.canAccessPortal}
                          onChange={(e) => setFormData({ ...formData, canAccessPortal: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Activer l'accès au portail client</div>
                          <div className="text-sm text-gray-500">Le client pourra se connecter pour voir ses projets et devis</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          {modalMode === 'edit' ? 'Enregistrer' : 'Créer'}
                        </>
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

