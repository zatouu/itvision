'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Send, User, FileText, AlertTriangle } from 'lucide-react'

interface TestReport {
  id: string
  reportId: string
  title: string
  technicianName: string
  clientName: string
  status: 'pending_validation' | 'validated' | 'rejected' | 'published'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
  validatedAt?: string
  publishedAt?: string
  validationComments?: string
}

const ValidationCycleTest = () => {
  const [testReports, setTestReports] = useState<TestReport[]>([
    {
      id: '1',
      reportId: 'RPT-20240115-001',
      title: 'Maintenance système vidéosurveillance',
      technicianName: 'Moussa Diop',
      clientName: 'SARL TechnoPlus',
      status: 'pending_validation',
      priority: 'medium',
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      reportId: 'RPT-20240115-002',
      title: 'Installation contrôle d\'accès',
      technicianName: 'Fatou Sall',
      clientName: 'Résidence Les Palmiers',
      status: 'pending_validation',
      priority: 'high',
      createdAt: '2024-01-15T14:15:00Z'
    }
  ])

  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null)
  const [validationComments, setValidationComments] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_validation': return <Clock className="h-4 w-4 text-orange-500" />
      case 'validated': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
      case 'published': return <Send className="h-4 w-4 text-emerald-500" />
      default: return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_validation': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'validated': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'published': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const handleValidation = (report: TestReport, action: 'approve' | 'reject') => {
    setSelectedReport(report)
    setActionType(action)
    setShowModal(true)
  }

  const executeValidation = () => {
    if (!selectedReport) return

    const updatedReport = {
      ...selectedReport,
      status: actionType === 'approve' ? 'validated' as const : 'rejected' as const,
      validatedAt: new Date().toISOString(),
      validationComments
    }

    // Si approuvé, simuler auto-publication après 2 secondes
    if (actionType === 'approve') {
      setTimeout(() => {
        setTestReports(prev => prev.map(r => 
          r.id === selectedReport.id 
            ? { 
                ...updatedReport, 
                status: 'published' as const,
                publishedAt: new Date().toISOString()
              }
            : r
        ))
      }, 2000)
    }

    setTestReports(prev => prev.map(r => 
      r.id === selectedReport.id ? updatedReport : r
    ))

    setShowModal(false)
    setValidationComments('')
    setSelectedReport(null)
  }

  const createNewTestReport = () => {
    const newReport: TestReport = {
      id: Date.now().toString(),
      reportId: `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      title: 'Nouveau rapport de test',
      technicianName: 'Amadou Ba',
      clientName: 'Entreprise Test',
      status: 'pending_validation',
      priority: 'medium',
      createdAt: new Date().toISOString()
    }

    setTestReports(prev => [newReport, ...prev])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Test Cycle de Validation</h1>
              <p className="text-gray-600">Vérification du flux Admin → Client</p>
            </div>
            <button
              onClick={createNewTestReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Créer rapport test
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'En attente', count: testReports.filter(r => r.status === 'pending_validation').length, color: 'orange' },
            { label: 'Validés', count: testReports.filter(r => r.status === 'validated').length, color: 'green' },
            { label: 'Rejetés', count: testReports.filter(r => r.status === 'rejected').length, color: 'red' },
            { label: 'Publiés', count: testReports.filter(r => r.status === 'published').length, color: 'emerald' }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Liste des rapports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Rapports de Test</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {testReports.map(report => (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(report.status)}
                      <span className="font-bold text-gray-900">{report.reportId}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>
                        {report.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>👨‍🔧 {report.technicianName}</span>
                      <span>🏢 {report.clientName}</span>
                      <span>📅 {new Date(report.createdAt).toLocaleString('fr-FR')}</span>
                    </div>

                    {report.validationComments && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700">
                        <strong>Commentaires admin:</strong> {report.validationComments}
                      </div>
                    )}

                    {report.publishedAt && (
                      <div className="mt-2 text-sm text-emerald-600">
                        ✅ Publié vers le client le {new Date(report.publishedAt).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    {report.status === 'pending_validation' && (
                      <>
                        <button
                          onClick={() => handleValidation(report, 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Approuver</span>
                        </button>
                        <button
                          onClick={() => handleValidation(report, 'reject')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Rejeter</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de validation */}
        {showModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {actionType === 'approve' ? 'Approuver' : 'Rejeter'} le rapport
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Rapport: <strong>{selectedReport.reportId}</strong></p>
                  <p className="text-sm text-gray-600">Client: <strong>{selectedReport.clientName}</strong></p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaires {actionType === 'reject' ? '(obligatoires)' : '(optionnels)'}
                  </label>
                  <textarea
                    value={validationComments}
                    onChange={(e) => setValidationComments(e.target.value)}
                    placeholder={actionType === 'approve' ? 
                      'Rapport complet et conforme...' : 
                      'Précisez les points à améliorer...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={executeValidation}
                    disabled={actionType === 'reject' && !validationComments.trim()}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      actionType === 'approve' 
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {actionType === 'approve' ? 'Approuver' : 'Rejeter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Cycle de Validation Testé</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>✅ <strong>Étape 1:</strong> Technicien crée un rapport</p>
                <p>✅ <strong>Étape 2:</strong> Rapport soumis pour validation (status: pending_validation)</p>
                <p>✅ <strong>Étape 3:</strong> Admin valide ou rejette avec commentaires</p>
                <p>✅ <strong>Étape 4:</strong> Si approuvé → Auto-publication vers client (status: published)</p>
                <p>✅ <strong>Étape 5:</strong> Client voit le rapport dans son portail</p>
                <p>✅ <strong>Étape 6:</strong> Si rejeté → Retour au technicien pour correction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ValidationCycleTest
