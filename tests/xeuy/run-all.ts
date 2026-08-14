/**
 * Master test runner for all Xeuy module tests.
 * Run: tsx tests/xeuy/run-all.ts
 */

import { execSync } from 'child_process'
import * as path from 'path'

const tests = [
  'test-auth.ts',
  'test-user.ts',
  'test-wallet.ts',
]

let totalFailed = 0

for (const testFile of tests) {
  const fullPath = path.join(__dirname, testFile)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running ${testFile}...`)
  console.log('='.repeat(60))

  try {
    execSync(`node "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js" exec -- tsx "${fullPath}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    })
  } catch (err) {
    totalFailed++
    console.error(`❌ ${testFile} failed`)
  }
}

console.log(`\n${'='.repeat(60)}`)
if (totalFailed === 0) {
  console.log('✅ All test suites passed!')
} else {
  console.log(`❌ ${totalFailed} test suite(s) failed`)
}
process.exit(totalFailed > 0 ? 1 : 0)
