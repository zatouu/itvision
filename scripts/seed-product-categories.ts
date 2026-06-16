import 'dotenv/config'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'

async function seed() {
  await connectMongoose()

  const categories = [
    {
      slug: 'videosurveillance',
      name: 'Vidéosurveillance',
      labelFr: 'Vidéosurveillance',
      icon: 'Video',
      color: '#1D4ED8',
      subCategories: [
        { slug: 'cameras-ip', name: 'Caméras IP', labelFr: 'Caméras IP', icon: 'Camera' },
        { slug: 'cameras-analog', name: 'Caméras analogiques', labelFr: 'Caméras analogiques', icon: 'Camera' },
        { slug: 'dvr-nvr', name: 'DVR / NVR', labelFr: 'DVR / NVR', icon: 'HardDrive' },
        { slug: 'accessoires-video', name: 'Accessoires', labelFr: 'Accessoires', icon: 'Settings' },
      ]
    },
    {
      slug: 'controle-acces',
      name: 'Contrôle d\'Accès',
      labelFr: 'Contrôle d\'Accès',
      icon: 'Lock',
      color: '#92400E',
      subCategories: [
        { slug: 'lecteurs-badges', name: 'Lecteurs de badges', labelFr: 'Lecteurs de badges', icon: 'CreditCard' },
        { slug: 'serrures-connectees', name: 'Serrures connectées', labelFr: 'Serrures connectées', icon: 'Lock' },
        { slug: 'portiers-video', name: 'Portiers vidéo', labelFr: 'Portiers vidéo', icon: 'Phone' },
        { slug: 'barrieres', name: 'Barrières & tourniquets', labelFr: 'Barrières & tourniquets', icon: 'Shield' },
      ]
    },
    {
      slug: 'alarme-intrusion',
      name: 'Alarme & Intrusion',
      labelFr: 'Alarme & Intrusion',
      icon: 'Bell',
      color: '#DC2626',
      subCategories: [
        { slug: 'centrales-alarme', name: 'Centrales d\'alarme', labelFr: 'Centrales d\'alarme', icon: 'Bell' },
        { slug: 'detecteurs', name: 'Détecteurs', labelFr: 'Détecteurs', icon: 'Scan' },
        { slug: 'sirènes', name: 'Sirènes & flash', labelFr: 'Sirènes & flash', icon: 'Volume2' },
        { slug: 'télé-surveillance', name: 'Télésurveillance', labelFr: 'Télésurveillance', icon: 'Eye' },
      ]
    },
    {
      slug: 'reseau-informatique',
      name: 'Réseau Informatique',
      labelFr: 'Réseau Informatique',
      icon: 'Wifi',
      color: '#0891B2',
      subCategories: [
        { slug: 'switch-routeurs', name: 'Switch & Routeurs', labelFr: 'Switch & Routeurs', icon: 'Router' },
        { slug: 'cablage', name: 'Câblage réseau', labelFr: 'Câblage réseau', icon: 'Cable' },
        { slug: 'wifi', name: 'Points d\'accès WiFi', labelFr: 'Points d\'accès WiFi', icon: 'Wifi' },
        { slug: 'serveurs', name: 'Serveurs & NAS', labelFr: 'Serveurs & NAS', icon: 'Server' },
      ]
    },
    {
      slug: 'domotique',
      name: 'Domotique & Smart Home',
      labelFr: 'Domotique & Smart Home',
      icon: 'Home',
      color: '#065F46',
      subCategories: [
        { slug: 'ampoules-connectees', name: 'Ampoules connectées', labelFr: 'Ampoules connectées', icon: 'Lightbulb' },
        { slug: 'prises-connectees', name: 'Prises connectées', labelFr: 'Prises connectées', icon: 'Plug' },
        { slug: 'thermostats', name: 'Thermostats', labelFr: 'Thermostats', icon: 'Thermometer' },
        { slug: 'hub-domotique', name: 'Hubs domotique', labelFr: 'Hubs domotique', icon: 'Home' },
      ]
    },
    {
      slug: 'electronique',
      name: 'Électronique',
      labelFr: 'Électronique',
      icon: 'Cpu',
      color: '#6D28D9',
      subCategories: [
        { slug: 'smartphones', name: 'Smartphones', labelFr: 'Smartphones', icon: 'Smartphone' },
        { slug: 'tablettes', name: 'Tablettes', labelFr: 'Tablettes', icon: 'Tablet' },
        { slug: 'ordinateurs', name: 'Ordinateurs', labelFr: 'Ordinateurs', icon: 'Monitor' },
        { slug: 'accessoires-elec', name: 'Accessoires', labelFr: 'Accessoires', icon: 'Headphones' },
      ]
    },
    {
      slug: 'mobilier',
      name: 'Mobilier & Installation',
      labelFr: 'Mobilier & Installation',
      icon: 'Armchair',
      color: '#92400E',
      subCategories: [
        { slug: 'racks-baies', name: 'Racks & Baies', labelFr: 'Racks & Baies', icon: 'Layers' },
        { slug: 'bureau-technique', name: 'Bureau technique', labelFr: 'Bureau technique', icon: 'Desk' },
        { slug: 'armoires', name: 'Armoires techniques', labelFr: 'Armoires techniques', icon: 'Cabinet' },
      ]
    },
    {
      slug: 'cables',
      name: 'Câbles & Connectique',
      labelFr: 'Câbles & Connectique',
      icon: 'Cable',
      color: '#0369A1',
      subCategories: [
        { slug: 'cables-coaxiaux', name: 'Câbles coaxiaux', labelFr: 'Câbles coaxiaux', icon: 'Cable' },
        { slug: 'cables-fibre', name: 'Câbles fibre optique', labelFr: 'Câbles fibre optique', icon: 'Cable' },
        { slug: 'connecteurs', name: 'Connecteurs & adaptateurs', labelFr: 'Connecteurs & adaptateurs', icon: 'Plug' },
        { slug: 'gaines', name: 'Gaines & chemins de câbles', labelFr: 'Gaines & chemins de câbles', icon: 'Cable' },
      ]
    },
    {
      slug: 'lot-10-box-cadeau',
      name: 'Lot de 10 Box cadeau',
      labelFr: 'Lot de 10 Box cadeau',
      icon: 'Gift',
      color: '#BE123C',
      subCategories: []
    },
  ]

  let created = 0
  let updated = 0

  for (const [index, cat] of categories.entries()) {
    const existing = await ProductCategory.findOneAndUpdate(
      { slug: cat.slug },
      { $set: { ...cat, order: index, isActive: true } },
      { upsert: true, new: true }
    )

    if (existing?.createdAt && existing?.updatedAt && +new Date(existing.createdAt) === +new Date(existing.updatedAt)) {
      created += 1
    } else {
      updated += 1
    }
  }

  console.log(`✅ Seed catégories produits terminé`)
  console.log(`   - Total: ${categories.length}`)
  console.log(`   - Créées: ${created}`)
  console.log(`   - Mises à jour: ${updated}`)
  process.exit(0)
}

seed().catch(e => {
  console.error(e)
  process.exit(1)
})
