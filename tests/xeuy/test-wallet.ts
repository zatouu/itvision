/**
 * Tests for Xeuy wallet service — no MarketplaceProfile dependency.
 * Run: tsx tests/xeuy/test-wallet.ts
 */

import 'dotenv/config'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import MarketplaceProfile from '@/lib/models/MarketplaceProfile'
import ProviderProfile from '@/lib/models/ProviderProfile'
import WalletModel from '@/lib/models/Wallet'
import { createXeuyUser } from '@/modules/xeuy/services/user'
import { getXeuyWallet, getXeuyWalletHistory, getXeuyWalletConfig } from '@/modules/xeuy/services/wallet'
import { assert, assertEqual, assertNotNull, test, printSummary } from './helpers'

const TEST_PHONE_PREFIX = '+2217700003'

async function cleanupTestUsers() {
  const users = await User.find({ phone: new RegExp('^\\' + TEST_PHONE_PREFIX) }).lean()
  const userIds = users.map((u) => u._id)
  await Promise.all([
    User.deleteMany({ _id: { $in: userIds } }),
    MarketplaceProfile.deleteMany({ userId: { $in: userIds } }),
    ProviderProfile.deleteMany({ userId: { $in: userIds } }),
    WalletModel.deleteMany({ userId: { $in: userIds } }),
  ])
}

async function main() {
  console.log('\n=== Xeuy Wallet Service Tests ===\n')

  // Check DB availability
  try {
    await connectMongoose()
  } catch {
    console.log('  ⚠️  MongoDB not available — skipping all wallet tests\n')
    printSummary()
    return
  }

  await cleanupTestUsers()

  await test('getXeuyWallet returns wallet data without MarketplaceProfile', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '00'
    const user = await createXeuyUser({ phone, name: 'Wallet Test', role: 'CLIENT' })

    const wallet = await getXeuyWallet(user._id)

    assertEqual(wallet.points, 0, 'Initial points should be 0')
    assertEqual(wallet.cashBalance, 0, 'Initial cashBalance should be 0')
    assertEqual(wallet.escrow, 0, 'Initial escrow should be 0')
    assertEqual(wallet.referralCode, user.referralCode, 'Referral code should match user')
    assertEqual(wallet.referralBalance, 0, 'Initial referralBalance should be 0')
  })

  await test('getXeuyWallet works for PROVIDER users', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '01'
    const user = await createXeuyUser({ phone, name: 'Provider Wallet', role: 'PROVIDER' })

    const wallet = await getXeuyWallet(user._id)
    assertNotNull(wallet, 'Wallet should not be null')
    assertEqual(wallet.referralCode, user.referralCode, 'Referral code should match')
  })

  await test('getXeuyWallet throws for non-existent user', async () => {
    await connectMongoose()
    let threw = false
    try {
      await getXeuyWallet(new (await import('mongoose')).Types.ObjectId().toString())
    } catch (err) {
      threw = true
      assert((err as Error).message.includes('introuvable'), `Should mention user not found, got: ${(err as Error).message}`)
    }
    assert(threw, 'Should throw for non-existent user')
  })

  await test('getXeuyWallet reads referral data from User (not MarketplaceProfile)', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '02'
    const user = await createXeuyUser({ phone, name: 'Ref Wallet', role: 'CLIENT' })

    // Manually update User referral fields
    await User.findByIdAndUpdate(user._id, {
      $set: { referralBalance: 500, referralCount: 3 },
    })

    const wallet = await getXeuyWallet(user._id)
    assertEqual(wallet.referralBalance, 500, 'referralBalance should come from User')
    assertEqual(wallet.referralCount, 3, 'referralCount should come from User')
  })

  await test('getXeuyWalletHistory returns empty array for new user', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '03'
    const user = await createXeuyUser({ phone, name: 'History Test', role: 'CLIENT' })

    const history = await getXeuyWalletHistory(user._id)
    assert(Array.isArray(history), 'History should be an array')
    assertEqual(history.length, 0, 'New user should have empty history')
  })

  await test('getXeuyWalletConfig returns config with expected fields', async () => {
    await connectMongoose()
    const config = await getXeuyWalletConfig()

    assertNotNull(config.mode, 'Config should have mode')
    assert(typeof config.pointsActive === 'boolean', 'pointsActive should be boolean')
    assert(typeof config.escrowEnabled === 'boolean', 'escrowEnabled should be boolean')
    assert(typeof config.pointsPerWonMission === 'number', 'pointsPerWonMission should be number')
  })

  await test('getXeuyWallet creates wallet on first access (getOrCreateWallet)', async () => {
    await connectMongoose()
    const phone = TEST_PHONE_PREFIX + '04'
    const user = await createXeuyUser({ phone, name: 'Create Wallet', role: 'CLIENT' })

    // First access should create the wallet
    const wallet1 = await getXeuyWallet(user._id)
    assertEqual(wallet1.points, 0, 'First access: points should be 0')

    // Second access should return the same wallet
    const wallet2 = await getXeuyWallet(user._id)
    assertEqual(wallet2.points, wallet1.points, 'Second access should return same wallet')

    // Verify wallet exists in DB
    const dbWallet = await WalletModel.findOne({ userId: user._id }).lean()
    assertNotNull(dbWallet, 'Wallet should exist in DB after getXeuyWallet')
  })

  await cleanupTestUsers()
  printSummary()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
