'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Package,
  ArrowRight,
  TrendingDown,
  Eye,
  Loader2
} from 'lucide-react'

interface GroupProposal {
  _id: string
  groupId: string
  status: 'pending_approval' | 'open' | 'filled' | 'cancelled' | 'rejected'
  product: {
    name: string
    image?: string
    basePrice: number
    currency: string
  }
  currentQty: number
  targetQty: number
  deadline: string
  proposal?: {
    message: string
    desiredQty: number
    submittedAt: string
  }
  createdAt: string
}

export default function MesAchatsGroupesPage() {
  const router = useRouter()
  const [proposals, setProposals] = useState<GroupProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        // Vérifier auth
        const authRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (!authRes.ok) {
          router.push('/login?redirect=/mon-compte/achats-groupes')
          return
        }
        
        const authData = await authRes.json()
        if (!authData.user) {
          router.push('/login?redirect=/mon-compte/achats-groupes')
          return
        }
        
        setUser(authData.user)

        // Récupérer mes propositions
        const res = await fetch('/api/group-orders/my-proposals', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setProposals(data.proposals || [])
        }
      } catch (err) {
        console.error('Erreur:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            En attente
          </span>
        )
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Approuvé
          </span>
        )
      case 'filled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <Package className="w-4 h-4" />
            Complet
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Refusé
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Annulé
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'FCFA' ? 'XOF' : currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-32 pb-16">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Achats Groupés</h1>
            <p className="text-gray-600">
              Suivez vos propositions et participations aux achats groupés
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-purple-600">{proposals.length}</div>
              <div className="text-sm text-gray-600">Propositions</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-emerald-600">
                {proposals.filter(p => p.status === 'open').length}
              </div>
              <div className="text-sm text-gray-600">Actives</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-amber-600">
                {proposals.filter(p => p.status === 'pending_approval').length}
              </div>
              <div className="text-sm text-gray-600">En attente</div>
            </div>
          </div>

          {/* Liste des propositions */}
          {proposals.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune proposition pour le moment
              </h3>
              <p className="text-gray-600 mb-6">
                Proposez un achat groupé sur un produit qui vous intéresse !
              </p>
              <Link
                href="/produits"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Voir les produits
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div
                  key={proposal._id}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Image produit */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {proposal.product.image ? (
                        <img
                          src={proposal.product.image}
                          alt={proposal.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">
                          {proposal.product.name}
                        </h3>
                        {getStatusBadge(proposal.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" />
                          {formatPrice(proposal.product.basePrice, proposal.product.currency)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {proposal.currentQty}/{proposal.targetQty} unités
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(proposal.createdAt)}
                        </span>
                      </div>

                      {proposal.proposal?.message && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          "{proposal.proposal.message}"
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/achats-groupes/${proposal.groupId}`}
                          className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Voir les détails
                        </Link>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500">
                          Réf: {proposal.groupId}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
