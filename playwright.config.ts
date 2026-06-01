import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright pour tests E2E du module maintenance.
 * Mode local (défaut) : démarre le serveur Next.js + MongoDB local.
 * Mode distant : pointe vers le déploiement en ligne.
 *
 * Exécution distante :
 *   PLAYWRIGHT_BASE_URL=https://itvisionplus.sn npm run test:e2e
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const isRemote = !!process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium-admin',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-client',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/client.json' },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-tech',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/tech.json' },
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'services-mobile',
      testMatch: /services\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: isRemote
    ? undefined
    : {
        command: 'npx next dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
