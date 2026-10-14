'use client'

import { useState, useEffect } from 'react'
import {
  Briefcase,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  X,
  Loader2,
  Eye,
  UserCheck,
  AlertCircle,
  TrendingUp,
  Star
} from 'lucide-react'

interface MarketplaceActivity {
  id: string
  visitId?: string
  contractName?: string
  clientName: string
  site?: string
  date: string
  status: 'open' | 'assigned' | 'closed'
  bidsCount: number
  bestBidAmount?: number
  category: 'contract_visit' | 'ad_hoc' | 'product_install'
  productId?: string
  productName?: string
  installationOptions?: {
    includeMaterials?: boolean
    preferredDate?: string
    notes?: string
    quantity?: number
  }
  clientContact?: {
    name?: string
    email?: string
    phone?: string
    address?: string
  }
}

interface Bid {
  id: string
  amount: number
  availability: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  technicianName: string
  technicianPhone?: string
  createdAt: string
}

interface TechnicianScore {
  technicianId: string
  technicianName: string
  score: number
  zone?: string
  rating: number
  experience: number
  currentLoad: number
}

export default function AdminMarketplaceManager() {
  const [activities, setActivities] = useState<MarketplaceActivity[]>([])
  const [selectedActivity, setSelectedActivity] = useState<MarketplaceActivity | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [technicianScores, setTechnicianScores] = useState<TechnicianScore[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBids, setLoadingBids] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'assigned'>('open')

  useEffect(() => {
    loadActivities()
  }, [filter])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const statusParam = filter === 'all' ? 'all' : filter
      const response = await fetch(`/api/maintenance/activities?status=${statusParam}`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Erreur chargement activités:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBids = async (activityId: string) => {
    try {
      setLoadingBids(true)
      const response = await fetch(`/api/maintenance/activities/${activityId}/bids`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Erreur lors du chargement des offres')
      const data = await response.json()
      setBids(data.bids || [])
      
      // Calculer les scores des techniciens
      calculateTechnicianScores(data.bids || [])
    } catch (error) {
      console.error('Erreur chargement offres:', error)
    } finally {
      setLoadingBids(false)
    }
  }

  const calculateTechnicianScores = async (bidsList: Bid[]) => {
    // Récupérer les techniciens pour calculer les scores
    try {
      const techResponse = await fetch('/api/technicians', { credentials: 'include' })
      if (!techResponse.ok) return
      
      const techData = await techResponse.json()
      const technicians = techData.technicians || []

      const scores: TechnicianScore[] = bidsList.map((bid) => {
        const tech = technicians.find((t: any) => t.name === bid.technicianName)
        if (!tech) {
          return {
            technicianId: '',
            technicianName: bid.technicianName,
            score: 0,
            rating: 0,
            experience: 0,
            currentLoad: 0
          }
        }

        let score = 0
        // Bonus rating (0-50 points)
        score += (tech.stats?.averageRating || 0) * 10
        // Bonus expérience (0-20 points)
        score += Math.min(tech.experience || 0, 20)
        // Bonus disponibilité (0-30 points)
        score += tech.isAvailable ? 30 : 0
        // Bonus charge faible (0-20 points)
        score += Math.max(0, 20 - (tech.currentLoad || 0) / 5)

        return {
          technicianId: tech._id?.toString() || '',
          technicianName: bid.technicianName,
          score: Math.round(score),
          zone: tech.preferences?.zone,
          rating: tech.stats?.averageRating || 0,
          experience: tech.experience || 0,
          currentLoad: tech.currentLoad || 0
        }
      })

      // Trier par score décroissant
      scores.sort((a, b) => b.score - a.score)
      setTechnicianScores(scores)
    } catch (error) {
      console.error('Erreur calcul scores:', error)
    }
  }

  const handleAssign = async (activityId: string, bidId: string) => {
    if (!confirm('Confirmer l\'affectation de cette offre ?')) return

    try {
      setAssigning(true)
      const response = await fetch(`/api/maintenance/activities/${activityId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bidId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'affectation')
      }

      await loadActivities()
      if (selectedActivity) {
        await loadBids(selectedActivity.id)
      }
      alert('Offre affectée avec succès !')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'affectation')
    } finally {
      setAssigning(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'product_install':
        return 'Installation produit'
      case 'ad_hoc':
        return 'Intervention ponctuelle'
      case 'contract_visit':
        return 'Visite contrat'
      default:
        return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'product_install':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'ad_hoc':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'contract_visit':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-600" />
            Gestion Marketplace
          </h2>
          <button
            onClick={loadActivities}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'open'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ouvertes ({activities.filter(a => a.status === 'open').length})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'assigned'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Affectées ({activities.filter(a => a.status === 'assigned').length})
          </button>
        </div>
      </div>

      {/* Liste des activités */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`bg-white rounded-xl border-2 p-5 ${
              activity.status === 'assigned'
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 hover:shadow-lg transition-shadow'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${getCategoryColor(activity.category)}`}>
                    {getCategoryLabel(activity.category)}
                  </span>
                  {activity.status === 'assigned' && (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                      Affectée
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">
                  {activity.productName || activity.contractName || 'Mission'}
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {activity.clientName}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              {activity.site && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{activity.site}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(activity.date)}</span>
              </div>
              {activity.bestBidAmount && (
                <div className="flex items-center gap-2 font-semibold text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                  <span>Meilleure offre : {formatCurrency(activity.bestBidAmount)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Briefcase className="h-4 w-4" />
                <span>{activity.bidsCount} offre{activity.bidsCount > 1 ? 's' : ''}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedActivity(activity)
                loadBids(activity.id)
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Eye className="h-4 w-4" />
              Voir les offres
            </button>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune activité</h3>
          <p className="text-gray-600">Il n'y a actuellement aucune activité {filter === 'all' ? '' : filter === 'open' ? 'ouverte' : 'affectée'}.</p>
        </div>
      )}

      {/* Modal Détails & Offres */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedActivity.productName || selectedActivity.contractName || 'Mission'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{selectedActivity.clientName}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedActivity(null)
                  setBids([])
                  setTechnicianScores([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Détails mission */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedActivity.site || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(selectedActivity.date)}</span>
                </div>
                {selectedActivity.clientContact?.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-semibold">Téléphone :</span>
                    <span>{selectedActivity.clientContact.phone}</span>
                  </div>
                )}
                {selectedActivity.installationOptions?.quantity && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="h-4 w-4" />
                    <span>Quantité : {selectedActivity.installationOptions.quantity}</span>
                  </div>
                )}
              </div>

              {/* Liste des offres */}
              {loadingBids ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : bids.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-800">Aucune offre reçue pour cette mission</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Offres reçues ({bids.length})
                  </h4>

                  {/* Classement techniciens */}
                  {technicianScores.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h5 className="font-semibold text-blue-900 mb-2">Classement des techniciens</h5>
                      <div className="space-y-2 text-sm">
                        {technicianScores.slice(0, 3).map((tech, index) => (
                          <div key={tech.technicianId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-700">#{index + 1}</span>
                              <span className="font-medium">{tech.technicianName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-blue-600">
                              <span>Score: {tech.score}</span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {tech.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {bids.map((bid) => {
                      const techScore = technicianScores.find(t => t.technicianName === bid.technicianName)
                      const isBest = bid.amount === selectedActivity.bestBidAmount
                      
                      return (
                        <div
                          key={bid.id}
                          className={`border-2 rounded-lg p-4 ${
                            bid.status === 'accepted'
                              ? 'border-green-500 bg-green-50'
                              : bid.status === 'rejected'
                              ? 'border-red-200 bg-red-50 opacity-60'
                              : isBest
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-semibold text-gray-900">{bid.technicianName}</h5>
                                {isBest && bid.status === 'pending' && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-600 text-white">
                                    Meilleure offre
                                  </span>
                                )}
                                {bid.status === 'accepted' && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-600 text-white">
                                    Affectée
                                  </span>
                                )}
                                {bid.status === 'rejected' && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white">
                                    Refusée
                                  </span>
                                )}
                                {techScore && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                                    Score: {techScore.score}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2 font-semibold text-emerald-600">
                                  <DollarSign className="h-4 w-4" />
                                  <span>{formatCurrency(bid.amount)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(bid.availability)}</span>
                                </div>
                                {bid.technicianPhone && (
                                  <div className="text-gray-600">
                                    📞 {bid.technicianPhone}
                                  </div>
                                )}
                                {bid.message && (
                                  <div className="text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                    {bid.message}
                                  </div>
                                )}
                                {techScore && (
                                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                                    <div>Note: {techScore.rating.toFixed(1)}/5</div>
                                    <div>Expérience: {techScore.experience} ans</div>
                                    <div>Charge: {techScore.currentLoad}%</div>
                                    {techScore.zone && <div>Zone: {techScore.zone}</div>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {bid.status === 'pending' && (
                            <button
                              onClick={() => handleAssign(selectedActivity.id, bid.id)}
                              disabled={assigning}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                              {assigning ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Affectation...
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" />
                                  Affecter ce technicien
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )
                    })}
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

