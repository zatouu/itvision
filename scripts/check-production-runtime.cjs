const assert = require('node:assert/strict')
const fs = require('node:fs')

async function main() {
  for (const dependency of ['next', 'socket.io', 'jose', 'mongoose', 'ioredis', '@sentry/nextjs', '@prisma/client']) {
    require.resolve(dependency)
  }
  assert(/require\('socket.io'\)/.test(fs.readFileSync('server.js', 'utf8')), 'Serveur Socket.io absent')
  assert(fs.existsSync('.next/BUILD_ID'), 'Build Next absente')
  assert(fs.existsSync('.ops/production-preflight.cjs'), 'Precontrole absent')
  assert(fs.existsSync('.ops/migrate-shipping-costs.cjs'), 'Migration absente')
  assert.equal(typeof require('../.ops/dispatch.cjs').enqueueDispatch, 'function', 'Dispatch Xeuy absent')
  assert.equal(typeof require('@prisma/client').PrismaClient, 'function', 'Client Prisma non genere')
  if (process.argv.includes('--files-only')) {
    console.log('Fichiers et dependances de production : OK')
    return
  }
  const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
  const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(10000) })
  assert(response.ok, `Healthcheck HTTP ${response.status}`)
  const endpoint = `${base}/socket.io/?EIO=4&transport=polling`
  const handshake = await fetch(endpoint, { signal: AbortSignal.timeout(10000) })
  const packet = await handshake.text()
  assert(handshake.ok && packet.startsWith('0{'), 'Handshake Engine.IO absent')
  const session = JSON.parse(packet.slice(1))
  assert(typeof session.sid === 'string' && session.sid.length > 0, 'Session Engine.IO absente')
  await fetch(`${endpoint}&sid=${encodeURIComponent(session.sid)}`, {
    method: 'POST', body: '1', headers: { 'Content-Type': 'text/plain' }, signal: AbortSignal.timeout(5000),
  })
  console.log('Runtime Next et handshake Socket.io : OK')
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })