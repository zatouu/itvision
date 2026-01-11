import mongoose from 'mongoose'

let isConnected = false

export async function connectMongoose(uri?: string) {
  // URI par défaut sans authentification pour développement local
  const defaultUri = 'mongodb://admin:AdminPassword123@localhost:27017/itvision_db'
  const mongoUri = uri || process.env.MONGODB_URI || defaultUri
  if (!mongoUri) throw new Error('MONGODB_URI non défini')
  
  // Log pour déboguer
  console.log('[MongoDB] URI utilisée:', mongoUri.replace(/:[^:@]+@/, ':****@'))

  // Si déjà connecté et la connexion est active, retourner la connexion existante
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  // Si la connexion existe mais est dans un état d'erreur, la fermer et réinitialiser
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
    isConnected = false
  }

  try {
    console.log('[MongoDB] Connexion à MongoDB...')
    // Options de connexion
    const options: mongoose.ConnectOptions = {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
    
    await mongoose.connect(mongoUri, options)
    isConnected = true
    console.log('[MongoDB] ✅ Connexion réussie')
    return mongoose.connection
  } catch (error) {
    isConnected = false
    console.error('[MongoDB] ❌ Erreur de connexion:', error)
    // Ne pas exposer l'URI complète dans les logs (sécurité)
    const safeUri = mongoUri.replace(/:[^:@]+@/, ':****@')
    throw new Error(`Erreur de connexion MongoDB: ${error instanceof Error ? error.message : 'Erreur inconnue'} (URI: ${safeUri})`)
  }
}
