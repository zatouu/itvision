#!/usr/bin/env node
/**
 * Publication OTA sûre : `npm run ota -- "message"` (canal ec2 par défaut, `--channel preview` sinon).
 *
 * `eas update` n'applique PAS le bloc `env` des profils de build d'eas.json : les variables
 * EXPO_PUBLIC_* ne viennent que du shell ou de mobile/app/.env. Un OTA publié sans elles fait
 * pointer l'app vers une mauvaise API, désactive Sentry et les cartes. Ce script :
 *   1. charge mobile/app/.env (le shell reste prioritaire) ;
 *   2. complète avec le bloc `env` du profil eas.json du même nom que le canal ;
 *   3. refuse de publier s'il manque une variable indispensable.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const appDir = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const channelIndex = args.indexOf('--channel')
const channel = channelIndex >= 0 ? args[channelIndex + 1] : 'ec2'
const message = args.filter((_, i) => channelIndex < 0 || (i !== channelIndex && i !== channelIndex + 1)).join(' ').trim()

if (!channel || !message) {
  console.error('Usage : npm run ota -- "Message de la mise à jour" [--channel ec2]')
  process.exit(1)
}

function readDotEnv(file) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || !m[2]) continue
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const easJson = JSON.parse(fs.readFileSync(path.join(appDir, 'eas.json'), 'utf8'))
const profileEnv = (easJson.build && easJson.build[channel] && easJson.build[channel].env) || {}
const env = { ...profileEnv, ...readDotEnv(path.join(appDir, '.env')) }
for (const [k, v] of Object.entries(process.env)) if (v) env[k] = v

const REQUIRED = {
  EXPO_PUBLIC_API_BASE_URL: "adresse de l'API (profil eas.json ou .env)",
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'clé Google Maps (sinon les cartes sont remplacées par un encart vide)',
}
const RECOMMENDED = {
  EXPO_PUBLIC_SENTRY_DSN: "DSN Sentry (sinon aucune erreur de l'app ne remonte)",
}

const missing = Object.entries(REQUIRED).filter(([k]) => !env[k])
if (missing.length) {
  console.error(`\nOTA refusé : variable(s) manquante(s) pour le canal « ${channel} » :`)
  for (const [k, why] of missing) console.error(`  - ${k} : ${why}`)
  console.error('\nAjoutez-les dans mobile/app/.env (modèle : .env.example), puis relancez.\n')
  process.exit(1)
}
for (const [k, why] of Object.entries(RECOMMENDED)) {
  if (!env[k]) console.warn(`Attention : ${k} absent — ${why}.`)
}

const api = env.EXPO_PUBLIC_API_BASE_URL
if (channel === 'ec2' && /localhost|127\.0\.0\.1|192\.168\./.test(api)) {
  console.error(`\nOTA refusé : le canal ec2 (production) pointerait vers ${api}.\n`)
  process.exit(1)
}

console.log(`Canal       : ${channel}`)
console.log(`API         : ${api}`)
console.log(`Google Maps : ${env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? 'OK' : 'absent'}`)
console.log(`Sentry      : ${env.EXPO_PUBLIC_SENTRY_DSN ? 'OK' : 'absent'}`)
console.log('')

if (process.env.OTA_DRY_RUN === '1') process.exit(0)

const result = spawnSync('npx', ['eas', 'update', '--channel', channel, '--platform', 'android', '--message', message], {
  cwd: appDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status === null ? 1 : result.status)
