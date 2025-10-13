'use client'

import { useState, useEffect, useRef } from 'react'
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
  Phone,
  Navigation,
  Battery,
  Wifi,
  Signal,
  Calendar,
  Wrench,
  Eye,
  Image as ImageIcon,
  Mic,
  Video,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Home,
  List,
  Settings,
  LogOut,
  Timer,
  Play,
  Pause,
  Square,
  Zap,
  Activity,
  Star,
  MessageCircle,
  Share
} from 'lucide-react'

interface MobileInterventionAppProps {
  technicianId?: string
  onComplete?: (report: any) => void
}

export default function MobileInterventionApp({ 
  technicianId = 'TECH-001',
  onComplete 
}: MobileInterventionAppProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [interventionData, setInterventionData] = useState({
    id: `INT-${Date.now()}`,
    technicianId,
    startTime: null as Date | null,
    endTime: null as Date | null,
    location: null as {lat: number, lng: number, address: string} | null,
    client: {
      name: '',
      phone: '',
      email: '',
      title: ''
    },
    site: '',
    problemType: '',
    observations: '',
    tasksPerformed: [] as string[],
    photosBefore: [] as any[],
    photosAfter: [] as any[],
    voiceNotes: [] as any[],
    signature: null as string | null,
    status: 'in_progress'
  })

  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [deviceStatus, setDeviceStatus] = useState({
    battery: 85,
    signal: 4,
    wifi: true,
    gps: true
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const steps = [
    { id: 'start', title: 'Arrivée', icon: MapPin },
    { id: 'diagnosis', title: 'Diagnostic', icon: Eye },
    { id: 'photos_before', title: 'Photos Avant', icon: Camera },
    { id: 'intervention', title: 'Intervention', icon: Wrench },
    { id: 'photos_after', title: 'Photos Après', icon: Camera },
    { id: 'signature', title: 'Signature', icon: Edit3 },
    { id: 'complete', title: 'Terminé', icon: CheckCircle }
  ]

  // Timer d'intervention
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  // Géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Adresse détectée automatiquement'
          }
          
          // Simulation géocodage inverse
          // En production: utiliser une API de géocodage
          setInterventionData(prev => ({ ...prev, location }))
        },
        (error) => console.log('Géolocalisation échouée:', error)
      )
    }
  }, [])

  // Simulation de statut appareil
  useEffect(() => {
    const interval = setInterval(() => {
      setDeviceStatus(prev => ({
        ...prev,
        battery: Math.max(0, prev.battery - 0.1),
        signal: Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (2**32) * 5),
        wifi: crypto.getRandomValues(new Uint32Array(1))[0] / (2**32) > 0.1
      }))
    }, 30000) // Mise à jour toutes les 30 secondes

    return () => clearInterval(interval)
  }, [])

  const startIntervention = () => {
    setInterventionData(prev => ({ 
      ...prev, 
      startTime: new Date(),
      status: 'in_progress'
    }))
    setIsTimerRunning(true)
    setCurrentStep(1)
  }

  const finishIntervention = () => {
    setInterventionData(prev => ({ 
      ...prev, 
      endTime: new Date(),
      status: 'completed'
    }))
    setIsTimerRunning(false)
    
    // Générer le rapport final
    const report = {
      ...interventionData,
      duration: formatTime(timer),
      completedAt: new Date().toISOString()
    }
    
    if (onComplete) {
      onComplete(report)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Caméra arrière
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Erreur caméra:', error)
    }
  }

  const takePhoto = (type: 'before' | 'after') => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx!.drawImage(video, 0, 0)
      
      const photoData = {
        id: Date.now(),
        data: canvas.toDataURL('image/jpeg', 0.8),
        timestamp: new Date().toISOString(),
        location: interventionData.location,
        type
      }
      
      setInterventionData(prev => ({
        ...prev,
        [`photos${type === 'before' ? 'Before' : 'After'}`]: [
          ...prev[`photos${type === 'before' ? 'Before' : 'After'}`],
          photoData
        ]
      }))
    }
  }

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const voiceNote = {
          id: Date.now(),
          url: audioUrl,
          duration: recordingDuration,
          timestamp: new Date().toISOString()
        }
        
        setInterventionData(prev => ({
          ...prev,
          voiceNotes: [...prev.voiceNotes, voiceNote]
        }))
        
        setRecordingDuration(0)
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      
      // Timer d'enregistrement
      const recordingTimer = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopVoiceRecording()
        }
        clearInterval(recordingTimer)
      }, 60000) // Max 1 minute
      
    } catch (error) {
      console.error('Erreur enregistrement:', error)
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Arrêter le stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const addTask = (task: string) => {
    if (task.trim()) {
      setInterventionData(prev => ({
        ...prev,
        tasksPerformed: [...prev.tasksPerformed, task]
      }))
    }
  }

  const removeTask = (index: number) => {
    setInterventionData(prev => ({
      ...prev,
      tasksPerformed: prev.tasksPerformed.filter((_, i) => i !== index)
    }))
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 max-w-md mx-auto relative">
      {/* Status Bar Mobile */}
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span>9:41</span>
          <div className="flex items-center space-x-1">
            <Signal className="h-3 w-3" />
            <span>{deviceStatus.signal}/4</span>
          </div>
          {deviceStatus.wifi && <Wifi className="h-3 w-3" />}
        </div>
        
        <div className="flex items-center space-x-2">
          {deviceStatus.gps && <Navigation className="h-3 w-3 text-green-400" />}
          <div className="flex items-center space-x-1">
            <Battery className="h-3 w-3" />
            <span>{deviceStatus.battery}%</span>
          </div>
        </div>
      </div>

      {/* Header App */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold">IT Vision Tech</h1>
            <p className="text-blue-100 text-sm">Intervention Mobile</p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold">{formatTime(timer)}</div>
            <div className="text-blue-100 text-xs">
              {isTimerRunning ? 'EN COURS' : 'ARRÊTÉ'}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= currentStep ? 'bg-white text-blue-600' : 'bg-blue-400 text-blue-100'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs mt-1 text-center">{step.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4 pb-20">
        {/* Étape 0: Démarrage */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Nouvelle Intervention</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site client</label>
                  <input
                    type="text"
                    value={interventionData.site}
                    onChange={(e) => setInterventionData(prev => ({ ...prev, site: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom du site d'intervention"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact client</label>
                  <input
                    type="text"
                    value={interventionData.client.name}
                    onChange={(e) => setInterventionData(prev => ({ 
                      ...prev, 
                      client: { ...prev.client, name: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom du contact sur site"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={interventionData.client.phone}
                    onChange={(e) => setInterventionData(prev => ({ 
                      ...prev, 
                      client: { ...prev.client, phone: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+221 XX XXX XX XX"
                  />
                </div>
                
                {interventionData.location && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-800">
                      <MapPin className="h-5 w-5" />
                      <span className="font-medium">Position GPS confirmée</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">{interventionData.location.address}</p>
                  </div>
                )}
              </div>
              
              <button
                onClick={startIntervention}
                disabled={!interventionData.site || !interventionData.client.name}
                className="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Play className="h-5 w-5 mr-2" />
                Commencer l'intervention
              </button>
            </div>
          </div>
        )}

        {/* Étape 1: Diagnostic */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Diagnostic Initial</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de problème</label>
                  <select
                    value={interventionData.problemType}
                    onChange={(e) => setInterventionData(prev => ({ ...prev, problemType: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="maintenance_preventive">Maintenance préventive</option>
                    <option value="panne_camera">Panne caméra</option>
                    <option value="probleme_reseau">Problème réseau</option>
                    <option value="nvr_defaillant">NVR défaillant</option>
                    <option value="cablage">Problème câblage</option>
                    <option value="alimentation">Problème alimentation</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observations</label>
                  <textarea
                    value={interventionData.observations}
                    onChange={(e) => setInterventionData(prev => ({ ...prev, observations: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Décrivez l'état initial du système, les symptômes observés..."
                  />
                </div>
                
                {/* Enregistrement vocal */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">Note vocale</span>
                    <span className="text-sm text-gray-500">
                      {isRecording ? `${recordingDuration}s` : 'Prêt'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      className={`p-3 rounded-full ${
                        isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                    
                    <div className="flex-1">
                      {isRecording ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-red-600 font-medium">Enregistrement...</span>
                        </div>
                      ) : (
                        <span className="text-gray-600">Appuyez pour enregistrer</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Liste des notes vocales */}
                  {interventionData.voiceNotes.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {interventionData.voiceNotes.map((note, index) => (
                        <div key={note.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                          <button className="p-2 bg-blue-100 text-blue-600 rounded-full">
                            <Play className="h-4 w-4" />
                          </button>
                          <div className="flex-1">
                            <div className="text-sm font-medium">Note {index + 1}</div>
                            <div className="text-xs text-gray-500">{note.duration}s</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Étape 2: Photos Avant */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Photos AVANT intervention</h2>
              
              {/* Caméra */}
              <div className="mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black"
                  style={{ aspectRatio: '4/3' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => takePhoto('before')}
                    className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <Camera className="h-8 w-8" />
                  </button>
                </div>
              </div>
              
              {/* Galerie photos */}
              {interventionData.photosBefore.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Photos prises ({interventionData.photosBefore.length})</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {interventionData.photosBefore.map((photo) => (
                      <div key={photo.id} className="relative">
                        <img
                          src={photo.data}
                          alt="Avant intervention"
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setInterventionData(prev => ({
                              ...prev,
                              photosBefore: prev.photosBefore.filter(p => p.id !== photo.id)
                            }))
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={startCamera}
                className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg"
              >
                Activer la caméra
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: Intervention */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tâches d'intervention</h2>
              
              {/* Liste des tâches */}
              <div className="space-y-3 mb-6">
                {interventionData.tasksPerformed.map((task, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="flex-1">{task}</span>
                    <button
                      onClick={() => removeTask(index)}
                      className="text-red-600 hover:bg-red-100 p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Ajout rapide de tâches */}
              <div className="space-y-2 mb-6">
                <h3 className="font-medium text-gray-900">Tâches courantes</h3>
                {[
                  'Nettoyage caméras',
                  'Vérification câblage',
                  'Test enregistrement',
                  'Mise à jour firmware',
                  'Réglage angles',
                  'Test réseau'
                ].map((task) => (
                  <button
                    key={task}
                    onClick={() => addTask(task)}
                    className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    + {task}
                  </button>
                ))}
              </div>
              
              {/* Tâche personnalisée */}
              <div>
                <input
                  type="text"
                  placeholder="Ajouter une tâche personnalisée..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTask(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Autres étapes similaires... */}
        {currentStep >= 4 && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Étape en développement</h2>
            <p className="text-gray-600">Cette fonctionnalité sera complétée prochainement</p>
          </div>
        )}
      </div>

      {/* Navigation mobile fixe */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Précédent</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`p-3 rounded-full ${
                isTimerRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isTimerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          </div>
          
          <button
            onClick={currentStep === steps.length - 1 ? finishIntervention : nextStep}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <span>{currentStep === steps.length - 1 ? 'Terminer' : 'Suivant'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}