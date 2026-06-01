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
    { slug: 'installation', label_fr: 'Installation', label_wo: 'Samp', label_en: 'Installation' },
    { slug: 'depannage', label_fr: 'Dépannage', label_wo: 'Defaaj', label_en: 'Repair' },
    { slug: 'cablage', label_fr: 'Câblage', label_wo: 'Kaabl', label_en: 'Wiring' },
  ]},
  { slug: 'plomberie', label_fr: 'Plomberie', label_wo: 'Robine', label_en: 'Plumbing', abbr: 'PL', color: '#0369A1', order: 2, subCategories: [
    { slug: 'fuite', label_fr: 'Fuite d\'eau', label_wo: 'Ndox mu daay', label_en: 'Water leak' },
    { slug: 'installation-sanitaire', label_fr: 'Installation sanitaire', label_wo: 'Samp saniteer', label_en: 'Sanitary installation' },
    { slug: 'debouchage', label_fr: 'Débouchage', label_wo: 'Ubbi', label_en: 'Unclogging' },
  ]},
  { slug: 'menuiserie', label_fr: 'Menuiserie', label_wo: 'Bënu-bant', label_en: 'Carpentry', abbr: 'ME', color: '#92400E', order: 3, subCategories: [
    { slug: 'porte', label_fr: 'Portes', label_wo: 'Bunt', label_en: 'Doors' },
    { slug: 'meuble', label_fr: 'Meubles', label_wo: 'Alaal', label_en: 'Furniture' },
    { slug: 'fenetre', label_fr: 'Fenêtres', label_wo: 'Palanteer', label_en: 'Windows' },
  ]},
  { slug: 'peinture', label_fr: 'Peinture', label_wo: 'Pentur', label_en: 'Painting', abbr: 'PE', color: '#6D28D9', order: 4, subCategories: [
    { slug: 'interieur', label_fr: 'Intérieur', label_wo: 'Biir', label_en: 'Interior' },
    { slug: 'exterieur', label_fr: 'Extérieur', label_wo: 'Biti', label_en: 'Exterior' },
    { slug: 'decoratif', label_fr: 'Décoratif', label_wo: 'Dekor', label_en: 'Decorative' },
  ]},
  { slug: 'climatisation', label_fr: 'Climatisation', label_wo: 'Klima', label_en: 'HVAC', abbr: 'CL', color: '#0891B2', order: 5, subCategories: [
    { slug: 'installation-clim', label_fr: 'Installation', label_wo: 'Samp', label_en: 'Installation' },
    { slug: 'entretien', label_fr: 'Entretien', label_wo: 'Saytu', label_en: 'Maintenance' },
    { slug: 'reparation', label_fr: 'Réparation', label_wo: 'Defaaj', label_en: 'Repair' },
  ]},
  { slug: 'securite', label_fr: 'Sécurité', label_wo: 'Kaarange', label_en: 'Security', abbr: 'SE', color: '#065F46', order: 6, subCategories: [
    { slug: 'camera', label_fr: 'Caméras', label_wo: 'Kamera', label_en: 'Cameras' },
    { slug: 'alarme', label_fr: 'Alarmes', label_wo: 'Alarm', label_en: 'Alarms' },
    { slug: 'serrurerie', label_fr: 'Serrurerie', label_wo: 'Kuddu', label_en: 'Locksmith' },
  ]},
  { slug: 'nettoyage', label_fr: 'Nettoyage', label_wo: 'Set', label_en: 'Cleaning', abbr: 'NE', color: '#0D9488', order: 7, subCategories: [
    { slug: 'maison', label_fr: 'Maison', label_wo: 'Kër', label_en: 'House' },
    { slug: 'bureau', label_fr: 'Bureau', label_wo: 'Biro', label_en: 'Office' },
    { slug: 'apres-travaux', label_fr: 'Après travaux', label_wo: 'Ginnaaw liggéey', label_en: 'Post-construction' },
  ]},
  { slug: 'demenagement', label_fr: 'Déménagement', label_wo: 'Déménajmaa', label_en: 'Moving', abbr: 'DM', color: '#B45309', order: 8, subCategories: [
    { slug: 'local', label_fr: 'Dakar', label_wo: 'Ndakaaru', label_en: 'Dakar' },
    { slug: 'longue-distance', label_fr: 'Longue distance', label_wo: 'Sori', label_en: 'Long distance' },
  ]},
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
