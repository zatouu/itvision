























'use client'

import Link from 'next/link'
import { LogOut, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calculator, 
  Package, 
  TrendingUp,
  Users2,
  Building2,
  ArrowRight,
  Network,
  ShieldCheck,
  Laptop,
  Calendar,
  FileText,
  Activity,
  BarChart3,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Wrench,
  Download,
  Briefcase
} from 'lucide-react'
import KPICard from '@/components/admin/KPICard'
import ProgressRing from '@/components/admin/ProgressRing'
import MiniChart from '@/components/admin/MiniChart'

type ClientCard = {
  id: string
  name: string
  company?: string
  contact?: string
  phone: string
  email: string
  activeContracts: number
  address?: string
}

type ProjectHighlight = {
  id: string
  name: string
  client: string
  status: string
  serviceType?: string
  startDate?: string
  progress?: number
}

type TechnicianRollup = {
  total: number
  available: number
  active: number
}

type PortalMetrics = {
  totalClients: number
  activeClients: number
  portalEnabledClients: number
}

type MaintenanceContractCard = {
  id: string
  name: string
  clientName: string
  status: string
  type: string
  annualPrice: number
  usageRate: number
  daysUntilExpiration: number | null
  isNearExpiration: boolean
  isExpired: boolean
  responseTime?: string
  supportHours?: string
  equipment?: Array<{
    type: string
    quantity: number
    location?: string
  }>
}

type MaintenanceMetrics = {
  total: number
  active: number
  expiringSoon: number
  annualRevenue: number
  avgUsageRate: number
}

type MaintenanceClientSummary = {
  clientName: string
  totalValue: number
  activeContracts: number
  expiringSoon: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [kpis, setKpis] = useState({ quotes: 0, projectsActive: 0, techniciansAvailable: 0 })
  const [recentClients, setRecentClients] = useState<ClientCard[]>([])
  const [projectHighlights, setProjectHighlights] = useState<ProjectHighlight[]>([])
  const [technicians, setTechnicians] = useState<TechnicianRollup>({ total: 0, available: 0, active: 0 })
  const [portalMetrics, setPortalMetrics] = useState<PortalMetrics>({ totalClients: 0, activeClients: 0, portalEnabledClients: 0 })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [maintenanceContracts, setMaintenanceContracts] = useState<MaintenanceContractCard[]>([])
  const [maintenanceExpiring, setMaintenanceExpiring] = useState<MaintenanceContractCard[]>([])
  const [maintenanceMetrics, setMaintenanceMetrics] = useState<MaintenanceMetrics>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    annualRevenue: 0,
    avgUsageRate: 0
  })
  const [maintenanceTopClients, setMaintenanceTopClients] = useState<MaintenanceClientSummary[]>([])
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      })
    } catch {
      // Ignorer les erreurs réseau
    }
    router.replace('/login')
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          setIsAuthenticated(true)
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const loadDashboardData = async () => {
    setRefreshing(true)
    try {
      const [quotesRes, projectsRes, techListRes, techAvailableRes, clientsRes, maintenanceContractsRes] = await Promise.all([
        fetch('/api/quotes', { credentials: 'include' }),
        fetch('/api/projects?status=in_progress&limit=6', { credentials: 'include' }),
        fetch('/api/technicians?limit=6', { credentials: 'include' }),
        fetch('/api/technicians?available=true&limit=1', { credentials: 'include' }),
        fetch('/api/tech/clients?limit=5', { credentials: 'include' }),
        fetch('/api/maintenance/contracts?status=all', { credentials: 'include' })
      ])

      const quotesData = quotesRes.ok ? await quotesRes.json() : null
      const projectsData = projectsRes.ok ? await projectsRes.json() : null
      const techListData = techListRes.ok ? await techListRes.json() : null
      const techAvailableData = techAvailableRes.ok ? await techAvailableRes.json() : null
      const clientsData = clientsRes.ok ? await clientsRes.json() : null
      const maintenanceData = maintenanceContractsRes.ok ? await maintenanceContractsRes.json() : null

      const quotesCount = quotesData?.items?.length || 0
      const projectsActive = projectsData?.projects?.length || 0
      const techniciansAvailable = techAvailableData?.total || 0

      setKpis({ quotes: quotesCount, projectsActive, techniciansAvailable })

      if (Array.isArray(projectsData?.projects)) {
        const formattedProjects: ProjectHighlight[] = projectsData.projects.slice(0, 5).map((project: any) => ({
          id: project._id || project.id,
          name: project.name,
          client: project.clientId?.name || project.client?.name || 'Client',
          status: String(project.status || 'lead').toUpperCase(),
          serviceType: project.serviceType || 'Général',
          startDate: project.startDate
        }))
        setProjectHighlights(formattedProjects)
      }

      if (Array.isArray(techListData?.technicians)) {
        const total = techListData.total || techListData.technicians.length
        const active = techListData.technicians.filter((tech: any) => tech.isAvailable !== false).length
        setTechnicians({ total, available: techniciansAvailable, active })
      }

      if (clientsData?.success) {
        const formattedClients: ClientCard[] = Array.isArray(clientsData.clients) ? clientsData.clients.map((client: any) => ({
          id: client.id,
          name: client.name,
          company: client.company,
          contact: client.contactPerson,
          phone: client.phone,
          email: client.email,
          activeContracts: Array.isArray(client.activeContracts) ? client.activeContracts.length : 0,
          address: client.address
        })) : []
        setRecentClients(formattedClients)

        setPortalMetrics({
          totalClients: clientsData.metrics?.totalClients || 0,
          activeClients: clientsData.metrics?.activeClients || 0,
          portalEnabledClients: clientsData.metrics?.portalEnabledClients || 0
        })
      }

      if (maintenanceData?.success && Array.isArray(maintenanceData.contracts)) {
        const formattedContracts: MaintenanceContractCard[] = maintenanceData.contracts.map((contract: any) => {
          const status = String(contract.status || 'draft').toLowerCase()
          return {
            id: contract._id?.toString() || contract.contractNumber || `contract-${Math.random().toString(36).slice(2, 9)}`,
            name: contract.name || 'Contrat de maintenance',
            clientName: contract.clientId?.company || contract.clientId?.name || contract.client?.name || 'Client',
            status,
            type: contract.type || 'général',
            annualPrice: contract.annualPrice || 0,
            usageRate: typeof contract.usageRate === 'number' ? contract.usageRate : 0,
            daysUntilExpiration: typeof contract.daysUntilExpiration === 'number' ? contract.daysUntilExpiration : null,
            isNearExpiration: Boolean(contract.isNearExpiration),
            isExpired: Boolean(contract.isExpired),
            responseTime: contract.coverage?.responseTime,
            supportHours: contract.coverage?.supportHours,
            equipment: Array.isArray(contract.equipment)
              ? contract.equipment.map((item: any) => ({
                  type: item?.type || 'Équipement',
                  quantity: Number(item?.quantity) || 0,
                  location: item?.location
                }))
              : []
          }
        })

        const total = formattedContracts.length
        const activeContracts = formattedContracts.filter((contract) => contract.status === 'active')
        const expiringSoon = activeContracts.filter((contract) => contract.isNearExpiration).length
        const annualRevenue = activeContracts.reduce((sum, contract) => sum + contract.annualPrice, 0)
        const avgUsageRate = activeContracts.length
          ? Math.round(activeContracts.reduce((sum, contract) => sum + contract.usageRate, 0) / activeContracts.length)
          : 0

        const sortedByExpiration = [...formattedContracts].sort((a, b) => {
          const aValue = typeof a.daysUntilExpiration === 'number' ? a.daysUntilExpiration : Number.MAX_SAFE_INTEGER
          const bValue = typeof b.daysUntilExpiration === 'number' ? b.daysUntilExpiration : Number.MAX_SAFE_INTEGER
          return aValue - bValue
        })

        const expiringContracts = sortedByExpiration.filter((contract) => contract.isNearExpiration && !contract.isExpired)

        const clientSummaryMap = new Map<string, MaintenanceClientSummary>()
        activeContracts.forEach((contract) => {
          const summary = clientSummaryMap.get(contract.clientName) || {
            clientName: contract.clientName,
            totalValue: 0,
            activeContracts: 0,
            expiringSoon: 0
          }
          summary.totalValue += contract.annualPrice
          summary.activeContracts += 1
          if (contract.isNearExpiration) {
            summary.expiringSoon += 1
          }
          clientSummaryMap.set(contract.clientName, summary)
        })

        const topClients = Array.from(clientSummaryMap.values())
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, 3)

        setMaintenanceMetrics({
          total,
          active: activeContracts.length,
          expiringSoon,
          annualRevenue,
          avgUsageRate
        })
        setMaintenanceContracts(sortedByExpiration.slice(0, 4))
        setMaintenanceExpiring(expiringContracts.slice(0, 4))
        setMaintenanceTopClients(topClients)
      } else {
        setMaintenanceMetrics({
          total: 0,
          active: 0,
          expiringSoon: 0,
          annualRevenue: 0,
          avgUsageRate: 0
        })
        setMaintenanceContracts([])
        setMaintenanceExpiring([])
        setMaintenanceTopClients([])
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLastUpdatedAt(new Date())
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!loading && isAuthenticated) {
      loadDashboardData()
    }
  }, [loading, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Données simulées pour les graphiques
  const revenueData = [2.1, 2.4, 2.3, 2.8, 2.6, 3.0, 3.2]

  const formatCurrencyValue = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return '0 F CFA'
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)} M F CFA`
    }
    if (value >= 1_000) {
      return `${Math.round(value / 1_000)} K F CFA`
    }
    return `${value.toLocaleString('fr-FR')} F CFA`
  }

  const formatContractStatus = (status: string) => status.replace(/_/g, ' ').toUpperCase()

  const getMaintenanceStatusClasses = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700'
      case 'suspended':
      case 'on_hold':
        return 'bg-amber-100 text-amber-700'
      case 'expired':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDaysUntilExpiration = (days: number | null, isExpired: boolean) => {
    if (isExpired) return 'Expiré'
    if (days === null) return '—'
    if (days < 0) return 'Expiré'
    if (days === 0) return "Aujourd'hui"
    return `${days} j`
  }

  const getUsageRateDisplay = (usageRate: number) => Math.min(100, Math.max(0, Math.round(usageRate || 0)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* En-tête avec gradient vert */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white p-8 lg:p-12 shadow-2xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-700" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-full px-4 py-1.5">
                  <Activity className="h-4 w-4 text-white" />
                  <span className="text-xs font-medium text-white">Temps réel</span>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Centre de contrôle IT Vision
                </h1>
                
                <p className="text-white/90 text-sm md:text-base leading-relaxed">
                  Pilotez votre activité : devis, projets, équipe et clients en un coup d'œil
                </p>
                
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  {lastUpdatedAt && (
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      <Clock className="h-3 w-3" />
                      <span>{lastUpdatedAt.toLocaleTimeString('fr-FR')}</span>
                    </div>
                  )}
                  
                  <button
                    onClick={loadDashboardData}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white hover:bg-white/20 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Actualisation...' : 'Actualiser'}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/devis"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-emerald-700 px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-all hover:scale-105 shadow-lg"
                >
                  <FileText className="h-4 w-4" />
                  Nouveau devis
                </Link>
                
                <Link
                  href="/admin/clients"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all"
                >
                  <Building2 className="h-4 w-4" />
                  Clients
                </Link>
                
                <button 
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-xs text-white hover:bg-white/10 transition disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs avec graphiques */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Devis en cours"
            value={kpis.quotes}
            icon={FileText}
            color="green"
            percentage={75}
            trend="up"
            link="/admin/devis"
            linkText="Créer un devis"
          />
          
          <KPICard
            title="Projets actifs"
            value={kpis.projectsActive}
            icon={TrendingUp}
            color="blue"
            percentage={85}
            trend="up"
            link="/admin/planning"
            linkText="Voir le planning"
          />
          
          <KPICard
            title="Techniciens dispo"
            value={technicians.available}
            icon={Users2}
            color="purple"
            percentage={technicians.total > 0 ? Math.round((technicians.available / technicians.total) * 100) : 0}
            trend="neutral"
            link="/admin/users"
            linkText="Gérer l'équipe"
          />
          
          <KPICard
            title="Clients actifs"
            value={portalMetrics.activeClients}
            icon={Building2}
            color="orange"
            percentage={portalMetrics.totalClients > 0 ? Math.round((portalMetrics.activeClients / portalMetrics.totalClients) * 100) : 0}
            trend="up"
            link="/admin/clients"
            linkText="Voir les clients"
          />
        </section>

        {/* Graphiques de performance */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graphique revenus */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Revenus mensuels</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">3.2M CFA</p>
                <span className="text-xs text-green-600 font-medium">+12% ce mois</span>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <MiniChart data={revenueData} color="#10b981" height={60} />
          </div>

          {/* Taux de conversion */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Taux de conversion</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">68%</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing 
                radius={60} 
                stroke={8} 
                progress={68} 
                color="#3b82f6"
              />
            </div>
          </div>

          {/* Satisfaction client */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Satisfaction</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">92%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing 
                radius={60} 
                stroke={8} 
                progress={92} 
                color="#a855f7"
              />
            </div>
          </div>
        </section>

        {/* Actions rapides - Simplifié */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Actions rapides</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link 
              href="/admin/devis" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
            >
              <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Nouveau devis</span>
            </Link>

            <Link 
              href="/admin/clients" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Créer client</span>
            </Link>

            <Link 
              href="/admin/planning" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
            >
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Planifier</span>
            </Link>

            <Link 
              href="/admin/technicians" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all"
            >
              <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition">
                <Wrench className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Techniciens</span>
            </Link>

            <Link 
              href="/admin/users" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
            >
              <div className="bg-teal-100 p-3 rounded-xl group-hover:bg-teal-200 transition">
                <Users2 className="h-6 w-6 text-teal-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Utilisateurs</span>
            </Link>

            <Link 
              href="/admin/produits" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-pink-300 hover:bg-pink-50/50 transition-all"
            >
              <div className="bg-pink-100 p-3 rounded-xl group-hover:bg-pink-200 transition">
                <Package className="h-6 w-6 text-pink-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Catalogue</span>
            </Link>

            <Link 
              href="/admin/maintenance" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
            >
              <div className="bg-emerald-100 p-3 rounded-xl group-hover:bg-emerald-200 transition">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Centre maintenance</span>
            </Link>

            <Link 
              href="/admin/marketplace" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Marketplace</span>
            </Link>

            <Link 
              href="/admin/comptabilite" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
            >
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition">
                <Calculator className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Comptabilité</span>
            </Link>

            <Link 
              href="/admin/tickets" 
              className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50/50 transition-all"
            >
              <div className="bg-red-100 p-3 rounded-xl group-hover:bg-red-200 transition">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">Support</span>
            </Link>
          </div>
        </section>

        {/* Activité récente - Condensé */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Projets actifs */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Projets en cours</h2>
              <Link href="/admin/planning" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Voir tout →
              </Link>
            </div>
            
            {projectHighlights.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Aucun projet en cours</p>
                <Link 
                  href="/admin/planning"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition"
                >
                  <Plus className="h-4 w-4" />
                  Créer un projet
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projectHighlights.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition">
                    <div className={`w-2 h-2 rounded-full ${
                      project.status === 'IN_PROGRESS' ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.client}</p>
                    </div>
                    <span className="text-xs text-gray-400">{project.serviceType}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clients récents */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Clients récents</h2>
              <Link href="/admin/clients" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Voir tout →
              </Link>
            </div>
            
            {recentClients.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Aucun client enregistré</p>
                <Link 
                  href="/admin/clients"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un client
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClients.slice(0, 3).map((client) => (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {(client.company || client.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {client.company || client.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{client.email}</p>
                    </div>
                    {client.activeContracts > 0 && (
                      <span className="flex-shrink-0 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {client.activeContracts}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Maintenance & Contrats */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Maintenance clients</h2>
                <p className="text-sm text-gray-500">Contrats actifs, renouvellements et couverture SLA</p>
              </div>
              <Link
                href="/admin/clients"
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Centre maintenance
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                href="/admin/clients?newMaintenance=true"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau contrat
              </Link>
              <Link
                href="/admin/projects?filter=maintenance"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-emerald-200 hover:text-emerald-700 transition"
              >
                <FileText className="h-3.5 w-3.5" />
                Voir les contrats
              </Link>
              <button
                onClick={loadDashboardData}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser les données
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Contrats actifs', value: maintenanceMetrics.active.toString(), accent: 'text-emerald-600' },
                { label: 'Expirent < 60j', value: maintenanceMetrics.expiringSoon.toString(), accent: 'text-orange-600' },
                { label: 'CA récurrent', value: formatCurrencyValue(maintenanceMetrics.annualRevenue), accent: 'text-gray-900' },
                { label: 'Utilisation moyenne', value: `${maintenanceMetrics.avgUsageRate}%`, accent: 'text-purple-600' }
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className={`text-xl font-semibold ${stat.accent}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {maintenanceContracts.length === 0 ? (
              <div className="text-center py-10">
                <ShieldCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Aucun contrat de maintenance enregistré</p>
                <p className="text-xs text-gray-400 mt-1">Créez un contrat depuis la fiche client.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {maintenanceContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="p-4 border border-gray-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/30 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{contract.name}</p>
                        <p className="text-xs text-gray-500">{contract.clientName}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${getMaintenanceStatusClasses(contract.status)}`}
                      >
                        {formatContractStatus(contract.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => window.open(`/api/maintenance/contracts/${contract.id}/export?format=pdf`, '_blank')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(`/api/maintenance/contracts/${contract.id}/export?format=docx`, '_blank')
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Word
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
                      <div>
                        <p className="text-gray-500">Expiration</p>
                        <p className="text-gray-900 font-semibold">
                          {formatDaysUntilExpiration(contract.daysUntilExpiration, contract.isExpired)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Type</p>
                        <p className="text-gray-900 font-semibold capitalize">{contract.type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Valeur</p>
                        <p className="text-gray-900 font-semibold">{formatCurrencyValue(contract.annualPrice)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Utilisation</span>
                        <span className="text-gray-900 font-semibold">
                          {getUsageRateDisplay(contract.usageRate)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${contract.isNearExpiration ? 'bg-orange-400' : 'bg-emerald-500'}`}
                          style={{ width: `${getUsageRateDisplay(contract.usageRate)}%` }}
                        ></div>
                      </div>
                      {contract.equipment && contract.equipment.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Équipements</p>
                          <div className="flex flex-wrap gap-2">
                            {contract.equipment.slice(0, 3).map((equipment, idx) => (
                              <span
                                key={`${contract.id}-equip-${idx}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600"
                              >
                                {equipment.quantity}× {equipment.type}
                                {equipment.location ? <span className="text-gray-400">• {equipment.location}</span> : null}
                              </span>
                            ))}
                            {contract.equipment.length > 3 && (
                              <span className="px-2.5 py-1 rounded-full bg-white border border-dashed border-gray-200 text-[11px] text-gray-500">
                                +{contract.equipment.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {(contract.responseTime || contract.supportHours) && (
                        <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-gray-500">
                          {contract.responseTime && (
                            <div>
                              <p>Délai</p>
                              <p className="text-gray-900 font-semibold">{contract.responseTime}</p>
                            </div>
                          )}
                          {contract.supportHours && (
                            <div>
                              <p>Support</p>
                              <p className="text-gray-900 font-semibold">{contract.supportHours}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {maintenanceTopClients.length > 0 && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Top clients maintenance</h3>
                  <span className="text-xs text-gray-500">{maintenanceTopClients.length} comptes suivis</span>
                </div>
                <div className="space-y-3">
                  {maintenanceTopClients.map((client) => (
                    <div key={client.clientName} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{client.clientName}</p>
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatCurrencyValue(client.totalValue)}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                        <span>{client.activeContracts} contrat(s) actif(s)</span>
                        {client.expiringSoon > 0 && (
                          <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                            <AlertCircle className="h-3 w-3" />
                            {client.expiringSoon} à renouveler
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_rgba(255,255,255,0.4)_1px,_transparent_1px)] bg-[length:20px_20px]" />
            <div className="relative space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-white/70">Renouvellements</p>
                  <h3 className="text-2xl font-semibold">Expirations &lt; 60 jours</h3>
                </div>
                <span className="text-sm font-semibold text-white/80">
                  {maintenanceMetrics.expiringSoon} à surveiller
                </span>
              </div>

              {maintenanceExpiring.length === 0 ? (
                <div className="text-center py-10 text-white/80">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3" />
                  <p>Aucune expiration imminente.</p>
                  <p className="text-sm text-white/70">Votre pipeline de renouvellement est sous contrôle.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceExpiring.map((contract) => (
                    <div key={contract.id} className="bg-white/10 rounded-xl p-4 border border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{contract.clientName}</p>
                          <p className="text-xs text-white/70">{contract.name}</p>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatDaysUntilExpiration(contract.daysUntilExpiration, contract.isExpired)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/70 mt-3">
                        <span>Type : <span className="font-semibold text-white capitalize">{contract.type}</span></span>
                        <span>Utilisation : <span className="font-semibold text-white">{getUsageRateDisplay(contract.usageRate)}%</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-white/10 text-sm text-white/80">
                <p>Suivez vos renouvellements et proposez automatiquement des upgrades depuis la fiche client.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer stats */}
        <section className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-emerald-700">{technicians.total}</div>
              <div className="text-sm text-gray-600 mt-1">Techniciens</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-700">{portalMetrics.totalClients}</div>
              <div className="text-sm text-gray-600 mt-1">Clients</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-700">{kpis.projectsActive}</div>
              <div className="text-sm text-gray-600 mt-1">Projets actifs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-700">{kpis.quotes}</div>
              <div className="text-sm text-gray-600 mt-1">Devis en cours</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
