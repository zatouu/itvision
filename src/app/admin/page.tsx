'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calculator, 
  DollarSign, 
  Package, 
  FileText, 
  Settings, 
  TrendingUp,
  Camera,
  Home,
  Shield,
  Wifi,
  Zap,
  Calendar
} from 'lucide-react'
import AdminHelpGuide from '@/components/AdminHelpGuide'
// Intégration de la gestion de projets déplacée vers le Dashboard global (GlobalAdminDashboard)

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({ quotes: 0, projectsActive: 0, techniciansAvailable: 0 })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Auth check result:', data) // Debug log
          setIsAuthenticated(true)
        } else {
          console.log('Auth check failed, redirecting to login') // Debug log
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (loading || !isAuthenticated) return
    const loadKpis = async () => {
      try {
        const [quotesRes, projectsRes, techRes] = await Promise.all([
          fetch('/api/quotes', { credentials: 'include' }),
          fetch('/api/projects?status=in_progress', { credentials: 'include' }),
          fetch('/api/technicians?available=true', { credentials: 'include' })
        ])
        const quotes = quotesRes.ok ? (await quotesRes.json()).items?.length || 0 : 0
        const projects = projectsRes.ok ? (await projectsRes.json()).projects?.length || 0 : 0
        const techs = techRes.ok ? (await techRes.json()).technicians?.filter((t: any) => t.isAvailable)?.length || 0 : 0
        setKpis({ quotes, projectsActive: projects, techniciansAvailable: techs })
      } catch {}
    }
    loadKpis()
  }, [loading, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirection en cours
  }
  const adminModules = [
    {
      id: 'quotes',
      title: 'Générateur de Devis',
      description: 'Créer des devis modulaires par service',
      icon: Calculator,
      href: '/admin/quotes',
      color: 'blue',
      features: ['Devis par service', 'Prix configurables', 'Système modulaire']
    },
    {
      id: 'products',
      title: 'Gestion Produits',
      description: 'Ajouter, modifier et supprimer les produits du catalogue',
      icon: Package,
      href: '/admin/produits',
      color: 'purple',
      features: ['CRUD produits', 'Recherche/filtre', 'Sur devis ou tarifé']
    },
    {
      id: 'prices',
      title: 'Gestion des Prix',
      description: 'Configurer les prix par type de produit',
      icon: DollarSign,
      href: '/admin/prices',
      color: 'green',
      features: ['Prix par variant', 'Marges configurables', 'Mise à jour temps réel']
    },
    {
      id: 'catalog',
      title: 'Catalogue Produits',
      description: 'Explorer les types de produits par service',
      icon: Package,
      href: '/admin/catalog',
      color: 'purple',
      features: ['Types par service', 'Variants détaillés', 'Spécifications techniques']
    },
    {
      id: 'planning',
      title: 'Planification Dynamique',
      description: 'Gestion intelligente des interventions et affectation automatique',
      icon: Calendar,
      href: '/admin/planning',
      color: 'emerald',
      features: ['Affectation automatique', 'Calendrier partagé', 'Gestion des compétences']
    }
  ]

  const services = [
    { id: 'videosurveillance', name: 'Vidéosurveillance', icon: Camera, products: 'NVR, Caméras, Stockage' },
    { id: 'domotique', name: 'Domotique', icon: Home, products: 'Hubs, Interrupteurs, Capteurs' },
    { id: 'controle_acces', name: 'Contrôle d\'Accès', icon: Shield, products: 'Terminaux, Serrures, Badges' },
    { id: 'network_cabling', name: 'Câblage Réseau', icon: Wifi, products: 'Câbles, Prises, Brassage' },
    { id: 'fiber_optic', name: 'Fibre Optique', icon: Zap, products: 'BPI, PBO, Fibres' }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'bg-blue-100 text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      }
      case 'green': return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'bg-green-100 text-green-600',
        button: 'bg-green-600 hover:bg-green-700'
      }
      case 'purple': return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'bg-purple-100 text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700'
      }
      case 'emerald': return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: 'bg-emerald-100 text-emerald-600',
        button: 'bg-emerald-600 hover:bg-emerald-700'
      }
      default: return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: 'bg-gray-100 text-gray-600',
        button: 'bg-gray-600 hover:bg-gray-700'
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛠️ Administration IT Vision
          </h1>
          <p className="text-gray-600">
            Système de gestion modulaire des devis et prix par service
          </p>
          <form action="/api/auth/logout" method="post">
            <button className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
              <LogOut className="h-5 w-5" />
              <span>Déconnexion</span>
            </button>
          </form>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-sm text-gray-500">Devis totaux</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{kpis.quotes}</div>
            <Link href="/admin/quotes" className="text-emerald-700 text-sm mt-2 inline-block">Voir les devis →</Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-sm text-gray-500">Projets actifs</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{kpis.projectsActive}</div>
            <Link href="/admin/planning" className="text-emerald-700 text-sm mt-2 inline-block">Voir le planning →</Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-sm text-gray-500">Techniciens disponibles</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{kpis.techniciansAvailable}</div>
            <Link href="/admin/users" className="text-emerald-700 text-sm mt-2 inline-block">Voir l'équipe →</Link>
          </div>
        </div>

        {/* Modules principaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {adminModules.map((module) => {
            const IconComponent = module.icon
            const colors = getColorClasses(module.color)
            
            return (
              <div key={module.id} className={`${colors.bg} ${colors.border} border rounded-2xl p-6`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{module.title}</h3>
                    <p className="text-sm text-gray-600">{module.description}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Fonctionnalités:</h4>
                  <ul className="space-y-1">
                    {module.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Link
                  href={module.href}
                  className={`w-full ${colors.button} text-white py-2 px-4 rounded-lg font-medium transition-colors inline-flex items-center justify-center`}
                >
                  Accéder
                </Link>
              </div>
            )
          })}
        </div>

        {/* Bloc Projets centralisé dans le Dashboard global pour éviter les doublons */}

        {/* Services disponibles */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">🔧 Services Configurés</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => {
              const IconComponent = service.icon
              return (
                <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      <p className="text-xs text-gray-500">{service.products}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Workflow recommandé */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">📋 Workflow Recommandé</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Explorer le Catalogue</h4>
              <p className="text-sm text-gray-600 mb-4">
                Découvrez les types de produits disponibles par service et leurs variants
              </p>
              <Link
                href="/admin/catalog"
                className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Package className="h-4 w-4" />
                <span>Voir Catalogue</span>
              </Link>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Configurer les Prix</h4>
              <p className="text-sm text-gray-600 mb-4">
                Définissez les prix de coût et de vente pour chaque variant de produit
              </p>
              <Link
                href="/admin/prices"
                className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <DollarSign className="h-4 w-4" />
                <span>Gérer Prix</span>
              </Link>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Créer des Devis</h4>
              <p className="text-sm text-gray-600 mb-4">
                Générez des devis professionnels avec les prix configurés
              </p>
              <Link
                href="/admin/quotes"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Calculator className="h-4 w-4" />
                <span>Créer Devis</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Avantages du nouveau système */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">✨ Nouveau Système Modulaire</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-800 mb-2">Améliorations:</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>• <strong>Plus de prix codés en dur</strong> - Tout est configurable</li>
                <li>• <strong>Gestion par type de service</strong> - Organisation claire</li>
                <li>• <strong>Variants de produits</strong> - NVR 4/8/16/32 canaux, etc.</li>
                <li>• <strong>Code modulaire</strong> - Maintenance facilitée</li>
                <li>• <strong>Prix optionnels</strong> - Configuration progressive</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Fonctionnalités:</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• <strong>Marges automatiques</strong> - Calcul prix/coût/marge</li>
                <li>• <strong>Validation des prix</strong> - Alertes marges faibles</li>
                <li>• <strong>Sauvegarde locale</strong> - Persistance des données</li>
                <li>• <strong>Interface intuitive</strong> - Gestion simplifiée</li>
                <li>• <strong>Synchronisation</strong> - Mise à jour temps réel</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Guide d'aide flottant */}
      <AdminHelpGuide />
    </div>
  )
}