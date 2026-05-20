import mongoose from 'mongoose'

export async function connectMongoose(uri?: string) {
  const mongoUri =
    uri ||
    process.env.MONGODB_URI ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'mongodb://localhost:27017/itvision')

  if (!mongoUri) {
    throw new Error('MONGODB_URI non définie en production')
  }

  const safeUri = mongoUri.replace(/:[^:@]+@/, ':****@')

  type MongooseCache = {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
    uri: string | null
  }

  const globalForMongoose = globalThis as typeof globalThis & {
    __mongooseCache?: MongooseCache
  }

  if (!globalForMongoose.__mongooseCache) {
    globalForMongoose.__mongooseCache = { conn: null, promise: null, uri: null }
  }

  const cache = globalForMongoose.__mongooseCache

  // Si on a déjà une connexion sur la même URI, on la réutilise.
  if (cache.conn && cache.uri === mongoUri && mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  // Si l'URI change (ou pas encore de connexion), on initialise une seule promesse de connexion.
  if (!cache.promise || cache.uri !== mongoUri) {
    cache.uri = mongoUri
    console.log('[MongoDB] Connexion à MongoDB…', safeUri)

    const options: mongoose.ConnectOptions = {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    cache.promise = mongoose
      .connect(mongoUri, options)
      .then(m => {
        cache.conn = m
        console.log('[MongoDB] ✅ Connexion réussie')
        return m
      })
  }

  try {
    await cache.promise
    return mongoose.connection
  } catch (error) {
    cache.conn = null
    cache.promise = null
    console.error('[MongoDB] ❌ Erreur de connexion:', error)
    throw new Error(
      `Erreur de connexion MongoDB: ${error instanceof Error ? error.message : 'Erreur inconnue'} (URI: ${safeUri})`
    )
  }
}
