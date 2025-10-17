'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, User, Settings, Plus, Filter, Search, CheckCircle, AlertCircle, Users, Zap, Wrench, Camera, Lock, Home, Flame, Cable } from 'lucide-react'

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
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: string
  urgency: boolean
}

const DynamicSchedulingSystem = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'technicians'>('calendar')
  const [filterService, setFilterService] = useState<string>('all')
  const [filterZone, setFilterZone] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)

  // Données de démonstration
  useEffect(() => {
    const mockTechnicians: Technician[] = [
      {
        id: 'tech-001',
        name: 'Moussa Diop',
        email: 'moussa@itvision.sn',
        phone: '+221 77 123 45 67',
        skills: ['videosurveillance', 'network_cabling', 'fiber_optic'],
        zone: 'Dakar-Centre',
        availability: {
          '2024-01-15': { morning: true, afternoon: true, evening: false },
          '2024-01-16': { morning: true, afternoon: false, evening: false },
          '2024-01-17': { morning: false, afternoon: true, evening: true }
        },
        currentLoad: 65,
        rating: 4.8,
        specialties: ['Installation', 'Maintenance', 'Dépannage']
      },
      {
        id: 'tech-002',
        name: 'Fatou Sall',
        email: 'fatou@itvision.sn',
        phone: '+221 77 234 56 78',
        skills: ['controle_acces', 'domotique', 'securite_incendie'],
        zone: 'Almadies',
        availability: {
          '2024-01-15': { morning: true, afternoon: true, evening: true },
          '2024-01-16': { morning: true, afternoon: true, evening: false },
          '2024-01-17': { morning: true, afternoon: true, evening: true }
        },
        currentLoad: 40,
        rating: 4.9,
        specialties: ['Configuration', 'Formation', 'Support']
      },
      {
        id: 'tech-003',
        name: 'Amadou Ba',
        email: 'amadou@itvision.sn',
        phone: '+221 77 345 67 89',
        skills: ['videosurveillance', 'controle_acces', 'maintenance'],
        zone: 'Pikine',
        availability: {
          '2024-01-15': { morning: false, afternoon: true, evening: true },
          '2024-01-16': { morning: true, afternoon: true, evening: true },
          '2024-01-17': { morning: true, afternoon: false, evening: true }
        },
        currentLoad: 80,
        rating: 4.7,
        specialties: ['Réparation', 'Diagnostic', 'Urgences']
      }
    ]

    const mockInterventions: Intervention[] = [
      {
        id: 'int-001',
        title: 'Installation système vidéosurveillance',
        description: 'Installation complète 8 caméras IP + NVR',
        client: {
          name: 'SARL TechnoPlus',
          address: 'Rue 10, Mermoz, Dakar',
          phone: '+221 33 123 45 67',
          zone: 'Dakar-Centre'
        },
        service: 'videosurveillance',
        priority: 'high',
        estimatedDuration: 6,
        requiredSkills: ['videosurveillance', 'network_cabling'],
        status: 'pending',
        createdAt: '2024-01-14T10:00:00Z',
        urgency: false
      },
      {
        id: 'int-002',
        title: 'Maintenance préventive système accès',
        description: 'Vérification et mise à jour lecteurs RFID',
        client: {
          name: 'Résidence Les Palmiers',
          address: 'VDN, Almadies, Dakar',
          phone: '+221 77 987 65 43',
          zone: 'Almadies'
        },
        service: 'controle_acces',
        priority: 'medium',
        estimatedDuration: 3,
        requiredSkills: ['controle_acces'],
        status: 'pending',
        createdAt: '2024-01-14T14:30:00Z',
        urgency: false
      },
      {
        id: 'int-003',
        title: 'Dépannage urgent caméra défaillante',
        description: 'Caméra principale entrée ne fonctionne plus',
        client: {
          name: 'Banque Atlantique',
          address: 'Avenue Cheikh Anta Diop, Dakar',
          phone: '+221 33 456 78 90',
          zone: 'Dakar-Centre'
        },
        service: 'videosurveillance',
        priority: 'urgent',
        estimatedDuration: 2,
        requiredSkills: ['videosurveillance'],
        status: 'pending',
        createdAt: '2024-01-15T08:15:00Z',
        urgency: true
      }
    ]

    setTechnicians(mockTechnicians)
    setInterventions(mockInterventions)
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

  // Algorithme d'affectation automatique
  const findBestTechnician = (intervention: Intervention): Technician | null => {
    const availableTechnicians = technicians.filter(tech => {
      // Vérifier les compétences requises
      const hasRequiredSkills = intervention.requiredSkills.every(skill => 
        tech.skills.includes(skill)
      )
      
      // Vérifier la zone (priorité aux techniciens de la même zone)
      const sameZone = tech.zone === intervention.client.zone
      
      // Vérifier la charge de travail (ne pas dépasser 90%)
      const notOverloaded = tech.currentLoad < 90
      
      return hasRequiredSkills && notOverloaded
    })

    if (availableTechnicians.length === 0) return null

    // Scoring pour choisir le meilleur technicien
    const scoredTechnicians = availableTechnicians.map(tech => {
      let score = 0
      
      // Bonus pour la même zone
      if (tech.zone === intervention.client.zone) score += 30
      
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

  const autoAssignIntervention = (intervention: Intervention) => {
    const bestTechnician = findBestTechnician(intervention)
    
    if (bestTechnician) {
      // Mettre à jour l'intervention
      setInterventions(prev => prev.map(int => 
        int.id === intervention.id 
          ? { 
              ...int, 
              assignedTechnician: bestTechnician.id,
              status: 'scheduled',
              scheduledDate: selectedDate,
              scheduledTime: '09:00'
            }
          : int
      ))

      // Mettre à jour la charge du technicien
      setTechnicians(prev => prev.map(tech => 
        tech.id === bestTechnician.id 
          ? { ...tech, currentLoad: tech.currentLoad + (intervention.estimatedDuration * 10) }
          : tech
      ))

      alert(`✅ Intervention assignée à ${bestTechnician.name}`)
    } else {
      alert('❌ Aucun technicien disponible avec les compétences requises')
    }
  }

  const filteredInterventions = interventions.filter(intervention => {
    const matchesService = filterService === 'all' || intervention.service === filterService
    const matchesZone = filterZone === 'all' || intervention.client.zone === filterZone
    const matchesSearch = searchTerm === '' || 
      intervention.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intervention.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesService && matchesZone && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planification Dynamique</h1>
            <p className="text-gray-600">Gestion intelligente des interventions et affectation automatique</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Calendrier
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('technicians')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'technicians' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Techniciens
            </button>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une intervention..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
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

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex-1 p-6">
        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Interventions en attente ({filteredInterventions.filter(i => i.status === 'pending').length})
              </h2>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                <Plus className="h-4 w-4 inline mr-2" />
                Nouvelle intervention
              </button>
            </div>

            <div className="grid gap-4">
              {filteredInterventions.map(intervention => {
                const ServiceIcon = getServiceIcon(intervention.service)
                const assignedTech = technicians.find(t => t.id === intervention.assignedTechnician)
                
                return (
                  <div key={intervention.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <ServiceIcon className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{intervention.title}</h3>
                            <p className="text-sm text-gray-600">{intervention.client.name}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(intervention.priority)}`}>
                            {intervention.priority.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{intervention.client.zone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{intervention.estimatedDuration}h estimées</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{assignedTech ? assignedTech.name : 'Non assigné'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {intervention.status === 'pending' ? (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            <span className="capitalize">{intervention.status}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {intervention.requiredSkills.map(skill => (
                            <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {services.find(s => s.id === skill)?.name || skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {intervention.status === 'pending' && (
                          <button
                            onClick={() => autoAssignIntervention(intervention)}
                            className="bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
                          >
                            <Zap className="h-4 w-4" />
                            <span>Auto-assigner</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedIntervention(intervention)
                            setShowAssignmentModal(true)
                          }}
                          className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Modifier</span>
                        </button>
                      </div>
                    </div>
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
                            <p className="text-sm text-gray-600">{assignedTech?.name} • {intervention.client.zone}</p>
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
                              {intervention.client.name} • {intervention.client.zone}
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
  )
}

export default DynamicSchedulingSystem
