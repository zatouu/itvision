/**
 * Constantes pour la gestion des produits
 * Options prédéfinies pour simplifier l'ajout de produits
 */

// Catégories de produits
export const PRODUCT_CATEGORIES = [
  { id: 'videosurveillance', label: 'Vidéosurveillance', icon: '📹' },
  { id: 'controle-acces', label: 'Contrôle d\'accès', icon: '🔐' },
  { id: 'alarme', label: 'Alarme & Intrusion', icon: '🚨' },
  { id: 'incendie', label: 'Sécurité incendie', icon: '🔥' },
  { id: 'domotique', label: 'Domotique', icon: '🏠' },
  { id: 'reseau', label: 'Réseau & Câblage', icon: '🌐' },
  { id: 'interphonie', label: 'Interphonie', icon: '📞' },
  { id: 'accessoires', label: 'Accessoires', icon: '🔧' },
  { id: 'autre', label: 'Autre', icon: '📦' }
] as const

// Sous-catégories par catégorie
export const PRODUCT_SUBCATEGORIES: Record<string, string[]> = {
  'videosurveillance': ['Caméra IP', 'Caméra PTZ', 'NVR/DVR', 'Kit complet', 'Accessoires vidéo'],
  'controle-acces': ['Lecteur biométrique', 'Lecteur RFID', 'Contrôleur', 'Serrure électrique', 'Interphone vidéo'],
  'alarme': ['Centrale alarme', 'Détecteur mouvement', 'Détecteur ouverture', 'Sirène', 'Clavier'],
  'incendie': ['Détecteur fumée', 'Détecteur chaleur', 'Extincteur', 'Centrale incendie', 'Signalisation'],
  'domotique': ['Éclairage connecté', 'Prise connectée', 'Thermostat', 'Capteur', 'Hub domotique'],
  'reseau': ['Switch', 'Routeur', 'Point d\'accès WiFi', 'Câble réseau', 'Baie/Rack'],
  'interphonie': ['Platine de rue', 'Moniteur intérieur', 'Kit interphone', 'Gâche électrique'],
  'accessoires': ['Alimentation', 'Support/Fixation', 'Câble', 'Connecteur', 'Boîtier']
}

// Couleurs prédéfinies
export const COMMON_COLORS = [
  { id: 'blanc', label: 'Blanc', hex: '#FFFFFF' },
  { id: 'noir', label: 'Noir', hex: '#000000' },
  { id: 'gris', label: 'Gris', hex: '#808080' },
  { id: 'argent', label: 'Argent', hex: '#C0C0C0' },
  { id: 'or', label: 'Or / Doré', hex: '#FFD700' },
  { id: 'bleu', label: 'Bleu', hex: '#0066CC' },
  { id: 'rouge', label: 'Rouge', hex: '#CC0000' },
  { id: 'vert', label: 'Vert', hex: '#008000' }
] as const

// Points forts suggérés par catégorie
export const SUGGESTED_FEATURES: Record<string, string[]> = {
  'videosurveillance': [
    'Résolution 4K / 8MP',
    'Résolution 2K / 5MP',
    'Résolution Full HD 1080p',
    'Vision nocturne infrarouge',
    'Vision nocturne couleur',
    'Détection de mouvement intelligent',
    'Reconnaissance faciale',
    'Audio bidirectionnel',
    'Étanche IP67',
    'Stockage carte SD',
    'Accès application mobile',
    'PTZ motorisé',
    'Zoom optique',
    'PoE (Power over Ethernet)',
    'WiFi intégré',
    'Angle de vue 180°'
  ],
  'controle-acces': [
    'Lecteur d\'empreintes digitales',
    'Reconnaissance faciale',
    'Lecteur RFID/NFC',
    'Code PIN',
    'Capacité 1000+ utilisateurs',
    'Capacité 3000+ utilisateurs',
    'Historique des accès',
    'Gestion multi-portes',
    'Interface Wiegand',
    'Connexion WiFi',
    'Application mobile',
    'Écran tactile',
    'Clavier rétroéclairé',
    'Résistant aux intempéries'
  ],
  'alarme': [
    'Sirène intégrée 110dB',
    'Détection PIR',
    'Anti-sabotage',
    'Batterie de secours',
    'Connexion GSM/4G',
    'WiFi intégré',
    'Application mobile',
    'Zones programmables',
    'Mode jour/nuit',
    'Compatibilité domotique'
  ],
  'default': [
    'Installation facile',
    'Garantie 2 ans',
    'Support technique inclus',
    'Manuel en français',
    'Certification CE',
    'Faible consommation énergétique'
  ]
}

// Plateformes de sourcing
export const SOURCING_PLATFORMS = [
  { id: 'aliexpress', label: 'AliExpress', description: 'Marketplace grand public' },
  { id: '1688', label: '1688.com', description: 'Grossiste Chine (meilleurs prix)' },
  { id: 'alibaba', label: 'Alibaba', description: 'B2B international' },
  { id: 'taobao', label: 'Taobao', description: 'Marketplace chinoise' },
  { id: 'factory', label: 'Usine partenaire', description: 'Contact direct fabricant' },
  { id: 'local', label: 'Fournisseur local', description: 'Distributeur Sénégal/Afrique' }
] as const

// Options de disponibilité
export const STOCK_STATUS_OPTIONS = [
  { id: 'in_stock', label: 'En stock à Dakar', description: 'Livraison sous 24-48h', color: 'emerald' },
  { id: 'preorder', label: 'Sur commande Chine', description: 'Délai selon transport choisi', color: 'blue' },
  { id: 'coming_soon', label: 'Bientôt disponible', description: 'En cours d\'approvisionnement', color: 'amber' }
] as const

// Délais de livraison prédéfinis
export const DELIVERY_OPTIONS = [
  { id: 'express', days: 3, label: 'Express aérien (3 jours)', description: 'Livraison ultra-rapide' },
  { id: 'air', days: 10, label: 'Fret aérien (6-10 jours)', description: 'Bon rapport qualité/délai' },
  { id: 'sea', days: 60, label: 'Maritime (50-60 jours)', description: 'Le plus économique' },
  { id: 'local', days: 2, label: 'Stock local (24-48h)', description: 'Disponible immédiatement' }
] as const

// Taux de marge suggérés
export const MARGIN_PRESETS = [
  { rate: 15, label: 'Compétitif (15%)', description: 'Pour produits à forte concurrence' },
  { rate: 25, label: 'Standard (25%)', description: 'Marge recommandée' },
  { rate: 35, label: 'Premium (35%)', description: 'Produits exclusifs ou services inclus' },
  { rate: 50, label: 'Haute valeur (50%)', description: 'Avec installation/configuration' }
] as const

// Frais de service 1688
export const SERVICE_FEE_OPTIONS = [
  { rate: 5, label: '5% - Basique', description: 'Commande simple' },
  { rate: 10, label: '10% - Standard', description: 'Vérification qualité incluse' },
  { rate: 15, label: '15% - Premium', description: 'Service complet + photos' }
] as const
