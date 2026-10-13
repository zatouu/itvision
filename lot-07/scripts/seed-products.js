const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://itvision_app:itvision_password@localhost:27017/itvision_db?authSource=itvision_db'

const sampleProducts = [
  // Caméras Surveillance
  {
    name: 'Hikvision DS-2CD2143G2-I',
    category: 'Caméras Surveillance',
    description: 'Caméra IP 4K Ultra HD avec IA AcuSense intégrée, vision nocturne ColorVu et audio bidirectionnel',
    priceAmount: 259000,
    currency: 'Fcfa',
    requiresQuote: false,
    deliveryDays: 1,
    image: '/images/camera-hikvision.jpg'
  },
  {
    name: 'Dahua IPC-HFW4431R-Z',
    category: 'Caméras Surveillance',
    description: 'Caméra IP 4MP avec zoom optique 2.7-13.5mm, vision nocturne IR 30m et détection intelligente',
    priceAmount: 189000,
    currency: 'Fcfa',
    requiresQuote: false,
    deliveryDays: 3,
    image: '/images/camera-dahua.jpg'
  },
  {
    name: 'Uniview IPC2322ER3-DUPF36',
    category: 'Caméras Surveillance',
    description: 'Caméra IP 2MP bullet avec zoom motorisé, vision nocturne IR 50m et protection IP67',
    priceAmount: 0,
    currency: 'Fcfa',
    requiresQuote: true,
    deliveryDays: 0,
    image: '/images/camera-uniview.jpg'
  },

  // Systèmes d'alarme
  {
    name: 'Hikvision AX Hub Pro',
    category: 'Systèmes d\'alarme',
    description: 'Centrale d\'alarme sans fil 32 zones avec communication 4G/WiFi et sirène intégrée',
    priceAmount: 149000,
    currency: 'Fcfa',
    requiresQuote: false,
    deliveryDays: 2,
    image: '/images/alarm-hub.jpg'
  },
  {
    name: 'Dahua ASI7213X-T1',
    category: 'Systèmes d\'alarme',
    description: 'Kit d\'alarme complet avec détecteurs PIR, contacts magnétiques et sirène extérieure',
    priceAmount: 0,
    currency: 'Fcfa',
    requiresQuote: true,
    deliveryDays: 0,
    image: '/images/alarm-kit.jpg'
  },

  // Visiophonie
  {
    name: 'Hikvision DS-KH6320-WTE1',
    category: 'Visiophonie',
    description: 'Moniteur intérieur 7" tactile avec connexion WiFi et application mobile',
    priceAmount: 320000,
    currency: 'Fcfa',
    requiresQuote: false,
    deliveryDays: 1,
    image: '/images/visiophonie-monitor.jpg'
  },
  {
    name: 'Hikvision DS-KD8003-IME1',
    category: 'Visiophonie',
    description: 'Portier vidéo extérieur 2MP avec vision nocturne IR et carte RFID',
    priceAmount: 0,
    currency: 'Fcfa',
    requiresQuote: true,
    deliveryDays: 0,
    image: '/images/visiophonie-portier.jpg'
  },

  // Domotique
  {
    name: 'Hub Central Zigbee 3.0',
    category: 'Domotique',
    description: 'Passerelle multi-protocoles Zigbee + WiFi + Bluetooth pour contrôle unifié',
    priceAmount: 89000,
    currency: 'Fcfa',
    requiresQuote: false,
    deliveryDays: 2,
    image: '/images/domotique-hub.jpg'
  },
  {
    name: 'Micro-Module Retrofit',
    category: 'Domotique',
    description: 'Interrupteur intelligent encastrable pour installation derrière interrupteur existant',
    priceAmount: 45000,
    currency: 'Fcfa',
    requiresQuote: false,
    deliveryDays: 1,
    image: '/images/domotique-module.jpg'
  },
  {
    name: 'Capteur Mouvement PIR',
    category: 'Domotique',
    description: 'Détecteur de mouvement infrarouge 120° avec batterie 2 ans et installation magnétique',
    priceAmount: 0,
    currency: 'Fcfa',
    requiresQuote: true,
    deliveryDays: 0,
    image: '/images/domotique-capteur.jpg'
  },

  // Contrôle d'accès
  {
    name: 'Lecteur RFID Hikvision',
    category: 'Contrôle d\'accès',
    description: 'Lecteur de cartes RFID 13.56MHz avec écran LCD et clavier numérique',
    priceAmount: 125000,
    currency: 'Fcfa',
    requiresQuote: false,
    deliveryDays: 3,
    image: '/images/acces-rfid.jpg'
  },
  {
    name: 'Système Biométrique',
    category: 'Contrôle d\'accès',
    description: 'Terminal d\'accès biométrique avec reconnaissance d\'empreintes et codes PIN',
    priceAmount: 0,
    currency: 'Fcfa',
    requiresQuote: true,
    deliveryDays: 0,
    image: '/images/acces-biometrique.jpg'
  }
]

async function seedProducts() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connecté à MongoDB')
    
    const db = client.db()
    const collection = db.collection('products')
    
    // Vider la collection existante
    await collection.deleteMany({})
    console.log('🗑️ Collection products vidée')
    
    // Insérer les produits d'exemple
    const result = await collection.insertMany(sampleProducts)
    console.log(`✅ ${result.insertedCount} produits insérés`)
    
    // Afficher un résumé
    const categories = await collection.distinct('category')
    console.log('\n📊 Catégories créées:')
    categories.forEach(cat => console.log(`  - ${cat}`))
    
    const withPrice = await collection.countDocuments({ priceAmount: { $gt: 0 } })
    const withQuote = await collection.countDocuments({ requiresQuote: true })
    console.log(`\n💰 Produits avec prix: ${withPrice}`)
    console.log(`📋 Produits sur devis: ${withQuote}`)
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await client.close()
    console.log('🔌 Connexion fermée')
  }
}

// Exécuter le script
if (require.main === module) {
  seedProducts()
}

module.exports = { seedProducts, sampleProducts }
