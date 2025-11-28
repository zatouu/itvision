'use client'

import { useState, useEffect } from 'react'
import { 
  Users, Plus, Search, Filter, Edit2, Trash2, Eye, Building, User, 
  Mail, Phone, MapPin, X, Check, Save, Calendar, FolderKanban,
  FileText, TrendingUp
} from 'lucide-react'

type Client = {
  id: string
  clientId: string
  type: 'Particulier' | 'Entreprise'
  name: string
  prenom?: string
  entreprise?: string
  contactPrincipal?: string
  email: string
  phone: string
  address?: string
  ville?: string
  pays?: string
  notes?: string
  projectsCount?: number
  createdAt: string
}

type Contact = {
  id: string
  nom: string
  fonction?: string
  telephone?: string
  email?: string
  isPrimary?: boolean
}

type Project = {
  id: string
  name: string
  status: string
}

export default function ClientManagementSystem() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'Particulier' | 'Entreprise'>('all')
  const [filterVille, setFilterVille] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientDetails, setClientDetails] = useState<any>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Formulaire
  const [formData, setFormData] = useState({
    type: 'Particulier' as 'Particulier' | 'Entreprise',
    name: '',
    prenom: '',
    entreprise: '',
    contactPrincipal: '',
    email: '',
    phone: '',
    address: '',
    ville: '',
    pays: 'Sénégal',
    notes: '',
    projectIds: [] as string[],
    contacts: [] as Contact[]
  })

  const [newContact, setNewContact] = useState({ nom: '', fonction: '', telephone: '', email: '', isPrimary: false })
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])

  useEffect(() => {
    loadClients()
    loadProjects()
  }, [searchTerm, filterType, filterVille])

  const loadClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('q', searchTerm)
      if (filterType !== 'all') params.append('type', filterType)
      if (filterVille) params.append('ville', filterVille)
      params.append('limit', '100')

      const res = await fetch(`/api/admin/clients?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Erreur chargement clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects?status=all&limit=500', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAvailableProjects(data.projects || [])
      }
    } catch {}
  }

  const loadClientDetails = async (clientId: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setClientDetails(data)
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error)
    }
  }

  const handleCreate = () => {
    setFormData({
      type: 'Particulier',
      name: '',
      prenom: '',
      entreprise: '',
      contactPrincipal: '',
      email: '',
      phone: '',
      address: '',
      ville: '',
      pays: 'Sénégal',
      notes: '',
      projectIds: [],
      contacts: []
    })
    setNewContact({ nom: '', fonction: '', telephone: '', email: '', isPrimary: false })
    setEditingClient(null)
    setShowCreateModal(true)
  }

  const handleEdit = (client: Client) => {
    setFormData({
      type: client.type,
      name: client.name,
      prenom: client.prenom || '',
      entreprise: client.entreprise || '',
      contactPrincipal: client.contactPrincipal || '',
      email: client.email,
      phone: client.phone,
      address: client.address || '',
      ville: client.ville || '',
      pays: client.pays || 'Sénégal',
      notes: client.notes || '',
      projectIds: [],
      contacts: []
    })
    setEditingClient(client)
    setShowCreateModal(true)
  }

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client)
    await loadClientDetails(client.id)
    setShowDetailsModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        ...(editingClient ? { id: editingClient.id } : {})
      }

      const method = editingClient ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }

      alert(editingClient ? 'Client modifié avec succès' : 'Client créé avec succès')
      setShowCreateModal(false)
      loadClients()
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    }
  }

  const handleDelete = async (client: Client) => {
    if (!confirm(`Désactiver le client ${client.name} ?`)) return
    try {
      const res = await fetch(`/api/admin/clients?id=${client.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        alert('Client désactivé')
        loadClients()
      } else {
        const err = await res.json()
        alert(`Erreur: ${err.error}`)
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    }
  }

  const addContact = () => {
    if (!newContact.nom.trim()) return
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { ...newContact, id: Date.now().toString() }]
    }))
    setNewContact({ nom: '', fonction: '', telephone: '', email: '', isPrimary: false })
  }

  const removeContact = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx)
    }))
  }

  const villes = Array.from(new Set(clients.map(c => c.ville).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Clients</h1>
          <p className="text-gray-600 mt-1">Gérez vos clients particuliers et entreprises</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous les types</option>
              <option value="Particulier">Particulier</option>
              <option value="Entreprise">Entreprise</option>
            </select>
          </div>
          <div>
            <select
              value={filterVille}
              onChange={(e) => setFilterVille(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Toutes les villes</option>
              {villes.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des clients */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Localisation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Projets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date création</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {client.type === 'Entreprise' ? client.entreprise || client.name : `${client.name} ${client.prenom || ''}`.trim()}
                      </div>
                      {client.type === 'Entreprise' && client.contactPrincipal && (
                        <div className="text-sm text-gray-500">{client.contactPrincipal}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        client.type === 'Entreprise' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {client.type === 'Entreprise' ? <Building className="h-3 w-3 inline mr-1" /> : <User className="h-3 w-3 inline mr-1" />}
                        {client.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{client.email}</div>
                      <div className="text-sm text-gray-500">{client.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {client.ville && <div>{client.ville}</div>}
                      {client.pays && <div className="text-xs text-gray-500">{client.pays}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                        <FolderKanban className="h-4 w-4" />
                        {client.projectsCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(client)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Désactiver"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Aucun client trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal création/édition */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Type de client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de client *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="Particulier"
                      checked={formData.type === 'Particulier'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="text-emerald-600"
                    />
                    <User className="h-4 w-4" />
                    <span>Particulier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="Entreprise"
                      checked={formData.type === 'Entreprise'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="text-emerald-600"
                    />
                    <Building className="h-4 w-4" />
                    <span>Entreprise</span>
                  </label>
                </div>
              </div>

              {/* Champs selon type */}
              {formData.type === 'Particulier' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
                    <input
                      type="text"
                      required
                      value={formData.entreprise}
                      onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
                    <input
                      type="text"
                      value={formData.contactPrincipal}
                      onChange={(e) => setFormData({ ...formData, contactPrincipal: e.target.value })}
                      placeholder="Responsable projet"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Coordonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <input
                    type="text"
                    value={formData.pays}
                    onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Contacts supplémentaires (Entreprise) */}
              {formData.type === 'Entreprise' && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Contacts supplémentaires</h3>
                  {formData.contacts.map((contact, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg mb-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{contact.nom}</div>
                        <div className="text-sm text-gray-600">{contact.fonction} {contact.email && `• ${contact.email}`}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeContact(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newContact.nom}
                      onChange={(e) => setNewContact({ ...newContact, nom: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Fonction"
                      value={newContact.fonction}
                      onChange={(e) => setNewContact({ ...newContact, fonction: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={newContact.telephone}
                      onChange={(e) => setNewContact({ ...newContact, telephone: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={addContact}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              )}

              {/* Lien avec projets */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Lier à des projets</h3>
                <select
                  multiple
                  value={formData.projectIds}
                  onChange={(e) => setFormData({ ...formData, projectIds: Array.from(e.target.selectedOptions, opt => opt.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[100px]"
                >
                  {availableProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Maintenez Ctrl/Cmd pour sélectionner plusieurs projets</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingClient ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails */}
      {showDetailsModal && selectedClient && clientDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Détails du client</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Type</h3>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    selectedClient.type === 'Entreprise' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {selectedClient.type}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Nom</h3>
                  <p className="text-gray-900">{selectedClient.name} {selectedClient.prenom}</p>
                </div>
                {selectedClient.type === 'Entreprise' && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Entreprise</h3>
                      <p className="text-gray-900">{selectedClient.entreprise}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Contact principal</h3>
                      <p className="text-gray-900">{selectedClient.contactPrincipal}</p>
                    </div>
                  </>
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
                  <p className="text-gray-900">{selectedClient.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Téléphone</h3>
                  <p className="text-gray-900">{selectedClient.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Adresse</h3>
                  <p className="text-gray-900">{selectedClient.address || '-'}</p>
                  <p className="text-sm text-gray-600">{selectedClient.ville} {selectedClient.pays && `, ${selectedClient.pays}`}</p>
                </div>
              </div>

              {/* Contacts (si entreprise) */}
              {selectedClient.type === 'Entreprise' && clientDetails.contacts && clientDetails.contacts.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Contacts</h3>
                  <div className="space-y-2">
                    {clientDetails.contacts.map((contact: Contact) => (
                      <div key={contact.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium">{contact.nom} {contact.isPrimary && <span className="text-xs text-emerald-600">(Principal)</span>}</div>
                        <div className="text-sm text-gray-600">{contact.fonction} {contact.email && `• ${contact.email}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projets */}
              {clientDetails.projects && clientDetails.projects.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Projets ({clientDetails.projects.length})</h3>
                  <div className="space-y-2">
                    {clientDetails.projects.slice(0, 10).map((project: any) => (
                      <div key={project.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-gray-600">{project.status}</div>
                        </div>
                        <a href={`/admin/planning?id=${project.id}`} className="text-emerald-600 hover:text-emerald-700 text-sm">
                          Voir →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interventions récentes */}
              {clientDetails.interventions && clientDetails.interventions.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Interventions récentes</h3>
                  <div className="space-y-2">
                    {clientDetails.interventions.slice(0, 5).map((intervention: any) => (
                      <div key={intervention.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium">{intervention.typeIntervention}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(intervention.date).toLocaleDateString('fr-FR')} • {intervention.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}








