'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Camera, MapPin, Clock, FileText, Save, Send, CheckCircle, AlertTriangle,
  Upload, Signature, Eye, X, Plus, Building, Wrench, Package, ArrowRight
} from 'lucide-react'

// Types unifiés et simplifiés
type Issue = {
  id: string
  component: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  solution: string
  requiresQuote: boolean
  estimatedCost?: number
}

type Material = {
  id: string
  name: string
  quantity: number
  unitPrice?: number
}

type RecommendationAction = {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduledDate?: string
  requiresQuote: boolean
  estimatedCost?: number
}

interface MaintenanceReportData {
  // Identification
  reportId: string
  status: 'draft' | 'completed' | 'validated'
  createdAt: string
  
  // Intervention
  clientId?: string
  site: string
  date: string
  startTime: string
  endTime: string
  technicianId: string
  gpsLocation?: { lat: number, lng: number }
  
  // Contenu structuré (remplace les anciennes sections redondantes)
  issues: Issue[]
  materials: Material[]
  recommendations: RecommendationAction[]
  
  // Documentation
  photosBefore: File[]
  photosAfter: File[]
  technicianSignature: string | null
  clientSignature: string | null
  clientName?: string
  clientTitle?: string
  
  // Notes additionnelles
  notes?: string
}

interface OptimizedMaintenanceReportProps {
  projectId?: string
  existingReport?: Partial<MaintenanceReportData>
  onSave?: (data: MaintenanceReportData) => Promise<void>
  onSubmit?: (data: MaintenanceReportData) => Promise<void>
  isReadOnly?: boolean
}

export default function OptimizedMaintenanceReport({ 
  projectId,
  existingReport,
  onSave,
  onSubmit,
  isReadOnly = false
}: OptimizedMaintenanceReportProps) {
  
  const [activeTab, setActiveTab] = useState<'info' | 'issues' | 'materials' | 'photos' | 'signatures'>('info')
  const [formData, setFormData] = useState<MaintenanceReportData>({
    reportId: existingReport?.reportId || `RPT-${Date.now()}`,
    status: existingReport?.status || 'draft',
    createdAt: existingReport?.createdAt || new Date().toISOString(),
    
    clientId: existingReport?.clientId,
    site: existingReport?.site || '',
    date: existingReport?.date || new Date().toISOString().split('T')[0],
    startTime: existingReport?.startTime || new Date().toTimeString().slice(0,5),
    endTime: existingReport?.endTime || '',
    technicianId: existingReport?.technicianId || '',
    gpsLocation: existingReport?.gpsLocation,
    
    issues: existingReport?.issues || [],
    materials: existingReport?.materials || [],
    recommendations: existingReport?.recommendations || [],
    
    photosBefore: existingReport?.photosBefore || [],
    photosAfter: existingReport?.photosAfter || [],
    technicianSignature: existingReport?.technicianSignature || null,
    clientSignature: existingReport?.clientSignature || null,
    clientName: existingReport?.clientName,
    clientTitle: existingReport?.clientTitle,
    
    notes: existingReport?.notes
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [currentSignature, setCurrentSignature] = useState<'technician' | 'client' | null>(null)
  
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Géolocalisation
  useEffect(() => {
    if (!isReadOnly && !formData.gpsLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setFormData(prev => ({
          ...prev,
          gpsLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }))
      )
    }
  }, [])

  // Validation
  const validate = (): boolean => {
    const errs: string[] = []
    if (!formData.site) errs.push('Site requis')
    if (!formData.date) errs.push('Date requise')
    if (!formData.startTime || !formData.endTime) errs.push('Heures requises')
    if (formData.issues.length === 0) errs.push('Au moins un problème doit être documenté')
    if (formData.photosBefore.length === 0) errs.push('Photos avant requises')
    if (formData.photosAfter.length === 0) errs.push('Photos après requises')
    if (!formData.technicianSignature) errs.push('Signature technicien requise')
    
    setErrors(errs)
    return errs.length === 0
  }

  // Actions
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave?.(formData)
      alert('Rapport sauvegardé')
    } catch (error: any) {
      alert(error.message || 'Erreur de sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!validate()) return
    
    setIsSaving(true)
    try {
      await onSubmit?.({ ...formData, status: 'completed' })
      alert('Rapport soumis pour validation !')
    } catch (error: any) {
      alert(error.message || 'Erreur de soumission')
    } finally {
      setIsSaving(false)
    }
  }

  // Gestion problèmes
  const addIssue = () => {
    setFormData(prev => ({
      ...prev,
      issues: [...prev.issues, {
        id: `ISS-${Date.now()}`,
        component: '',
        description: '',
        severity: 'medium',
        solution: '',
        requiresQuote: false
      }]
    }))
  }

  const updateIssue = (id: string, field: keyof Issue, value: any) => {
    setFormData(prev => ({
      ...prev,
      issues: prev.issues.map(issue => 
        issue.id === id ? { ...issue, [field]: value } : issue
      )
    }))
  }

  const removeIssue = (id: string) => {
    setFormData(prev => ({
      ...prev,
      issues: prev.issues.filter(issue => issue.id !== id)
    }))
  }

  // Gestion matériel
  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, {
        id: `MAT-${Date.now()}`,
        name: '',
        quantity: 1
      }]
    }))
  }

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map(mat => 
        mat.id === id ? { ...mat, [field]: value } : mat
      )
    }))
  }

  const removeMaterial = (id: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(mat => mat.id !== id)
    }))
  }

  // Gestion recommandations
  const addRecommendation = () => {
    setFormData(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, {
        id: `REC-${Date.now()}`,
        title: '',
        priority: 'medium',
        requiresQuote: false
      }]
    }))
  }

  const updateRecommendation = (id: string, field: keyof RecommendationAction, value: any) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.map(rec => 
        rec.id === id ? { ...rec, [field]: value } : rec
      )
    }))
  }

  const removeRecommendation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter(rec => rec.id !== id)
    }))
  }

  // Gestion photos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      [type === 'before' ? 'photosBefore' : 'photosAfter']: [...prev[type === 'before' ? 'photosBefore' : 'photosAfter'], ...files]
    }))
  }

  const removePhoto = (index: number, type: 'before' | 'after') => {
    setFormData(prev => ({
      ...prev,
      [type === 'before' ? 'photosBefore' : 'photosAfter']: 
        prev[type === 'before' ? 'photosBefore' : 'photosAfter'].filter((_, i) => i !== index)
    }))
  }

  // Gestion signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas || !currentSignature) return
    
    const dataUrl = canvas.toDataURL()
    setFormData(prev => ({
      ...prev,
      [currentSignature === 'technician' ? 'technicianSignature' : 'clientSignature']: dataUrl
    }))
    setCurrentSignature(null)
  }

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const deleteSignature = (type: 'technician' | 'client') => {
    setFormData(prev => ({
      ...prev,
      [type === 'technician' ? 'technicianSignature' : 'clientSignature']: null
    }))
  }

  // Calculs
  const duration = () => {
    if (!formData.startTime || !formData.endTime) return ''
    const [sh, sm] = formData.startTime.split(':').map(Number)
    const [eh, em] = formData.endTime.split(':').map(Number)
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h${m > 0 ? ` ${m}min` : ''}`
  }

  const totalCost = () => {
    const issuesCost = formData.issues.reduce((sum, i) => sum + (i.estimatedCost || 0), 0)
    const materialsCost = formData.materials.reduce((sum, m) => sum + (m.unitPrice || 0) * m.quantity, 0)
    const recsCost = formData.recommendations.reduce((sum, r) => sum + (r.estimatedCost || 0), 0)
    return issuesCost + materialsCost + recsCost
  }

  const severityColor = (severity: string) => ({
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  }[severity] || '')

  const tabs = [
    { id: 'info', label: 'Infos', icon: Building },
    { id: 'issues', label: 'Problèmes', icon: AlertTriangle, count: formData.issues.length },
    { id: 'materials', label: 'Matériel', icon: Package, count: formData.materials.length },
    { id: 'photos', label: 'Photos', icon: Camera, count: formData.photosBefore.length + formData.photosAfter.length },
    { id: 'signatures', label: 'Signatures', icon: Signature }
  ] as const

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* En-tête compact */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">📋 Rapport de Maintenance</h1>
            <p className="text-sm text-emerald-100 mt-1">
              #{formData.reportId} • {formData.status === 'draft' ? 'Brouillon' : 'Finalisé'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {formData.gpsLocation && (
              <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded text-xs">
                <MapPin className="h-3 w-3" />
                GPS
              </div>
            )}
            <span className="text-xs bg-white/20 px-2 py-1 rounded">
              {new Date(formData.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </div>

      {/* Erreurs de validation */}
      {errors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800 text-sm">Champs requis manquants</h3>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {errors.map((err, i) => <li key={i}>• {err}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Navigation par onglets */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                disabled={isReadOnly}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50' 
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {'count' in tab && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Contenu des onglets */}
        <div className="p-4 sm:p-6">
          {/* Onglet Informations */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site d'intervention *
                  </label>
                  <input
                    type="text"
                    value={formData.site}
                    onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Nom du site ou adresse"
                    disabled={isReadOnly}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={isReadOnly}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Début *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={isReadOnly}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fin *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              
              {duration() && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span>Durée: <strong>{duration()}</strong></span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes additionnelles
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={3}
                  placeholder="Remarques générales..."
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {/* Onglet Problèmes */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              {formData.issues.map((issue, index) => (
                <div key={issue.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Problème #{index + 1}</h3>
                    {!isReadOnly && (
                      <button
                        onClick={() => removeIssue(issue.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Composant/Équipement
                      </label>
                      <input
                        type="text"
                        value={issue.component}
                        onChange={(e) => updateIssue(issue.id, 'component', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        placeholder="Ex: Caméra n°5"
                        disabled={isReadOnly}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Sévérité
                      </label>
                      <select
                        value={issue.severity}
                        onChange={(e) => updateIssue(issue.id, 'severity', e.target.value)}
                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 ${severityColor(issue.severity)}`}
                        disabled={isReadOnly}
                      >
                        <option value="low">🟢 Faible</option>
                        <option value="medium">🟡 Moyen</option>
                        <option value="high">🟠 Élevé</option>
                        <option value="critical">🔴 Critique</option>
                      </select>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description du problème
                      </label>
                      <textarea
                        value={issue.description}
                        onChange={(e) => updateIssue(issue.id, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        rows={2}
                        placeholder="Décrivez le problème..."
                        disabled={isReadOnly}
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Solution appliquée
                      </label>
                      <textarea
                        value={issue.solution}
                        onChange={(e) => updateIssue(issue.id, 'solution', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        rows={2}
                        placeholder="Solution mise en place..."
                        disabled={isReadOnly}
                      />
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={issue.requiresQuote}
                          onChange={(e) => updateIssue(issue.id, 'requiresQuote', e.target.checked)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          disabled={isReadOnly}
                        />
                        <span className="text-gray-700">Devis requis</span>
                      </label>
                    </div>
                    
                    {issue.requiresQuote && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Coût estimé (FCFA)
                        </label>
                        <input
                          type="number"
                          value={issue.estimatedCost || ''}
                          onChange={(e) => updateIssue(issue.id, 'estimatedCost', Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                          placeholder="0"
                          disabled={isReadOnly}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!isReadOnly && (
                <button
                  onClick={addIssue}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un problème
                </button>
              )}
            </div>
          )}

          {/* Onglet Matériel */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              {formData.materials.map((material, index) => (
                <div key={material.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Matériel #{index + 1}</h3>
                    {!isReadOnly && (
                      <button
                        onClick={() => removeMaterial(material.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nom du matériel
                      </label>
                      <input
                        type="text"
                        value={material.name}
                        onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        placeholder="Ex: Câble RJ45 cat6"
                        disabled={isReadOnly}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={material.quantity}
                        onChange={(e) => updateMaterial(material.id, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        disabled={isReadOnly}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Prix unitaire (FCFA)
                      </label>
                      <input
                        type="number"
                        value={material.unitPrice || ''}
                        onChange={(e) => updateMaterial(material.id, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        placeholder="0"
                        disabled={isReadOnly}
                      />
                    </div>
                    
                    {material.unitPrice && material.quantity > 0 && (
                      <div className="sm:col-span-2 text-sm text-gray-700 flex items-center gap-2">
                        <span className="font-medium">Total:</span>
                        <span className="text-emerald-700 font-bold">
                          {(material.unitPrice * material.quantity).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!isReadOnly && (
                <button
                  onClick={addMaterial}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter du matériel
                </button>
              )}
            </div>
          )}

          {/* Onglet Photos */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Photos AVANT */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-gray-600" />
                  Photos AVANT ({formData.photosBefore.length})
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.photosBefore.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Avant ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      {!isReadOnly && (
                        <button
                          onClick={() => removePhoto(index, 'before')}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {!isReadOnly && (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">Ajouter</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handlePhotoUpload(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Photos APRÈS */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-gray-600" />
                  Photos APRÈS ({formData.photosAfter.length})
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.photosAfter.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Après ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      {!isReadOnly && (
                        <button
                          onClick={() => removePhoto(index, 'after')}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {!isReadOnly && (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">Ajouter</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handlePhotoUpload(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Recommandations (déplacé ici pour regrouper avec photos) */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-gray-600" />
                  Actions recommandées ({formData.recommendations.length})
                </h3>
                
                <div className="space-y-3">
                  {formData.recommendations.map((rec, index) => (
                    <div key={rec.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={rec.title}
                            onChange={(e) => updateRecommendation(rec.id, 'title', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2 focus:ring-1 focus:ring-emerald-500"
                            placeholder="Action recommandée..."
                            disabled={isReadOnly}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={rec.priority}
                              onChange={(e) => updateRecommendation(rec.id, 'priority', e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                              disabled={isReadOnly}
                            >
                              <option value="low">Basse</option>
                              <option value="medium">Moyenne</option>
                              <option value="high">Haute</option>
                              <option value="urgent">Urgente</option>
                            </select>
                            
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={rec.requiresQuote}
                                onChange={(e) => updateRecommendation(rec.id, 'requiresQuote', e.target.checked)}
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                disabled={isReadOnly}
                              />
                              Devis
                            </label>
                            
                            {rec.requiresQuote && (
                              <input
                                type="number"
                                value={rec.estimatedCost || ''}
                                onChange={(e) => updateRecommendation(rec.id, 'estimatedCost', Number(e.target.value))}
                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                                placeholder="Coût FCFA"
                                disabled={isReadOnly}
                              />
                            )}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => removeRecommendation(rec.id)}
                            className="text-red-600 hover:text-red-800 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {!isReadOnly && (
                    <button
                      onClick={addRecommendation}
                      className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter une recommandation
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Onglet Signatures */}
          {activeTab === 'signatures' && (
            <div className="space-y-6">
              {/* Signature technicien */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Signature Technicien *</h3>
                {formData.technicianSignature ? (
                  <div className="relative inline-block">
                    <img src={formData.technicianSignature} alt="Signature technicien" className="border border-gray-300 rounded-lg" />
                    {!isReadOnly && (
                      <button
                        onClick={() => deleteSignature('technician')}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : !isReadOnly ? (
                  <button
                    onClick={() => setCurrentSignature('technician')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <Signature className="h-4 w-4" />
                    Signer
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">Non signée</p>
                )}
              </div>
              
              {/* Signature client */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Signature Client</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={formData.clientName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nom du client"
                    disabled={isReadOnly}
                  />
                  <input
                    type="text"
                    value={formData.clientTitle || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientTitle: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Fonction"
                    disabled={isReadOnly}
                  />
                </div>
                
                {formData.clientSignature ? (
                  <div className="relative inline-block">
                    <img src={formData.clientSignature} alt="Signature client" className="border border-gray-300 rounded-lg" />
                    {!isReadOnly && (
                      <button
                        onClick={() => deleteSignature('client')}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : !isReadOnly ? (
                  <button
                    onClick={() => setCurrentSignature('client')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Signature className="h-4 w-4" />
                    Signer
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">Non signée</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal signature */}
      {currentSignature && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-lg mb-4">
              Signature {currentSignature === 'technician' ? 'Technicien' : 'Client'}
            </h3>
            
            <div className="border-2 border-gray-300 rounded-lg mb-4">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full cursor-crosshair"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={clearSignature}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Effacer
              </button>
              <button
                onClick={() => setCurrentSignature(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveSignature}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Récapitulatif et actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-700">{formData.issues.length}</div>
            <div className="text-xs text-gray-600">Problèmes</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{formData.materials.length}</div>
            <div className="text-xs text-gray-600">Matériels</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">{formData.recommendations.length}</div>
            <div className="text-xs text-gray-600">Actions</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">
              {totalCost().toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-gray-600">FCFA estimé</div>
          </div>
        </div>
        
        {!isReadOnly && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder brouillon'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
              {isSaving ? 'Envoi...' : 'Soumettre pour validation'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}







