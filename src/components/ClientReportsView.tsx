'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Star,
  Filter,
  Search,
  Bell,
  MessageCircle,
  Camera,
  Wrench,
  TrendingUp,
  Activity,
  BarChart3,
  Archive,
  ChevronDown,
  ChevronRight,
  Smartphone
} from 'lucide-react'

interface ClientReport {
  id: string
  title: string
  type: string
  site: string
  interventionDate: string
  technicianName: string
  status: 'published' | 'validated' | 'in_progress'
  category: 'maintenance' | 'installation' | 'repair' | 'inspection'
  priority: 'low' | 'medium' | 'high'
  duration: string
  summary: string
  tasksCount: number
  photosCount: number
  recommendationsCount: number
  rating?: number
  createdAt: string
  publishedAt?: string
  data: any
}

interface ClientReportsViewProps {
  clientId: string
  clientName: string
  clientCompany: string
}

export default function ClientReportsView({ 
  clientId, 
  clientName, 
  clientCompany 
}: ClientReportsViewProps) {
  const [reports, setReports] = useState<ClientReport[]>([])
  const [selectedReport, setSelectedReport] = useState<ClientReport | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showReportDetail, setShowReportDetail] = useState(false)

  // Simulation de rapports spécifiques au client
  useEffect(() => {
    // En production, fetch basé sur clientId
    const clientReports: ClientReport[] = []

    if (clientId === 'CLI-001') { // IT Solutions SARL
      clientReports.push(
        {
          id: 'RPT-001',
          title: 'Maintenance Mensuelle Janvier 2024',
          type: 'Maintenance Mensuelle',
          site: 'Siège Parcelles Assainies',
          interventionDate: '2024-01-15',
          technicianName: 'Moussa Diop',
          status: 'published',
          category: 'maintenance',
          priority: 'medium',
          duration: '2h30',
          summary: 'Maintenance préventive de 16 caméras IP, vérification système NVR, tests enregistrement.',
          tasksCount: 6,
          photosCount: 8,
          recommendationsCount: 2,
          rating: 5,
          createdAt: '2024-01-15T16:30:00Z',
          publishedAt: '2024-01-15T18:45:00Z',
          data: {
            tasksPerformed: [
              'Nettoyage de 16 caméras IP 4K',
              'Vérification système NVR 32 canaux',
              'Test enregistrement 24h continu',
              'Mise à jour firmware caméras',
              'Vérification espace disque disponible',
              'Test système de sauvegarde'
            ],
            observations: 'Système général en excellent état. Toutes les caméras fonctionnent parfaitement.',
            recommendations: [
              'Prévoir remplacement disque dur D2 dans 3 mois (capacité 85%)',
              'Réajuster angle caméra C-07 pour optimiser couverture entrée'
            ],
            systemState: 'Excellent',
            nextMaintenance: '2024-02-15'
          }
        },
        {
          id: 'RPT-015',
          title: 'Maintenance Mensuelle Février 2024',
          type: 'Maintenance Mensuelle', 
          site: 'Siège Parcelles Assainies',
          interventionDate: '2024-02-10',
          technicianName: 'Moussa Diop',
          status: 'published',
          category: 'maintenance',
          priority: 'medium',
          duration: '2h15',
          summary: 'Maintenance de routine, optimisation angles caméras, mise à jour système.',
          tasksCount: 5,
          photosCount: 6,
          recommendationsCount: 1,
          rating: 5,
          createdAt: '2024-02-10T16:30:00Z',
          publishedAt: '2024-02-10T19:15:00Z',
          data: {
            tasksPerformed: [
              'Maintenance préventive caméras',
              'Optimisation angles de vue',
              'Mise à jour firmware NVR',
              'Test qualité enregistrement',
              'Vérification système alarme'
            ]
          }
        },
        {
          id: 'RPT-022',
          title: 'Extension Système - 4 Caméras Supplémentaires',
          type: 'Installation Nouvelle',
          site: 'Siège Parcelles Assainies',
          interventionDate: '2024-02-20',
          technicianName: 'Ibrahima Sall',
          status: 'published',
          category: 'installation',
          priority: 'high',
          duration: '6h00',
          summary: 'Installation de 4 nouvelles caméras IP pour extension périmètre sécurité.',
          tasksCount: 8,
          photosCount: 12,
          recommendationsCount: 3,
          rating: 5,
          createdAt: '2024-02-20T17:45:00Z',
          publishedAt: '2024-02-21T09:30:00Z',
          data: {
            equipmentInstalled: [
              '4x Caméras IP 4K Hikvision DS-2CD2143G2-I',
              '1x Switch PoE 8 ports supplémentaire',
              'Câblage réseau Cat6 (150m)',
              'Boîtiers de protection extérieure'
            ]
          }
        }
      )
    } else if (clientId === 'CLI-002') { // Commerce Plus
      clientReports.push(
        {
          id: 'RPT-008',
          title: 'Réparation Caméra Entrée Principale',
          type: 'Intervention Corrective',
          site: 'Magasin Plateau',
          interventionDate: '2024-02-05',
          technicianName: 'Ibrahima Sall',
          status: 'published',
          category: 'repair',
          priority: 'high',
          duration: '3h15',
          summary: 'Remplacement caméra défaillante à l\'entrée principale, reconfiguration système.',
          tasksCount: 4,
          photosCount: 6,
          recommendationsCount: 2,
          rating: 4,
          createdAt: '2024-02-05T14:15:00Z',
          publishedAt: '2024-02-05T18:20:00Z',
          data: {
            problemDescription: 'Caméra entrée principale hors service depuis 2 jours',
            solutionApplied: 'Remplacement complet de la caméra défaillante',
            systemStatus: 'Complètement opérationnel'
          }
        },
        {
          id: 'RPT-012',
          title: 'Maintenance Trimestrielle Q1 2024',
          type: 'Maintenance Mensuelle',
          site: 'Magasin Plateau',
          interventionDate: '2024-02-12',
          technicianName: 'Moussa Diop',
          status: 'published',
          category: 'maintenance',
          priority: 'medium',
          duration: '1h45',
          summary: 'Maintenance trimestrielle complète, vérification système après réparation.',
          tasksCount: 5,
          photosCount: 4,
          recommendationsCount: 1,
          createdAt: '2024-02-12T11:30:00Z',
          publishedAt: '2024-02-12T15:45:00Z',
          data: {}
        }
      )
    }

    setReports(clientReports)
  }, [clientId])

  const filteredReports = reports.filter(report => {
    const matchesType = filterType === 'all' || report.category === filterType
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesPeriod = true
    if (filterPeriod !== 'all') {
      const reportDate = new Date(report.interventionDate)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - reportDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      switch (filterPeriod) {
        case '30days':
          matchesPeriod = diffDays <= 30
          break
        case '90days':
          matchesPeriod = diffDays <= 90
          break
        case '1year':
          matchesPeriod = diffDays <= 365
          break
      }
    }
    
    return matchesType && matchesSearch && matchesPeriod
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance': return 'bg-green-100 text-green-800'
      case 'installation': return 'bg-blue-100 text-blue-800'
      case 'repair': return 'bg-orange-100 text-orange-800'
      case 'inspection': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance': return <Wrench className="h-4 w-4" />
      case 'installation': return <Activity className="h-4 w-4" />
      case 'repair': return <AlertTriangle className="h-4 w-4" />
      case 'inspection': return <Eye className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStats = () => {
    return {
      total: reports.length,
      thisMonth: reports.filter(r => {
        const reportDate = new Date(r.interventionDate)
        const now = new Date()
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear()
      }).length,
      maintenance: reports.filter(r => r.category === 'maintenance').length,
      avgRating: reports.filter(r => r.rating).reduce((acc, r) => acc + (r.rating || 0), 0) / reports.filter(r => r.rating).length || 0
    }
  }

  const stats = getStats()

  const openReportDetail = (report: ClientReport) => {
    setSelectedReport(report)
    setShowReportDetail(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📋 Mes Rapports d'Intervention
        </h2>
        <p className="text-gray-600">
          Historique complet de toutes les interventions sur vos sites
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rapports</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ce Mois</p>
              <p className="text-3xl font-bold text-green-600">{stats.thisMonth}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenances</p>
              <p className="text-3xl font-bold text-purple-600">{stats.maintenance}</p>
            </div>
            <Wrench className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Note Moyenne</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}/5</p>
            </div>
            <Star className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d'intervention</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous types</option>
              <option value="maintenance">Maintenance</option>
              <option value="installation">Installation</option>
              <option value="repair">Réparation</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toute période</option>
              <option value="30days">30 derniers jours</option>
              <option value="90days">3 derniers mois</option>
              <option value="1year">Dernière année</option>
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
                placeholder="Titre, site, technicien..."
              />
            </div>
          </div>

          <div className="flex items-end">
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des rapports */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Rapports ({filteredReports.length})
          </h3>
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
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{report.site}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(report.interventionDate).toLocaleDateString('fr-FR')}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{report.technicianName}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{report.duration}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(report.priority)}`}></div>
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(report.category)}`}>
                          {getCategoryIcon(report.category)}
                          <span className="ml-1 capitalize">{report.category}</span>
                        </span>
                        {report.rating && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{report.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Résumé */}
                    <p className="text-gray-700 mb-4">{report.summary}</p>

                    {/* Métriques */}
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>{report.tasksCount} tâches</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Camera className="h-4 w-4" />
                        <span>{report.photosCount} photos</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{report.recommendationsCount} recommandations</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => openReportDetail(report)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Consulter</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                      <Download className="h-4 w-4" />
                      <span>PDF</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      <span>Contact</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal détail rapport */}
      {showReportDetail && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{selectedReport.title}</h3>
              <button
                onClick={() => setShowReportDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Détails intervention</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Site :</span>
                      <span className="font-medium">{selectedReport.site}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date :</span>
                      <span className="font-medium">{new Date(selectedReport.interventionDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée :</span>
                      <span className="font-medium">{selectedReport.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Technicien :</span>
                      <span className="font-medium">{selectedReport.technicianName}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Évaluation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type :</span>
                      <span className="font-medium">{selectedReport.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priorité :</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getPriorityColor(selectedReport.priority)}`}>
                        {selectedReport.priority.toUpperCase()}
                      </span>
                    </div>
                    {selectedReport.rating && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Note :</span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < selectedReport.rating! ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contenu détaillé */}
              {selectedReport.data.tasksPerformed && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Tâches réalisées</h4>
                  <ul className="space-y-2">
                    {selectedReport.data.tasksPerformed.map((task: string, index: number) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedReport.data.observations && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Observations</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedReport.data.observations}</p>
                </div>
              )}

              {selectedReport.data.recommendations && selectedReport.data.recommendations.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Recommandations</h4>
                  <ul className="space-y-2">
                    {selectedReport.data.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Download className="h-4 w-4" />
                  <span>Télécharger PDF</span>
                </button>
                
                <button className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  <span>Contacter Technicien</span>
                </button>
                
                <button className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Archive className="h-4 w-4" />
                  <span>Archiver</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}