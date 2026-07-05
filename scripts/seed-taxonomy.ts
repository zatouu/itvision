/**
 * Seed script: importe la full taxonomy (src/lib/taxonomy/taxonomy.json)
 * dans la collection MongoDB productcategories.
 * Run: npm run seed:taxonomy
 *      npx tsx scripts/seed-taxonomy.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { seedTaxonomyToMongoDB } from '../src/lib/taxonomy/mongodb'

dotenv.config({ path: '.env.local' })

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/itvision'
const DRY_RUN = process.argv.includes('--dry-run')

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')
  console.log(`Importing taxonomy... ${DRY_RUN ? '(dry-run)' : ''}`)

  const result = await seedTaxonomyToMongoDB(DRY_RUN)
  console.log(`\nSeeded taxonomy:`)
  console.log(`  total: ${result.total}`)
  console.log(`  created: ${result.created}`)
  console.log(`  updated: ${result.updated}`)

  await mongoose.disconnect()
}

seed().catch(e => { console.error(e); process.exit(1) })
