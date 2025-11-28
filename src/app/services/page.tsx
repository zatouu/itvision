'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MaintenanceForm from '@/components/MaintenanceForm'
import { Camera, Lock, Home, Flame, Cable, Wrench, CheckCircle, Phone, ArrowRight, Star, Clock, ShieldCheck, Calendar, FileText, BarChart3, Activity } from 'lucide-react'
import Link from 'next/link'

export default function ServicesPage() {
  const [isMaintenanceFormOpen, setIsMaintenanceFormOpen] = useState(false)
  const services = [
    {
      id: 'videosurveillance',
      icon: Camera,
      title: "Vidéosurveillance",
      subtitle: "Protection 24h/24 de vos biens",
      description: "Systèmes de surveillance haute définition pour sécuriser efficacement vos locaux professionnels et résidentiels.",
      features: [
        "Caméras HD/4K avec vision nocturne",
        "Enregistrement cloud sécurisé",
        "Accès mobile et web en temps réel",
        "Détection de mouvement intelligente",
        "Analyse vidéo avancée",
        "Installation discrète et professionnelle"
      ],
      benefits: [
        "Dissuasion des intrusions",
        "Preuves en cas d'incident",
        "Surveillance à distance",
        "Réduction des primes d'assurance"
      ],
      price: "Devis sur WhatsApp",
      rating: 4.8,
      testimonial: "Installation parfaite, équipe très professionnelle ! - Amadou Ba, Directeur Général"
    },
    {
      id: 'controle-acces',
      icon: Lock,
      title: "Contrôle d'accès",
      subtitle: "Maîtrisez qui entre et sort",
      description: "Solutions de contrôle d'accès avancées par badge RFID, biométrie ou codes pour une sécurité optimale.",
      features: [
        "Badges RFID programmables",
        "Lecteurs biométriques",
        "Claviers à codes sécurisés",
        "Gestion centralisée des accès",
        "Historique des passages",
        "Intégration avec alarmes"
      ],
      benefits: [
        "Accès sélectif par zones",
        "Traçabilité complète",
        "Gestion simplifiée",
        "Sécurité renforcée"
      ],
      price: "Devis sur WhatsApp",
      rating: 4.9,
      testimonial: "Système très fiable, je recommande vivement. - Aïssatou Diop, Responsable Sécurité"
    },
    {
      id: 'domotique',
      icon: Home,
      title: "Domotique & Bâtiment Intelligent",
      subtitle: "Protocoles mesh avancés • Solutions sur-mesure",
      description: "Pionniers de la domotique au Sénégal. Maîtrise des protocoles mesh robustes, solutions évolutives pour tous budgets, du retrofit aux bâtiments intelligents intégrés.",
      features: [
        "🔄 RETROFIT : Micro-modules pour installation existante",
        "🏗️ NEUF : Équipements smart directs",
        "📱 Interface mobile unifiée iOS/Android",
        "🌐 Protocoles : WiFi, Bluetooth, Zigbee",
        "🏠 Contacts intelligents, prises, télécommandes",
        "🌡️ Capteurs température, humidité, mouvement"
      ],
      benefits: [
        "✨ 2 modes : Retrofit OU construction neuve",
        "🔌 Compteurs intelligents et modules",
        "📊 Gestion énergétique avancée",
        "🎛️ Contrôle centralisé depuis mobile"
      ],
      price: "Devis sur WhatsApp",
      rating: 4.8,
      testimonial: "Installation sans travaux dans mon ancien appartement, tout est devenu intelligent ! - Moussa Kébé, Propriétaire"
    },
    {
      id: 'securite-incendie',
      icon: Flame,
      title: "Sécurité incendie",
      subtitle: "Protection contre les incendies",
      description: "Systèmes de détection et d'extinction automatiques conformes aux normes pour protéger vos biens et vos proches.",
      features: [
        "Détecteurs de fumée certifiés",
        "Alarmes sonores puissantes",
        "Système d'extinction automatique",
        "Mise en sécurité des accès",
        "Alerte automatique des secours",
        "Maintenance préventive"
      ],
      benefits: [
        "Détection précoce",
        "Extinction rapide",
        "Conformité réglementaire",
        "Protection des vies"
      ],
      price: "Devis sur WhatsApp",
      rating: 4.8,
      testimonial: "Tranquillité d'esprit garantie pour ma famille. - Khadija Ndiaye, Mère de famille"
    },
    {
      id: 'network-cabling',
      icon: Cable,
      title: "Câblage Réseau & TV",
      subtitle: "Infrastructure complète pour bâtiments",
      description: "Câblage réseau et télévision professionnel pour locaux et nouveaux bâtiments. Installation dès la construction pour une intégration parfaite.",
      features: [
        "📡 Câblage réseau Cat6A/Cat7 certifié",
        "📺 Prises TV et satellite dans chaque pièce",
        "🏗️ Installation pendant construction optimale",
        "🔌 Baies de brassage 19\" professionnelles",
        "📊 Tests et certification performance",
        "📋 Documentation technique complète"
      ],
      benefits: [
        "🌐 Internet haut débit dans tout le bâtiment",
        "📺 Télévision satellite partout",
        "🏠 Intégration discrète en construction",
        "⚡ Performances 10 Gbps garanties"
      ],
      price: "Devis sur WhatsApp",
      rating: 4.7,
      testimonial: "Câblage invisible et performant dans notre nouveau bureau. - Fatou Diallo, Directrice"
    },
    {
      id: 'fiber-optic',
      icon: Cable,
      title: "Fibre Optique FTTH",
      subtitle: "BPI • PBO • PTO pour opérateurs",
      description: "Installation complète fibre optique avec BPI, PBO et PTO. L'opérateur se branche directement au BPI et retrouve son signal dans chaque appartement. Réalisé pour Antalya : 14 appartements + 2 duplex + local commercial.",
      features: [
        "🔗 BPI (Point de Branchement Immeuble)",
        "📡 PBO (Points de Branchement Optiques) par étage",
        "🏠 PTO (Prises Terminales Optiques) dans logements",
        "⚡ Fibres G.657.A2 résistantes flexion",
        "🔧 Soudures et tests OTDR professionnels",
        "📋 Dossier technique pour opérateurs"
      ],
      benefits: [
        "🚀 Très haut débit jusqu'à 10 Gbps",
        "🏢 Prêt pour tous opérateurs (Orange, Free, etc.)",
        "⚡ Raccordement opérateur simplifié",
        "💎 Plus-value immobilière garantie"
      ],
      price: "Devis sur WhatsApp",
      rating: 4.9,
      testimonial: "Installation fibre parfaite chez Antalya, tous les résidents sont ravis ! - Moustapha Diop, Promoteur"
    },
    {
      id: 'maintenance',
      icon: Wrench,
      title: "Maintenance & Support",
      subtitle: "Assurez la pérennité de vos systèmes",
      description: "Service de maintenance sur mesure pour TOUS vos équipements de sécurité électronique, que nous les ayons installés ou pas. La vidéosurveillance sans maintenance est vouée à l'instabilité.",
      features: [
        "Maintenance préventive programmée",
        "Support technique réactif 24h/7j",
        "Diagnostic et audit système complet",
        "Mise à jour firmware et logiciels",
        "Nettoyage et vérification matériel",
        "Formation utilisateurs incluse"
      ],
      benefits: [
        "Prévention des pannes critiques",
        "Optimisation performance système",
        "Extension durée de vie équipements",
        "Tranquillité d'esprit garantie"
      ],
      price: "Devis sur WhatsApp",
      rating: 4.7,
      testimonial: "Service après-vente exceptionnel. - Fatima Samb, Directrice Administrative"
    }
  ]

  const maintenancePlans = [
    {
      id: 'basic',
      title: 'Basic Care',
      badge: 'Essentiel',
      price: '400 000 F CFA/an',
      visits: '2 visites/an',
      sla: 'SLA 48h ouvrées',
      support: 'Support 8h-18h',
      description: "Pour les petites installations qui ont besoin d'un suivi régulier et de conformité.",
      features: [
        'Contrat annuel + renouvellement assisté',
        'Checklist préventive standard',
        'Rapport PDF simplifié',
        'Hotline prioritaire niveau 2'
      ],
      accent: 'from-white to-slate-50'
    },
    {
      id: 'preventive',
      title: 'Préventif Plus',
      badge: 'Best-seller',
      price: '1 200 000 F CFA/an',
      visits: '4 visites/an',
      sla: 'SLA 24h',
      support: 'Monitoring heures ouvrables',
      description: 'Pour garder vos équipements en “comme neuf” avec reporting détaillé.',
      features: [
        'Planning trimestriel verrouillé',
        'Nettoyage caméra + recalibrage',
        'Rapport détaillé + photos + recommandations',
        'Simulation budget pièces critiques'
      ],
      accent: 'from-emerald-50 to-green-50',
      highlight: true
    },
    {
      id: 'curative',
      title: 'Curatif Express',
      badge: 'Réactif',
      price: '600 000 F CFA/an',
      visits: 'Interventions illimitées',
      sla: 'SLA 24-48h',
      support: 'Support 7j/7',
      description: 'Pour les sites qui veulent prioriser la reprise rapide en cas de panne.',
      features: [
        'Tickets illimités (hors pièces)',
        'Temps de réponse garanti 24-48h',
        'Suivi en temps réel depuis le portail',
        'Rapport curatif + devis instantané'
      ],
      accent: 'from-orange-50 to-rose-50'
    },
    {
      id: 'full',
      title: 'Full Service 24/7',
      badge: 'Premium',
      price: '3 500 000 F CFA/an',
      visits: '4 visites + curatif illimité',
      sla: 'SLA 4h / 24h',
      support: 'Support 24/7 + pièces incluses',
      description: 'Couverture totale : préventif, curatif, pièces, reporting exécutif.',
      features: [
        'Pièces critiques incluses',
        'Supervision distante & alerting',
        'Rapport exécutif + KPIs trimestriels',
        'Préparation du renouvellement automatique'
      ],
      accent: 'from-purple-50 to-indigo-50'
    }
  ]

  const maintenanceWorkflow = [
    {
      title: 'Audit & inventaire',
      description: 'Cartographie complète des équipements, tests de charge, photos et numéros de série.',
      result: 'Baseline technique validée',
      icon: Activity
    },
    {
      title: 'Contrat & SLA',
      description: 'Sélection du pack, rédaction du contrat, définition des SLA et des interlocuteurs.',
      result: 'Contrat signé + plan financier',
      icon: ShieldCheck
    },
    {
      title: 'Programmation & interventions',
      description: 'Planification des visites préventives, tickets curatifs, notifications automatiques.',
      result: 'Calendrier partagé + rappels',
      icon: Calendar
    },
    {
      title: 'Rapports & renouvellement',
      description: 'Rapports PDF, recommandations chiffrées, préparation du renouvellement automatique.',
      result: 'Visibilité budgétaire & conformité',
      icon: FileText
    }
  ]

  const maintenanceOperations = [
    {
      title: 'Programmation proactive',
      icon: Activity,
      points: [
        "Visites planifiées 12 mois à l'avance",
        'Relances automatiques (J-7 / J-1)',
        "Assignation techniciens depuis l'admin"
      ]
    },
    {
      title: 'Contrats & SLA pilotés',
      icon: ShieldCheck,
      points: [
        'Suivi interventions incluses/restantes',
        'Alertes expiration & renouvellement',
        'Upgrades instantanés (Full, Curatif...)'
      ]
    },
    {
      title: 'Rapports & budgets',
      icon: BarChart3,
      points: [
        'Rapports PDF signés + photos',
        'KPIs : disponibilité, temps de réponse',
        'Projection budget récurrent'
      ]
    }
  ]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-white via-gray-50 to-emerald-50 page-content pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
              Nos <span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Services</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              Solutions complètes de sécurité électronique adaptées à tous vos besoins, 
              de la conception à la maintenance.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
                <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm font-medium">Devis gratuit</span>
              </div>
              <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
                <Clock className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm font-medium">Intervention 24h/7j</span>
              </div>
              <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
                <Star className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm font-medium">Actifs depuis 2019</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {services.map((service, index) => {
              const IconComponent = service.icon
              
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden modern-card hover:shadow-2xl transition-all duration-300"
                >
                  {/* Service Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl">
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">{service.title}</h2>
                          <p className="text-white/90 font-medium">{service.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                        <Star className="h-4 w-4 text-yellow-300 fill-current mr-1" />
                        <span className="text-sm font-medium">{service.rating}</span>
                      </div>
                    </div>
                    <p className="text-white/95 text-lg leading-relaxed">{service.description}</p>
                  </div>

                  <div className="p-6">
                    {/* Features */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                        Fonctionnalités
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {service.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Benefits */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <ArrowRight className="h-5 w-5 text-purple-600 mr-2" />
                        Avantages
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {service.benefits.map((benefit, idx) => (
                          <div key={idx} className="flex items-start text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Testimonial */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <p className="text-sm text-gray-600 italic">"{service.testimonial}"</p>
                      <div className="flex items-center mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">Client vérifié</span>
                      </div>
                    </div>
                    
                    {/* Price & CTA */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                      <div className="text-center mb-4">
                        <p className="text-2xl font-bold text-emerald-600">{service.price}</p>
                        <p className="text-sm text-gray-500">
                          {service.id === 'maintenance' ? 'Devis basé sur votre équipement' : 'Installation et configuration incluses'}
                        </p>
                      </div>
                      
                      {service.id === 'domotique' ? (
                        // CTA spécialisé pour la domotique
                        <div className="space-y-3">
                          <Link
                            href="/domotique"
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <Home className="h-4 w-4 mr-2" />
                            Page Dédiée Domotique
                          </Link>
                          <div className="flex flex-col gap-3 mt-3">
                            <a
                              href={`https://wa.me/221774133440?text=Bonjour, je souhaite recevoir un devis pour le service ${service.title}. Voici mes informations:%0A- Nom:%0A- Adresse:%0A- Type de projet:%0A- Budget approximatif:%0AMerci`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                              </svg>
                              Demander un devis WhatsApp
                            </a>
                            <Link
                              href="/contact"
                              className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-purple-700 transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Formulaire de contact
                            </Link>
                          </div>
                        </div>
                      ) : service.id === 'maintenance' ? (
                        // CTA spécialisé pour la maintenance
                        <div className="space-y-3">
                          <button
                            onClick={() => setIsMaintenanceFormOpen(true)}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Formulaire détaillé équipement
                          </button>
                          <div className="flex flex-col gap-3 mt-3">
                            <a
                              href={`https://wa.me/221774133440?text=Bonjour, je souhaite recevoir un devis pour le service ${service.title}. Voici mes informations:%0A- Nom:%0A- Adresse:%0A- Type de projet:%0A- Budget approximatif:%0AMerci`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                              </svg>
                              Demander un devis WhatsApp
                            </a>
                            <Link
                              href="/contact"
                              className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-purple-700 transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Formulaire de contact
                            </Link>
                          </div>
                        </div>
                      ) : (
                        // CTA standard pour les autres services
                        <div className="flex flex-col gap-3">
                          <a
                            href={`https://wa.me/221774133440?text=Bonjour, je souhaite recevoir un devis pour le service ${service.title}. Voici mes informations:%0A- Nom:%0A- Adresse:%0A- Type de projet:%0A- Budget approximatif:%0AMerci`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            Demander un devis WhatsApp
                          </a>
                          <Link
                            href="/contact"
                            className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-purple-700 transition-all duration-300 inline-flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Formulaire de contact
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section Maintenance Importance */}
      <section className="py-20 bg-gradient-to-br from-orange-50 via-rose-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-sm font-semibold text-orange-600 shadow-md">
              <ShieldCheck className="h-4 w-4" />
              Après l'installation
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Maintenance & Support pilotés par contrat
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              On ne se contente pas d'installer. Nous encadrons vos équipements dans des contrats clairs,
              planifions les visites et assurons un reporting complet pour sécuriser votre investissement.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-xl border border-orange-100 p-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full">
                    <Wrench className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    ⚠️ Sans maintenance, la sécurité se dégrade silencieusement
                  </h3>
                  <p className="text-gray-700">
                    Un système peut sembler fonctionner alors que les enregistrements sont incomplets,
                    les firmwares obsolètes ou les capteurs décalés. La vraie stabilité vient d'un plan
                    de maintenance pensé dès le devis.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Sans maintenance :</h4>
                  <ul className="text-red-700 text-sm space-y-1.5">
                    <li>• Pannes au pire moment</li>
                    <li>• Dégradation progressive de la qualité</li>
                    <li>• Perte d'enregistrements critiques</li>
                    <li>• Factures curatives imprévisibles</li>
                    <li>• Obsolescence prématurée</li>
                  </ul>
                </div>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Avec IT Vision :</h4>
                  <ul className="text-green-700 text-sm space-y-1.5">
                    <li>• Prévention des pannes critiques</li>
                    <li>• Performance optimisée 24h/24</li>
                    <li>• KPIs disponibles dans le portail</li>
                    <li>• Budget maîtrisé (contrat annuel)</li>
                    <li>• Durée de vie maximisée</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 font-medium">
                  💡 <strong>Peu importe qui a installé votre système</strong> : nous reprenons la maintenance de tous les
                  équipements de sécurité électronique, toutes marques confondues.
                </p>
              </div>
            </div>
            <div className="bg-emerald-900 text-white rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900" />
              <div className="relative space-y-6">
                <h3 className="text-3xl font-semibold">Ce que couvre notre maintenance</h3>
                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-300 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">Contrats annuels pilotés</p>
                      <p className="text-sm text-white/80">Préventif, curatif, full service avec SLA adaptés à votre activité.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Calendar className="h-6 w-6 text-emerald-300 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">Programmation & rappels</p>
                      <p className="text-sm text-white/80">Planification 12 mois à l'avance + rappels automatiques.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-6 w-6 text-emerald-300 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">Rapports signés & KPIs</p>
                      <p className="text-sm text-white/80">Rapports PDF, photos, recommandations chiffrées, suivi portail client.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <BarChart3 className="h-6 w-6 text-emerald-300 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">Renouvellement et budget</p>
                      <p className="text-sm text-white/80">Projection du budget récurrent et alertes 60 jours avant expiration.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="relative mt-8">
                <button
                  onClick={() => setIsMaintenanceFormOpen(true)}
                  className="w-full bg-white text-emerald-700 font-semibold py-3 rounded-xl shadow-lg hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                >
                  Construire mon plan maintenance
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs text-white/70 text-center mt-3">
                  Contrats livrés avec reporting numérique et hotline dédiée
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Contrats standardisés</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">Choisissez votre contrat de maintenance</h3>
                <p className="text-gray-600 mt-2 max-w-2xl">
                  Chaque contrat inclut la programmation des visites, les rapports numériques et un accès au portail client
                  pour suivre les interventions et les recommandations.
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Tarifs indicatifs – ajustés après audit de votre parc.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {maintenancePlans.map((plan) => {
                const isHighlighted = Boolean(plan.highlight)
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-6 shadow-lg bg-gradient-to-br ${plan.accent} ${
                      isHighlighted ? 'border-emerald-300 shadow-emerald-200/60' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          isHighlighted ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {plan.badge}
                      </span>
                      {isHighlighted && (
                        <span className="text-xs font-semibold text-emerald-700">Recommandé</span>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">{plan.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                    <div className="mt-5">
                      <p className="text-3xl font-bold text-emerald-600">{plan.price}</p>
                      <p className="text-sm text-gray-500">{plan.visits}</p>
                      <p className="text-sm text-gray-500">{plan.sla}</p>
                      <p className="text-sm text-gray-500">{plan.support}</p>
                    </div>
                    <ul className="mt-6 space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setIsMaintenanceFormOpen(true)}
                      className={`mt-6 w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                        isHighlighted
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                      } transition`}
                    >
                      Demander ce contrat
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <p className="text-sm uppercase tracking-wide text-emerald-200">Parcours maintenance</p>
                <h3 className="text-3xl font-bold">Un workflow clair après chaque installation</h3>
              </div>
              <p className="text-sm text-white/70 max-w-xl">
                Un contrat = un parcours : diagnostic initial, signature, programmation automatique, reporting et
                renouvellement accompagné.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {maintenanceWorkflow.map((step, index) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="relative bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="p-2 bg-white/10 rounded-xl">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                    <p className="text-sm text-white/80">{step.description}</p>
                    <p className="text-xs uppercase tracking-wide text-emerald-200 mt-4">{step.result}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {maintenanceOperations.map((operation) => {
              const Icon = operation.icon
              return (
                <div key={operation.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold mb-4">
                    <Icon className="h-4 w-4" />
                    {operation.title}
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {operation.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="bg-emerald-700 rounded-3xl text-white p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xl">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/70">Contrat sur-mesure</p>
              <h3 className="text-3xl font-bold mt-2">Besoin d'une maintenance adaptée à un parc complexe ?</h3>
              <p className="text-white/80 mt-2 max-w-2xl">
                Nous construisons des contrats hybrides (multi-sites, équipements multi-marques, astreinte 24/7) avec
                planification partagée et budget prévisionnel.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={() => setIsMaintenanceFormOpen(true)}
                className="flex-1 bg-white text-emerald-700 font-semibold py-3 rounded-xl shadow-lg hover:bg-emerald-50 transition"
              >
                Planifier ma maintenance
              </button>
              <a
                href="tel:+221774133440"
                className="flex-1 border-2 border-white text-white font-semibold py-3 rounded-xl text-center hover:bg-white hover:text-emerald-700 transition"
              >
                Appeler IT Vision
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Prêt à sécuriser votre propriété ?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Contactez-nous pour un audit sécurité gratuit et un devis personnalisé. 
            Nos experts vous accompagnent dans votre projet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://wa.me/221774133440?text=Bonjour, je souhaite un audit sécurité gratuit. Voici mes informations:%0A- Nom:%0A- Entreprise:%0A- Adresse:%0A- Type de bâtiment:%0A- Besoins spécifiques:%0AMerci"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Audit WhatsApp
            </a>
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Audit gratuit
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            <a
              href="tel:+221774133440"
              className="w-full sm:w-auto border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-all duration-300 inline-flex items-center justify-center"
            >
              <Phone className="h-5 w-5 mr-2" />
              +221 77 413 34 40
            </a>
          </div>
        </div>
      </section>

      <Footer />
      
      {/* Formulaire de maintenance */}
      <MaintenanceForm 
        isOpen={isMaintenanceFormOpen}
        onClose={() => setIsMaintenanceFormOpen(false)}
      />
    </main>
  )
}