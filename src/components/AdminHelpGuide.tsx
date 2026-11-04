'use client'

import { useState } from 'react'
import { 
  HelpCircle, 
  X, 
  ChevronDown, 
  ChevronUp,
  Book,
  Video,
  MessageCircle,
  ExternalLink,
  Lightbulb,
  Package,
  DollarSign,
  FileText,
  Settings,
  Users
} from 'lucide-react'

interface HelpSection {
  id: string
  title: string
  icon: any
  questions: {
    q: string
    a: string
    steps?: string[]
  }[]
}

export default function AdminHelpGuide() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('products')
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  const helpSections: HelpSection[] = [
    {
      id: 'products',
      title: 'Gestion des Produits',
      icon: Package,
      questions: [
        {
          q: 'Comment ajouter un nouveau produit ?',
          a: 'Rendez-vous sur la page Admin Produits pour ajouter de nouveaux articles.',
          steps: [
            'Aller sur /admin-produits',
            'Cliquer sur "➕ Nouveau Produit"',
            'Remplir le formulaire (nom, modèle, marque, catégorie)',
            'Définir les prix de vente et de coût',
            'Ajouter les spécifications techniques',
            'Uploader une image produit (optionnel)',
            'Cliquer sur "💾 Enregistrer"'
          ]
        },
        {
          q: 'Comment modifier un produit existant ?',
          a: 'Vous pouvez modifier les produits depuis la liste.',
          steps: [
            'Aller sur /admin-produits',
            'Chercher le produit dans la liste',
            'Cliquer sur l\'icône "✏️ Modifier"',
            'Modifier les informations nécessaires',
            'Sauvegarder les changements'
          ]
        },
        {
          q: 'Comment organiser les produits par catégorie ?',
          a: 'Les produits sont automatiquement organisés par service et catégorie.',
          steps: [
            'Sélectionner la catégorie lors de la création',
            'Catégories disponibles : Vidéosurveillance, Domotique, Contrôle d\'Accès, etc.',
            'Utiliser le filtre par catégorie pour afficher uniquement certains produits'
          ]
        }
      ]
    },
    {
      id: 'prices',
      title: 'Gestion des Prix',
      icon: DollarSign,
      questions: [
        {
          q: 'Comment modifier les prix rapidement ?',
          a: 'Utilisez l\'éditeur rapide de prix pour des modifications en masse.',
          steps: [
            'Aller sur /admin-prix',
            'Chercher les produits à modifier',
            'Modifier directement les prix dans la liste',
            'Les marges se calculent automatiquement',
            'Cliquer sur "💾 Sauvegarder" pour chaque produit'
          ]
        },
        {
          q: 'Comment calculer les marges ?',
          a: 'Les marges sont calculées automatiquement selon la formule : (Prix Vente - Prix Coût) / Prix Vente × 100',
          steps: [
            'Entrer le Prix de Coût (achat fournisseur)',
            'Entrer le Prix de Vente (prix client)',
            'La marge s\'affiche automatiquement',
            'Une alerte apparaît si la marge est < 20%'
          ]
        },
        {
          q: 'Comment définir des prix par variant ?',
          a: 'Chaque produit peut avoir plusieurs variants avec des prix différents.',
          steps: [
            'Aller sur /admin/prices',
            'Sélectionner le type de produit',
            'Voir tous les variants (ex: NVR 4/8/16/32 canaux)',
            'Définir le prix pour chaque variant',
            'Sauvegarder les modifications'
          ]
        }
      ]
    },
    {
      id: 'quotes',
      title: 'Création de Devis',
      icon: FileText,
      questions: [
        {
          q: 'Comment créer un devis ?',
          a: 'Le générateur de devis permet de créer des devis professionnels rapidement.',
          steps: [
            'Aller sur /admin/quotes',
            'Sélectionner le service (Vidéosurveillance, etc.)',
            'Ajouter des produits avec le bouton "+"',
            'Définir les quantités',
            'Les prix se calculent automatiquement',
            'Ajouter des notes si nécessaire',
            'Générer le PDF ou envoyer par email'
          ]
        },
        {
          q: 'Comment personnaliser un devis ?',
          a: 'Vous pouvez personnaliser chaque section du devis.',
          steps: [
            'Ajouter des sections personnalisées',
            'Modifier les descriptions des produits',
            'Ajouter des remises globales ou par ligne',
            'Inclure des conditions de paiement',
            'Ajouter le logo de l\'entreprise'
          ]
        }
      ]
    },
    {
      id: 'catalog',
      title: 'Catalogue Produits',
      icon: Book,
      questions: [
        {
          q: 'À quoi sert le catalogue ?',
          a: 'Le catalogue permet d\'explorer tous les types de produits disponibles par service.',
          steps: [
            'Aller sur /admin/catalog',
            'Sélectionner un service',
            'Voir tous les types de produits disponibles',
            'Cliquer sur un produit pour voir les variants et spécifications'
          ]
        },
        {
          q: 'Comment explorer les produits par service ?',
          a: 'Le catalogue est organisé par service pour une navigation facile.',
          steps: [
            'Utiliser les onglets en haut (Vidéosurveillance, Domotique, etc.)',
            'Voir les catégories de produits pour le service sélectionné',
            'Cliquer sur "Voir les variants" pour plus de détails'
          ]
        }
      ]
    },
    {
      id: 'workflow',
      title: 'Workflow Recommandé',
      icon: Settings,
      questions: [
        {
          q: 'Quel est le workflow recommandé ?',
          a: 'Suivez ces étapes pour une utilisation optimale du système.',
          steps: [
            '1️⃣ Explorer le Catalogue (/admin/catalog) - Découvrir les produits disponibles',
            '2️⃣ Configurer les Prix (/admin/prices) - Définir les prix et marges',
            '3️⃣ Créer des Devis (/admin/quotes) - Générer des devis professionnels'
          ]
        },
        {
          q: 'Comment organiser mon travail quotidien ?',
          a: 'Voici une routine quotidienne efficace.',
          steps: [
            '🌅 Matin : Vérifier les nouveaux projets et demandes',
            '📊 Midi : Mettre à jour les prix si nécessaire',
            '📝 Après-midi : Créer les devis pour les nouveaux clients',
            '📧 Fin de journée : Envoyer les devis et suivre les relances'
          ]
        }
      ]
    },
    {
      id: 'support',
      title: 'Aide et Support',
      icon: MessageCircle,
      questions: [
        {
          q: 'Comment contacter le support ?',
          a: 'Plusieurs canaux de support sont disponibles.',
          steps: [
            '📱 WhatsApp : +221 77 413 34 40 (24/7)',
            '📧 Email : support@itvision.sn',
            '🌐 Site Web : https://itvision.sn',
            '💬 Chat en ligne : Disponible sur le portail'
          ]
        },
        {
          q: 'Où trouver la documentation complète ?',
          a: 'La documentation est disponible dans le dossier du projet.',
          steps: [
            'Fichier : CORRECTIONS_ET_AMELIORATIONS.md',
            'Contient toutes les fonctionnalités',
            'Guides d\'utilisation détaillés',
            'FAQ et résolution de problèmes'
          ]
        }
      ]
    }
  ]

  const activeHelpSection = helpSections.find(s => s.id === activeSection)

  return (
    <>
      {/* Bouton d'aide flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="Aide et Guide"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Modal d'aide */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Contenu */}
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Book className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Guide d'Utilisation</h2>
                    <p className="text-blue-100 text-sm">Centre d'aide IT Vision Admin</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Navigation sections */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 overflow-x-auto">
              <div className="flex space-x-2">
                {helpSections.map((section) => {
                  const IconComponent = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="text-sm">{section.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contenu des questions */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeHelpSection && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-6">
                    {(() => {
                      const Icon = activeHelpSection.icon
                      return <Icon className="h-8 w-8 text-blue-600" />
                    })()}
                    <h3 className="text-2xl font-bold text-gray-900">{activeHelpSection.title}</h3>
                  </div>

                  {activeHelpSection.questions.map((item, index) => {
                    const questionId = `${activeSection}-${index}`
                    const isExpanded = expandedQuestion === questionId

                    return (
                      <div
                        key={questionId}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <button
                          onClick={() => setExpandedQuestion(isExpanded ? null : questionId)}
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start space-x-3 flex-1 text-left">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.q}</h4>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 bg-gray-50">
                            <div className="ml-9">
                              <p className="text-gray-700 mb-3">{item.a}</p>
                              
                              {item.steps && item.steps.length > 0 && (
                                <div className="bg-white rounded-lg p-4 border border-blue-100">
                                  <div className="flex items-center space-x-2 mb-3">
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm font-medium text-gray-900">Étapes détaillées :</span>
                                  </div>
                                  <ol className="space-y-2">
                                    {item.steps.map((step, stepIndex) => (
                                      <li key={stepIndex} className="flex items-start space-x-2">
                                        <span className="text-blue-600 font-mono text-sm flex-shrink-0">
                                          {String(stepIndex + 1).padStart(2, '0')}.
                                        </span>
                                        <span className="text-gray-700 text-sm">{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/CORRECTIONS_ET_AMELIORATIONS.md"
                  target="_blank"
                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Book className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Documentation</p>
                    <p className="text-xs text-gray-500">Guide complet</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                </a>

                <a
                  href="https://wa.me/221774133440"
                  target="_blank"
                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">WhatsApp</p>
                    <p className="text-xs text-gray-500">Support 24/7</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                </a>

                <a
                  href="mailto:support@itvision.sn"
                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Video className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Email Support</p>
                    <p className="text-xs text-gray-500">Assistance technique</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}