import mongoose from 'mongoose'

let isConnected = false

export async function connectMongoose(uri?: string) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/itvision_db'
  if (!mongoUri) throw new Error('MONGODB_URI non défini')
  if (isConnected) return mongoose.connection

  await mongoose.connect(mongoUri, {
    autoIndex: true,
  })
  isConnected = true
  return mongoose.connection
}
