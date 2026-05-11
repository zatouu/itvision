import { test as setup, request } from '@playwright/test'
import { ensureTestUsers } from './helpers/db'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const AUTH_DIR = 'tests/.auth'

const TEST_CREDENTIALS = {
  admin: { email: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@itvision.sn', password: process.env.E2E_ADMIN_PASSWORD || 'test123' },
  client: { email: process.env.E2E_CLIENT_EMAIL || 'e2e-client@itvision.sn', password: process.env.E2E_CLIENT_PASSWORD || 'test123' },
  tech: { email: process.env.E2E_TECH_EMAIL || 'e2e-tech@itvision.sn', password: process.env.E2E_TECH_PASSWORD || 'test123' }
}

async function loginAndSave(email: string, password: string, storagePath: string) {
  const ctx = await request.newContext({ baseURL })

  const res = await ctx.post('/api/auth/login', {
    data: { email, password }
  })

  if (!res.ok()) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Login failed for ${email}: ${res.status()} ${JSON.stringify(body)}`)
  }

  await ctx.storageState({ path: storagePath })
  await ctx.dispose()
}

setup('create test users and login sessions', async () => {
  const isRemote = !!process.env.PLAYWRIGHT_BASE_URL

  if (!isRemote) {
    // Mode local : créer les utilisateurs en DB puis login
    const users = await ensureTestUsers()
    await Promise.all([
      loginAndSave(users.admin.email, users.admin.password, `${AUTH_DIR}/admin.json`),
      loginAndSave(users.client.email, users.client.password, `${AUTH_DIR}/client.json`),
      loginAndSave(users.tech.email, users.tech.password, `${AUTH_DIR}/tech.json`)
    ])
  } else {
    // Mode distant : login avec les credentials existants sur le déploiement
    // Prérequis : les users doivent exister sur le déploiement (créés manuellement ou via seed)
    await Promise.all([
      loginAndSave(TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password, `${AUTH_DIR}/admin.json`),
      loginAndSave(TEST_CREDENTIALS.client.email, TEST_CREDENTIALS.client.password, `${AUTH_DIR}/client.json`),
      loginAndSave(TEST_CREDENTIALS.tech.email, TEST_CREDENTIALS.tech.password, `${AUTH_DIR}/tech.json`)
    ])
  }

  console.log('[E2E] Auth sessions created for admin, client, tech')
})
