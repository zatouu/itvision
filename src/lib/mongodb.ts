import { MongoClient } from 'mongodb'

// Éviter d'échouer au build si MONGODB_URI manque; la connexion réelle
// ne se fera qu'à l'exécution des routes qui l'appellent.
if (!process.env.MONGODB_URI) {
  console.warn('[MongoDB] MONGODB_URI manquant. Utilisation d\'une valeur factice pour le build.')
  process.env.MONGODB_URI = 'mongodb://localhost:27017/dev-placeholder'
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

// Helper function to connect to database
export async function connectDB() {
  try {
    const client = await clientPromise
    return client.db() // Uses default database from connection string
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
}