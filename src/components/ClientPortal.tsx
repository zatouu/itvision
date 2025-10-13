'use client'

import { useState } from 'react'
import { User, FileText, Calendar, Settings, Bell, Download, Eye, CheckCircle, Clock, AlertTriangle, Zap, Lock, LogIn } from 'lucide-react'

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState('projects')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')

  // Données simulées client
  const clientData = {
    name: "Amadou Ba",
    company: "IT Solutions SARL",
    email: "amadou.ba@itsolutions.sn",
    phone: "+221 77 123 45 67",
    clientId: "CLT-2024-001"
  }

  const projects = [
    {
      id: "PRJ-001",
      name: "Installation vidéosurveillance siège",
      status: "completed",
      progress: 100,
      startDate: "2024-01-15",
      endDate: "2024-01-20",
      value: "2,450,000 FCFA",
      equipment: ["16 Caméras IP 4K", "NVR 32 canaux", "Switch PoE 24 ports"],
      technician: "Moussa Diop",
      warranty: "2 ans"
    },
    {
      id: "PRJ-002", 
      name: "Maintenance préventive Q1",
      status: "in_progress",
      progress: 75,
      startDate: "2024-02-01",
      endDate: "2024-02-15",
      value: "180,000 FCFA",
      equipment: ["Nettoyage caméras", "Vérification NVR", "Mise à jour firmware"],
      technician: "Ibrahima Sall",
      nextVisit: "2024-02-10"
    },
    {
      id: "PRJ-003",
      name: "Extension contrôle d'accès",
      status: "pending",
      progress: 0,
      startDate: "2024-03-01",
      endDate: "2024-03-10",
      value: "890,000 FCFA",
      equipment: ["3 Terminaux biométriques", "Serrures magnétiques", "Logiciel gestion"],
      technician: "À assigner"
    }
  ]

  const documents = [
    {
      id: "DOC-001",
      name: "Devis installation vidéosurveillance",
      type: "Devis",
      date: "2024-01-10",
      size: "245 KB",
      status: "signed"
    },
    {
      id: "DOC-002",
      name: "Facture PRJ-001",
      type: "Facture",
      date: "2024-01-25",
      size: "128 KB", 
      status: "paid"
    },
    {
      id: "DOC-003",
      name: "Manuel utilisateur NVR",
      type: "Documentation",
      date: "2024-01-20",
      size: "1.2 MB",
      status: "available"
    },
    {
      id: "DOC-004",
      name: "Certificat de garantie",
      type: "Garantie",
      date: "2024-01-20",
      size: "98 KB",
      status: "active"
    }
  ]

  const appointments = [
    {
      id: "RDV-001",
      title: "Maintenance préventive mensuelle",
      date: "2024-02-10",
      time: "09:00",
      technician: "Ibrahima Sall",
      type: "maintenance",
      status: "confirmed"
    },
    {
      id: "RDV-002",
      title: "Formation utilisateurs",
      date: "2024-02-15",
      time: "14:00",
      technician: "Moussa Diop",
      type: "formation",
      status: "pending"
    },
    {
      id: "RDV-003",
      title: "Audit sécurité trimestriel",
      date: "2024-03-01",
      time: "10:00",
      technician: "À confirmer",
      type: "audit",
      status: "scheduled"
    }
  ]

  const notifications = [
    {
      id: "NOTIF-001",
      message: "Maintenance préventive programmée pour le 10/02",
      type: "info",
      date: "2024-02-05",
      read: false
    },
    {
      id: "NOTIF-002",
      message: "Facture PRJ-001 disponible pour téléchargement",
      type: "success",
      date: "2024-01-25",
      read: true
    },
    {
      id: "NOTIF-003",
      message: "Mise à jour firmware disponible pour vos caméras",
      type: "warning",
      date: "2024-02-01",
      read: false
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'confirmed': return 'text-green-600 bg-green-100'
      case 'scheduled': return 'text-blue-600 bg-blue-100'
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    
    // Simulation de login simple (en réalité, cela devrait appeler une API)
    if (loginForm.email && loginForm.password) {
      if (loginForm.email === 'demo@client.com' && loginForm.password === 'demo123') {
        setIsLoggedIn(true)
      } else {
        setLoginError('Email ou mot de passe incorrect')
      }
    } else {
      setLoginError('Veuillez remplir tous les champs')
    }
  }

  // Si pas connecté, afficher le formulaire de login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Portail Client</h1>
            <p className="text-gray-600">Connectez-vous pour accéder à vos projets</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="votre.email@exemple.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Se connecter
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 mb-2">
              <strong>Démonstration :</strong>
            </p>
            <p className="text-xs text-blue-600">
              Email : demo@client.com<br />
              Mot de passe : demo123
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Problème de connexion ?{' '}
              <a 
                href="https://wa.me/221774133440?text=Bonjour, j'ai besoin d'aide pour accéder à mon portail client"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Contactez-nous
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Portail Client</h2>
              <p className="text-purple-100">Bienvenue, {clientData.name}</p>
              <p className="text-sm text-purple-200">{clientData.company} • ID: {clientData.clientId}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white/20 rounded-lg p-3">
              <p className="text-sm">Dernière connexion</p>
              <p className="font-semibold">Aujourd'hui, 14:30</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'projects', label: 'Mes Projets', icon: Zap },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'appointments', label: 'Rendez-vous', icon: Calendar },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'settings', label: 'Paramètres', icon: Settings }
          ].map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
                {tab.id === 'notifications' && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="p-6">
        {/* Onglet Projets */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Mes Projets</h3>
              <div className="flex space-x-3">
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  1 Terminé
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  1 En cours
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  1 En attente
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{project.name}</h4>
                      <p className="text-sm text-gray-500">Projet {project.id}</p>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      <span className="capitalize">{project.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progression</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valeur :</span>
                      <span className="font-semibold text-emerald-600">{project.value}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Période :</span>
                      <span>{new Date(project.startDate).toLocaleDateString('fr-FR')} - {new Date(project.endDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Technicien :</span>
                      <span className="font-medium">{project.technician}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Équipements :</h5>
                    <div className="space-y-1">
                      {project.equipment.map((item, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {project.warranty && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
                      🛡️ Garantie : {project.warranty}
                    </div>
                  )}

                  {project.nextVisit && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                      📅 Prochaine visite : {new Date(project.nextVisit).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglet Documents */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Mes Documents</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      doc.status === 'signed' ? 'bg-green-100 text-green-800' :
                      doc.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.status}
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-2">{doc.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{doc.type} • {doc.size}</p>
                  <p className="text-xs text-gray-500 mb-3">{new Date(doc.date).toLocaleDateString('fr-FR')}</p>
                  
                  <div className="flex space-x-2">
                    <button className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 transition-colors">
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

        {/* Onglet Rendez-vous */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Mes Rendez-vous</h3>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Nouveau RDV
              </button>
            </div>
            
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(appointment.date).toLocaleDateString('fr-FR')} à {appointment.time}
                        </p>
                        <p className="text-sm text-gray-500">Technicien: {appointment.technician}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </div>
                      <button className="text-purple-600 hover:text-purple-800 transition-colors">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglet Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Notifications</h3>
            
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className={`p-4 rounded-lg border ${
                  notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.type === 'info' ? 'bg-blue-100' :
                        notification.type === 'success' ? 'bg-green-100' :
                        'bg-yellow-100'
                      }`}>
                        <Bell className={`h-4 w-4 ${
                          notification.type === 'info' ? 'text-blue-600' :
                          notification.type === 'success' ? 'text-green-600' :
                          'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-gray-900">{notification.message}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(notification.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglet Paramètres */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Paramètres du compte</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Informations personnelles</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                    <input 
                      type="text" 
                      value={clientData.name}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      value={clientData.email}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                    <input 
                      type="tel" 
                      value={clientData.phone}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Préférences</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" defaultChecked />
                    <span className="text-sm text-gray-700">Notifications par email</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" defaultChecked />
                    <span className="text-sm text-gray-700">Rappels de maintenance</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" />
                    <span className="text-sm text-gray-700">Newsletter technique</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Sauvegarder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}