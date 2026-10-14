'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Calendar, 
  FileText, 
  Camera, 
  Shield, 
  Settings, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MessageCircle,
  Phone,
  MapPin,
  Zap,
  Bell,
  LogOut,
  ChevronRight,
  Play,
  Pause,
  Wrench,
  Star,
  TrendingUp
} from 'lucide-react'

interface PersonalizedProjectPortalProps {
  projectId: string
  accessCode: string
  onLogout: () => void
}

export default function PersonalizedProjectPortal({ projectId, accessCode, onLogout }: PersonalizedProjectPortalProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [projectData, setProjectData] = useState<any>(null)

  // Données simulées spécifiques par projet
  const projectsDatabase = {
    'PRJ-001': {
      client: {
        name: "Amadou Ba",
        company: "IT Solutions SARL", 
        email: "amadou.ba@itsolutions.sn",
        phone: "+221 77 123 45 67",
        address: "Parcelles Assainies, Unité 25, Dakar"
      },
      project: {
        title: "Installation vidéosurveillance siège",
        description: "Système complet de vidéosurveillance 16 caméras 4K avec NVR et monitoring",
        status: "completed",
        progress: 100,
        startDate: "2024-01-15",
        endDate: "2024-01-20",
        value: "2,450,000 FCFA",
        technician: "Moussa Diop",
        warranty: "2 ans",
        type: "Vidéosurveillance"
      },
      equipment: [
        {
          category: "Caméras",
          items: [
            { name: "Caméra IP 4K Hikvision DS-2CD2143G2-I", quantity: 16, status: "Installé", location: "Périmètre extérieur" },
            { name: "Caméra PTZ Hikvision DS-2DE4A425IW-DE", quantity: 2, status: "Installé", location: "Entrées principales" }
          ]
        },
        {
          category: "Enregistrement",
          items: [
            { name: "NVR 32 canaux Hikvision DS-7732NI-I4", quantity: 1, status: "Configuré", location: "Local technique" },
            { name: "Disque dur WD Purple 8TB", quantity: 4, status: "Installé", location: "NVR" }
          ]
        },
        {
          category: "Réseau",
          items: [
            { name: "Switch PoE 24 ports", quantity: 1, status: "Configuré", location: "Local technique" },
            { name: "Écran monitoring 32\"", quantity: 2, status: "Installé", location: "Poste sécurité" }
          ]
        }
      ],
      timeline: [
        { date: "2024-01-15", event: "Début d'installation", status: "completed", details: "Équipe technique arrivée sur site" },
        { date: "2024-01-16", event: "Installation caméras extérieures", status: "completed", details: "16 caméras IP 4K installées" },
        { date: "2024-01-17", event: "Configuration NVR", status: "completed", details: "Paramétrage et tests enregistrement" },
        { date: "2024-01-18", event: "Installation réseau", status: "completed", details: "Câblage et switch PoE configuré" },
        { date: "2024-01-19", event: "Tests et formation", status: "completed", details: "Formation équipe sécurité" },
        { date: "2024-01-20", event: "Livraison finale", status: "completed", details: "Système opérationnel 24h/24" }
      ],
      documents: [
        { name: "Devis détaillé", type: "PDF", size: "245 KB", date: "2024-01-10", status: "signed" },
        { name: "Plan d'installation", type: "PDF", size: "1.2 MB", date: "2024-01-12", status: "approved" },
        { name: "Facture finale", type: "PDF", size: "128 KB", date: "2024-01-25", status: "paid" },
        { name: "Manuel utilisateur", type: "PDF", size: "2.1 MB", date: "2024-01-20", status: "available" },
        { name: "Certificat de garantie", type: "PDF", size: "98 KB", date: "2024-01-20", status: "active" }
      ],
      maintenance: {
        nextVisit: "2024-04-15",
        frequency: "Trimestrielle",
        contract: "Maintenance Premium",
        lastVisit: "2024-01-25",
        technicianContact: "+221 77 413 34 40"
      },
      monitoring: {
        systemStatus: "Opérationnel",
        camerasOnline: 18,
        camerasTotal: 18,
        diskSpace: 78,
        lastBackup: "2024-02-08 03:00",
        alerts: []
      }
    },
    'PRJ-002': {
      client: {
        name: "Aïssatou Diop",
        company: "Commerce Plus",
        email: "aissatou@commerceplus.sn",
        phone: "+221 77 234 56 78",
        address: "Plateau, Avenue Pompidou, Dakar"
      },
      project: {
        title: "Maintenance préventive Q1",
        description: "Maintenance trimestrielle du système de sécurité existant",
        status: "in_progress",
        progress: 75,
        startDate: "2024-02-01",
        endDate: "2024-02-15",
        value: "180,000 FCFA",
        technician: "Ibrahima Sall",
        type: "Maintenance"
      },
      equipment: [
        {
          category: "Système existant",
          items: [
            { name: "Caméras IP", quantity: 12, status: "Vérifiées", location: "Divers" },
            { name: "NVR 16 canaux", quantity: 1, status: "Maintenance en cours", location: "Bureau" }
          ]
        }
      ],
      timeline: [
        { date: "2024-02-01", event: "Début maintenance", status: "completed", details: "Diagnostic initial" },
        { date: "2024-02-05", event: "Nettoyage caméras", status: "completed", details: "12 caméras nettoyées" },
        { date: "2024-02-08", event: "Mise à jour firmware", status: "in_progress", details: "En cours..." },
        { date: "2024-02-12", event: "Tests système", status: "pending", details: "À venir" },
        { date: "2024-02-15", event: "Rapport final", status: "pending", details: "À venir" }
      ],
      monitoring: {
        systemStatus: "Maintenance",
        camerasOnline: 12,
        camerasTotal: 12,
        diskSpace: 65,
        lastBackup: "2024-02-07 03:00",
        alerts: [
          { message: "Maintenance en cours", type: "info", date: "2024-02-08" }
        ]
      }
    }
  }

  useEffect(() => {
    const data = projectsDatabase[projectId as keyof typeof projectsDatabase]
    if (data) {
      setProjectData(data)
    }
  }, [projectId])

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre projet...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100' 
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'pending': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header personnalisé */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">IT Vision</span>
              </div>
              <div className="hidden md:block h-6 w-px bg-gray-300"></div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900">{projectData.project.title}</h1>
                <p className="text-sm text-gray-500">Projet {projectId}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{projectData.client.name}</p>
                <p className="text-xs text-gray-500">{projectData.client.company}</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:block">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-gray-200">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: TrendingUp },
              { id: 'timeline', label: 'Suivi projet', icon: Calendar },
              { id: 'equipment', label: 'Équipements', icon: Camera },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'monitoring', label: 'Monitoring', icon: Zap },
              { id: 'maintenance', label: 'Maintenance', icon: Wrench }
            ].map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenu selon l'onglet */}
        <div className="space-y-6">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Statut projet */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Aperçu du projet</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Informations générales</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Statut :</span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(projectData.project.status)}`}>
                          {getStatusIcon(projectData.project.status)}
                          <span className="capitalize">{projectData.project.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valeur :</span>
                        <span className="font-semibold text-emerald-600">{projectData.project.value}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Technicien :</span>
                        <span className="font-medium">{projectData.project.technician}</span>
                      </div>
                      {projectData.project.warranty && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Garantie :</span>
                          <span className="font-medium text-blue-600">{projectData.project.warranty}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Progression</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Avancement</span>
                          <span>{projectData.project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-emerald-600 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${projectData.project.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Début :</span>
                        <span>{new Date(projectData.project.startDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fin prévue :</span>
                        <span>{new Date(projectData.project.endDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
                
                <div className="space-y-3">
                  <a
                    href={`https://wa.me/221774133440?text=Bonjour, je suis ${projectData.client.name} (Projet ${projectId}). J'ai une question concernant mon projet.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Contacter WhatsApp</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </a>
                  
                  <a
                    href={`tel:+2217774382220`}
                    className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Appeler technicien</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </a>
                  
                  <button className="flex items-center justify-between w-full p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-800">Programmer visite</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Chronologie du projet</h2>
              
              <div className="space-y-6">
                {projectData.timeline.map((event: any, index: number) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      event.status === 'completed' ? 'bg-green-100' :
                      event.status === 'in_progress' ? 'bg-blue-100' :
                      'bg-gray-100'
                    }`}>
                      {getStatusIcon(event.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900">{event.event}</h3>
                        <span className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-sm text-gray-600">{event.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Équipements */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              {projectData.equipment.map((category: any, categoryIndex: number) => (
                <div key={categoryIndex} className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{category.category}</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {category.items.map((item: any, itemIndex: number) => (
                      <div key={itemIndex} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <span className="text-sm text-gray-500">x{item.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.location}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'Installé' || item.status === 'Configuré' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Documents */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Documents du projet</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectData.documents.map((doc: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        doc.status === 'signed' ? 'bg-green-100 text-green-800' :
                        doc.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-2">{doc.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{doc.type} • {doc.size}</p>
                    <p className="text-xs text-gray-500 mb-3">{new Date(doc.date).toLocaleDateString('fr-FR')}</p>
                    
                    <div className="flex space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors">
                        <Eye className="h-3 w-3" />
                        <span>Voir</span>
                      </button>
                      <button className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors">
                        <Download className="h-3 w-3" />
                        <span>Télécharger</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monitoring */}
          {activeTab === 'monitoring' && projectData.monitoring && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">État du système</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Statut global :</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      projectData.monitoring.systemStatus === 'Opérationnel' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {projectData.monitoring.systemStatus}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Caméras en ligne :</span>
                    <span className="font-semibold">
                      {projectData.monitoring.camerasOnline}/{projectData.monitoring.camerasTotal}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Espace disque :</span>
                      <span className="font-semibold">{projectData.monitoring.diskSpace}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          projectData.monitoring.diskSpace > 80 ? 'bg-red-500' : 
                          projectData.monitoring.diskSpace > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${projectData.monitoring.diskSpace}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Dernière sauvegarde :</span>
                    <span className="font-medium text-sm">{projectData.monitoring.lastBackup}</span>
                  </div>
                </div>
              </div>

              {/* Alertes */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Alertes & Notifications</h2>
                
                {projectData.monitoring.alerts.length > 0 ? (
                  <div className="space-y-3">
                    {projectData.monitoring.alerts.map((alert: any, index: number) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-800">{alert.message}</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{alert.date}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">Aucune alerte active</p>
                    <p className="text-sm text-gray-500">Votre système fonctionne parfaitement</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Maintenance */}
          {activeTab === 'maintenance' && projectData.maintenance && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Plan de maintenance</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Informations contrat</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type de contrat :</span>
                      <span className="font-medium text-blue-600">{projectData.maintenance.contract}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fréquence :</span>
                      <span className="font-medium">{projectData.maintenance.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière visite :</span>
                      <span>{new Date(projectData.maintenance.lastVisit).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prochaine visite :</span>
                      <span className="font-semibold text-emerald-600">
                        {new Date(projectData.maintenance.nextVisit).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Contact maintenance</h3>
                  <div className="space-y-3">
                    <a
                      href={`https://wa.me/221774133440?text=Bonjour, je suis ${projectData.client.name} (Projet ${projectId}). Je souhaite programmer une intervention de maintenance.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">WhatsApp Maintenance</span>
                    </a>
                    
                    <a
                      href={`tel:${projectData.maintenance.technicianContact}`}
                      className="flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Phone className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Appel d'urgence</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}