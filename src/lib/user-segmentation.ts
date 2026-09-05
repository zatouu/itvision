export type UserCategory = 'MARKETPLACE_CLIENT' | 'ENTERPRISE_CLIENT' | 'PLATFORM_USER' | 'XEUY_PROVIDER' | 'XEUY_CLIENT'

type UserCategoryInput = {
  role?: string | null
  companyClientId?: unknown
  providerProfileId?: unknown
  email?: string | null
  username?: string | null
}

/**
 * Marqueur des comptes créés par l'app mobile Xeuy Bi :
 * email synthétique `<phone>@xeuy.bi` ou username `mobile_<phone>`.
 * Ces comptes seront migrés vers la branche dédiée Xeuy.
 */
export function isXeuyMobileAccount(email?: string | null, username?: string | null): boolean {
  return /@xeuy\.bi$/i.test(String(email || '')) || String(username || '').startsWith('mobile_')
}

export function resolveUserCategory({ role, companyClientId, providerProfileId, email, username }: UserCategoryInput): UserCategory {
  const normalizedRole = String(role || '').toUpperCase()
  const hasEnterpriseLink = !!companyClientId
  const hasProviderProfile = !!providerProfileId

  if (normalizedRole === 'PROVIDER' || hasProviderProfile) {
    return 'XEUY_PROVIDER'
  }

  if (normalizedRole === 'CLIENT') {
    if (isXeuyMobileAccount(email, username)) return 'XEUY_CLIENT'
    return hasEnterpriseLink ? 'ENTERPRISE_CLIENT' : 'MARKETPLACE_CLIENT'
  }

  // ADMIN, SUPER_ADMIN, TECHNICIAN, ACCOUNTANT, SUPPORT, etc. = staff plateforme
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
