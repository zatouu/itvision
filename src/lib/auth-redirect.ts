/**
 * Redirection post-connexion — source unique.
 * Le front n'a plus besoin de choisir un « type de compte » : le rôle
 * du JWT détermine la destination. Utilisée par /api/auth/login et
 * /api/auth/2fa/verify.
 */
export function getPostLoginRedirect(role: string, companyClientId?: string): string {
  switch (String(role || '').toUpperCase()) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin'
    case 'PRODUCT_MANAGER':
      return '/admin/produits'
    case 'ACCOUNTANT':
      return '/admin/comptabilite'
    case 'TECHNICIAN':
      return '/tech-interface'
    case 'VENDOR':
      return '/espace-vendeur'
    case 'CLIENT':
      return companyClientId ? '/portail-entreprise' : '/compte'
    default:
      return '/compte'
  }
}
