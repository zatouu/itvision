'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Globe,
  Building2,
  Phone,
  Mail,
  FolderKanban,
  ExternalLink,
  Users,
  Clock,
  FileText,
  PieChart,
  Calendar,
  ChevronRight,
  Download
} from 'lucide-react'
import MaintenanceContractModal from './MaintenanceContractModal'

type MaintenanceContract = {
  _id: string
  contractNumber?: string
  name: string
  type: string
  status: string
  annualPrice?: number
  paymentFrequency?: string
  startDate?: string
  endDate?: string
  daysUntilExpiration?: number | null
  isNearExpiration?: boolean
  isExpired?: boolean
  usageRate?: number
  coverage?: {
    responseTime?: string
    supportHours?: string
    interventionsIncluded?: number
    interventionsUsed?: number
  }
  equipment?: Array<{
    type: string
    quantity: number
    location?: string
  }>
  clientId?: {
    _id?: string
    name?: string
    email?: string
    phone?: string
    company?: string
  }
  projectId?: {
    _id?: string
    name?: string
    address?: string
  }
  preferredTechnicians?: Array<{
    _id: string
    name: string
    email?: string
    phone?: string
  }>
}

type ClientDirectoryEntry = {
  _id: string
  clientId: string
  name: string
  email: string
  phone: string
  company?: string
  address?: string
  contactPerson?: string
  permissions?: {
    canAccessPortal?: boolean
    canRequestMaintenance?: boolean
  }
}

type ProjectSummary = {
  _id: string
  name: string
  status?: string
  clientId?: string
  serviceType?: string
}

type TechnicianOption = {
  _id: string
  name: string
  email?: string
  phone?: string
  zone?: string
  skills?: string[]
}

type ClientMaintenanceSummary = {
  clientKey: string
  clientName: string
  company?: string
  email?: string
  phone?: string
  portalEnabled: boolean
  adminClientId?: string
  portalClientId?: string
  contracts: MaintenanceContract[]
  totalValue: number
  activeContracts: number
  expiringSoon: number
  projects: ProjectSummary[]
}

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'suspended', label: 'Suspendus' },
  { value: 'expired', label: 'Expirés' }
]

const typeOptions = [
  { value: 'all', label: 'Tous les types' },
  { value: 'preventive', label: 'Préventif' },
  { value: 'curative', label: 'Curatif' },
  { value: 'full', label: 'Full Service' },
  { value: 'basic', label: 'Basic' }
]

const portalOptions = [
  { value: 'all', label: 'Tous les clients' },
  { value: 'portal', label: 'Portail activé' },
  { value: 'noPortal', label: 'Portail à activer' }
]

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0
})

const formatCurrency = (value?: number) => {
  if (!value || !Number.isFinite(value)) {
    return '0 F CFA'
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} M F CFA`
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} K F CFA`
  }
  return currencyFormatter.format(value)
}

const formatDays = (days: number | null | undefined, isExpired?: boolean) => {
  if (isExpired) return 'Expiré'
  if (days === null || days === undefined) return '—'
  if (days < 0) return 'Expiré'
  if (days === 0) return "Aujourd'hui"
  return `${days} j`
}

const getStatusChipClasses = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700'
    case 'expired':
      return 'bg-red-100 text-red-700'
    case 'suspended':
    case 'on_hold':
      return 'bg-amber-100 text-amber-700'
    case 'draft':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const formatDate = (date?: string) => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function MaintenanceCenter() {
  const [contracts, setContracts] = useState<MaintenanceContract[]>([])
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [portalFilter, setPortalFilter] = useState<'all' | 'portal' | 'noPortal'>('all')
  const [viewMode, setViewMode] = useState<'clients' | 'contracts'>('clients')
  const [showContractModal, setShowContractModal] = useState(false)
  const handleExportContract = (contractId: string, format: 'pdf' | 'docx') => {
    const url = `/api/maintenance/contracts/${contractId}/export?format=${format}`
    window.open(url, '_blank')
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [contractsRes, clientsRes, projectsRes, techniciansRes] = await Promise.all([
        fetch('/api/maintenance/contracts?status=all', { credentials: 'include' }),
        fetch('/api/admin/clients?limit=200', { credentials: 'include' }),
        fetch('/api/projects?status=all&limit=200', { credentials: 'include' }),
        fetch('/api/technicians?limit=200', { credentials: 'include' })
      ])

      if (!contractsRes.ok) throw new Error('Impossible de charger les contrats')
      const contractsJson = await contractsRes.json()
      const formattedContracts: MaintenanceContract[] = Array.isArray(contractsJson.contracts)
        ? contractsJson.contracts.map((contract: any) => ({
            _id: contract._id?.toString() || contract.contractNumber,
            contractNumber: contract.contractNumber,
            name: contract.name || 'Contrat sans nom',
            type: String(contract.type || 'autre').toLowerCase(),
            status: String(contract.status || 'draft').toLowerCase(),
            annualPrice: contract.annualPrice || 0,
            paymentFrequency: contract.paymentFrequency,
            startDate: contract.startDate,
            endDate: contract.endDate,
            daysUntilExpiration: typeof contract.daysUntilExpiration === 'number' ? contract.daysUntilExpiration : null,
            isNearExpiration: Boolean(contract.isNearExpiration),
            isExpired: Boolean(contract.isExpired),
            usageRate: typeof contract.usageRate === 'number' ? contract.usageRate : 0,
            coverage: contract.coverage || {},
            equipment: Array.isArray(contract.equipment)
              ? contract.equipment.map((item: any) => ({
                  type: item?.type || 'Équipement',
                  quantity: Number(item?.quantity) || 0,
                  location: item?.location
                }))
              : [],
            preferredTechnicians: Array.isArray(contract.preferredTechnicians)
              ? contract.preferredTechnicians.map((tech: any) => ({
                  _id: tech?._id?.toString?.() || '',
                  name: tech?.name || 'Technicien',
                  email: tech?.email,
                  phone: tech?.phone
                }))
              : [],
            clientId: contract.clientId,
            projectId: contract.projectId
          }))
        : []

      if (!clientsRes.ok) throw new Error('Impossible de charger les clients')
      const clientsJson = await clientsRes.json()
      const formattedClients: ClientDirectoryEntry[] = Array.isArray(clientsJson.clients)
        ? clientsJson.clients.map((client: any) => ({
            _id: client._id?.toString(),
            clientId: client.clientId,
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company || client.name,
            address: client.address,
            contactPerson: client.contactPerson,
            permissions: client.permissions
          }))
        : []

      let formattedProjects: ProjectSummary[] = []
      if (projectsRes.ok) {
        const projectsJson = await projectsRes.json()
        formattedProjects = Array.isArray(projectsJson.projects)
          ? projectsJson.projects.map((project: any) => ({
              _id: project._id?.toString(),
              name: project.name || 'Projet',
              status: project.status,
              clientId: typeof project.clientId === 'string' ? project.clientId : project.clientId?._id,
              serviceType: project.serviceType
            }))
          : []
      }

      setContracts(formattedContracts)
      setClients(formattedClients)
      setProjects(formattedProjects)
      if (techniciansRes.ok) {
        const techniciansJson = await techniciansRes.json()
        const formattedTechnicians: TechnicianOption[] = Array.isArray(techniciansJson.technicians)
          ? techniciansJson.technicians.map((tech: any) => ({
              _id: tech._id?.toString() || tech.id,
              name: tech.name || 'Technicien',
              email: tech.email,
              phone: tech.phone,
              zone: tech.preferences?.zone,
              skills: tech.specialties
            }))
          : []
        setTechnicians(formattedTechnicians)
      } else {
        setTechnicians([])
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectSummary>()
    projects.forEach((project) => {
      if (project._id) {
        map.set(project._id, project)
      }
    })
    return map
  }, [projects])

  const clientMapByEmail = useMemo(() => {
    const map = new Map<string, ClientDirectoryEntry>()
    clients.forEach((client) => {
      if (client.email) {
        map.set(client.email.toLowerCase(), client)
      }
    })
    return map
  }, [clients])

  const contractMatchesFilters = (contract: MaintenanceContract, summaryPortalEnabled: boolean) => {
    if (statusFilter !== 'all' && contract.status !== statusFilter) return false
    if (typeFilter !== 'all' && contract.type !== typeFilter) return false
    if (portalFilter === 'portal' && !summaryPortalEnabled) return false
    if (portalFilter === 'noPortal' && summaryPortalEnabled) return false
    if (searchTerm.trim().length > 0) {
      const haystack = [
        contract.name,
        contract.contractNumber,
        contract.clientId?.name,
        contract.clientId?.company,
        contract.clientId?.email,
        contract.projectId?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(searchTerm.trim().toLowerCase())) return false
    }
    return true
  }

  const clientSummaries = useMemo<ClientMaintenanceSummary[]>(() => {
    const summaries = new Map<string, ClientMaintenanceSummary>()

    contracts.forEach((contract) => {
      const clientEmail = contract.clientId?.email?.toLowerCase?.()
      const clientDirectory = clientEmail ? clientMapByEmail.get(clientEmail) : undefined
      const clientKey = contract.clientId?._id || clientDirectory?._id || contract.clientId?.name || contract._id
      if (!clientKey) return

      const portalEnabled = Boolean(clientDirectory?.permissions?.canAccessPortal)

      const summary =
        summaries.get(clientKey) ||
        {
          clientKey,
          clientName: clientDirectory?.company || contract.clientId?.company || contract.clientId?.name || 'Client',
          company: clientDirectory?.company || contract.clientId?.company,
          email: contract.clientId?.email || clientDirectory?.email,
          phone: contract.clientId?.phone || clientDirectory?.phone,
          portalEnabled,
          adminClientId: clientDirectory?._id,
          portalClientId: clientDirectory?.clientId,
          contracts: [] as MaintenanceContract[],
          totalValue: 0,
          activeContracts: 0,
          expiringSoon: 0,
          projects: [] as ProjectSummary[]
        }

      const enrichedContract: MaintenanceContract = {
        ...contract,
        projectId:
          typeof contract.projectId === 'object' && contract.projectId?._id
            ? {
                _id: contract.projectId._id,
                name: contract.projectId.name || projectMap.get(contract.projectId._id || '')?.name
              }
            : contract.projectId
      }

      summary.contracts.push(enrichedContract)
      summary.totalValue += contract.annualPrice || 0
      if (contract.status === 'active') {
        summary.activeContracts += 1
        if (contract.isNearExpiration) {
          summary.expiringSoon += 1
        }
      }

      const projectId =
        typeof contract.projectId === 'object' ? contract.projectId?._id : contract.projectId
      if (projectId) {
        const project = projectMap.get(projectId)
        if (project && !summary.projects.find((p) => p._id === projectId)) {
          summary.projects.push(project)
        }
      }

      summaries.set(clientKey, summary)
    })

    return Array.from(summaries.values()).sort((a, b) => b.totalValue - a.totalValue)
  }, [contracts, clientMapByEmail, projectMap])

  const filteredClientSummaries = useMemo(() => {
    return clientSummaries
      .map((summary) => {
        const filteredContracts = summary.contracts.filter((contract) =>
          contractMatchesFilters(contract, summary.portalEnabled)
        )
        return { ...summary, contracts: filteredContracts }
      })
      .filter((summary) => summary.contracts.length > 0)
  }, [clientSummaries, statusFilter, typeFilter, portalFilter, searchTerm])

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const clientEmail = contract.clientId?.email?.toLowerCase?.()
      const portalEnabled = clientEmail ? Boolean(clientMapByEmail.get(clientEmail)?.permissions?.canAccessPortal) : false
      return contractMatchesFilters(contract, portalEnabled)
    })
  }, [contracts, statusFilter, typeFilter, portalFilter, searchTerm, clientMapByEmail])

  const kpis = useMemo(() => {
    const activeContracts = contracts.filter((c) => c.status === 'active')
    const annualRevenue = activeContracts.reduce((sum, contract) => sum + (contract.annualPrice || 0), 0)
    const expiringSoon = activeContracts.filter((c) => c.isNearExpiration).length
    const clientsCovered = new Set(clientSummaries.map((summary) => summary.clientKey)).size
    const portalClients = clientSummaries.filter((summary) => summary.portalEnabled).length

    return [
      {
        label: 'Contrats actifs',
        value: activeContracts.length,
        subLabel: `${contracts.length} au total`,
        icon: ShieldCheck,
        accent: 'text-emerald-600'
      },
      {
        label: 'CA récurrent',
        value: formatCurrency(annualRevenue),
        subLabel: 'Portefeuille annuel',
        icon: PieChart,
        accent: 'text-gray-900'
      },
      {
        label: 'Clients couverts',
        value: clientsCovered,
        subLabel: `${portalClients} portails actifs`,
        icon: Users,
        accent: 'text-blue-600'
      },
      {
        label: 'Expirations < 60j',
        value: expiringSoon,
        subLabel: 'Renouvellement prioritaire',
        icon: AlertCircle,
        accent: 'text-orange-600'
      }
    ]
  }, [contracts, clientSummaries])

  const renderStatusFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div>
        <label className="text-xs text-gray-500">Statut</label>
        <div className="relative mt-1">
          <Filter className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Type de contrat</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white mt-1"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Portail client</label>
        <select
          value={portalFilter}
          onChange={(e) => setPortalFilter(e.target.value as 'all' | 'portal' | 'noPortal')}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white mt-1"
        >
          {portalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Vue</label>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setViewMode('clients')}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium border ${
              viewMode === 'clients'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setViewMode('contracts')}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium border ${
              viewMode === 'contracts'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Contrats
          </button>
        </div>
      </div>
    </div>
  )

  const renderClientCard = (summary: ClientMaintenanceSummary) => {
    const { contracts } = summary
    return (
      <div key={summary.clientKey} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 font-semibold">
                {(summary.company || summary.clientName).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{summary.company || summary.clientName}</p>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {summary.clientName}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
              {summary.portalEnabled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                  <Globe className="h-3.5 w-3.5" />
                  Portail actif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Portail inactif
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {summary.activeContracts} contrat(s) actifs
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                <PieChart className="h-3.5 w-3.5" />
                {formatCurrency(summary.totalValue)}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            {summary.phone && (
              <a href={`tel:${summary.phone}`} className="inline-flex items-center gap-2 hover:text-gray-900">
                <Phone className="h-4 w-4 text-gray-400" />
                {summary.phone}
              </a>
            )}
            {summary.email && (
              <a href={`mailto:${summary.email}`} className="inline-flex items-center gap-2 hover:text-gray-900">
                <Mail className="h-4 w-4 text-gray-400" />
                {summary.email}
              </a>
            )}
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              {summary.adminClientId && (
                <Link
                  href={`/admin/clients?focus=${summary.adminClientId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Fiche client
                </Link>
              )}
              <a
                href={`/client-portal?client=${summary.portalClientId || summary.adminClientId || summary.clientKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Portail client
              </a>
              {summary.contracts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleExportContract(
                        summary.contracts[0]._id || summary.contracts[0].contractNumber || summary.contracts[0].name,
                        'pdf'
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-emerald-700"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleExportContract(
                        summary.contracts[0]._id || summary.contracts[0].contractNumber || summary.contracts[0].name,
                        'docx'
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-emerald-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Word
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

            {summary.contracts.length > 0 && summary.contracts[0].preferredTechnicians?.length ? (
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                {summary.contracts[0].preferredTechnicians?.map((tech) => (
                  <div
                    key={`${summary.clientKey}-${tech._id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50"
                  >
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-gray-900">{tech.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {tech.email || '—'} {tech.phone ? `• ${tech.phone}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {summary.projects.length > 0 && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Projets couverts</span>
              <span className="font-semibold text-gray-700">{summary.projects.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.projects.slice(0, 4).map((project) => (
                <Link
                  key={project._id}
                  href={`/admin/projects?projectId=${project._id}`}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600 hover:border-emerald-200 hover:text-emerald-700"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  {project.name}
                </Link>
              ))}
              {summary.projects.length > 4 && (
                <span className="text-xs text-gray-500 px-3 py-1 rounded-full bg-white border border-dashed border-gray-200">
                  +{summary.projects.length - 4} autres
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {contracts.map((contract) => (
            <div
              key={contract._id}
              className="border border-gray-100 rounded-2xl p-4 hover:border-emerald-200 hover:bg-emerald-50/40 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{contract.name}</p>
                  <p className="text-xs text-gray-500">
                    #{contract.contractNumber || contract._id?.slice(-6)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${getStatusChipClasses(contract.status)}`}
                  >
                    {contract.status.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 capitalize">{contract.type}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    handleExportContract(contract._id || contract.contractNumber || contract.name, 'pdf')
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
                >
                  <FileText className="h-3 w-3" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleExportContract(contract._id || contract.contractNumber || contract.name, 'docx')
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
                >
                  <Download className="h-3 w-3" />
                  Word
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
                <div>
                  <p className="text-gray-500">Expiration</p>
                  <p className="text-gray-900 font-semibold">
                    {formatDays(contract.daysUntilExpiration ?? null, contract.isExpired)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Valeur annuelle</p>
                  <p className="text-gray-900 font-semibold">{formatCurrency(contract.annualPrice)}</p>
                </div>
                <div>
                  <p className="text-gray-500">SLA</p>
                  <p className="text-gray-900 font-semibold">
                    {contract.coverage?.responseTime || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Support</p>
                  <p className="text-gray-900 font-semibold">
                    {contract.coverage?.supportHours || 'Heures ouvrées'}
                  </p>
                </div>
              </div>

              {contract.projectId?.name && (
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Projet :{' '}
                  <Link
                    href={`/admin/projects?projectId=${typeof contract.projectId === 'object' ? contract.projectId._id : contract.projectId}`}
                    className="text-gray-900 font-semibold hover:text-emerald-600"
                  >
                    {contract.projectId.name}
                  </Link>
                </div>
              )}

              {contract.equipment && contract.equipment.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Équipements couverts</p>
                  <div className="flex flex-wrap gap-2">
                    {contract.equipment.slice(0, 4).map((equipment, idx) => (
                      <span
                        key={`${contract._id}-${equipment.type}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600"
                      >
                        {equipment.quantity}× {equipment.type}
                        {equipment.location ? <span className="text-gray-400">• {equipment.location}</span> : null}
                      </span>
                    ))}
                    {contract.equipment.length > 4 && (
                      <span className="px-2.5 py-1 rounded-full bg-white border border-dashed border-gray-200 text-[11px] text-gray-500">
                        +{contract.equipment.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Utilisation</span>
                  <span className="text-gray-900 font-semibold">
                    {Math.min(100, Math.max(0, Math.round(contract.usageRate || 0)))}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      contract.isNearExpiration ? 'bg-orange-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, Math.round(contract.usageRate || 0)))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderContractCard = (contract: MaintenanceContract) => {
    const clientEmail = contract.clientId?.email?.toLowerCase?.()
    const clientDirectory = clientEmail ? clientMapByEmail.get(clientEmail) : undefined
    const portalEnabled = Boolean(clientDirectory?.permissions?.canAccessPortal)
    const projectId =
      typeof contract.projectId === 'object' ? contract.projectId?._id : contract.projectId
    const project = projectId ? projectMap.get(projectId) : undefined

    return (
      <div key={contract._id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-gray-900">{contract.name}</p>
            <p className="text-xs text-gray-500">
              {contract.clientId?.company || contract.clientId?.name || 'Client'}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${getStatusChipClasses(contract.status)}`}
          >
            {contract.status.toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() =>
              handleExportContract(contract._id || contract.contractNumber || contract.name, 'pdf')
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:border-emerald-300"
          >
            <FileText className="h-3 w-3" />
            PDF
          </button>
          <button
            type="button"
            onClick={() =>
              handleExportContract(contract._id || contract.contractNumber || contract.name, 'docx')
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:border-emerald-300"
          >
            <Download className="h-3 w-3" />
            Word
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
          <div>
            <p className="text-gray-500">Expiration</p>
            <p className="text-gray-900 font-semibold">
              {formatDays(contract.daysUntilExpiration ?? null, contract.isExpired)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Valeur</p>
            <p className="text-gray-900 font-semibold">{formatCurrency(contract.annualPrice)}</p>
          </div>
          <div>
            <p className="text-gray-500">Type</p>
            <p className="text-gray-900 font-semibold capitalize">{contract.type}</p>
          </div>
          <div>
            <p className="text-gray-500">Portail</p>
            <p className={`font-semibold ${portalEnabled ? 'text-emerald-600' : 'text-gray-500'}`}>
              {portalEnabled ? 'Actif' : 'À activer'}
            </p>
          </div>
        </div>
        {project && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FolderKanban className="h-3.5 w-3.5" />
            Projet couvert :
            <Link
              href={`/admin/projects?projectId=${project._id}`}
              className="text-gray-900 font-semibold hover:text-emerald-600"
            >
              {project.name}
            </Link>
          </div>
        )}
        {contract.equipment && contract.equipment.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Équipements</p>
            <div className="flex flex-wrap gap-2">
              {contract.equipment.slice(0, 3).map((equipment, idx) => (
                <span
                  key={`${contract._id}-chip-${idx}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-[11px] text-gray-600"
                >
                  {equipment.quantity}× {equipment.type}
                  {equipment.location ? <span className="text-gray-400">• {equipment.location}</span> : null}
                </span>
              ))}
              {contract.equipment.length > 3 && (
                <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-dashed border-gray-200 text-[11px] text-gray-500">
                  +{contract.equipment.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            <Clock className="h-3.5 w-3.5" />
            {contract.coverage?.responseTime || 'SLA 24h'}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            <Calendar className="h-3.5 w-3.5" />
            {contract.paymentFrequency || 'Annuel'}
          </span>
        </div>
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Techniciens attitrés</p>
          {contract.preferredTechnicians?.length ? (
            <div className="flex flex-wrap gap-2">
              {contract.preferredTechnicians.map((tech) => (
                <span
                  key={`${contract._id}-tech-${tech._id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-100 bg-emerald-50 text-[11px] text-emerald-700"
                >
                  <Users className="h-3.5 w-3.5" />
                  {tech.name}
                  {tech.phone ? <span className="text-emerald-500">• {tech.phone}</span> : null}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Aucun technicien référent pour l’instant</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_1px,_transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative flex flex-col gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Centre Maintenance
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-4">Contrats clients & renouvellements</h1>
            <p className="text-white/80 mt-2 max-w-3xl">
              Pilotez l’ensemble des contrats de maintenance : liens directs vers les fiches clients, portails
              dédiés, projets couverts et alertes de renouvellement. Toutes les interactions post-installation
              sont consolidées ici.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className="bg-white/10 rounded-2xl p-4 border border-white/15">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/80">{kpi.label}</p>
                    <Icon className={`h-5 w-5 ${kpi.accent}`} />
                  </div>
                  <p className={`text-2xl font-semibold mt-2 ${kpi.accent}`}>{kpi.value}</p>
                  <p className="text-xs text-white/70 mt-1">{kpi.subLabel}</p>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowContractModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              Créer un contrat
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/30 text-sm font-semibold text-white hover:bg-white/20 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser les données
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Filtres & recherche</h2>
            <p className="text-sm text-gray-500">
              Filtrez les contrats par statut, type ou activation du portail client.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher client, contrat, projet..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        {renderStatusFilters()}
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'clients' ? (
        filteredClientSummaries.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
            <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Aucun client ne correspond aux filtres actuels</p>
            <p className="text-sm text-gray-500">Ajustez les filtres ou créez un nouveau contrat de maintenance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredClientSummaries.map((summary) => renderClientCard(summary))}
          </div>
        )
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Aucun contrat pour ces filtres</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContracts.map((contract) => renderContractCard(contract))}
        </div>
      )}

      <section className="bg-gray-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-white/70">Relation client</p>
            <h3 className="text-2xl font-semibold mt-2">Contrat ↔ Projet ↔ Portail</h3>
            <p className="text-white/80 mt-1 max-w-3xl">
              Chaque contrat est attaché au client (portail) et au projet d’origine. Le centre maintenance
              facilite la navigation entre ces trois primitives pour orchestrer les renouvellements, les tickets
              et les visites préventives.
            </p>
          </div>
          <Link
            href="/client-portal"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition"
          >
            Voir un portail client
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <MaintenanceContractModal
        open={showContractModal}
        onClose={() => setShowContractModal(false)}
        clients={clients}
        projects={projects}
        technicians={technicians}
        onCreated={loadData}
      />
    </div>
  )
}

