/**
 * Tests for Xeuy user creation — no MarketplaceProfile, referral, ProviderProfile.
 * Run: tsx tests/xeuy/test-user.ts
 */

import 'dotenv/config'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import MarketplaceProfile from '@/lib/models/MarketplaceProfile'
import ProviderProfile from '@/lib/models/ProviderProfile'
import { createXeuyUser, findXeuyUserByPhone, createXeuyReferralCode, validateXeuyReferralCode } from '@/modules/xeuy/services/user'
import { assert, assertEqual, assertNotNull, test, printSummary } from './helpers'

const TEST_PHONE_PREFIX = '+2217700002'

async function cleanupTestUsers() {
  const users = await User.find({ phone: new RegExp('^\\' + TEST_PHONE_PREFIX) }).lean()
  const userIds = users.map((u) => u._id)
  await Promise.all([
    User.deleteMany({ _id: { $in: userIds } }),
    MarketplaceProfile.deleteMany({ userId: { $in: userIds } }),
    ProviderProfile.deleteMany({ userId: { $in: userIds } }),
  ])
}

async function main() {
  console.log('\n=== Xeuy User Creation Tests ===\n')

  // Check DB availability
  try {
    await connectMongoose()
  } catch {
    console.log('  ⚠️  MongoDB not available — skipping all user tests\n')
    printSummary()
    return
  }

  await cleanupTestUsers()

  await test('createXeuyUser creates a CLIENT without MarketplaceProfile', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '00'
    const user = await createXeuyUser({ phone, name: 'Test Client', role: 'CLIENT' })

    assertNotNull(user._id, 'User should have an ID')
    assertEqual(user.role, 'CLIENT', 'Role should be CLIENT')
    assertEqual(user.phone, phone, 'Phone should match')
    assertEqual(user.isNew, true, 'Should be marked as new')
    assert(!user.providerProfileId, 'CLIENT should not have providerProfileId')

    // Verify no MarketplaceProfile was created
    const mp = await MarketplaceProfile.findOne({ userId: user._id })
    assert(mp === null, 'No MarketplaceProfile should exist for Xeuy user')

    // Verify User exists in DB
    const dbUser = await User.findById(user._id).lean()
    assertNotNull(dbUser, 'User should exist in DB')
    assertEqual(dbUser.role, 'CLIENT', 'DB role should be CLIENT')
    assert(!dbUser.marketplaceProfileId, 'User should not have marketplaceProfileId')
  })

  await test('createXeuyUser creates a PROVIDER with ProviderProfile', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '01'
    const user = await createXeuyUser({ phone, name: 'Test Provider', role: 'PROVIDER' })

    assertEqual(user.role, 'PROVIDER', 'Role should be PROVIDER')
    assertNotNull(user.providerProfileId, 'PROVIDER should have providerProfileId')

    // Verify ProviderProfile exists
    const pp = await ProviderProfile.findById(user.providerProfileId).lean()
    assertNotNull(pp, 'ProviderProfile should exist in DB')
    assertEqual(String(pp.userId), user._id, 'ProviderProfile userId should match')
    assertEqual(pp.kycVerified, false, 'KYC should not be verified by default')

    // Verify no MarketplaceProfile
    const mp = await MarketplaceProfile.findOne({ userId: user._id })
    assert(mp === null, 'No MarketplaceProfile should exist for Xeuy PROVIDER')

    // Verify User has providerProfileId set
    const dbUser = await User.findById(user._id).lean() as any
    assertNotNull(dbUser.providerProfileId, 'User should have providerProfileId in DB')
  })

  await test('createXeuyUser generates a unique referral code', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '02'
    const user = await createXeuyUser({ phone, name: 'Test Ref', role: 'CLIENT' })

    assertNotNull(user.referralCode, 'User should have a referral code')
    assert(user.referralCode.length === 6, 'Referral code should be 6 chars')

    // Verify uniqueness — no other user with same code
    const duplicate = await User.findOne({ referralCode: user.referralCode, _id: { $ne: user._id } })
    assert(duplicate === null, 'Referral code should be unique')
  })

  await test('createXeuyUser with valid referral code links referrer', async () => {
    await connectMongoose()
    // Create referrer first
    const referrerPhone = TEST_PHONE_PREFIX + '03'
    const referrer = await createXeuyUser({ phone: referrerPhone, name: 'Referrer', role: 'CLIENT' })

    // Create referred user
    const referredPhone = TEST_PHONE_PREFIX + '04'
    const referred = await createXeuyUser({
      phone: referredPhone,
      name: 'Referred',
      role: 'CLIENT',
      referralCode: referrer.referralCode,
    })

    assertNotNull(referred.referredBy, 'Referred user should have referredBy set')
    assertEqual(referred.referredBy, referrer.referralCode, 'referredBy should match referrer code')

    // Verify referrer's referralCount was incremented
    const referrerDb = await User.findById(referrer._id).lean() as any
    assertEqual(referrerDb.referralCount, 1, 'Referrer count should be 1')
  })

  await test('createXeuyUser with invalid referral code does not crash', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '05'
    const user = await createXeuyUser({
      phone,
      name: 'Test Bad Ref',
      role: 'CLIENT',
      referralCode: 'INVALID',
    })

    assertNotNull(user._id, 'User should still be created')
    assert(!user.referredBy, 'referredBy should not be set for invalid code')
  })

  await test('findXeuyUserByPhone returns existing user', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '06'
    await createXeuyUser({ phone, name: 'Find Me', role: 'CLIENT' })

    const found = await findXeuyUserByPhone(phone)
    assertNotNull(found, 'User should be found')
    assertEqual(found.phone, phone, 'Phone should match')
    assertEqual(found.name, 'Find Me', 'Name should match')
    assertEqual(found.role, 'CLIENT', 'Role should match')
  })

  await test('findXeuyUserByPhone returns null for non-existent phone', async () => {
    await connectMongoose()
    const found = await findXeuyUserByPhone('+221999999999')
    assert(found === null, 'Should return null for non-existent user')
  })

  await test('createXeuyReferralCode generates unique codes', async () => {
    await connectMongoose()
    const code1 = await createXeuyReferralCode()
    const code2 = await createXeuyReferralCode()
    assert(code1 !== code2, 'Two consecutive codes should be different (extremely likely)')
    assert(code1.length === 6, 'Code should be 6 chars')
  })

  await test('validateXeuyReferralCode returns referrer for valid code', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '07'
    const user = await createXeuyUser({ phone, name: 'Validate Ref', role: 'CLIENT' })

    const referrer = await validateXeuyReferralCode(user.referralCode!)
    assertNotNull(referrer, 'Referrer should be found')
    assertEqual(referrer.userId, user._id, 'Referrer userId should match')
  })

  await test('validateXeuyReferralCode returns null for invalid code', async () => {
    const result = await validateXeuyReferralCode('NOCODE')
    assert(result === null, 'Should return null for non-existent code')
  })

  await test('createXeuyUser email uses @xeuy.bi domain', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '08'
    const user = await createXeuyUser({ phone, name: 'Email Test', role: 'CLIENT' })

    const dbUser = await User.findById(user._id).lean() as any
    assertNotNull(dbUser.email, 'User should have email')
    assert(
      (dbUser.email as string).endsWith('@xeuy.bi'),
      `Email should end with @xeuy.bi, got: ${dbUser.email}`
    )
  })

  await cleanupTestUsers()
  printSummary()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
