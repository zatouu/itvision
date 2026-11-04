'use client'

import { useEffect, useState } from 'react'
import { Search, Building2, Mail, Phone, RefreshCw, Users, TrendingUp, ShieldCheck, UserCheck, ChevronLeft, ChevronRight, ExternalLink, Filter } from 'lucide-react'
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
  permissions?: {
    canAccessPortal?: boolean
  }
  activeContracts?: Array<{
    contractId: string
    type: string
  }>
}

interface Metrics {
  total: number
  active: number
  portalEnabled: number
}

export default function ClientAdminInterface() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, portalEnabled: 0 })
  const perPage = 12

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
        
        // Utiliser les métriques globales de l'API
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
  }, [currentPage, searchTerm, companyFilter])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* En-tête avec titre et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
            Gestion des Clients
          </h1>
          <p className="text-gray-600 mt-2 text-sm">Gérez vos clients et leurs accès aux portails</p>
        </div>
        <button 
          onClick={fetchClients} 
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total clients</div>
            <Users className="h-5 w-5 text-emerald-500" />
          </div>
          {loading ? (
            <Skeleton variant="title" className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">{metrics.total}</div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Clients actifs</div>
            <UserCheck className="h-5 w-5 text-blue-500" />
          </div>
          {loading ? (
            <Skeleton variant="title" className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">{metrics.active}</div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Accès portail</div>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          {loading ? (
            <Skeleton variant="title" className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">{metrics.portalEnabled}</div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filtres de recherche</h3>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton variant="title" className="w-24 h-4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton variant="title" className="w-24 h-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche globale</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }} 
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" 
                  placeholder="Nom, email, téléphone, entreprise..." 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par entreprise</label>
              <input 
                type="text" 
                value={companyFilter} 
                onChange={(e) => { setCompanyFilter(e.target.value); setCurrentPage(1) }} 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" 
                placeholder="Ex: IT Solutions, Tech Corp..." 
              />
            </div>
          </div>
        )}
      </div>

      {/* Liste des clients */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Clients {!loading && <span className="text-sm font-normal text-gray-500">({total})</span>}
            </h3>
            {!loading && total > 0 && (
              <div className="text-sm text-gray-500">
                Page {currentPage} sur {totalPages}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: perPage }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <Skeleton variant="title" className="h-5 w-32 mb-3" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-500 mb-2">{error}</div>
            <button 
              onClick={fetchClients}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              Réessayer
            </button>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">Aucun client trouvé</p>
            <p className="text-sm text-gray-500">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((c) => {
                  const activeContracts = c.activeContracts?.length || 0
                  const hasPortalAccess = c.permissions?.canAccessPortal || false
                  
                  return (
                    <div 
                      key={c._id} 
                      className="group border border-gray-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 font-mono mb-1 truncate">{c.clientId}</div>
                          <h4 className="text-base font-semibold text-gray-900 truncate">
                            {c.company || c.name}
                          </h4>
                          {c.company && c.name !== c.company && (
                            <p className="text-sm text-gray-600 truncate">{c.name}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          {c.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              Inactif
                            </span>
                          )}
                          {hasPortalAccess && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              Portail
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                        {activeContracts > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-emerald-600 font-medium">
                              {activeContracts} contrat{activeContracts > 1 ? 's' : ''} actif{activeContracts > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          Créé le {new Date(c.createdAt).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                          <span>Voir</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Affichage de <span className="font-medium text-gray-900">{(currentPage - 1) * perPage + 1}</span> à{' '}
                    <span className="font-medium text-gray-900">{Math.min(currentPage * perPage, total)}</span> sur{' '}
                    <span className="font-medium text-gray-900">{total}</span> clients
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                      disabled={currentPage === 1 || loading}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={loading}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                              currentPage === pageNum
                                ? 'bg-emerald-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                            } disabled:opacity-50`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                      disabled={currentPage === totalPages || loading}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
