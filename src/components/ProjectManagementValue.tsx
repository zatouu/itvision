'use client'

import { useState } from 'react'
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Shield, 
  CheckCircle, 
  Clock, 
  DollarSign,
  TrendingUp,
  Target,
  Activity,
  FileText,
  MessageCircle,
  Star,
  Award,
  Zap,
  Eye,
  Lock,
  Smartphone,
  Globe,
  Layers,
  GitBranch,
  Bell,
  PieChart,
  LineChart,
  BarChart,
  ArrowRight,
  Play
} from 'lucide-react'

export default function ProjectManagementValue() {
  const [activeFeature, setActiveFeature] = useState('dashboard')

  const features = {
    dashboard: {
      title: "Tableau de Bord Temps Réel",
      description: "Vision complète de l'avancement projet avec métriques clés",
      benefits: [
        "Progression visuelle instantanée",
        "Métriques de performance en temps réel", 
        "Alertes automatiques",
        "Indicateurs qualité"
      ],
      stats: "95% de satisfaction client"
    },
    tasks: {
      title: "Gestion de Tâches Avancée",
      description: "Suivi détaillé de chaque étape avec timeline interactive",
      benefits: [
        "Planning détaillé avec dépendances",
        "Affectation d'équipes",
        "Suivi progression par tâche",
        "Gestion des priorités"
      ],
      stats: "30% de gain de temps"
    },
    communication: {
      title: "Communication Centralisée", 
      description: "Tous les échanges projet dans un seul endroit",
      benefits: [
        "Historique complet des échanges",
        "Notifications instantanées",
        "Partage de fichiers sécurisé",
        "Traçabilité totale"
      ],
      stats: "80% moins d'emails"
    },
    financial: {
      title: "Suivi Financier Transparent",
      description: "Visibilité complète sur budget et facturation",
      benefits: [
        "Suivi budget en temps réel",
        "Factures et paiements",
        "Répartition des coûts",
        "Prévisions financières"
      ],
      stats: "100% transparence"
    }
  }

  const competitorComparison = [
    {
      feature: "Accès client 24/7",
      itVision: true,
      traditional: false,
      description: "Vos clients peuvent suivre leurs projets à tout moment"
    },
    {
      feature: "Gestion de projet intégrée",
      itVision: true,
      traditional: false, 
      description: "Outil complet de gestion inclus gratuitement"
    },
    {
      feature: "Communication centralisée",
      itVision: true,
      traditional: false,
      description: "Fini les emails perdus et appels répétés"
    },
    {
      feature: "Transparence financière",
      itVision: true,
      traditional: false,
      description: "Budget et factures accessibles en temps réel"
    },
    {
      feature: "Historique complet",
      itVision: true,
      traditional: false,
      description: "Toute la documentation projet centralisée"
    },
    {
      feature: "Application mobile",
      itVision: true,
      traditional: false,
      description: "Accès depuis smartphone/tablette"
    }
  ]

  const clientTestimonials = [
    {
      name: "Amadou Ba",
      company: "IT Solutions SARL",
      role: "Directeur IT",
      testimonial: "Enfin une entreprise qui nous donne une vraie visibilité sur nos projets ! Plus besoin d'appeler pour avoir des nouvelles.",
      rating: 5,
      project: "Vidéosurveillance 16 caméras"
    },
    {
      name: "Aïssatou Diop", 
      company: "Commerce Plus",
      role: "Responsable Sécurité",
      testimonial: "Le portail client est révolutionnaire. Je peux suivre la maintenance en temps réel et programmer les interventions.",
      rating: 5,
      project: "Contrat maintenance"
    },
    {
      name: "Moussa Kébé",
      company: "Résidence Almadies",
      role: "Gestionnaire",
      testimonial: "Interface très professionnelle. Nos résidents apprécient la transparence sur les travaux de sécurité.",
      rating: 5,
      project: "Contrôle d'accès"
    }
  ]

  return (
    <div className="py-20 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Award className="h-4 w-4" />
            <span>Exclusivité IT Vision</span>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Portail Client <span className="text-blue-600">Révolutionnaire</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            <strong>Le seul au Sénégal</strong> à offrir un véritable outil de gestion de projet 
            <span className="text-green-600 font-semibold"> GRATUIT</span> avec nos services !
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">100% Gratuit</h3>
              <p className="text-sm text-gray-600">Inclus avec tous nos services</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Accès 24/7</h3>
              <p className="text-sm text-gray-600">Mobile et web</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Ultra Sécurisé</h3>
              <p className="text-sm text-gray-600">Chiffrement bancaire</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">ROI Immédiat</h3>
              <p className="text-sm text-gray-600">Gain de temps</p>
            </div>
          </div>
        </div>

        {/* Démonstration Interactive */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            🚀 <span className="text-blue-600">Fonctionnalités Exclusives</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Navigation des fonctionnalités */}
            <div className="space-y-4">
              {Object.entries(features).map(([key, feature]) => (
                <button
                  key={key}
                  onClick={() => setActiveFeature(key)}
                  className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${
                    activeFeature === key 
                      ? 'bg-white shadow-xl border-2 border-blue-500 transform scale-105' 
                      : 'bg-white/70 shadow-lg hover:shadow-xl border border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeFeature === key ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {key === 'dashboard' && <BarChart3 className={`h-6 w-6 ${activeFeature === key ? 'text-blue-600' : 'text-gray-600'}`} />}
                      {key === 'tasks' && <Calendar className={`h-6 w-6 ${activeFeature === key ? 'text-blue-600' : 'text-gray-600'}`} />}
                      {key === 'communication' && <MessageCircle className={`h-6 w-6 ${activeFeature === key ? 'text-blue-600' : 'text-gray-600'}`} />}
                      {key === 'financial' && <DollarSign className={`h-6 w-6 ${activeFeature === key ? 'text-blue-600' : 'text-gray-600'}`} />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                      <div className="mt-2">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          {feature.stats}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Aperçu de la fonctionnalité active */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {features[activeFeature as keyof typeof features].title}
              </h3>
              
              <div className="space-y-4 mb-6">
                {features[activeFeature as keyof typeof features].benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-gray-900">Impact Mesurable</span>
                </div>
                <p className="text-gray-700 text-lg font-medium">
                  {features[activeFeature as keyof typeof features].stats}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Comparaison Concurrentielle */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            ⚔️ <span className="text-red-600">Nous vs</span> <span className="text-gray-600">Concurrence</span>
          </h2>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 p-6 text-center font-bold text-gray-900">
              <div>Fonctionnalité</div>
              <div className="text-blue-600">IT Vision</div>
              <div className="text-gray-600">Concurrence Traditionnelle</div>
            </div>

            {competitorComparison.map((item, index) => (
              <div key={index} className="grid grid-cols-3 p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-medium text-gray-900">{item.feature}</div>
                  <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                </div>
                <div className="flex items-center justify-center">
                  {item.itVision ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-6 w-6" />
                      <span className="font-semibold">Inclus</span>
                    </div>
                  ) : (
                    <div className="text-red-500 font-semibold">❌</div>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  {item.traditional ? (
                    <div className="text-green-600 font-semibold">✅</div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-500">
                      <span className="font-semibold">❌ Non disponible</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Témoignages Clients */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            💬 <span className="text-blue-600">Nos Clients Témoignent</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {clientTestimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-gray-700 italic mb-6">
                  "{testimonial.testimonial}"
                </blockquote>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.company}</div>
                  <div className="text-xs text-gray-500 mt-2">{testimonial.project}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI et Valeur Business */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            💰 <span className="text-green-600">Retour sur Investissement</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center border border-green-100">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">-70%</h3>
              <p className="text-gray-600">Temps de communication</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 text-center border border-blue-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-blue-600 mb-2">+95%</h3>
              <p className="text-gray-600">Satisfaction client</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 text-center border border-purple-100">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-purple-600 mb-2">100%</h3>
              <p className="text-gray-600">Transparence projet</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 text-center border border-yellow-100">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-yellow-600 mb-2">GRATUIT</h3>
              <p className="text-gray-600">Outil de gestion projet</p>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            🎯 Votre Avantage Concurrentiel Gratuit !
          </h2>
          
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Chaque projet IT Vision inclut automatiquement l'accès au portail client. 
            <strong> Aucun supplément, aucun abonnement !</strong>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="font-bold mb-2">Pour Vos Équipes</h3>
              <p className="text-blue-100">Moins d'interruptions, plus de productivité</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="font-bold mb-2">Pour Vos Clients</h3>
              <p className="text-blue-100">Confiance renforcée, satisfaction maximale</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="font-bold mb-2">Pour Votre Business</h3>
              <p className="text-blue-100">Différenciation unique sur le marché</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <a
              href="/contact"
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <span>Découvrir le portail</span>
              <ArrowRight className="h-5 w-5" />
            </a>
            
            <a
              href="/client-portal"
              className="border-2 border-white text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-blue-600 transition-colors flex items-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Démo interactive</span>
            </a>
          </div>

          <p className="text-blue-100 text-sm mt-6">
            💡 Seule IT Vision offre cette technologie au Sénégal
          </p>
        </div>
      </div>
    </div>
  )
}