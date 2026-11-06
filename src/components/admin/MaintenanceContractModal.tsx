'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Globe,
  Wallet,
  CalendarRange,
  ClipboardCheck,
  Loader2,
  Plus,
  Trash2,
  Users
} from 'lucide-react'
import type {
  MaintenanceTemplate,
  MaintenanceTemplateSite,
  MaintenanceTemplateService
} from '@/data/maintenanceTemplates'
import { maintenanceTemplates } from '@/data/maintenanceTemplates'

type ClientOption = {
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
  }
}

type ProjectOption = {
  _id: string
  name: string
  status?: string
  clientId?: string
}

type TechnicianOption = {
  _id: string
  name: string
  email?: string
  phone?: string
  zone?: string
  skills?: string[]
}

type Props = {
  open: boolean
  onClose: () => void
  clients: ClientOption[]
  projects: ProjectOption[]
  technicians: TechnicianOption[]
  onCreated?: () => void
}

type CoverageState = {
  responseTime: string
  supportHours: string
  interventionsIncluded: number
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0
})

const formatCurrency = (value?: number) => {
  if (!value || !Number.isFinite(value)) return '0 F CFA'
  return currencyFormatter.format(value)
}

type FormState = {
  name: string
  status: 'draft' | 'active'
  type: 'preventive' | 'curative' | 'full' | 'basic'
  annualPrice: number
  paymentFrequency: 'monthly' | 'quarterly' | 'annual'
  paymentTerms: string
  startDate: string
  endDate: string
  autoRenewal: boolean
  coverage: CoverageState
  services: MaintenanceTemplateService[]
  equipment: Array<{ type: string; quantity: number; location?: string; description?: string }>
  preferredTechnicians: string[]
}

const addMonths = (date: string, months: number) => {
  const ref = new Date(date)
  ref.setMonth(ref.getMonth() + months)
  return ref.toISOString().split('T')[0]
}

const flattenEquipment = (sites: MaintenanceTemplateSite[]) =>
  sites.flatMap((site) =>
    site.equipment.map((item) => ({
      type: item.item,
      quantity: item.quantity,
      location: site.name,
      description: item.brand
    }))
  )

const buildContractBody = (
  template: MaintenanceTemplate,
  client?: ClientOption,
  form?: FormState
) => {
  const clientName = client?.company || client?.name || '________________'
  const priceText = formatCurrency(form?.annualPrice || template.defaultPrice)
  const addresses = template.sites
    .map((site) => `- ${site.name} : ${site.address}`)
    .join('\n')
  const equipment = template.sites
    .map((site) => {
      const list = site.equipment
        .map((item) => `  • ${item.item}${item.brand ? ` (${item.brand})` : ''} – ${item.quantity}`)
        .join('\n')
      return `${site.name.toUpperCase()}\n${list}`
    })
    .join('\n\n')
  const services = template.services
    .map((service) => `• ${service.name} (${service.frequency}) : ${service.description}`)
    .join('\n')
  const emergency = template.emergencyLevels
    .map((lvl) => `• ${lvl.level} : ${lvl.detail}`)
    .join('\n')
  const clauses = template.clauses
    .map((clause, index) => `Article ${index + 1} - ${clause.title}\n${clause.body}`)
    .join('\n\n')

  return `CONTRAT DE MAINTENANCE ${template.serviceCategory.toUpperCase()}

Entre IT VISION+ (ci-après « le Prestataire ») et ${clientName} (ci-après « le Client »).

Objet :
${template.description}. Les équipements répartis sur les sites suivants sont couverts :
${addresses}

Inventaire par site :
${equipment}

Services inclus :
${services}

Délais et astreintes :
• Préventif : ${template.preventiveFrequency}
• Hotline / Support : ${template.coverage.supportHours}
• Réponses d’urgence :
${emergency}

Prix et modalités :
• Montant annuel forfaitaire : ${priceText}
• Modalités : ${form?.paymentTerms || template.paymentTerms}
• Durée : ${template.durationMonths} mois avec renouvellement automatique (préavis 30 jours)

Clauses :
${clauses}

Le Prestataire s’engage à délivrer des fiches d’intervention et des rapports après chaque passage.
Le Client garantit l’accès aux sites, la conformité électrique et la présence d’un référent.

Fait à Dakar, le ________`
}

export default function MaintenanceContractModal({
  open,
  onClose,
  clients,
  projects,
  technicians,
  onCreated
}: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(maintenanceTemplates[0].id)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [formState, setFormState] = useState<FormState>(() => {
    const tmpl = maintenanceTemplates[0]
    const today = new Date().toISOString().split('T')[0]
    return {
      name: `Contrat ${tmpl.serviceCategory}`,
      status: tmpl.defaultStatus,
      type: tmpl.type,
      annualPrice: tmpl.defaultPrice,
      paymentFrequency: tmpl.paymentFrequency,
      paymentTerms: tmpl.paymentTerms,
      startDate: today,
      endDate: addMonths(today, tmpl.durationMonths),
      autoRenewal: true,
      coverage: { ...tmpl.coverage },
      services: tmpl.services,
      equipment: flattenEquipment(tmpl.sites),
      preferredTechnicians: []
    }
  })
  const [contractText, setContractText] = useState(() =>
    buildContractBody(maintenanceTemplates[0])
  )
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectEquipment, setProjectEquipment] = useState<FormState['equipment']>([])
  const [projectEquipmentLoading, setProjectEquipmentLoading] = useState(false)
  const [technicianFilter, setTechnicianFilter] = useState('')

  const selectedTemplate = useMemo(
    () => maintenanceTemplates.find((tmpl) => tmpl.id === selectedTemplateId) || maintenanceTemplates[0],
    [selectedTemplateId]
  )

  const selectedClient = useMemo(
    () => clients.find((client) => client._id === selectedClientId),
    [clients, selectedClientId]
  )

  const filteredProjects = useMemo(() => {
    if (!selectedClient) return []
    return projects.filter(
      (project) =>
        project.clientId === selectedClient._id ||
        project.clientId === selectedClient.clientId
    )
  }, [projects, selectedClient])

  const filteredTechniciansList = useMemo(() => {
    if (!technicianFilter.trim()) return technicians
    const needle = technicianFilter.toLowerCase()
    return technicians.filter((tech) => {
      const haystack = [
        tech.name,
        tech.email,
        tech.phone,
        tech.zone,
        Array.isArray(tech.skills) ? tech.skills.join(' ') : ''
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [technicians, technicianFilter])

  useEffect(() => {
    if (!selectedTemplate) return
    const today = formState.startDate || new Date().toISOString().split('T')[0]
    setFormState((prev) => ({
      ...prev,
      name: `Contrat ${selectedTemplate.serviceCategory}`,
      type: selectedTemplate.type,
      status: selectedTemplate.defaultStatus,
      annualPrice: selectedTemplate.defaultPrice,
      paymentFrequency: selectedTemplate.paymentFrequency,
      paymentTerms: selectedTemplate.paymentTerms,
      endDate: addMonths(today, selectedTemplate.durationMonths),
      coverage: { ...selectedTemplate.coverage },
      services: selectedTemplate.services,
      equipment: flattenEquipment(selectedTemplate.sites)
    }))
  }, [selectedTemplate])

  useEffect(() => {
    setContractText(buildContractBody(selectedTemplate, selectedClient, formState))
  }, [selectedTemplate, selectedClient, formState.annualPrice, formState.paymentTerms])

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectEquipment([])
      return
    }
    let cancelled = false
    const fetchProjectEquipment = async () => {
      try {
        setProjectEquipmentLoading(true)
        const res = await fetch(`/api/projects/${selectedProjectId}/products`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const imported = Array.isArray(data.products)
          ? data.products.map((product: any) => ({
              type: product?.name || product?.model || 'Équipement',
              quantity: Number(product?.quantity) || 1,
              location: data.project?.name || 'Site principal',
              description: product?.brand || product?.model
            }))
          : []
        if (!cancelled) {
          setProjectEquipment(imported)
          if (imported.length && formState.equipment.length === 0) {
            setFormState((prev) => ({ ...prev, equipment: imported }))
          }
        }
      } finally {
        if (!cancelled) {
          setProjectEquipmentLoading(false)
        }
      }
    }
    fetchProjectEquipment()
    return () => {
      cancelled = true
    }
  }, [selectedProjectId, formState.equipment.length])

  useEffect(() => {
    if (!open) {
      setSelectedClientId('')
      setSelectedProjectId('')
      setError(null)
    }
  }, [open])

  const updateFormState = (field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const togglePreferredTechnician = (techId: string) => {
    setFormState((prev) => {
      const exists = prev.preferredTechnicians.includes(techId)
      const preferredTechnicians = exists
        ? prev.preferredTechnicians.filter((id) => id !== techId)
        : [...prev.preferredTechnicians, techId]
      return { ...prev, preferredTechnicians }
    })
  }

  const updateEquipmentItem = (index: number, field: 'type' | 'quantity' | 'location', value: string) => {
    setFormState((prev) => {
      const next = [...prev.equipment]
      const target = { ...next[index] }
      if (field === 'quantity') {
        target.quantity = Number(value) || 0
      } else {
        target[field] = value
      }
      next[index] = target
      return { ...prev, equipment: next }
    })
  }

  const removeEquipmentItem = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((_, idx) => idx !== index)
    }))
  }

  const addEquipmentItem = () => {
    setFormState((prev) => ({
      ...prev,
      equipment: [
        ...prev.equipment,
        { type: 'Équipement', quantity: 1, location: selectedClient?.company || 'Site principal' }
      ]
    }))
  }

  const applyProjectEquipment = () => {
    if (!projectEquipment.length) return
    setFormState((prev) => ({ ...prev, equipment: projectEquipment }))
  }

  const handleCreateContract = async () => {
    if (!selectedClientId) {
      setError('Veuillez sélectionner un client')
      return
    }
    if (!formState.startDate || !formState.endDate) {
      setError('Veuillez préciser les dates de début et de fin')
      return
    }
    setError(null)
    setCreating(true)
    try {
      const payload = {
        clientId: selectedClientId,
        projectId: selectedProjectId || undefined,
        name: formState.name,
        type: formState.type,
        status: formState.status,
        startDate: formState.startDate,
        endDate: formState.endDate,
        annualPrice: formState.annualPrice,
        paymentFrequency: formState.paymentFrequency,
        coverage: {
          ...formState.coverage,
          interventionsUsed: 0
        },
        services: formState.services.map((service) => ({
          name: service.name,
          description: service.description,
          frequency: service.frequency
        })),
        equipment: formState.equipment.map((equipment) => ({
          type: equipment.type,
          quantity: equipment.quantity,
          location: equipment.location,
          serialNumbers: [],
          description: equipment.description
        })),
        autoRenewal: formState.autoRenewal,
        paymentTerms: formState.paymentTerms,
        specialConditions: formState.paymentTerms,
        notes: contractText,
        preferredTechnicians: formState.preferredTechnicians
      }

      const res = await fetch('/api/maintenance/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur inconnue')
      }

      onCreated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto px-4 py-10">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl border border-gray-100">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-600">Nouveau contrat</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              {selectedTemplate.label}
            </h2>
            <p className="text-sm text-gray-500">
              Reliez le contrat à un client portal et à son projet puis personnalisez les clauses.
            </p>
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            onClick={onClose}
            disabled={creating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 py-6 max-h-[80vh] overflow-y-auto">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">1. Client & projet</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Client</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.company || client.name} — {client.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Projet couvert (optionnel)</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={!filteredProjects.length}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Aucun projet</option>
                    {filteredProjects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">2. Modèle</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {maintenanceTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`text-left border rounded-2xl p-3 transition ${
                      selectedTemplateId === template.id
                        ? 'border-emerald-500 bg-white shadow-sm'
                        : 'border-transparent bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {template.label}
                      </span>
                      {selectedTemplateId === template.id && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">3. Paramètres</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Nom du contrat</label>
                  <input
                    value={formState.name}
                    onChange={(e) => updateFormState('name', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Prix annuel</label>
                  <input
                    type="number"
                    value={formState.annualPrice}
                    onChange={(e) => updateFormState('annualPrice', Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date de début</label>
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={(e) => updateFormState('startDate', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date de fin</label>
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={(e) => updateFormState('endDate', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">SLA / Délai</label>
                  <input
                    value={formState.coverage.responseTime}
                    onChange={(e) =>
                      updateFormState('coverage', {
                        ...formState.coverage,
                        responseTime: e.target.value
                      })
                    }
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Support</label>
                  <input
                    value={formState.coverage.supportHours}
                    onChange={(e) =>
                      updateFormState('coverage', {
                        ...formState.coverage,
                        supportHours: e.target.value
                      })
                    }
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Modalités de paiement</label>
                <textarea
                  value={formState.paymentTerms}
                  onChange={(e) => updateFormState('paymentTerms', e.target.value)}
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </section>

            <section className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-gray-500">4. Équipements couverts</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!projectEquipment.length}
                    onClick={applyProjectEquipment}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 text-gray-600 hover:text-emerald-700 hover:border-emerald-300 disabled:opacity-50"
                  >
                    Import projet
                  </button>
                  <button
                    type="button"
                    onClick={addEquipmentItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-emerald-700 border border-emerald-100 hover:bg-emerald-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                </div>
              </div>
              {projectEquipmentLoading && (
                <p className="text-xs text-gray-500">Chargement des équipements du projet…</p>
              )}
              {formState.equipment.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aucun équipement listé. Ajoutez-les manuellement ou importez-les depuis un projet.
                </p>
              ) : (
                <div className="space-y-3">
                  {formState.equipment.map((equipment, index) => (
                    <div key={`${equipment.type}-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-2xl border border-gray-100 p-3">
                      <div>
                        <label className="text-xs text-gray-500">Équipement</label>
                        <input
                          value={equipment.type}
                          onChange={(e) => updateEquipmentItem(index, 'type', e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Quantité</label>
                        <input
                          type="number"
                          min={0}
                          value={equipment.quantity}
                          onChange={(e) => updateEquipmentItem(index, 'quantity', e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Site / localisation</label>
                        <input
                          value={equipment.location || ''}
                          onChange={(e) => updateEquipmentItem(index, 'location', e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeEquipmentItem(index)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Retirer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">5. Clauses</p>
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                rows={16}
                className="w-full border border-gray-200 rounded-2xl px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-gray-500">
                Ce texte sera sauvegardé dans les notes du contrat et pourra alimenter la génération PDF.
              </p>
            </section>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Résumé</p>
                  <p className="text-xs text-gray-500">Sync portail & projet</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {selectedClient ? (
                    <span>{selectedClient.company || selectedClient.name}</span>
                  ) : (
                    <span className="text-gray-400">Client non sélectionné</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  {selectedClient?.permissions?.canAccessPortal ? (
                    <span>Portail client actif</span>
                  ) : (
                    <span>Portail à activer</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-gray-400" />
                  <span>{formatCurrency(formState.annualPrice)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-gray-400" />
                  <span>
                    {formState.startDate || '—'} → {formState.endDate || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-gray-400" />
                  <span>{formState.coverage.responseTime}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Techniciens attitrés</p>
                  <p className="text-xs text-gray-500">
                    Ils seront prioritaires sur la planification préventive et le marketplace.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {formState.preferredTechnicians.length} sélectionné(s)
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={technicianFilter}
                  onChange={(e) => setTechnicianFilter(e.target.value)}
                  placeholder="Filtrer par nom, zone ou compétence"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="max-h-56 overflow-auto pr-1 space-y-2">
                {filteredTechniciansList.length === 0 ? (
                  <p className="text-xs text-gray-500">Aucun technicien disponible.</p>
                ) : (
                  filteredTechniciansList.map((tech) => {
                    const checked = formState.preferredTechnicians.includes(tech._id)
                    return (
                      <label
                        key={tech._id}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm cursor-pointer transition ${
                          checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 hover:border-emerald-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePreferredTechnician(tech._id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-4 w-4 text-emerald-600" />
                            {tech.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {tech.zone || 'Zone non définie'}
                            {tech.phone ? ` • ${tech.phone}` : ''}
                          </p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2 text-sm text-gray-600">
              <p className="text-xs font-semibold uppercase text-gray-500">Sites couverts</p>
              {selectedTemplate.sites.map((site) => (
                <div key={site.name} className="border border-gray-100 rounded-xl p-3">
                  <p className="font-semibold text-gray-900">{site.name}</p>
                  <p className="text-xs text-gray-500">{site.address}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {site.equipment.length} équipement(s) référencés
                  </p>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handleCreateContract}
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700 disabled:opacity-60"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le contrat'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

