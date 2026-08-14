export type UserCategory = 'MARKETPLACE_CLIENT' | 'ENTERPRISE_CLIENT' | 'PLATFORM_USER' | 'XEUY_PROVIDER' | 'XEUY_CLIENT'

type UserCategoryInput = {
  role?: string | null
  companyClientId?: unknown
  providerProfileId?: unknown
}

export function resolveUserCategory({ role, companyClientId, providerProfileId }: UserCategoryInput): UserCategory {
  const normalizedRole = String(role || '').toUpperCase()
  const hasEnterpriseLink = !!companyClientId
  const hasProviderProfile = !!providerProfileId

  if (normalizedRole === 'PROVIDER' || hasProviderProfile) {
    return 'XEUY_PROVIDER'
  }

  if (normalizedRole === 'CLIENT') {
    return hasEnterpriseLink ? 'ENTERPRISE_CLIENT' : 'MARKETPLACE_CLIENT'
  }

  if (normalizedRole === 'TECHNICIAN') {
    return 'ENTERPRISE_CLIENT'
  }

  return 'PLATFORM_USER'
}

export function getUserCategoryLabel(category: UserCategory): string {
  if (category === 'ENTERPRISE_CLIENT') return 'Client entreprise'
  if (category === 'MARKETPLACE_CLIENT') return 'Client marketplace'
  if (category === 'XEUY_PROVIDER') return 'Prestataire Xeuy Bi'
  if (category === 'XEUY_CLIENT') return 'Client Xeuy Bi'
  return 'Utilisateur plateforme'
}

export function getUserCategoryEntity(category: UserCategory): 'corporate' | 'marketplace' | 'xeuybi' | 'platform' {
  if (category === 'ENTERPRISE_CLIENT') return 'corporate'
  if (category === 'MARKETPLACE_CLIENT') return 'marketplace'
  if (category === 'XEUY_PROVIDER' || category === 'XEUY_CLIENT') return 'xeuybi'
  return 'platform'
}
