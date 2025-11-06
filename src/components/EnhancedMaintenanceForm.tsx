'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Camera, 
  MapPin, 
  Clock, 
  User, 
  FileText, 
  Save, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Edit3,
  Trash2,
  Upload,
  Signature,
  Eye,
  Calendar,
  Settings,
  Wrench,
  Image as ImageIcon,
  X,
  Plus,
  Star,
  Zap,
  Shield,
  Activity,
  Users,
  MessageCircle,
  ArrowRight,
  Building,
  Phone,
  Mail
} from 'lucide-react'

type IssueForm = {
  reference: string
  component: string
  location: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: string
  requiresQuote: boolean
  recommendedSolution: string
  estimatedCost?: string
  estimatedDurationHours?: string
}

type MaterialForm = {
  name: string
  quantity: number
  unitCost?: string
  unitPrice?: string
  supplierReference?: string
}

type FollowUpForm = {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requiresQuote: boolean
  estimatedCost?: string
  estimatedDurationHours?: string
  recommendedDate?: string
}

type NextActionForm = {
  title: string
  scheduledDate?: string
  assignedTo?: string
  notes?: string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
}

interface MaintenanceFormData {
  // Informations générales
  site: string
  clientName: string
  clientContact: string
  interventionDate: string
  startTime: string
  endTime: string
  duration: string
  
  // Intervenant
  technician: string
  technicianId: string
  
  // Observations et problèmes
  initialObservations: string
  problemDescription: string
  problemSeverity: 'low' | 'medium' | 'high' | 'critical'
  
  // Tâches réalisées
  tasksPerformed: string[]
  
  // Résultats et recommandations
  results: string
  recommendations: string[]
  
  // Photos
  photosBefore: File[]
  photosAfter: File[]
  
  // Signatures
  technicianSignature: string | null
  clientSignature: string | null
  clientTitle: string
  
  // Métadonnées
  status: 'draft' | 'completed' | 'validated'
  reportId: string
  createdAt: string
  gpsLocation: { lat: number, lng: number } | null

  // Nouvelle structuration fiche
  issuesDetected: IssueForm[]
  materialsUsed: MaterialForm[]
  followUpRecommendations: FollowUpForm[]
  nextActions: NextActionForm[]
  billingNeedsQuote: boolean
}

interface EnhancedMaintenanceFormProps {
  projectId?: string
  isReadOnly?: boolean
  existingReport?: Partial<MaintenanceFormData>
  onSave?: (data: MaintenanceFormData) => void
  onSubmit?: (data: MaintenanceFormData) => void
}

export default function EnhancedMaintenanceForm({ 
  projectId = 'PRJ-001', 
  isReadOnly = false,
  existingReport = {},
  onSave,
  onSubmit
}: EnhancedMaintenanceFormProps) {
  
  const [formData, setFormData] = useState<MaintenanceFormData>({
    // Informations générales avec valeurs par défaut
    site: existingReport?.site || '',
    clientName: existingReport?.clientName || '',
    clientContact: existingReport?.clientContact || '',
    interventionDate: existingReport?.interventionDate || new Date().toISOString().split('T')[0],
    startTime: existingReport?.startTime || new Date().toTimeString().slice(0,5),
    endTime: existingReport?.endTime || '',
    duration: existingReport?.duration || '',
    
    // Intervenant
    technician: existingReport?.technician || 'Moussa Diop',
    technicianId: existingReport?.technicianId || 'TECH-001',
    
    // Observations et problèmes
    initialObservations: existingReport?.initialObservations || '',
    problemDescription: existingReport?.problemDescription || '',
    problemSeverity: existingReport?.problemSeverity || 'medium',
    
    // Tâches réalisées
    tasksPerformed: existingReport?.tasksPerformed || [''],
    
    // Résultats et recommandations
    results: existingReport?.results || '',
    recommendations: existingReport?.recommendations || [''],
    
    // Photos
    photosBefore: existingReport?.photosBefore || [],
    photosAfter: existingReport?.photosAfter || [],
    
    // Signatures
    technicianSignature: existingReport?.technicianSignature || null,
    clientSignature: existingReport?.clientSignature || null,
    clientTitle: existingReport?.clientTitle || '',
    
    // Métadonnées
    status: existingReport?.status || 'draft',
    reportId: existingReport?.reportId || `RPT-${Date.now()}`,
    createdAt: existingReport?.createdAt || new Date().toISOString(),
      gpsLocation: existingReport?.gpsLocation || null,

      // Structuration fiche enrichie
      issuesDetected: (existingReport?.issuesDetected as IssueForm[] | undefined) || [{
        reference: `ISS-${Date.now().toString().slice(-6)}`,
        component: '',
        location: '',
        description: '',
        severity: 'medium',
        impact: '',
        requiresQuote: false,
        recommendedSolution: '',
        estimatedCost: '',
        estimatedDurationHours: ''
      }],
      materialsUsed: (existingReport?.materialsUsed as MaterialForm[] | undefined) || [{
        name: '',
        quantity: 1,
        unitCost: '',
        unitPrice: '',
        supplierReference: ''
      }],
      followUpRecommendations: (existingReport?.followUpRecommendations as FollowUpForm[] | undefined) || [{
        title: '',
        description: '',
        priority: 'medium',
        requiresQuote: true,
        estimatedCost: '',
        estimatedDurationHours: '',
        recommendedDate: ''
      }],
      nextActions: (existingReport?.nextActions as NextActionForm[] | undefined) || [{
        title: '',
        scheduledDate: '',
        assignedTo: '',
        notes: '',
        status: 'pending'
      }],
      billingNeedsQuote: typeof existingReport?.billingNeedsQuote === 'boolean'
        ? existingReport.billingNeedsQuote
        : ((existingReport?.followUpRecommendations as FollowUpForm[] | undefined)?.some((rec) => rec.requiresQuote) ?? false)
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [createdReportId, setCreatedReportId] = useState<string | null>(null)

  // Géolocalisation automatique
  useEffect(() => {
    if (navigator.geolocation && !isReadOnly) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setCurrentLocation(location)
          setFormData(prev => ({ ...prev, gpsLocation: location }))
        },
        (error) => console.log('Géolocalisation non disponible:', error)
      )
    }
  }, [isReadOnly])

  // Calcul automatique de la durée
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}:00`)
      const end = new Date(`2000-01-01T${formData.endTime}:00`)
      const diff = end.getTime() - start.getTime()
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setFormData(prev => ({ 
          ...prev, 
          duration: `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` 
        }))
      }
    }
  }, [formData.startTime, formData.endTime])

    useEffect(() => {
      const requiresQuote = (formData.followUpRecommendations || []).some((rec) => rec.requiresQuote)
      if (requiresQuote !== formData.billingNeedsQuote) {
        setFormData(prev => ({ ...prev, billingNeedsQuote: requiresQuote }))
      }
    }, [formData.followUpRecommendations, formData.billingNeedsQuote])

  const updateField = (field: keyof MaintenanceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Effacer les erreurs de validation quand on modifie un champ
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      tasksPerformed: [...prev.tasksPerformed, '']
    }))
  }

  const updateTask = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      tasksPerformed: prev.tasksPerformed.map((task, i) => i === index ? value : task)
    }))
  }

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasksPerformed: prev.tasksPerformed.filter((_, i) => i !== index)
    }))
  }

    const addRecommendation = () => {
    setFormData(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, '']
    }))
  }

  const updateRecommendation = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.map((rec, i) => i === index ? value : rec)
    }))
  }

  const removeRecommendation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index)
    }))
  }

    const generateIssueReference = () => `ISS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const addIssue = () => {
      setFormData(prev => ({
        ...prev,
        issuesDetected: [
          ...prev.issuesDetected,
          {
            reference: generateIssueReference(),
            component: '',
            location: '',
            description: '',
            severity: 'medium' as const,
            impact: '',
            requiresQuote: false,
            recommendedSolution: '',
            estimatedCost: '',
            estimatedDurationHours: ''
          }
        ]
      }))
    }

    const updateIssue = <K extends keyof IssueForm>(index: number, field: K, value: IssueForm[K]) => {
      setFormData(prev => ({
        ...prev,
        issuesDetected: prev.issuesDetected.map((issue, i) =>
          i === index ? { ...issue, [field]: value } : issue
        )
      }))
    }

    const removeIssue = (index: number) => {
      setFormData(prev => ({
        ...prev,
        issuesDetected: prev.issuesDetected.filter((_, i) => i !== index)
      }))
    }

    const addMaterial = () => {
      setFormData(prev => ({
        ...prev,
        materialsUsed: [
          ...prev.materialsUsed,
          {
            name: '',
            quantity: 1,
            unitCost: '',
            unitPrice: '',
            supplierReference: ''
          }
        ]
      }))
    }

    const updateMaterial = (index: number, field: keyof MaterialForm, value: string | number) => {
      setFormData(prev => ({
        ...prev,
        materialsUsed: prev.materialsUsed.map((material, i) => {
          if (i !== index) return material
          if (field === 'quantity') {
            return { ...material, quantity: typeof value === 'number' ? value : Number(value) || 0 }
          }
          return { ...material, [field]: value }
        })
      }))
    }

    const removeMaterial = (index: number) => {
      setFormData(prev => ({
        ...prev,
        materialsUsed: prev.materialsUsed.filter((_, i) => i !== index)
      }))
    }

    const addFollowUp = () => {
      setFormData(prev => ({
        ...prev,
        followUpRecommendations: [
          ...prev.followUpRecommendations,
          {
            title: '',
            description: '',
            priority: 'medium',
            requiresQuote: true,
            estimatedCost: '',
            estimatedDurationHours: '',
            recommendedDate: ''
          }
        ]
      }))
    }

    const updateFollowUp = (index: number, field: keyof FollowUpForm, value: any) => {
      setFormData(prev => ({
        ...prev,
        followUpRecommendations: prev.followUpRecommendations.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }))
    }

    const removeFollowUp = (index: number) => {
      setFormData(prev => ({
        ...prev,
        followUpRecommendations: prev.followUpRecommendations.filter((_, i) => i !== index)
      }))
    }

    const addNextAction = () => {
      setFormData(prev => ({
        ...prev,
        nextActions: [
          ...prev.nextActions,
          {
            title: '',
            scheduledDate: '',
            assignedTo: '',
            notes: '',
            status: 'pending'
          }
        ]
      }))
    }

    const updateNextAction = (index: number, field: keyof NextActionForm, value: any) => {
      setFormData(prev => ({
        ...prev,
        nextActions: prev.nextActions.map((action, i) =>
          i === index ? { ...action, [field]: value } : action
        )
      }))
    }

    const removeNextAction = (index: number) => {
      setFormData(prev => ({
        ...prev,
        nextActions: prev.nextActions.filter((_, i) => i !== index)
      }))
    }

  const validateForm = (): boolean => {
    const errors: string[] = []

    if (!formData.site.trim()) errors.push('Le nom du site est requis')
    if (!formData.clientName.trim()) errors.push('Le nom du client est requis')
    if (!formData.initialObservations.trim()) errors.push('Les observations initiales sont requises')
    if (!formData.problemDescription.trim()) errors.push('La description du problème est requise')
    if (formData.tasksPerformed.every(task => !task.trim())) errors.push('Au moins une tâche réalisée doit être décrite')
    if (!formData.results.trim()) errors.push('Les résultats de l\'intervention sont requis')

      formData.issuesDetected.forEach((issue, index) => {
        if (issue.requiresQuote && !issue.recommendedSolution.trim()) {
          errors.push(`Décrivez la solution recommandée pour le problème n°${index + 1}`)
        }
      })

      formData.followUpRecommendations.forEach((rec, index) => {
        if (rec.requiresQuote && !(rec.estimatedCost && Number(rec.estimatedCost) > 0)) {
          errors.push(`Ajoutez un chiffrage estimatif pour la recommandation ${index + 1}`)
        }
      })

      const hasUrgentFollowUp = formData.followUpRecommendations.some((rec) => rec.priority === 'urgent')
      const hasPlannedAction = formData.nextActions.some((action) => ['pending', 'scheduled'].includes(action.status) && action.title.trim())
      if (hasUrgentFollowUp && !hasPlannedAction) {
        errors.push('Planifiez au moins une action de suivi pour les recommandations urgentes')
      }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSave = async (): Promise<string | null> => {
    if (!validateForm()) return null

    setIsGenerating(true)
    try {
      const payload: any = {
        site: formData.site,
        interventionDate: formData.interventionDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        initialObservations: formData.initialObservations,
        problemDescription: formData.problemDescription,
        problemSeverity: formData.problemSeverity,
        tasksPerformed: (formData.tasksPerformed || []).filter(Boolean),
        results: formData.results,
        recommendations: (formData.recommendations || []).filter(Boolean),
          issuesDetected: (formData.issuesDetected || [])
            .filter(issue => issue.component.trim() && issue.description.trim())
            .map(issue => ({
              reference: issue.reference,
              component: issue.component.trim(),
              location: issue.location.trim() || undefined,
              description: issue.description.trim(),
              severity: issue.severity,
              impact: issue.impact.trim() || undefined,
              requiresQuote: issue.requiresQuote,
              recommendedSolution: issue.recommendedSolution.trim() || undefined,
              estimatedCost: issue.estimatedCost ? Number(issue.estimatedCost) : undefined,
              estimatedDurationHours: issue.estimatedDurationHours ? Number(issue.estimatedDurationHours) : undefined
            })),
          materialsUsed: (formData.materialsUsed || [])
            .filter(material => material.name.trim())
            .map(material => ({
              name: material.name.trim(),
              quantity: material.quantity || 0,
              unitCost: material.unitCost ? Number(material.unitCost) : undefined,
              unitPrice: material.unitPrice ? Number(material.unitPrice) : undefined,
              supplierReference: material.supplierReference?.trim() || undefined
            })),
          followUpRecommendations: (formData.followUpRecommendations || [])
            .filter(rec => rec.title.trim())
            .map(rec => ({
              title: rec.title.trim(),
              description: rec.description.trim() || undefined,
              priority: rec.priority,
              requiresQuote: rec.requiresQuote,
              estimatedCost: rec.estimatedCost ? Number(rec.estimatedCost) : undefined,
              estimatedDurationHours: rec.estimatedDurationHours ? Number(rec.estimatedDurationHours) : undefined,
              recommendedDate: rec.recommendedDate ? new Date(rec.recommendedDate).toISOString() : undefined
            })),
          nextActions: (formData.nextActions || [])
            .filter(action => action.title.trim())
            .map(action => ({
              title: action.title.trim(),
              scheduledDate: action.scheduledDate ? new Date(action.scheduledDate).toISOString() : undefined,
              assignedTo: action.assignedTo?.trim() || undefined,
              notes: action.notes?.trim() || undefined,
              status: action.status
            })),
          billing: {
            needsQuote: formData.billingNeedsQuote
          },
        interventionType: 'maintenance',
        templateId: 'manual',
        templateVersion: '1.0',
        technician: formData.technician,
        projectId,
        technicianSignature: formData.technicianSignature,
        clientSignature: formData.clientSignature,
        clientTitle: formData.clientTitle,
        gpsLocation: formData.gpsLocation,
        status: 'draft'
      }

      const res = await fetch('/api/maintenance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass-csrf': 'true' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Echec de la création du rapport')
      }

      const j = await res.json()
      const id = String(j?.report?._id || j?.report?.id || '')
      if (id) {
        setCreatedReportId(id)
      }

      const dataToSave = { ...formData, status: 'draft' as const }
      onSave?.(dataToSave)
      alert('Rapport sauvegardé avec succès!')
      return id || null
    } catch (error: any) {
      alert(error?.message || 'Erreur lors de la sauvegarde')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsGenerating(true)
    try {
      let id = createdReportId
      if (!id) {
        id = await handleSave()
        if (!id) throw new Error('Création du rapport échouée')
      }

      const submitRes = await fetch('/api/maintenance/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass-csrf': 'true' },
        credentials: 'include',
        body: JSON.stringify({
          reportId: id,
          finalChecks: {
            hasPhotosBefore: (formData.photosBefore || []).length > 0,
            hasPhotosAfter: (formData.photosAfter || []).length > 0,
            hasTechnicianSignature: !!formData.technicianSignature
          }
        })
      })

      if (!submitRes.ok) {
        const j = await submitRes.json().catch(() => ({}))
        throw new Error(j?.error || 'Echec de la soumission')
      }

      const dataToSubmit = { ...formData, status: 'completed' as const }
      onSubmit?.(dataToSubmit)
      alert('Rapport envoyé pour validation!')
    } catch (error: any) {
      alert(error?.message || 'Erreur lors de l\'envoi')
    } finally {
      setIsGenerating(false)
    }
  }

  const severityConfig = {
    low: { color: 'text-green-600', bg: 'bg-green-50', label: '🟢 Faible - Maintenance préventive' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: '🟡 Moyen - Problème mineur' },
    high: { color: 'text-orange-600', bg: 'bg-orange-50', label: '🟠 Élevé - Problème majeur' },
    critical: { color: 'text-red-600', bg: 'bg-red-50', label: '🔴 Critique - Système compromis' }
  }

  const uploadPhotos = async (files: File[], type: 'before' | 'after') => {
    const uploaded: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const j = await res.json()
        uploaded.push(j.url)
      }
    }
    return uploaded
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              📋 Rapport de Maintenance Digitalisé
            </h1>
            <p className="text-blue-100">
              Rapport #{formData.reportId} - {formData.status === 'draft' ? 'Brouillon' : 'Finalisé'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Créé le</div>
            <div className="font-medium">{new Date(formData.createdAt).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
      </div>

      {/* Erreurs de validation */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="font-semibold text-red-800">Champs requis manquants</h3>
          </div>
          <ul className="list-disc list-inside text-red-700 text-sm">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Informations générales */}
      <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2 text-blue-600" />
          Informations Générales
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site d'intervention *
            </label>
            <input
              type="text"
              value={formData.site}
              onChange={(e) => updateField('site', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du site ou adresse"
              disabled={isReadOnly}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du client *
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => updateField('clientName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du client"
              disabled={isReadOnly}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact client
            </label>
            <input
              type="text"
              value={formData.clientContact}
              onChange={(e) => updateField('clientContact', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Téléphone ou email"
              disabled={isReadOnly}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date d'intervention
            </label>
            <input
              type="date"
              value={formData.interventionDate}
              onChange={(e) => updateField('interventionDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isReadOnly}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure de début
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => updateField('startTime', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isReadOnly}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure de fin
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => updateField('endTime', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isReadOnly}
            />
          </div>
        </div>
        
        {formData.duration && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Durée d'intervention: {formData.duration}</span>
            </div>
          </div>
        )}
      </section>

      {/* Observations et diagnostic */}
      <section className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
        <h2 className="text-xl font-semibold text-yellow-900 mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          Observations & Diagnostic
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observations initiales *
            </label>
            <textarea
              value={formData.initialObservations}
              onChange={(e) => updateField('initialObservations', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Description de l'état initial du système..."
              disabled={isReadOnly}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description détaillée du problème *
            </label>
            <textarea
              value={formData.problemDescription}
              onChange={(e) => updateField('problemDescription', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez précisément le problème rencontré, les symptômes, les causes identifiées..."
              disabled={isReadOnly}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niveau de gravité
            </label>
            <select
              value={formData.problemSeverity}
              onChange={(e) => updateField('problemSeverity', e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isReadOnly}
            >
              {Object.entries(severityConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <div className={`mt-2 p-2 rounded ${severityConfig[formData.problemSeverity].bg}`}>
              <span className={`text-sm font-medium ${severityConfig[formData.problemSeverity].color}`}>
                Niveau sélectionné: {severityConfig[formData.problemSeverity].label}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tâches réalisées */}
      <section className="bg-green-50 rounded-xl p-6 border border-green-200">
        <h2 className="text-xl font-semibold text-green-900 mb-4 flex items-center">
          <Wrench className="h-5 w-5 mr-2" />
          Tâches Réalisées *
        </h2>
        
        <div className="space-y-3">
          {formData.tasksPerformed.map((task, index) => (
            <div key={index} className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <input
                type="text"
                value={task}
                onChange={(e) => updateTask(index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez la tâche réalisée..."
                disabled={isReadOnly}
              />
              {!isReadOnly && formData.tasksPerformed.length > 1 && (
                <button
                  onClick={() => removeTask(index)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          
          {!isReadOnly && (
            <button
              onClick={addTask}
              className="flex items-center space-x-2 text-green-600 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter une tâche</span>
            </button>
          )}
        </div>
      </section>

      {/* Photos avant / après */}
      <section className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <ImageIcon className="h-5 w-5 mr-2 text-purple-600" />
          Photos Avant / Après
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avant intervention</label>
            <input type="file" multiple accept="image/*" disabled={isReadOnly}
              onChange={async (e)=>{
                const files = Array.from(e.target.files || [])
                const urls = await uploadPhotos(files as File[], 'before')
                setFormData(prev=>({ ...prev, photosBefore: files as File[] }))
                console.log('Uploaded before:', urls)
              }}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Après intervention</label>
            <input type="file" multiple accept="image/*" disabled={isReadOnly}
              onChange={async (e)=>{
                const files = Array.from(e.target.files || [])
                const urls = await uploadPhotos(files as File[], 'after')
                setFormData(prev=>({ ...prev, photosAfter: files as File[] }))
                console.log('Uploaded after:', urls)
              }}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
          </div>
        </div>
      </section>

      {/* Résultats et recommandations */}
      <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2" />
          Résultats & Recommandations
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Résultats de l'intervention *
            </label>
            <textarea
              value={formData.results}
              onChange={(e) => updateField('results', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez les résultats obtenus, l'état final du système..."
              disabled={isReadOnly}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recommandations
            </label>
            <div className="space-y-2">
              {formData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <ArrowRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <input
                    type="text"
                    value={recommendation}
                    onChange={(e) => updateRecommendation(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Recommandation pour le client..."
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && formData.recommendations.length > 1 && (
                    <button
                      onClick={() => removeRecommendation(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              
              {!isReadOnly && (
                <button
                  onClick={addRecommendation}
                  className="flex items-center space-x-2 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter une recommandation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

        {/* Problèmes détectés & risques */}
        <section className="bg-white rounded-xl p-6 border border-red-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-red-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Problèmes détectés & risques
            </h2>
            {!isReadOnly && (
              <button
                onClick={addIssue}
                className="flex items-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un problème</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {formData.issuesDetected.map((issue, index) => (
              <div key={issue.reference || index} className="border border-red-100 rounded-lg p-4 space-y-4 bg-red-50/40">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Composant concerné
                    </label>
                    <input
                      type="text"
                      value={issue.component}
                      onChange={(e) => updateIssue(index, 'component', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      placeholder="Ex: Caméra C-07"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Localisation</label>
                    <input
                      type="text"
                      value={issue.location}
                      onChange={(e) => updateIssue(index, 'location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      placeholder="Site, étage, zone..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sévérité</label>
                    <select
                      value={issue.severity}
                      onChange={(e) => updateIssue(index, 'severity', e.target.value as IssueForm['severity'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      disabled={isReadOnly}
                    >
                      <option value="low">Faible</option>
                      <option value="medium">Moyen</option>
                      <option value="high">Élevé</option>
                      <option value="critical">Critique</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description du problème</label>
                    <textarea
                      value={issue.description}
                      onChange={(e) => updateIssue(index, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      placeholder="Décrivez précisément le dysfonctionnement"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Impact / Commentaires</label>
                    <textarea
                      value={issue.impact}
                      onChange={(e) => updateIssue(index, 'impact', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      placeholder="Impact sur l'exploitation, risques associés..."
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Solution recommandée
                    </label>
                    <textarea
                      value={issue.recommendedSolution}
                      onChange={(e) => updateIssue(index, 'recommendedSolution', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      placeholder="Action corrective proposée"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Chiffrage (CFA)</label>
                    <input
                      type="number"
                      value={issue.estimatedCost}
                      onChange={(e) => updateIssue(index, 'estimatedCost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      placeholder="Coût estimé"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      value={issue.estimatedDurationHours}
                      onChange={(e) => updateIssue(index, 'estimatedDurationHours', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
                      placeholder="Durée (heures)"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm font-medium text-red-800">
                    <input
                      type="checkbox"
                      checked={issue.requiresQuote}
                      onChange={(e) => updateIssue(index, 'requiresQuote', e.target.checked)}
                      className="rounded border-red-300 text-red-600 focus:ring-red-500"
                      disabled={isReadOnly}
                    />
                    <span>Inclure dans le devis correctif</span>
                  </label>
                  {!isReadOnly && formData.issuesDetected.length > 1 && (
                    <button
                      onClick={() => removeIssue(index)}
                      className="text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center space-x-1 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Matériels utilisés */}
        <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-600" />
              Matériels utilisés / Pièces remplacées
            </h2>
            {!isReadOnly && (
              <button
                onClick={addMaterial}
                className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un matériel</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {formData.materialsUsed.map((material, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Libellé</label>
                    <input
                      type="text"
                      value={material.name}
                      onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Caméra dôme 4K, câble coax..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                    <input
                      type="number"
                      min={0}
                      value={material.quantity}
                      onChange={(e) => updateMaterial(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Coût (CFA)</label>
                    <input
                      type="number"
                      value={material.unitCost}
                      onChange={(e) => updateMaterial(index, 'unitCost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="60000"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tarif refacturé</label>
                    <input
                      type="number"
                      value={material.unitPrice}
                      onChange={(e) => updateMaterial(index, 'unitPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="75000"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <input
                    type="text"
                    value={material.supplierReference}
                    onChange={(e) => updateMaterial(index, 'supplierReference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Référence fournisseur / série"
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && formData.materialsUsed.length > 1 && (
                    <button
                      onClick={() => removeMaterial(index)}
                      className="ml-3 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center space-x-1 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommandations chiffrées */}
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-900 flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Recommandations chiffrées & devis
            </h2>
            {!isReadOnly && (
              <button
                onClick={addFollowUp}
                className="flex items-center space-x-2 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter une recommandation</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {formData.followUpRecommendations.map((rec, index) => (
              <div key={index} className="border border-blue-100 rounded-lg p-4 bg-white space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recommandation</label>
                    <input
                      type="text"
                      value={rec.title}
                      onChange={(e) => updateFollowUp(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Remplacement caméra, upgrade NVR..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                    <select
                      value={rec.priority}
                      onChange={(e) => updateFollowUp(index, 'priority', e.target.value as FollowUpForm['priority'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={isReadOnly}
                    >
                      <option value="low">Faible</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Élevée</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Échéance cible</label>
                    <input
                      type="date"
                      value={rec.recommendedDate || ''}
                      onChange={(e) => updateFollowUp(index, 'recommendedDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <textarea
                  value={rec.description}
                  onChange={(e) => updateFollowUp(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Détails complémentaires, conditions, dépendances..."
                  disabled={isReadOnly}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant estimé (CFA)</label>
                    <input
                      type="number"
                      value={rec.estimatedCost}
                      onChange={(e) => updateFollowUp(index, 'estimatedCost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="125000"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temps estimé (heures)</label>
                    <input
                      type="number"
                      value={rec.estimatedDurationHours}
                      onChange={(e) => updateFollowUp(index, 'estimatedDurationHours', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="3"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-blue-900">
                      <input
                        type="checkbox"
                        checked={rec.requiresQuote}
                        onChange={(e) => updateFollowUp(index, 'requiresQuote', e.target.checked)}
                        className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                        disabled={isReadOnly}
                      />
                      <span>Inclure dans le calcul du devis</span>
                    </label>
                    {!isReadOnly && formData.followUpRecommendations.length > 1 && (
                      <button
                        onClick={() => removeFollowUp(index)}
                        className="text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center space-x-1 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actions de suivi */}
        <section className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-emerald-900 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Actions de suivi planifiées
            </h2>
            {!isReadOnly && (
              <button
                onClick={addNextAction}
                className="flex items-center space-x-2 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter une action</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {formData.nextActions.map((action, index) => (
              <div key={index} className="border border-emerald-100 rounded-lg p-4 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action à réaliser</label>
                    <input
                      type="text"
                      value={action.title}
                      onChange={(e) => updateNextAction(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Planification visite corrective, validation devis..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date cible</label>
                    <input
                      type="date"
                      value={action.scheduledDate || ''}
                      onChange={(e) => updateNextAction(index, 'scheduledDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select
                      value={action.status}
                      onChange={(e) => updateNextAction(index, 'status', e.target.value as NextActionForm['status'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      disabled={isReadOnly}
                    >
                      <option value="pending">À planifier</option>
                      <option value="scheduled">Planifiée</option>
                      <option value="completed">Réalisée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={action.assignedTo}
                    onChange={(e) => updateNextAction(index, 'assignedTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Technicien ou équipe assignée"
                    disabled={isReadOnly}
                  />
                  <input
                    type="text"
                    value={action.notes}
                    onChange={(e) => updateNextAction(index, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Notes complémentaires"
                    disabled={isReadOnly}
                  />
                </div>
                {!isReadOnly && formData.nextActions.length > 1 && (
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => removeNextAction(index)}
                      className="text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center space-x-1 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Synthèse devis / facturation */}
        <section className="bg-white rounded-xl p-6 border border-purple-200 shadow-sm">
          <h2 className="text-xl font-semibold text-purple-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Synthèse devis & facturation
          </h2>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600">
                Activez cette option pour signaler à l'administration qu'un devis doit être généré à partir des recommandations.
              </p>
              <div className="mt-2 text-sm text-gray-700">
                <span className="font-semibold text-purple-900">{formData.followUpRecommendations.filter((rec) => rec.requiresQuote).length}</span> recommandation(s) nécessite(nt) un devis.
              </div>
            </div>
            <label className="inline-flex items-center space-x-2 bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg">
              <input
                type="checkbox"
                checked={formData.billingNeedsQuote}
                onChange={(e) => updateField('billingNeedsQuote', e.target.checked)}
                className="rounded border-purple-400 text-purple-600 focus:ring-purple-500"
                disabled={isReadOnly}
              />
              <span className="text-purple-900 font-medium">Signaler "Devis requis"</span>
            </label>
          </div>
        </section>

      {/* Informations client pour signature */}
      <section className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Validation Client
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre/Fonction du client
            </label>
            <input
              type="text"
              value={formData.clientTitle}
              onChange={(e) => updateField('clientTitle', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Responsable technique"
              disabled={isReadOnly}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button
            onClick={handleSave}
            disabled={isGenerating}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            <Save className="h-5 w-5 mr-2" />
            Sauvegarder le brouillon
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Traitement...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Finaliser et envoyer
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Informations sur la localisation */}
      {currentLocation && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-800 text-sm">
              Position GPS enregistrée: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}