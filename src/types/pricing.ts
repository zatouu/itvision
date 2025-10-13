// Types pour la gestion des prix par service

export interface ServiceType {
  id: string
  name: string
  description: string
  icon: string
  defaultMargin: number
  minimumMargin: number
}

export interface ProductType {
  id: string
  name: string
  description: string
  serviceTypeId: string
  category: string
  specifications?: string[]
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string
  name: string
  description: string
  specifications: string[]
  basePrice?: number // Prix optionnel, sera configuré plus tard
  costPrice?: number
  margin?: number
  isDefault?: boolean
}

export interface PricingConfig {
  serviceTypes: ServiceType[]
  productTypes: ProductType[]
  priceOverrides: PriceOverride[]
}

export interface PriceOverride {
  id: string
  productTypeId: string
  variantId: string
  unitPrice: number
  costPrice: number
  margin: number
  currency: string
  validFrom: string
  validUntil?: string
  isActive: boolean
  lastUpdated: string
  updatedBy: string
}

export interface QuoteConfiguration {
  id: string
  name: string
  serviceTypeId: string
  description: string
  selectedProducts: SelectedProduct[]
  defaultTerms: string[]
  paymentTerms: string[]
  validityDays: number
}

export interface SelectedProduct {
  productTypeId: string
  variantId: string
  quantity: number
  isOptional: boolean
  customSpecs?: string[]
}

// Configuration des produits vidéosurveillance - NVR
const NVR_TYPES: ProductType = {
  id: 'nvr_systems',
  name: 'Enregistreurs NVR',
  description: 'Systèmes d\'enregistrement réseau',
  serviceTypeId: 'videosurveillance',
  category: 'recording',
  variants: [
    {
      id: 'nvr_4ch',
      name: 'NVR 4 canaux',
      description: 'Enregistreur 4 canaux pour petites installations',
      specifications: ['4 canaux PoE', '4K H.265+', '1x SATA', 'HDMI 4K', 'Bande passante 40Mbps'],
      isDefault: false
    },
    {
      id: 'nvr_8ch',
      name: 'NVR 8 canaux',
      description: 'Enregistreur 8 canaux pour installations moyennes',
      specifications: ['8 canaux PoE', '4K H.265+', '1x SATA', 'HDMI 4K', 'Bande passante 80Mbps'],
      isDefault: true
    },
    {
      id: 'nvr_16ch',
      name: 'NVR 16 canaux',
      description: 'Enregistreur 16 canaux pour grandes installations',
      specifications: ['16 canaux PoE', '4K H.265+', '2x SATA', 'HDMI 4K', 'Bande passante 160Mbps'],
      isDefault: false
    },
    {
      id: 'nvr_32ch',
      name: 'NVR 32 canaux',
      description: 'Enregistreur 32 canaux pour très grandes installations',
      specifications: ['32 canaux PoE', '4K H.265+', '4x SATA', 'HDMI 4K', 'Bande passante 320Mbps'],
      isDefault: false
    },
    {
      id: 'nvr_64ch',
      name: 'NVR 64 canaux',
      description: 'Enregistreur 64 canaux pour installations enterprise',
      specifications: ['64 canaux PoE', '4K H.265+', '8x SATA', 'HDMI 4K', 'Bande passante 640Mbps'],
      isDefault: false
    }
  ]
}

// Configuration des produits vidéosurveillance - Caméras
const CAMERA_TYPES: ProductType = {
  id: 'surveillance_cameras',
  name: 'Caméras de Surveillance',
  description: 'Caméras IP haute définition',
  serviceTypeId: 'videosurveillance',
  category: 'cameras',
  variants: [
    {
      id: 'camera_dome_2mp',
      name: 'Caméra Dôme 2MP',
      description: 'Caméra dôme intérieure 2MP',
      specifications: ['2MP Full HD', 'Vision nocturne 20m', 'PoE', 'IP67', 'Angle 110°'],
      isDefault: false
    },
    {
      id: 'camera_dome_4mp',
      name: 'Caméra Dôme 4MP',
      description: 'Caméra dôme intérieure 4MP',
      specifications: ['4MP Super HD', 'Vision nocturne 30m', 'PoE', 'IP67', 'Angle 110°'],
      isDefault: true
    },
    {
      id: 'camera_dome_4k',
      name: 'Caméra Dôme 4K',
      description: 'Caméra dôme intérieure 4K',
      specifications: ['4K UHD', 'Vision nocturne 30m', 'PoE+', 'IP67', 'Angle 110°'],
      isDefault: false
    },
    {
      id: 'camera_bullet_2mp',
      name: 'Caméra Tube 2MP',
      description: 'Caméra extérieure 2MP',
      specifications: ['2MP Full HD', 'Vision nocturne 40m', 'PoE', 'IP67', 'Angle 90°'],
      isDefault: false
    },
    {
      id: 'camera_bullet_4mp',
      name: 'Caméra Tube 4MP',
      description: 'Caméra extérieure 4MP',
      specifications: ['4MP Super HD', 'Vision nocturne 50m', 'PoE', 'IP67', 'Angle 90°'],
      isDefault: true
    },
    {
      id: 'camera_bullet_4k',
      name: 'Caméra Tube 4K',
      description: 'Caméra extérieure 4K',
      specifications: ['4K UHD', 'Vision nocturne 60m', 'PoE+', 'IP67', 'Angle 90°'],
      isDefault: false
    },
    {
      id: 'camera_ptz_4mp',
      name: 'Caméra PTZ 4MP',
      description: 'Caméra motorisée 4MP',
      specifications: ['4MP Super HD', 'Zoom optique 25x', 'Vision nocturne 150m', 'PoE++', 'IP66'],
      isDefault: false
    },
    {
      id: 'camera_ptz_4k',
      name: 'Caméra PTZ 4K',
      description: 'Caméra motorisée 4K',
      specifications: ['4K UHD', 'Zoom optique 32x', 'Vision nocturne 200m', 'PoE++', 'IP66'],
      isDefault: false
    }
  ]
}

// Configuration des produits domotique
const DOMOTIQUE_TYPES: ProductType[] = [
  {
    id: 'smart_hubs',
    name: 'Hubs et Contrôleurs',
    description: 'Centres de contrôle domotique',
    serviceTypeId: 'domotique',
    category: 'hubs',
    variants: [
      {
        id: 'hub_zigbee_basic',
        name: 'Hub Zigbee Basic',
        description: 'Hub de base pour petites installations',
        specifications: ['Zigbee 3.0', 'WiFi 2.4GHz', 'Max 50 appareils', 'App mobile'],
        isDefault: true
      },
      {
        id: 'hub_zigbee_pro',
        name: 'Hub Zigbee Pro',
        description: 'Hub professionnel pour grandes installations',
        specifications: ['Zigbee 3.0', 'WiFi 2.4/5GHz', 'Max 200 appareils', 'App mobile', 'API locale'],
        isDefault: false
      },
      {
        id: 'hub_matter',
        name: 'Hub Matter Universal',
        description: 'Hub compatible Matter/Thread',
        specifications: ['Matter/Thread', 'Zigbee 3.0', 'WiFi 6', 'Max 500 appareils', 'API complète'],
        isDefault: false
      }
    ]
  },
  {
    id: 'smart_switches',
    name: 'Interrupteurs Intelligents',
    description: 'Interrupteurs et variateurs connectés',
    serviceTypeId: 'domotique',
    category: 'switches',
    variants: [
      {
        id: 'switch_1gang',
        name: 'Interrupteur 1 poste',
        description: 'Interrupteur simple connecté',
        specifications: ['1 poste', 'WiFi/Zigbee', '16A max', 'Sans neutre'],
        isDefault: true
      },
      {
        id: 'switch_2gang',
        name: 'Interrupteur 2 postes',
        description: 'Interrupteur double connecté',
        specifications: ['2 postes', 'WiFi/Zigbee', '16A max', 'Sans neutre'],
        isDefault: false
      },
      {
        id: 'switch_3gang',
        name: 'Interrupteur 3 postes',
        description: 'Interrupteur triple connecté',
        specifications: ['3 postes', 'WiFi/Zigbee', '16A max', 'Sans neutre'],
        isDefault: false
      },
      {
        id: 'dimmer_1gang',
        name: 'Variateur 1 poste',
        description: 'Variateur de lumière connecté',
        specifications: ['1 poste', 'WiFi/Zigbee', '300W max', 'Dimming 1-100%'],
        isDefault: false
      }
    ]
  },
  {
    id: 'smart_sensors',
    name: 'Capteurs Intelligents',
    description: 'Capteurs de mouvement, température, etc.',
    serviceTypeId: 'domotique',
    category: 'sensors',
    variants: [
      {
        id: 'motion_sensor',
        name: 'Capteur de mouvement',
        description: 'Détecteur PIR intelligent',
        specifications: ['PIR', 'Zigbee 3.0', 'Autonomie 2 ans', 'Angle 120°'],
        isDefault: true
      },
      {
        id: 'door_sensor',
        name: 'Capteur d\'ouverture',
        description: 'Détecteur porte/fenêtre',
        specifications: ['Contact magnétique', 'Zigbee 3.0', 'Autonomie 2 ans', 'Étanche'],
        isDefault: true
      },
      {
        id: 'temp_humidity_sensor',
        name: 'Capteur température/humidité',
        description: 'Sonde environnementale',
        specifications: ['Température ±0.3°C', 'Humidité ±3%', 'Zigbee 3.0', 'Écran LCD'],
        isDefault: false
      },
      {
        id: 'smoke_detector',
        name: 'Détecteur de fumée',
        description: 'Détecteur intelligent connecté',
        specifications: ['Détection photoélectrique', 'Zigbee 3.0', 'Autonomie 10 ans', 'Sirène 85dB'],
        isDefault: false
      }
    ]
  },
  {
    id: 'smart_plugs',
    name: 'Prises et Modules',
    description: 'Prises connectées et micro-modules',
    serviceTypeId: 'domotique',
    category: 'plugs',
    variants: [
      {
        id: 'smart_plug_16a',
        name: 'Prise connectée 16A',
        description: 'Prise intelligente avec mesure',
        specifications: ['16A max', 'Zigbee 3.0', 'Mesure consommation', 'Protection enfant'],
        isDefault: true
      },
      {
        id: 'micro_module_switch',
        name: 'Micro-module interrupteur',
        description: 'Module encastrable sans neutre',
        specifications: ['Sans neutre', 'Zigbee 3.0', '16A max', 'Compact'],
        isDefault: true
      },
      {
        id: 'micro_module_dimmer',
        name: 'Micro-module variateur',
        description: 'Module variateur encastrable',
        specifications: ['Avec neutre', 'Zigbee 3.0', '300W max', 'Dimming 1-100%'],
        isDefault: false
      }
    ]
  }
]

// Exportation des configurations
export const VIDEOSURVEILLANCE_PRODUCTS: ProductType[] = [
  NVR_TYPES,
  CAMERA_TYPES,
  {
    id: 'storage_systems',
    name: 'Systèmes de Stockage',
    description: 'Disques durs et solutions de stockage',
    serviceTypeId: 'videosurveillance',
    category: 'storage',
    variants: [
      {
        id: 'hdd_2tb',
        name: 'Disque dur 2TB',
        description: 'Disque spécialisé surveillance 2TB',
        specifications: ['2TB', 'Optimisé surveillance', '3 ans garantie', '7200 RPM'],
        isDefault: false
      },
      {
        id: 'hdd_4tb',
        name: 'Disque dur 4TB',
        description: 'Disque spécialisé surveillance 4TB',
        specifications: ['4TB', 'Optimisé surveillance', '3 ans garantie', '7200 RPM'],
        isDefault: true
      },
      {
        id: 'hdd_8tb',
        name: 'Disque dur 8TB',
        description: 'Disque spécialisé surveillance 8TB',
        specifications: ['8TB', 'Optimisé surveillance', '3 ans garantie', '7200 RPM'],
        isDefault: false
      },
      {
        id: 'hdd_12tb',
        name: 'Disque dur 12TB',
        description: 'Disque spécialisé surveillance 12TB',
        specifications: ['12TB', 'Optimisé surveillance', '3 ans garantie', '7200 RPM'],
        isDefault: false
      }
    ]
  },
  {
    id: 'network_equipment',
    name: 'Équipements Réseau',
    description: 'Switches et équipements réseau',
    serviceTypeId: 'videosurveillance',
    category: 'network',
    variants: [
      {
        id: 'switch_poe_8p',
        name: 'Switch PoE 8 ports',
        description: 'Switch PoE pour petites installations',
        specifications: ['8 ports PoE', '120W budget', 'Gigabit', 'Non managé'],
        isDefault: true
      },
      {
        id: 'switch_poe_16p',
        name: 'Switch PoE 16 ports',
        description: 'Switch PoE pour installations moyennes',
        specifications: ['16 ports PoE', '250W budget', 'Gigabit', 'Managé'],
        isDefault: false
      },
      {
        id: 'switch_poe_24p',
        name: 'Switch PoE 24 ports',
        description: 'Switch PoE pour grandes installations',
        specifications: ['24 ports PoE+', '370W budget', 'Gigabit', 'Managé L2'],
        isDefault: false
      }
    ]
  }
]

export { DOMOTIQUE_TYPES }

// Configuration par défaut des services
export const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  {
    id: 'videosurveillance',
    name: 'Vidéosurveillance',
    description: 'Systèmes de surveillance vidéo IP',
    icon: 'Camera',
    defaultMargin: 30,
    minimumMargin: 20
  },
  {
    id: 'domotique',
    name: 'Domotique',
    description: 'Systèmes d\'automatisation résidentielle',
    icon: 'Home',
    defaultMargin: 40,
    minimumMargin: 30
  },
  {
    id: 'controle_acces',
    name: 'Contrôle d\'Accès',
    description: 'Systèmes de contrôle d\'accès',
    icon: 'Shield',
    defaultMargin: 35,
    minimumMargin: 25
  },
  {
    id: 'network_cabling',
    name: 'Câblage Réseau',
    description: 'Infrastructure réseau et câblage',
    icon: 'Wifi',
    defaultMargin: 35,
    minimumMargin: 25
  },
  {
    id: 'fiber_optic',
    name: 'Fibre Optique',
    description: 'Infrastructure fibre optique',
    icon: 'Zap',
    defaultMargin: 30,
    minimumMargin: 20
  }
]

// Configuration par défaut complète
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  serviceTypes: DEFAULT_SERVICE_TYPES,
  productTypes: [
    ...VIDEOSURVEILLANCE_PRODUCTS,
    ...DOMOTIQUE_TYPES
  ],
  priceOverrides: [] // Les prix seront configurés séparément
}