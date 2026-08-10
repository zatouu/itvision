/**
 * Seed script: insert default service categories into MongoDB.
 * Run: npx tsx scripts/seed-categories.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/itvision'

const CATEGORIES = [
  { slug: 'electricite', label_fr: 'Électricité', label_wo: 'Kuuraŋ', label_en: 'Electrical', abbr: 'EL', color: '#1D4ED8', order: 1, subCategories: [
    { slug: 'panne-electrique', label_fr: 'Panne électrique', label_wo: 'Dafa soor', label_en: 'Power outage' },
    { slug: 'installation', label_fr: 'Installation', label_wo: 'Samp', label_en: 'Installation' },
    { slug: 'prises-interrupteurs', label_fr: 'Prises / Interrupteurs', label_wo: 'Priz / Buton', label_en: 'Outlets / Switches' },
    { slug: 'eclairage', label_fr: 'Éclairage', label_wo: 'Làmp', label_en: 'Lighting' },
    { slug: 'tableau-electrique', label_fr: 'Tableau électrique', label_wo: 'Tablo elektrik', label_en: 'Electrical panel' },
    { slug: 'autre-electricite', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'plomberie', label_fr: 'Plomberie', label_wo: 'Robine', label_en: 'Plumbing', abbr: 'PL', color: '#0369A1', order: 2, subCategories: [
    { slug: 'fuite', label_fr: 'Fuite', label_wo: 'Ndox mu daay', label_en: 'Leak' },
    { slug: 'installation', label_fr: 'Installation', label_wo: 'Samp', label_en: 'Installation' },
    { slug: 'debouchage', label_fr: 'Débouchage', label_wo: 'Ubbi', label_en: 'Unclogging' },
    { slug: 'robinetterie', label_fr: 'Robinetterie', label_wo: 'Robine', label_en: 'Faucets' },
    { slug: 'chauffe-eau', label_fr: 'Chauffe-eau', label_wo: 'Dof ju tedd', label_en: 'Water heater' },
    { slug: 'autre-plomberie', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'menuiserie', label_fr: 'Menuiserie', label_wo: 'Bënu-bant', label_en: 'Carpentry', abbr: 'ME', color: '#92400E', order: 3, subCategories: [
    { slug: 'meubles', label_fr: 'Meubles', label_wo: 'Alaal', label_en: 'Furniture' },
    { slug: 'portes', label_fr: 'Portes', label_wo: 'Bunt', label_en: 'Doors' },
    { slug: 'fenetres', label_fr: 'Fenêtres', label_wo: 'Palanteer', label_en: 'Windows' },
    { slug: 'reparation-menuiserie', label_fr: 'Réparation', label_wo: 'Defaaj', label_en: 'Repair' },
    { slug: 'fabrication-sur-mesure', label_fr: 'Fabrication sur mesure', label_wo: 'Defar ci sa yoon', label_en: 'Custom fabrication' },
    { slug: 'autre-menuiserie', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'peinture', label_fr: 'Peinture', label_wo: 'Pentur', label_en: 'Painting', abbr: 'PE', color: '#6D28D9', order: 4, subCategories: [
    { slug: 'peinture-interieure', label_fr: 'Peinture intérieure', label_wo: 'Pentur biir', label_en: 'Interior painting' },
    { slug: 'peinture-exterieure', label_fr: 'Peinture extérieure', label_wo: 'Pentur biti', label_en: 'Exterior painting' },
    { slug: 'renovation', label_fr: 'Rénovation', label_wo: 'Jubal', label_en: 'Renovation' },
    { slug: 'decoration', label_fr: 'Décoration', label_wo: 'Dekor', label_en: 'Decoration' },
    { slug: 'autre-peinture', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'climatisation', label_fr: 'Climatisation', label_wo: 'Klima', label_en: 'HVAC', abbr: 'CL', color: '#0891B2', order: 5, subCategories: [
    { slug: 'installation-clim', label_fr: 'Installation', label_wo: 'Samp', label_en: 'Installation' },
    { slug: 'reparation-clim', label_fr: 'Réparation', label_wo: 'Defaaj', label_en: 'Repair' },
    { slug: 'entretien', label_fr: 'Entretien', label_wo: 'Saytu', label_en: 'Maintenance' },
    { slug: 'diagnostic', label_fr: 'Diagnostic', label_wo: 'Saytu bu xere', label_en: 'Diagnostic' },
    { slug: 'recharge-gaz', label_fr: 'Recharge / gaz', label_wo: 'Yokk gaz', label_en: 'Gas recharge' },
    { slug: 'autre-climatisation', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'securite', label_fr: 'Sécurité', label_wo: 'Kaarange', label_en: 'Security', abbr: 'SE', color: '#065F46', order: 6, subCategories: [
    { slug: 'camera', label_fr: 'Caméras', label_wo: 'Kamera', label_en: 'Cameras' },
    { slug: 'alarme', label_fr: 'Alarme', label_wo: 'Alarm', label_en: 'Alarm' },
    { slug: 'controle-acces', label_fr: 'Contrôle d\'accès', label_wo: 'Topp ci kaw', label_en: 'Access control' },
    { slug: 'interphone', label_fr: 'Interphone', label_wo: 'Interfon', label_en: 'Intercom' },
    { slug: 'installation-securite', label_fr: 'Installation', label_wo: 'Samp', label_en: 'Installation' },
    { slug: 'maintenance-securite', label_fr: 'Maintenance', label_wo: 'Saytu', label_en: 'Maintenance' },
    { slug: 'autre-securite', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'maconnerie', label_fr: 'Maçonnerie', label_wo: 'Mësoŋ', label_en: 'Masonry', abbr: 'MA', color: '#78350F', order: 7, subCategories: [
    { slug: 'construction', label_fr: 'Construction', label_wo: 'Tabax', label_en: 'Construction' },
    { slug: 'reparation-maconnerie', label_fr: 'Réparation', label_wo: 'Defaaj', label_en: 'Repair' },
    { slug: 'renovation-maconnerie', label_fr: 'Rénovation', label_wo: 'Jubal', label_en: 'Renovation' },
    { slug: 'mur-cloison', label_fr: 'Mur / Cloison', label_wo: 'Miir / Pàrtal', label_en: 'Wall / Partition' },
    { slug: 'carrelage', label_fr: 'Carrelage', label_wo: 'Kaaraj', label_en: 'Tiling' },
    { slug: 'autre-maconnerie', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'nettoyage', label_fr: 'Nettoyage', label_wo: 'Set', label_en: 'Cleaning', abbr: 'NE', color: '#0D9488', order: 8, subCategories: [
    { slug: 'maison', label_fr: 'Maison', label_wo: 'Kër', label_en: 'House' },
    { slug: 'bureau', label_fr: 'Bureau', label_wo: 'Biro', label_en: 'Office' },
    { slug: 'apres-travaux', label_fr: 'Après travaux', label_wo: 'Ginnaaw liggéey', label_en: 'Post-construction' },
    { slug: 'canape-tapis', label_fr: 'Canapé / Tapis', label_wo: 'Paal / Tapis', label_en: 'Sofa / Carpet' },
    { slug: 'vitres', label_fr: 'Vitres', label_wo: 'Vit', label_en: 'Windows' },
    { slug: 'autre-nettoyage', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other' },
  ]},
  { slug: 'demenagement', label_fr: 'Déménagement', label_wo: 'Wuti kër', label_en: 'Moving', abbr: 'DM', color: '#B45309', order: 9, subCategories: [
    { slug: 'local', label_fr: 'Dakar', label_wo: 'Ndakaaru', label_en: 'Dakar' },
    { slug: 'longue-distance', label_fr: 'Longue distance', label_wo: 'Sori', label_en: 'Long distance' },
  ]},
  // Catégorie système pour le cas "Autre / Je ne trouve pas mon besoin"
  { slug: 'autre', label_fr: 'Autre', label_wo: 'Yeneen', label_en: 'Other', abbr: 'AU', color: '#6B7280', order: 99, subCategories: [] },
]

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const col = mongoose.connection.collection('servicecategories')
  for (const cat of CATEGORIES) {
    await col.updateOne(
      { slug: cat.slug },
      { $set: { ...cat, isActive: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )
    console.log(`  ✓ ${cat.slug} (${cat.subCategories.length} sub)`)
  }

  console.log(`\nSeeded ${CATEGORIES.length} categories.`)
  await mongoose.disconnect()
}

seed().catch(e => { console.error(e); process.exit(1) })
