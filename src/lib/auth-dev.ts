export interface DevAuthUser {
  id: string
  userId: string
  role: string
  email: string
  name: string
  marketplaceTier: 'standard'
}

export function verifyDevToken(token: string): DevAuthUser | null {
  if (process.env.NODE_ENV !== 'development') return null

  if (process.env.DEV_MOBILE_TOKEN && token === process.env.DEV_MOBILE_TOKEN) {
    return {
      id: 'dev-mobile-user',
      userId: 'dev-mobile-user',
      role: 'CLIENT',
      email: 'dev@mobile',
      name: 'Dev Mobile',
      marketplaceTier: 'standard',
    }
  }

  if (process.env.DEV_PROVIDER_TOKEN && token === process.env.DEV_PROVIDER_TOKEN) {
    return {
      id: 'dev-provider-user',
      userId: 'dev-provider-user',
      role: 'PROVIDER',
      email: 'dev@provider',
      name: 'Dev Provider',
      marketplaceTier: 'standard',
    }
  }

  return null
}
