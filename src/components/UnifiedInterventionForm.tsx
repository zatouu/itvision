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
  Upload,
  Signature,
  Eye,
  Calendar,
  Wrench,
  X,
  Plus,
  Building,
  Phone,
  Package
} from 'lucide-react'

type Recommendation = {
  produit: string
  quantite: number
  commentaire?: string
}

type Project = {
  _id: string
  name: string
  address: string
}

type Client = {
  _id: string
  name: string
  email?: string
}

type Product = {
  _id: string
  name: string
  price?: number
}

interface UnifiedInterventionFormProps {
  onSuccess?: () => void
  projectId?: string
}

export default function UnifiedInterventionForm({ onSuccess, projectId }: UnifiedInterventionFormProps = {}) {
  const [formData, setFormData] = useState({
    site: '',
    clientId: '',
    clientName: '',
    clientContact: '',
    interventionDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endTime: '',
    typeIntervention: 'maintenance' as 'urgence' | 'maintenance' | 'installation' | 'autre',
    initialObservations: '',
    problemDescription: '',
    problemSeverity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    tasksPerformed: [''],
    results: '',
    recommendations: [] as Recommendation[],
    observations: ''
  })
  
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [technicianId, setTechnicianId] = useState<string>('')
  const [technicianName, setTechnicianName] = useState<string>('')
  
  const [photosBefore, setPhotosBefore] = useState<File[]>([])
  const [photosAfter, setPhotosAfter] = useState<File[]>([])
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null)
  const [clientSignature, setClientSignature] = useState<string | null>(null)
  const [clientTitle, setClientTitle] = useState('')
  const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number } | null>(null)
  
  const [newRec, setNewRec] = useState({ produit: '', quantite: 1, commentaire: '' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [createdReportId, setCreatedReportId] = useState<string | null>(null)
  
  // Mode création client
  const [clientMode, setClientMode] = useState<'select' | 'create'>('select')
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' })
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const clientSignatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isClientDrawing, setIsClientDrawing] = useState(false)

  // Charger les données initiales
  useEffect(() => {
    ;(async () => {
      try {
        const [pRes, cRes, prodRes, authRes] = await Promise.all([
          fetch('/api/projects?status=all&limit=200', { credentials: 'include' }),
          fetch('/api/clients?limit=200', { credentials: 'include' }),
          fetch('/api/products?limit=500', { credentials: 'include' }),
          fetch('/api/auth/login', { credentials: 'include' })
        ])
        
        if (pRes.ok) {
          const j = await pRes.json()
          setProjects(j.projects || [])
        }
        
        if (cRes.ok) {
          const j = await cRes.json()
          setClients((j.clients || []).map((c: any) => ({ 
            _id: c.id || c._id, 
            name: c.name || c.entreprise || c.company || c.username || 'Client', 
            email: c.email,
            phone: c.phone
          })))
        }
        
        if (prodRes.ok) {
          const j = await prodRes.json()
          setProducts(j.items || [])
        }
        
        if (authRes.ok) {
          const j = await authRes.json()
          setTechnicianId(j.user?.id || '')
          setTechnicianName(j.user?.name || j.user?.email || 'Technicien')
        }
      } catch {}
    })()
  }, [])

  // Géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        () => {}
      )
    }
  }, [])

  // Calculer durée
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const [h1, m1] = formData.startTime.split(':').map(Number)
      const [h2, m2] = formData.endTime.split(':').map(Number)
      const d1 = h1 * 60 + m1
      const d2 = h2 * 60 + m2
      const diff = d2 > d1 ? d2 - d1 : (24 * 60) - d1 + d2
      const hours = Math.floor(diff / 60)
      const minutes = diff % 60
      // Stocker la durée calculée (pour l'API)
    }
  }, [formData.startTime, formData.endTime])

  // Auto-remplir client depuis projet
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => String(p._id) === projectId)
      if (project) {
        setFormData(prev => ({ ...prev, site: project.address }))
      }
    }
  }, [projectId, projects])

  // Auto-remplir client depuis clientId
  useEffect(() => {
    if (formData.clientId && clients.length > 0) {
      const client = clients.find(c => String(c._id) === formData.clientId)
      if (client) {
        setFormData(prev => ({ ...prev, clientName: client.name, clientContact: client.email || '' }))
      }
    }
  }, [formData.clientId, clients])

  // Créer un nouveau client
  const handleCreateClient = async () => {
    if (!newClient.name.trim()) {
      alert('Le nom du client est requis')
      return
    }
    
    setIsCreatingClient(true)
    try {
      // Générer un email temporaire si non fourni
      const email = newClient.email.trim() || `${newClient.name.toLowerCase().replace(/\s+/g, '.')}@client.temp`
      const phone = newClient.phone.trim() || '000000000'
      
      // Utiliser l'API admin/clients qui gère les nouveaux clients
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'Particulier', // Par défaut particulier pour création rapide
          name: newClient.name.trim(),
          email: email,
          phone: phone,
          address: '',
          ville: '',
          pays: 'Sénégal'
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur création client')
      }

      const result = await res.json()
      const client = result.client
      const createdClient = {
        _id: client.id || client._id,
        id: client.id || client._id,
        name: client.name || client.entreprise || newClient.name.trim(),
        email: client.email,
        phone: client.phone
      }

      // Ajouter à la liste et sélectionner
      setClients([...clients, createdClient])
      setFormData(prev => ({
        ...prev,
        clientId: createdClient._id,
        clientName: createdClient.name,
        clientContact: createdClient.email || newClient.phone
      }))
      
      // Réinitialiser le formulaire
      setNewClient({ name: '', email: '', phone: '' })
      setClientMode('select')
      alert('Client créé avec succès !')
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setIsCreatingClient(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTask = () => {
    setFormData(prev => ({ ...prev, tasksPerformed: [...prev.tasksPerformed, ''] }))
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
    if (!newRec.produit.trim()) return
    setFormData(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, { ...newRec }]
    }))
    setNewRec({ produit: '', quantite: 1, commentaire: '' })
  }

  const removeRecommendation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): boolean => {
    const errors: string[] = []
    if (!formData.site.trim()) errors.push('Le site est requis')
    if (clientMode === 'select' && !formData.clientId) {
      errors.push('Vous devez sélectionner un client ou créer un nouveau client')
    }
    if (clientMode === 'create' && !newClient.name.trim()) {
      errors.push('Vous devez créer un client ou sélectionner un client existant')
    }
    if (!formData.initialObservations.trim()) errors.push('Les observations initiales sont requises')
    if (!formData.problemDescription.trim()) errors.push('La description du problème est requise')
    if (formData.tasksPerformed.every(task => !task.trim())) errors.push('Au moins une tâche réalisée est requise')
    if (!formData.results.trim()) errors.push('Les résultats sont requis')
    if (photosBefore.length === 0) errors.push('Au moins une photo avant est requise')
    if (photosAfter.length === 0) errors.push('Au moins une photo après est requise')
    setValidationErrors(errors)
    return errors.length === 0
  }

  const uploadPhotos = async (files: File[], type: 'before' | 'after') => {
    const uploaded: Array<{ url: string, timestamp?: Date, gps?: { lat: number, lng: number } }> = []
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type === 'before' ? 'interventions/avant' : 'interventions/apres')
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const j = await res.json()
          if (j.url) {
            uploaded.push({
              url: j.url,
              timestamp: new Date(),
              gps: gpsLocation || undefined
            })
          }
        }
      } catch {}
    }
    return uploaded
  }

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>, isClient: boolean = false) => {
    const canvas = isClient ? clientSignatureCanvasRef.current : signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    if (isClient) setIsClientDrawing(true)
    else setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>, isClient: boolean = false) => {
    if (!((isClient && isClientDrawing) || (!isClient && isDrawing))) return
    const canvas = isClient ? clientSignatureCanvasRef.current : signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = (isClient: boolean = false) => {
    if (isClient) setIsClientDrawing(false)
    else setIsDrawing(false)
  }

  const saveSignature = (isClient: boolean = false) => {
    const canvas = isClient ? clientSignatureCanvasRef.current : signatureCanvasRef.current
    if (!canvas) return
    const signature = canvas.toDataURL()
    if (isClient) setClientSignature(signature)
    else setTechnicianSignature(signature)
  }

  const clearSignature = (isClient: boolean = false) => {
    const canvas = isClient ? clientSignatureCanvasRef.current : signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (isClient) setClientSignature(null)
    else setTechnicianSignature(null)
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setIsGenerating(true)
    try {
      const [avantUrls, apresUrls] = await Promise.all([
        uploadPhotos(photosBefore, 'before'),
        uploadPhotos(photosAfter, 'after')
      ])

      const payload = {
        technicienId: technicianId,
        clientId: formData.clientId,
        projectId: projectId || formData.site ? undefined : undefined,
        date: formData.interventionDate,
        heureDebut: formData.startTime,
        heureFin: formData.endTime,
        typeIntervention: formData.typeIntervention,
        site: formData.site,
        description: formData.problemDescription,
        activites: formData.tasksPerformed.filter(Boolean).join('\n'),
        observations: `${formData.initialObservations}\n\n${formData.observations}`,
        recommandations: formData.recommendations,
        photosAvant: avantUrls,
        photosApres: apresUrls,
        signatures: {
          technician: technicianSignature ? {
            signature: technicianSignature,
            name: technicianName,
            timestamp: new Date()
          } : undefined,
          client: clientSignature ? {
            signature: clientSignature,
            name: formData.clientName,
            title: clientTitle,
            timestamp: new Date()
          } : undefined
        },
        gpsLocation: gpsLocation ? {
          ...gpsLocation,
          timestamp: new Date()
        } : undefined,
        status: 'brouillon',
        priority: formData.problemSeverity
      }

      const res = await fetch('/api/interventions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur sauvegarde')
      }

      const result = await res.json()
      setCreatedReportId(result.intervention?.id || null)
      alert('Rapport sauvegardé en brouillon !')
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    if (!technicianSignature) {
      alert('La signature du technicien est requise pour soumettre')
      return
    }
    
    setIsGenerating(true)
    try {
      const [avantUrls, apresUrls] = await Promise.all([
        uploadPhotos(photosBefore, 'before'),
        uploadPhotos(photosAfter, 'after')
      ])

      const payload = {
        technicienId: technicianId,
        clientId: formData.clientId,
        projectId: projectId || undefined,
        date: formData.interventionDate,
        heureDebut: formData.startTime,
        heureFin: formData.endTime,
        typeIntervention: formData.typeIntervention,
        site: formData.site,
        description: formData.problemDescription,
        activites: formData.tasksPerformed.filter(Boolean).join('\n'),
        observations: `${formData.initialObservations}\n\n${formData.observations}`,
        recommandations: formData.recommendations,
        photosAvant: avantUrls,
        photosApres: apresUrls,
        signatures: {
          technician: technicianSignature ? {
            signature: technicianSignature,
            name: technicianName,
            timestamp: new Date()
          } : undefined,
          client: clientSignature ? {
            signature: clientSignature,
            name: formData.clientName,
            title: clientTitle,
            timestamp: new Date()
          } : undefined
        },
        gpsLocation: gpsLocation ? {
          ...gpsLocation,
          timestamp: new Date()
        } : undefined,
        status: 'soumis',
        priority: formData.problemSeverity
      }

      const res = await fetch('/api/interventions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur soumission')
      }

      const result = await res.json()
      const hasRecommendations = formData.recommendations && formData.recommendations.length > 0
      
      let message = 'Intervention soumise avec succès !'
      if (hasRecommendations && result.quote) {
        message = `Intervention soumise avec succès !\n\n✅ Devis automatique généré : ${result.quote.totalTTC.toLocaleString('fr-FR')} Fcfa (${result.quote.productsCount} produit(s))\n\nL'admin pourra réviser et envoyer le devis au client.`
      } else if (hasRecommendations && !result.quote) {
        message = 'Intervention soumise avec succès !\n\n⚠️ Certains produits recommandés ne sont pas dans le catalogue. L\'admin devra créer le devis manuellement.'
      }
      
      alert(message)
      onSuccess?.()
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Initialiser le canvas pour les signatures
  useEffect(() => {
    const initCanvas = (canvas: HTMLCanvasElement | null, isClient: boolean = false) => {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    
    initCanvas(signatureCanvasRef.current)
    initCanvas(clientSignatureCanvasRef.current, true)
  }, [])

  const severityConfig = {
    low: { color: 'text-green-600', bg: 'bg-green-50', label: '🟢 Faible' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: '🟡 Moyen' },
    high: { color: 'text-orange-600', bg: 'bg-orange-50', label: '🟠 Élevé' },
    critical: { color: 'text-red-600', bg: 'bg-red-50', label: '🔴 Critique' }
  }

  const duration = formData.startTime && formData.endTime ? (() => {
    const [h1, m1] = formData.startTime.split(':').map(Number)
    const [h2, m2] = formData.endTime.split(':').map(Number)
    const d1 = h1 * 60 + m1
    const d2 = h2 * 60 + m2
    const diff = d2 > d1 ? d2 - d1 : (24 * 60) - d1 + d2
    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    return `${hours}h${minutes > 0 ? minutes : ''}`
  })() : null

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Erreurs de validation */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="font-semibold text-red-900">Erreurs de validation</h3>
          </div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Informations générales */}
      <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2 text-blue-600" />
          Informations Générales
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site d'intervention *
            </label>
            <input
              type="text"
              value={formData.site}
              onChange={(e) => updateField('site', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du site ou adresse"
              required
            />
          </div>
          
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client *
            </label>
            
            {/* Toggle entre sélection et création */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setClientMode('select')}
                className={`px-3 py-1 text-xs sm:text-sm rounded-lg transition-colors ${
                  clientMode === 'select'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sélectionner
              </button>
              <button
                type="button"
                onClick={() => setClientMode('create')}
                className={`px-3 py-1 text-xs sm:text-sm rounded-lg transition-colors ${
                  clientMode === 'create'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Créer un nouveau
              </button>
            </div>

            {clientMode === 'select' ? (
              <select
                value={formData.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{clients.length === 0 ? 'Aucun client disponible - Utilisez "Créer un nouveau"' : 'Sélectionner un client'}</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name} {c.email && `(${c.email})`}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-3 bg-green-50 p-4 rounded-lg border border-green-200">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nom du client *
                  </label>
                  <input
                    type="text"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="Nom complet ou entreprise"
                    className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Email (optionnel)
                    </label>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Téléphone (optionnel)
                    </label>
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="+221 XX XXX XX XX"
                      className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateClient}
                  disabled={isCreatingClient || !newClient.name.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  {isCreatingClient ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Créer le client
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-600 mt-1">
                  Le client sera créé et automatiquement sélectionné
                </p>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact client
            </label>
            <input
              type="text"
              value={formData.clientContact}
              onChange={(e) => updateField('clientContact', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Téléphone ou email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date d'intervention *
            </label>
            <input
              type="date"
              value={formData.interventionDate}
              onChange={(e) => updateField('interventionDate', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'intervention *
            </label>
            <select
              value={formData.typeIntervention}
              onChange={(e) => updateField('typeIntervention', e.target.value as any)}
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="maintenance">Maintenance</option>
              <option value="urgence">Urgence</option>
              <option value="installation">Installation</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure de début *
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => updateField('startTime', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure de fin *
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => updateField('endTime', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        {duration && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Durée: {duration}</span>
            </div>
          </div>
        )}
      </section>

      {/* Observations et diagnostic */}
      <section className="bg-yellow-50 rounded-xl p-4 sm:p-6 border border-yellow-200">
        <h2 className="text-lg sm:text-xl font-semibold text-yellow-900 mb-4 flex items-center">
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
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Description de l'état initial..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description du problème *
            </label>
            <textarea
              value={formData.problemDescription}
              onChange={(e) => updateField('problemDescription', e.target.value)}
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez précisément le problème..."
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
              className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(severityConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <div className={`mt-2 p-2 rounded ${severityConfig[formData.problemSeverity].bg}`}>
              <span className={`text-sm font-medium ${severityConfig[formData.problemSeverity].color}`}>
                {severityConfig[formData.problemSeverity].label}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tâches réalisées */}
      <section className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-200">
        <h2 className="text-lg sm:text-xl font-semibold text-green-900 mb-4 flex items-center">
          <Wrench className="h-5 w-5 mr-2" />
          Tâches Réalisées *
        </h2>
        
        <div className="space-y-3">
          {formData.tasksPerformed.map((task, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <input
                type="text"
                value={task}
                onChange={(e) => updateTask(index, e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez la tâche..."
              />
              {formData.tasksPerformed.length > 1 && (
                <button
                  onClick={() => removeTask(index)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={addTask}
            className="flex items-center gap-2 text-green-600 hover:bg-green-100 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter une tâche</span>
          </button>
        </div>
      </section>

      {/* Résultats */}
      <section className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
        <h2 className="text-lg sm:text-xl font-semibold text-blue-900 mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Résultats de l'Intervention *
        </h2>
        
        <textarea
          value={formData.results}
          onChange={(e) => updateField('results', e.target.value)}
          rows={4}
          className="w-full px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Décrivez les résultats de l'intervention..."
          required
        />
      </section>

      {/* Recommandations */}
      <section className="bg-purple-50 rounded-xl p-4 sm:p-6 border border-purple-200">
        <h2 className="text-lg sm:text-xl font-semibold text-purple-900 mb-4 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Recommandations (Produits/Services)
        </h2>
        
        <div className="space-y-3 mb-4">
          {formData.recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200 flex items-center gap-2">
              <div className="flex-1">
                <div className="font-medium text-sm">{rec.produit}</div>
                <div className="text-xs text-gray-600">Qté: {rec.quantite} {rec.commentaire && `• ${rec.commentaire}`}</div>
              </div>
              <button
                onClick={() => removeRecommendation(idx)}
                className="p-1 text-red-600 hover:bg-red-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newRec.produit}
            onChange={(e) => setNewRec({ ...newRec, produit: e.target.value })}
            placeholder="Nom du produit"
            className="flex-1 px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg"
            list="products-list"
          />
          <datalist id="products-list">
            {products.map(p => <option key={p._id} value={p.name} />)}
          </datalist>
          <input
            type="number"
            min="1"
            value={newRec.quantite}
            onChange={(e) => setNewRec({ ...newRec, quantite: Number(e.target.value) || 1 })}
            placeholder="Qté"
            className="w-20 px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            value={newRec.commentaire}
            onChange={(e) => setNewRec({ ...newRec, commentaire: e.target.value })}
            placeholder="Commentaire (optionnel)"
            className="flex-1 px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg"
          />
          <button
            onClick={addRecommendation}
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Ajouter
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-600">L'admin pourra générer un devis à partir de ces recommandations</p>
      </section>

      {/* Photos */}
      <section className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Camera className="h-5 w-5 mr-2" />
          Photos
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos avant * ({photosBefore.length})
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setPhotosBefore(Array.from(e.target.files || []))}
              className="w-full text-sm sm:text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos après * ({photosAfter.length})
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setPhotosAfter(Array.from(e.target.files || []))}
              className="w-full text-sm sm:text-base"
              required
            />
          </div>
        </div>
      </section>

      {/* Signatures */}
      <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Signature className="h-5 w-5 mr-2" />
          Signatures
        </h2>
        
        <div className="space-y-6">
          {/* Signature technicien */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature du technicien *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={150}
                className="w-full h-32 sm:h-40 border border-gray-200 rounded cursor-crosshair touch-none"
                onMouseDown={(e) => startDrawing(e)}
                onMouseMove={(e) => draw(e)}
                onMouseUp={() => stopDrawing()}
                onMouseLeave={() => stopDrawing()}
                onTouchStart={(e) => {
                  e.preventDefault()
                  const touch = e.touches[0]
                  const canvas = signatureCanvasRef.current
                  if (!canvas) return
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  const rect = canvas.getBoundingClientRect()
                  ctx.beginPath()
                  ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
                  setIsDrawing(true)
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  if (!isDrawing) return
                  const touch = e.touches[0]
                  const canvas = signatureCanvasRef.current
                  if (!canvas) return
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  const rect = canvas.getBoundingClientRect()
                  ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
                  ctx.stroke()
                }}
                onTouchEnd={() => stopDrawing()}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => saveSignature()}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Enregistrer
              </button>
              <button
                onClick={() => clearSignature()}
                className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Effacer
              </button>
            </div>
            {technicianSignature && (
              <div className="mt-2 text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Signature enregistrée
              </div>
            )}
          </div>

          {/* Signature client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature du client (optionnel)
            </label>
            <input
              type="text"
              value={clientTitle}
              onChange={(e) => setClientTitle(e.target.value)}
              placeholder="Titre du client (ex: Directeur)"
              className="w-full mb-2 px-3 sm:px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
              <canvas
                ref={clientSignatureCanvasRef}
                width={400}
                height={150}
                className="w-full h-32 sm:h-40 border border-gray-200 rounded cursor-crosshair touch-none"
                onMouseDown={(e) => startDrawing(e, true)}
                onMouseMove={(e) => draw(e, true)}
                onMouseUp={() => stopDrawing(true)}
                onMouseLeave={() => stopDrawing(true)}
                onTouchStart={(e) => {
                  e.preventDefault()
                  const touch = e.touches[0]
                  const canvas = clientSignatureCanvasRef.current
                  if (!canvas) return
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  const rect = canvas.getBoundingClientRect()
                  ctx.beginPath()
                  ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
                  setIsClientDrawing(true)
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  if (!isClientDrawing) return
                  const touch = e.touches[0]
                  const canvas = clientSignatureCanvasRef.current
                  if (!canvas) return
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  const rect = canvas.getBoundingClientRect()
                  ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
                  ctx.stroke()
                }}
                onTouchEnd={() => stopDrawing(true)}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => saveSignature(true)}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Enregistrer
              </button>
              <button
                onClick={() => clearSignature(true)}
                className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={isGenerating}
          className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Save className="h-4 w-4" />
          Sauvegarder en brouillon
        </button>
        <button
          onClick={handleSubmit}
          disabled={isGenerating}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Envoi...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Soumettre pour validation
            </>
          )}
        </button>
      </div>
    </div>
  )
}

