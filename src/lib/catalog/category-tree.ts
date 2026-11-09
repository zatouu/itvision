/**
 * Arborescence de référence du catalogue marketplace (familles → sous-catégories).
 * Source unique : seed des catégories, liste IA du smart-import, classifieur
 * automatique et migration des produits existants.
 *
 * `keywords` : termes (FR/EN, accents ignorés) reconnus dans le nom d'un produit.
 * `aliases` : anciens slugs / libellés en texte libre rattachés à ce nœud.
 * Module statique sans dépendance serveur.
 */

export interface CategoryTreeNode {
  slug: string
  name: string
  icon: string
  keywords?: string[]
  aliases?: string[]
}

export interface CategoryTreeFamily extends CategoryTreeNode {
  description: string
  subs: CategoryTreeNode[]
}

/** Catégories « fourre-tout » posées par les imports : à reclasser. */
export const GENERIC_CATEGORY_TEXTS = [
  'catalogue import chine',
  'import chine',
  'divers',
  'autre',
  'autres',
  'general',
  'non classe',
  'uncategorized',
]

export const CATEGORY_TREE: CategoryTreeFamily[] = [
  {
    slug: 'telephones-tablettes',
    name: 'Téléphones & Tablettes',
    description: 'Smartphones, tablettes, accessoires et objets connectés',
    icon: '📱',
    aliases: ['telephonie', 'téléphonie'],
    subs: [
      {
        slug: 'telephone', name: 'Smartphones & téléphones', icon: '📱',
        aliases: ['smartphones', 'telephones', 'téléphones'],
        keywords: ['smartphone', 'téléphone', 'telephone portable', 'iphone', 'samsung galaxy', 'redmi', 'xiaomi', 'mobile phone', 'cellphone'],
      },
      {
        slug: 'tablettes', name: 'Tablettes & liseuses', icon: '📲',
        keywords: ['tablette', 'tablet', 'ipad', 'e-ink', 'liseuse', 'kindle'],
      },
      {
        slug: 'accessoires-telephone', name: 'Accessoires téléphone', icon: '🤳',
        aliases: ['support téléphone'],
        keywords: ['coque', 'support téléphone', 'support telephone', 'porte-téléphone', 'stabilisateur', 'gimbal', 'trépied', 'selfie', 'protection écran', 'verre trempé', 'poignée magnétique', 'magsafe', 'écran de téléphone', "amplificateur d'écran", 'osmo mobile', 'popsocket', 'phone holder', 'phone case'],
      },
      {
        slug: 'chargeurs-batteries', name: 'Chargeurs & batteries externes', icon: '🔋',
        keywords: ['chargeur', 'charger', 'power bank', 'powerbank', 'batterie externe', 'câble de charge', 'station de charge'],
      },
      {
        slug: 'objets-connectes', name: 'Montres & objets connectés', icon: '⌚',
        aliases: ['objets connectés'],
        keywords: ['montre connectée', 'smartwatch', 'smart watch', 'bracelet connecté', 'lunettes intelligentes', 'smart glass', 'bague connectée', "tracker d'activité"],
      },
    ],
  },
  {
    slug: 'informatique',
    name: 'Informatique',
    description: 'Ordinateurs, périphériques, stockage, réseau et impression',
    icon: '💻',
    aliases: ['informatique & bureautique', 'informatique et bureautique'],
    keywords: ['informatique'],
    subs: [
      {
        slug: 'ordinateur', name: 'Ordinateurs & portables', icon: '💻',
        aliases: ['ordinateurs'],
        keywords: ['ordinateur', 'laptop', 'pc portable', 'notebook', 'macbook', 'mini pc', 'pc de bureau', 'chromebook', 'unité centrale'],
      },
      {
        slug: 'ecrans', name: 'Écrans & moniteurs', icon: '🖥️',
        keywords: ['écran pc', 'moniteur pc', 'moniteur gaming', 'écran gaming', "écran d'ordinateur", 'monitor'],
      },
      {
        slug: 'peripheriques', name: 'Claviers, souris & périphériques', icon: '⌨️',
        aliases: ['claviers', 'souris'],
        keywords: ['clavier', 'keyboard', 'souris', 'mouse', 'keypad', 'webcam', 'tablette graphique', 'caméra de vidéoconférence', 'caméra de réunion', 'tapis de souris', 'hub usb', "station d'accueil", 'docking'],
      },
      {
        slug: 'stockage', name: 'Stockage & mémoire', icon: '💾',
        keywords: ['clé usb', 'ssd', 'disque dur', 'hard drive', 'carte mémoire', 'carte sd', 'micro sd', 'nvme', 'flash drive', 'barrette de ram'],
      },
      {
        slug: 'reseau-informatique', name: 'Réseau & Wi-Fi', icon: '🌐',
        aliases: ['réseau informatique', 'reseau'],
        keywords: ['routeur', 'router', 'répéteur', 'wifi extender', 'switch réseau', 'switch poe', 'poe', "point d'accès", 'access point', 'modem', 'câble réseau', 'rj45', 'cpl', 'mesh wifi'],
      },
      {
        slug: 'imprimantes', name: 'Imprimantes & étiqueteuses', icon: '🖨️',
        keywords: ['imprimante', 'printer', 'étiqueteuse', 'machine à étiquettes', 'scanner', 'cartouche', 'toner'],
      },
      {
        slug: 'cables', name: 'Câbles & adaptateurs', icon: '🔌',
        aliases: ['câbles & connectique', 'connectique'],
        keywords: ['câble', 'cable', 'adaptateur', 'hdmi', 'usb-c', 'type-c', 'convertisseur vidéo', 'rallonge usb'],
      },
      {
        slug: 'accessoires-informatique', name: 'Accessoires informatiques', icon: '🎒',
        keywords: ['accessoire informatique', 'accessoires informatiques', 'kit de nettoyage', 'support ordinateur', 'support pc', 'refroidisseur', 'sacoche ordinateur', 'housse ordinateur'],
      },
    ],
  },
  {
    slug: 'electronique',
    name: 'TV, Audio & High-Tech',
    description: 'TV, audio, photo, drones, gaming et gadgets',
    icon: '📺',
    aliases: ['électronique grand public', 'electronique-divers', 'électronique divers', 'électronique', 'high-tech', 'high tech'],
    subs: [
      {
        slug: 'tv', name: 'TV & box TV', icon: '📺',
        aliases: ['box tv', 'télévision'],
        keywords: ['tv', 'téléviseur', 'television', 'smart tv', 'tv box', 'box tv', 'android tv', 'tv stick', 'fire stick'],
      },
      {
        slug: 'telecommande', name: 'Télécommandes', icon: '🎛️',
        keywords: ['télécommande', 'remote control'],
      },
      {
        slug: 'audio', name: 'Audio & casques', icon: '🎧',
        aliases: ['audio-video', 'audio & vidéo', 'audio vidéo'],
        keywords: ['casque audio', 'casque bluetooth', 'casque sans fil', 'casque gaming', 'écouteur', 'earbud', 'airpods', 'enceinte', 'haut-parleur', 'speaker', 'barre de son', 'soundbar', 'headphone', 'headset', 'sony wh', 'radio', 'amplificateur audio', 'home cinéma', 'platine vinyle'],
      },
      {
        slug: 'microphones', name: 'Microphones', icon: '🎙️',
        keywords: ['microphone', 'micro-cravate', 'micro cravate', 'micro sans fil', 'dji mic', 'fifine'],
      },
      {
        slug: 'projecteurs', name: 'Vidéoprojecteurs', icon: '📽️',
        keywords: ['projecteur', 'vidéoprojecteur', 'projector', 'beamer'],
      },
      {
        slug: 'camera', name: 'Caméras & photo', icon: '📷',
        keywords: ['caméra', 'appareil photo', "caméra d'action", 'caméra corporelle', 'caméra pov', 'action cam', 'gopro', 'insta360', 'caméra sportive', 'objectif photo', 'flash photo', 'ring light', 'anneau lumineux'],
      },
      {
        slug: 'drone', name: 'Drones', icon: '🚁',
        keywords: ['drone', 'quadricoptère', 'quadcopter', 'uav', 'multirotor', 'fpv'],
      },
      {
        slug: 'gaming', name: 'Consoles & gaming', icon: '🎮',
        aliases: ['console jeux', 'manette', 'manette bluetooth', 'portable gaming'],
        keywords: ['console', 'ps5', 'ps4', 'playstation', 'xbox', 'nintendo', 'manette', 'gamepad', 'joystick', 'steam deck', 'legion go', 'gaming', 'jeu vidéo', 'jeux vidéo'],
      },
      {
        slug: 'gadgets', name: 'Gadgets & innovations', icon: '✨',
        keywords: ['gadget', 'ventilateur portable', 'mini ventilateur', 'ventilateur de poche', 'plasma', 'microscope', 'traducteur', 'bonnet bluetooth', 'lampe magique'],
      },
    ],
  },
  {
    slug: 'securite',
    name: 'Sécurité & surveillance',
    description: "Vidéosurveillance, contrôle d'accès, alarmes et serrures connectées",
    icon: '🛡️',
    aliases: ['sécurité'],
    keywords: ['sécurité'],
    subs: [
      {
        slug: 'videosurveillance', name: 'Vidéosurveillance', icon: '📹',
        keywords: ['caméra de surveillance', 'caméra de sécurité', 'caméra ip', 'ip camera', 'cctv', 'nvr', 'dvr', 'hikvision', 'dahua', 'caméra dôme', 'ptz', 'caméra wifi', 'caméra extérieure', 'caméra réseau', 'détecteur de caméra', 'security camera', 'surveillance camera', 'caméra espion', 'vidéosurveillance'],
      },
      {
        slug: 'controle-acces', name: "Contrôle d'accès", icon: '🔐',
        keywords: ["contrôle d'accès", 'controle acces', 'badge', 'lecteur rfid', 'pointeuse', 'biométrique', 'reconnaissance faciale', 'digicode', 'barrière levante', 'access control'],
      },
      {
        slug: 'alarme-intrusion', name: 'Alarmes & intrusion', icon: '🚨',
        keywords: ['alarme', 'alarm', 'sirène', 'détecteur de mouvement', "détecteur d'ouverture", 'kit alarme', 'anti-intrusion'],
      },
      {
        slug: 'interphones', name: 'Interphones & visiophones', icon: '🔔',
        aliases: ['interphone video ip', 'interphone'],
        keywords: ['interphone', 'visiophone', 'sonnette vidéo', 'sonnette', 'portier', 'doorbell', 'fanvil', 'intercom'],
      },
      {
        slug: 'serrures-connectees', name: 'Serrures connectées', icon: '🔑',
        aliases: ['serrure intelligente'],
        keywords: ['serrure connectée', 'serrure intelligente', 'smart lock', 'door lock', 'serrure biométrique', 'serrure à empreinte', 'biometric smart lock', 'cadenas connecté', 'serrure électronique'],
      },
      {
        slug: 'incendie', name: 'Incendie & gaz', icon: '🧯',
        keywords: ['détecteur de fumée', 'smoke detector', 'extincteur', 'alarme incendie', 'détecteur de gaz', 'détecteur de monoxyde', 'couverture anti-feu'],
      },
      {
        slug: 'traceurs-gps', name: 'Traceurs GPS', icon: '📍',
        keywords: ['traceur gps', 'gps tracker', 'airtag', 'localisateur', 'tracker gps', 'balise gps'],
      },
    ],
  },
  {
    slug: 'domotique',
    name: 'Maison connectée',
    description: 'Éclairage, prises, capteurs et motorisation intelligents',
    icon: '🏠',
    aliases: ['domotique-maison', 'smart-home', 'domotique & smart home', 'smart home'],
    keywords: ['domotique', 'smart home', 'maison connectée', 'tuya', 'homekit'],
    subs: [
      {
        slug: 'eclairage-connecte', name: 'Éclairage connecté', icon: '💡',
        keywords: ['ampoule', 'ampoule connectée', 'ampoule intelligente', 'ruban led connecté', 'bande led', 'led strip', 'rgb'],
      },
      {
        slug: 'prises-interrupteurs', name: 'Prises & interrupteurs connectés', icon: '🔌',
        keywords: ['prise connectée', 'prise intelligente', 'smart plug', 'interrupteur connecté', 'interrupteur intelligent', 'interrupteur tactile', 'multiprise connectée'],
      },
      {
        slug: 'capteurs', name: 'Capteurs & thermostats', icon: '🌡️',
        keywords: ['capteur', 'thermostat', 'détecteur de présence', 'zigbee', 'passerelle', 'sensor'],
      },
      {
        slug: 'assistants-vocaux', name: 'Assistants vocaux', icon: '🗣️',
        keywords: ['alexa', 'google home', 'google nest', 'echo dot', 'assistant vocal', 'enceinte intelligente'],
      },
      {
        slug: 'motorisation', name: 'Motorisation & volets', icon: '🚪',
        keywords: ['volet roulant', 'moteur de portail', 'motorisation', 'rideau motorisé', 'store électrique', 'porte de garage'],
      },
    ],
  },
  {
    slug: 'electromenager',
    name: 'Électroménager',
    description: 'Petit et gros électroménager, entretien et climatisation',
    icon: '🔌',
    keywords: ['électroménager'],
    subs: [
      {
        slug: 'petit-electromenager-cuisine', name: 'Cuisine & petit électroménager', icon: '☕',
        aliases: ['machine à café'],
        keywords: ['machine à café', 'cafetière', 'expresso', 'blender', 'mixeur', 'friteuse', 'air fryer', 'bouilloire', 'grille-pain', 'robot cuisine', 'robot culinaire', 'micro-ondes', 'four électrique', 'ice maker', 'machine à glaçons', 'presse-agrumes', 'extracteur de jus', 'plaque de cuisson', 'batteur', 'yaourtière'],
      },
      {
        slug: 'entretien-maison', name: 'Aspirateurs & entretien', icon: '🧹',
        aliases: ['aspirateur'],
        keywords: ['aspirateur', 'vacuum', 'fer à repasser', 'défroisseur', 'nettoyeur vapeur', 'balai électrique', 'nettoyeur haute pression'],
      },
      {
        slug: 'climatisation', name: 'Climatisation & traitement de l’air', icon: '❄️',
        keywords: ['climatiseur', 'ventilateur', 'humidificateur', 'humidifier', "purificateur d'air", 'déshumidificateur', "chauffage d'appoint", 'radiateur', 'air cooler', 'refroidisseur d’air'],
      },
      {
        slug: 'gros-electromenager', name: 'Gros électroménager', icon: '🧊',
        keywords: ['réfrigérateur', 'frigo', 'congélateur', 'machine à laver', 'lave-linge', 'lave-vaisselle', 'cuisinière', 'refrigerator', 'sèche-linge'],
      },
    ],
  },
  {
    slug: 'maison',
    name: 'Maison & Décoration',
    description: 'Décoration, luminaires, cuisine, linge, rangement et jardin',
    icon: '🛋️',
    aliases: ['maison & décoration', 'maison-decoration', 'maison et décoration'],
    subs: [
      {
        slug: 'decoration', name: 'Décoration', icon: '🏺',
        aliases: ['décoration & art', 'décoration'],
        keywords: ['décoration', 'decorati', 'déco', 'coussin', 'fleurs artificielles', 'fleur artificielle', 'vase', 'guirlande', 'bougie', 'cadre photo', 'statue', 'lanterne', 'miroir', 'tapis', 'rideau', 'papier peint', 'sticker mural', 'sculpture', 'brûle-parfum'],
      },
      {
        slug: 'horloge', name: 'Horloges & réveils', icon: '🕰️',
        aliases: ['horloges'],
        keywords: ['horloge', 'réveil', 'pendule', 'clock'],
      },
      {
        slug: 'tableau', name: 'Tableaux & cadres', icon: '🖼️',
        aliases: ['tableaux'],
        keywords: ['tableau', 'toile murale', 'peinture murale', 'poster', 'affiche murale', 'cadre mural'],
      },
      {
        slug: 'luminaires', name: 'Luminaires & éclairage', icon: '🛋️',
        keywords: ['lampe', 'lampadaire', 'lustre', 'applique', 'veilleuse', 'suspension luminaire', 'luminaire', 'guirlande lumineuse', 'guirlandes lumineuses', 'lumière décorative'],
      },
      {
        slug: 'cuisine-arts-table', name: 'Cuisine & arts de la table', icon: '🍽️',
        keywords: ['vaisselle', 'assiette', 'verre à', 'tasse', 'mug', 'couverts', 'poêle', 'casserole', 'ustensile', 'boîte alimentaire', 'gourde', 'thermos', 'théière', 'plateau de service', 'lunch box'],
      },
      {
        slug: 'linge-maison', name: 'Linge de maison', icon: '🛏️',
        keywords: ['drap', 'parure de lit', 'housse de couette', 'couverture', 'plaid', 'serviette de bain', 'nappe', 'oreiller', 'taie', 'couette'],
      },
      {
        slug: 'rangement', name: 'Rangement & organisation', icon: '🧺',
        keywords: ['rangement', 'organisateur', 'panier à linge', 'sac à linge', 'sac de lavage', 'cintre', 'porte-manteau', 'support de télécommande', 'boîte de rangement', 'sous vide'],
      },
      {
        slug: 'jardin', name: 'Jardin & extérieur', icon: '🌿',
        keywords: ['jardin', 'arrosage', "tuyau d'arrosage", 'tondeuse à gazon', 'barbecue', 'parasol', 'pot de fleurs', 'jardinière', 'plante artificielle', 'piscine'],
      },
    ],
  },
  {
    slug: 'mobilier',
    name: 'Mobilier',
    description: 'Meubles maison et bureau, mobilier technique, racks et baies',
    icon: '🪑',
    aliases: ['mobilier & installation'],
    keywords: ['mobilier', 'meuble'],
    subs: [
      {
        slug: 'mobilier-maison', name: 'Meubles maison', icon: '🛋️',
        keywords: ['canapé', 'fauteuil', 'lit', 'armoire', 'commode', 'table basse', 'table à manger', 'chaise', 'tabouret', 'étagère', 'meuble tv', 'bibliothèque', 'pouf', 'table de chevet', 'dressing'],
      },
      {
        slug: 'mobilier-bureau', name: 'Mobilier de bureau', icon: '🪑',
        keywords: ['chaise de bureau', 'fauteuil de bureau', 'table de bureau', 'bureau assis', "bureau d'ordinateur", 'meuble de bureau', 'caisson de bureau', 'chaise gamer', 'chaise gaming'],
      },
      {
        slug: 'mobilier-technique', name: 'Mobilier technique & présentoirs', icon: '🗄️',
        keywords: ['mobilier technique', 'comptoir', 'présentoir', 'vitrine', 'gondole'],
      },
      {
        slug: 'racks-baies', name: 'Racks & baies', icon: '🗄️',
        keywords: ['rack', 'baie de brassage', 'baie serveur', 'armoire réseau', 'coffret réseau', 'armoire informatique'],
      },
    ],
  },
  {
    slug: 'mode',
    name: 'Mode & accessoires',
    description: 'Vêtements, chaussures, sacs, bijoux et accessoires',
    icon: '👗',
    keywords: ['mode'],
    subs: [
      {
        slug: 'habillement', name: 'Vêtements', icon: '👕',
        aliases: ['vêtements', 'vetement'],
        keywords: ['vêtement', 'robe', 'abaya', 'chemise', 't-shirt', 'tee-shirt', 'tshirt', 'pantalon', 'jean', 'denim', 'short', 'veste', 'manteau', 'pull', 'sweat', 'hoodie', 'jupe', 'costume', 'survêtement', 'legging', 'chaussette', 'gilet', 'boubou', 'kaftan', 'caftan', 'jilbab', 'blouson', 'combinaison', 'pyjama', 'polo'],
      },
      {
        slug: 'lingerie', name: 'Lingerie', icon: '👙',
        keywords: ['lingerie', 'soutien-gorge', 'soutiens-gorge', 'nuisette', 'bralette', 'porte-jarretelle', 'maillot de bain'],
      },
      {
        slug: 'sous-vetements', name: 'Sous-vêtements', icon: '🩲',
        keywords: ['sous-vêtement', 'caleçon', 'boxer', 'slip', 'maillot de corps', 'culotte'],
      },
      {
        slug: 'chaussures', name: 'Chaussures', icon: '👟',
        keywords: ['chaussure', 'basket', 'sneaker', 'mocassin', 'botte', 'bottine', 'escarpin', 'chausson', 'pantoufle', 'talons', 'shoes'],
      },
      {
        slug: 'sandales', name: 'Sandales & claquettes', icon: '🩴',
        keywords: ['sandale', 'claquette', 'tong', 'mule', 'nu-pieds'],
      },
      {
        slug: 'sac', name: 'Sacs & bagagerie', icon: '👜',
        aliases: ['sacoche', 'sacs'],
        keywords: ['sac', 'sacs', 'sacoche', 'sac à dos', 'sac à main', 'valise', 'bagage', 'portefeuille', 'banane', 'pochette', 'bag', 'tote', 'cartable'],
      },
      {
        slug: 'hijab', name: 'Hijabs & voiles', icon: '🧕',
        keywords: ['hijab', 'voile', 'khimar', 'niqab', 'sous-hijab'],
      },
      {
        slug: 'foulard', name: 'Foulards & écharpes', icon: '🧣',
        keywords: ['foulard', 'écharpe', 'pashmina', 'turban', 'bandeau', 'bonnet foulard', 'châle', 'étole'],
      },
      {
        slug: 'bijoux-montres', name: 'Bijoux & montres', icon: '💍',
        aliases: ['montre', 'montres', 'bracelet', 'bijoux'],
        keywords: ['bijou', 'collier', 'bracelet', 'bague', "boucle d'oreille", 'boucles d oreilles', 'montre', 'watch', 'pendentif', 'gourmette', 'parure'],
      },
      {
        slug: 'lunettes', name: 'Lunettes', icon: '🕶️',
        aliases: ['lunettes de soleil'],
        keywords: ['lunettes', 'lunette', 'sunglasses', 'monture'],
      },
      {
        slug: 'accessoires-mode', name: 'Accessoires de mode', icon: '🧢',
        keywords: ['ceinture', 'chapeau', 'casquette', 'bonnet', 'gants', 'cravate', 'parapluie', 'éventail', 'nœud papillon', 'bretelles'],
      },
    ],
  },
  {
    slug: 'beaute-sante',
    name: 'Beauté & Santé',
    description: 'Maquillage, soins, cheveux, parfums, hygiène et bien-être',
    icon: '💄',
    aliases: ['beauté', 'beaute', 'beauté & santé', 'santé'],
    keywords: ['beauté', 'cosmétique'],
    subs: [
      {
        slug: 'maquillage', name: 'Maquillage', icon: '💄',
        keywords: ['maquillage', 'makeup', 'rouge à lèvres', 'fard', 'palette', 'mascara', 'fond de teint', 'vernis', 'eyeliner', 'pinceau maquillage', 'faux cils', 'gloss'],
      },
      {
        slug: 'soins-visage-corps', name: 'Soins visage & corps', icon: '🧴',
        keywords: ['crème', 'sérum', 'lotion', 'savon', 'gel douche', 'masque visage', 'soin', 'gommage', 'huile', 'skincare', 'crème solaire', 'beurre de karité', 'lait corporel'],
      },
      {
        slug: 'cheveux', name: 'Cheveux & coiffure', icon: '💇',
        keywords: ['perruque', 'wig', 'mèche', 'tissage', 'lisseur', 'fer à lisser', 'sèche-cheveux', 'brosse à cheveux', 'shampoing', 'shampooing', 'extension cheveux', 'boucleur', 'défrisant'],
      },
      {
        slug: 'parfums', name: 'Parfums & encens', icon: '🌸',
        keywords: ['parfum', 'eau de toilette', 'eau de parfum', 'encens', 'musc', 'oud', 'bakhoor', 'thiouraye', 'diffuseur de parfum'],
      },
      {
        slug: 'rasage-epilation', name: 'Rasage & épilation', icon: '🪒',
        aliases: ['tondeuse'],
        keywords: ['tondeuse', 'rasoir', 'épilateur', 'épilation', 'shaver', 'trimmer'],
      },
      {
        slug: 'hygiene', name: 'Hygiène', icon: '🪥',
        keywords: ['hygiène', 'brosse à dents', 'dentifrice', 'coton-tige', 'serviette hygiénique', 'nettoyeur nasal', 'mouche-bébé', 'déodorant', 'lingette', 'hydropulseur'],
      },
      {
        slug: 'bien-etre', name: 'Bien-être & compléments', icon: '🌿',
        keywords: ['bien-être', 'complément alimentaire', 'supplément', 'vitamine', 'maca', 'nootropique', 'massage', 'masseur', 'tisane', 'minceur', "diffuseur d'arôme", 'aromathérapie', 'huile essentielle'],
      },
      {
        slug: 'sante', name: 'Santé & matériel médical', icon: '🩺',
        keywords: ['tensiomètre', 'moniteur de tension', 'thermomètre', 'oxymètre', 'glucomètre', 'masque chirurgical', 'pansement', 'béquille', 'fauteuil roulant', 'pilulier', 'nébuliseur', 'genouillère', 'ceinture lombaire'],
      },
    ],
  },
  {
    slug: 'bebe-enfants',
    name: 'Bébé & Enfants',
    description: 'Poussettes, puériculture, jouets et vêtements enfants',
    icon: '👶',
    aliases: ['bébé', 'bebe', 'enfants', 'bébé & enfants'],
    keywords: ['bébé', 'baby', 'nourrisson', 'nouveau-né', 'enfant', 'kids'],
    subs: [
      {
        slug: 'poussette', name: 'Poussettes & sièges auto', icon: '👶',
        aliases: ['poussettes'],
        keywords: ['poussette', 'landau', 'siège auto', 'porte-bébé', 'stroller', 'pour jumeaux'],
      },
      {
        slug: 'puericulture', name: 'Puériculture', icon: '🍼',
        keywords: ['puériculture', 'biberon', 'tétine', 'bavoir', 'couche', 'chaise haute', 'babyphone', 'baby monitor', 'parc bébé', 'lit bébé', 'baignoire bébé', 'tire-lait', 'sac à langer'],
      },
      {
        slug: 'jouets', name: 'Jouets & jeux', icon: '🧸',
        keywords: ['jouet', 'toy', 'toys', 'peluche', 'poupée', 'lego', 'puzzle', 'figurine', 'marvel', 'cosplay', 'jeu de société', 'voiture télécommandée', 'jeu éducatif', 'montessori', 'trottinette enfant'],
      },
      {
        slug: 'vetements-enfants', name: 'Vêtements enfants', icon: '🧒',
        keywords: ['vêtement enfant', 'vêtements enfant', 'body bébé', 'pyjama enfant', 'grenouillère', 'ensemble bébé', 'robe fille', 'tenue enfant'],
      },
    ],
  },
  {
    slug: 'auto-moto',
    name: 'Auto & Moto',
    description: 'Pièces et accessoires auto, moto et mobilité électrique',
    icon: '🚗',
    aliases: ['auto', 'auto & moto', 'automobile & moto'],
    subs: [
      {
        slug: 'automobile', name: 'Pièces & accessoires auto', icon: '🚗',
        aliases: ['rétroviseur', 'voiture'],
        keywords: ['voiture', 'pièce auto', 'pièces auto', 'accessoire auto', 'accessoires auto', 'rétroviseur', 'feu arrière', 'phare', 'pare-choc', 'calandre', 'grille avant', 'jante', 'pneu', 'essuie-glace', 'housse de siège', 'mercedes', 'toyota', 'volkswagen', 'peugeot', 'hyundai', 'bmw', 'tapis de voiture'],
      },
      {
        slug: 'electronique-auto', name: 'Électronique & confort auto', icon: '📟',
        keywords: ['dashcam', 'dash cam', 'autoradio', 'gps voiture', 'chargeur voiture', 'support voiture', 'diffuseur voiture', "diffuseur d'arôme pour voiture", 'caméra de recul', 'obd', 'aspirateur voiture', 'pour voiture'],
      },
      {
        slug: 'moto', name: 'Moto & équipements', icon: '🏍️',
        keywords: ['moto', 'motocross', 'moto cross', 'casque moto', 'gilet de protection', 'équipement moto', 'scooter', 'guidon de moto', 'motard'],
      },
      {
        slug: 'mobilite-electrique', name: 'Trottinettes & vélos électriques', icon: '🛴',
        keywords: ['trottinette', 'vélo électrique', 'gyropode', 'hoverboard', 'monoroue', 'scooter électrique', 'e-bike', 'vélo'],
      },
    ],
  },
  {
    slug: 'energie',
    name: 'Énergie & électricité',
    description: 'Solaire, onduleurs, groupes électrogènes et matériel électrique',
    icon: '⚡',
    aliases: ['énergie', 'electricite', 'électricité'],
    keywords: ['énergie'],
    subs: [
      {
        slug: 'solaire', name: 'Solaire', icon: '☀️',
        keywords: ['panneau solaire', 'solaire', 'solar', 'kit solaire', 'lampe solaire', 'régulateur de charge', 'batterie solaire'],
      },
      {
        slug: 'onduleurs', name: 'Onduleurs & batteries', icon: '🔋',
        aliases: ['onduleur'],
        keywords: ['onduleur', 'ups', 'inverter', 'batterie gel', 'batterie lithium', 'stabilisateur de tension', 'convertisseur 12v'],
      },
      {
        slug: 'groupes-electrogenes', name: 'Groupes électrogènes', icon: '⛽',
        keywords: ['groupe électrogène', 'générateur', 'generator'],
      },
      {
        slug: 'materiel-electrique', name: 'Matériel électrique', icon: '💡',
        keywords: ['ampoule led', 'tube led', 'projecteur led', 'câble électrique', 'disjoncteur', 'multiprise', 'rallonge électrique', 'prise électrique', 'interrupteur', 'tableau électrique', 'gaine électrique', 'domino'],
      },
    ],
  },
  {
    slug: 'sport-loisirs',
    name: 'Sport & Loisirs',
    description: 'Fitness, sports, camping et musique',
    icon: '⚽',
    aliases: ['sport', 'sports', 'loisirs'],
    keywords: ['sport'],
    subs: [
      {
        slug: 'fitness', name: 'Fitness & musculation', icon: '🏋️',
        keywords: ['haltère', 'dumbbell', 'tapis de course', "vélo d'appartement", 'banc de musculation', 'musculation', 'élastique de résistance', 'corde à sauter', 'yoga', 'fitness', 'abdominaux', 'kettlebell', 'gainage'],
      },
      {
        slug: 'sports-collectifs', name: 'Sports & équipements', icon: '⚽',
        keywords: ['ballon', 'football', 'basket-ball', 'basketball', 'maillot de foot', 'crampons', 'raquette', 'tennis', 'gants de boxe', 'boxe', 'natation', 'lunettes de natation', 'protège-tibia'],
      },
      {
        slug: 'camping-plein-air', name: 'Camping & plein air', icon: '🏕️',
        keywords: ['camping', 'tente', 'sac de couchage', 'lampe torche', 'lampe frontale', 'jumelles', 'monoculaire', 'télescope', 'pêche', 'canne à pêche', 'randonnée', 'glacière', 'hamac'],
      },
      {
        slug: 'musique', name: 'Instruments de musique', icon: '🎸',
        keywords: ['guitare', 'piano', 'clavier musical', 'synthétiseur', 'violon', 'djembé', 'ukulélé', 'instrument de musique', 'batterie électronique'],
      },
    ],
  },
  {
    slug: 'bricolage',
    name: 'Bricolage & outillage',
    description: 'Outils électroportatifs et à main, quincaillerie, plomberie',
    icon: '🔧',
    aliases: ['outillage'],
    keywords: ['bricolage', 'outillage'],
    subs: [
      {
        slug: 'outillage-electroportatif', name: 'Outils électroportatifs', icon: '🪚',
        keywords: ['perceuse', 'visseuse', 'meuleuse', 'scie électrique', 'scie sauteuse', 'ponceuse', 'perforateur', 'décapeur', 'pistolet à colle', 'fer à souder', 'compresseur'],
      },
      {
        slug: 'outillage-main', name: 'Outillage à main', icon: '🔨',
        keywords: ['tournevis', 'clé à molette', 'pince', 'marteau', 'mètre ruban', 'niveau à bulle', 'caisse à outils', "coffret d'outils", 'jeu de clés', 'cutter', "boîte à outils"],
      },
      {
        slug: 'quincaillerie', name: 'Quincaillerie', icon: '🔩',
        keywords: ['poignée de porte', 'charnière', 'cadenas', 'vis', 'cheville', 'serrure', 'verrou', 'crochet', 'ruban adhésif', 'butée de porte'],
      },
      {
        slug: 'plomberie-sanitaire', name: 'Plomberie & sanitaire', icon: '🚿',
        keywords: ['robinet', 'mitigeur', 'douche', 'pommeau de douche', 'lavabo', 'wc', 'chauffe-eau', 'siphon', 'tuyau', 'évier'],
      },
    ],
  },
  {
    slug: 'bureau-fournitures',
    name: 'Bureau & fournitures',
    description: 'Papeterie, fournitures scolaires et matériel de bureau',
    icon: '✏️',
    aliases: ['fournitures', 'papeterie & bureau'],
    keywords: ['fournitures'],
    subs: [
      {
        slug: 'papeterie', name: 'Papeterie', icon: '🖊️',
        keywords: ['stylo', 'cahier', 'carnet', 'agenda', 'crayon', 'feutre', 'surligneur', 'papeterie', 'enveloppe', 'bloc-notes', 'post-it'],
      },
      {
        slug: 'fournitures-scolaires', name: 'Fournitures scolaires', icon: '🎒',
        keywords: ['fournitures scolaires', 'trousse', "sac d'école", 'sac scolaire', 'compas', 'calculatrice', 'rentrée scolaire'],
      },
      {
        slug: 'materiel-bureau', name: 'Matériel de bureau', icon: '📎',
        keywords: ['agrafeuse', 'perforatrice', 'destructeur de documents', 'plastifieuse', 'tableau blanc', 'classeur', 'trombone', 'porte-documents'],
      },
    ],
  },
  {
    slug: 'animaux',
    name: 'Animalerie',
    description: 'Accessoires et soins pour chiens, chats et autres animaux',
    icon: '🐾',
    aliases: ['animalerie', 'animaux de compagnie'],
    keywords: ['animaux', 'animal', 'pet'],
    subs: [
      {
        slug: 'chiens-chats', name: 'Chiens & chats', icon: '🐕',
        keywords: ['chien', 'chiens', 'chat', 'chats', 'chiot', 'chaton', 'croquette', 'litière', 'laisse', 'griffoir', 'gamelle', 'niche', 'dog', 'cat'],
      },
      {
        slug: 'autres-animaux', name: 'Oiseaux, poissons & autres', icon: '🐠',
        keywords: ['aquarium', 'oiseau', 'cage', 'poisson', 'volière', 'poulailler', 'mangeoire'],
      },
    ],
  },
  {
    slug: 'packs-cadeaux',
    name: 'Packs & Cadeaux',
    description: 'Coffrets, box cadeaux, emballages et packs revendeurs',
    icon: '🎁',
    aliases: ['cadeau', 'cadeaux', 'packs & cadeaux'],
    keywords: ['cadeau'],
    subs: [
      {
        slug: 'coffrets-cadeaux', name: 'Coffrets & box cadeaux', icon: '🎁',
        keywords: ['coffret', 'box cadeau', 'boîte cadeau', 'gift box', "calendrier de l'avent", 'boîte à fleurs', 'box transparent', 'box naissance'],
      },
      {
        slug: 'emballages', name: 'Emballages & boîtes', icon: '📦',
        keywords: ['emballage', 'boîte à bonbons', 'bonbonnière', 'boîte acrylique', 'papier cadeau', 'sac cadeau', 'pochette cadeau', 'pour bonbons', 'dragées'],
      },
      {
        slug: 'packs-revendeurs', name: 'Packs revendeurs', icon: '🛍️',
        aliases: ['lot-10-box-cadeau', 'lot de 10 box cadeau'],
        keywords: ['pack revendeur', 'lot de 10', 'lot de 5', 'lot de 20', 'vente en gros'],
      },
    ],
  },
]

const PARENT_OF = new Map<string, string>()
const NODE_BY_SLUG = new Map<string, CategoryTreeNode>()
for (const family of CATEGORY_TREE) {
  NODE_BY_SLUG.set(family.slug, family)
  for (const sub of family.subs) {
    PARENT_OF.set(sub.slug, family.slug)
    NODE_BY_SLUG.set(sub.slug, sub)
  }
}

/** Famille d'un slug (lui-même s'il s'agit d'une famille), sinon undefined. */
export function categoryFamilyOf(slug: string): string | undefined {
  if (!slug) return undefined
  if (PARENT_OF.has(slug)) return PARENT_OF.get(slug)
  return CATEGORY_TREE.some((f) => f.slug === slug) ? slug : undefined
}

/** Slug + sous-catégories de référence (famille) ou [slug] (feuille/inconnu). */
export function categoryTreeDescendants(slug: string): string[] {
  const family = CATEGORY_TREE.find((f) => f.slug === slug)
  return family ? [family.slug, ...family.subs.map((s) => s.slug)] : [slug]
}

export function findCategoryTreeNode(slug: string): CategoryTreeNode | undefined {
  return NODE_BY_SLUG.get(slug)
}

/** Tous les slugs de l'arbre (familles + sous-catégories). */
export const CATEGORY_TREE_SLUGS: string[] = Array.from(NODE_BY_SLUG.keys())