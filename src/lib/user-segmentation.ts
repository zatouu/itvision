export type UserCategory = 'MARKETPLACE_CLIENT' | 'ENTERPRISE_CLIENT' | 'PLATFORM_USER'

type UserCategoryInput = {
  role?: string | null
  companyClientId?: unknown
}

export function resolveUserCategory({ role, companyClientId }: UserCategoryInput): UserCategory {
  const normalizedRole = String(role || '').toUpperCase()
  const hasEnterpriseLink = !!companyClientId

  if (normalizedRole === 'CLIENT') {
    return hasEnterpriseLink ? 'ENTERPRISE_CLIENT' : 'MARKETPLACE_CLIENT'
  }

  return 'PLATFORM_USER'
}

export function getUserCategoryLabel(category: UserCategory): string {
  if (category === 'ENTERPRISE_CLIENT') return 'Client entreprise'
  if (category === 'MARKETPLACE_CLIENT') return 'Client marketplace'
  return 'Utilisateur plateforme'
}
