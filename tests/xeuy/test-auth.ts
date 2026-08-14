/**
 * Tests for Xeuy auth module — JWT sign/verify, token isolation, OTP logic.
 * Run: tsx tests/xeuy/test-auth.ts
 */

import 'dotenv/config'
import { signXeuyToken, verifyXeuyToken } from '@/modules/xeuy/auth/session'
import { sendXeuyOtp, verifyXeuyOtp } from '@/modules/xeuy/auth/otp'
import { connectMongoose } from '@/lib/mongoose'
import OtpCode from '@/lib/models/OtpCode'
import { signAuthTokenWithExpiry } from '@/lib/jwt'
import { assert, assertEqual, assertNotNull, test, printSummary } from './helpers'

async function isDbAvailable(): Promise<boolean> {
  try {
    await connectMongoose()
    return true
  } catch {
    console.log('  ⚠️  MongoDB not available — skipping DB-dependent tests\n')
    return false
  }
}

async function main() {
  console.log('\n=== Xeuy Auth Module Tests ===\n')

  // ─── JWT Tests (pure, no DB) ──────────────────────────────

  await test('signXeuyToken produces a valid token with domain=xeuy', async () => {
    const token = await signXeuyToken({
      userId: 'test-user-1',
      role: 'CLIENT',
      phone: '+221771234567',
      name: 'Test Client',
    })
    assertNotNull(token, 'Token should not be null')
    assert(token.split('.').length === 3, 'Token should be a valid JWT (3 parts)')

    const session = await verifyXeuyToken(token)
    assertEqual(session.userId, 'test-user-1', 'userId should match')
    assertEqual(session.role, 'CLIENT', 'role should match')
    assertEqual(session.phone, '+221771234567', 'phone should match')
    assertEqual(session.name, 'Test Client', 'name should match')
    assertEqual(session.domain, 'xeuy', 'domain should be xeuy')
  })

  await test('signXeuyToken with PROVIDER role', async () => {
    const token = await signXeuyToken({
      userId: 'test-provider-1',
      role: 'PROVIDER',
      phone: '+221771234568',
      name: 'Test Provider',
    })
    const session = await verifyXeuyToken(token)
    assertEqual(session.role, 'PROVIDER', 'role should be PROVIDER')
  })

  await test('verifyXeuyToken rejects a web token (no domain=xeuy)', async () => {
    const webToken = await signAuthTokenWithExpiry(
      { userId: 'web-user', role: 'CLIENT', email: 'web@test.com' },
      '1h'
    )
    let threw = false
    try {
      await verifyXeuyToken(webToken)
    } catch (err) {
      threw = true
      assert(
        (err as Error).message.includes('non-Xeuy') || (err as Error).message.includes('invalide'),
        `Error should mention non-Xeuy, got: ${(err as Error).message}`
      )
    }
    assert(threw, 'verifyXeuyToken should throw for web tokens')
  })

  await test('verifyXeuyToken rejects a tampered token', async () => {
    const token = await signXeuyToken({
      userId: 'test-user-2',
      role: 'CLIENT',
      phone: '+221771234569',
      name: 'Test',
    })
    const tampered = token.slice(0, -5) + 'XXXXX'
    let threw = false
    try {
      await verifyXeuyToken(tampered)
    } catch {
      threw = true
    }
    assert(threw, 'Should throw for tampered token')
  })

  await test('verifyXeuyToken rejects token with invalid role (ADMIN)', async () => {
    const { SignJWT } = await import('jose')
    const { getJwtSecretKey } = await import('@/lib/jwt-secret')
    const maliciousToken = await new SignJWT({
      userId: 'hacker',
      role: 'ADMIN',
      phone: '+221000000000',
      name: 'Hacker',
      domain: 'xeuy',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getJwtSecretKey())

    let threw = false
    try {
      await verifyXeuyToken(maliciousToken)
    } catch (err) {
      threw = true
      assert((err as Error).message.includes('Rôle'), `Should mention invalid role, got: ${(err as Error).message}`)
    }
    assert(threw, 'Should reject ADMIN role in Xeuy token')
  })

  await test('verifyXeuyToken rejects token with SUPER_ADMIN role', async () => {
    const { SignJWT } = await import('jose')
    const { getJwtSecretKey } = await import('@/lib/jwt-secret')
    const maliciousToken = await new SignJWT({
      userId: 'hacker2',
      role: 'SUPER_ADMIN',
      phone: '+221000000001',
      name: 'Hacker',
      domain: 'xeuy',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getJwtSecretKey())

    let threw = false
    try {
      await verifyXeuyToken(maliciousToken)
    } catch (err) {
      threw = true
      assert((err as Error).message.includes('Rôle'), `Should mention invalid role, got: ${(err as Error).message}`)
    }
    assert(threw, 'Should reject SUPER_ADMIN role in Xeuy token')
  })

  await test('verifyXeuyToken rejects expired token', async () => {
    const { SignJWT } = await import('jose')
    const { getJwtSecretKey } = await import('@/lib/jwt-secret')
    const expiredToken = await new SignJWT({
      userId: 'expired-user',
      role: 'CLIENT',
      phone: '+221000000002',
      name: 'Expired',
      domain: 'xeuy',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('0s')
      .sign(getJwtSecretKey())

    await new Promise((r) => setTimeout(r, 100))

    let threw = false
    try {
      await verifyXeuyToken(expiredToken)
    } catch {
      threw = true
    }
    assert(threw, 'Should reject expired token')
  })

  await test('verifyXeuyToken rejects token without domain claim', async () => {
    const { SignJWT } = await import('jose')
    const { getJwtSecretKey } = await import('@/lib/jwt-secret')
    const noDomainToken = await new SignJWT({
      userId: 'no-domain-user',
      role: 'CLIENT',
      phone: '+221000000003',
      name: 'No Domain',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getJwtSecretKey())

    let threw = false
    try {
      await verifyXeuyToken(noDomainToken)
    } catch (err) {
      threw = true
      assert(
        (err as Error).message.includes('non-Xeuy') || (err as Error).message.includes('invalide'),
        `Should mention non-Xeuy, got: ${(err as Error).message}`
      )
    }
    assert(threw, 'Should reject token without domain=xeuy')
  })

  // ─── OTP Tests (require DB) ────────────────────────────────

  const dbOk = await isDbAvailable()

  if (dbOk) {
    await test('sendXeuyOtp creates an OTP record in DB', async () => {
      const phone = '+221770000100'
      await OtpCode.deleteMany({ phone })

      const result = await sendXeuyOtp(phone, 'CLIENT')
      assert(result.success, 'sendXeuyOtp should succeed')
      assertEqual(result.phone, phone, 'Phone should match')

      const otp = await OtpCode.findOne({ phone, verified: false }).sort({ createdAt: -1 })
      assertNotNull(otp, 'OTP should exist in DB')
      assert(otp.code.length === 6, 'OTP code should be 6 digits')
      assert(otp.expiresAt > new Date(), 'OTP should not be expired')
      assertEqual(otp.role, 'CLIENT', 'OTP role should be CLIENT')
    })

    await test('sendXeuyOtp rejects invalid phone', async () => {
      const result = await sendXeuyOtp('invalid-phone', 'CLIENT')
      assert(!result.success, 'Should fail for invalid phone')
      assertEqual(result.status, 400, 'Should return 400')
    })

    await test('verifyXeuyOtp succeeds with correct code', async () => {
      const phone = '+221770000101'
      await OtpCode.deleteMany({ phone })

      const sendResult = await sendXeuyOtp(phone, 'PROVIDER')
      assert(sendResult.success, 'Send should succeed')
      assertNotNull(sendResult.devCode, 'devCode should be present in free mode')

      const verifyResult = await verifyXeuyOtp(phone, sendResult.devCode!)
      assert(verifyResult.success, 'Verify should succeed')
      assert(verifyResult.otpVerified === true, 'OTP should be marked verified')

      const otp = await OtpCode.findOne({ phone }).sort({ createdAt: -1 })
      assertNotNull(otp, 'OTP should exist')
      assertEqual(otp.verified, true, 'OTP should be verified in DB')
    })

    await test('verifyXeuyOtp fails with wrong code', async () => {
      const phone = '+221770000102'
      await OtpCode.deleteMany({ phone })

      const sendResult = await sendXeuyOtp(phone, 'CLIENT')
      assert(sendResult.success, 'Send should succeed')

      const verifyResult = await verifyXeuyOtp(phone, '000001')
      assert(!verifyResult.success, 'Verify should fail')
      assertEqual(verifyResult.status, 401, 'Should return 401')
    })

    await test('verifyXeuyOtp fails with expired code', async () => {
      const phone = '+221770000103'
      await OtpCode.deleteMany({ phone })

      await OtpCode.create({
        phone,
        code: '123456',
        role: 'CLIENT',
        expiresAt: new Date(Date.now() - 1000),
        verified: false,
      })

      const result = await verifyXeuyOtp(phone, '123456')
      assert(!result.success, 'Should fail for expired OTP')
      assertEqual(result.status, 410, 'Should return 410 Gone')
    })

    await test('verifyXeuyOtp enforces max attempts', async () => {
      const phone = '+221770000104'
      await OtpCode.deleteMany({ phone })

      const sendResult = await sendXeuyOtp(phone, 'CLIENT')
      assert(sendResult.success, 'Send should succeed')

      for (let i = 0; i < 5; i++) {
        await verifyXeuyOtp(phone, '000001')
      }

      const result = await verifyXeuyOtp(phone, '000001')
      assert(!result.success, 'Should fail after max attempts')
      assertEqual(result.status, 429, 'Should return 429 Too Many Requests')
    })

    // Cleanup
    await OtpCode.deleteMany({ phone: /^\+2217700001/ })
  }

  printSummary()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
