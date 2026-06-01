import { connectMongoose } from './mongoose'
import ServiceCategory from './models/ServiceCategory'

let cachedSlugs: string[] = []
let cachedAt = 0
const TTL_MS = 60_000

export async function getActiveCategorySlugs(): Promise<string[]> {
  const now = Date.now()
  if (now - cachedAt < TTL_MS && cachedSlugs.length > 0) {
    return cachedSlugs
  }
  await connectMongoose()
  const cats = await ServiceCategory.find({ isActive: true }, 'slug').lean()
  cachedSlugs = cats.map((c: any) => c.slug)
  cachedAt = now
  if (cachedSlugs.length === 0) {
    // Fallback hardcoded to avoid blocking creation if DB is empty
    cachedSlugs = ['electricite', 'plomberie', 'menuiserie', 'peinture', 'climatisation', 'securite']
  }
  return cachedSlugs
}
