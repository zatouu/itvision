'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { 
  Home, 
  Wifi, 
  Smartphone, 
  Settings, 
  Zap, 
  Shield, 
  TrendingUp, 
  Clock, 
  Lightbulb, 
  Thermometer, 
  Camera, 
  Lock, 
  Cpu,
  Network,
  Radio,
  CheckCircle,
  Star,
  ArrowRight,
  Phone,
  Target,
  Heart,
  Wrench,
  Battery,
  Globe
} from 'lucide-react'
import Link from 'next/link'

export default function DomotiquePage() {
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null)

  const protocols = [
    {
      id: 'mesh-advanced',
      name: 'Protocoles Mesh Avancés',
      description: 'Réseaux maillés auto-cicatrisants pour une robustesse maximale',
      icon: Network,
      features: [
        'Auto-réparation du réseau en cas de panne',
        'Portée étendue par propagation intelligente', 
        'Faible consommation énergétique',
        'Cryptage militaire de bout en bout',
        'Résistance aux interférences',
        'Évolutivité sans limite'
      ],
      advantages: [
        'Fiabilité 99.9% même en cas de coupure',
        'Installation sans infrastructure lourde',
        'Maintenance préventive automatique',
        'Compatibilité multi-marques'
      ]
    },
    {
      id: 'zigbee-pro',
      name: 'Architecture ZigBee Professionnelle',
      description: 'Standard industriel pour l\'IoT avec topologie mesh robuste',
      icon: Radio,
      features: [
        'Topologie mesh autoconfigurante',
        'Support de milliers d\'appareils',
        'Interopérabilité certifiée',
        'Batterie longue durée (>10 ans)',
        'Répéteurs automatiques intégrés',
        'Sécurité AES-128 avancée'
      ],
      advantages: [
        'Écosystème mature et stable',
        'Coût de déploiement optimisé',
        'Évolution technologique continue',
        'Support technique mondial'
      ]
    },
    {
      id: 'proprietary-wireless',
      name: 'Solutions Sans-Fil Propriétaires',
      description: 'Protocoles exclusifs pour performances et sécurité maximales',
      icon: Wifi,
      features: [
        'Fréquences dédiées sans congestion',
        'Algorithmes de routage optimisés',
        'Chiffrement multicouches personnalisé',
        'Diagnostics avancés intégrés',
        'Gestion intelligente de l\'énergie',
        'Redondance multi-chemins'
      ],
      advantages: [
        'Performances prévisibles garanties',
        'Sécurité renforcée par l\'exclusivité',
        'Évolution maîtrisée par nos équipes',
        'Support technique spécialisé'
      ]
    }
  ]

  const solutions = [
    {
      id: 'retrofit',
      title: 'Retrofit Intelligent',
      subtitle: 'Transformez votre habitation existante',
      description: 'Solutions non-invasives pour équiper votre logement actuel sans travaux majeurs. Micro-modules et capteurs sans-fil s\'intègrent parfaitement.',
      icon: Wrench,
      features: [
        'Installation sans percement ni câblage',
        'Micro-modules derrière interrupteurs existants',
        'Capteurs sans-fil autonomes sur batterie',
        'Interface unifiée pour tout contrôler',
        'Compatible avec l\'électricité existante',
        'Évolutif selon vos besoins futurs'
      ],
      budget: 'Accessible',
      budgetDetail: 'À partir de 200€ par pièce',
      timeline: '1-2 jours d\'installation'
    },
    {
      id: 'construction-neuve',
      title: 'Bâtiment Intelligent Intégré',
      subtitle: 'Conception native pour construction neuve',
      description: 'Intégration complète dès la phase de construction pour une domotique invisible et performante. Infrastructure câblée et sans-fil hybride.',
      icon: Home,
      features: [
        'Infrastructure câblée backbone intégrée',
        'Capteurs et actionneurs encastrés',
        'Tableaux électriques intelligents',
        'Pré-câblage spécialisé domotique',
        'Redondance filaire/sans-fil',
        'Évolutivité technologique future'
      ],
      budget: 'Investissement',
      budgetDetail: '3-8% du coût de construction',
      timeline: 'Intégré au planning BTP'
    },
    {
      id: 'hybride',
      title: 'Solution Hybride Progressive',
      subtitle: 'Évolution par étapes selon budget',
      description: 'Approche modulaire permettant de commencer par l\'essentiel et d\'évoluer progressivement. Infrastructure évolutive et investissement maîtrisé.',
      icon: TrendingUp,
      features: [
        'Démarrage par zones prioritaires',
        'Ajout progressif de fonctionnalités',
        'Infrastructure évolutive pré-prévue',
        'ROI immédiat sur chaque étape',
        'Compatibilité ascendante garantie',
        'Financement échelonné possible'
      ],
      budget: 'Modulaire',
      budgetDetail: 'Selon planning et priorités',
      timeline: 'Déploiement progressif'
    }
  ]

  const applications = [
    {
      category: 'Éclairage Intelligent',
      items: [
        'Variation automatique selon luminosité',
        'Scénarios d\'ambiance programmables',
        'Détection de présence intelligente',
        'Gestion énergétique optimisée'
      ]
    },
    {
      category: 'Contrôle Climatique',
      items: [
        'Régulation multi-zones précise',
        'Anticipation météorologique',
        'Détection fenêtres ouvertes',
        'Optimisation consommation'
      ]
    },
    {
      category: 'Sécurité Intégrée',
      items: [
        'Simulation de présence avancée',
        'Détection intrusion multi-capteurs',
        'Caméras avec IA intégrée',
        'Alertes intelligentes contextuelles'
      ]
    },
    {
      category: 'Gestion Énergétique',
      items: [
        'Monitoring temps-réel détaillé',
        'Délestage automatique intelligent',
        'Intégration sources renouvelables',
        'Prédiction consommation IA'
      ]
    }
  ]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-900 via-teal-800 to-blue-900 text-white page-content py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Domotique &amp; <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Bâtiment Intelligent</span>
            </h1>
            <p className="text-xl md:text-2xl text-emerald-100 max-w-4xl mx-auto mb-8">
              Experts en systèmes connectés depuis 2019, nous maîtrisons les protocoles les plus avancés pour créer
              des espaces intelligents, sécurisés et économes en énergie.
            </p>
            
            {/* Points clés */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Network className="h-8 w-8 text-emerald-300 mx-auto mb-3" />
                <div className="text-lg font-bold text-emerald-300">Protocoles Mesh</div>
                <div className="text-sm text-emerald-100">Réseaux auto-cicatrisants robustes</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Target className="h-8 w-8 text-cyan-300 mx-auto mb-3" />
                <div className="text-lg font-bold text-cyan-300">Solutions Sur-Mesure</div>
                <div className="text-sm text-emerald-100">Pas de boîtes noires, total contrôle</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Heart className="h-8 w-8 text-blue-300 mx-auto mb-3" />
                <div className="text-lg font-bold text-blue-300">Tous Budgets</div>
                <div className="text-sm text-emerald-100">Solutions évolutives accessibles</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Protocoles Avancés */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Maîtrise des <span className="text-emerald-600">Protocoles Avancés</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nous utilisons des technologies de communication bien plus robustes que le WiFi classique, 
              garantissant fiabilité, sécurité et performance dans toutes les conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {protocols.map((protocol, index) => {
              const IconComponent = protocol.icon
              return (
                <div
                  key={protocol.id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden modern-card"
                >
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl">
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{protocol.name}</h3>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/95 leading-relaxed">{protocol.description}</p>
                  </div>

                  <div className="p-6">
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Cpu className="h-5 w-5 text-emerald-600 mr-2" />
                        Caractéristiques Techniques
                      </h4>
                      <div className="space-y-2">
                        {protocol.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Star className="h-5 w-5 text-teal-600 mr-2" />
                        Avantages Clients
                      </h4>
                      <div className="space-y-2">
                        {protocol.advantages.map((advantage, idx) => (
                          <div key={idx} className="flex items-start text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            {advantage}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section Solutions Sur-Mesure */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Solutions <span className="text-emerald-600">Sur-Mesure</span> Évolutives
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nous concevons des systèmes adaptés à votre situation, votre budget et vos besoins futurs. 
              Pas de solution unique, mais un système pensé pour vous.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {solutions.map((solution, index) => {
              const IconComponent = solution.icon
              return (
                <div
                  key={solution.id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden modern-card"
                >
                  <div className="bg-gradient-to-r from-teal-500 to-blue-600 p-6 text-white">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{solution.title}</h3>
                        <p className="text-white/90 font-medium">{solution.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-white/95 leading-relaxed">{solution.description}</p>
                  </div>

                  <div className="p-6">
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <CheckCircle className="h-5 w-5 text-teal-600 mr-2" />
                        Inclus dans cette approche
                      </h4>
                      <div className="space-y-2">
                        {solution.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">Budget:</span>
                        <span className={`text-lg font-bold ${
                          solution.budget === 'Accessible' ? 'text-green-600' :
                          solution.budget === 'Modulaire' ? 'text-blue-600' : 'text-orange-600'
                        }`}>{solution.budget}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{solution.budgetDetail}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {solution.timeline}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section Applications */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Applications <span className="text-emerald-600">Intelligentes</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Transformez votre quotidien avec des automatisations pensées pour votre confort, 
              votre sécurité et vos économies d'énergie.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {applications.map((application, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 modern-card"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  {application.category}
                </h3>
                <div className="space-y-3">
                  {application.items.map((item, idx) => (
                    <div key={idx} className="flex items-start">
                      <ArrowRight className="h-4 w-4 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Pourquoi Nous */}
      <section className="py-20 bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pourquoi choisir IT Vision pour votre <span className="text-emerald-400">Domotique</span> ?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Contrôle Total',
                description: 'Pas de boîtes noires ! Vous gardez le contrôle total de votre système avec notre approche transparente.'
              },
              {
                icon: Cpu,
                title: 'Protocoles Avancés',
                description: 'Maîtrise des technologies mesh les plus robustes, bien au-delà du simple WiFi grand public.'
              },
              {
                icon: TrendingUp,
                title: 'Évolutivité Garantie',
                description: 'Infrastructure conçue pour évoluer avec vos besoins et les innovations technologiques futures.'
              },
              {
                icon: Heart,
                title: 'Accessible à Tous',
                description: 'Solutions adaptées à tous les budgets, du retrofit simple aux bâtiments intelligents complets.'
              },
              {
                icon: Wrench,
                title: 'Support Dédié',
                description: 'Équipe technique locale formée et certifiée, support réactif en français et en wolof.'
              }
            ].map((reason, index) => {
              const IconComponent = reason.icon
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mx-auto mb-4">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{reason.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{reason.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Prêt à rendre votre espace intelligent ?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Contactez nos experts domotique pour une étude personnalisée gratuite. 
            Nous analysons vos besoins et votre budget pour vous proposer la solution optimale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/221774133440?text=Bonjour, je souhaite une étude domotique personnalisée. Voici mes informations:%0A- Nom:%0A- Type de logement:%0A- Surface approximative:%0A- Budget envisagé:%0A- Priorités (confort, sécurité, énergie):%0AMerci"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Étude Domotique WhatsApp
            </a>
            <Link
              href="/contact"
              className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Consultation Expert
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            <a
              href="tel:+221774133440"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-all duration-300 inline-flex items-center justify-center"
            >
              <Phone className="h-5 w-5 mr-2" />
              +221 77 413 34 40
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}