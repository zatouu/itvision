import { defineConfig, devices } from '@playwright/test'

const baseURL = `http://127.0.0.1:${process.env.STOREFRONT_UI_PORT || 3100}`

export default defineConfig({
  testDir: './tests/marketplace',
  testMatch: 'storefront-ui.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/storefront-ui',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx tsx scripts/test-storefront-server.ts',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})