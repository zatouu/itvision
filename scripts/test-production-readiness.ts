import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { buildSync } from 'esbuild'
import { Types } from 'mongoose'
import AuditLog from '../src/lib/models/AuditLog'
import { ATTACHMENT_TYPES, createThreadMessageModel } from '../src/lib/messaging/thread-message-schema'

async function main() {
  const audit = new AuditLog({ entityType: 'Payment', entityId: new Types.ObjectId(), action: 'refund_approved' })
  assert.equal(audit.validateSync(), undefined)
  audit.entityType = 'InvalidEntity'
  assert(audit.validateSync()?.errors.entityType)

  const Message = createThreadMessageModel('ProductionReadinessMessage', 'shared')
  const messageFields = { threadType: 'conversation', threadId: 'test-thread', senderRole: 'CLIENT' }
  for (const type of ATTACHMENT_TYPES) {
    const message = new Message({ ...messageFields, attachments: [{ type, url: '/uploads/test', size: 42 }] })
    assert.equal(message.validateSync(), undefined)
    assert.equal(message.toObject().attachments[0].type, type)
    assert.equal(Object.hasOwn(message.toObject().attachments[0], '_id'), false)
  }
  assert(new Message({ ...messageFields, attachments: [{ type: 'invalid', url: '/test' }] }).validateSync())
  assert(new Message({ ...messageFields, attachments: [{ type: 'image' }] }).validateSync())
  assert(new Message(messageFields).validateSync())
  assert(new Message({ ...messageFields, threadType: 'mission', text: 'test' }).validateSync())

  const source = buildSync({
    entryPoints: ['scripts/production-preflight.ts'], bundle: true,
    platform: 'node', format: 'cjs', packages: 'external', write: false, logLevel: 'silent',
  }).outputFiles[0].text
  const loadModule = createRequire(resolve('package.json'))
  const configuredEnv = {
    MONGODB_URI: 'mongodb://unused.invalid/test', REDIS_URL: 'redis://unused.invalid',
    JWT_SECRET: 'test-only', NEXTAUTH_SECRET: 'test-only', CRON_SECRET: 'test-only',
  }
  const scenarios = [
    { name: 'configuration absente', env: {}, primary: true, connects: 0 },
    { name: 'secrets absents', env: { MONGODB_URI: configuredEnv.MONGODB_URI, REDIS_URL: configuredEnv.REDIS_URL }, primary: true, connects: 0 },
    { name: 'Mongo sans primaire', env: configuredEnv, primary: false, connects: 1 },
    { name: 'tarifs non migres', env: configuredEnv, primary: true, connects: 1 },
    { name: 'erreur de connexion masquee', env: configuredEnv, primary: true, connects: 1, connectionError: true },
  ]
  for (const scenario of scenarios) {
    let connections = 0
    let closes = 0
    const errors: string[] = []
    const childProcess = { env: scenario.env, exitCode: 0, cwd: () => process.cwd() }
    class MongoMock {
      async connect() {
        connections += 1
        if (scenario.connectionError) throw new Error('mongodb://secret-user:secret-password@unused.invalid')
      }
      db() {
        return {
          command: async () => ({ setName: 'rs0', isWritablePrimary: scenario.primary }),
          collection: () => ({ findOne: async () => null }),
        }
      }
      async close() { closes += 1 }
    }
    class RedisMock {
      on() {}
      async connect() { assert.fail('Redis ne doit pas etre appele avant validation Mongo et tarifs') }
      disconnect() {}
    }
    await runInNewContext(source, {
      require: (name: string) => name === 'mongodb' ? { MongoClient: MongoMock } : name === 'ioredis' ? RedisMock : loadModule(name),
      process: childProcess, global: {}, module: { exports: {} },
      console: { log() {}, error: (...values: unknown[]) => errors.push(values.join(' ')) },
    })
    assert.equal(childProcess.exitCode, 1, scenario.name)
    assert.equal(connections, scenario.connects, scenario.name)
    assert.equal(closes, scenario.connects, scenario.name)
    assert.equal(errors.length, 1, scenario.name)
    assert(!errors.join(' ').includes('secret-password'))
  }
  console.log('Readiness : audit Payment, pieces jointes et 5 refus de precontrole valides, sans connexion reseau.')
}

main().catch(error => { console.error(error); process.exitCode = 1 })