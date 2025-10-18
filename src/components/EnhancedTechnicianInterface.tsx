'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Camera, 
  MapPin, 
  Clock, 
  User, 
  Save, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Smartphone,
  Battery,
  Signal,
  Navigation,
  Mic,
  Video,
  Upload,
  FileText,
  QrCode,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Star,
  Zap,
  Target,
  Activity,
  MessageCircle,
  Calendar,
  ArrowRight,
  Download,
  Wifi,
  WifiOff,
  X
} from 'lucide-react'

interface TechnicianDashboardProps {
  technicianId?: string
  isOfflineMode?: boolean
}

export default function EnhancedTechnicianInterface({ 
  technicianId = 'TECH-001',
  isOfflineMode = false 
}: TechnicianDashboardProps) {
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [reports, setReports] = useState<any[]>([])
  const [activeReport, setActiveReport] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'dashboard' | 'create' | 'edit' | 'camera'>('dashboard')
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [pendingSync, setPendingSync] = useState<any[]>([])
  
  // Refs pour fonctionnalités avancées
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  
  // État de la session technicien
  const [sessionData, setSessionData] = useState({
    startTime: new Date(),
    totalInterventions: 0,
    distance: 0,
    batteryLevel: 100
  })

  // Surveillance connectivité
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingData()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Géolocalisation en continu
  useEffect(() => {
    let watchId: number
    
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => console.error('Erreur géolocalisation:', error),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      )
    }
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  // Synchronisation des données en attente
  const syncPendingData = async () => {
    if (pendingSync.length === 0) return
    
    try {
      for (const item of pendingSync) {
        await fetch('/api/maintenance/reports', {
          method: item.method,
          headers: { 'Content-Type': 'application/json', 'x-dev-bypass-csrf': 'true' },
          credentials: 'include',
          body: JSON.stringify(item.data)
        })
      }
      setPendingSync([])
    } catch (error) {
      console.error('Erreur synchronisation:', error)
    }
  }

  // Démarrage caméra pour photos/vidéos
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCurrentView('camera')
      }
    } catch (error) {
      console.error('Erreur accès caméra:', error)
    }
  }

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)
      
      // Conversion en blob avec métadonnées
      canvas.toBlob((blob) => {
        if (blob) {
          const photo = {
            id: Date.now(),
            blob,
            timestamp: new Date(),
            location: currentLocation,
            type: 'intervention'
          }
          
          // Ajout à la galerie locale
          addPhotoToReport(photo)
        }
      }, 'image/jpeg', 0.9)
    }
  }

  // Ajout photo au rapport actuel
  const addPhotoToReport = (photo: any) => {
    if (activeReport) {
      const updatedReport = {
        ...activeReport,
        photos: {
          ...activeReport.photos,
          after: [...(activeReport.photos?.after || []), photo]
        }
      }
      setActiveReport(updatedReport)
    }
  }

  // Enregistrement vocal pour observations
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      setVoiceRecording(true)
      
      const audioChunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        // Ici, convertir en texte avec API de transcription ou sauvegarder
        processVoiceNote(audioBlob)
      }
      
      mediaRecorder.start()
    } catch (error) {
      console.error('Erreur enregistrement vocal:', error)
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setVoiceRecording(false)
    }
  }

  // Traitement note vocale
  const processVoiceNote = (audioBlob: Blob) => {
    // Ici vous pouvez :
    // 1. Envoyer à un service de transcription (Google Speech, Azure, etc.)
    // 2. Sauvegarder l'audio pour écoute ultérieure
    console.log('Note vocale enregistrée:', audioBlob.size, 'bytes')
  }

  // Scan QR Code pour identification équipement
  const scanQRCode = async () => {
    try {
      // Ici vous intégreriez une bibliothèque de scan QR comme jsQR
      // const result = await scanQR()
      const mockResult = 'CAM-001-4K-HIKVISION'
      
      if (activeReport) {
        setActiveReport({
          ...activeReport,
          scannedEquipment: [...(activeReport.scannedEquipment || []), mockResult]
        })
      }
    } catch (error) {
      console.error('Erreur scan QR:', error)
    }
  }

  // Templates d'intervention rapides
  const quickTemplates = [
    {
      id: 'maintenance_rapide',
      name: 'Maintenance Rapide',
      icon: Zap,
      color: 'bg-yellow-500',
      fields: ['Nettoyage caméras', 'Vérification NVR', 'Test fonctionnel']
    },
    {
      id: 'reparation_urgente',
      name: 'Réparation Urgente', 
      icon: AlertTriangle,
      color: 'bg-red-500',
      fields: ['Diagnostic panne', 'Remplacement équipement', 'Tests']
    },
    {
      id: 'installation_nouvelle',
      name: 'Nouvelle Installation',
      icon: Plus,
      color: 'bg-green-500',
      fields: ['Préparation site', 'Installation équipement', 'Configuration', 'Formation client']
    }
  ]

  // Création rapport rapide avec template
  const createQuickReport = (template: any) => {
    const newReport = {
      id: Date.now(),
      reportId: `RPT-${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      status: 'draft',
      interventionDate: new Date().toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      site: '',
      tasksPerformed: template.fields,
      photos: { before: [], after: [] },
      observations: '',
      createdAt: new Date(),
      location: currentLocation
    }
    
    setActiveReport(newReport)
    setCurrentView('create')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec statut */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
              
              {currentLocation && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  GPS Actif
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-600">
                <Battery className="h-4 w-4 mr-1" />
                {sessionData.batteryLevel}%
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {pendingSync.length > 0 && (
                <div className="flex items-center text-sm text-amber-600">
                  <Upload className="h-4 w-4 mr-1" />
                  {pendingSync.length} en attente
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Session: {Math.floor((new Date().getTime() - sessionData.startTime.getTime()) / 60000)}min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation onglets */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Tableau de Bord', icon: Activity },
              { id: 'create', label: 'Nouveau Rapport', icon: Plus },
              { id: 'reports', label: 'Mes Rapports', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  currentView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vue Tableau de bord */}
      {currentView === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rapports Aujourd'hui</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Validés</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En Attente</p>
                  <p className="text-2xl font-bold text-gray-900">2</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Note Moyenne</p>
                  <p className="text-2xl font-bold text-gray-900">4.8</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => createQuickReport(template)}
                  className={`${template.color} text-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-left`}
                >
                  <div className="flex items-center mb-3">
                    <template.icon className="h-6 w-6 mr-3" />
                    <span className="font-semibold">{template.name}</span>
                  </div>
                  <div className="text-sm opacity-90">
                    {template.fields.slice(0, 2).join(', ')}...
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interventions du jour */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Interventions Programmées</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    time: '09:00',
                    client: 'IT Solutions SARL',
                    site: 'Parcelles Assainies',
                    type: 'Maintenance préventive',
                    status: 'planned'
                  },
                  {
                    id: 2,
                    time: '14:00',
                    client: 'Commerce Plus',
                    site: 'Plateau',
                    type: 'Réparation urgente',
                    status: 'in_progress'
                  }
                ].map((intervention) => (
                  <div key={intervention.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-bold text-blue-600">{intervention.time}</div>
                      <div>
                        <div className="font-medium">{intervention.client}</div>
                        <div className="text-sm text-gray-600">{intervention.site} • {intervention.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        intervention.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {intervention.status === 'planned' ? 'Planifié' : 'En cours'}
                      </span>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Caméra */}
      {currentView === 'camera' && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Contrôles caméra */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={() => setCurrentView('create')}
                  className="p-3 bg-gray-800 text-white rounded-full"
                >
                  <X className="h-6 w-6" />
                </button>
                
                <button
                  onClick={capturePhoto}
                  className="p-4 bg-white rounded-full shadow-lg"
                >
                  <Camera className="h-8 w-8 text-gray-800" />
                </button>
                
                <button
                  onClick={scanQRCode}
                  className="p-3 bg-blue-600 text-white rounded-full"
                >
                  <QrCode className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Overlay infos */}
            <div className="absolute top-6 left-6 right-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Enregistrement</span>
                </div>
                {currentLocation && (
                  <div className="text-sm">
                    GPS: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'action flottants */}
      <div className="fixed bottom-6 right-6 space-y-3">
        <button
          onClick={startCamera}
          className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Camera className="h-6 w-6" />
        </button>
        
        <button
          onClick={voiceRecording ? stopVoiceRecording : startVoiceRecording}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-colors ${
            voiceRecording 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Mic className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}