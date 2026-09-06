/**
 * Validateur de cohérence du registre des domaines (src/lib/domains.ts)
 * Usage : npx tsx scripts/validate-domains.ts
 *
 * Vérifie que le registre reste synchronisé avec le code :
 * - toute page et toute API de premier niveau est déclarée
 * - tout modèle de src/lib/models est classé par domaine
 * - pas de préfixe dupliqué ni d'entrée 'review' oubliée dans le reporting
 * À lancer en CI ou avant chaque étape du plan de sortie du monolithe.
 */
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import {
  PAGE_RULES,
  API_RULES,
  MODEL_DOMAINS,
  getDomainForPath,
  type RouteRule,
} from '../src/lib/domains'

const ROOT = join(__dirname, '..')
const APP_DIR = join(ROOT, 'src', 'app')
const API_DIR = join(APP_DIR, 'api')
const MODELS_DIR = join(ROOT, 'src', 'lib', 'models')

let failures = 0
const fail = (msg: string) => { failures++; console.error(`  ✗ ${msg}`) }
const ok = (msg: string) => console.log(`  ✓ ${msg}`)

function topDirs(dir: string): string[] {
  return readdirSync(dir)
    .filter(name => {
      try { return statSync(join(dir, name)).isDirectory() } catch { return false }
    })
}

/** Dossiers de pages = top-level + enfants des route groups (xxx). */
function pageRouteDirs(dir: string): string[] {
  const out: string[] = []
  for (const name of topDirs(dir)) {
    if (name === 'api') continue
    if (name.startsWith('(') && name.endsWith(')')) {
      for (const child of topDirs(join(dir, name))) out.push(child)
    } else {
      out.push(name)
    }
  }
  return out
}

function covered(pathname: string, rules: RouteRule[]): RouteRule | null {
  return rules.find(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/')) ?? null
}

console.log('— Pages —')
const pageDirs = pageRouteDirs(APP_DIR)
for (const dir of pageDirs) {
  const pathname = '/' + dir
  const rule = covered(pathname, PAGE_RULES)
  if (!rule) fail(`page non déclarée : ${pathname}`)
  else if (rule.review) console.log(`  ? ${pathname} → ${rule.domain} (review)`)
}
ok(`${pageDirs.length} pages vérifiées`)

console.log('— API —')
const apiDirs = topDirs(API_DIR)
for (const dir of apiDirs) {
  const pathname = '/api/' + dir
  const rule = covered(pathname, API_RULES)
  if (!rule) fail(`API non déclarée : ${pathname}`)
  else if (rule.review) console.log(`  ? ${pathname} → ${rule.domain} (review)`)
}
ok(`${apiDirs.length} groupes d'API vérifiés`)

console.log('— Modèles —')
const modelFiles = readdirSync(MODELS_DIR).filter(f => f.endsWith('.ts'))
for (const file of modelFiles) {
  const name = file.replace(/\.ts$/, '')
  if (!(name in MODEL_DOMAINS)) fail(`modèle non classé : ${name}`)
  else if (MODEL_DOMAINS[name] === 'deprecated') console.log(`  ⚠ ${name} → deprecated`)
}
ok(`${modelFiles.length} modèles vérifiés`)

console.log('— Registre —')
for (const [label, rules] of [['PAGE_RULES', PAGE_RULES], ['API_RULES', API_RULES]] as const) {
  const seen = new Set<string>()
  for (const r of rules) {
    if (seen.has(r.prefix)) fail(`${label} : préfixe dupliqué ${r.prefix}`)
    seen.add(r.prefix)
  }
}
const deprecated = [...PAGE_RULES, ...API_RULES].filter(r => r.domain === 'deprecated')
ok(`${deprecated.length} routes marquées deprecated : ${deprecated.map(r => r.prefix).join(', ')}`)

const review = [...PAGE_RULES, ...API_RULES].filter(r => r.review)
if (review.length) console.log(`  ? ${review.length} routes à revoir : ${review.map(r => r.prefix).join(', ')}`)

// Sanity checks sur des cas connus
const sanity: [string, string][] = [
  ['/portail-entreprise/finances', 'corporate'],
  ['/market', 'market'],
  ['/api/services/requests', 'xeuy'],
  ['/api/client-enterprise/tickets', 'corporate'],
  ['/api/auth/login', 'shared'],
  ['/compte', 'market'],
]
for (const [path, expected] of sanity) {
  const actual = getDomainForPath(path)
  if (actual !== expected) fail(`getDomainForPath('${path}') = ${actual} (attendu ${expected})`)
}
ok('sanity checks passés')

if (failures > 0) {
  console.error(`\n${failures} problème(s) détecté(s).`)
  process.exit(1)
}
console.log('\nRegistre des domaines cohérent ✔')
