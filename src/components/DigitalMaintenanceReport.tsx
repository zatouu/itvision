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
  ArrowRight
} from 'lucide-react'

interface DigitalMaintenanceReportProps {
  projectId?: string
  isReadOnly?: boolean
  existingReport?: any
}

export default function DigitalMaintenanceReport({ 
  projectId = 'PRJ-001', 
  isReadOnly = false,
  existingReport = null 
}: DigitalMaintenanceReportProps) {
  const [reportData, setReportData] = useState({
    // Informations générales
    site: existingReport?.site || '',
    interventionDate: existingReport?.interventionDate || new Date().toISOString().split('T')[0],
    startTime: existingReport?.startTime || '',
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
    clientName: existingReport?.clientName || '',
    clientTitle: existingReport?.clientTitle || '',
    
    // Métadonnées
    status: existingReport?.status || 'draft',
    reportId: existingReport?.reportId || `RPT-${Date.now()}`,
    createdAt: existingReport?.createdAt || new Date().toISOString(),
    gpsLocation: existingReport?.gpsLocation || null
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureType, setSignatureType] = useState<'technician' | 'client' | null>(null)

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
          setReportData(prev => ({ ...prev, gpsLocation: location }))
        },
        (error) => console.log('Géolocalisation non disponible:', error)
      )
    }
  }, [isReadOnly])

  // Calcul automatique de la durée
  useEffect(() => {
    if (reportData.startTime && reportData.endTime) {
      const start = new Date(`1970-01-01T${reportData.startTime}:00`)
      const end = new Date(`1970-01-01T${reportData.endTime}:00`)
      const diffMs = end.getTime() - start.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      setReportData(prev => ({ 
        ...prev, 
        duration: `${diffHours}h ${diffMinutes}min` 
      }))
    }
  }, [reportData.startTime, reportData.endTime])

  const addTask = () => {
    setReportData(prev => ({
      ...prev,
      tasksPerformed: [...prev.tasksPerformed, '']
    }))
  }

  const updateTask = (index: number, value: string) => {
    setReportData(prev => ({
      ...prev,
      tasksPerformed: prev.tasksPerformed.map((task: string, i: number) => i === index ? value : task)
    }))
  }

  const removeTask = (index: number) => {
    setReportData(prev => ({
      ...prev,
      tasksPerformed: prev.tasksPerformed.filter((_: string, i: number) => i !== index)
    }))
  }

  const addRecommendation = () => {
    setReportData(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, '']
    }))
  }

  const updateRecommendation = (index: number, value: string) => {
    setReportData(prev => ({
      ...prev,
      recommendations: prev.recommendations.map((rec: string, i: number) => i === index ? value : rec)
    }))
  }

  const removeRecommendation = (index: number) => {
    setReportData(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter((_: string, i: number) => i !== index)
    }))
  }

  // Gestion signature électronique
  const startSignature = (type: 'technician' | 'client') => {
    setSignatureType(type)
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx!.clearRect(0, 0, canvas.width, canvas.height)
      ctx!.strokeStyle = '#000000'
      ctx!.lineWidth = 2
      ctx!.lineCap = 'round'
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!signatureType) return
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const ctx = canvas!.getContext('2d')
    ctx!.beginPath()
    ctx!.moveTo(x, y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !signatureType) return
    const canvas = canvasRef.current
    const rect = canvas!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const ctx = canvas!.getContext('2d')
    ctx!.lineTo(x, y)
    ctx!.stroke()
  }

  const handleMouseUp = () => {
    if (!isDrawing || !signatureType) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    const signatureData = canvas!.toDataURL()
    
    setReportData(prev => ({
      ...prev,
      [`${signatureType}Signature`]: signatureData
    }))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx!.clearRect(0, 0, canvas.width, canvas.height)
    }
    if (signatureType) {
      setReportData(prev => ({
        ...prev,
        [`${signatureType}Signature`]: null
      }))
    }
  }

  // Gestion photos (simulation)
  const handlePhotoUpload = (type: 'before' | 'after', event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const photoData = {
            id: Date.now() + crypto.getRandomValues(new Uint32Array(1))[0],
            data: e.target?.result,
            filename: file.name,
            timestamp: new Date().toISOString()
          }
          
          setReportData(prev => ({
            ...prev,
            [`photos${type === 'before' ? 'Before' : 'After'}`]: [
              ...prev[`photos${type === 'before' ? 'Before' : 'After'}`],
              photoData
            ]
          }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removePhoto = (type: 'before' | 'after', photoId: number) => {
    setReportData(prev => ({
      ...prev,
      [`photos${type === 'before' ? 'Before' : 'After'}`]: prev[`photos${type === 'before' ? 'Before' : 'After'}`].filter((photo: any) => photo.id !== photoId)
    }))
  }

  const generateReport = async () => {
    setIsGenerating(true)
    
    // Simulation génération PDF
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const reportContent = {
      ...reportData,
      generatedAt: new Date().toISOString(),
      status: 'completed'
    }
    
    // En production: envoyer au serveur pour génération PDF
    console.log('Rapport généré:', reportContent)
    
    setReportData(prev => ({ ...prev, status: 'completed' }))
    setIsGenerating(false)
    
    // Notification client automatique
    alert('Rapport généré et envoyé au client ! 📧')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      {/* Header avec statut */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isReadOnly ? 'Rapport de Maintenance' : 'Nouveau Rapport'}
            </h1>
            <p className="text-gray-600">
              Rapport ID: <span className="font-mono">{reportData.reportId}</span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              reportData.status === 'completed' ? 'bg-green-100 text-green-800' :
              reportData.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {reportData.status === 'completed' ? '✅ Terminé' :
               reportData.status === 'in_progress' ? '🔄 En cours' :
               '📝 Brouillon'}
            </span>
            
            {currentLocation && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <MapPin className="h-4 w-4" />
                <span>Géolocalisé</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Informations générales */}
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Informations Générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site d'intervention</label>
              <input
                type="text"
                value={reportData.site}
                onChange={(e) => setReportData(prev => ({ ...prev, site: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: IT Solutions SARL - Siège"
                disabled={isReadOnly}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date d'intervention</label>
              <input
                type="date"
                value={reportData.interventionDate}
                onChange={(e) => setReportData(prev => ({ ...prev, interventionDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isReadOnly}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heure début</label>
              <input
                type="time"
                value={reportData.startTime}
                onChange={(e) => setReportData(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isReadOnly}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heure fin</label>
              <input
                type="time"
                value={reportData.endTime}
                onChange={(e) => setReportData(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isReadOnly}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée (automatique)</label>
              <input
                type="text"
                value={reportData.duration}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Intervenant</label>
              <input
                type="text"
                value={reportData.technician}
                onChange={(e) => setReportData(prev => ({ ...prev, technician: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </section>

        {/* Observations et problèmes */}
        <section className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Observations & Diagnostic
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observations initiales</label>
              <textarea
                value={reportData.initialObservations}
                onChange={(e) => setReportData(prev => ({ ...prev, initialObservations: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Description de l'état initial du système..."
                disabled={isReadOnly}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée du problème</label>
              <textarea
                value={reportData.problemDescription}
                onChange={(e) => setReportData(prev => ({ ...prev, problemDescription: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez précisément le problème rencontré, les symptômes, les causes identifiées..."
                disabled={isReadOnly}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de gravité</label>
              <select
                value={reportData.problemSeverity}
                onChange={(e) => setReportData(prev => ({ ...prev, problemSeverity: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isReadOnly}
              >
                <option value="low">🟢 Faible - Maintenance préventive</option>
                <option value="medium">🟡 Moyen - Problème mineur</option>
                <option value="high">🟠 Élevé - Problème majeur</option>
                <option value="critical">🔴 Critique - Système compromis</option>
              </select>
            </div>
          </div>
        </section>

        {/* Tâches réalisées */}
        <section className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-xl font-semibold text-green-900 mb-4 flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            Tâches Réalisées
          </h2>
          
          <div className="space-y-3">
            {reportData.tasksPerformed.map((task: string, index: number) => (
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
                {!isReadOnly && reportData.tasksPerformed.length > 1 && (
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

        {/* Photos avant/après */}
        <section className="bg-purple-50 rounded-xl p-6 border border-purple-200">
          <h2 className="text-xl font-semibold text-purple-900 mb-4 flex items-center">
            <Camera className="h-5 w-5 mr-2" />
            Photos Avant/Après
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Photos avant */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Photos AVANT intervention</h3>
              <div className="space-y-3">
                {!isReadOnly && (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">Ajouter photos</span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload('before', e)}
                      className="hidden"
                    />
                  </label>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  {reportData.photosBefore.map((photo: any) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.data}
                        alt="Avant intervention"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      {!isReadOnly && (
                        <button
                          onClick={() => removePhoto('before', photo.id)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Photos après */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Photos APRÈS intervention</h3>
              <div className="space-y-3">
                {!isReadOnly && (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">Ajouter photos</span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload('after', e)}
                      className="hidden"
                    />
                  </label>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  {reportData.photosAfter.map((photo: any) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.data}
                        alt="Après intervention"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      {!isReadOnly && (
                        <button
                          onClick={() => removePhoto('after', photo.id)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Résultats et recommandations */}
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Résultats & Recommandations
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Résultats de l'intervention</label>
              <textarea
                value={reportData.results}
                onChange={(e) => setReportData(prev => ({ ...prev, results: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez les résultats obtenus, l'état final du système..."
                disabled={isReadOnly}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recommandations</label>
              <div className="space-y-3">
                {reportData.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <input
                      type="text"
                      value={rec}
                      onChange={(e) => updateRecommendation(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Recommandation pour l'amélioration ou la maintenance..."
                      disabled={isReadOnly}
                    />
                    {!isReadOnly && reportData.recommendations.length > 1 && (
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

        {/* Signatures électroniques */}
        <section className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Signature className="h-5 w-5 mr-2" />
            Signatures Électroniques
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Signature intervenant */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Signature Intervenant</h3>
              {reportData.technicianSignature ? (
                <div className="space-y-3">
                  <img
                    src={reportData.technicianSignature}
                    alt="Signature intervenant"
                    className="w-full h-32 border border-gray-300 rounded-lg bg-white"
                  />
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setReportData(prev => ({ ...prev, technicianSignature: null }))
                        startSignature('technician')
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Refaire la signature
                    </button>
                  )}
                </div>
              ) : !isReadOnly ? (
                <div className="space-y-3">
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={120}
                    className="w-full border border-gray-300 rounded-lg bg-white cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{ display: signatureType === 'technician' ? 'block' : 'none' }}
                  />
                  {signatureType !== 'technician' && (
                    <button
                      onClick={() => startSignature('technician')}
                      className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
                    >
                      <div className="text-center">
                        <Signature className="h-8 w-8 mx-auto mb-2" />
                        <span>Cliquer pour signer</span>
                      </div>
                    </button>
                  )}
                  {signatureType === 'technician' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={clearSignature}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => setSignatureType(null)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Valider
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-32 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-500">Signature non disponible</span>
                </div>
              )}
            </div>

            {/* Signature client */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Signature Client</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={reportData.clientName}
                  onChange={(e) => setReportData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom du représentant client"
                  disabled={isReadOnly}
                />
                <input
                  type="text"
                  value={reportData.clientTitle}
                  onChange={(e) => setReportData(prev => ({ ...prev, clientTitle: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Fonction/Titre"
                  disabled={isReadOnly}
                />
                
                {reportData.clientSignature ? (
                  <div className="space-y-3">
                    <img
                      src={reportData.clientSignature}
                      alt="Signature client"
                      className="w-full h-32 border border-gray-300 rounded-lg bg-white"
                    />
                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          setReportData(prev => ({ ...prev, clientSignature: null }))
                          startSignature('client')
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Refaire la signature
                      </button>
                    )}
                  </div>
                ) : !isReadOnly ? (
                  <div className="space-y-3">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={120}
                      className="w-full border border-gray-300 rounded-lg bg-white cursor-crosshair"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      style={{ display: signatureType === 'client' ? 'block' : 'none' }}
                    />
                    {signatureType !== 'client' && (
                      <button
                        onClick={() => startSignature('client')}
                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <div className="text-center">
                          <Signature className="h-8 w-8 mx-auto mb-2" />
                          <span>Demander signature client</span>
                        </div>
                      </button>
                    )}
                    {signatureType === 'client' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={clearSignature}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          Effacer
                        </button>
                        <button
                          onClick={() => setSignatureType(null)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Valider
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-32 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-500">Signature en attente</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        {!isReadOnly && (
          <section className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => setReportData(prev => ({ ...prev, status: 'draft' }))}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Save className="h-5 w-5" />
              <span>Sauvegarder Brouillon</span>
            </button>
            
            <button
              onClick={generateReport}
              disabled={isGenerating || !reportData.technicianSignature}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Générer & Envoyer</span>
                </>
              )}
            </button>
          </section>
        )}

        {/* Message de confirmation */}
        {reportData.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Rapport envoyé avec succès !</h3>
                <p className="text-green-700 text-sm">
                  Le client a reçu le rapport par email et peut le consulter dans son portail.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}