/**
 * Mini test runner for standalone tsx tests.
 * Usage: tsx tests/xeuy/test-auth.ts
 */

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`)
  }
}

export function assertNotNull<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message} (value is null/undefined)`)
  }
}

export async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log(`  ✅ ${name}`)
  } catch (err) {
    const error = err as Error
    results.push({ name, passed: false, error: error.message })
    console.log(`  ❌ ${name}`)
    console.log(`     ${error.message}`)
  }
}

export function printSummary(): void {
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`)
  if (failed > 0) {
    console.log(`\nFailed tests:`)
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ❌ ${r.name}: ${r.error}`)
    })
  }
  process.exit(failed > 0 ? 1 : 0)
}
