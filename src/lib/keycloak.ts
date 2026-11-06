import { JWTPayload, jwtVerify, createRemoteJWKSet } from 'jose'

// Minimal Keycloak integration helpers (disabled by default unless KEYCLOAK_ENABLED=true)
// Env vars expected when enabled:
// - KEYCLOAK_ENABLED=true
// - KEYCLOAK_ISSUER=https://keycloak.example.com/realms/your-realm
// - KEYCLOAK_JWKS=https://keycloak.example.com/realms/your-realm/protocol/openid-connect/certs
// - KEYCLOAK_CLIENT_ID=your-client-id (optional check)

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function isKeycloakEnabled(): boolean {
  return String(process.env.KEYCLOAK_ENABLED || '').toLowerCase() === 'true'
}

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const url = process.env.KEYCLOAK_JWKS
    if (!url) throw new Error('KEYCLOAK_JWKS non configuré')
    jwks = createRemoteJWKSet(new URL(url))
  }
  return jwks
}

export async function verifyKeycloakToken(token: string): Promise<{
  sub: string
  email?: string
  name?: string
  roles: string[]
  payload: JWTPayload
}> {
  if (!isKeycloakEnabled()) throw new Error('Keycloak désactivé')
  const issuer = process.env.KEYCLOAK_ISSUER
  const clientId = process.env.KEYCLOAK_CLIENT_ID

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: issuer || undefined,
    audience: clientId || undefined
  })

  const sub = String(payload.sub || payload.sid || payload.preferred_username || '')
  const email = typeof payload.email === 'string' ? payload.email : undefined
  const name = typeof (payload as any).name === 'string' ? (payload as any).name : undefined

  // Roles: realm_access.roles + resource_access[clientId].roles
  const roles: string[] = []
  const realm = (payload as any).realm_access?.roles
  if (Array.isArray(realm)) roles.push(...realm)
  const resource = (payload as any).resource_access
  if (resource && clientId && Array.isArray(resource[clientId]?.roles)) {
    roles.push(...resource[clientId].roles)
  }

  return { sub, email, name, roles, payload }
}

export function mapKeycloakRolesToAppRole(roles: string[]): string {
  const s = new Set(roles.map(r => String(r).toUpperCase()))
  if (s.has('SUPER_ADMIN') || s.has('PLATFORM_SUPER_ADMIN')) return 'SUPER_ADMIN'
  if (s.has('ADMIN') || s.has('PLATFORM_ADMIN')) return 'ADMIN'
  if (s.has('TECHNICIAN') || s.has('PROVIDER')) return 'TECHNICIAN'
  return 'USER'
}

export function keycloakEnabled() {
  return isKeycloakEnabled()
}
