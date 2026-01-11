import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/itvision'

let cached: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } = {}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts as any).then(m => {
      console.log('✓ MongoDB connected')
      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = undefined
    throw e
  }

  return cached.conn
}
