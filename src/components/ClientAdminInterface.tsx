'use client'

import { useEffect, useState } from 'react'
import { Search, Building2, Mail, Phone, RefreshCw, Users } from 'lucide-react'
import Skeleton from './Skeleton'

interface Client {
  _id: string
  clientId: string
  name: string
  email: string
  phone: string
  company?: string
  isActive: boolean
  createdAt: string
}

export default function ClientAdminInterface() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 10

  const fetchClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * perPage).toString(),
        limit: perPage.toString(),
        q: searchTerm,
        ...(companyFilter && { company: companyFilter })
      })
      const res = await fetch(`/api/admin/clients?${params}`)
      const data = await res.json()
      if (data.success) {
        setClients(data.clients)
        setTotal(data.total)
        setError('')
      } else {
        setError(data.error || 'Erreur lors du chargement')
      }
    } catch (e) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [currentPage, searchTerm, companyFilter])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-8 w-8 mr-3 text-blue-600" />
            Gestion des Clients
          </h1>
          <p className="text-gray-600 mt-2">Filtrez par entreprise et mots-clés</p>
        </div>
        <button onClick={fetchClients} className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Skeleton variant="title" className="w-24" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton variant="title" className="w-24" /><Skeleton className="h-10 w-full" /></div>
            <div className="flex items-end"><Skeleton className="h-10 w-28" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nom, email, téléphone..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise (company)</label>
              <input type="text" value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setCurrentPage(1) }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: IT Solutions" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Clients ({clients.length})</h3></div>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: perPage }).map((_, i) => (<Skeleton key={i} className="h-14 w-full" />))}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {clients.map((c) => (
              <div key={c._id} className="p-6 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">{c.clientId}</div>
                  <div className="text-lg font-semibold text-gray-900">{c.company || c.name}</div>
                  <div className="text-sm text-gray-600 flex items-center"><Mail className="h-4 w-4 mr-1" />{c.email}</div>
                  <div className="text-sm text-gray-600 flex items-center"><Phone className="h-4 w-4 mr-1" />{c.phone}</div>
                </div>
                <div className="text-sm text-gray-500">Créé le {new Date(c.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">Page {currentPage} sur {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Précédent</button>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Suivant</button>
          </div>
        </div>
      )}
    </div>
  )
}
