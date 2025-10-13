'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Building, 
  MapPin, 
  Calendar, 
  Clock, 
  Camera, 
  FileText, 
  Save, 
  Send, 
  Search, 
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  Smartphone,
  Wifi,
  Battery,
  Signal,
  Navigation,
  ArrowRight,
  Eye,
  Upload,
  Mic,
  Video
} from 'lucide-react'

interface Client {
  id: string
  name: string
  company: string
  contact: string
  phone: string
  email: string
  projects: Array<{
    id: string
    name: string
    site: string
    address: string
    type: string
  }>
}

interface ReportTemplate {
  id: string
  name: string
  category: string
  fields: Array<{
    id: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'file'
    required: boolean
    options?: string[]
    placeholder?: string
  }>
}

export default function TechnicianReportInterface() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [reportData, setReportData] = useState<any>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<{before: any[], after: any[]}>({before: [], after: []})

  // Base de données clients IT Vision
  const clients: Client[] = [
    {
      id: 'CLI-001',
      name: 'Amadou Ba',
      company: 'IT Solutions SARL',
      contact: 'Directeur IT',
      phone: '+221 77 123 45 67',
      email: 'amadou.ba@itsolutions.sn',
      projects: [
        {
          id: 'PRJ-001',
          name: 'Vidéosurveillance Siège',
          site: 'Siège Parcelles Assainies',
          address: 'Parcelles Assainies, Unité 25, Dakar',
          type: 'Vidéosurveillance'
        }
      ]
    },
    {
      id: 'CLI-002',
      name: 'Aïssatou Diop',
      company: 'Commerce Plus',
      contact: 'Responsable Sécurité',
      phone: '+221 77 234 56 78',
      email: 'aissatou@commerceplus.sn',
      projects: [
        {
          id: 'PRJ-002',
          name: 'Sécurité Magasin',
          site: 'Magasin Plateau',
          address: 'Avenue Pompidou, Plateau, Dakar',
          type: 'Vidéosurveillance + Alarme'
        },
        {
          id: 'PRJ-006',
          name: 'Entrepôt Pikine',
          site: 'Entrepôt Pikine',
          address: 'Zone industrielle, Pikine',
          type: 'Contrôle d\'accès'
        }
      ]
    },
    {
      id: 'CLI-003',
      name: 'Moussa Kébé',
      company: 'Résidence Almadies',
      contact: 'Gestionnaire',
      phone: '+221 77 345 67 89',
      email: 'moussa@almadies.sn',
      projects: [
        {
          id: 'PRJ-003',
          name: 'Contrôle d\'accès résidence',
          site: 'Résidence Almadies',
          address: 'Route des Almadies, Dakar',
          type: 'Contrôle d\'accès'
        }
      ]
    },
    {
      id: 'CLI-004',
      name: 'Fatou Sarr',
      company: 'Banque Atlantique',
      contact: 'Responsable Sécurité',
      phone: '+221 77 456 78 90',
      email: 'fatou.sarr@ba.sn',
      projects: [
        {
          id: 'PRJ-004',
          name: 'Sécurité Agence Point E',
          site: 'Agence Point E',
          address: 'Point E, Dakar',
          type: 'Vidéosurveillance + Alarme'
        },
        {
          id: 'PRJ-007',
          name: 'Centre de données',
          site: 'Data Center Yoff',
          address: 'Zone technologique, Yoff',
          type: 'Sécurité Complète'
        }
      ]
    },
    {
      id: 'CLI-005',
      name: 'Mamadou Fall',
      company: 'Hôtel Terrou-Bi',
      contact: 'Directeur Technique',
      phone: '+221 77 567 89 01',
      email: 'mamadou@terrooubi.sn',
      projects: [
        {
          id: 'PRJ-005',
          name: 'Sécurité Hôtel',
          site: 'Hôtel Terrou-Bi',
          address: 'Route de la Corniche Ouest, Dakar',
          type: 'Vidéosurveillance + Contrôle d\'accès'
        }
      ]
    }
  ]

  // Templates de rapports
  const templates: ReportTemplate[] = [
    {
      id: 'maintenance_mensuelle',
      name: 'Maintenance Mensuelle',
      category: 'Maintenance',
      fields: [
        { id: 'duration', label: 'Durée intervention', type: 'text', required: true, placeholder: 'Ex: 2h30' },
        { id: 'system_state', label: 'État général du système', type: 'select', required: true, options: ['Excellent', 'Bon', 'Moyen', 'Dégradé', 'Critique'] },
        { id: 'tasks_performed', label: 'Tâches réalisées', type: 'textarea', required: true, placeholder: 'Listez toutes les tâches effectuées...' },
        { id: 'observations', label: 'Observations', type: 'textarea', required: true, placeholder: 'Observations et constats...' },
        { id: 'issues_found', label: 'Problèmes détectés', type: 'textarea', required: false, placeholder: 'Problèmes identifiés...' },
        { id: 'recommendations', label: 'Recommandations', type: 'textarea', required: false, placeholder: 'Recommandations pour amélioration...' },
        { id: 'next_maintenance', label: 'Prochaine maintenance', type: 'select', required: true, options: ['1 mois', '2 mois', '3 mois', '6 mois', 'À définir'] }
      ]
    },
    {
      id: 'intervention_corrective',
      name: 'Intervention Corrective',
      category: 'Réparation',
      fields: [
        { id: 'duration', label: 'Durée intervention', type: 'text', required: true, placeholder: 'Ex: 3h15' },
        { id: 'problem_description', label: 'Description du problème', type: 'textarea', required: true, placeholder: 'Décrivez le problème initial...' },
        { id: 'diagnosis', label: 'Diagnostic', type: 'textarea', required: true, placeholder: 'Analyse et diagnostic...' },
        { id: 'solution_applied', label: 'Solution appliquée', type: 'textarea', required: true, placeholder: 'Actions correctives réalisées...' },
        { id: 'parts_used', label: 'Pièces utilisées', type: 'textarea', required: false, placeholder: 'Liste des pièces remplacées...' },
        { id: 'tests_performed', label: 'Tests effectués', type: 'textarea', required: true, placeholder: 'Tests de validation...' },
        { id: 'system_status', label: 'État final du système', type: 'select', required: true, options: ['Complètement opérationnel', 'Partiellement fonctionnel', 'Nécessite intervention supplémentaire'] },
        { id: 'follow_up_needed', label: 'Suivi nécessaire', type: 'select', required: false, options: ['Oui', 'Non'] }
      ]
    },
    {
      id: 'installation_nouvelle',
      name: 'Installation Nouvelle',
      category: 'Installation',
      fields: [
        { id: 'duration', label: 'Durée installation', type: 'text', required: true, placeholder: 'Ex: 8h00' },
        { id: 'equipment_installed', label: 'Équipements installés', type: 'textarea', required: true, placeholder: 'Liste détaillée des équipements...' },
        { id: 'configuration', label: 'Configuration réalisée', type: 'textarea', required: true, placeholder: 'Paramètres et configuration...' },
        { id: 'tests_commissioning', label: 'Tests de mise en service', type: 'textarea', required: true, placeholder: 'Tests réalisés...' },
        { id: 'training_provided', label: 'Formation dispensée', type: 'textarea', required: false, placeholder: 'Formation utilisateurs...' },
        { id: 'documentation_delivered', label: 'Documentation remise', type: 'multiselect', required: false, options: ['Manuel utilisateur', 'Schémas installation', 'Codes d\'accès', 'Contacts support', 'Garanties'] },
        { id: 'acceptance_criteria', label: 'Critères d\'acceptation', type: 'textarea', required: true, placeholder: 'Validation finale...' }
      ]
    },
    {
      id: 'inspection_securite',
      name: 'Inspection Sécurité',
      category: 'Contrôle',
      fields: [
        { id: 'duration', label: 'Durée inspection', type: 'text', required: true, placeholder: 'Ex: 1h30' },
        { id: 'areas_inspected', label: 'Zones inspectées', type: 'textarea', required: true, placeholder: 'Liste des zones contrôlées...' },
        { id: 'compliance_status', label: 'Conformité générale', type: 'select', required: true, options: ['Conforme', 'Non-conforme mineur', 'Non-conforme majeur', 'Critique'] },
        { id: 'security_assessment', label: 'Évaluation sécurité', type: 'textarea', required: true, placeholder: 'Évaluation globale de la sécurité...' },
        { id: 'vulnerabilities', label: 'Vulnérabilités identifiées', type: 'textarea', required: false, placeholder: 'Points faibles détectés...' },
        { id: 'recommendations_priority', label: 'Recommandations prioritaires', type: 'textarea', required: false, placeholder: 'Actions prioritaires...' },
        { id: 'next_inspection', label: 'Prochaine inspection', type: 'select', required: true, options: ['3 mois', '6 mois', '1 an', 'À définir'] }
      ]
    }
  ]

  const filteredClients = clients.filter(client =>
    client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.projects.some(project => project.site.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setSelectedProject(null)
    setCurrentStep(2)
  }

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project)
    setCurrentStep(3)
  }

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setCurrentStep(4)
    
    // Initialiser les données du rapport
    const initialData: any = {}
    template.fields.forEach(field => {
      initialData[field.id] = field.type === 'multiselect' ? [] : ''
    })
    setReportData(initialData)
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setReportData((prev: any) => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleSubmit = async (status: 'draft' | 'pending_validation') => {
    setIsSubmitting(true)
    
    const reportPayload = {
      id: `RPT-${Date.now()}`,
      technicianId: 'TECH-001', // ID du technicien connecté
      technicianName: 'Moussa Diop',
      clientId: selectedClient?.id,
      clientName: selectedClient?.name,
      clientCompany: selectedClient?.company,
      projectId: selectedProject?.id,
      projectName: selectedProject?.name,
      site: selectedProject?.site,
      templateId: selectedTemplate?.id,
      templateName: selectedTemplate?.name,
      data: reportData,
      photos,
      status,
      createdAt: new Date().toISOString(),
      interventionDate: new Date().toISOString().split('T')[0]
    }

    // Simulation API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Rapport soumis:', reportPayload)
    
    setIsSubmitting(false)
    
    // Redirection ou notification de succès
    alert(status === 'draft' ? 'Brouillon sauvegardé !' : 'Rapport soumis pour validation !')
    
    // Reset pour nouveau rapport
    setCurrentStep(1)
    setSelectedClient(null)
    setSelectedProject(null)
    setSelectedTemplate(null)
    setReportData({})
    setPhotos({before: [], after: []})
  }

  const renderField = (field: any) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={reportData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        )
      
      case 'textarea':
        return (
          <textarea
            value={reportData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        )
      
      case 'select':
        return (
          <select
            value={reportData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required={field.required}
          >
            <option value="">Sélectionner...</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(reportData[field.id] || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = reportData[field.id] || []
                    if (e.target.checked) {
                      handleFieldChange(field.id, [...currentValues, option])
                    } else {
                      handleFieldChange(field.id, currentValues.filter((v: string) => v !== option))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header avec progression */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📱 Interface Technicien
        </h1>
        <p className="text-gray-600">Création de rapport d'intervention</p>
        
        {/* Barre de progression */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            {[
              { step: 1, label: 'Client' },
              { step: 2, label: 'Projet' },
              { step: 3, label: 'Template' },
              { step: 4, label: 'Rapport' }
            ].map((item) => (
              <div key={item.step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= item.step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {item.step}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= item.step ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
                {item.step < 4 && <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Étape 1: Sélection Client */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">1. Sélectionner le client</h2>
          
          {/* Recherche */}
          <div className="mb-6">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Rechercher par entreprise, contact ou site..."
              />
            </div>
          </div>

          {/* Liste des clients */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleClientSelect(client)}
                className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{client.company}</h3>
                    <p className="text-sm text-gray-600">{client.name} - {client.contact}</p>
                  </div>
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <p>📞 {client.phone}</p>
                  <p>✉️ {client.email}</p>
                </div>
                
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 mb-2">Projets actifs:</p>
                  {client.projects.slice(0, 2).map((project) => (
                    <div key={project.id} className="text-xs text-gray-600">
                      • {project.name} ({project.site})
                    </div>
                  ))}
                  {client.projects.length > 2 && (
                    <div className="text-xs text-gray-500">+{client.projects.length - 2} autres</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Étape 2: Sélection Projet */}
      {currentStep === 2 && selectedClient && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            2. Sélectionner le projet - {selectedClient.company}
          </h2>
          
          {/* Info client sélectionné */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{selectedClient.company}</p>
                <p className="text-sm text-blue-700">{selectedClient.name} - {selectedClient.phone}</p>
              </div>
            </div>
          </div>

          {/* Liste des projets */}
          <div className="space-y-4">
            {selectedClient.projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2">{project.name}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{project.site}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>{project.address}</span>
                      </div>
                    </div>
                    <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {project.type}
                    </span>
                  </div>
                  <div className="ml-4">
                    <span className="text-sm font-mono text-gray-500">{project.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(1)}
            className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Changer de client
          </button>
        </div>
      )}

      {/* Étape 3: Sélection Template */}
      {currentStep === 3 && selectedProject && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            3. Type d'intervention - {selectedProject.name}
          </h2>
          
          {/* Info projet sélectionné */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">{selectedProject.name}</p>
                <p className="text-sm text-green-700">{selectedProject.site} - {selectedProject.address}</p>
              </div>
            </div>
          </div>

          {/* Templates disponibles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {template.category}
                    </span>
                  </div>
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {template.fields.length} champs à remplir
                </p>
                
                <div className="text-xs text-gray-500">
                  Champs requis: {template.fields.filter(f => f.required).length}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(2)}
            className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Changer de projet
          </button>
        </div>
      )}

      {/* Étape 4: Formulaire de rapport */}
      {currentStep === 4 && selectedTemplate && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            4. {selectedTemplate.name}
          </h2>
          
          {/* Résumé sélection */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Client:</span>
                <p className="font-medium">{selectedClient?.company}</p>
              </div>
              <div>
                <span className="text-gray-600">Projet:</span>
                <p className="font-medium">{selectedProject?.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <p className="font-medium">{selectedTemplate.name}</p>
              </div>
            </div>
          </div>

          {/* Formulaire dynamique */}
          <div className="space-y-6">
            {selectedTemplate.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Section photos */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Photos AVANT</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Ajouter photos avant intervention</p>
                <button className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  Prendre photo
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Photos APRÈS</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Ajouter photos après intervention</p>
                <button className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded">
                  Prendre photo
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Changer template
            </button>
            
            <button
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder brouillon
            </button>
            
            <button
              onClick={() => handleSubmit('pending_validation')}
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Soumettre pour validation
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}