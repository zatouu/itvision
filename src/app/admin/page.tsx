'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
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
  Calendar
} from 'lucide-react'
import AdminHelpGuide from '@/components/AdminHelpGuide'
// Intégration de la gestion de projets déplacée vers le Dashboard global (GlobalAdminDashboard)

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

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({ quotes: 0, projectsActive: 0, techniciansAvailable: 0 })
  const [recentClients, setRecentClients] = useState<ClientCard[]>([])
  const [projectHighlights, setProjectHighlights] = useState<ProjectHighlight[]>([])
  const [technicians, setTechnicians] = useState<TechnicianRollup>({ total: 0, available: 0, active: 0 })
  const [portalMetrics, setPortalMetrics] = useState<PortalMetrics>({ totalClients: 0, activeClients: 0, portalEnabledClients: 0 })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Auth check result:', data) // Debug log
          setIsAuthenticated(true)
        } else {
          console.log('Auth check failed, redirecting to login') // Debug log
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
    try {
      const [quotesRes, projectsRes, techListRes, techAvailableRes, clientsRes] = await Promise.all([
        fetch('/api/quotes', { credentials: 'include' }),
        fetch('/api/projects?status=in_progress&limit=6', { credentials: 'include' }),
        fetch('/api/technicians?limit=6', { credentials: 'include' }),
        fetch('/api/technicians?available=true&limit=1', { credentials: 'include' }),
        fetch('/api/tech/clients?limit=5', { credentials: 'include' })
      ])

      const quotesData = quotesRes.ok ? await quotesRes.json() : null
      const projectsData = projectsRes.ok ? await projectsRes.json() : null
      const techListData = techListRes.ok ? await techListRes.json() : null
      const techAvailableData = techAvailableRes.ok ? await techAvailableRes.json() : null
      const clientsData = clientsRes.ok ? await clientsRes.json() : null

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
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLastUpdatedAt(new Date())
    }
  }

  useEffect(() => {
    if (!loading && isAuthenticated) {
      loadDashboardData()
    }
  }, [loading, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirection en cours
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white p-8 lg:p-12">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.25), transparent 55%)' }} />
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="max-w-2xl space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold">Centre de contrôle IT Vision</h1>
                <p className="text-emerald-100 text-sm md:text-base">
                  Supervisez le catalogue, rendez visibles vos clients sur les portails &amp; synchronisez les interventions terrain.
                </p>
                {lastUpdatedAt && (
                  <p className="text-xs text-emerald-100/80">Dernière synchronisation : {lastUpdatedAt.toLocaleString('fr-FR')}</p>
                )}
              </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition"
                  >
                    Gérer les techniciens <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/admin/clients"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition"
                  >
                    Gérer les clients <ArrowRight className="h-4 w-4" />
                  </Link>
                  <form action="/api/auth/logout" method="post" className="sm:self-center">
                    <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-xs text-white/80 hover:bg-white/10">
                      <LogOut className="h-3.5 w-3.5" /> Déconnexion
                    </button>
                  </form>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100">Devis en cours</div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">{kpis.quotes}</span>
                  <Calculator className="h-6 w-6 text-emerald-100" />
                </div>
                <Link href="/admin/quotes" className="mt-3 inline-flex items-center text-xs text-emerald-50 hover:text-white">Manage devis <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100">Projets actifs</div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">{kpis.projectsActive}</span>
                  <TrendingUp className="h-6 w-6 text-emerald-100" />
                </div>
                <Link href="/admin/planning" className="mt-3 inline-flex items-center text-xs text-emerald-50 hover:text-white">Voir planning <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </div>
                <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-100">Techniciens dispo</div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-3xl font-semibold">{technicians.available}</span>
                    <Users2 className="h-6 w-6 text-emerald-100" />
                  </div>
                  <Link href="/admin/users" className="mt-3 inline-flex items-center text-xs text-emerald-50 hover:text-white">Gérer l'équipe <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Actions rapides</h2>
                  <p className="text-sm text-gray-500">Centralisez vos opérations clés — catalogue, planification, portails.</p>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Rafraîchir les données
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/admin/produits" className="group rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Catalogue fournisseurs</h3>
                      <p className="text-xs text-gray-500">Import AliExpress / Config produit</p>
                    </div>
                    <Package className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Ajoutez ou éditez les fiches avant publication sur le portail client.</p>
                </Link>

                <Link href="/admin/clients" className="group rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Créer un client</h3>
                      <p className="text-xs text-gray-500">Accessible portails client &amp; tech</p>
                    </div>
                    <Building2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Chaque client enregistré est immédiatement visible pour les techniciens.</p>
                </Link>

                <Link href="/admin/planning" className="group rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Planifier une intervention</h3>
                      <p className="text-xs text-gray-500">Synchronisé avec portail technicien</p>
                    </div>
                    <Calendar className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Affectez les techniciens en tenant compte des disponibilités et compétences.</p>
                </Link>

                  <Link href="/admin/users" className="group rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Équipe & techniciens</h3>
                        <p className="text-xs text-gray-500">Affectations, accès portails</p>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Attribuez des missions, gérez les accès et synchronisez avec le portail terrain.</p>
                  </Link>

                  <Link href="/admin/clients" className="group rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Portail client</h3>
                        <p className="text-xs text-gray-500">Accès & visibilité projets</p>
                      </div>
                      <Laptop className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Assignez les accès portail client et suivez la relation avec vos contacts.</p>
                  </Link>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Équipe technique</h2>
                <Network className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Total inscrits</span>
                  <span className="font-semibold text-gray-900">{technicians.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Disponibles aujourd’hui</span>
                  <span className="font-semibold text-emerald-600">{technicians.available}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Actifs (connectés)</span>
                  <span className="font-semibold text-gray-900">{technicians.active}</span>
                </div>
              </div>
              <Link href="/admin/users" className="mt-6 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
                Gérer les techniciens <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">À propos</h2>
              <p className="text-sm text-gray-600">Chaque client créé ici est automatiquement disponible sur le portail technicien pour planifier des interventions, et sur le portail client pour consulter devis & rapports.</p>
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm 2xl:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Clients récents</h2>
              <Link href="/admin/clients" className="text-sm text-emerald-600 hover:text-emerald-700">Tout afficher</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentClients.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">Aucun client enregistré pour le moment.</p>
              )}
              {recentClients.map((client) => (
                <div key={client.id} className="py-4 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{client.company || client.name}</div>
                    <div className="text-xs text-gray-500">{client.email} • {client.phone}</div>
                    {client.contact && <div className="text-xs text-gray-400 mt-1">Référent : {client.contact}</div>}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${client.activeContracts > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                    {client.activeContracts > 0 ? `${client.activeContracts} contrat(s)` : 'En prospection'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm 2xl:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Interventions actives</h2>
              <Link href="/admin/planning" className="text-sm text-emerald-600 hover:text-emerald-700">Planifier</Link>
            </div>
            <div className="space-y-3">
              {projectHighlights.length === 0 && (
                <p className="text-sm text-gray-500">Aucune intervention en cours.</p>
              )}
              {projectHighlights.map((project) => (
                <div key={project.id} className="rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500">{project.client}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${project.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600'}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">Service : {project.serviceType}</div>
                  {project.startDate && <div className="text-xs text-gray-400">Début : {new Date(project.startDate).toLocaleDateString('fr-FR')}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm 2xl:col-span-1 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Connexions portails</h2>
              <p className="text-xs text-gray-500">Synchronisation automatique clients ↔ techniciens ↔ portails.</p>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Clients (total)</span>
                <span className="font-semibold text-gray-900">{portalMetrics.totalClients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Clients actifs</span>
                <span className="font-semibold text-gray-900">{portalMetrics.activeClients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Accès portail client</span>
                <span className="font-semibold text-emerald-600">{portalMetrics.portalEnabledClients}</span>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-900">
              Dès qu’un client est créé ici, il est affiché dans l’annuaire du portail technicien (planification) et peut accéder à son espace client (rapports, demandes de maintenance).
            </div>
          </div>
        </section>

        <AdminHelpGuide />
      </div>
    </div>
  )
}