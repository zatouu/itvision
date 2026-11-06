'use client'

import {
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Info,
  Zap,
  Settings,
  Package,
  Calculator
} from 'lucide-react'

export default function MigrationGuide() {
  const improvements = [
    {
      title: 'Code Modulaire',
      before: 'Fichier unique de 1500+ lignes',
      after: 'Composants séparés par fonctionnalité',
      impact: 'Maintenance facilitée, debugging simplifié'
    },
    {
      title: 'Prix Configurables',
      before: 'Prix codés en dur dans le code',
      after: 'Système de gestion des prix séparé',
      impact: 'Modification des prix sans redéploiement'
    },
    {
      title: 'Types de Produits',
      before: 'Produits fixes par template',
      after: 'Variants par type (NVR 4/8/16/32 canaux)',
      impact: 'Flexibilité et précision des devis'
    },
    {
      title: 'Gestion des Marges',
      before: 'Marges fixes par section',
      after: 'Marges par produit avec validation',
      impact: 'Contrôle précis de la rentabilité'
    }
  ]

  const features = [
    {
      title: 'Vidéosurveillance',
      items: [
        'NVR 4, 8, 16, 32, 64 canaux',
        'Caméras Dôme/Tube 2MP/4MP/4K',
        'Caméras PTZ 4MP/4K',
        'Stockage 2TB à 12TB',
        'Switches PoE 8/16/24 ports'
      ]
    },
    {
      title: 'Domotique',
      items: [
        'Hubs Zigbee Basic/Pro/Matter',
        'Interrupteurs 1/2/3 postes',
        'Variateurs intelligents',
        'Capteurs mouvement/ouverture',
        'Prises connectées et modules'
      ]
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🚀 Migration Système de Devis
        </h1>
        <p className="text-gray-600">
          Passage d'un système monolithique à une architecture modulaire
        </p>
      </div>

      {/* Problèmes résolus */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">❌ Problèmes Résolus</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Code Surchargé</h3>
                <p className="text-sm text-red-600">
                  IntelligentQuoteGenerator.tsx contenait 1547 lignes avec tout mélangé
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Prix Codés en Dur</h3>
                <p className="text-sm text-red-600">
                  Impossible de modifier les prix sans toucher au code
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Types Fixes</h3>
                <p className="text-sm text-red-600">
                  Pas de distinction entre NVR 4, 8, 16 canaux, etc.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800">Architecture Modulaire</h3>
                <p className="text-sm text-green-600">
                  Composants séparés par responsabilité
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800">Prix Configurables</h3>
                <p className="text-sm text-green-600">
                  Interface dédiée pour gérer tous les prix
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800">Variants Détaillés</h3>
                <p className="text-sm text-green-600">
                  Chaque type de produit a ses variants spécifiques
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Améliorations détaillées */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">🔄 Comparaison Avant/Après</h2>

        <div className="space-y-6">
          {improvements.map((improvement, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{improvement.title}</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-1">Avant</h4>
                  <p className="text-sm text-red-600">{improvement.before}</p>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-800 mb-1">Après</h4>
                  <p className="text-sm text-green-600">{improvement.after}</p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Impact:</span>
                  <span className="text-sm text-blue-700">{improvement.impact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nouveaux types de produits */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">📦 Nouveaux Types de Produits</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <ul className="space-y-2">
                {feature.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-center space-x-2 text-sm text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions d'utilisation */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">📖 Comment Utiliser le Nouveau Système</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Explorer le Catalogue</h3>
            <p className="text-sm text-gray-600">
              Découvrez tous les types de produits disponibles par service avec leurs variants détaillés
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Configurer les Prix</h3>
            <p className="text-sm text-gray-600">
              Définissez les prix de coût et de vente pour chaque variant. Les marges se calculent automatiquement
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Créer des Devis</h3>
            <p className="text-sm text-gray-600">
              Générez des devis avec les prix configurés. Le système vous alerte si des prix manquent
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Important</h4>
              <p className="text-sm text-yellow-700 mt-1">
                <strong>Aucun prix n'est défini par défaut.</strong> Vous devez configurer les prix
                pour chaque variant de produit avant de pouvoir créer des devis. Cela vous donne
                un contrôle total sur votre tarification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}