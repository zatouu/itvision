import mongoose, { type ClientSession } from 'mongoose'

/**
 * Exécute `fn` dans une transaction (replica set en production). Sur un Mongo autonome
 * (développement local), la transaction est refusée dès la première opération : on rejoue sans.
 */
export async function withOptionalTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession()
  try {
    let result!: T
    await session.withTransaction(async () => { result = await fn(session) })
    return result
  } catch (err: any) {
    if (err?.code === 20 || /Transaction numbers are only allowed|replica set/i.test(String(err?.message || ''))) return fn(undefined)
    throw err
  } finally {
    await session.endSession()
  }
}
