'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Settings,
  Plus,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  Users,
  Zap,
  Wrench,
  Camera,
  Lock,
  Home,
  Flame,
  Cable,
  Megaphone,
  ArrowUpCircle,
  ShieldCheck,
  X
} from 'lucide-react'

interface Technician {
  id: string
  name: string
  email: string
  phone: string
  skills: string[]
  zone: string
  availability: {
    [date: string]: {
      morning: boolean
      afternoon: boolean
      evening: boolean
    }
  }
  currentLoad: number // 0-100%
  rating: number
  specialties: string[]
}

interface PreferredTechnician {
  _id: string
  name: string
  email?: string
  phone?: string
}

interface Intervention {
  id: string
  title: string
  description: string
  client: {
    name: string
    address: string
    phone: string
    zone: string
  }
  service: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedDuration: number // en heures
  requiredSkills: string[]
  scheduledDate?: string
  scheduledTime?: string
  assignedTechnician?: string
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: string
  urgency: boolean
  contractId?: string
  clientId?: string
  origin?: 'manual' | 'auto' | 'marketplace'
  isContractual?: boolean
  preferredTechnicians?: PreferredTechnician[]
  marketplaceActivityId?: string
  marketplaceReason?: string
}

type MarketplaceActivityInfo = {
  status: string
  bidsCount: number
  bestBid?: number
  allowMarketplace: boolean
  activityId: string
  category?: string
  marketplaceReason?: string
}

type SchedulingFilterMode = 'all' | 'marketplace' | 'installations'

type DynamicSchedulingProps = {
  defaultViewMode?: 'calendar' | 'list' | 'technicians'
  filterMode?: SchedulingFilterMode
  showNewInterventionShortcut?: boolean
}

const DynamicSchedulingSystem = ({
  defaultViewMode = 'calendar',
  filterMode = 'all',
  showNewInterventionShortcut = false
}: DynamicSchedulingProps) => {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [showVisitsPanel, setShowVisitsPanel] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'technicians'>(defaultViewMode)
  const [filterService, setFilterService] = useState<string>('all')
  const [filterZone, setFilterZone] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)
  const [activitiesMap, setActivitiesMap] = useState<Record<string, MarketplaceActivityInfo>>({})
  const [publishingVisitId, setPublishingVisitId] = useState<string | null>(null)
  const [showNewInterventionModal, setShowNewInterventionModal] = useState(false)
  const [newInterventionSubmitting, setNewInterventionSubmitting] = useState(false)
  const [newInterventionError, setNewInterventionError] = useState<string | null>(null)
  const [newInterventionForm, setNewInterventionForm] = useState({
    title: '',
    service: 'maintenance',
    priority: 'medium',
    estimatedDuration: 2,
    description: '',
    clientName: '',
    clientPhone: '',
    clientZone: 'Dakar-Centre',
    clientAddress: '',
    clientEmail: '',
    scheduledDate: '',
    scheduledTime: ''
  })

  const updateNewInterventionField = (field: keyof typeof newInterventionForm, value: string | number) => {
    setNewInterventionForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateNewIntervention = async () => {
    if (!newInterventionForm.title.trim() || !newInterventionForm.clientName.trim()) {
      setNewInterventionError('Merci de renseigner un titre et un client.')
      return
    }
    setNewInterventionSubmitting(true)
    setNewInterventionError(null)
    try {
      const payload = {
        title: newInterventionForm.title.trim(),
        description: newInterventionForm.description.trim(),
        service: newInterventionForm.service,
        priority: newInterventionForm.priority,
        estimatedDuration: Number(newInterventionForm.estimatedDuration) || 2,
        requiredSkills: [newInterventionForm.service],
        client: {
          name: newInterventionForm.clientName,
          address: newInterventionForm.clientAddress || 'Site client',
          phone: newInterventionForm.clientPhone,
          zone: newInterventionForm.clientZone || 'Dakar',
          email: newInterventionForm.clientEmail
        },
        scheduledDate: newInterventionForm.scheduledDate || undefined,
        scheduledTime: newInterventionForm.scheduledTime || undefined
      }
      const res = await fetch('/api/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data?.intervention) {
        throw new Error(data.error || 'Création impossible')
      }
      const normalized = normalizeInterventionFromApi(data.intervention)
      normalized.client = normalized.client || payload.client
      normalized.origin = 'manual'
      normalized.isContractual = false
      setInterventions((prev) => [normalized, ...prev])
      setShowNewInterventionModal(false)
      setNewInterventionForm({
        title: '',
        service: 'maintenance',
        priority: 'medium',
        estimatedDuration: 2,
        description: '',
        clientName: '',
        clientPhone: '',
        clientZone: 'Dakar-Centre',
        clientAddress: '',
        clientEmail: '',
        scheduledDate: '',
        scheduledTime: ''
      })
    } catch (error) {
      setNewInterventionError(error instanceof Error ? error.message : 'Erreur réseau')
    } finally {
      setNewInterventionSubmitting(false)
    }
  }

  // Chargement depuis l'API
  useEffect(() => {
    ;(async () => {
      try {
        const horizon = new Date()
        horizon.setMonth(horizon.getMonth() + 2)
        const fromParam = new Date().toISOString().split('T')[0]
        const toParam = horizon.toISOString().split('T')[0]
        const [tRes, iRes, visitsRes, activitiesRes] = await Promise.all([
          fetch('/api/technicians?limit=100', { credentials: 'include' }),
          fetch('/api/interventions?limit=100', { credentials: 'include' }),
          fetch(`/api/maintenance/visits?from=${fromParam}&to=${toParam}`, { credentials: 'include' }),
          fetch('/api/maintenance/activities?status=open', { credentials: 'include' })
        ])
        if (tRes.ok) {
          const tJson = await tRes.json()
          const list: Technician[] = (tJson.technicians || []).map((t: any) => ({
            id: t._id || t.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            skills: t.specialties || [],
            zone: t.preferences?.zone || 'Dakar',
            availability: {},
            currentLoad: t.stats?.currentLoad || 0,
            rating: t.stats?.averageRating || 4.5,
            specialties: t.specialties || []
          }))
          setTechnicians(list)
        }
        let mergedInterventions: Intervention[] = []
        if (iRes.ok) {
          const iJson = await iRes.json()
          mergedInterventions = (iJson.interventions || []).map((it: any) => ({
            id: it._id || it.id,
            title: it.title,
            description: it.description,
            client: it.client,
            service: it.service,
            priority: it.priority,
            estimatedDuration: it.estimatedDuration,
            requiredSkills: it.requiredSkills || [],
            scheduledDate: it.scheduledDate,
            scheduledTime: it.scheduledTime,
            assignedTechnician: it.assignedTechnician,
            status: it.status,
            createdAt: it.createdAt,
            urgency: it.priority === 'urgent',
            origin: 'manual',
            contractId: it.contractId,
            clientId: it.clientId,
            isContractual: Boolean(it.isContractual),
            preferredTechnicians: Array.isArray(it.preferredTechnicians) ? it.preferredTechnicians : []
          }))
        }
        let maintenanceEvents: Intervention[] = []
        if (visitsRes.ok) {
          const visitsJson = await visitsRes.json()
          maintenanceEvents = (visitsJson.visits || []).map((visit: any) => ({
            id: visit.id,
            title: `Visite ${visit.contractName}`,
            description: `Maintenance préventive programmée sur ${visit.site || 'site client'}`,
            client: {
              name: visit.clientName,
              address: visit.site || visit.clientName,
              phone: '',
              zone: visit.zone || 'Dakar'
            },
            service: 'maintenance',
            priority: visit.priority || 'medium',
            estimatedDuration: visit.estimatedDurationHours || 4,
            requiredSkills: ['maintenance'],
            scheduledDate: visit.date?.split('T')[0],
            scheduledTime: '09:00',
            assignedTechnician: undefined,
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            urgency: visit.priority === 'high',
            contractId: visit.contractId,
            clientId: visit.clientId,
            origin: 'auto',
            isContractual: visit.isContractual,
            preferredTechnicians: Array.isArray(visit.preferredTechnicians) ? visit.preferredTechnicians : []
          }))
          mergedInterventions = [...mergedInterventions, ...maintenanceEvents]
        }
        const marketplaceGenerated: Intervention[] = []
        if (activitiesRes.ok) {
          const activitiesJson = await activitiesRes.json()
          const map: Record<string, MarketplaceActivityInfo> = {}
          ;(activitiesJson.activities || []).forEach((activity: any) => {
            const key = activity.visitId || activity.id
            map[key] = {
              status: activity.status,
              bidsCount: activity.bidsCount,
              bestBid: activity.bestBidAmount,
              allowMarketplace: activity.allowMarketplace,
              activityId: activity.id,
              category: activity.category,
              marketplaceReason: activity.marketplaceReason
            }
            if (activity.category === 'product_install') {
              marketplaceGenerated.push({
                id: activity.id,
                title: activity.productName ? `Installation ${activity.productName}` : 'Installation produit',
                description: `Demande d'installation post-achat pour ${activity.clientName}`,
                client: {
                  name: activity.clientName,
                  address: activity.site || activity.clientContact?.address || 'Site client',
                  phone: activity.clientContact?.phone || '',
                  zone: activity.clientContact?.address?.split(',')?.[0] || 'Dakar'
                },
                service: 'installation',
                priority: 'medium',
                estimatedDuration: 6,
                requiredSkills: ['installation'],
                scheduledDate: activity.installationOptions?.preferredDate
                  ? activity.installationOptions.preferredDate.split('T')[0]
                  : undefined,
                scheduledTime: undefined,
                assignedTechnician: undefined,
                status: 'pending',
                createdAt: activity.date,
                urgency: false,
                contractId: undefined,
                clientId: activity.clientId,
                origin: 'marketplace',
                isContractual: false,
                preferredTechnicians: [],
                marketplaceActivityId: activity.id,
                marketplaceReason: activity.marketplaceReason
              })
            }
          })
          setActivitiesMap(map)
        }
        if (marketplaceGenerated.length) {
          mergedInterventions = [...mergedInterventions, ...marketplaceGenerated]
        }
        setInterventions(mergedInterventions)
      } catch {}
    })()
  }, [])

  const services = [
    { id: 'videosurveillance', name: 'Vidéosurveillance', icon: Camera, color: 'emerald' },
    { id: 'controle_acces', name: 'Contrôle d\'accès', icon: Lock, color: 'purple' },
    { id: 'domotique', name: 'Domotique', icon: Home, color: 'blue' },
    { id: 'securite_incendie', name: 'Sécurité incendie', icon: Flame, color: 'red' },
    { id: 'network_cabling', name: 'Câblage réseau', icon: Cable, color: 'orange' },
    { id: 'fiber_optic', name: 'Fibre optique', icon: Zap, color: 'cyan' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, color: 'gray' }
  ]

  const zones = ['Dakar-Centre', 'Almadies', 'Pikine', 'Guédiawaye', 'Rufisque', 'Thiès']

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getServiceIcon = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    return service ? service.icon : Wrench
  }

const publishActivityPayload = (
  visit: Intervention,
  options?: { overrideReason?: string }
) => ({
  visitId: visit.id,
  contractId: visit.contractId,
  contractName: visit.title,
  clientId: visit.clientId,
  clientName: visit.client.name,
  site: visit.client.address,
  date: visit.scheduledDate,
  category: visit.isContractual ? 'contract_visit' : 'ad_hoc',
  isContractual: options?.overrideReason ? false : Boolean(visit.isContractual),
  allowMarketplace: true,
  preferredTechnicians: visit.preferredTechnicians?.map((tech) => tech._id),
  marketplaceReason: options?.overrideReason
})

  // Algorithme d'affectation automatique
  const findBestTechnician = (intervention: Intervention): Technician | null => {
    const targetZone = intervention.client?.zone
    const availableTechnicians = technicians.filter(tech => {
      // Vérifier les compétences requises
      const hasRequiredSkills = intervention.requiredSkills.every(skill => 
        tech.skills.includes(skill)
      )
      
      // Vérifier la zone (priorité aux techniciens de la même zone)
      const sameZone = targetZone ? tech.zone === targetZone : false
      
      // Vérifier la charge de travail (ne pas dépasser 90%)
      const notOverloaded = tech.currentLoad < 90
      
      return hasRequiredSkills && notOverloaded
    })

    if (availableTechnicians.length === 0) return null

    // Scoring pour choisir le meilleur technicien
    const scoredTechnicians = availableTechnicians.map(tech => {
      let score = 0
      
      // Bonus pour la même zone
      if (targetZone && tech.zone === targetZone) score += 30
      
      // Bonus pour charge de travail faible
      score += (100 - tech.currentLoad) * 0.3
      
      // Bonus pour rating élevé
      score += tech.rating * 10
      
      // Bonus pour urgence si spécialité "Urgences"
      if (intervention.urgency && tech.specialties.includes('Urgences')) score += 25
      
      return { ...tech, score }
    })

    // Retourner le technicien avec le meilleur score
    return scoredTechnicians.sort((a, b) => b.score - a.score)[0]
  }

  const autoAssignIntervention = (intervention: Intervention) => {
    const bestTechnician = findBestTechnician(intervention)
    
    if (bestTechnician) {
      // Mettre à jour l'intervention
      setInterventions(prev => prev.map(int => 
        int.id === intervention.id 
          ? { 
              ...int, 
              assignedTechnician: bestTechnician.id,
              status: 'scheduled',
              scheduledDate: selectedDate,
              scheduledTime: '09:00'
            }
          : int
      ))

      // Mettre à jour la charge du technicien
      setTechnicians(prev => prev.map(tech => 
        tech.id === bestTechnician.id 
          ? { ...tech, currentLoad: tech.currentLoad + (intervention.estimatedDuration * 10) }
          : tech
      ))

      alert(`✅ Intervention assignée à ${bestTechnician.name}`)
    } else {
      alert('❌ Aucun technicien disponible avec les compétences requises')
    }
  }

const markAsContractual = (
  interventionId: string,
  setInterventions: React.Dispatch<React.SetStateAction<Intervention[]>>
) => {
  setInterventions((prev) =>
    prev.map((int) =>
      int.id === interventionId
        ? { ...int, isContractual: true, marketplaceReason: undefined }
        : int
    )
  )
}

const assignPreferredTechnician = (
  intervention: Intervention,
  setInterventions: React.Dispatch<React.SetStateAction<Intervention[]>>
) => {
  if (!intervention.preferredTechnicians?.length) {
    alert('Aucun technicien référent n’est défini pour ce contrat.')
    return
  }
  const candidate = intervention.preferredTechnicians[0]
  setInterventions((prev) =>
    prev.map((int) =>
      int.id === intervention.id
        ? {
            ...int,
            assignedTechnician: candidate._id || candidate.name,
            status: 'scheduled'
          }
        : int
    )
  )
  alert(`Intervention assignée à ${candidate.name}`)
}

const handleMarketplacePublish = (
  intervention: Intervention,
  activitiesMap: Record<string, MarketplaceActivityInfo>,
  setPublishing: (id: string | null) => void,
  setActivities: React.Dispatch<React.SetStateAction<Record<string, MarketplaceActivityInfo>>>,
  setInterventions: React.Dispatch<React.SetStateAction<Intervention[]>>
) => {
  if (activitiesMap[intervention.id]) return
  if (intervention.isContractual) {
    const reason = window.prompt('Motif de publication (ex: Tech indisponible, urgence hors SLA) ?')
    if (!reason) return
    publishVisitToMarketplace(intervention, setPublishing, setActivities, { overrideReason: reason })
    setInterventions((prev) =>
      prev.map((int) =>
        int.id === intervention.id
          ? { ...int, isContractual: false, marketplaceReason: reason }
          : int
      )
    )
  } else {
    publishVisitToMarketplace(intervention, setPublishing, setActivities)
  }
}

const normalizeInterventionFromApi = (payload: any): Intervention => ({
  id: payload._id || payload.id,
  title: payload.title,
  description: payload.description || '',
  client: payload.client || {
    name: payload.client?.name || 'Client',
    address: payload.client?.address || 'Adresse',
    phone: payload.client?.phone || '',
    zone: payload.client?.zone || 'Dakar'
  },
  service: payload.service || 'maintenance',
  priority: payload.priority || 'medium',
  estimatedDuration: payload.estimatedDuration || 2,
  requiredSkills: payload.requiredSkills || [payload.service || 'maintenance'],
  scheduledDate: payload.scheduledDate,
  scheduledTime: payload.scheduledTime,
  assignedTechnician: payload.assignedTechnician,
  status: payload.status || 'pending',
  createdAt: payload.createdAt || new Date().toISOString(),
  urgency: payload.priority === 'urgent',
  contractId: payload.contractId,
  clientId: payload.clientId,
  origin: 'manual',
  isContractual: Boolean(payload.isCoveredByContract),
  preferredTechnicians: Array.isArray(payload.preferredTechnicians) ? payload.preferredTechnicians : []
})

const publishVisitToMarketplace = async (
  visit: Intervention,
  setPublishing: (id: string | null) => void,
  setActivities: React.Dispatch<React.SetStateAction<Record<string, MarketplaceActivityInfo>>>,
  options?: { overrideReason?: string }
) => {
  setPublishing(visit.id)
  try {
    const payload = publishActivityPayload(visit, options)
    const res = await fetch('/api/maintenance/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Publication impossible')
      setPublishing(null)
      return
    }
    const data = await res.json()
    setActivities((prev) => ({
      ...prev,
      [visit.id]: {
        status: 'open',
        bidsCount: 0,
        bestBid: undefined,
        allowMarketplace: true,
        activityId: data.activityId,
        category: payload.category,
        marketplaceReason: options?.overrideReason
      }
    }))
  } catch (error) {
    alert('Erreur réseau : publication marketplace')
  } finally {
    setPublishing(null)
  }
}

  useEffect(() => {
    setViewMode(defaultViewMode)
  }, [defaultViewMode])

  const filteredInterventions = interventions.filter(intervention => {
    const clientZone = intervention.client?.zone || ''
    const clientName = intervention.client?.name || ''
    const matchesService = filterService === 'all' || intervention.service === filterService
    const matchesZone = filterZone === 'all' || clientZone === filterZone
    const matchesSearch = searchTerm === '' || 
      intervention.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesService && matchesZone && matchesSearch
  })

  const visibleInterventions = useMemo(() => {
    if (filterMode === 'marketplace') {
      return filteredInterventions.filter(
        (intervention) =>
          intervention.origin === 'marketplace' || Boolean(activitiesMap[intervention.id])
      )
    }
    if (filterMode === 'installations') {
      return filteredInterventions.filter(
        (intervention) =>
          intervention.service === 'installation' ||
          intervention.title.toLowerCase().includes('installation')
      )
    }
    return filteredInterventions
  }, [filteredInterventions, filterMode, activitiesMap])

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planification Dynamique</h1>
            <p className="text-gray-600">Gestion intelligente des interventions et affectation automatique</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Calendrier
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('technicians')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'technicians' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Techniciens
            </button>
            <button
              onClick={() => setShowVisitsPanel((prev) => !prev)}
              className="px-4 py-2 rounded-lg font-medium bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              {showVisitsPanel ? 'Masquer visites' : 'Visites maintenance'}
            </button>
            {showNewInterventionShortcut && (
              <button
                onClick={() => setShowNewInterventionModal(true)}
                className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Nouvelle intervention
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une intervention..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">Tous les services</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>

          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">Toutes les zones</option>
            {zones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex-1 p-6">
        {showVisitsPanel && (
          <div className="mb-6 bg-white border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-emerald-700">Visites maintenance programmées</p>
                <p className="text-xs text-gray-500">Issues des contrats actifs (prochaine fenêtre de 60 jours)</p>
              </div>
              <span className="text-xs font-semibold text-gray-500">
          {visibleInterventions.filter((v) => v.origin === 'auto').length} visites
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-auto pr-2">
              {visibleInterventions
                .filter((v) => v.origin === 'auto')
                .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
                .map((visit) => (
                  <div
                    key={visit.id}
                    className="border border-emerald-100 rounded-xl p-3 bg-emerald-50/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{visit.title}</p>
                      <p className="text-xs text-emerald-600">{visit.client.name} • {visit.client.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {visit.scheduledDate} • {visit.estimatedDuration}h prévues
                      </p>
                      {activitiesMap[visit.id] && (
                        <p className="text-xs text-emerald-600 mt-1">
                          {activitiesMap[visit.id].bidsCount} offre(s) • meilleure offre {activitiesMap[visit.id].bestBid ? `${activitiesMap[visit.id].bestBid?.toLocaleString('fr-FR')} FCFA` : 'en attente'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-semibold text-emerald-600">Préventif</span>
                      {!activitiesMap[visit.id] ? (
                        <button
                          disabled={publishingVisitId === visit.id}
                          onClick={() =>
                            handleMarketplacePublish(
                              visit,
                              activitiesMap,
                              setPublishingVisitId,
                              setActivitiesMap,
                              setInterventions
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <Megaphone className="h-3.5 w-3.5" />
                          {publishingVisitId === visit.id ? 'Publication...' : 'Publier'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          Marketplace
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Interventions en attente ({visibleInterventions.filter(i => i.status === 'pending').length})
              </h2>
              <button
                onClick={() => setShowNewInterventionModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Nouvelle intervention
              </button>
            </div>

            <div className="grid gap-4">
              {visibleInterventions.map(intervention => {
                const ServiceIcon = getServiceIcon(intervention.service)
                const assignedTech = technicians.find(t => t.id === intervention.assignedTechnician)
                const activityInfo = activitiesMap[intervention.id]
                const isPublishing = publishingVisitId === intervention.id
                
                return (
                  <div key={intervention.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <ServiceIcon className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{intervention.title}</h3>
                            <p className="text-sm text-gray-600">
                              {intervention.client?.name || 'Client à confirmer'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(intervention.priority || 'medium')}`}>
                            {(intervention.priority || 'medium').toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${
                              intervention.isContractual
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            {intervention.isContractual ? 'Contrat' : 'Hors contrat'}
                          </span>
                          {intervention.origin === 'marketplace' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-100">
                              Marketplace
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{intervention.client?.zone || 'Zone à préciser'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{intervention.estimatedDuration}h estimées</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{assignedTech ? assignedTech.name : 'Non assigné'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {intervention.status === 'pending' ? (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            <span className="capitalize">{intervention.status}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {intervention.requiredSkills.map(skill => (
                            <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {services.find(s => s.id === skill)?.name || skill}
                            </span>
                          ))}
                        </div>
                        {intervention.isContractual ? (
                          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 space-y-2">
                            <div className="flex items-center gap-2 font-semibold">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Couvert par contrat
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {intervention.preferredTechnicians?.length ? (
                                intervention.preferredTechnicians.map((tech) => (
                                  <span
                                    key={`${intervention.id}-pref-${tech._id}`}
                                    className="px-2 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700"
                                  >
                                    {tech.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-emerald-600/80">Aucun technicien attitré</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                            Intervention hors contrat – privilégier la publication marketplace
                          </div>
                        )}
                        {activityInfo && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-emerald-700">
                            <ArrowUpCircle className="h-4 w-4" />
                            <span className="font-semibold">
                              Marketplace ouvert • {activityInfo.bidsCount} offre(s)
                              {activityInfo.bestBid
                                ? ` • meilleure offre ${activityInfo.bestBid.toLocaleString('fr-FR')} F CFA`
                                : ''}
                            </span>
                            {activityInfo.marketplaceReason && (
                              <span className="text-gray-500">
                                Motif : {activityInfo.marketplaceReason}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {intervention.status === 'pending' && intervention.origin !== 'marketplace' && (
                          <button
                            onClick={() => autoAssignIntervention(intervention)}
                            className="bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
                          >
                            <Zap className="h-4 w-4" />
                            <span>Auto-assigner</span>
                          </button>
                        )}
                        {intervention.isContractual && intervention.preferredTechnicians?.length ? (
                          <button
                            onClick={() => assignPreferredTechnician(intervention, setInterventions)}
                            className="border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <Users className="h-4 w-4" />
                            <span>Affecter tech attitré</span>
                          </button>
                        ) : null}
                        {!activityInfo && intervention.origin !== 'marketplace' && (
                          <button
                            onClick={() =>
                              handleMarketplacePublish(
                                intervention,
                                activitiesMap,
                                setPublishingVisitId,
                                setActivitiesMap,
                                setInterventions
                              )
                            }
                            disabled={isPublishing}
                            className="border border-purple-200 text-purple-700 hover:bg-purple-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                          >
                            <Megaphone className="h-4 w-4" />
                            <span>
                              {isPublishing
                                ? 'Publication...'
                                : intervention.isContractual
                                  ? 'Remplacer via marketplace'
                                  : 'Publier marketplace'}
                            </span>
                          </button>
                        )}
                        {!intervention.isContractual && intervention.origin !== 'marketplace' && (
                          <button
                            onClick={() => markAsContractual(intervention.id, setInterventions)}
                            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <ShieldCheck className="h-4 w-4 text-gray-500" />
                            <span>Marquer contractuel</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedIntervention(intervention)
                            setShowAssignmentModal(true)
                          }}
                          className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Modifier</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode === 'technicians' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Équipe technique ({technicians.length} techniciens)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technicians.map(technician => {
                const assignedInterventions = interventions.filter(i => i.assignedTechnician === technician.id)
                
                return (
                  <div key={technician.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-purple-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{technician.name}</h3>
                        <p className="text-sm text-gray-600">{technician.zone}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Charge de travail</span>
                          <span className="font-medium">{technician.currentLoad}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              technician.currentLoad > 80 ? 'bg-red-500' :
                              technician.currentLoad > 60 ? 'bg-orange-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${technician.currentLoad}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">Compétences :</p>
                        <div className="flex flex-wrap gap-1">
                          {technician.skills.map(skill => {
                            const service = services.find(s => s.id === skill)
                            const ServiceIcon = service?.icon || Wrench
                            return (
                              <span key={skill} className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">
                                <ServiceIcon className="h-3 w-3" />
                                <span>{service?.name || skill}</span>
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">Spécialités :</p>
                        <div className="flex flex-wrap gap-1">
                          {technician.specialties.map(specialty => (
                            <span key={specialty} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <strong>{assignedInterventions.length}</strong> intervention(s) assignée(s)
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="text-sm text-gray-600">Note :</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-sm ${i < Math.floor(technician.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">({technician.rating})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Calendrier du {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Interventions planifiées */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Interventions planifiées</h3>
                  <div className="space-y-3">
                    {interventions.filter(i => i.scheduledDate === selectedDate).map(intervention => {
                      const ServiceIcon = getServiceIcon(intervention.service)
                      const assignedTech = technicians.find(t => t.id === intervention.assignedTechnician)
                      
                      return (
                        <div key={intervention.id} className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <ServiceIcon className="h-5 w-5 text-emerald-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{intervention.scheduledTime} - {intervention.title}</p>
                            <p className="text-sm text-gray-600">
                              {assignedTech?.name || 'Non assigné'} • {intervention.client?.zone || 'Zone à préciser'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(intervention.priority)}`}>
                            {intervention.priority}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Interventions en attente */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">En attente d'affectation</h3>
                  <div className="space-y-3">
                    {interventions.filter(i => i.status === 'pending').map(intervention => {
                      const ServiceIcon = getServiceIcon(intervention.service)
                      const bestTech = findBestTechnician(intervention)
                      
                      return (
                        <div key={intervention.id} className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <ServiceIcon className="h-5 w-5 text-orange-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{intervention.title}</p>
                            <p className="text-sm text-gray-600">
                              {intervention.client?.name || 'Client'} • {intervention.client?.zone || 'Zone'}
                              {bestTech && (
                                <span className="ml-2 text-emerald-600">
                                  → Suggéré: {bestTech.name}
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => autoAssignIntervention(intervention)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Assigner
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiques du jour */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {interventions.filter(i => i.scheduledDate === selectedDate).length}
                    </p>
                    <p className="text-sm text-gray-600">Planifiées</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {interventions.filter(i => i.status === 'pending').length}
                    </p>
                    <p className="text-sm text-gray-600">En attente</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {technicians.filter(t => t.currentLoad < 80).length}
                    </p>
                    <p className="text-sm text-gray-600">Disponibles</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {interventions.filter(i => i.priority === 'urgent').length}
                    </p>
                    <p className="text-sm text-gray-600">Urgentes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {showNewInterventionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-xs uppercase text-emerald-600 font-semibold">Nouvelle intervention hors contrat</p>
                <h3 className="text-lg font-semibold text-gray-900">Publier une intervention ponctuelle</h3>
                <p className="text-sm text-gray-500">Idéal pour les dépannages ou maintenances isolées non couvertes.</p>
              </div>
              <button
                onClick={() => setShowNewInterventionModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Titre intervention</label>
                  <input
                    value={newInterventionForm.title}
                    onChange={(e) => updateNewInterventionField('title', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Maintenance curative showroom"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Service</label>
                  <select
                    value={newInterventionForm.service}
                    onChange={(e) => updateNewInterventionField('service', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Priorité</label>
                  <select
                    value={newInterventionForm.priority}
                    onChange={(e) => updateNewInterventionField('priority', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Durée estimée (h)</label>
                  <input
                    type="number"
                    min={1}
                    value={newInterventionForm.estimatedDuration}
                    onChange={(e) => updateNewInterventionField('estimatedDuration', Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Description</label>
                <textarea
                  value={newInterventionForm.description}
                  onChange={(e) => updateNewInterventionField('description', e.target.value)}
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="Contexte, symptômes, périmètre attendu…"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Client / site</label>
                  <input
                    value={newInterventionForm.clientName}
                    onChange={(e) => updateNewInterventionField('clientName', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Nom client ou site"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Téléphone</label>
                  <input
                    value={newInterventionForm.clientPhone}
                    onChange={(e) => updateNewInterventionField('clientPhone', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="+221..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Adresse</label>
                  <input
                    value={newInterventionForm.clientAddress}
                    onChange={(e) => updateNewInterventionField('clientAddress', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Quartier, immeuble…"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Zone</label>
                  <select
                    value={newInterventionForm.clientZone}
                    onChange={(e) => updateNewInterventionField('clientZone', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  >
                    {zones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Date souhaitée (optionnel)</label>
                  <input
                    type="date"
                    value={newInterventionForm.scheduledDate}
                    onChange={(e) => updateNewInterventionField('scheduledDate', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Créneau</label>
                  <input
                    type="time"
                    value={newInterventionForm.scheduledTime}
                    onChange={(e) => updateNewInterventionField('scheduledTime', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {newInterventionError && (
                <p className="text-sm text-red-600">{newInterventionError}</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewInterventionModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateNewIntervention}
                disabled={newInterventionSubmitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {newInterventionSubmitting ? 'Création...' : 'Créer & publier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DynamicSchedulingSystem
