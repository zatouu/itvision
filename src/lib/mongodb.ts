import { MongoClient } from 'mongodb'

// Connexion MongoDB initialisée paresseusement pour éviter les erreurs au build Next.js
const options = {}
let clientPromise: Promise<MongoClient> | null = null

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      // En production, on refuse la connexion si la variable manque
      throw new Error('MONGODB_URI non définie en production')
    }
    // En dev, on utilise une valeur factice pour le build uniquement
    return 'mongodb://localhost:27017/dev-placeholder'
  }
  return uri
}

function createClientPromise(): Promise<MongoClient> {
  const uri = getMongoUri()
  const client = new MongoClient(uri, options)
  return client.connect()
}

export function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    // En dev, on peut réutiliser une promesse globale pour HMR
    if (process.env.NODE_ENV === 'development') {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>
      }
      if (!globalWithMongo._mongoClientPromise) {
        globalWithMongo._mongoClientPromise = createClientPromise()
      }
      clientPromise = globalWithMongo._mongoClientPromise
    } else {
      clientPromise = createClientPromise()
    }
  }
  return clientPromise
}

// Helper function to connect to database
export async function connectDB() {
  try {
    const client = await getClientPromise()
    return client.db()
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
}

// Export par défaut: fonction retournant la promesse du client
export default getClientPromise