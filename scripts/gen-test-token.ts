/**
 * Génère un JWT de test pour les appels API mobiles.
 * Usage: tsx scripts/gen-test-token.ts [role]
 * Exemples:
 *   tsx scripts/gen-test-token.ts           -> rôle USER (consumer)
 *   tsx scripts/gen-test-token.ts ADMIN     -> rôle ADMIN
 *   tsx scripts/gen-test-token.ts PROVIDER  -> rôle prestataire
 */
import { SignJWT } from 'jose'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const role = (process.argv[2] || 'USER').toUpperCase()
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-local-jwt-secret-change-me-in-production')

;(async () => {
  const token = await new SignJWT({
    userId: `test-${role.toLowerCase()}-001`,
    role,
    email: `test-${role.toLowerCase()}@itvision.test`,
    username: `Test ${role}`,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  console.log('\n✅ JWT généré (valide 7 jours)')
  console.log('─────────────────────────────────────────')
  console.log(token)
  console.log('─────────────────────────────────────────')
  console.log(`\nUsage curl:\n  -H "Authorization: Bearer ${token.slice(0, 30)}..."\n`)
  console.log('Pour le mobile, mets dans mobile/consumer/.env:')
  console.log(`  EXPO_PUBLIC_AUTH_TOKEN=${token}\n`)
})()
