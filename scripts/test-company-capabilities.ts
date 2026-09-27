/**
 * Tests unitaires des capacités portail entreprise (companyRole ∩ permissions).
 * Usage : npm run test:capabilities
 *
 * Vérifie la règle unique utilisée à la fois par l'API
 * (requireCompanyCapability) et par les pages (sessionCan) :
 * - rôle interne entreprise (owner/admin/finance/technical/viewer)
 * - interrupteurs admin Client.permissions (canAccessPortal / canViewReports /
 *   canRequestMaintenance) qui priment toujours sur le rôle
 * - défauts permissifs pour les comptes historiques sans companyRole/permissions
 */
import {
  companyCapabilities,
  companyPermissionsOf,
  companyRoleOf,
  canCompany,
  requireCompanyCapability,
  DEFAULT_COMPANY_PERMISSIONS,
  type UserAccess,
  type CompanyCapability,
} from '@/lib/domain-access'

let failures = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`)
  } else {
    failures++
    console.error(`  ✗ ${label}`)
  }
}

function makeAccess(overrides: Partial<UserAccess> = {}): UserAccess {
  return {
    userId: 'u1',
    role: 'CLIENT',
    profiles: { companyClientId: 'c1' },
    isStaff: false,
    isAdmin: false,
    ...overrides,
  }
}

const ALL: CompanyCapability[] = [
  'portal:access', 'reports:view', 'finance:view', 'quotes:respond',
  'maintenance:request', 'tickets:write', 'sourcing:request', 'interventions:ack',
  'interventions:feedback', 'company:manage', 'team:manage',
]

console.log('\n— Rôle propriétaire (défaut) —')
{
  const access = makeAccess()
  assert(companyRoleOf(access) === 'owner', 'companyRole absent → owner')
  assert(companyCapabilities(access).size === ALL.length, 'owner = toutes les capacités')
}

console.log('\n— Rôle lecture seule (viewer) —')
{
  const access = makeAccess({ companyRole: 'viewer' })
  assert(canCompany(access, 'portal:access'), 'viewer peut accéder au portail')
  assert(canCompany(access, 'finance:view'), 'viewer peut consulter les finances')
  assert(!canCompany(access, 'quotes:respond'), 'viewer ne peut PAS répondre à un devis')
  assert(!canCompany(access, 'maintenance:request'), 'viewer ne peut PAS demander une intervention')
  assert(!canCompany(access, 'tickets:write'), 'viewer ne peut PAS écrire de ticket')
  assert(!canCompany(access, 'team:manage'), 'viewer ne peut PAS gérer l’équipe')
  assert(!canCompany(access, 'company:manage'), 'viewer ne peut PAS éditer la fiche société')
  assert(!canCompany(access, 'sourcing:request'), 'viewer ne peut PAS lancer une demande de sourcing')
}

console.log('\n— Rôle finance —')
{
  const access = makeAccess({ companyRole: 'finance' })
  assert(canCompany(access, 'quotes:respond'), 'finance peut répondre à un devis')
  assert(canCompany(access, 'finance:view'), 'finance peut exporter la comptabilité')
  assert(!canCompany(access, 'maintenance:request'), 'finance ne demande pas d’intervention')
  assert(!canCompany(access, 'interventions:ack'), 'finance ne signe pas les accusés de réception')
  assert(!canCompany(access, 'company:manage'), 'finance n’édite pas la fiche société')
}

console.log('\n— Rôle technique —')
{
  const access = makeAccess({ companyRole: 'technical' })
  assert(canCompany(access, 'maintenance:request'), 'technical peut demander une intervention')
  assert(canCompany(access, 'interventions:ack'), 'technical peut accuser réception')
  assert(canCompany(access, 'tickets:write'), 'technical peut écrire un ticket')
  assert(!canCompany(access, 'quotes:respond'), 'technical ne peut PAS engager l’entreprise sur un devis')
  assert(!canCompany(access, 'finance:view'), 'technical n’a pas l’export comptable')
}

console.log('\n— Interrupteurs admin (Client.permissions) —')
{
  const noPortal = makeAccess({ companyRole: 'owner', companyPermissions: { ...DEFAULT_COMPANY_PERMISSIONS, canAccessPortal: false } })
  assert(companyCapabilities(noPortal).size === 0, 'canAccessPortal=false → aucune capacité (même owner)')

  const noReports = makeAccess({ companyRole: 'owner', companyPermissions: { ...DEFAULT_COMPANY_PERMISSIONS, canViewReports: false } })
  assert(!canCompany(noReports, 'reports:view'), 'canViewReports=false → pas de rapports')
  assert(canCompany(noReports, 'quotes:respond'), 'les autres capacités restent intactes')

  const noMaintenance = makeAccess({ companyRole: 'technical', companyPermissions: { ...DEFAULT_COMPANY_PERMISSIONS, canRequestMaintenance: false } })
  assert(!canCompany(noMaintenance, 'maintenance:request'), 'canRequestMaintenance=false prime sur le rôle technique')

  const partial = makeAccess({ companyPermissions: { canViewReports: true, canRequestMaintenance: false, canAccessPortal: true } })
  assert(companyPermissionsOf(partial).canAccessPortal, 'défauts permissifs sur les champs absents')
}

console.log('\n— Garde API (requireCompanyCapability) —')
{
  const viewer = makeAccess({ companyRole: 'viewer' })
  const denied = requireCompanyCapability(viewer, 'quotes:respond')
  assert(denied !== null && denied.status === 403, 'viewer → 403 sur quotes:respond')
  assert(requireCompanyCapability(viewer, 'finance:view') === null, 'viewer → autorisé en lecture')

  const admin = makeAccess({ role: 'ADMIN', isAdmin: true, isStaff: true })
  assert(requireCompanyCapability(admin, 'quotes:respond') === null, 'admin (preview) → jamais bloqué')

  const unknownRole = makeAccess({ companyRole: 'mystere' })
  assert(companyRoleOf(unknownRole) === 'owner', 'rôle inconnu → owner (comptes historiques)')
}

console.log(`\n${failures === 0 ? '✔' : '✗'} ${failures} échec(s)`)
if (failures > 0) process.exit(1)
