import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Code, Database, Cloud, BarChart3, Cog, Smartphone, Globe, Shield, CheckCircle, ArrowRight } from 'lucide-react'
import dynamic from 'next/dynamic'

const DigitalizationDiagnosticWizard = dynamic(() => import('@/components/DigitalizationDiagnosticWizard'), { ssr: false })
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Digitalisation d\'Entreprise - IT Vision Plus',
  description: 'Solutions complètes de digitalisation : développement sur mesure, middleware, data science, DevOps. Architecture microservices avec Spring Boot.',
}

export default function DigitalisationPage() {
  const services = [
    {
      id: 'development',
      icon: Code,
      title: 'Transformation Numérique',
      subtitle: 'Digitalisation complète de vos processus',
      description: 'Transformez vos processus manuels en solutions digitales automatisées : gestion commerciale, facturation, stock, relation client et pilotage en temps réel.',
      features: [
        'Digitalisation des processus manuels existants',
        'Automatisation des tâches répétitives',
        'Intégration des systèmes d\'information',
        'Tableaux de bord de pilotage en temps réel',
        'Solutions mobiles pour équipes terrain',
        'Formation et accompagnement des équipes'
      ],
      technologies: ['Spring Boot', 'React', 'React Native', 'Angular', 'Vue.js', 'Node.js'],
      benefits: [
        'Réduction des erreurs et gains de temps',
        'Amélioration de la productivité équipes',
        'Traçabilité et contrôle des processus',
        'Prise de décision basée sur les données'
      ],
      price: 'Devis personnalisé',
      duration: 'Sur mesure'
    },
    {
      id: 'middleware',
      icon: Cog,
      title: 'Automatisation des Processus',
      subtitle: 'Connectez et automatisez vos systèmes',
      description: 'Optimisez votre efficacité en automatisant vos workflows métier : de la commande à la livraison, de la prospection à la facturation, tout en temps réel.',
      features: [
        'Automatisation des workflows complexes',
        'Synchronisation entre différents logiciels',
        'Notifications automatiques multi-canaux',
        'Élimination des tâches répétitives',
        'Workflow de validation et d\'approbation',
        'Monitoring et alertes intelligentes'
      ],
      technologies: ['Apache Kafka', 'Spring Cloud', 'RabbitMQ', 'Apache Camel', 'Redis', 'ElasticSearch'],
      benefits: [
        'Réduction drastique des erreurs humaines',
        'Accélération des processus métier',
        'Meilleure coordination entre équipes',
        'Visibilité complète sur les opérations'
      ],
      price: 'Solution sur mesure',
      duration: 'Selon complexité'
    },
    {
      id: 'data-science',
      icon: BarChart3,
      title: 'Intelligence d\'Affaires',
      subtitle: 'Prenez des décisions éclairées par vos données',
      description: 'Transformez vos données d\'entreprise en insights actionnables : analyses des performances, prédictions métier et aide à la décision stratégique.',
      features: [
        'Consolidation de toutes vos données métier',
        'Tableaux de bord exécutifs en temps réel',
        'Analyses prédictives pour anticiper',
        'Rapports automatisés personnalisés',
        'Indicateurs de performance clés (KPI)',
        'Alertes intelligentes sur anomalies'
      ],
      technologies: ['Python', 'R', 'Apache Spark', 'Power BI', 'Tableau', 'TensorFlow'],
      benefits: [
        'Décisions stratégiques basées sur les faits',
        'Identification rapide des opportunités',
        'Détection précoce des problèmes',
        'Amélioration continue des performances'
      ],
      price: 'Selon données disponibles',
      duration: 'Projet évolutif'
    },
    {
      id: 'devops',
      icon: Cloud,
      title: 'Infrastructure & Sécurité',
      subtitle: 'Sécurisez et optimisez votre IT',
      description: 'Infrastructure moderne et sécurisée pour supporter votre croissance : hébergement fiable, sauvegardes automatiques et surveillance 24/7.',
      features: [
        'Infrastructure cloud haute disponibilité',
        'Sécurité multi-niveaux et chiffrement',
        'Sauvegardes automatiques quotidiennes',
        'Monitoring proactif 24h/24',
        'Mise à jour sécuritaire automatique',
        'Support technique réactif'
      ],
      technologies: ['Docker', 'Kubernetes', 'Terraform', 'AWS', 'Azure', 'Jenkins'],
      benefits: [
        'Disponibilité maximale de vos systèmes',
        'Protection complète contre les cybermenaces',
        'Récupération rapide en cas d\'incident',
        'Conformité aux standards de sécurité'
      ],
      price: 'Abonnement mensuel',
      duration: 'Support continu'
    },
    {
      id: 'mobile',
      icon: Smartphone,
      title: 'Mobilité d\'Entreprise',
      subtitle: 'Équipez vos équipes d\'outils mobiles',
      description: 'Applications mobiles métier pour optimiser le travail de terrain : force de vente, techniciens, livraison, gestion des stocks mobiles.',
      features: [
        'Applications terrain pour commerciaux',
        'Outils mobiles pour techniciens SAV',
        'Gestion stock et inventaire mobile',
        'Signature électronique et rapports',
        'Synchronisation temps réel avec le SI',
        'Mode hors-ligne pour zones isolées'
      ],
      technologies: ['React Native', 'Swift', 'Kotlin', 'Flutter', 'Ionic', 'Xamarin'],
      benefits: [
        'Productivité équipes terrain augmentée',
        'Réduction des déplacements inutiles',
        'Amélioration qualité service client',
        'Traçabilité complète des interventions'
      ],
      price: 'Selon fonctionnalités',
      duration: 'Développement itératif'
    },
    {
      id: 'web',
      icon: Globe,
      title: 'Portails d\'Entreprise',
      subtitle: 'Centralisez vos opérations digitales',
      description: 'Plateformes web intégrées pour centraliser vos processus : portail client, extranet partenaire, intranet collaboratif et tableaux de bord unifiés.',
      features: [
        'Portail client avec espace personnel',
        'Extranet partenaires et fournisseurs',
        'Intranet collaboratif pour équipes',
        'Gestion documentaire centralisée',
        'Workflow de validation intégré',
        'Interface responsive et moderne'
      ],
      technologies: ['Next.js', 'React', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Stripe'],
      benefits: [
        'Amélioration de l\'expérience client',
        'Collaboration renforcée avec partenaires',
        'Centralisation de l\'information',
        'Réduction des coûts opérationnels'
      ],
      price: 'Package évolutif',
      duration: 'Livraison par étapes'
    }
  ]

  const processSteps = [
    {
      step: '01',
      title: 'Audit & Analyse',
      description: 'Analyse complète de vos processus actuels et identification des opportunités de digitalisation.'
    },
    {
      step: '02',
      title: 'Architecture & Design',
      description: 'Conception de l\'architecture technique et du design UX/UI adapté à vos besoins métier.'
    },
    {
      step: '03',
      title: 'Développement Agile',
      description: 'Développement itératif avec livraisons fréquentes et tests continus pour garantir la qualité.'
    },
    {
      step: '04',
      title: 'Déploiement & Formation',
      description: 'Mise en production sécurisée et formation de vos équipes pour une adoption réussie.'
    },
    {
      step: '05',
      title: 'Support & Évolution',
      description: 'Maintenance continue et évolutions fonctionnelles pour accompagner votre croissance.'
    }
  ]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-purple-50 to-gray-50 py-20 pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-600 via-purple-600 to-emerald-400 bg-clip-text text-transparent">
                Digitalisation
              </span>
              <br />d'Entreprise
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-8">
              Accompagnons votre transformation numérique : digitalisation des processus, automatisation et solutions sur mesure pour PME et grandes entreprises
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Diagnostic Gratuit
              </Link>
              <a
                href="tel:+2217774382220"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-900 transition-all duration-300"
              >
                📞 +221 77 7438220
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Nos <span className="text-blue-600">Solutions Digitales</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nous accompagnons PME et grandes entreprises dans leur transformation numérique : digitalisation des processus, automatisation et optimisation de la performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const IconComponent = service.icon
              return (
                <div key={service.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                  {/* Service Header */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 border-b">
                    <div className="flex items-center mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-lg shadow-lg">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-gray-900">{service.title}</h3>
                        <p className="text-sm text-gray-600">{service.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-gray-700">{service.description}</p>
                  </div>

                  <div className="p-6">
                    {/* Features */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Fonctionnalités clés</h4>
                      <ul className="space-y-2">
                        {service.features.slice(0, 4).map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Technologies */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Technologies</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.technologies.slice(0, 3).map((tech, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price & Duration */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-2xl font-bold text-blue-600">{service.price}</span>
                        <span className="text-sm text-gray-500">{service.duration}</span>
                      </div>
                      <Link
                        href="/contact"
                        className="w-full bg-gradient-to-r from-emerald-500 to-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-emerald-600 hover:to-purple-700 transition-all duration-300 text-center block"
                      >
                        Demander un devis
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Notre <span className="text-purple-600">Méthodologie</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Un processus éprouvé pour garantir le succès de votre transformation digitale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-emerald-600 rounded-full text-white font-bold text-xl mx-auto shadow-lg">
                    {step.step}
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-300 to-blue-300 transform -translate-y-1/2"></div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Accélérez votre transformation numérique
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Diagnostic gratuit de vos processus actuels et identification des opportunités d'amélioration et d'automatisation
          </p>
          {/* Wizard Diagnostic – ancre */}
          <div id="diagnostic" className="mt-8">
            <DigitalizationDiagnosticWizard />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}