#!/usr/bin/env node
/**
 * Publication OTA sûre : `npm run ota -- "message"` (canal ec2 par défaut, `--channel preview` sinon).
 *
 * Source des variables EXPO_PUBLIC_* (inlinées dans le bundle) :
 *   1. Variables d'environnement EAS (expo.dev > Project settings > Environment variables) — solution
 *      définitive : saisies une fois, utilisées à l'identique par les builds (eas.json "environment")
 *      et par les OTA (`eas update --environment`). Aucune dépendance au poste qui publie.
 *   2. Repli : mobile/app/.env + bloc env du profil eas.json (ancienne méthode, propre à chaque poste).
 * Refuse de publier sans clé Google Maps (sinon les cartes sont remplacées par un encart vide).
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

const MAPS_KEY = 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'
const RECOMMENDED = ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_SENTRY_DSN']
const isWin = process.platform === 'win32'
const dryRun = process.env.OTA_DRY_RUN === '1'

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

function runEas(easArgs, options = {}) {
  return spawnSync('npx', ['eas', ...easArgs], { cwd: appDir, shell: isWin, encoding: 'utf8', ...options })
}

const easJson = JSON.parse(fs.readFileSync(path.join(appDir, 'eas.json'), 'utf8'))
const profile = (easJson.build && easJson.build[channel]) || {}
const easEnvironment = profile.environment || (channel === 'ec2' ? 'production' : 'preview')

// 1) Variables EAS du profil
let easNames = null
if (process.env.OTA_EAS_ENV_LIST !== undefined) {
  easNames = process.env.OTA_EAS_ENV_LIST // tests : contenu simulé de `eas env:list`
} else {
  const list = runEas(['env:list', '--environment', easEnvironment, '--non-interactive'])
  if (list.status === 0) easNames = `${list.stdout || ''}`
  else console.warn(`(Variables EAS illisibles : ${(list.stderr || list.stdout || '').trim().split('\n').pop() || 'erreur inconnue'})`)
}
const onEas = name => easNames !== null && new RegExp(`\\b${name}\\b`).test(easNames)

let mode
let env = { ...process.env }
if (onEas(MAPS_KEY)) {
  mode = 'eas'
} else {
  // 2) Repli local
  const local = { ...(profile.env || {}), ...readDotEnv(path.join(appDir, '.env')) }
  for (const [k, v] of Object.entries(process.env)) if (v) local[k] = v
  if (local[MAPS_KEY]) {
    mode = 'local'
    env = local
  }
}

if (!mode) {
  console.error(`\nOTA refusé : ${MAPS_KEY} introuvable (ni sur EAS « ${easEnvironment} », ni dans mobile/app/.env).`)
  console.error('\nSolution définitive (une seule fois) : expo.dev > projet > Project settings > Environment variables,')
  console.error(`ou en ligne de commande depuis mobile/app :`)
  console.error(`  npx eas env:set --name ${MAPS_KEY} --value <clé> --environment ${easEnvironment} --visibility sensitive`)
  console.error(`  npx eas env:set --name EXPO_PUBLIC_API_BASE_URL --value https://itvisionplus.sn --environment ${easEnvironment} --visibility plaintext`)
  console.error(`  npx eas env:set --name EXPO_PUBLIC_SENTRY_DSN --value <dsn> --environment ${easEnvironment} --visibility plaintext\n`)
  process.exit(1)
}

if (mode === 'eas') {
  // Sans URL d'API sur EAS, `expo export` prendrait celle de .env (souvent une IP de dev) : refus en production.
  if (channel === 'ec2' && !onEas('EXPO_PUBLIC_API_BASE_URL')) {
    console.error(`\nOTA refusé : EXPO_PUBLIC_API_BASE_URL absent des variables EAS « ${easEnvironment} » (le bundle risquerait de viser l'API de .env).`)
    console.error(`  npx eas env:set --name EXPO_PUBLIC_API_BASE_URL --value https://itvisionplus.sn --environment ${easEnvironment} --visibility plaintext\n`)
    process.exit(1)
  }
  for (const name of RECOMMENDED) if (!onEas(name)) console.warn(`Attention : ${name} absent des variables EAS « ${easEnvironment} ».`)
} else {
  for (const name of RECOMMENDED) if (!env[name]) console.warn(`Attention : ${name} absent.`)
  const api = env.EXPO_PUBLIC_API_BASE_URL || ''
  if (channel === 'ec2' && /localhost|127\.0\.0\.1|192\.168\./.test(api)) {
    console.error(`\nOTA refusé : le canal ec2 (production) pointerait vers ${api}.\n`)
    process.exit(1)
  }
  console.warn(`Clé lue depuis le poste local. Pour ne plus en dépendre : npx eas env:set --name ${MAPS_KEY} --value <clé> --environment ${easEnvironment} --visibility sensitive`)
}

console.log(`Canal       : ${channel}`)
console.log(`Variables   : ${mode === 'eas' ? `EAS « ${easEnvironment} »` : 'mobile/app/.env + eas.json'}`)
console.log(`Google Maps : OK`)
console.log('')

if (dryRun) process.exit(0)

const updateArgs = ['update', '--channel', channel, '--platform', 'android', '--message', message]
if (mode === 'eas') updateArgs.push('--environment', easEnvironment)
const result = runEas(updateArgs, { env, stdio: 'inherit', encoding: undefined })
process.exit(result.status === null ? 1 : result.status)
