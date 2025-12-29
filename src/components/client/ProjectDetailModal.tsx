'use client'

import { useState, useEffect } from 'react'
import { 
  X, Calendar, MapPin, DollarSign, Users, Clock, Target,
  CheckCircle2, Circle, AlertCircle, FileText, Download,
  MessageCircle, TrendingUp, Wrench, Package
} from 'lucide-react'

interface Milestone {
  _id: string
  title: string
  description?: string
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed'
  progress?: number
}

interface Document {
  _id: string
  name: string
  type: string
  url: string
  size?: number
  uploadDate: string
}

interface TimelineEvent {
  type: string
  title: string
  description?: string
  date: string
  clientVisible: boolean
}

interface Project {
  _id: string
  name: string
  description?: string
  status: string
  progress: number
  startDate: string
  endDate?: string
  budget?: number
  address: string
  currentPhase?: string
  serviceType?: string
  milestones?: Milestone[]
  documents?: Document[]
  timeline?: TimelineEvent[]
  assignedTechnicians?: any[]
}

interface ProjectDetailModalProps {
  projectId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function ProjectDetailModal({ projectId, isOpen, onClose }: ProjectDetailModalProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents' | 'team'>('overview')

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDetails()
    }
  }, [isOpen, projectId])

  const fetchProjectDetails = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/summary`)
      const data = await res.json()
      if (data.success) {
        setProject(data.project)
      }
    } catch (error) {
      console.error('Erreur chargement projet:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'planning': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé'
      case 'in_progress': return 'En cours'
      case 'planning': return 'Planification'
      case 'on_hold': return 'En pause'
      default: return status
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 right-0 max-w-full flex">
          <div className="w-screen max-w-4xl">
            <div className="h-full flex flex-col bg-white shadow-xl">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">
                      {loading ? 'Chargement...' : project?.name}
                    </h2>
                    {project && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                          {getStatusLabel(project.status)}
                        </span>
                        {project.currentPhase && (
                          <span className="text-emerald-100 text-sm">• {project.currentPhase}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex gap-1">
                  {[
                    { id: 'overview', label: 'Vue d\'ensemble', icon: Target },
                    { id: 'timeline', label: 'Timeline', icon: Clock },
                    { id: 'documents', label: 'Documents', icon: FileText },
                    { id: 'team', label: 'Équipe', icon: Users }
                  ].map(tab => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                          activeTab === tab.id
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                  </div>
                ) : project && (
                  <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Progress */}
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Progression Globale</h3>
                            <span className="text-3xl font-bold text-emerald-600">{project.progress}%</span>
                          </div>
                          <div className="bg-white rounded-full h-4 overflow-hidden shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500 rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Infos principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="text-sm font-medium text-gray-600">Dates</div>
                            </div>
                            <div className="text-sm text-gray-900">
                              <div>Début: {new Date(project.startDate).toLocaleDateString('fr-FR')}</div>
                              {project.endDate && (
                                <div>Fin: {new Date(project.endDate).toLocaleDateString('fr-FR')}</div>
                              )}
                            </div>
                          </div>

                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <DollarSign className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="text-sm font-medium text-gray-600">Budget</div>
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {project.budget ? `${(project.budget / 1000).toFixed(0)}K FCFA` : 'Non défini'}
                            </div>
                          </div>

                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <MapPin className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="text-sm font-medium text-gray-600">Lieu</div>
                            </div>
                            <div className="text-sm text-gray-900">{project.address}</div>
                          </div>

                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <Package className="h-5 w-5 text-orange-600" />
                              </div>
                              <div className="text-sm font-medium text-gray-600">Type de service</div>
                            </div>
                            <div className="text-sm text-gray-900">{project.serviceType || 'N/A'}</div>
                          </div>
                        </div>

                        {/* Description */}
                        {project.description && (
                          <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                            <p className="text-gray-700 leading-relaxed">{project.description}</p>
                          </div>
                        )}

                        {/* Milestones */}
                        {project.milestones && project.milestones.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Jalons du Projet</h3>
                            <div className="space-y-3">
                              {project.milestones.map((milestone, idx) => (
                                <div 
                                  key={milestone._id}
                                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                                >
                                  <div className="mt-1">
                                    {milestone.status === 'completed' ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : milestone.status === 'in_progress' ? (
                                      <Circle className="h-5 w-5 text-blue-600 fill-current" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{milestone.title}</div>
                                    {milestone.description && (
                                      <div className="text-sm text-gray-600 mt-1">{milestone.description}</div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-2">
                                      Échéance: {new Date(milestone.dueDate).toLocaleDateString('fr-FR')}
                                    </div>
                                  </div>
                                  {milestone.progress !== undefined && (
                                    <div className="text-sm font-semibold text-emerald-600">
                                      {milestone.progress}%
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timeline Tab */}
                    {activeTab === 'timeline' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique du Projet</h3>
                        {project.timeline && project.timeline.length > 0 ? (
                          <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                            {project.timeline
                              .filter(event => event.clientVisible)
                              .map((event, idx) => (
                                <div key={idx} className="relative flex gap-4 mb-6">
                                  <div className="relative z-10 flex-shrink-0">
                                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                      <div className="w-3 h-3 bg-white rounded-full"></div>
                                    </div>
                                  </div>
                                  <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                      <span className="text-xs text-gray-500">
                                        {new Date(event.date).toLocaleDateString('fr-FR')}
                                      </span>
                                    </div>
                                    {event.description && (
                                      <p className="text-sm text-gray-600">{event.description}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Aucun événement dans la timeline</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Documents Tab */}
                    {activeTab === 'documents' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents du Projet</h3>
                        {project.documents && project.documents.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {project.documents.map(doc => (
                              <div 
                                key={doc._id}
                                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(doc.uploadDate).toLocaleDateString('fr-FR')}
                                      {doc.size && ` • ${(doc.size / 1024).toFixed(0)} KB`}
                                    </p>
                                  </div>
                                  <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                                    <Download className="h-4 w-4 text-gray-600" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Aucun document disponible</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Team Tab */}
                    {activeTab === 'team' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Équipe Assignée</h3>
                        {project.assignedTechnicians && project.assignedTechnicians.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {project.assignedTechnicians.map((tech: any) => (
                              <div 
                                key={tech.id}
                                className="bg-white border border-gray-200 rounded-xl p-4"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {tech.name?.charAt(0).toUpperCase() || 'T'}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                                    <p className="text-sm text-gray-600">{tech.email}</p>
                                    {tech.phone && (
                                      <p className="text-xs text-gray-500 mt-1">{tech.phone}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Aucun technicien assigné</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition"
                  >
                    Fermer
                  </button>
                  <button className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition">
                    <MessageCircle className="h-4 w-4 inline mr-2" />
                    Contacter l'équipe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}





