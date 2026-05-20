"use client"

import { useState, useEffect } from 'react'
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { 
  Code, Database, Cloud, BarChart3, Cog, Smartphone, Globe, Shield, 
  CheckCircle, ArrowRight, Clock, Users, TrendingUp, Zap, Target,
  ChevronRight, Star, Award, Rocket, MessageSquare, Phone, Mail
} from 'lucide-react'
import Link from 'next/link'

// Interface pour le wizard diagnostic
interface DiagnosticAnswers {
  sector: string
  objectives: string[]
  companySize: string
  maturity: string
  digitalToolsUsage: 'yes' | 'no' | ''
  toolsUsed: string
  painPoints: string[]
  timeline: string
  budget: string
  consentToContact: boolean
  contact: {
    name: string
    email: string
    phone: string
  }
}

interface DiagnosticResult {
  score: number
  level: 'debutant' | 'intermediaire' | 'avance' | 'expert'
  budgetRange: string
  recommendation: string
  suggestedSolutions: string[]
  timestamp: string
}

export default function DigitalisationPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<DiagnosticAnswers>({
    sector: '',
    objectives: [],
    companySize: '',
    maturity: '',
    digitalToolsUsage: '',
    toolsUsed: '',
    painPoints: [],
    timeline: '',
    budget: '',
    consentToContact: false,
    contact: { name: '', email: '', phone: '' }
  })
  const [showWizard, setShowWizard] = useState(false)
  const [diagnosticScore, setDiagnosticScore] = useState(0)
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [stepError, setStepError] = useState('')
  const [isSubmittingDiagnostic, setIsSubmittingDiagnostic] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  // Fonction pour lancer le diagnostic et scroller vers le wizard
  const startDiagnostic = () => {
    setShowWizard(true)
    // Petit délai pour s'assurer que le wizard est rendu avant le scroll
    setTimeout(() => {
      const wizardElement = document.getElementById('diagnostic-wizard')
      if (wizardElement) {
        wizardElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }
    }, 100)
  }

  // Charger les réponses depuis localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem('digitalization-diagnostic')
    const savedResult = localStorage.getItem('digitalization-result')
    if (savedAnswers) {
      const parsed = JSON.parse(savedAnswers)
      setAnswers(prev => ({
        ...prev,
        ...parsed,
        contact: { ...prev.contact, ...(parsed?.contact || {}) },
        objectives: Array.isArray(parsed?.objectives) ? parsed.objectives : prev.objectives,
        painPoints: Array.isArray(parsed?.painPoints) ? parsed.painPoints : prev.painPoints,
        digitalToolsUsage: parsed?.digitalToolsUsage || '',
        toolsUsed: parsed?.toolsUsed || '',
        timeline: parsed?.timeline || '',
        consentToContact: Boolean(parsed?.consentToContact)
      }))
    }
    if (savedResult) {
      setDiagnosticResult(JSON.parse(savedResult))
      setDiagnosticScore(JSON.parse(savedResult).score)
    }
  }, [])

  // Sauvegarder les réponses
  const saveAnswers = (newAnswers: Partial<DiagnosticAnswers>) => {
    const updatedAnswers = { ...answers, ...newAnswers }
    setAnswers(updatedAnswers)
    localStorage.setItem('digitalization-diagnostic', JSON.stringify(updatedAnswers))
    
    // Calculer et sauvegarder le résultat
    const result = calculateScore(updatedAnswers)
    setDiagnosticResult(result)
    setDiagnosticScore(result.score)
    localStorage.setItem('digitalization-result', JSON.stringify(result))
  }

  // Calculer le score de maturité digitale (sur 10)
  const calculateScore = (answers: DiagnosticAnswers): DiagnosticResult => {
    let totalScore = 0
    const maxRawScore = 16
    
    // Secteur d'activité (1 point)
    if (answers.sector) {
      const sectorScores: Record<string, number> = {
        'commerce': 2,
        'services': 3,
        'industrie': 2,
        'sante': 4,
        'education': 3,
        'autre': 1
      }
      totalScore += sectorScores[answers.sector] || 1
    }
    
    // Objectifs (max 2 points)
    if (answers.objectives.length > 0) {
      totalScore += Math.min(answers.objectives.length * 0.5, 2)
    }
    
    // Taille entreprise (1-2 points)
    const sizeScores: Record<string, number> = {
      '1-10': 1,
      '11-50': 2,
      '51-200': 3,
      '200+': 4
    }
    totalScore += sizeScores[answers.companySize] || 0
    
    // Maturité digitale (1-4 points)
    const maturityScores: Record<string, number> = {
      'debutant': 1,
      'intermediaire': 2,
      'avance': 3,
      'expert': 4
    }
    totalScore += maturityScores[answers.maturity] || 0

    if (answers.digitalToolsUsage === 'yes') {
      totalScore += answers.toolsUsed.trim().length > 2 ? 2 : 1
    }

    if (answers.painPoints.length > 0) {
      totalScore += Math.min(answers.painPoints.length * 0.5, 2)
    }

    const timelineScores: Record<string, number> = {
      'immediat': 2,
      '3mois': 1,
      '6mois+': 0
    }
    totalScore += timelineScores[answers.timeline] || 0
    
    // Normaliser sur 10
    const normalizedScore = Math.max(1, Math.min(Math.round((totalScore / maxRawScore) * 10), 10))
    
    // Déterminer le niveau
    let level: 'debutant' | 'intermediaire' | 'avance' | 'expert'
    if (normalizedScore <= 3) level = 'debutant'
    else if (normalizedScore <= 6) level = 'intermediaire'
    else if (normalizedScore <= 8) level = 'avance'
    else level = 'expert'
    
    // Estimation budgétaire
    const budgetRanges: Record<string, string> = {
      '500k-1m': 'Projet S - 1 à 2 M Fcfa',
      '1m-2m': 'Projet M - 2 à 3 M Fcfa',
      '2m-5m': 'Projet L - 3 à 5 M Fcfa',
      '5m+': 'Projet XL - 5+ M Fcfa'
    }
    const budgetRange = budgetRanges[answers.budget] || 'Devis personnalisé'
    
    // Recommandations dynamiques
    let recommendation = ''
    let suggestedSolutions: string[] = []
    
    if (normalizedScore <= 3) {
      recommendation = "Vous débutez votre digitalisation — commencez par un audit gratuit de vos processus actuels."
      suggestedSolutions = ['Audit & Analyse', 'Formation équipes', 'Solutions de base']
    } else if (normalizedScore <= 6) {
      recommendation = "Vos processus sont partiellement digitalisés — misez sur l'automatisation des flux métier."
      suggestedSolutions = ['Automatisation Intelligente', 'Transformation Numérique', 'Mobilité d\'Entreprise']
    } else if (normalizedScore <= 8) {
      recommendation = "Votre structure est bien digitalisée — optimisez avec la BI et les portails collaboratifs."
      suggestedSolutions = ['Intelligence d\'Affaires', 'Portails d\'Entreprise', 'Sécurité & Infrastructure']
    } else {
      recommendation = "Excellente maturité digitale — concentrez-vous sur l'optimisation et l'innovation continue."
      suggestedSolutions = ['Intelligence d\'Affaires', 'Sécurité & Infrastructure', 'Solutions avancées']
    }
    
    return {
      score: normalizedScore,
      level,
      budgetRange,
      recommendation,
      suggestedSolutions,
      timestamp: new Date().toISOString()
    }
  }

  const wizardSteps = [
    {
      id: 'sector',
      title: "Secteur d'activité",
      question: "Dans quel secteur évolue votre entreprise ?",
      options: [
        { value: "commerce", label: "Commerce & Vente" },
        { value: "services", label: "Services aux entreprises" },
        { value: "industrie", label: "Industrie & Production" },
        { value: "sante", label: "Santé & Médical" },
        { value: "education", label: "Éducation & Formation" },
        { value: "autre", label: "Autre secteur" }
      ],
      type: "radio"
    },
    {
      id: 'objectives',
      title: "Objectifs prioritaires",
      question: "Quels sont vos objectifs principaux ? (plusieurs choix possibles)",
      options: [
        { value: "productivite", label: "Améliorer la productivité" },
        { value: "erreurs", label: "Réduire les erreurs" },
        { value: "temps", label: "Gagner du temps" },
        { value: "visibilite", label: "Avoir plus de visibilité" },
        { value: "clients", label: "Améliorer l'expérience client" },
        { value: "collaboration", label: "Faciliter la collaboration" }
      ],
      type: "checkbox"
    },
    {
      id: 'companySize',
      title: "Taille de l'entreprise",
      question: "Combien d'employés avez-vous ?",
      options: [
        { value: "1-10", label: "1 à 10 employés" },
        { value: "11-50", label: "11 à 50 employés" },
        { value: "51-200", label: "51 à 200 employés" },
        { value: "200+", label: "Plus de 200 employés" }
      ],
      type: "radio"
    },
    {
      id: 'maturity',
      title: "Maturité digitale",
      question: "Comment évaluez-vous votre niveau de digitalisation actuel ?",
      options: [
        { value: "debutant", label: "Débutant - Processus principalement manuels" },
        { value: "intermediaire", label: "Intermédiaire - Quelques outils digitaux" },
        { value: "avance", label: "Avancé - Systèmes intégrés" },
        { value: "expert", label: "Expert - Optimisation continue" }
      ],
      type: "radio"
    },
    {
      id: 'digitalToolsUsage',
      title: 'Outils digitaux actuels',
      question: 'Utilisez-vous déjà des outils digitaux dans vos opérations ?',
      options: [
        { value: 'yes', label: 'Oui, nous utilisons déjà des outils digitaux' },
        { value: 'no', label: 'Non, nous fonctionnons surtout de façon manuelle' }
      ],
      type: 'radio'
    },
    {
      id: 'painPoints',
      title: 'Principales difficultés',
      question: 'Quels sont vos principaux points de friction actuels ? (plusieurs choix possibles)',
      options: [
        { value: 'double-saisie', label: 'Double saisie entre plusieurs outils' },
        { value: 'retards', label: 'Retards de traitement / validation' },
        { value: 'manque-visibilite', label: 'Manque de visibilité sur les activités' },
        { value: 'erreurs-frequentes', label: 'Erreurs fréquentes et perte de qualité' },
        { value: 'reporting', label: 'Reporting manuel trop long' },
        { value: 'collaboration', label: 'Mauvaise circulation de l’information' }
      ],
      type: 'checkbox'
    },
    {
      id: 'timeline',
      title: 'Horizon de lancement',
      question: 'Quand souhaitez-vous démarrer votre projet de digitalisation ?',
      options: [
        { value: 'immediat', label: 'Immédiatement (0-1 mois)' },
        { value: '3mois', label: 'Sous 2 à 3 mois' },
        { value: '6mois+', label: 'Sous 6 mois ou plus' }
      ],
      type: 'radio'
    },
    {
      id: 'budget',
      title: "Budget envisagé",
      question: "Quel budget pouvez-vous consacrer à votre transformation digitale ?",
      options: [
        { value: "500k-1m", label: "500 000 - 1 000 000 Fcfa" },
        { value: "1m-2m", label: "1M - 2M Fcfa" },
        { value: "2m-5m", label: "2M - 5M Fcfa" },
        { value: "5m+", label: "Plus de 5M Fcfa" }
      ],
      type: "radio"
    },
    {
      id: 'contact',
      title: "Contact",
      question: "Vos coordonnées pour recevoir votre diagnostic personnalisé",
      type: "contact"
    }
  ]

  const solutions = [
    {
      id: 'transformation',
      icon: Rocket,
      title: 'Transformation Numérique',
      subtitle: 'Digitalisez vos processus métier',
      description: 'Transformez vos processus manuels en solutions digitales automatisées pour gagner en efficacité et réduire les erreurs.',
      benefits: [
        'Gain de temps : -40% sur les tâches répétitives',
        'Réduction des erreurs : -90% d\'erreurs de saisie',
        'Traçabilité complète de vos opérations',
        'Décisions basées sur les données temps réel'
      ],
      technologies: ['Spring Boot', 'React', 'Node.js', 'PostgreSQL'],
      cta: '🚀 Obtenir ma solution',
      secondary: '💬 Parler à un expert'
    },
    {
      id: 'automatisation',
      icon: Cog,
      title: 'Automatisation Intelligente',
      subtitle: 'Automatisez vos workflows complexes',
      description: 'Connectez et automatisez vos systèmes pour éliminer les tâches répétitives et accélérer vos processus métier.',
      benefits: [
        'Accélération : +60% de rapidité des processus',
        'Élimination des tâches répétitives',
        'Synchronisation automatique entre systèmes',
        'Notifications intelligentes multi-canaux'
      ],
      technologies: ['Apache Kafka', 'Spring Cloud', 'RabbitMQ', 'Redis'],
      cta: '🚀 Obtenir ma solution',
      secondary: '💬 Parler à un expert'
    },
    {
      id: 'business-intelligence',
      icon: BarChart3,
      title: 'Intelligence d\'Affaires',
      subtitle: 'Transformez vos données en insights',
      description: 'Consolidez vos données pour prendre des décisions éclairées avec des tableaux de bord temps réel et des analyses prédictives.',
      benefits: [
        'Visibilité temps réel sur vos performances',
        'Décisions stratégiques basées sur les faits',
        'Détection précoce des opportunités',
        'Rapports automatisés personnalisés'
      ],
      technologies: ['Python', 'Power BI', 'Apache Spark', 'TensorFlow'],
      cta: '🚀 Obtenir ma solution',
      secondary: '💬 Parler à un expert'
    },
    {
      id: 'securite',
      icon: Shield,
      title: 'Sécurité & Infrastructure',
      subtitle: 'Sécurisez votre transformation digitale',
      description: 'Infrastructure moderne et sécurisée pour supporter votre croissance avec une disponibilité maximale et une protection complète.',
      benefits: [
        'Disponibilité : 99.9% de temps de fonctionnement',
        'Protection contre les cybermenaces',
        'Sauvegardes automatiques quotidiennes',
        'Support technique réactif 24/7'
      ],
      technologies: ['Docker', 'Kubernetes', 'AWS', 'Terraform'],
      cta: '🚀 Obtenir ma solution',
      secondary: '💬 Parler à un expert'
    },
    {
      id: 'mobilite',
      icon: Smartphone,
      title: 'Mobilité d\'Entreprise',
      subtitle: 'Équipez vos équipes terrain',
      description: 'Applications mobiles métier pour optimiser le travail de terrain et améliorer l\'expérience client.',
      benefits: [
        'Productivité terrain : +50% d\'efficacité',
        'Réduction des déplacements inutiles',
        'Service client amélioré',
        'Traçabilité complète des interventions'
      ],
      technologies: ['React Native', 'Flutter', 'Swift', 'Kotlin'],
      cta: '🚀 Obtenir ma solution',
      secondary: '💬 Parler à un expert'
    },
    {
      id: 'portails',
      icon: Globe,
      title: 'Portails d\'Entreprise',
      subtitle: 'Centralisez vos opérations digitales',
      description: 'Plateformes web intégrées pour centraliser vos processus et améliorer la collaboration avec vos partenaires.',
      benefits: [
        'Expérience client améliorée',
        'Collaboration renforcée avec partenaires',
        'Centralisation de l\'information',
        'Réduction des coûts opérationnels'
      ],
      technologies: ['Next.js', 'React', 'Spring Boot', 'MongoDB'],
      cta: '🚀 Obtenir ma solution',
      secondary: '💬 Parler à un expert'
    }
  ]

  const processSteps = [
    {
      step: '01',
      title: 'Audit & Analyse',
      description: 'Analyse complète de vos processus actuels et identification des opportunités de digitalisation.',
      icon: Target
    },
    {
      step: '02',
      title: 'Design & Architecture',
      description: 'Conception de l\'architecture technique et du design UX/UI adapté à vos besoins métier.',
      icon: Code
    },
    {
      step: '03',
      title: 'Développement Agile',
      description: 'Développement itératif avec livraisons fréquentes et tests continus pour garantir la qualité.',
      icon: Cog
    },
    {
      step: '04',
      title: 'Déploiement & Formation',
      description: 'Mise en production sécurisée et formation de vos équipes pour une adoption réussie.',
      icon: Rocket
    },
    {
      step: '05',
      title: 'Support & Évolution',
      description: 'Maintenance continue et évolutions fonctionnelles pour accompagner votre croissance.',
      icon: TrendingUp
    }
  ]

  const validateCurrentStep = () => {
    const currentStepId = wizardSteps[currentStep]?.id
    setStepError('')

    if (currentStepId === 'sector' && !answers.sector) return setStepError('Veuillez sélectionner votre secteur.'), false
    if (currentStepId === 'objectives' && answers.objectives.length === 0) return setStepError('Veuillez choisir au moins un objectif prioritaire.'), false
    if (currentStepId === 'companySize' && !answers.companySize) return setStepError('Veuillez renseigner la taille de votre entreprise.'), false
    if (currentStepId === 'maturity' && !answers.maturity) return setStepError('Veuillez évaluer votre maturité digitale actuelle.'), false
    if (currentStepId === 'digitalToolsUsage' && !answers.digitalToolsUsage) return setStepError('Veuillez indiquer si vous utilisez déjà des outils digitaux.'), false
    if (currentStepId === 'digitalToolsUsage' && answers.digitalToolsUsage === 'yes' && answers.toolsUsed.trim().length < 2) {
      return setStepError('Merci de préciser le nom des outils que vous utilisez.'), false
    }
    if (currentStepId === 'painPoints' && answers.painPoints.length === 0) return setStepError('Veuillez sélectionner au moins une difficulté principale.'), false
    if (currentStepId === 'timeline' && !answers.timeline) return setStepError('Veuillez choisir votre horizon de lancement.'), false
    if (currentStepId === 'budget' && !answers.budget) return setStepError('Veuillez choisir une fourchette budgétaire.'), false

    if (currentStepId === 'contact') {
      if (!answers.contact.name.trim() || !answers.contact.email.trim() || !answers.contact.phone.trim()) {
        return setStepError('Veuillez renseigner vos coordonnées complètes.'), false
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.contact.email)
      if (!emailOk) return setStepError('Veuillez saisir une adresse email valide.'), false
      if (!answers.consentToContact) return setStepError('Veuillez accepter d’être recontacté pour finaliser votre diagnostic.'), false
    }

    return true
  }

  const submitDiagnostic = async () => {
    const result = calculateScore(answers)
    setDiagnosticResult(result)
    setDiagnosticScore(result.score)
    localStorage.setItem('digitalization-result', JSON.stringify(result))

    setIsSubmittingDiagnostic(true)
    setSubmissionStatus('idle')
    try {
      const response = await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...answers,
          scoring: result,
          source: 'digitalisation-page',
          submittedAt: new Date().toISOString()
        })
      })

      if (!response.ok) throw new Error('Erreur soumission')
      setSubmissionStatus('sent')
      setShowResults(true)
    } catch (error) {
      console.error('Erreur soumission diagnostic:', error)
      setSubmissionStatus('error')
      setShowResults(true)
    } finally {
      setIsSubmittingDiagnostic(false)
    }
  }

  const handleWizardNext = async () => {
    if (!validateCurrentStep()) return

    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1)
      return
    }

    await submitDiagnostic()
  }

  const handleWizardPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-500'
    if (score <= 6) return 'text-yellow-500'
    if (score <= 8) return 'text-blue-500'
    return 'text-emerald-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score <= 3) return 'bg-red-500'
    if (score <= 6) return 'bg-yellow-500'
    if (score <= 8) return 'bg-blue-500'
    return 'bg-emerald-500'
  }

  const getLevelLabel = (level: string) => {
    const labels = {
      'debutant': 'Débutant',
      'intermediaire': 'Intermédiaire',
      'avance': 'Avancé',
      'expert': 'Expert'
    }
    return labels[level as keyof typeof labels] || 'Inconnu'
  }

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="page-content bg-gradient-to-br from-emerald-50 via-purple-50 to-gray-50 dark:from-black dark:via-black dark:to-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-600 via-purple-600 to-emerald-400 bg-clip-text text-transparent">
                Digitalisez vos processus,
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">gagnez en efficacité</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Accompagnement complet pour PME et grandes entreprises dans leur transformation numérique
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={startDiagnostic}
                className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                📋 Diagnostic Gratuit
              </button>
              <a
                href="#solutions"
                className="border-2 border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-300 px-8 py-4 rounded-lg font-semibold hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all duration-300"
              >
                Découvrir nos solutions
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages Section */}
      <section className="py-16 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Pourquoi digitaliser votre entreprise ?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Les bénéfices concrets de la transformation digitale pour votre PME
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gain de temps</h3>
              <p className="text-gray-600 dark:text-gray-300">Automatisez les tâches répétitives et libérez vos équipes pour des activités à plus forte valeur ajoutée.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Réduction des erreurs</h3>
              <p className="text-gray-600 dark:text-gray-300">Éliminez les erreurs humaines et assurez une qualité constante dans vos processus métier.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Visibilité temps réel</h3>
              <p className="text-gray-600 dark:text-gray-300">Pilotez votre entreprise avec des données en temps réel et des tableaux de bord intuitifs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wizard Diagnostic */}
      {showWizard && !showResults && (
        <section id="diagnostic-wizard" className="py-16 bg-gradient-to-br from-emerald-50 to-purple-50 dark:from-black dark:to-black">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-black rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  📋 Diagnostic Digital PME
                </h2>
                <p className="text-gray-600 dark:text-gray-300">Évaluez votre maturité digitale en 5 minutes</p>
                <div className="mt-4">
                  <div className="flex justify-center space-x-2">
                    {wizardSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full ${
                          index <= currentStep ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Étape {currentStep + 1} sur {wizardSteps.length}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {wizardSteps[currentStep].title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {wizardSteps[currentStep].question}
                </p>

                {wizardSteps[currentStep].type === 'contact' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                      <input
                        type="text"
                        value={answers.contact.name}
                        onChange={(e) => saveAnswers({ contact: { ...answers.contact, name: e.target.value } })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Votre nom complet"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={answers.contact.email}
                        onChange={(e) => saveAnswers({ contact: { ...answers.contact, email: e.target.value } })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="votre@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={answers.contact.phone}
                        onChange={(e) => saveAnswers({ contact: { ...answers.contact, phone: e.target.value } })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="+221 XX XXX XX XX"
                      />
                    </div>
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <input
                        type="checkbox"
                        checked={answers.consentToContact}
                        onChange={(e) => saveAnswers({ consentToContact: e.target.checked })}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">
                        J'accepte d'être recontacté par IT Vision Plus pour la restitution de ce diagnostic.
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wizardSteps[currentStep].options?.map((option) => (
                      <label key={option.value} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type={wizardSteps[currentStep].type}
                          name={wizardSteps[currentStep].title}
                          value={option.value}
                          checked={
                            wizardSteps[currentStep].type === 'checkbox'
                              ? (wizardSteps[currentStep].id === 'painPoints'
                                  ? answers.painPoints.includes(option.value)
                                  : answers.objectives.includes(option.value))
                              : (
                                answers.sector === option.value ||
                                answers.companySize === option.value ||
                                answers.maturity === option.value ||
                                answers.digitalToolsUsage === option.value ||
                                answers.timeline === option.value ||
                                answers.budget === option.value
                              )
                          }
                          onChange={(e) => {
                            if (wizardSteps[currentStep].type === 'checkbox') {
                              if (wizardSteps[currentStep].id === 'painPoints') {
                                const newPainPoints = e.target.checked
                                  ? [...answers.painPoints, option.value]
                                  : answers.painPoints.filter(point => point !== option.value)
                                saveAnswers({ painPoints: newPainPoints })
                              } else {
                                const newObjectives = e.target.checked
                                  ? [...answers.objectives, option.value]
                                  : answers.objectives.filter(obj => obj !== option.value)
                                saveAnswers({ objectives: newObjectives })
                              }
                            } else {
                              const stepId = wizardSteps[currentStep].id
                              if (stepId === 'sector') saveAnswers({ sector: option.value })
                              else if (stepId === 'companySize') saveAnswers({ companySize: option.value })
                              else if (stepId === 'maturity') saveAnswers({ maturity: option.value })
                              else if (stepId === 'digitalToolsUsage') saveAnswers({ digitalToolsUsage: option.value as 'yes' | 'no' | '', ...(option.value === 'no' ? { toolsUsed: '' } : {}) })
                              else if (stepId === 'timeline') saveAnswers({ timeline: option.value })
                              else if (stepId === 'budget') saveAnswers({ budget: option.value })
                            }
                          }}
                          className="mr-3"
                        />
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}

                    {wizardSteps[currentStep].id === 'digitalToolsUsage' && answers.digitalToolsUsage === 'yes' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quels outils utilisez-vous actuellement ?</label>
                        <input
                          type="text"
                          value={answers.toolsUsed}
                          onChange={(e) => saveAnswers({ toolsUsed: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Ex: Odoo, Excel, Google Sheets, Sage, Zoho CRM..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {stepError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {stepError}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleWizardPrev}
                  disabled={currentStep === 0}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <button
                  onClick={handleWizardNext}
                  disabled={isSubmittingDiagnostic}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-purple-600 text-white rounded-lg hover:from-emerald-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {currentStep === wizardSteps.length - 1 ? (isSubmittingDiagnostic ? 'Envoi en cours...' : 'Recevoir mon diagnostic') : 'Suivant'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Résultats du Diagnostic */}
      {showWizard && showResults && diagnosticResult && (
        <section className="py-16 bg-gradient-to-br from-emerald-50 to-purple-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  🎯 Votre Diagnostic Digital
                </h2>
                <p className="text-gray-600">Analyse personnalisée de votre maturité digitale</p>
                {submissionStatus === 'sent' && (
                  <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                    ✅ Diagnostic envoyé à notre équipe. Vous serez recontacté rapidement.
                  </div>
                )}
                {submissionStatus === 'error' && (
                  <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                    ⚠️ Résultats calculés, mais l'envoi mail a rencontré une erreur temporaire.
                  </div>
                )}
              </div>

              {/* Score et Jauge */}
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <div className="w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${diagnosticResult.score * 25.13} 251.3`}
                        className={getScoreColor(diagnosticResult.score)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(diagnosticResult.score)}`}>
                          {diagnosticResult.score}
                        </div>
                        <div className="text-sm text-gray-500">/10</div>
                      </div>
                    </div>
                  </div>
                  <div className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${getScoreBgColor(diagnosticResult.score)}`}>
                    {getLevelLabel(diagnosticResult.level)}
                  </div>
                </div>
              </div>

              {/* Estimation Budgétaire */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                <div className="flex items-center mb-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Estimation Budgétaire</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-2">{diagnosticResult.budgetRange}</p>
                <p className="text-gray-600">Budget indicatif basé sur votre profil et vos objectifs</p>
              </div>

              {/* Recommandation */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-6 mb-6">
                <div className="flex items-center mb-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg mr-3">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Recommandation</h3>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">{diagnosticResult.recommendation}</p>
              </div>

              {/* Solutions Suggérées */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Rocket className="h-5 w-5 text-purple-600 mr-2" />
                  Solutions Recommandées
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {diagnosticResult.suggestedSolutions.map((solution, index) => (
                    <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center mb-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg mr-2">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900">{solution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-purple-700 transition-all duration-300 text-center"
                >
                  🚀 Obtenir un devis personnalisé
                </Link>
                <a
                  href="https://wa.me/2217774382220"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-emerald-600 text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-600 hover:text-white transition-all duration-300 text-center"
                >
                  💬 Parler à un expert
                </a>
                <button
                  onClick={() => {
                    setShowResults(false)
                    setCurrentStep(0)
                    setAnswers({
                      sector: '',
                      objectives: [],
                      companySize: '',
                      maturity: '',
                      digitalToolsUsage: '',
                      toolsUsed: '',
                      painPoints: [],
                      timeline: '',
                      budget: '',
                      consentToContact: false,
                      contact: { name: '', email: '', phone: '' }
                    })
                    setStepError('')
                    setSubmissionStatus('idle')
                  }}
                  className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300 text-center"
                >
                  🔄 Refaire le diagnostic
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Solutions Section */}
      <section id="solutions" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Nos <span className="text-emerald-600">Solutions Digitales</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Des solutions sur mesure pour transformer votre entreprise et accélérer votre croissance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solutions.map((solution) => {
              const IconComponent = solution.icon
              return (
                <div key={solution.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                  {/* Solution Header */}
                  <div className="bg-gradient-to-br from-emerald-50 to-purple-50 p-6 border-b">
                    <div className="flex items-center mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-lg shadow-lg">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-gray-900">{solution.title}</h3>
                        <p className="text-sm text-gray-600">{solution.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-gray-700">{solution.description}</p>
                  </div>

                  <div className="p-6">
                    {/* Benefits */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-2" />
                        Résultats obtenus
                      </h4>
                      <ul className="space-y-2">
                        {solution.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Technologies */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Code className="h-4 w-4 text-blue-500 mr-2" />
                        Stack technique
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {solution.technologies.map((tech, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="space-y-3">
                      <Link
                        href="/contact"
                        className="w-full bg-gradient-to-r from-emerald-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-emerald-600 hover:to-purple-700 transition-all duration-300 text-center block"
                      >
                        {solution.cta}
                      </Link>
                      <a
                        href="https://wa.me/2217774382220"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full border border-emerald-600 text-emerald-600 py-2 px-4 rounded-lg font-semibold hover:bg-emerald-600 hover:text-white transition-all duration-300 text-center block"
                      >
                        {solution.secondary}
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Méthodologie Section */}
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
            {processSteps.map((step, index) => {
              const IconComponent = step.icon
              return (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-emerald-600 rounded-full text-white font-bold text-xl mx-auto shadow-lg">
                    {step.step}
                  </div>
                  {index < processSteps.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-300 to-emerald-300 transform -translate-y-1/2"></div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Accélérez votre transformation numérique dès aujourd'hui
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Diagnostic gratuit de vos processus actuels et identification des opportunités d'amélioration
          </p>
          <button
            onClick={startDiagnostic}
            className="bg-white text-emerald-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🚀 Lancer mon diagnostic
          </button>
        </div>
      </section>

      <Footer />
    </main>
  )
}