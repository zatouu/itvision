import Redis from 'ioredis'

const redisUrl =
  process.env.REDIS_URL || process.env.REDIS_URI || process.env.REDISCLOUD_URL

let redisClient: Redis | null = null

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient
  if (!redisUrl) return null

  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  })

  redisClient.on('error', (err) => {
    console.error('[redis] connection error', err.message)
  })

  return redisClient
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  const timeout = new Promise<false>((resolve) =>
    setTimeout(() => resolve(false), 300)
  )
  try {
    const pong = await Promise.race([client.ping(), timeout])
    return pong === 'PONG'
  } catch {
    return false
  }
}
