'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  Send, 
  X, 
  User, 
  Building, 
  Calendar, 
  MapPin, 
  Camera, 
  FileText, 
  Filter, 
  Search, 
  Download, 
  Trash2,
  Star,
  MessageCircle,
  Bell,
  Settings,
  Users,
  BarChart3,
  TrendingUp,
  Activity,
  Shield,
  Zap,
  Target,
  RefreshCw,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Archive,
  Upload,
  Plus
} from 'lucide-react'

interface Report {
  id: string
  technicianId: string
  technicianName: string
  clientId: string
  clientName: string
  clientCompany: string
  projectId: string
  interventionDate: string
  site: string
  status: 'draft' | 'pending_validation' | 'validated' | 'rejected' | 'published'
  createdAt: string
  validatedAt?: string
  validatedBy?: string
  rejectionReason?: string
  data: any
  template: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'maintenance' | 'installation' | 'repair' | 'inspection'
}

export default function AdminReportManagement() {
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationComment, setValidationComment] = useState('')
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationAction, setValidationAction] = useState<'approve' | 'reject' | null>(null)

  // Liste des clients pour filtrage
  const clients = [
    { id: 'CLI-001', name: 'IT Solutions SARL', projectIds: ['PRJ-001'] },
    { id: 'CLI-002', name: 'Commerce Plus', projectIds: ['PRJ-002'] },
    { id: 'CLI-003', name: 'Résidence Almadies', projectIds: ['PRJ-003'] },
    { id: 'CLI-004', name: 'Banque Atlantique', projectIds: ['PRJ-004'] },
    { id: 'CLI-005', name: 'Hôtel Terrou-Bi', projectIds: ['PRJ-005'] }
  ]

  // Simulation de rapports en attente
  useEffect(() => {
    setReports([
      {
        id: 'RPT-001',
        technicianId: 'TECH-001',
        technicianName: 'Moussa Diop',
        clientId: 'CLI-001',
        clientName: 'Amadou Ba',
        clientCompany: 'IT Solutions SARL',
        projectId: 'PRJ-001',
        interventionDate: '2024-02-10',
        site: 'Siège Parcelles Assainies',
        status: 'pending_validation',
        createdAt: '2024-02-10T16:30:00Z',
        template: 'maintenance_mensuelle',
        priority: 'medium',
        category: 'maintenance',
        data: {
          duration: '2h30',
          tasksPerformed: [
            'Nettoyage de 16 caméras IP',
            'Vérification système NVR',
            'Test enregistrement 24h',
            'Mise à jour firmware caméras'
          ],
          observations: 'Système opérationnel. Caméra C-07 nécessite réglage angle.',
          photosBefore: 3,
          photosAfter: 3,
          recommendations: [
            'Réajuster angle caméra C-07',
            'Prévoir remplacement disque dur D2 (85% capacité)'
          ]
        }
      },
      {
        id: 'RPT-002',
        technicianId: 'TECH-002',
        technicianName: 'Ibrahima Sall',
        clientId: 'CLI-002',
        clientName: 'Aïssatou Diop',
        clientCompany: 'Commerce Plus',
        projectId: 'PRJ-002',
        interventionDate: '2024-02-11',
        site: 'Magasin Plateau',
        status: 'pending_validation',
        createdAt: '2024-02-11T14:15:00Z',
        template: 'intervention_corrective',
        priority: 'high',
        category: 'repair',
        data: {
          duration: '3h15',
          problemDescription: 'Caméra entrée principale hors service',
          tasksPerformed: [
            'Diagnostic caméra défaillante',
            'Remplacement caméra IP',
            'Reconfiguration NVR',
            'Tests fonctionnels'
          ],
          observations: 'Caméra remplacée suite à défaillance électronique.',
          photosBefore: 2,
          photosAfter: 4,
          recommendations: [
            'Surveillance préventive autres caméras même série',
            'Mise à jour firmware préventive'
          ]
        }
      },
      {
        id: 'RPT-003',
        technicianId: 'TECH-001',
        technicianName: 'Moussa Diop',
        clientId: 'CLI-003',
        clientName: 'Moussa Kébé',
        clientCompany: 'Résidence Almadies',
        projectId: 'PRJ-003',
        interventionDate: '2024-02-09',
        site: 'Résidence Almadies',
        status: 'validated',
        createdAt: '2024-02-09T11:45:00Z',
        validatedAt: '2024-02-09T18:20:00Z',
        validatedBy: 'Admin Principal',
        template: 'maintenance_mensuelle',
        priority: 'low',
        category: 'maintenance',
        data: {
          duration: '1h45',
          tasksPerformed: [
            'Vérification système contrôle d\'accès',
            'Test badges résidents',
            'Nettoyage lecteurs',
            'Mise à jour base de données'
          ]
        }
      },
      {
        id: 'RPT-004',
        technicianId: 'TECH-003',
        technicianName: 'Cheikh Sy',
        clientId: 'CLI-004',
        clientName: 'Fatou Sarr',
        clientCompany: 'Banque Atlantique',
        projectId: 'PRJ-004',
        interventionDate: '2024-02-12',
        site: 'Agence Point E',
        status: 'rejected',
        createdAt: '2024-02-12T09:30:00Z',
        validatedAt: '2024-02-12T15:45:00Z',
        validatedBy: 'Admin Principal',
        rejectionReason: 'Photos insuffisantes - Manque photos après intervention sur caméra extérieure',
        template: 'maintenance_mensuelle',
        priority: 'medium',
        category: 'maintenance',
        data: {
          duration: '2h00',
          tasksPerformed: [
            'Maintenance préventive 8 caméras',
            'Vérification système alarme'
          ],
          photosBefore: 4,
          photosAfter: 2 // Insuffisant
        }
      }
    ])
  }, [])

  const filteredReports = reports.filter(report => {
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus
    const matchesClient = filterClient === 'all' || report.clientId === filterClient
    const matchesSearch = report.clientCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.site.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesClient && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_validation': return 'bg-yellow-100 text-yellow-800'
      case 'validated': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'published': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_validation': return <Clock className="h-4 w-4" />
      case 'validated': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <X className="h-4 w-4" />
      case 'published': return <Send className="h-4 w-4" />
      case 'draft': return <Edit3 className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const handleValidation = async (action: 'approve' | 'reject') => {
    if (!selectedReport) return

    setIsValidating(true)
    
    // Simulation API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    const updatedReport = {
      ...selectedReport,
      status: action === 'approve' ? 'validated' as const : 'rejected' as const,
      validatedAt: new Date().toISOString(),
      validatedBy: 'Admin Principal',
      ...(action === 'reject' && { rejectionReason: validationComment })
    }

    setReports(prev => prev.map(r => r.id === selectedReport.id ? updatedReport : r))
    
    // Si approuvé, publier automatiquement au client
    if (action === 'approve') {
      setTimeout(() => {
        setReports(prev => prev.map(r => 
          r.id === selectedReport.id 
            ? { ...r, status: 'published' as const }
            : r
        ))
      }, 1000)
    }

    setIsValidating(false)
    setShowValidationModal(false)
    setValidationComment('')
    setSelectedReport(null)
  }

  const openValidationModal = (report: Report, action: 'approve' | 'reject') => {
    setSelectedReport(report)
    setValidationAction(action)
    setShowValidationModal(true)
  }

  const getStats = () => {
    return {
      pending: reports.filter(r => r.status === 'pending_validation').length,
      validated: reports.filter(r => r.status === 'validated').length,
      rejected: reports.filter(r => r.status === 'rejected').length,
      published: reports.filter(r => r.status === 'published').length
    }
  }

  const stats = getStats()

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📋 Gestion des Rapports IT Vision
        </h1>
        <p className="text-gray-600">
          Validation et publication des rapports d'intervention
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Validés</p>
              <p className="text-3xl font-bold text-green-600">{stats.validated}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Publiés</p>
              <p className="text-3xl font-bold text-blue-600">{stats.published}</p>
            </div>
            <Send className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejetés</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <X className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending_validation">En attente validation</option>
              <option value="validated">Validés</option>
              <option value="rejected">Rejetés</option>
              <option value="published">Publiés</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Client, technicien, site..."
              />
            </div>
          </div>

          <div className="flex items-end">
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des rapports */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Rapports ({filteredReports.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rapport trouvé</h3>
              <p className="text-gray-600">Modifiez vos filtres pour voir plus de résultats</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header du rapport */}
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="font-mono text-sm text-gray-500">{report.id}</span>
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1">
                          {report.status === 'pending_validation' ? 'En attente' :
                           report.status === 'validated' ? 'Validé' :
                           report.status === 'rejected' ? 'Rejeté' :
                           report.status === 'published' ? 'Publié' : 'Brouillon'}
                        </span>
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(report.priority)}`}>
                        {report.priority.toUpperCase()}
                      </span>
                    </div>

                    {/* Informations principales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{report.clientCompany}</h3>
                        <p className="text-sm text-gray-600">Contact: {report.clientName}</p>
                        <p className="text-sm text-gray-600">Projet: {report.projectId}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Site: <span className="font-medium">{report.site}</span></p>
                        <p className="text-sm text-gray-600">Technicien: <span className="font-medium">{report.technicianName}</span></p>
                        <p className="text-sm text-gray-600">Date: <span className="font-medium">{new Date(report.interventionDate).toLocaleDateString('fr-FR')}</span></p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Durée: <span className="font-medium">{report.data.duration || 'N/A'}</span></p>
                        <p className="text-sm text-gray-600">Créé: <span className="font-medium">{new Date(report.createdAt).toLocaleString('fr-FR')}</span></p>
                        {report.validatedAt && (
                          <p className="text-sm text-gray-600">Validé: <span className="font-medium">{new Date(report.validatedAt).toLocaleString('fr-FR')}</span></p>
                        )}
                      </div>
                    </div>

                    {/* Aperçu du contenu */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Tâches réalisées ({report.data.tasksPerformed?.length || 0})</h4>
                          {report.data.tasksPerformed?.slice(0, 2).map((task: string, index: number) => (
                            <p key={index} className="text-sm text-gray-600">• {task}</p>
                          ))}
                          {(report.data.tasksPerformed?.length || 0) > 2 && (
                            <p className="text-xs text-gray-500 mt-1">+{(report.data.tasksPerformed?.length || 0) - 2} autres tâches</p>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Photos</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Avant: {report.data.photosBefore || 0}</span>
                            <span>Après: {report.data.photosAfter || 0}</span>
                          </div>
                          {report.data.recommendations && (
                            <p className="text-sm text-gray-600 mt-2">
                              Recommandations: {report.data.recommendations.length}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Raison de rejet si applicable */}
                    {report.status === 'rejected' && report.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 text-red-800 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Motif de rejet</span>
                        </div>
                        <p className="text-red-700 text-sm">{report.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Voir</span>
                    </button>

                    {report.status === 'pending_validation' && (
                      <>
                        <button
                          onClick={() => openValidationModal(report, 'approve')}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Valider</span>
                        </button>
                        
                        <button
                          onClick={() => openValidationModal(report, 'reject')}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          <span>Rejeter</span>
                        </button>
                      </>
                    )}

                    {report.status === 'validated' && (
                      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                        <Send className="h-4 w-4" />
                        <span>Publier</span>
                      </button>
                    )}

                    <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      <Download className="h-4 w-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de validation */}
      {showValidationModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {validationAction === 'approve' ? 'Valider le rapport' : 'Rejeter le rapport'}
              </h3>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Rapport: <span className="font-medium">{selectedReport.id}</span>
              </p>
              <p className="text-gray-600 mb-4">
                Client: <span className="font-medium">{selectedReport.clientCompany}</span>
              </p>
              
              {validationAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motif de rejet (obligatoire)
                  </label>
                  <textarea
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="Expliquez pourquoi ce rapport est rejeté..."
                    required
                  />
                </div>
              )}
              
              {validationAction === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Commentaire de validation..."
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowValidationModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              
              <button
                onClick={() => handleValidation(validationAction!)}
                disabled={isValidating || (validationAction === 'reject' && !validationComment.trim())}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  validationAction === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isValidating ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Traitement...
                  </div>
                ) : (
                  validationAction === 'approve' ? 'Valider' : 'Rejeter'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}