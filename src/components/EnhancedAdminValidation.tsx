'use client'

import { useState, useEffect } from 'react'
import SlideOver from '@/components/ui/SlideOver'
import { 
  CheckCircle, 
  X, 
  Clock, 
  AlertTriangle, 
  Eye, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Search, 
  Filter, 
  Download, 
  Star, 
  MapPin, 
  Calendar, 
  User, 
  Building, 
  Camera, 
  FileText, 
  Zap, 
  Target, 
  TrendingUp, 
  Activity,
  Bell,
  Archive,
  RefreshCw,
  Send,
  Edit3,
  Settings,
  BarChart3,
  Users,
  ShieldCheck,
  Smartphone,
  Timer,
  Award,
  AlertCircle
} from 'lucide-react'

interface AdminValidationProps {
  adminId?: string
}

export default function EnhancedAdminValidation({ adminId = 'ADMIN-001' }: AdminValidationProps) {
  const [reports, setReports] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [detailReport, setDetailReport] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const closeDetail = () => setDetailOpen(false)
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'analytics'>('list')
  const [filters, setFilters] = useState({
    status: 'pending_validation',
    priority: 'all',
    technician: 'all',
    dateRange: '7days'
  })
  const [validationModal, setValidationModal] = useState({
    open: false,
    action: null as 'approve' | 'reject' | null,
    comments: '',
    quickComments: [
      'Rapport complet et conforme',
      'Photos de qualité, interventions bien documentées',
      'Manque de détails dans les observations',
      'Photos floues ou insuffisantes',
      'Recommandations à améliorer',
      'Temps d\'intervention non justifié'
    ]
  })
  const [analytics, setAnalytics] = useState({
    totalPending: 0,
    avgValidationTime: 0,
    approvalRate: 0,
    urgentReports: 0
  })

  // Chargement des données
  useEffect(() => {
    loadReports()
    loadAnalytics()
  }, [filters])

  const loadReports = async () => {
    try {
      const params = new URLSearchParams({
        status: filters.status,
        priority: filters.priority !== 'all' ? filters.priority : '',
        technicianId: filters.technician !== 'all' ? filters.technician : '',
        limit: '50'
      })
      
      const response = await fetch(`/api/admin/reports/validate?${params}`, { credentials: 'include', headers: { 'x-dev-bypass-csrf': 'true' } })
      const data = await response.json()
      
      if (data.success) {
        setReports(data.reports)
        setAnalytics(data.stats)
      }
    } catch (error) {
      console.error('Erreur chargement rapports:', error)
    }
  }

  const loadAnalytics = async () => {
    // Chargement des analytics détaillées
    try {
      const response = await fetch('/api/admin/analytics/validation', { credentials: 'include', headers: { 'x-dev-bypass-csrf': 'true' } })
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(prev => ({ ...prev, ...data.analytics }))
      }
    } catch (error) {
      console.error('Erreur analytics:', error)
    }
  }

  // Validation rapide depuis la liste
  const quickValidate = async (reportId: string, action: 'approve' | 'reject', comments?: string) => {
    try {
      const response = await fetch('/api/admin/reports/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass-csrf': 'true' },
        credentials: 'include',
        body: JSON.stringify({
          reportId,
          action,
          comments: comments || (action === 'approve' ? 'Validation rapide' : 'Rejeté rapidement')
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Actualiser la liste
        loadReports()
        
        // Notification de succès
        showNotification(`Rapport ${action === 'approve' ? 'validé' : 'rejeté'} avec succès`)
      }
    } catch (error) {
      console.error('Erreur validation:', error)
    }
  }

  // Validation détaillée avec modal
  const openValidationModal = (report: any, action: 'approve' | 'reject') => {
    setSelectedReport(report)
    setValidationModal({
      ...validationModal,
      open: true,
      action,
      comments: ''
    })
  }

  const submitValidation = async () => {
    if (!selectedReport || !validationModal.action) return
    
    try {
      await quickValidate(selectedReport._id, validationModal.action, validationModal.comments)
      setValidationModal({ ...validationModal, open: false })
    } catch (error) {
      console.error('Erreur soumission validation:', error)
    }
  }

  // Notification système
  const showNotification = (message: string) => {
    // Ici vous implémenteriez votre système de notifications
    console.log('📢', message)
  }

  // Calcul priorité visuelle
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Calcul délai validation
  const getValidationDelay = (createdAt: string) => {
    const hours = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60))
    
    if (hours < 1) return { text: '< 1h', color: 'text-green-600' }
    if (hours < 24) return { text: `${hours}h`, color: hours > 4 ? 'text-orange-600' : 'text-green-600' }
    const days = Math.floor(hours / 24)
    return { text: `${days}j`, color: 'text-red-600' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/40">
      {/* Header avec stats en temps réel */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Validation des <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Rapports</span></h1>
              <p className="text-sm text-gray-600">
                {analytics.totalPending || 0} rapport{(analytics.totalPending || 0) > 1 ? 's' : ''} en attente
                {Number.isFinite(analytics.avgValidationTime) && analytics.avgValidationTime > 0 && <> · Temps moyen : {Math.round(analytics.avgValidationTime)} min</>}
                {Number.isFinite(analytics.approvalRate) && analytics.approvalRate > 0 && <> · Taux d'approbation : {Math.round(analytics.approvalRate)} %</>}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {analytics.urgentReports > 0 && (
                <div className="flex items-center bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {analytics.urgentReports} urgent(s)
                </div>
              )}
              
              <button
                onClick={() => setCurrentView('analytics')}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation onglets */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="inline-flex bg-white/70 backdrop-blur rounded-2xl p-1.5 shadow-sm ring-1 ring-gray-200/70">
          <div className="flex space-x-1">
            {[
              { id: 'list', label: 'Rapports en Attente', icon: Clock, count: analytics.totalPending },
              { id: 'analytics', label: 'Tableau de Bord', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as any)}
                className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                  currentView === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${currentView === tab.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vue Liste des rapports */}
      {currentView === 'list' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Filtres avancés */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-shadow text-sm"
                >
                  <option value="pending_validation">En attente</option>
                  <option value="validated">Validés</option>
                  <option value="rejected">Rejetés</option>
                  <option value="all">Tous</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-shadow text-sm"
                >
                  <option value="all">Toutes</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Technicien</label>
                <select
                  value={filters.technician}
                  onChange={(e) => setFilters({ ...filters, technician: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-shadow text-sm"
                >
                  <option value="all">Tous</option>
                  <option value="TECH-001">Moussa Diop</option>
                  <option value="TECH-002">Ibrahima Sall</option>
                  <option value="TECH-003">Aminata Fall</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-shadow text-sm"
                >
                  <option value="today">Aujourd'hui</option>
                  <option value="7days">7 derniers jours</option>
                  <option value="30days">30 derniers jours</option>
                  <option value="all">Tout</option>
                </select>
              </div>
            </div>
          </div>

          {/* Liste des rapports */}
          {reports.length === 0 && (
            <div className="bg-white/80 backdrop-blur rounded-2xl ring-1 ring-gray-200/70 p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-blue-500" />
              </div>
              <p className="font-semibold text-gray-800">Aucun rapport dans cette vue</p>
              <p className="text-sm text-gray-500 mt-1">Modifiez les filtres ou revenez plus tard.</p>
            </div>
          )}
          <div className="space-y-4">
            {reports.map((report) => {
              const delay = getValidationDelay(report.createdAt)
              
              return (
                <div key={report._id} className="group bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 hover:shadow-xl hover:shadow-blue-900/5 hover:ring-blue-200 transition-all duration-200">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="font-bold text-lg text-blue-600">{report.reportId}</span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getPriorityColor(report.priority)}`}>
                            {report.priority}
                          </span>
                          <span className={`text-sm ${delay.color}`}>
                            {delay.text}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 mr-2" />
                            {report.technicianId?.name || 'Technicien'}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Building className="h-4 w-4 mr-2" />
                            {report.clientId?.name || 'Client'}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(report.interventionDate).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {report.site}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Timer className="h-4 w-4 mr-2" />
                            {report.duration}min
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Camera className="h-4 w-4 mr-2" />
                            {(report.photos?.before?.length || 0) + (report.photos?.after?.length || 0)} photos
                          </div>
                        </div>
                        
                        {/* Aperçu du contenu */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {report.initialObservations || 'Aucune observation'}
                          </p>
                          {report.tasksPerformed && report.tasksPerformed.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500">Tâches: </span>
                              <span className="text-xs text-gray-700">
                                {report.tasksPerformed.slice(0, 2).join(', ')}
                                {report.tasksPerformed.length > 2 && '...'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col space-y-2 ml-6">
                        <button
                          onClick={() => { setDetailReport(report); setDetailOpen(true) }}
                          className="flex items-center px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 hover:shadow-sm transition-all"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </button>
                        
                        <button
                          onClick={() => openValidationModal(report, 'approve')}
                          className="flex items-center px-3 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-sm shadow-green-600/25 hover:shadow-md hover:shadow-green-600/35 transition-all"
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Valider
                        </button>
                        
                        <button
                          onClick={() => openValidationModal(report, 'reject')}
                          className="flex items-center px-3 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl shadow-sm shadow-red-600/25 hover:shadow-md hover:shadow-red-600/35 transition-all"
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vue Analytics */}
      {currentView === 'analytics' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Métriques clés */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Temps Moyen</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(analytics.avgValidationTime)}min</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Taux Approbation</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(analytics.approvalRate)}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Urgents</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.urgentReports}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Traités</p>
                  <p className="text-2xl font-bold text-gray-900">127</p>
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques et tendances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance par Technicien</h3>
              <div className="space-y-4">
                {[
                  { name: 'Moussa Diop', reports: 45, approval: 92, avgTime: 18 },
                  { name: 'Ibrahima Sall', reports: 38, approval: 89, avgTime: 22 },
                  { name: 'Aminata Fall', reports: 44, approval: 95, avgTime: 16 }
                ].map((tech) => (
                  <div key={tech.name} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{tech.name}</div>
                      <div className="text-sm text-gray-600">{tech.reports} rapports</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{tech.approval}% approuvés</div>
                      <div className="text-sm text-gray-600">{tech.avgTime}min moy.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendances Validation</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Cette semaine</span>
                  <span className="text-green-600 font-medium">+15%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Temps moyen</span>
                  <span className="text-blue-600 font-medium">-8%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Satisfaction client</span>
                  <span className="text-green-600 font-medium">4.8/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fiche détaillée du rapport (bouton « Voir ») */}
      <SlideOver
        isOpen={detailOpen && !!detailReport}
        onClose={closeDetail}
        title={`Rapport ${detailReport?.reportId ?? ''}`}
        subtitle={detailReport ? <>
          {detailReport.interventionDate ? new Date(detailReport.interventionDate).toLocaleDateString('fr-FR') : ''}
          {detailReport.startTime ? ` · ${detailReport.startTime}` : ''}{detailReport.endTime ? `–${detailReport.endTime}` : ''}
          {detailReport.interventionType ? ` · ${detailReport.interventionType}` : ''}
        </> : null}
        footer={detailReport && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={closeDetail}
              className="px-4 py-2.5 text-gray-700 bg-white ring-1 ring-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={() => openValidationModal(detailReport, 'reject')}
              className="flex items-center px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 transition-all"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Rejeter
            </button>
            <button
              onClick={() => openValidationModal(detailReport, 'approve')}
              className="flex items-center px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium shadow-md shadow-green-600/25 hover:shadow-lg hover:shadow-green-600/35 transition-all"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Valider
            </button>
          </div>
        )}
      >
        {detailReport && (
          <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-gray-700"><User className="h-4 w-4 mr-2 text-gray-400" />{detailReport.technicianId?.name || 'Technicien'}</div>
                <div className="flex items-center text-gray-700"><Building className="h-4 w-4 mr-2 text-gray-400" />{detailReport.clientId?.name || detailReport.clientContact?.name || 'Client'}</div>
                <div className="flex items-center text-gray-700"><MapPin className="h-4 w-4 mr-2 text-gray-400" />{detailReport.site || '—'}</div>
                <div className="flex items-center text-gray-700"><Timer className="h-4 w-4 mr-2 text-gray-400" />{detailReport.duration ? `${detailReport.duration} min` : '—'}</div>
              </div>

              {/* Observations */}
              {(detailReport.initialObservations || detailReport.problemDescription) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Observations</h4>
                  {detailReport.initialObservations && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{detailReport.initialObservations}</div>
                  )}
                  {detailReport.problemDescription && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap mt-2">{detailReport.problemDescription}</div>
                  )}
                </div>
              )}

              {/* Tâches réalisées */}
              {Array.isArray(detailReport.tasksPerformed) && detailReport.tasksPerformed.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Tâches réalisées</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {detailReport.tasksPerformed.map((t: string, i: number) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}

              {/* Résultats */}
              {detailReport.results && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Résultats</h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{detailReport.results}</div>
                </div>
              )}

              {/* Recommandations */}
              {Array.isArray(detailReport.recommendations) && detailReport.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Recommandations</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {detailReport.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {/* Anomalies détectées */}
              {Array.isArray(detailReport.issuesDetected) && detailReport.issuesDetected.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Anomalies détectées</h4>
                  <div className="space-y-2">
                    {detailReport.issuesDetected.map((issue: any, i: number) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{issue.reference || issue.component || `Anomalie ${i + 1}`}</span>
                          {issue.severity && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{issue.severity}</span>}
                        </div>
                        {issue.description && <p className="text-gray-600 mt-1">{issue.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matériel utilisé */}
              {Array.isArray(detailReport.materialsUsed) && detailReport.materialsUsed.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Matériel utilisé</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {detailReport.materialsUsed.map((m: any, i: number) => (
                      <li key={i} className="flex justify-between gap-2"><span>{m.name}</span><span className="text-gray-500">×{m.quantity}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Photos avant / après */}
              {(detailReport.photos?.before?.length > 0 || detailReport.photos?.after?.length > 0) && (
                <div className="space-y-4">
                  {detailReport.photos?.before?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Photos avant ({detailReport.photos.before.length})</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {detailReport.photos.before.map((ph: any, i: number) => (
                          <a key={i} href={ph.url} target="_blank" rel="noopener noreferrer" className="group block aspect-video bg-gray-100 rounded-xl overflow-hidden ring-1 ring-gray-200/70 hover:ring-blue-300 transition-shadow">
                            <img src={ph.url} alt={ph.caption || `Avant ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailReport.photos?.after?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Photos après ({detailReport.photos.after.length})</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {detailReport.photos.after.map((ph: any, i: number) => (
                          <a key={i} href={ph.url} target="_blank" rel="noopener noreferrer" className="group block aspect-video bg-gray-100 rounded-xl overflow-hidden ring-1 ring-gray-200/70 hover:ring-blue-300 transition-shadow">
                            <img src={ph.url} alt={ph.caption || `Après ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Signatures */}
              {(detailReport.signatures?.technician || detailReport.signatures?.client) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 inline-block" />Signatures</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detailReport.signatures?.technician && (
                      <div className="border border-gray-200 rounded-lg p-3 text-sm">
                        <p className="font-medium">Technicien : {detailReport.signatures.technician.name}</p>
                        {typeof detailReport.signatures.technician.signature === 'string' && detailReport.signatures.technician.signature.startsWith('data:image') && (
                          <img src={detailReport.signatures.technician.signature} alt="Signature technicien" className="mt-2 h-16 object-contain" />
                        )}
                      </div>
                    )}
                    {detailReport.signatures?.client && (
                      <div className="border border-gray-200 rounded-lg p-3 text-sm">
                        <p className="font-medium">Client : {detailReport.signatures.client.name}{detailReport.signatures.client.title ? ` (${detailReport.signatures.client.title})` : ''}</p>
                        {typeof detailReport.signatures.client.signature === 'string' && detailReport.signatures.client.signature.startsWith('data:image') && (
                          <img src={detailReport.signatures.client.signature} alt="Signature client" className="mt-2 h-16 object-contain" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
        )}
      </SlideOver>

      {/* Modal de validation détaillée */}
      {validationModal.open && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {validationModal.action === 'approve' ? 'Valider' : 'Rejeter'} le rapport {selectedReport.reportId}
                </h3>
                <button
                  onClick={() => setValidationModal({ ...validationModal, open: false })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Aperçu du rapport */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Résumé du rapport</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div><strong>Client:</strong> {selectedReport.clientId?.name}</div>
                  <div><strong>Technicien:</strong> {selectedReport.technicianId?.name}</div>
                  <div><strong>Site:</strong> {selectedReport.site}</div>
                  <div><strong>Durée:</strong> {selectedReport.duration} minutes</div>
                  <div><strong>Type:</strong> {selectedReport.interventionType}</div>
                </div>
              </div>
              
              {/* Commentaires de validation */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Commentaires {validationModal.action === 'reject' && <span className="text-red-500">*</span>}
                </label>
                
                {/* Commentaires rapides */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Commentaires prédéfinis :</p>
                  <div className="flex flex-wrap gap-2">
                    {validationModal.quickComments.map((comment, index) => (
                      <button
                        key={index}
                        onClick={() => setValidationModal({ 
                          ...validationModal, 
                          comments: comment 
                        })}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        {comment}
                      </button>
                    ))}
                  </div>
                </div>
                
                <textarea
                  value={validationModal.comments}
                  onChange={(e) => setValidationModal({ 
                    ...validationModal, 
                    comments: e.target.value 
                  })}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-shadow text-sm"
                  placeholder={validationModal.action === 'approve' 
                    ? 'Commentaires sur la validation (optionnel)...'
                    : 'Expliquez les raisons du rejet...'
                  }
                />
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setValidationModal({ ...validationModal, open: false })}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submitValidation}
                  disabled={validationModal.action === 'reject' && !validationModal.comments.trim()}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                    validationModal.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {validationModal.action === 'approve' ? 'Valider' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}