export type MaintenanceTemplateSite = {
  name: string
  address: string
  equipment: Array<{
    item: string
    brand?: string
    quantity: number
  }>
}

export type MaintenanceTemplateService = {
  name: string
  description: string
  frequency: string
}

export type MaintenanceTemplateClause = {
  title: string
  body: string
}

export type MaintenanceTemplate = {
  id: string
  label: string
  serviceCategory: string
  description: string
  type: 'preventive' | 'curative' | 'full' | 'basic'
  defaultStatus: 'draft' | 'active'
  defaultPrice: number
  paymentFrequency: 'monthly' | 'quarterly' | 'annual'
  paymentTerms: string
  durationMonths: number
  coverage: {
    responseTime: string
    supportHours: string
    interventionsIncluded: number
  }
  preventiveFrequency: string
  emergencyLevels: Array<{ level: string; detail: string }>
  services: MaintenanceTemplateService[]
  sites: MaintenanceTemplateSite[]
  clauses: MaintenanceTemplateClause[]
}

export const maintenanceTemplates: MaintenanceTemplate[] = [
  {
    id: 'video-surveillance',
    label: 'Vidéosurveillance Premium',
    serviceCategory: 'Vidéosurveillance',
    description: 'Contrat préventif bi-mensuel + curatif express multi-sites',
    type: 'full',
    defaultStatus: 'draft',
    defaultPrice: 1_800_000,
    paymentFrequency: 'annual',
    paymentTerms: '50% à la signature / 50% après 6 mois de service',
    durationMonths: 12,
    coverage: {
      responseTime: '3h à 24h selon criticité',
      supportHours: '7j/7 – 7h à 22h',
      interventionsIncluded: 12
    },
    preventiveFrequency: 'Visite tous les 2 mois sur chaque site',
    emergencyLevels: [
      { level: 'Niveau 1 (panne mineure)', detail: 'Intervention sous 24h ouvrées' },
      { level: 'Niveau 2 (panne majeure)', detail: 'Intervention sous 6h ouvrées' },
      { level: 'Niveau 3 (situation critique)', detail: 'Intervention sous 3h (astreinte)' }
    ],
    services: [
      { name: 'Maintenance préventive', description: 'Entretien complet, nettoyage optiques, vérification enregistreurs, mise à jour firmware', frequency: 'Bimestrielle' },
      { name: 'Rapport & fiche d’intervention', description: 'Rapports détaillés après chaque passage avec photos et recommandations', frequency: 'À chaque intervention' },
      { name: 'Surveillance proactive', description: 'Contrôle de l’absence de risque de panne ou de destruction', frequency: 'Permanent' },
      { name: 'Urgences & hotline', description: 'Support téléphonique 7j/7 (7h-22h) et déplacement prioritaire', frequency: 'Selon sollicitation' }
    ],
    sites: [
      {
        name: 'Rivonia',
        address: '167 Avenue Lamine Gueye x place Soweto – BP 16144 Dakar – Sénégal',
        equipment: [
          { item: 'Caméras Dahua analogique 2MP', brand: 'Dahua', quantity: 25 },
          { item: 'Enregistreur DVR 32 canaux', brand: 'Dahua', quantity: 1 },
          { item: 'Disque dur surveillance', brand: 'N/A', quantity: 1 }
        ]
      },
      {
        name: 'Trillenium',
        address: '6, avenue Franklin Roosevelt x Kléber – BP 3370 Dakar – Sénégal',
        equipment: [
          { item: 'Caméras Dahua analogique 2MP', brand: 'Dahua', quantity: 6 },
          { item: 'Enregistreur DVR 16 canaux', brand: 'Dahua', quantity: 1 },
          { item: 'Disque dur surveillance', brand: 'N/A', quantity: 1 }
        ]
      },
      {
        name: 'Atrium',
        address: 'Km 8 Avenue Cheikh Anta Diop – Dakar – Sénégal',
        equipment: [
          { item: 'Caméras Dahua analogique 2MP', brand: 'Dahua', quantity: 29 },
          { item: 'Enregistreur DVR 16 canaux', brand: 'Dahua', quantity: 2 },
          { item: 'Disque dur surveillance', brand: 'N/A', quantity: 1 }
        ]
      }
    ],
    clauses: [
      {
        title: 'Objet de la prestation',
        body: 'Maintenance complète du système de vidéosurveillance (caméras, enregistreurs, switch PoE, câblage, connectiques) sur l’ensemble des sites listés, incluant audits, rapports et assistance utilisateurs.'
      },
      {
        title: 'Délais d’intervention',
        body: 'Maintenance préventive tous les deux mois et interventions correctives sous 24h ouvrées maximum. En cas d’urgence, astreinte prioritaire selon les niveaux définis.'
      },
      {
        title: 'Prix et modalités',
        body: 'Montant annuel forfaitaire couvrant les trois sites, payable en deux échéances (50% à la signature, 50% après 6 mois). Le tarif reste inchangé en cas d’évolution mineure du parc.'
      },
      {
        title: 'Durée et renouvellement',
        body: 'Contrat ferme de 12 mois renouvelable tacitement sauf dénonciation écrite 30 jours avant l’échéance.'
      },
      {
        title: 'Obligations du Prestataire',
        body: 'Respect des consignes de sécurité du client, confidentialité totale, reporting systématique, mobilisation des équipes qualifiées.'
      },
      {
        title: 'Obligations du Client',
        body: 'Accès aux locaux, mise à disposition des informations nécessaires, conformité électrique des installations, présence d’un référent site.'
      },
      {
        title: 'Responsabilité',
        body: 'La responsabilité du Prestataire est exclue en cas de défaut d’entretien imputable au Client, d’événements de force majeure ou de toute cause extérieure (coupure secteur, acte de vandalisme).'
      },
      {
        title: 'Droit applicable',
        body: 'Le contrat est régi par le droit sénégalais et tout litige sera soumis aux tribunaux compétents du siège du Prestataire.'
      }
    ]
  },
  {
    id: 'controle-acces',
    label: 'Contrôle d’accès',
    serviceCategory: 'Contrôle d’accès',
    description: 'Maintenance badges, biométrie et supervision logicielle',
    type: 'preventive',
    defaultStatus: 'draft',
    defaultPrice: 950_000,
    paymentFrequency: 'annual',
    paymentTerms: 'Facturation annuelle en une fois',
    durationMonths: 12,
    coverage: {
      responseTime: '8h ouvrées',
      supportHours: 'Lun-Sam 8h-20h',
      interventionsIncluded: 8
    },
    preventiveFrequency: 'Visite trimestrielle + supervision mensuelle distante',
    emergencyLevels: [
      { level: 'Incident badge', detail: 'Intervention sous 24h ouvrées' },
      { level: 'Bloquage accès critique', detail: '4h ouvrées' }
    ],
    services: [
      { name: 'Audit badges et droits', description: 'Contrôle cohérence annuaire / droits d’accès', frequency: 'Trimestriel' },
      { name: 'Maintenance lecteurs', description: 'Nettoyage, recalibrage, remplacement consommables', frequency: 'Trimestriel' },
      { name: 'Supervision logicielle', description: 'Vérification backups, journaux et scénarios d’alarme', frequency: 'Mensuel (remote)' }
    ],
    sites: [
      {
        name: 'Siège',
        address: 'Adresse principale du client',
        equipment: [
          { item: 'Lecteurs biométriques', quantity: 4 },
          { item: 'Contrôleurs IP', quantity: 2 }
        ]
      }
    ],
    clauses: [
      {
        title: 'Objet',
        body: 'Maintenance des sous-systèmes de contrôle d’accès incluant matériel, supervision logicielle et contrôle des droits utilisateurs.'
      },
      {
        title: 'Délais',
        body: 'Tranches horaires d’intervention 8h-20h, astreinte optionnelle sur devis.'
      },
      {
        title: 'Obligations Client',
        body: 'Fournir les exports d’annuaire, notifier les changements critiques, garantir l’accès aux baies.'
      }
    ]
  },
  {
    id: 'supervision-noc',
    label: 'Supervision réseau & NOC',
    serviceCategory: 'Supervision NOC',
    description: 'Surveillance 24/7, tickets & rapports SLA',
    type: 'full',
    defaultStatus: 'draft',
    defaultPrice: 2_400_000,
    paymentFrequency: 'monthly',
    paymentTerms: 'Facturation mensuelle à terme échu',
    durationMonths: 12,
    coverage: {
      responseTime: '30 min (remote) / 4h on-site',
      supportHours: '24/7',
      interventionsIncluded: 24
    },
    preventiveFrequency: 'Revue hebdomadaire des indicateurs',
    emergencyLevels: [
      { level: 'Major', detail: '30 min remote / 4h sur site' },
      { level: 'Minor', detail: '4h remote / 24h sur site' }
    ],
    services: [
      { name: 'Supervision 24/7', description: 'NOC IT Vision avec tableaux de bord temps réel', frequency: 'Permanent' },
      { name: 'Revues SLA', description: 'Comité mensuel avec rapport PDF', frequency: 'Mensuel' }
    ],
    sites: [
      {
        name: 'NOC IT Vision',
        address: 'Télétravail / centre opérations IT Vision',
        equipment: [
          { item: 'Sondes & collectors', quantity: 4 }
        ]
      }
    ],
    clauses: [
      { title: 'Objet', body: 'Surveillance proactive du réseau client et gestion des tickets de niveau 1/2.' },
      { title: 'Prix', body: 'Forfait mensuel couvrant les astreintes et les comités de pilotage.' }
    ]
  },
  {
    id: 'curative-basic',
    label: 'Curatif Basic',
    serviceCategory: 'Maintenance curative',
    description: 'Interventions illimitées heures ouvrées sur matériel de sécurité',
    type: 'curative',
    defaultStatus: 'draft',
    defaultPrice: 600_000,
    paymentFrequency: 'annual',
    paymentTerms: 'Facturation annuelle unique',
    durationMonths: 12,
    coverage: {
      responseTime: '24h ouvrées',
      supportHours: 'Lun-Sam 8h-18h',
      interventionsIncluded: 999
    },
    preventiveFrequency: 'Visite annuelle',
    emergencyLevels: [
      { level: 'Incident standard', detail: '24h ouvrées' }
    ],
    services: [
      { name: 'Curatif illimité', description: 'Déplacements et main-d’œuvre inclus (hors pièces)', frequency: 'Selon demande' },
      { name: 'Rapport curatif', description: 'Compte rendu et devis correctif', frequency: 'Après chaque intervention' }
    ],
    sites: [
      {
        name: 'Site principal',
        address: 'Adresse du client',
        equipment: [
          { item: 'Équipements couverts', quantity: 1 }
        ]
      }
    ],
    clauses: [
      { title: 'Objet', body: 'Assistance corrective illimitée sur les équipements listés.' },
      { title: 'Exclusions', body: 'Pièces détachées facturées en supplément, interventions hors créneau sur devis.' }
    ]
  }
]

