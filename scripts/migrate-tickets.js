/**
 * Script de Migration des Tickets
 * 
 * Normalise les catégories et statuts des tickets existants
 * pour correspondre au nouveau schéma unifié.
 */

const mongoose = require('mongoose')

// Mapping des anciennes catégories vers les nouvelles
const CATEGORY_MAP = {
  'general': 'request',
  'technical': 'incident',
  'billing': 'request',
  'urgent': 'incident'
  // 'incident', 'request', 'change' restent inchangés
}

// Mapping des anciens statuts vers les nouveaux
const STATUS_MAP = {
  'waiting': 'waiting_client'
  // Les autres statuts sont déjà corrects
}

async function migrateTickets() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/itvision_db'
    console.log('🔌 Connexion à MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connecté à MongoDB\n')

    const Ticket = mongoose.connection.collection('tickets')
    
    // 1. Migration des catégories
    console.log('📋 Migration des catégories...')
    for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAP)) {
      const result = await Ticket.updateMany(
        { category: oldCategory },
        { $set: { category: newCategory } }
      )
      if (result.modifiedCount > 0) {
        console.log(`   ✓ ${result.modifiedCount} ticket(s) : '${oldCategory}' → '${newCategory}'`)
      }
    }

    // 2. Migration des statuts
    console.log('\n📊 Migration des statuts...')
    for (const [oldStatus, newStatus] of Object.entries(STATUS_MAP)) {
      const result = await Ticket.updateMany(
        { status: oldStatus },
        { $set: { status: newStatus } }
      )
      if (result.modifiedCount > 0) {
        console.log(`   ✓ ${result.modifiedCount} ticket(s) : '${oldStatus}' → '${newStatus}'`)
      }
    }

    // 3. S'assurer que tous les tickets ont messages et history initialisés
    console.log('\n🔧 Initialisation des champs requis...')
    const result = await Ticket.updateMany(
      { $or: [{ messages: { $exists: false } }, { history: { $exists: false } }] },
      { 
        $setOnInsert: { 
          messages: [], 
          history: [],
          assignedTo: [],
          watchers: [],
          tags: []
        } 
      }
    )
    if (result.modifiedCount > 0) {
      console.log(`   ✓ ${result.modifiedCount} ticket(s) mis à jour avec champs par défaut`)
    }

    // 4. Statistiques finales
    console.log('\n📈 Statistiques finales :')
    const categories = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    console.log('   Catégories :')
    categories.forEach(cat => {
      console.log(`     - ${cat._id}: ${cat.count} ticket(s)`)
    })

    const statuses = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    console.log('\n   Statuts :')
    statuses.forEach(stat => {
      console.log(`     - ${stat._id}: ${stat.count} ticket(s)`)
    })

    const total = await Ticket.countDocuments()
    console.log(`\n✅ Migration terminée ! Total: ${total} ticket(s)\n`)

  } catch (error) {
    console.error('❌ Erreur de migration:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Déconnecté de MongoDB')
    process.exit(0)
  }
}

// Exécuter la migration
migrateTickets()





