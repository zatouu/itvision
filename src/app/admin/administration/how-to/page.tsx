'use client'

import { useState } from 'react'
import AdminPageWrapper from '@/components/admin/AdminPageWrapper'
import {
  BookOpen,
  FileText,
  Users,
  Package,
  Calculator,
  BarChart3,
  Briefcase,
  Wrench,
  AlertCircle,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  Search,
  UserPlus,
  Key,
  Clock,
  Bell,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Globe,
  Lock,
  Eye,
  Edit3
} from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  icon: any
  color: string
  content: {
    title: string
    steps?: string[]
    tips?: string[]
    warning?: string
  }[]
}

export default function AdminHowToPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started'])
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const sections: GuideSection[] = [
    {
      id: 'getting-started',
      title: 'Premiers pas',
      icon: Zap,
      color: 'emerald',
      content: [
        {
          title: 'Connexion à l\'administration',
          steps: [
            'Accédez à la page de connexion via /login',
            'Entrez votre email ou nom d\'utilisateur',
            'Saisissez votre mot de passe',
            'Vous serez redirigé vers le tableau de bord selon votre rôle'
          ],
          tips: [
            'Cochez "Se souvenir de moi" pour rester connecté 30 jours',
            'En cas d\'oubli, utilisez "Mot de passe oublié"'
          ]
        },
        {
          title: 'Navigation dans l\'interface',
          steps: [
            'Le menu latéral gauche donne accès à toutes les sections',
            'Cliquez sur le bouton ◀ pour réduire le menu',
            'Le fil d\'Ariane en haut indique votre position',
            'Utilisez le bouton de recherche pour trouver rapidement'
          ]
        },
        {
          title: 'Comprendre le tableau de bord',
          steps: [
            'Les KPIs en haut montrent les métriques clés',
            'Les graphiques affichent les tendances récentes',
            'Les alertes signalent les actions requises',
            'Les raccourcis permettent un accès rapide aux tâches courantes'
          ]
        }
      ]
    },
    {
      id: 'users',
      title: 'Gestion des utilisateurs',
      icon: Users,
      color: 'blue',
      content: [
        {
          title: 'Créer un nouvel utilisateur',
          steps: [
            'Allez dans Administration > Utilisateurs',
            'Cliquez sur "Nouvel Utilisateur"',
            'Étape 1 : Choisissez le rôle (Client, Technicien, Gestionnaire Produits, etc.)',
            'Étape 2 : Remplissez les informations (nom, email, téléphone)',
            'Étape 3 : Définissez un mot de passe sécurisé',
            'Cliquez sur "Créer le compte"'
          ],
          tips: [
            'Le nom d\'utilisateur doit être unique et sans espaces',
            'L\'email sera utilisé pour les notifications',
            'Choisissez un mot de passe d\'au moins 6 caractères'
          ]
        },
        {
          title: 'Rôles et permissions',
          steps: [
            '👤 CLIENT : Accès au portail client uniquement',
            '🔧 TECHNICIEN : Interface mobile, rapports d\'intervention',
            '📦 GESTIONNAIRE PRODUITS : Catalogue produits, prix, stocks',
            '💰 COMPTABLE : Module comptabilité et facturation',
            '🔐 ADMINISTRATEUR : Accès complet à l\'administration',
            '👑 SUPER ADMIN : Tous droits + gestion des utilisateurs'
          ],
          warning: 'Attribuez les rôles avec précaution. Un Gestionnaire Produits n\'a pas accès à la comptabilité.'
        },
        {
          title: 'Actions sur les utilisateurs',
          steps: [
            '✏️ Modifier : Changer le nom, téléphone, rôle',
            '🔒 Verrouiller : Bloquer temporairement l\'accès',
            '🔓 Déverrouiller : Réactiver un compte bloqué',
            '🔑 Réinitialiser MDP : Définir un nouveau mot de passe',
            '🛡️ 2FA : Activer/désactiver l\'authentification à deux facteurs'
          ]
        }
      ]
    },
    {
      id: 'products',
      title: 'Gestion des produits',
      icon: Package,
      color: 'purple',
      content: [
        {
          title: 'Ajouter un nouveau produit',
          steps: [
            'Allez dans la section Produits',
            'Cliquez sur "Nouveau produit"',
            'Mode simplifié : Remplissez les 5 sections guidées',
            'Mode avancé : Accédez à tous les paramètres détaillés',
            'Enregistrez le produit'
          ],
          tips: [
            'Utilisez le mode simplifié pour un ajout rapide',
            'Le mode avancé permet de configurer le transport et les marges'
          ]
        },
        {
          title: 'Configurer les prix',
          steps: [
            'Prix 1688 : Entrez le prix en Yuan (¥)',
            'Taux de change : Par défaut 1¥ = 100 FCFA',
            'Frais de service : 5%, 10% ou 15%',
            'Marge : Choisissez parmi 15%, 25%, 35% ou 50%',
            'Le prix de vente est calculé automatiquement'
          ]
        },
        {
          title: 'Gérer les catégories',
          steps: [
            '📹 Vidéosurveillance : Caméras, NVR, accessoires',
            '🔐 Contrôle d\'accès : Lecteurs, serrures, interphones',
            '🚨 Alarme : Centrales, détecteurs, sirènes',
            '🔥 Incendie : Détecteurs, extincteurs',
            '🏠 Domotique : Éclairage, prises connectées',
            '🌐 Réseau : Switch, routeurs, câblage'
          ]
        },
        {
          title: 'Import depuis AliExpress/1688',
          steps: [
            'Allez dans l\'onglet "Import express"',
            'Recherchez un produit par mot-clé',
            'Sélectionnez parmi les résultats',
            'Cliquez sur "Importer ce produit"',
            'Ajustez les informations si nécessaire'
          ]
        }
      ]
    },
    {
      id: 'clients',
      title: 'Gestion des clients',
      icon: Briefcase,
      color: 'teal',
      content: [
        {
          title: 'Ajouter un client',
          steps: [
            'Allez dans la section Clients',
            'Cliquez sur "Nouveau client"',
            'Remplissez les informations (nom, email, téléphone)',
            'Ajoutez l\'entreprise et l\'adresse si applicable',
            'Activez l\'accès au portail client si souhaité'
          ]
        },
        {
          title: 'Portail client',
          steps: [
            'Le portail permet au client de suivre ses projets',
            'Il peut voir ses devis et contrats',
            'Il peut ouvrir des tickets de support',
            'Activez/désactivez l\'accès depuis la fiche client'
          ],
          tips: [
            'Un email est envoyé au client lors de l\'activation',
            'Le client peut réinitialiser son mot de passe lui-même'
          ]
        },
        {
          title: 'Contrats de maintenance',
          steps: [
            'Ouvrez la fiche client',
            'Allez dans l\'onglet Contrats',
            'Cliquez sur "Nouveau contrat"',
            'Définissez la durée et les équipements couverts',
            'Planifiez les visites périodiques'
          ]
        }
      ]
    },
    {
      id: 'devis',
      title: 'Gestion des devis',
      icon: FileText,
      color: 'orange',
      content: [
        {
          title: 'Créer un devis',
          steps: [
            'Allez dans la section Devis',
            'Cliquez sur "Nouveau devis"',
            'Sélectionnez le client',
            'Ajoutez les produits et services',
            'Configurez les remises si applicable',
            'Prévisualisez et enregistrez'
          ]
        },
        {
          title: 'Cycle de vie d\'un devis',
          steps: [
            '📝 Brouillon : En cours de rédaction',
            '📤 Envoyé : Transmis au client',
            '✅ Accepté : Client a validé',
            '❌ Refusé : Client a décliné',
            '⏳ Expiré : Délai de validité dépassé'
          ]
        },
        {
          title: 'Envoyer un devis',
          steps: [
            'Ouvrez le devis finalisé',
            'Cliquez sur "Envoyer au client"',
            'Vérifiez l\'email du destinataire',
            'Ajoutez un message personnalisé',
            'Le client reçoit un lien pour voir et accepter'
          ]
        }
      ]
    },
    {
      id: 'technicians',
      title: 'Gestion des techniciens',
      icon: Wrench,
      color: 'indigo',
      content: [
        {
          title: 'Créer un compte technicien',
          steps: [
            'Allez dans Administration > Utilisateurs',
            'Créez un utilisateur avec le rôle "Technicien"',
            'Le technicien apparaît automatiquement dans la liste',
            'Configurez ses spécialités et disponibilités'
          ]
        },
        {
          title: 'Gérer les disponibilités',
          steps: [
            'Allez dans la section Techniciens',
            'Sélectionnez un technicien',
            'Modifiez son statut (disponible/indisponible)',
            'Définissez ses horaires de travail',
            'Gérez ses congés et absences'
          ]
        },
        {
          title: 'Assigner des interventions',
          steps: [
            'Depuis le Marketplace ou Planning',
            'Sélectionnez une intervention à assigner',
            'Choisissez le technicien selon ses compétences',
            'Confirmez l\'affectation',
            'Le technicien reçoit une notification'
          ]
        }
      ]
    },
    {
      id: 'maintenance',
      title: 'Maintenance & interventions',
      icon: Settings,
      color: 'gray',
      content: [
        {
          title: 'Planifier une visite de maintenance',
          steps: [
            'Allez dans la section Maintenance',
            'Sélectionnez le contrat concerné',
            'Cliquez sur "Planifier une visite"',
            'Choisissez la date et le technicien',
            'Définissez les tâches à effectuer'
          ]
        },
        {
          title: 'Valider un rapport d\'intervention',
          steps: [
            'Les rapports arrivent après chaque intervention',
            'Vérifiez les photos et observations',
            'Validez ou demandez des modifications',
            'Le rapport validé est visible par le client'
          ]
        },
        {
          title: 'Suivi des équipements',
          steps: [
            'Chaque client a un inventaire d\'équipements',
            'Suivez l\'historique des interventions',
            'Planifiez les remplacements préventifs',
            'Gérez les garanties et SAV'
          ]
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & statistiques',
      icon: BarChart3,
      color: 'cyan',
      content: [
        {
          title: 'Comprendre les métriques',
          steps: [
            'Visites totales : Nombre de pages vues',
            'Visiteurs uniques : Personnes distinctes',
            'Taux de croissance : Évolution vs période précédente',
            'Pages populaires : Contenus les plus consultés'
          ]
        },
        {
          title: 'Analyser les tendances',
          steps: [
            'Le graphique montre l\'évolution quotidienne',
            'Identifiez les pics de trafic',
            'Comparez les périodes',
            'Exportez les données pour analyse externe'
          ]
        }
      ]
    },
    {
      id: 'comptabilite',
      title: 'Comptabilité',
      icon: Calculator,
      color: 'green',
      content: [
        {
          title: 'Suivi des ventes',
          steps: [
            'Les ventes sont enregistrées automatiquement',
            'Visualisez les courbes de revenus',
            'Filtrez par période, client ou produit',
            'Exportez pour votre comptable'
          ]
        },
        {
          title: 'Analyse des marges',
          steps: [
            'Voir la marge par produit vendu',
            'Identifier les produits les plus rentables',
            'Ajuster les prix si nécessaire'
          ]
        }
      ]
    },
    {
      id: 'support',
      title: 'Support & tickets',
      icon: AlertCircle,
      color: 'red',
      content: [
        {
          title: 'Gérer les tickets',
          steps: [
            'Les tickets sont créés par les clients',
            'Assignez un technicien ou répondez directement',
            'Suivez le statut (ouvert, en cours, résolu)',
            'Fermez le ticket une fois résolu'
          ]
        },
        {
          title: 'Priorisation',
          steps: [
            '🔴 Urgent : Système hors service',
            '🟠 Haute : Problème majeur',
            '🟡 Moyenne : Demande standard',
            '🟢 Basse : Question simple'
          ]
        }
      ]
    },
    {
      id: 'security',
      title: 'Sécurité & sessions',
      icon: Shield,
      color: 'slate',
      content: [
        {
          title: 'Gestion des sessions',
          steps: [
            'Votre session expire après 30 minutes d\'inactivité',
            'Un avertissement apparaît 5 minutes avant',
            'Cliquez sur "Continuer" pour prolonger',
            'En cas d\'expiration, reconnectez-vous'
          ],
          warning: 'Ne partagez jamais vos identifiants. Déconnectez-vous sur les postes partagés.'
        },
        {
          title: 'Authentification à deux facteurs (2FA)',
          steps: [
            'Activez le 2FA depuis votre profil',
            'Un code à 6 chiffres sera demandé à chaque connexion',
            'Le code est envoyé par email',
            'Valable 10 minutes'
          ],
          tips: [
            'Le 2FA protège votre compte même si votre mot de passe est compromis'
          ]
        },
        {
          title: 'Bonnes pratiques',
          steps: [
            'Utilisez un mot de passe unique et complexe',
            'Ne vous connectez pas sur des réseaux publics non sécurisés',
            'Déconnectez-vous après utilisation sur un poste partagé',
            'Signalez immédiatement toute activité suspecte'
          ]
        }
      ]
    }
  ]

  // Filtrer les sections selon la recherche
  const filteredSections = sections.filter(section => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    if (section.title.toLowerCase().includes(query)) return true
    return section.content.some(c => 
      c.title.toLowerCase().includes(query) ||
      c.steps?.some(s => s.toLowerCase().includes(query)) ||
      c.tips?.some(t => t.toLowerCase().includes(query))
    )
  })

  const getColorClasses = (color: string) => ({
    bg: `bg-${color}-50`,
    bgDark: `bg-${color}-100`,
    text: `text-${color}-600`,
    border: `border-${color}-200`,
    hover: `hover:bg-${color}-100`
  })

  return (
    <AdminPageWrapper
      title="Guide d'utilisation"
      description="Documentation complète pour maîtriser le panel d'administration"
    >
      <div className="max-w-4xl mx-auto">
        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans le guide..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {filteredSections.map((section) => {
            const Icon = section.icon
            const isExpanded = expandedSections.includes(section.id)
            
            return (
              <div
                key={section.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                {/* Header de la section */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-${section.color}-100`}>
                      <Icon className={`h-6 w-6 text-${section.color}-600`} />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                      <p className="text-sm text-gray-500">{section.content.length} sujets</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Contenu de la section */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4">
                    {section.content.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl bg-gray-50 border border-gray-100`}
                      >
                        <h3 className="font-medium text-gray-900 mb-3">{item.title}</h3>
                        
                        {item.steps && (
                          <ol className="space-y-2 mb-3">
                            {item.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-medium mt-0.5">
                                  {stepIdx + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        )}

                        {item.tips && item.tips.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                              <Info className="h-4 w-4" />
                              Conseils
                            </div>
                            <ul className="space-y-1">
                              {item.tips.map((tip, tipIdx) => (
                                <li key={tipIdx} className="text-sm text-blue-600 flex items-start gap-1.5">
                                  <span>•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.warning && (
                          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <span className="text-sm text-amber-700">{item.warning}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">💡 Besoin d'aide supplémentaire ?</h3>
          <p className="text-emerald-100 text-sm mb-4">
            Si vous ne trouvez pas la réponse à votre question, contactez le support technique.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:support@itvisionplus.sn"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition"
            >
              📧 support@itvisionplus.sn
            </a>
            <a
              href="tel:+221338000000"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition"
            >
              📞 +221 33 800 00 00
            </a>
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  )
}
