'use client'

import { useState, useEffect } from 'react'
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
      
      const response = await fetch(`/api/admin/reports/validate?${params}`)
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
      const response = await fetch('/api/admin/analytics/validation')
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
        headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen bg-gray-50">
      {/* Header avec stats en temps réel */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Validation des Rapports</h1>
              <p className="text-sm text-gray-600">
                {analytics.totalPending} rapports en attente • 
                Temps moyen: {Math.round(analytics.avgValidationTime)}min • 
                Taux d'approbation: {Math.round(analytics.approvalRate)}%
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {analytics.urgentReports > 0 && (
                <div className="flex items-center bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {analytics.urgentReports} urgent(s)
                </div>
              )}
              
              <button
                onClick={() => setCurrentView('analytics')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation onglets */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'list', label: 'Rapports en Attente', icon: Clock, count: analytics.totalPending },
              { id: 'analytics', label: 'Tableau de Bord', icon: BarChart3 }
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
                {tab.count !== undefined && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
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
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
          <div className="space-y-4">
            {reports.map((report) => {
              const delay = getValidationDelay(report.createdAt)
              
              return (
                <div key={report._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="font-bold text-lg text-blue-600">{report.reportId}</span>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(report.priority)}`}>
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
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </button>
                        
                        <button
                          onClick={() => openValidationModal(report, 'approve')}
                          className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Valider
                        </button>
                        
                        <button
                          onClick={() => openValidationModal(report, 'reject')}
                          className="flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

      {/* Modal de validation détaillée */}
      {validationModal.open && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
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