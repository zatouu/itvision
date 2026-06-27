export type StockStatus = 'in_stock' | 'preorder' | 'out_of_stock'

export interface CorporateProduct {
  id: string
  name: string
  category: string
  description: string
  image?: string
  priceAmount?: number
  currency: string
  features: string[]
  stockStatus: StockStatus
  stockQuantity: number
  availabilityLabel: string
}

export const FALLBACK_PRODUCTS: CorporateProduct[] = [
  {
    id: 'camera-ip',
    name: 'Caméras IP professionnelles',
    category: 'Vidéosurveillance',
    description:
      'Solutions de surveillance HD pour bureaux, commerces, entrepôts et résidences. Vision nocturne, accès mobile et enregistrement sécurisé.',
    currency: 'FCFA',
    features: ['Vision nocturne', 'Accès mobile', 'Enregistrement local ou cloud', 'Installation incluse'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'controle-acces',
    name: "Contrôle d'accès biométrique",
    category: "Contrôle d'accès",
    description:
      "Gestion sécurisée des entrées par empreinte digitale, badge RFID ou code PIN. Journal des passages et gestion multi-sites.",
    currency: 'FCFA',
    features: ['Empreinte / Badge / Code', 'Gestion utilisateurs', 'Journal des passages', 'Multi-sites'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'alarme-intrusion',
    name: "Système d'alarme intrusion",
    category: 'Alarme & détection',
    description:
      'Protection périmétrique et volumétrique avec détecteurs, sirènes et alertes en temps réel sur mobile.',
    currency: 'FCFA',
    features: ['Détecteurs mouvement', 'Capteurs ouverture', 'Sirène', 'Alertes mobile'],
    stockStatus: 'in_stock',
    stockQuantity: 3,
    availabilityLabel: '3 en stock à Dakar',
  },
  {
    id: 'reseau-poe',
    name: 'Réseau & switches PoE',
    category: 'Réseau & connectivité',
    description:
      'Infrastructure réseau fiable pour caméras IP, postes de travail et équipements Wi-Fi. Câblage structuré et baie réseau.',
    currency: 'FCFA',
    features: ['Switches PoE', 'Câblage structuré', 'Baie réseau', 'Tests débit'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'domotique',
    name: 'Domotique résidentielle',
    category: 'Domotique',
    description:
      'Automatisation des éclairages, accès, climatisation et appareils connectés avec pilotage sur smartphone.',
    currency: 'FCFA',
    features: ['Scénarios intelligents', 'Pilotage mobile', 'Capteurs connectés', 'Automatisation éclairage'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'detection-incendie',
    name: 'Détection incendie',
    category: 'Sécurité incendie',
    description:
      "Détecteurs de fumée, signalisation d'alarme et dispositifs d'évacuation pour sites professionnels et ERP.",
    currency: 'FCFA',
    features: ['Détecteurs fumée', 'Signalisation sonore', 'Centrale selon besoin', 'Maintenance périodique'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
]
