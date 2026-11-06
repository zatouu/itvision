'use client'

import { useState, useEffect } from 'react'
import {
  Wrench,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Zap,
  Filter,
  Search,
  Download,
  Eye,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Settings,
  Phone,
  Mail,
  Plus,
  X,
  Archive
} from 'lucide-react'

interface MaintenanceReport {
  id: string
  reportId: string
  title: string
  site: string
  technicianName: string
  date: string
  status: 'draft' | 'pending' | 'published' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  duration: string
  summary: string
  tasksCount: number
}

interface MaintenanceSite {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  lastMaintenance: string
  nextPlanned: string
  equipment: string[]
  status: 'healthy' | 'warning' | 'critical'
  technician: string
}

interface ClientMaintenanceHubProps {
  clientId: string
  clientName: string
  clientCompany: string
  projectId: string
}

export default function ClientMaintenanceHub({
  clientId,
  clientName,
  clientCompany,
  projectId
}: ClientMaintenanceHubProps) {
  const [activeView, setActiveView] = useState('overview')
  const [reports, setReports] = useState<MaintenanceReport[]>([])
  const [sites, setSites] = useState<MaintenanceSite[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [selectedReport, setSelectedReport] = useState<MaintenanceReport | null>(null)
  const [showReportDetail, setShowReportDetail] = useState(false)

  // Données simulées
  useEffect(() => {
    // Rapports de maintenance
    setReports([
      {
        id: '1',
        reportId: 'RPT-20240115-001',
        title: 'Maintenance Mensuelle Janvier 2024',
        site: 'Siège Parcelles Assainies',
        technicianName: 'Moussa Diop',
        date: '2024-01-15',
        status: 'published',
        priority: 'medium',
        duration: '2h30',
        summary: 'Maintenance préventive de 16 caméras IP, vérification système NVR, tests enregistrement.',
        tasksCount: 6
      },
      {
        id: '2',
        reportId: 'RPT-20240110-002',
        title: 'Intervention Urgente Système',
        site: 'Agence Almadies',
        technicianName: 'Fatou Sall',
        date: '2024-01-10',
        status: 'published',
        priority: 'high',
        duration: '1h15',
        summary: 'Remplacement caméra défectueuse, test complet système.',
        tasksCount: 3
      },
      {
        id: '3',
        reportId: 'RPT-20240105-003',
        title: 'Vérification Système Contrôle d\'Accès',
        site: 'Siège Parcelles Assainies',
        technicianName: 'Amadou Ba',
        date: '2024-01-05',
        status: 'published',
        priority: 'low',
        duration: '45min',
        summary: 'Vérification quotidiennes des badges et serrures.',
        tasksCount: 2
      },
      {
        id: '4',
        reportId: 'RPT-20240101-004',
        title: 'Maintenance Préventive Trimestrale',
        site: 'Siège Parcelles Assainies',
        technicianName: 'Moussa Diop',
        date: '2024-01-01',
        status: 'archived',
        priority: 'medium',
        duration: '3h',
        summary: 'Maintenance complète système vidéosurveillance et contrôle d\'accès.',
        tasksCount: 8
      }
    ])

    // Sites gérés
    setSites([
      {
        id: '1',
        name: 'Siège Parcelles Assainies',
        address: 'Route de Ngor, Dakar',
        latitude: 14.7167,
        longitude: -17.5333,
        lastMaintenance: '2024-01-15',
        nextPlanned: '2024-02-15',
        equipment: ['16 Caméras IP', 'NVR 16ch', 'Switch PoE', 'Portail d\'accès'],
        status: 'healthy',
        technician: 'Moussa Diop'
      },
      {
        id: '2',
        name: 'Agence Almadies',
        address: 'Boulevard du Promontoire, Dakar',
        latitude: 14.6667,
        longitude: -17.6333,
        lastMaintenance: '2024-01-10',
        nextPlanned: '2024-02-10',
        equipment: ['8 Caméras IP', 'NVR 8ch', 'Contrôle d\'accès'],
        status: 'healthy',
        technician: 'Fatou Sall'
      },
      {
        id: '3',
        name: 'Bureau Administratif',
        address: 'Centre-Ville, Dakar',
        latitude: 14.6523,
        longitude: -17.4369,
        lastMaintenance: '2024-01-05',
        nextPlanned: '2024-01-25',
        equipment: ['4 Caméras', 'NVR 4ch', 'Panneau de contrôle'],
        status: 'warning',
        technician: 'Amadou Ba'
      }
    ])
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />
      case 'draft': return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'archived': return <Archive className="h-4 w-4 text-gray-500" />
      default: return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-orange-600 bg-orange-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const filteredReports = reports.filter(report => {
    const matchSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       report.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       report.reportId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'all' || report.status === filterStatus
    const matchPriority = filterPriority === 'all' || report.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-purple-50 to-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Centre de Maintenance</h2>
            <p className="text-gray-600">Gestion centralisée de votre infrastructure</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <Wrench className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Vue Selector */}
      <div className="flex flex-wrap gap-2 bg-white rounded-lg p-4 border border-gray-200">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
          { id: 'reports', label: 'Rapports', icon: FileText },
          { id: 'sites', label: 'Sites', icon: MapPin },
          { id: 'calendar', label: 'Calendrier', icon: Calendar },
          { id: 'analytics', label: 'Statistiques', icon: TrendingUp }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === view.id
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <view.icon className="h-4 w-4" />
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Vue d'ensemble */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Rapports Publiés', value: reports.filter(r => r.status === 'published').length, icon: CheckCircle, color: 'green' },
              { label: 'Rapports En Attente', value: reports.filter(r => r.status === 'pending').length, icon: Clock, color: 'orange' },
              { label: 'Sites Gérés', value: sites.length, icon: MapPin, color: 'blue' },
              { label: 'Équipements', value: sites.reduce((acc, s) => acc + s.equipment.length, 0), icon: Zap, color: 'purple' }
            ].map((stat, idx) => (
              <div key={idx} className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
                </div>
              </div>
            ))}
          </div>

          {/* Rapports Récents & Sites */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rapports Récents */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Rapports Récents</h3>
                <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                  Voir tout →
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {reports.slice(0, 4).map(report => (
                  <div
                    key={report.id}
                    onClick={() => {
                      setSelectedReport(report)
                      setShowReportDetail(true)
                    }}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getStatusIcon(report.status)}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{report.reportId}</p>
                          <p className="text-sm text-gray-600">{report.title}</p>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{report.site}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityColor(report.priority)}`}>
                          {report.priority}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{report.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sites Critiques */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">État des Sites</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {sites.map(site => (
                  <div key={site.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{site.name}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <div className={`h-2 w-2 rounded-full ${
                            site.status === 'healthy' ? 'bg-green-500' :
                            site.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {site.status === 'healthy' ? 'Normal' :
                             site.status === 'warning' ? 'Attention' : 'Critique'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          👤 {site.technician}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Rapports */}
      {activeView === 'reports' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rapports, sites..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="published">Publiés</option>
                  <option value="pending">En attente</option>
                  <option value="archived">Archivés</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Toutes priorités</option>
                  <option value="urgent">Urgents</option>
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>
            </div>
          </div>

          {/* Liste des rapports */}
          <div className="space-y-3">
            {filteredReports.length > 0 ? (
              filteredReports.map(report => (
                <div
                  key={report.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedReport(report)
                    setShowReportDetail(true)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(report.status)}
                        <h4 className="font-bold text-gray-900">{report.reportId}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(report.priority)}`}>
                          {report.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 mb-2">{report.title}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{report.site}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{report.technicianName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{report.duration}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(report.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{report.summary}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 ml-4 mt-1" />
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                Aucun rapport ne correspond à votre recherche
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vue Sites */}
      {activeView === 'sites' && (
        <div className="space-y-4">
          {sites.map(site => (
            <div key={site.id} className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all ${getStatusColor(site.status)}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{site.name}</h3>
                  <div className="flex items-center space-x-1 mb-2">
                    <div className={`h-3 w-3 rounded-full ${
                      site.status === 'healthy' ? 'bg-green-500' :
                      site.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium">
                      {site.status === 'healthy' ? 'État Normal' :
                       site.status === 'warning' ? 'Attention Requise' : 'État Critique'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{site.address}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase mb-2">Dernière Maintenance</p>
                  <p className="font-semibold text-gray-900">{new Date(site.lastMaintenance).toLocaleDateString('fr-FR')}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    Prochaine: {new Date(site.nextPlanned).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase mb-2">Équipements</p>
                  <div className="space-y-1">
                    {site.equipment.map((eq, idx) => (
                      <p key={idx} className="text-sm text-gray-700">• {eq}</p>
                    ))}
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Détails</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vue Calendrier */}
      {activeView === 'calendar' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Calendrier de Maintenance</p>
            <p className="text-sm">Planification des interventions de maintenance futures</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { date: '2024-02-15', site: 'Siège', action: 'Maintenance Mensuelle' },
                { date: '2024-02-20', site: 'Agence', action: 'Visite Programmée' },
                { date: '2024-03-01', site: 'Bureau', action: 'Maintenance Trimestrielle' }
              ].map((event, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 text-left">
                  <p className="text-xs font-medium text-emerald-600 uppercase">📅 {event.date}</p>
                  <p className="font-semibold text-gray-900 mt-1">{event.action}</p>
                  <p className="text-sm text-gray-600">{event.site}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vue Statistiques */}
      {activeView === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Temps Moyen par Site</h3>
            <div className="space-y-3">
              {sites.map(site => (
                <div key={site.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{site.name}</span>
                  <div className="bg-gray-200 rounded-full h-2 w-24">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${Math.random() * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Techniciens</h3>
            <div className="space-y-3">
              {['Moussa Diop', 'Fatou Sall', 'Amadou Ba'].map((tech, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{tech}</span>
                  <span className="text-sm font-semibold text-emerald-600">{95 + Math.random() * 5}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Rapport */}
      {showReportDetail && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{selectedReport.reportId}</h3>
              <button
                onClick={() => setShowReportDetail(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{selectedReport.title}</h4>
                <p className="text-gray-600">{selectedReport.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600">SITE</p>
                  <p className="font-semibold text-gray-900">{selectedReport.site}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600">TECHNICIEN</p>
                  <p className="font-semibold text-gray-900">{selectedReport.technicianName}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600">DURÉE</p>
                  <p className="font-semibold text-gray-900">{selectedReport.duration}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600">TÂCHES</p>
                  <p className="font-semibold text-gray-900">{selectedReport.tasksCount} effectuées</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Télécharger PDF</span>
                </button>
                <button className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
