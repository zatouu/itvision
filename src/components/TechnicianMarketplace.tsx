'use client'

import { useState, useEffect } from 'react'
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Package,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Send
} from 'lucide-react'

interface MarketplaceActivity {
  id: string
  visitId?: string
  contractId?: string
  contractName?: string
  clientName: string
  site?: string
  date: string
  status: 'open' | 'assigned' | 'closed'
  bidsCount: number
  bestBidAmount?: number
  category: 'contract_visit' | 'ad_hoc' | 'product_install'
  allowMarketplace: boolean
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
  marketplaceReason?: string
}

interface BidFormData {
  amount: number
  availability: string
  message: string
}

interface TechnicianMarketplaceProps {
  technicianId?: string
}

export default function TechnicianMarketplace({ technicianId }: TechnicianMarketplaceProps) {
  const [activities, setActivities] = useState<MarketplaceActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<MarketplaceActivity | null>(null)
  const [showBidForm, setShowBidForm] = useState(false)
  const [bidFormData, setBidFormData] = useState<BidFormData>({
    amount: 0,
    availability: '',
    message: ''
  })
  const [submittingBid, setSubmittingBid] = useState(false)
  const [filter, setFilter] = useState<'all' | 'product_install' | 'ad_hoc' | 'contract_visit'>('all')

  useEffect(() => {
    loadActivities()
  }, [filter])

  const loadActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const statusParam = 'open'
      const response = await fetch(`/api/maintenance/activities?status=${statusParam}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des missions')
      }

      const data = await response.json()
      let filtered = data.activities || []

      // Filtrer par catégorie
      if (filter !== 'all') {
        filtered = filtered.filter((a: MarketplaceActivity) => a.category === filter)
      }

      // Trier par date (plus proche en premier)
      filtered.sort((a: MarketplaceActivity, b: MarketplaceActivity) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })

      setActivities(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleBidSubmit = async () => {
    if (!selectedActivity) return
    if (!bidFormData.amount || !bidFormData.availability) {
      alert('Veuillez renseigner le montant et la disponibilité')
      return
    }

    try {
      setSubmittingBid(true)
      const response = await fetch(`/api/maintenance/activities/${selectedActivity.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Number(bidFormData.amount),
          availability: bidFormData.availability,
          message: bidFormData.message || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du dépôt de l\'offre')
      }

      // Recharger les activités pour mettre à jour les compteurs
      await loadActivities()
      setShowBidForm(false)
      setSelectedActivity(null)
      setBidFormData({ amount: 0, availability: '', message: '' })
      alert('Offre déposée avec succès !')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du dépôt de l\'offre')
    } finally {
      setSubmittingBid(false)
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

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Non renseigné'
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-600" />
            Marketplace des Missions
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
            onClick={() => setFilter('product_install')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'product_install'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Installations
          </button>
          <button
            onClick={() => setFilter('ad_hoc')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'ad_hoc'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Interventions
          </button>
          <button
            onClick={() => setFilter('contract_visit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'contract_visit'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Visites contrat
          </button>
        </div>
      </div>

      {/* Liste des missions */}
      {activities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune mission disponible</h3>
          <p className="text-gray-600">Il n'y a actuellement aucune mission ouverte sur le marketplace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
            >
              {/* En-tête mission */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${getCategoryColor(activity.category)}`}>
                      {getCategoryLabel(activity.category)}
                    </span>
                    {activity.bidsCount > 0 && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                        {activity.bidsCount} offre{activity.bidsCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {activity.productName || activity.contractName || 'Mission'}
                  </h3>
                  {activity.clientName && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {activity.clientName}
                    </p>
                  )}
                </div>
              </div>

              {/* Détails */}
              <div className="space-y-2 mb-4">
                {activity.site && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{activity.site}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(activity.date)}</span>
                </div>
                {activity.bestBidAmount && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                    <span>Meilleure offre : {formatCurrency(activity.bestBidAmount)}</span>
                  </div>
                )}
                {activity.installationOptions?.quantity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="h-4 w-4" />
                    <span>Quantité : {activity.installationOptions.quantity}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedActivity(activity)
                    setShowBidForm(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Faire une offre
                </button>
                <button
                  onClick={() => setSelectedActivity(activity)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dépôt d'offre */}
      {showBidForm && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Déposer une offre</h3>
              <button
                onClick={() => {
                  setShowBidForm(false)
                  setSelectedActivity(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Détails mission */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="font-semibold text-gray-900">{selectedActivity.productName || 'Mission'}</div>
              <div className="text-gray-600">{selectedActivity.clientName}</div>
              {selectedActivity.site && (
                <div className="text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedActivity.site}
                </div>
              )}
              <div className="text-gray-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(selectedActivity.date)}
              </div>
            </div>

            {/* Formulaire */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Montant proposé (FCFA) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={bidFormData.amount || ''}
                  onChange={(e) => setBidFormData({ ...bidFormData, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: 50000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Disponibilité (date et heure) *
                </label>
                <input
                  type="datetime-local"
                  value={bidFormData.availability}
                  onChange={(e) => setBidFormData({ ...bidFormData, availability: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message (optionnel)
                </label>
                <textarea
                  value={bidFormData.message}
                  onChange={(e) => setBidFormData({ ...bidFormData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ajoutez des détails sur votre offre..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowBidForm(false)
                    setSelectedActivity(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBidSubmit}
                  disabled={submittingBid}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingBid ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Déposer l'offre
                    </>
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

