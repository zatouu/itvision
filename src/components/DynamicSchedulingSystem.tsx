'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  List,
  Loader2,
  Clock,
  MapPin,
  User,
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
  ChevronDown,
  Pencil,
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
  technicianIds?: string[]
  typeIntervention?: string
  site?: string
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

const INTERVENTION_TYPES = [
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'preventive', label: 'Préventive' },
  { id: 'installation', label: 'Installation' },
  { id: 'repair', label: 'Dépannage' },
  { id: 'inspection', label: 'Diagnostic' },
  { id: 'emergency', label: 'Urgence' },
] as const

const emptyInterventionForm = () => ({
  title: '',
  service: 'maintenance',
  typeIntervention: 'maintenance',
  priority: 'medium',
  estimatedDuration: 2,
  description: '',
  clientId: '',
  clientName: '',
  clientPhone: '',
  clientZone: 'Dakar-Centre',
  clientAddress: '',
  clientEmail: '',
  technicianIds: [] as string[],
  scheduledDate: '',
  scheduledTime: ''
})

const STATUS_LABELS: Record<string, string> = {
  pending: 'À planifier',
  scheduled: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

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
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'technicians' | 'agenda'>(defaultViewMode)
  const [agenda, setAgenda] = useState<any[] | null>(null)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterService, setFilterService] = useState<string>('all')
  const [filterZone, setFilterZone] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)
  const [manualAssign, setManualAssign] = useState({
    technicianId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    submitting: false
  })
  const [activitiesMap, setActivitiesMap] = useState<Record<string, MarketplaceActivityInfo>>({})
  const [publishingVisitId, setPublishingVisitId] = useState<string | null>(null)
  const [showNewInterventionModal, setShowNewInterventionModal] = useState(false)
  const [newInterventionSubmitting, setNewInterventionSubmitting] = useState(false)
  const [newInterventionError, setNewInterventionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string; email?: string; phone?: string; address?: string }[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newInterventionForm, setNewInterventionForm] = useState(emptyInterventionForm)

  // Bandeau d'information auto-masqué (ex. invitation envoyée à un technicien)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 8000)
    return () => clearTimeout(t)
  }, [notice])

  // Clients entreprises chargés à l'ouverture de la modale
  useEffect(() => {
    if (!showNewInterventionModal || clientOptions.length) return
    fetch('/api/admin/clients?limit=200', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setClientOptions((d.clients || []).map((c: any) => ({
        id: String(c._id || c.id || ''),
        name: c.name || c.company || 'Client',
        email: c.email, phone: c.phone, address: c.address,
      })).filter((c: any) => c.id)))
      .catch(() => {})
  }, [showNewInterventionModal, clientOptions.length])

  const updateNewInterventionField = (field: keyof typeof newInterventionForm, value: string | number) => {
    setNewInterventionForm((prev) => ({ ...prev, [field]: value }))
  }

  const openNewIntervention = () => {
    setEditingId(null)
    setNewInterventionForm(emptyInterventionForm())
    setNewInterventionError(null)
    setShowMoreDetails(false)
    setShowNewInterventionModal(true)
  }

  const typeLabel = (id: string) => INTERVENTION_TYPES.find(t => t.id === id)?.label || 'Intervention'
  const autoTitle = `${typeLabel(newInterventionForm.typeIntervention)}${newInterventionForm.clientName.trim() ? ` — ${newInterventionForm.clientName.trim()}` : ''}`
  const activeFiltersCount = (filterService !== 'all' ? 1 : 0) + (filterZone !== 'all' ? 1 : 0)

  // Vue « Agenda » : tout ce qui vient, toutes sources confondues
  useEffect(() => {
    if (viewMode !== 'agenda') return
    setAgendaLoading(true)
    const from = new Date().toISOString().slice(0, 10)
    const to = new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10)
    fetch(`/api/admin/planning?view=agenda&from=${from}&to=${to}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setAgenda(d.events || []))
      .catch(() => setAgenda([]))
      .finally(() => setAgendaLoading(false))
  }, [viewMode])

  // Édition : préremplit la modale existante, qui bascule en PUT
  const openEditIntervention = (i: any) => {
    setEditingId(i.id)
    setNewInterventionForm({
      title: i.title || '',
      service: i.service || 'maintenance',
      typeIntervention: i.typeIntervention || 'maintenance',
      priority: i.priority || 'medium',
      estimatedDuration: i.estimatedDuration || 2,
      description: i.description || '',
      clientId: i.clientId || '',
      clientName: i.client?.name || '',
      clientPhone: i.client?.phone || '',
      clientZone: i.client?.zone || 'Dakar',
      clientAddress: i.client?.address || i.site || '',
      clientEmail: i.client?.email || '',
      technicianIds: (i.technicianIds?.length ? i.technicianIds : (i.assignedTechnician ? [i.assignedTechnician] : [])).map(String),
      scheduledDate: i.scheduledDate || '',
      scheduledTime: i.scheduledTime || '',
    })
    setNewInterventionError(null)
    setShowMoreDetails(false)
    setShowNewInterventionModal(true)
  }

  const handleCreateNewIntervention = async () => {
    if (!newInterventionForm.clientName.trim()) {
      setNewInterventionError('Choisissez un client ou saisissez le nom du particulier.')
      return
    }
    setNewInterventionSubmitting(true)
    setNewInterventionError(null)
    try {
      const payload = {
        title: newInterventionForm.title.trim() || autoTitle,
        description: newInterventionForm.description.trim(),
        service: newInterventionForm.service,
        priority: newInterventionForm.priority,
        estimatedDuration: Number(newInterventionForm.estimatedDuration) || 2,
        requiredSkills: [newInterventionForm.service],
        typeIntervention: newInterventionForm.typeIntervention,
        clientId: newInterventionForm.clientId || undefined,
        technicianIds: newInterventionForm.technicianIds,
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
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingId ? { interventionId: editingId, ...payload } : payload)
      })
      const data = await res.json()
      if (!res.ok || (!editingId && !data?.intervention)) {
        throw new Error(data.error || (editingId ? 'Modification impossible' : 'Création impossible'))
      }
      const invited = (data.techAccess || []).filter((t: any) => t.status === 'invited').map((t: any) => t.name)
      if (invited.length) {
        setNotice(`Accès portail créé et mail d'activation envoyé à : ${invited.join(', ')}.`)
      }
      if (editingId) {
        const fresh = data.intervention ? normalizeInterventionFromApi(data.intervention) : null
        setInterventions(prev => prev.map(x => x.id === editingId ? (fresh || {
          ...x,
          title: payload.title, service: payload.service, priority: payload.priority as any,
          estimatedDuration: payload.estimatedDuration, description: payload.description,
          scheduledDate: payload.scheduledDate, scheduledTime: payload.scheduledTime,
          client: payload.client as any,
        }) : x))
        setEditingId(null)
        setShowNewInterventionModal(false)
        return
      }
      const normalized = normalizeInterventionFromApi(data.intervention)
      normalized.client = normalized.client || payload.client
      normalized.origin = 'manual'
      normalized.isContractual = false
      setInterventions((prev) => [normalized, ...prev])
      setShowNewInterventionModal(false)
      setNewInterventionForm(emptyInterventionForm())
    } catch (error) {
      setNewInterventionError(error instanceof Error ? error.message : 'Erreur réseau')
    } finally {
      setNewInterventionSubmitting(false)
    }
  }

  const handleManualAssign = async () => {
    if (!selectedIntervention || !manualAssign.technicianId) {
      alert('Veuillez sélectionner un technicien.')
      return
    }
    setManualAssign(prev => ({ ...prev, submitting: true }))
    try {
      const updated = await assignInterventionToTechnician(
        selectedIntervention.id,
        manualAssign.technicianId,
        manualAssign.scheduledDate,
        manualAssign.scheduledTime
      )
      if (updated) {
        setInterventions(prev => prev.map(int => (int.id === updated.id ? updated : int)))
        const previousTechId = selectedIntervention.assignedTechnician
        setTechnicians(prev =>
          prev.map(tech => {
            if (tech.id === manualAssign.technicianId) {
              return { ...tech, currentLoad: Math.min(100, tech.currentLoad + (updated.estimatedDuration * 10)) }
            }
            if (previousTechId && tech.id === previousTechId && previousTechId !== manualAssign.technicianId) {
              return { ...tech, currentLoad: Math.max(0, tech.currentLoad - (updated.estimatedDuration * 10)) }
            }
            return tech
          })
        )
        setShowAssignmentModal(false)
      }
    } finally {
      setManualAssign(prev => ({ ...prev, submitting: false }))
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
          const list: Technician[] = (tJson.technicians || []).filter(Boolean).map((t: any) => ({
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
  clientName: visit.client?.name || 'Client',
  site: visit.client?.address || '',
  date: visit.scheduledDate,
  category: visit.isContractual ? 'contract_visit' : 'ad_hoc',
  isContractual: options?.overrideReason ? false : Boolean(visit.isContractual),
  allowMarketplace: true,
  preferredTechnicians: visit.preferredTechnicians?.map((tech) => tech._id),
  marketplaceReason: options?.overrideReason
})

  // Algorithme d'affectation automatique
  // Match flou : « maintenance » doit aussi reconnaître « Maintenance », « maintenance préventive », etc.
  const skillMatches = (skill: string, skills: string[] = []) => {
    const s = String(skill || '').toLowerCase().trim()
    if (!s) return false
    return skills.some(t => {
      const x = String(t || '').toLowerCase().trim()
      return !!x && (x === s || x.includes(s) || s.includes(x))
    })
  }

  const findBestTechnician = (intervention: Intervention): Technician | null => {
    const targetZone = intervention.client?.zone
    const required = intervention.requiredSkills || []
    const notOverloaded = (tech: Technician) => tech.currentLoad < 90

    // Pool 1 : compétences requises (match flou) ; Pool 2 : repli sur tout tech disponible
    const skilled = technicians.filter(t => notOverloaded(t) && required.every(skill => skillMatches(skill, t.skills || [])))
    const pool = skilled.length ? skilled : technicians.filter(notOverloaded)
    if (pool.length === 0) return null

    // Scoring pour choisir le meilleur technicien
    const scoredTechnicians = pool.map(tech => {
      let score = 0
      
      // Bonus pour la même zone
      if (targetZone && tech.zone === targetZone) score += 30
      
      // Bonus par compétence requise reconnue (favorise les profils les plus proches)
      score += required.filter(skill => skillMatches(skill, tech.skills || [])).length * 50
      
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

  const autoAssignIntervention = async (intervention: Intervention) => {
    const bestTechnician = findBestTechnician(intervention)

    if (!bestTechnician) {
      alert('❌ Aucun technicien disponible avec les compétences requises')
      return
    }

    const updated = await assignInterventionToTechnician(
      intervention.id,
      bestTechnician.id,
      selectedDate,
      '09:00'
    )

    if (updated) {
      setInterventions(prev => prev.map(int =>
        int.id === updated.id ? updated : int
      ))
      setTechnicians(prev => prev.map(tech =>
        tech.id === bestTechnician.id
          ? { ...tech, currentLoad: Math.min(100, tech.currentLoad + (updated.estimatedDuration * 10)) }
          : tech
      ))
      alert(`✅ Intervention assignée à ${bestTechnician.name}`)
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

const assignPreferredTechnician = async (
  intervention: Intervention,
  setInterventions: React.Dispatch<React.SetStateAction<Intervention[]>>,
  setTechnicians?: React.Dispatch<React.SetStateAction<Technician[]>>
) => {
  if (!intervention.preferredTechnicians?.length) {
    alert('Aucun technicien référent n’est défini pour ce contrat.')
    return
  }
  const candidate = intervention.preferredTechnicians[0]
  const technicianId = candidate._id || candidate.name
  const scheduledDate = intervention.scheduledDate || new Date().toISOString().split('T')[0]
  const scheduledTime = intervention.scheduledTime || '09:00'
  const updated = await assignInterventionToTechnician(
    intervention.id,
    technicianId,
    scheduledDate,
    scheduledTime
  )
  if (!updated) return

  setInterventions((prev) =>
    prev.map((int) => (int.id === intervention.id ? updated : int))
  )

  if (setTechnicians) {
    const previousTechId = intervention.assignedTechnician
    setTechnicians((prev) =>
      prev.map((tech) => {
        if (tech.id === technicianId) {
          return { ...tech, currentLoad: Math.min(100, tech.currentLoad + (updated.estimatedDuration * 10)) }
        }
        if (previousTechId && tech.id === previousTechId && previousTechId !== technicianId) {
          return { ...tech, currentLoad: Math.max(0, tech.currentLoad - (updated.estimatedDuration * 10)) }
        }
        return tech
      })
    )
  }

  alert(`✅ Intervention assignée à ${candidate.name}`)
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
  technicianIds: Array.isArray(payload.technicianIds) ? payload.technicianIds.map(String) : (payload.assignedTechnician ? [String(payload.assignedTechnician)] : []),
  typeIntervention: payload.typeIntervention,
  site: payload.site,
  status: payload.status || 'pending',
  createdAt: payload.createdAt || new Date().toISOString(),
  urgency: payload.priority === 'urgent',
  contractId: payload.contractId,
  clientId: payload.clientId,
  origin: 'manual',
  isContractual: Boolean(payload.isCoveredByContract),
  preferredTechnicians: Array.isArray(payload.preferredTechnicians) ? payload.preferredTechnicians : []
})

async function assignInterventionToTechnician(
  interventionId: string,
  technicianId: string,
  scheduledDate?: string,
  scheduledTime?: string
): Promise<Intervention | null> {
  try {
    const res = await fetch('/api/interventions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        interventionId,
        technicianId,
        scheduledDate,
        scheduledTime,
        status: 'scheduled'
      })
    })
    const data = await res.json()
    if (!res.ok || !data?.intervention) {
      throw new Error(data.error || 'Affectation impossible')
    }
    return normalizeInterventionFromApi(data.intervention)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur réseau'
    console.error('[assignInterventionToTechnician]', error)
    alert(`❌ ${message}`)
    return null
  }
}

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
    {notice && (
      <div className="fixed bottom-4 right-4 z-[60] max-w-sm bg-emerald-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
        {notice}
      </div>
    )}
    <div className="min-h-screen bg-gray-50">
      {/* En-tête compact : vues, recherche, filtres repliables */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Planning des interventions</h1>
          {showNewInterventionShortcut && (
            <button
              onClick={openNewIntervention}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Planifier
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-1 overflow-x-auto max-w-full">
            {([
              { id: 'calendar', label: 'Jour', icon: Calendar },
              { id: 'agenda', label: 'Agenda', icon: Clock },
              { id: 'list', label: 'Liste', icon: List },
              { id: 'technicians', label: 'Techniciens', icon: Users },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[10rem]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher (titre, client)…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {viewMode === 'calendar' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Jour affiché"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          )}

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${
              showFilters || activeFiltersCount ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtres{activeFiltersCount ? ` (${activeFiltersCount})` : ''}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              onClick={() => setShowVisitsPanel((prev) => !prev)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                showVisitsPanel ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Visites contrats (60 j)
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setFilterService('all'); setFilterZone('all') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800"
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}
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
                      <p className="text-xs text-emerald-600">{visit.client?.name || 'Client'} • {visit.client?.address || ''}</p>
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {visibleInterventions.length} intervention(s)
                <span className="ml-2 text-sm font-normal text-gray-500">
                  dont {visibleInterventions.filter(i => i.status === 'pending').length} à planifier
                </span>
              </h2>
              {!showNewInterventionShortcut && (
                <button
                  onClick={openNewIntervention}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  Planifier
                </button>
              )}
            </div>

            {visibleInterventions.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-500">Aucune intervention pour ces filtres.</p>
            )}

            <div className="space-y-2">
              {visibleInterventions.map(intervention => {
                const ServiceIcon = getServiceIcon(intervention.service)
                const assignedTech = technicians.find(t => t.id === intervention.assignedTechnician)
                const activityInfo = activitiesMap[intervention.id]
                const isPublishing = publishingVisitId === intervention.id
                const isPending = intervention.status === 'pending'
                const expanded = expandedId === intervention.id
                const priority = intervention.priority || 'medium'
                const when = intervention.scheduledDate
                  ? `${new Date(`${intervention.scheduledDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}${intervention.scheduledTime ? ` · ${intervention.scheduledTime}` : ''}`
                  : 'Date à fixer'
                const openPlanner = () => {
                  setSelectedIntervention(intervention)
                  setManualAssign({
                    technicianId: intervention.assignedTechnician || '',
                    scheduledDate: intervention.scheduledDate || selectedDate,
                    scheduledTime: intervention.scheduledTime || '09:00',
                    submitting: false
                  })
                  setShowAssignmentModal(true)
                }
                const secondaryBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50'

                return (
                  <div key={intervention.id} className="bg-white rounded-xl border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : intervention.id)}
                        aria-expanded={expanded}
                        className="flex flex-1 min-w-0 items-center gap-3 text-left"
                      >
                        <div className="w-9 h-9 shrink-0 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <ServiceIcon className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{intervention.title}</p>
                            {(priority === 'urgent' || priority === 'high') && (
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getPriorityColor(priority)}`}>
                                {priority === 'urgent' ? 'Urgent' : 'Haute'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {intervention.client?.name || 'Client à confirmer'} · {when} · {assignedTech?.name || 'Non assigné'}
                          </p>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPending ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {STATUS_LABELS[intervention.status] || intervention.status}
                        </span>
                        <button
                          onClick={openPlanner}
                          className="ml-auto sm:ml-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                        >
                          <Calendar className="h-4 w-4" />
                          {isPending ? 'Planifier' : 'Replanifier'}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-gray-100 px-3 sm:px-4 py-3 space-y-3 text-sm">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {[intervention.client?.zone, intervention.client?.address].filter(Boolean).join(' · ') || 'Zone à préciser'}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {intervention.estimatedDuration}h estimées
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4" />
                            {intervention.isContractual ? 'Couvert par contrat' : 'Hors contrat'}
                          </span>
                          {intervention.origin === 'marketplace' && <span className="text-purple-700">Marketplace</span>}
                        </div>
                        {intervention.description && <p className="text-gray-600 whitespace-pre-line">{intervention.description}</p>}
                        {intervention.isContractual && intervention.preferredTechnicians?.length ? (
                          <p className="text-xs text-emerald-700">
                            Techniciens attitrés : {intervention.preferredTechnicians.map(t => t.name).join(', ')}
                          </p>
                        ) : null}
                        {activityInfo && (
                          <p className="flex flex-wrap items-center gap-2 text-xs text-emerald-700">
                            <ArrowUpCircle className="h-4 w-4" />
                            Marketplace ouvert · {activityInfo.bidsCount} offre(s)
                            {activityInfo.bestBid ? ` · meilleure offre ${activityInfo.bestBid.toLocaleString('fr-FR')} F CFA` : ''}
                            {activityInfo.marketplaceReason && <span className="text-gray-500">Motif : {activityInfo.marketplaceReason}</span>}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditIntervention(intervention)}
                            className={`${secondaryBtn} border-gray-300 text-gray-700 hover:bg-gray-50`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                          </button>
                          {isPending && intervention.origin !== 'marketplace' && (
                            <button
                              onClick={() => autoAssignIntervention(intervention)}
                              className={`${secondaryBtn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
                            >
                              <Zap className="h-3.5 w-3.5" />
                              Auto-assigner
                            </button>
                          )}
                          {intervention.isContractual && intervention.preferredTechnicians?.length ? (
                            <button
                              onClick={() => assignPreferredTechnician(intervention, setInterventions, setTechnicians)}
                              className={`${secondaryBtn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
                            >
                              <Users className="h-3.5 w-3.5" />
                              Tech attitré
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
                              className={`${secondaryBtn} border-purple-200 text-purple-700 hover:bg-purple-50`}
                            >
                              <Megaphone className="h-3.5 w-3.5" />
                              {isPublishing
                                ? 'Publication...'
                                : intervention.isContractual
                                  ? 'Remplacer via marketplace'
                                  : 'Publier marketplace'}
                            </button>
                          )}
                          {!intervention.isContractual && intervention.origin !== 'marketplace' && (
                            <button
                              onClick={() => markAsContractual(intervention.id, setInterventions)}
                              className={`${secondaryBtn} border-gray-300 text-gray-700 hover:bg-gray-50`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Marquer contractuel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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
      {/* AGENDA — toutes les tâches à venir, toutes sources */}
      {viewMode === 'agenda' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agenda — tout ce qui vient (60 jours)</h2>
          {agendaLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : !(agenda || []).length ? (
            <p className="py-8 text-center text-sm text-gray-500">Rien de planifié sur la période.</p>
          ) : (
            <div className="space-y-5">
              {Object.entries((agenda || []).reduce((g: Record<string, any[]>, e: any) => { (g[e.date] = g[e.date] || []).push(e); return g }, {})).map(([day, evts]) => (
                <div key={day}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {day === new Date().toISOString().slice(0, 10) && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">AUJOURD'HUI</span>}
                  </p>
                  <ul className="space-y-1.5">
                    {evts.map((e: any) => {
                      const KIND: Record<string, { l: string; c: string }> = {
                        intervention: { l: 'Intervention', c: 'bg-blue-50 text-blue-700' },
                        mission: { l: 'Mission', c: 'bg-amber-50 text-amber-700' },
                        milestone: { l: 'Jalon projet', c: 'bg-indigo-50 text-indigo-700' },
                        task: { l: 'Tâche', c: 'bg-stone-100 text-stone-600' },
                      }
                      const k = KIND[e.kind] || KIND.task
                      const intv = e.interventionId ? interventions.find(x => x.id === e.interventionId) : null
                      return (
                        <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${k.c}`}>{k.l}</span>
                          {e.time && <span className="text-xs tabular-nums text-gray-400">{e.time}</span>}
                          <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{e.title}</span>
                          <span className="truncate text-xs text-gray-400">{[e.client, e.site, e.tech].filter(Boolean).join(' · ')}</span>
                          {intv && (
                            <button onClick={() => openEditIntervention(intv)}
                              className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                              Modifier
                            </button>
                          )}
                          {e.href && (
                            <a href={e.href} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Ouvrir</a>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    {showNewInterventionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editingId ? "Modifier l'intervention" : 'Planifier une intervention'}</h3>
              <button
                onClick={() => setShowNewInterventionModal(false)}
                aria-label="Fermer"
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 sm:px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Type</p>
                <div className="flex flex-wrap gap-2">
                  {INTERVENTION_TYPES.map((t) => {
                    const active = newInterventionForm.typeIntervention === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewInterventionForm(prev => ({
                          ...prev,
                          typeIntervention: t.id,
                          ...(t.id === 'emergency' ? { priority: 'urgent' } : {}),
                        }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          active ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="intv-client" className="text-xs font-medium text-gray-500">Client</label>
                <select
                  id="intv-client"
                  value={newInterventionForm.clientId}
                  onChange={(e) => {
                    const id = e.target.value
                    const c = clientOptions.find(o => o.id === id)
                    setNewInterventionForm(prev => ({
                      ...prev,
                      clientId: id,
                      ...(c ? {
                        clientName: c.name,
                        clientPhone: c.phone || prev.clientPhone,
                        clientEmail: c.email || prev.clientEmail,
                        clientAddress: c.address || prev.clientAddress,
                      } : {}),
                    }))
                  }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">— Particulier / hors annuaire —</option>
                  {clientOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {newInterventionForm.clientId ? (
                  <p className="text-[11px] text-gray-500 mt-1 truncate">
                    {[newInterventionForm.clientAddress, newInterventionForm.clientPhone].filter(Boolean).join(' • ') || 'Coordonnées reprises de la fiche client'}
                    {' — rapport livré dans son portail.'}
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={newInterventionForm.clientName}
                      onChange={(e) => updateNewInterventionField('clientName', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      placeholder="Nom du client ou du site"
                    />
                    <input
                      type="tel"
                      value={newInterventionForm.clientPhone}
                      onChange={(e) => updateNewInterventionField('clientPhone', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      placeholder="Téléphone (+221…)"
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500">Quand <span className="font-normal text-gray-400">— vide = à planifier plus tard</span></p>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    aria-label="Date"
                    value={newInterventionForm.scheduledDate}
                    onChange={(e) => updateNewInterventionField('scheduledDate', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    aria-label="Heure"
                    value={newInterventionForm.scheduledTime}
                    onChange={(e) => updateNewInterventionField('scheduledTime', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500">
                  Technicien(s){newInterventionForm.technicianIds.length ? ` (${newInterventionForm.technicianIds.length})` : ''}
                  <span className="font-normal text-gray-400"> — le 1er coché est responsable</span>
                </p>
                <div className="mt-1 border border-gray-200 rounded-xl px-3 py-2 max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {technicians.length === 0 && <p className="text-xs text-gray-400 py-1">Chargement…</p>}
                  {technicians.map(t => {
                    const checked = newInterventionForm.technicianIds.includes(t.id)
                    return (
                      <label key={t.id} className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg cursor-pointer ${checked ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setNewInterventionForm(prev => ({
                            ...prev,
                            technicianIds: checked
                              ? prev.technicianIds.filter(id => id !== t.id)
                              : [...prev.technicianIds, t.id],
                          }))}
                          className="accent-emerald-600"
                        />
                        <span className="truncate">{t.name}</span>
                        {newInterventionForm.technicianIds[0] === t.id && <span className="text-[10px] font-semibold text-emerald-600">Resp.</span>}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails((prev) => !prev)}
                  aria-expanded={showMoreDetails}
                  className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-gray-700"
                >
                  <span>
                    Plus de détails
                    <span className="font-normal text-gray-400"> — titre, priorité, durée, adresse…</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
                </button>
                {showMoreDetails && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="intv-title" className="text-xs text-gray-500">Titre</label>
                      <input
                        id="intv-title"
                        value={newInterventionForm.title}
                        onChange={(e) => updateNewInterventionField('title', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        placeholder={autoTitle}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="intv-service" className="text-xs text-gray-500">Service</label>
                        <select
                          id="intv-service"
                          value={newInterventionForm.service}
                          onChange={(e) => updateNewInterventionField('service', e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        >
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>{service.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="intv-priority" className="text-xs text-gray-500">Priorité</label>
                        <select
                          id="intv-priority"
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
                        <label htmlFor="intv-duration" className="text-xs text-gray-500">Durée (h)</label>
                        <input
                          id="intv-duration"
                          type="number"
                          min={1}
                          value={newInterventionForm.estimatedDuration}
                          onChange={(e) => updateNewInterventionField('estimatedDuration', Number(e.target.value))}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="intv-description" className="text-xs text-gray-500">Description</label>
                      <textarea
                        id="intv-description"
                        value={newInterventionForm.description}
                        onChange={(e) => updateNewInterventionField('description', e.target.value)}
                        rows={3}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        placeholder="Contexte, symptômes, périmètre attendu…"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {newInterventionForm.clientId && (
                        <>
                          <div>
                            <label htmlFor="intv-site" className="text-xs text-gray-500">Nom du site</label>
                            <input
                              id="intv-site"
                              value={newInterventionForm.clientName}
                              onChange={(e) => updateNewInterventionField('clientName', e.target.value)}
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="intv-phone" className="text-xs text-gray-500">Téléphone</label>
                            <input
                              id="intv-phone"
                              type="tel"
                              value={newInterventionForm.clientPhone}
                              onChange={(e) => updateNewInterventionField('clientPhone', e.target.value)}
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label htmlFor="intv-address" className="text-xs text-gray-500">Adresse</label>
                        <input
                          id="intv-address"
                          value={newInterventionForm.clientAddress}
                          onChange={(e) => updateNewInterventionField('clientAddress', e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          placeholder="Quartier, immeuble…"
                        />
                      </div>
                      <div>
                        <label htmlFor="intv-zone" className="text-xs text-gray-500">Zone</label>
                        <select
                          id="intv-zone"
                          value={newInterventionForm.clientZone}
                          onChange={(e) => updateNewInterventionField('clientZone', e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        >
                          {zones.map((zone) => (
                            <option key={zone} value={zone}>{zone}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="intv-email" className="text-xs text-gray-500">Email pour le rapport</label>
                        <input
                          id="intv-email"
                          type="email"
                          value={newInterventionForm.clientEmail}
                          onChange={(e) => updateNewInterventionField('clientEmail', e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          placeholder="client@exemple.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                {newInterventionSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer & publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignmentModal && selectedIntervention && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Affecter / Planifier</h3>
                <p className="text-sm text-gray-500">{selectedIntervention.title}</p>
              </div>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="text-xs text-gray-500">Technicien</label>
                <select
                  value={manualAssign.technicianId}
                  onChange={(e) => setManualAssign(prev => ({ ...prev, technicianId: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Choisir un technicien</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} — {tech.zone} ({tech.currentLoad}% charge)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Date</label>
                  <input
                    type="date"
                    value={manualAssign.scheduledDate}
                    onChange={(e) => setManualAssign(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Heure</label>
                  <input
                    type="time"
                    value={manualAssign.scheduledTime}
                    onChange={(e) => setManualAssign(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleManualAssign}
                disabled={manualAssign.submitting || !manualAssign.technicianId}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {manualAssign.submitting ? 'Affectation...' : 'Affecter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DynamicSchedulingSystem
