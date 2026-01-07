'use client'

import {
  BookOpen,
  FileText,
  Users,
  Package,
  Calculator,
  BarChart3,
  Briefcase,
  Wrench,
  AlertCircle
} from 'lucide-react'

export default function AdminHowToPage() {
  const sections = [
    {
      id: 'dashboard',
      title: 'Dashboard Principal',
      icon: BarChart3,
      content: [
        'Le dashboard affiche un aperçu global de votre activité',
        'KPIs en temps réel : devis, projets, techniciens, clients',
        'Graphiques de performance et tendances',
        'Accès rapide aux sections principales'
      ]
    },
    {
      id: 'devis',
      title: 'Gestion des Devis',
      icon: FileText,
      content: [
        'Créer un nouveau devis depuis le dashboard ou la section Devis',
        'Ajouter des produits et services au devis',
        'Calcul automatique des marges et prix',
        'Envoyer le devis au client par email',
        'Suivre le statut : brouillon, envoyé, accepté, refusé'
      ]
    },
    {
      id: 'clients',
      title: 'Gestion des Clients',
      icon: Users,
      content: [
        'Ajouter un nouveau client avec ses informations',
        'Gérer les contacts et coordonnées',
        'Voir l\'historique des projets et devis',
        'Activer/désactiver l\'accès au portail client',
        'Suivre les contrats de maintenance'
      ]
    },
    {
      id: 'produits',
      title: 'Gestion des Produits',
      icon: Package,
      content: [
        'Ajouter/éditer des produits du catalogue',
        'Configurer les prix 1688 (import Chine)',
        'Gérer les stocks et disponibilités',
        'Configurer les options de transport',
        'Publier/dépublier des produits'
      ]
    },
    {
      id: 'technicians',
      title: 'Gestion des Techniciens',
      icon: Users,
      content: [
        'Créer des comptes techniciens',
        'Gérer les disponibilités et spécialités',
        'Assigner des interventions',
        'Suivre les performances',
        'Gérer l\'accès au marketplace'
      ]
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      icon: Wrench,
      content: [
        'Créer des contrats de maintenance',
        'Planifier les visites périodiques',
        'Gérer les interventions',
        'Valider les rapports de maintenance',
        'Suivre les équipements clients'
      ]
    },
    {
      id: 'marketplace',
      title: 'Marketplace Techniciens',
      icon: Briefcase,
      content: [
        'Voir les demandes d\'installation',
        'Assigner automatiquement ou manuellement',
        'Suivre les offres des techniciens',
        'Valider les affectations',
        'Gérer les prix proposés'
      ]
    },
    {
      id: 'comptabilite',
      title: 'Comptabilité',
      icon: Calculator,
      content: [
        'Suivre automatiquement les ventes',
        'Voir les courbes de ventes',
        'Analyser les marges par produit',
        'Exporter les données comptables',
        'Suivre les revenus et dépenses'
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Statistiques',
      icon: BarChart3,
      content: [
        'Voir les statistiques de visites du site',
        'Analyser les pages les plus visitées',
        'Suivre les visiteurs uniques',
        'Voir la répartition par appareil/navigateur',
        'Analyser les tendances de trafic'
      ]
    },
    {
      id: 'support',
      title: 'Support & Tickets',
      icon: AlertCircle,
      content: [
        'Gérer les tickets clients',
        'Assigner les tickets aux techniciens',
        'Suivre les résolutions',
        'Prioriser les urgences',
        'Communiquer avec les clients'
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Guide d&apos;utilisation Admin</h1>
                <p className="text-gray-600 mt-1">Documentation complète pour utiliser le panel d&apos;administration</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <div
                  key={section.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <Icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
                      <ul className="space-y-2">
                        {section.content.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-gray-700">
                            <span className="text-emerald-500 mt-1.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Astuces</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• Utilisez les raccourcis clavier pour naviguer plus rapidement</li>
              <li>• Les données sont mises à jour en temps réel</li>
              <li>• Exportez les rapports pour analyse externe</li>
              <li>• Configurez les notifications pour être alerté des événements importants</li>
            </ul>
          </div>
    </div>
  )
}




